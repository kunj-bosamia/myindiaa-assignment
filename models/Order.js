const mongoose = require('mongoose');
const Product = require('./Product');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true
      }
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'successful', 'failed'],
    default: 'pending'
  },
  paymentDetails: {
    id: String,
    amount: Number,
    currency: String,
    payment_method: String
  }
});

// Pre-validate middleware to calculate total amount
orderSchema.pre('validate', async function (next) {
  let totalAmount = 0;

  for (const item of this.products) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Product with ID ${item.product} not found`);
    }
    totalAmount += product.price * item.quantity;
  }

  this.totalAmount = totalAmount;
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
