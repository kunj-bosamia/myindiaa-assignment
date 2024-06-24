const Order = require('../models/Order');
const Product = require('../models/Product');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');


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
        return res.status(400).json({ success: false, message: 'Payment unsuccessful' });
      }
  
    } catch (err) {
      console.log("Error in payment success method : " , err)
      res.status(500).json({ success: false, error: err.message });
    }
  };

  exports.handleOrderCancel = async (req, res) => {
    const sessionId = req.query.session_id;
    const session = await mongoose.startSession();
  
    try {
      session.startTransaction();
  
      const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
  
      if (!stripeSession) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Session not found, contact support' });
      }
  
      if (stripeSession.payment_status === "paid") {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Use cancel order api to cancel this order as payment is done for this order' });
      }
  
      const orderId = stripeSession.metadata.orderId;
      const order = await Order.findById(orderId).session(session);
  
      if (!order) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Order not found or already deleted' });
      }
  
      // Update the stock for each product in the order
      for (const item of order.products) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        }).session(session);
      }
  
      // Delete the order
      await Order.findByIdAndDelete(orderId).session(session);
  
      await session.commitTransaction();
      session.endSession();
  
      res.status(200).json({ success: true, message: 'Order cancelled and products restocked' });
  
    } catch (err) {
      console.log("Error in order cancel method: ", err);
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ success: false, error: err.message });
    }
  };
  