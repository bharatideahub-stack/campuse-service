const Notification = require('../models/Notification');

/**
 * Creates a DB notification AND emits it via socket to the target user.
 * Called internally by other controllers (orders, bids).
 */
const createNotification = async (io, { userId, type, title, message, orderId }) => {
  try {
    const notif = await Notification.create({ userId, type, title, message, orderId: orderId || null });
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        _id: notif._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        orderId: notif.orderId,
        read: false,
        createdAt: notif.createdAt,
      });
    }
    return notif;
  } catch (err) {
    console.error('createNotification error:', err.message);
  }
};

// @route   GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// @route   PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// @route   PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

// @route   DELETE /api/notifications
exports.clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
};

exports.createNotification = createNotification;
