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
      success_url: `${process.env.CLIENT_URL}/api/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/api/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { orderId: order._id.toString() },
      shipping_address_collection: {
        allowed_countries: ['IN']
      },
      billing_address_collection: 'auto',
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, sessionId: stripeSession.id, url: stripeSession.url });
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
