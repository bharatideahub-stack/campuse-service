const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markRead,
  markAllRead,
  clearAll,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/', clearAll);

module.exports = router;
