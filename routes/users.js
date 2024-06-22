const express = require('express');
const { getUserProfile, updateUserProfile, createUser } = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');
const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

module.exports = router;
