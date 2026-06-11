const Order = require('../models/Order');
const Bid = require('../models/Bid');
const User = require('../models/User');
const { sendPushNotification } = require('../services/notificationService');
const { findNearbyProviders } = require('../services/matchingService');
const { createNotification } = require('./notificationController');

// @route   GET /api/orders
exports.getOrders = async (req, res) => {
  try {
    const { category, urgency, status, lat, lng, radius = 5000, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (urgency) filter.urgency = urgency;
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['BROADCASTED', 'CREATED'] };
    }

    // Exclude orders from users the current user has blocked, and orders from users who blocked the current user
    const currentUser = await User.findById(req.user._id).select('blockedUsers');
    const blockedIds = currentUser?.blockedUsers || [];
    if (blockedIds.length > 0) {
      filter.userId = { $nin: blockedIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Try geospatial query first; fall back to regular query if geo index missing
    if (lat && lng) {
      filter.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      };
    }

    let orders;
    let total;
    try {
      orders = await Order.find(filter)
        .populate('userId', 'name avatar rating completedOrders hostel isVerified totalRatings reliabilityScore')
        .populate('assignedTo', 'name avatar rating isVerified totalRatings reliabilityScore')
        .sort({ isPriorityBoosted: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Order.countDocuments(filter);
    } catch (geoErr) {
      // Geo query failed — retry without location filter
      delete filter.location;
      orders = await Order.find(filter)
        .populate('userId', 'name avatar rating completedOrders hostel isVerified totalRatings reliabilityScore')
        .populate('assignedTo', 'name avatar rating isVerified totalRatings reliabilityScore')
        .sort({ isPriorityBoosted: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Order.countDocuments(filter);
    }

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// @route   GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name avatar rating completedOrders hostel phone isAvailable isVerified totalRatings reliabilityScore')
      .populate('assignedTo', 'name avatar rating completedOrders hostel phone isAvailable isVerified totalRatings reliabilityScore')
      .populate({
        path: 'bids',
        populate: { path: 'userId', select: 'name avatar rating completedOrders reliabilityScore totalRatings isVerified' },
      });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isOwner = order.userId._id.toString() === req.user._id.toString();

    // Non-owners (other providers) only see their own bid, not competitors' bids/amounts
    if (!isOwner && order.bids) {
      order.bids = order.bids.filter(
        (bid) => bid.userId._id.toString() === req.user._id.toString()
      );
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

// @route   POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    const { category, description, budget, mode, urgency, location } = req.body;

    if (!category || !description || !mode) {
      return res.status(400).json({ success: false, message: 'Category, description, and mode are required' });
    }

    const order = await Order.create({
      userId: req.user._id,
      category,
      description: description.trim(),
      budget: budget ? parseFloat(budget) : undefined,
      mode,
      urgency: urgency || 'normal',
      location: location || { type: 'Point', coordinates: [0, 0] },
      status: 'BROADCASTED',
      statusHistory: [{ status: 'CREATED', note: 'Order created' }, { status: 'BROADCASTED', note: 'Order broadcasted' }],
    });

    await order.populate('userId', 'name avatar rating hostel');

    // Broadcast to nearby providers via Socket.io — only to available users
    const io = req.app.get('io');
    // Get all connected sockets and only emit to available users
    const sockets = await io.fetchSockets();
    for (const sock of sockets) {
      if (sock.user?.isAvailable && sock.userId !== order.userId._id.toString()) {
        sock.emit('new_order', { order });
      }
    }

    // Find and notify nearby available providers
    if (location?.coordinates) {
      const providers = await findNearbyProviders(location.coordinates, 5000);
      providers.forEach((provider) => {
        sendPushNotification(provider.fcmToken, {
          title: `New ${category} request!`,
          body: description.substring(0, 100),
          data: { orderId: order._id.toString(), type: 'new_order' },
        });
      });
    }

    res.status(201).json({ success: true, message: 'Order created successfully', order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

// @route   PATCH /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only customer or assigned provider can update status
    const isCustomer = order.userId.toString() === req.user._id.toString();
    const isProvider = order.assignedTo?.toString() === req.user._id.toString();

    if (!isCustomer && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
    }

    const validTransitions = {
      BROADCASTED: ['CANCELLED'],
      ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
      BID_SELECTED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['COMPLETED'],
    };

    if (validTransitions[order.status] && !validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${order.status} to ${status}`,
      });
    }

    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date(), note });

    if (status === 'COMPLETED') {
      order.completedAt = new Date();
      // Increment completed orders for provider
      if (order.assignedTo) {
        await User.findByIdAndUpdate(order.assignedTo, { $inc: { completedOrders: 1 } });
      }
    }

    if (status === 'CANCELLED') {
      order.cancelReason = note;
    }

    await order.save();
    await order.populate('userId', 'name avatar');
    await order.populate('assignedTo', 'name avatar');

    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order_status_update', { orderId: order._id, status, order });
    // Remove from public feed when accepted/cancelled
    if (status === 'CANCELLED') {
      io.emit('feed_order_removed', { orderId: order._id });
    }

    // Notify the other party
    const notifyUserId = isCustomer ? order.assignedTo : order.userId;
    if (notifyUserId) {
      const notifyUser = await User.findById(notifyUserId).select('+fcmToken');
      sendPushNotification(notifyUser?.fcmToken, {
        title: 'Order Update',
        body: `Your order status changed to ${status}`,
        data: { orderId: order._id.toString(), type: 'status_update' },
      });
      createNotification(io, {
        userId: notifyUserId,
        type: 'status_update',
        title: 'Order Update',
        message: `Your order status changed to ${status}`,
        orderId: order._id,
      });
    }

    res.json({ success: true, message: 'Status updated', order });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// @route   POST /api/orders/:id/accept (for fixed price orders)
exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['fixed', 'instant'].includes(order.mode)) {
      return res.status(400).json({ success: false, message: 'This order requires bidding' });
    }

    if (!['CREATED', 'BROADCASTED'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Order is no longer available' });
    }

    if (order.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot accept your own order' });
    }

    order.assignedTo = req.user._id;
    order.status = 'ACCEPTED';
    order.finalPrice = order.budget || order.finalPrice;
    order.statusHistory.push({ status: 'ACCEPTED', note: `Accepted by ${req.user.name}` });
    await order.save();

    await order.populate('userId', 'name avatar phone hostel');
    await order.populate('assignedTo', 'name avatar phone hostel');

    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order_status_update', { orderId: order._id, status: 'ACCEPTED', order });
    // Remove from all providers' feeds immediately
    io.emit('feed_order_removed', { orderId: order._id });

    // Notify customer
    const customer = await User.findById(order.userId).select('+fcmToken');
    sendPushNotification(customer?.fcmToken, {
      title: 'Order Accepted! 🎉',
      body: `${req.user.name} accepted your ${order.category} request`,
      data: { orderId: order._id.toString(), type: 'order_accepted' },
    });
    createNotification(io, {
      userId: order.userId._id || order.userId,
      type: 'order_accepted',
      title: 'Order Accepted! 🎉',
      message: `${req.user.name} accepted your ${order.category} request`,
      orderId: order._id,
    });

    res.json({ success: true, message: 'Order accepted', order });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept order' });
  }
};

// @route   GET /api/orders/my
exports.getMyOrders = async (req, res) => {
  try {
    const { role = 'customer', status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role === 'customer') {
      filter.userId = req.user._id;
    } else {
      filter.assignedTo = req.user._id;
    }

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate('userId', 'name avatar rating hostel isVerified totalRatings reliabilityScore')
      .populate('assignedTo', 'name avatar rating hostel isVerified totalRatings reliabilityScore')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};
