const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

exports.cleanupOrders = async () => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const ordersToDelete = await Order.find({
        paymentStatus: 'pending',
        updatedAt: { $lt: twelveHoursAgo }
      });
  
      for (const order of ordersToDelete) {
        for (const item of order.products) {
          const product = await Product.findById(item.product).session(session);
          product.stock += item.quantity;
          await product.save({ session });
        }
  
        await Order.findByIdAndDelete(order._id).session(session);
        console.log(`${order._id} order deleted as it's payment was pending for more than 12 hours.`)
      }
  
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error('Error during cleanup:', error);
    } finally {
      session.endSession();
    }
  };
  