const express = require('express');
const {
  handlePaymentSuccess
} = require('../controllers/paymentController');
const router = express.Router();

router.route('/success')
  .get(handlePaymentSuccess)

// router.route('/cancel')
//   .get(ok)

module.exports = router;
