const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  handlePaymentSuccess,
  handlePaymentCancel
} = require('../controllers/orderController');
const { protect } = require('../middlewares/auth');
const router = express.Router();

router.route('/payment-success')
  .get(handlePaymentSuccess)

router.route('/payment-cancel')
  .get(handlePaymentCancel)

router.route('/')
  .get(protect, getOrders)
  .post(protect, createOrder);

router.route('/:id')
  .get(protect, getOrder)
  .put(protect, updateOrder);

module.exports = router;
