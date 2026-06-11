const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllTransactions,
  toggleBanUser,
  getServerHealth,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

router.get('/stats', getDashboardStats);
router.get('/health', getServerHealth);
router.get('/transactions', getAllTransactions);
router.patch('/users/:id/ban', toggleBanUser);

module.exports = router;
