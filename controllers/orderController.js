const Order = require('../models/Order');
const Product = require('../models/Product');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');
// const Payment = require('../models/Payment');
// const { makePayment } = require('../services/paymentService');

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
      paymentStatus: 'pending',
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
          currency: 'usd',
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
      cancel_url: `${process.env.CLIENT_URL}/api/orders/cancel`,
      metadata: { orderId: order._id.toString() },
    });

    await session.commitTransaction();
    session.endSession();

    // res.status(201).json({ success: true, sessionId: stripeSession.id, url: stripeSession.url });
    res.redirect(session.url)
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.log("Error while creating an order : " , err)
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate('products.product');
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('products.product');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update order status
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

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
    res.status(500).json({ success: false, error: err.message });
  }
};
