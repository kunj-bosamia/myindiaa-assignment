const express = require('express');
const {
  handlePaymentSuccess,
  handleOrderCancel
} = require('../controllers/paymentController');
const router = express.Router();

router.route('/success')
  .get(handlePaymentSuccess)

router.route('/cancel')
  .get(handleOrderCancel)

module.exports = router;
