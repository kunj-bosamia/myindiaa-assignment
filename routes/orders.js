const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  handlePaymentSuccess
} = require('../controllers/orderController');
const { protect } = require('../middlewares/auth');
const router = express.Router();

router.route('/')
  .get(protect, getOrders)
  .post(protect, createOrder);

router.route('/:id')
  .get(protect, getOrder)
  .put(protect, updateOrder);

router.route('/payment-success')
  .get(protect, handlePaymentSuccess)

module.exports = router;
