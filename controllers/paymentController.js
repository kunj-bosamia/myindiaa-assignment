const Order = require('../models/Order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


exports.handlePaymentSuccess = async (req, res) => {
    try {
      const { sessionId } = req.body;
      const session = await Promise.all([
        stripe.checkout.sessions.retrieve(req.query.session_id, { expand: ['payment_intent.payment_method'] }),
        stripe.checkout.sessions.listLineItems(req.query.session_id)
      ])
  
      if (!session[0] ||  !session[1]) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }
  
      const orderId = session.metadata.orderId;
  
      const order = await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'successful',
        paymentDetails: {
          id: session.payment_intent,
          amount: session.amount_total,
          currency: session.currency,
          payment_method: session.payment_method_types[0],
        },
      }, { new: true });
  
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      res.status(200).json({ success: true, message: 'Payment successful and order updated', orderId: order._id });
    } catch (err) {
      console.log("Error in payment success method : " , err)
      res.status(500).json({ success: false, error: err.message });
    }
  };
  