const Order = require('../models/Order');
const Product = require('../models/Product');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');

// Create a new order
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { products } = req.body;

    // Fetch all products from the database within the transaction
    const productIds = products.map(item => item.product);
    const fetchedProducts = await Product.find({ _id: { $in: productIds } }).session(session);

    const productMap = fetchedProducts.reduce((map, product) => {
      map[product._id.toString()] = product;
      return map;
    }, {});

    // Check stock for each product
    for (const item of products) {
      const product = productMap[item.product];
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: `Product with ID ${item.product} not found` });
      }

      if (product.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Insufficient stock for product ${product.name}` });
      }
    }

    // Create the order
    const order = new Order({
      user: req.user.id,
      products,
    });

    await order.save({ session });

    const lineItems = [];

    // Update stock and create line items for Stripe session within the transaction
    for (const item of products) {
      const product = productMap[item.product];

      product.stock -= item.quantity;
      await product.save({ session });

      lineItems.push({
        price_data: {
          currency: 'inr',
          product_data: {
            name: product.name,
          },
          unit_amount: product.price * 100,
        },
        quantity: item.quantity,
      });
    }

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/api/orders/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/api/orders/payment-cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { orderId: order._id.toString() },
      shipping_address_collection: {
        allowed_countries: ['IN']
      },
      billing_address_collection: 'auto',
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, sessionId: stripeSession.id, paymentUrl: stripeSession.url , orderId: order._id });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error while creating an order : " , err)
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Default limit and page
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    let query = {};

    if (!isAdmin) {
      query.user = userId;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .populate('products.product', 'name price');

    const totalOrders = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      totalOrders,
      page,
      totalPages: Math.ceil(totalOrders / limit),
      orders
    });
  } catch (error) {
    console.error("Error while getting orders : " , error)
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single order
exports.getOrder =  async (req, res) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('products.product', 'name price');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // If user is not admin, ensure they can only access their own orders
    if (!isAdmin && order.user._id.toString() !== userId.toString()) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Error while get an order : " , error)
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update order (can only update shipping address , updates , status)
// admin user can update -> updates(order updates) & status only
// non admin user can update -> shipping address only
exports.updateOrder = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;
  const { shippingAddress, status, updates } = req.body;

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (userRole === 'admin') {
      // Admin can update status and updates
      if (status) {
        order.status = status;
      }
      if (updates) {
        order.updates = updates;
      }
    } else {
      // Check if the order belongs to the user
      if (order.user.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Check if the order status is not delivered
      if (order.status === 'delivered') {
        return res.status(400).json({ success: false, message: 'Cannot update a delivered order' });
      }

      // Update shipping address
      if (shippingAddress) {
        order.shippingAddress = {
          ...order.shippingAddress,
          ...shippingAddress
        };
      }
    }

    await order.save();
    return res.status(200).json({ success: true, message: 'Order updated successfully', order });
  } catch (error) {
    console.error('Error updating order:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

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
        status: 'inProgress',
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
    console.error("Error in payment success method : " , err)
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.handlePaymentCancel = async (req, res) => {
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
    console.error("Error in order cancel method: ", err);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, error: err.message });
  }
};

// order cancel
exports.cancelOrder = async (req, res) => {
  const orderId = req.params.id;
  const { reason } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if the user owns this order
    if (!req.user.isAdmin && order.user.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to cancel this order' });
    }

    // Check if the order is already delivered
    if (order.status === 'delivered') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled as it is already delivered' });
    }
    // Restock products
    for (const item of order.products) {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        product.stock += item.quantity;
        await product.save({ session });
      }
    }

    // Handle cancellation based on payment status
    if (order.paymentStatus === 'pending') {
      // If payment is pending, directly delete the order
      await Order.findByIdAndDelete(orderId).session(session);
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({ success: true, message: 'Order deleted. Payment was pending for this order.' });

    } else if (order.paymentStatus === 'successful') {
      const paymentId = order.paymentId;
      await stripe.refunds.create({
        payment_intent: paymentId,
      });
      order.status = 'cancelled';
      order.updates = `Order cancelled. Reason: ${reason}`;
      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({ success: true, message: 'Order cancelled. Refund initiated successfully.' });
    } else {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Unexpected payment status for the order' });
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error cancelling order:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};