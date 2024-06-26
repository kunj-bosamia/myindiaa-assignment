require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const errorHandler = require('./middlewares/errorHandler');
const setupSwagger = require('./swagger');
const cron = require('node-cron');
const {cleanupOrders}  = require('./utils/cleanUpOrders')

const app = express();
const port = process.env.PORT || 5000;

// Database connection
db().then(() => {
    console.log('Connected to MongoDB');
    // Start the cron job after successful MongoDB connection
    cron.schedule('0 */12 * * *', () => {
      console.log('Running scheduled order cleanup...');
      cleanupOrders();
    });
  }).catch(err => {
    console.error('Error while starting  cron job', err);
  });

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Setup Swagger
setupSwagger(app);

// Error Handler
app.use(errorHandler);

app.listen(port, () => console.log(`Server running on port ${port}`));
