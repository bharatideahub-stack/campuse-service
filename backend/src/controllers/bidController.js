const Bid = require('../models/Bid');
const Order = require('../models/Order');
const User = require('../models/User');
const { sendPushNotification } = require('../services/notificationService');
const { createNotification } = require('./notificationController');

// @route   POST /api/bids/:orderId
exports.placeBid = async (req, res) => {
  try {
    const { price, message, estimatedTime } = req.body;
    const { orderId } = req.params;

    if (!price) {
      return res.status(400).json({ success: false, message: 'Bid price is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.mode !== 'bidding') {
      return res.status(400).json({ success: false, message: 'This order does not accept bids' });
    }

    if (!['CREATED', 'BROADCASTED'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Bidding is closed for this order' });
    }

    if (order.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot bid on your own order' });
    }

    // Check for existing bid
    const existingBid = await Bid.findOne({ orderId, userId: req.user._id });
    if (existingBid) {
      return res.status(409).json({ success: false, message: 'You have already placed a bid on this order' });
    }

    const bid = await Bid.create({
      orderId,
      userId: req.user._id,
      price: parseFloat(price),
      message: message?.trim(),
      estimatedTime: estimatedTime ? parseInt(estimatedTime) : undefined,
    });

    await bid.populate('userId', 'name avatar rating completedOrders reliabilityScore totalRatings isVerified');

    const io = req.app.get('io');
    io.to(`order_${orderId}`).emit('new_bid', { bid, orderId });

    // Notify order creator
    const customer = await User.findById(order.userId).select('+fcmToken');
    sendPushNotification(customer?.fcmToken, {
      title: 'New bid received! 💰',
      body: `${req.user.name} bid ₹${price} on your request`,
      data: { orderId: orderId.toString(), type: 'new_bid' },
    });
    createNotification(req.app.get('io'), {
      userId: order.userId,
      type: 'new_bid',
      title: 'New bid received! 💰',
      message: `${req.user.name} bid ₹${price} on your request`,
      orderId,
    });

    res.status(201).json({ success: true, message: 'Bid placed successfully', bid });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already bid on this order' });
    }
    console.error('Place bid error:', error);
    res.status(500).json({ success: false, message: 'Failed to place bid' });
  }
};

// @route   GET /api/bids/:orderId
exports.getBids = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).select('userId');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isOwner = order.userId.toString() === req.user._id.toString();

    let bids;
    if (isOwner) {
      // Order owner sees all bids with full details
      bids = await Bid.find({ orderId: req.params.orderId })
        .populate('userId', 'name avatar rating completedOrders reliabilityScore hostel totalRatings isVerified')
        .sort({ price: 1, createdAt: 1 });
    } else {
      // Providers only see their own bid
      bids = await Bid.find({ orderId: req.params.orderId, userId: req.user._id })
        .populate('userId', 'name avatar rating completedOrders reliabilityScore hostel totalRatings isVerified')
        .sort({ createdAt: 1 });
    }

    res.json({ success: true, bids });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bids' });
  }
};

// @route   PATCH /api/bids/:orderId/:bidId/accept
exports.acceptBid = async (req, res) => {
  try {
    const { orderId, bidId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the order creator can accept bids' });
    }

    if (!['CREATED', 'BROADCASTED'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot accept bids at this stage' });
    }

    const bid = await Bid.findById(bidId);
    if (!bid || bid.orderId.toString() !== orderId) {
      return res.status(404).json({ success: false, message: 'Bid not found' });
    }

    // Accept selected bid
    bid.status = 'accepted';
    await bid.save();

    // Reject all other bids
    await Bid.updateMany(
      { orderId, _id: { $ne: bidId } },
      { status: 'rejected' }
    );

    // Update order
    order.assignedTo = bid.userId;
    order.status = 'BID_SELECTED';
    order.finalPrice = bid.price;
    order.statusHistory.push({ status: 'BID_SELECTED', note: `Bid of ₹${bid.price} selected` });
    await order.save();

    await order.populate('userId', 'name avatar');
    await order.populate('assignedTo', 'name avatar phone hostel');

    const io = req.app.get('io');
    io.to(`order_${orderId}`).emit('bid_accepted', { bid, order, orderId });
    // Remove from public provider feed once customer selects a bidder
    io.emit('feed_order_removed', { orderId: order._id });

    // Notify winning bidder
    const provider = await User.findById(bid.userId).select('+fcmToken');
    sendPushNotification(provider?.fcmToken, {
      title: 'Your bid was accepted! 🎉',
      body: `Your bid of ₹${bid.price} was selected`,
      data: { orderId: orderId.toString(), type: 'bid_accepted' },
    });
    createNotification(req.app.get('io'), {
      userId: bid.userId,
      type: 'bid_accepted',
      title: 'Your bid was accepted! 🎉',
      message: `Your bid of ₹${bid.price} was selected`,
      orderId,
    });

    res.json({ success: true, message: 'Bid accepted', order, bid });
  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept bid' });
  }
};
