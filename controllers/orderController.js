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

    res.status(201).json({ success: true, sessionId: stripeSession.id, url: stripeSession.url , orderId: order._id });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.log("Error while creating an order : " , err)
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
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update order (only allows updating shipping address)
exports.updateOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const orderId = req.params.id;

    // Ensure only 'user' role can update orders
    if (userRole !== 'user') {
      return res.status(403).json({ success: false, message: 'Only users can update their orders' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Ensure the order belongs to the user
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only update your own orders' });
    }

    if (!order.shippingAddress) {
      order.shippingAddress = {};
    }

    // Update shipping address fields if provided
    const { city, country, line1, line2, postal_code, state } = req.body;

    if (city) order.shippingAddress.city = city;
    if (country) order.shippingAddress.country = country;
    if (line1) order.shippingAddress.line1 = line1;
    if (line2) order.shippingAddress.line2 = line2;
    if (postal_code) order.shippingAddress.postal_code = postal_code;
    if (state) order.shippingAddress.state = state;

    await order.save();

    res.status(200).json({ success: true, message: 'Order updated successfully', order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};