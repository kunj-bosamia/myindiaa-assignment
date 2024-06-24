const Order = require('../models/Order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


exports.handlePaymentSuccess = async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(req.query.session_id, { expand: ['payment_intent.payment_method'] })
  
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found , Contact Support' });
      }
      if (session.payment_status === "paid"){
        const orderId = session.metadata.orderId;
    
        const order = await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'successful',
          paymentId: session.payment_intent.id,
          shippingAddress: {
            city: session.shipping_details.address.city,
            country: session.shipping_details.address.country,
            line1: session.shipping_details.address.line1,
            line2: session.shipping_details.address.line2,
            postal_code: session.shipping_details.address.postal_code,
            state: session.shipping_details.address.state,
          }
        }, { new: true });
    
        if (!order) {
          return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.status(200).json({ success: true, message: 'Payment successful and order updated', orderId: order._id });
      }else{
        return res.status(404).json({ success: false, message: 'Payment unsuccessful' });
      }
  
    } catch (err) {
      console.log("Error in payment success method : " , err)
      res.status(500).json({ success: false, error: err.message });
    }
  };
  