const os = require('os');
const User = require('../models/User');
const Order = require('../models/Order');
const WalletTransaction = require('../models/WalletTransaction');
const { getOnlineUserIds, disconnectUser, connectedUsers } = require('../socket/socketHandler');

// ── HTTP request counter ─────────────────────────────────
let httpRequestCount = 0;
exports.incrementRequestCount = () => { httpRequestCount++; };

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics for admin overview
// @access  Admin only
exports.getDashboardStats = async (req, res) => {
  try {
    const onlineUserIds = getOnlineUserIds();

    // Run all aggregations in parallel
    const [
      totalUsers,
      bannedUsers,
      totalOrders,
      ordersByStatus,
      revenueResult,
      recentSignups,
      dailySignups,
      dailyRevenue,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBanned: true }),
      Order.countDocuments(),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: 'COMPLETED', finalPrice: { $exists: true } } },
        { $group: { _id: null, total: { $sum: '$finalPrice' } } },
      ]),
      // Users registered in the last 7 days
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      // Daily signups for chart (last 30 days)
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Daily revenue for chart (last 30 days)
      Order.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            finalPrice: { $exists: true },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
            revenue: { $sum: '$finalPrice' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Build status breakdown map
    const statusBreakdown = {};
    ordersByStatus.forEach(({ _id, count }) => {
      statusBreakdown[_id] = count;
    });

    const activeOrders = (statusBreakdown['BROADCASTED'] || 0) +
      (statusBreakdown['ACCEPTED'] || 0) +
      (statusBreakdown['BID_SELECTED'] || 0) +
      (statusBreakdown['IN_PROGRESS'] || 0) +
      (statusBreakdown['DELIVERED'] || 0);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          online: onlineUserIds.length,
          offline: totalUsers - onlineUserIds.length,
          banned: bannedUsers,
          recentSignups,
        },
        orders: {
          total: totalOrders,
          active: activeOrders,
          completed: statusBreakdown['COMPLETED'] || 0,
          cancelled: statusBreakdown['CANCELLED'] || 0,
          statusBreakdown,
        },
        revenue: {
          total: revenueResult[0]?.total || 0,
        },
        charts: {
          dailySignups,
          dailyRevenue,
        },
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};

// @route   GET /api/admin/transactions
// @desc    Get all wallet transactions (admin view) with filters
// @access  Admin only
exports.getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      status,
      type,
      startDate,
      endDate,
      search,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // If searching by user name/email, first find matching user IDs
    let matchingUserIds = null;
    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      matchingUserIds = matchingUsers.map((u) => u._id);
      filter.userId = { $in: matchingUserIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total, summaryResult] = await Promise.all([
      WalletTransaction.find(filter)
        .populate('userId', 'name email avatar')
        .populate('orderId', 'category description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WalletTransaction.countDocuments(filter),
      // Summary aggregation (for the summary cards)
      WalletTransaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalCredits: {
              $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] },
            },
            totalDebits: {
              $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] },
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const summary = summaryResult[0] || {
      totalAmount: 0,
      totalCredits: 0,
      totalDebits: 0,
      pendingCount: 0,
      failedCount: 0,
    };

    res.json({
      success: true,
      transactions,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Admin transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

// @route   PATCH /api/admin/users/:id/ban
// @desc    Ban or unban a user
// @access  Admin only
exports.toggleBanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { ban } = req.body;

    if (typeof ban !== 'boolean') {
      return res.status(400).json({ success: false, message: '`ban` field (boolean) is required' });
    }

    // Prevent admin from banning themselves
    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot ban yourself' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent banning other admins
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot ban an admin user' });
    }

    user.isBanned = ban;
    await user.save();

    // If banning, force-disconnect the user's socket
    if (ban) {
      const io = req.app.get('io');
      disconnectUser(io, id);
    }

    res.json({
      success: true,
      message: ban ? 'User has been banned' : 'User has been unbanned',
      user,
    });
  } catch (error) {
    console.error('Toggle ban error:', error);
    res.status(500).json({ success: false, message: 'Failed to update ban status' });
  }
};

// @route   GET /api/admin/health
// @desc    Return live server health metrics (CPU, memory, uptime, connections)
// @access  Admin only
exports.getServerHealth = (req, res) => {
  const mem = process.memoryUsage();
  const sysTotal = os.totalmem();
  const sysFree = os.freemem();
  const loadAvg = os.loadavg();

  res.json({
    success: true,
    health: {
      uptime: Math.floor(process.uptime()),
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        systemTotal: sysTotal,
        systemFree: sysFree,
        systemUsedPercent: Math.round(((sysTotal - sysFree) / sysTotal) * 100),
      },
      cpu: {
        loadAvg1: loadAvg[0],
        loadAvg5: loadAvg[1],
        cores: os.cpus().length,
      },
      process: {
        version: process.version,
        pid: process.pid,
        env: process.env.NODE_ENV || 'development',
      },
      requests: httpRequestCount,
      connections: connectedUsers.size,
    },
  });
};
