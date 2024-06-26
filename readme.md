# E-Commerce Website Backend

Welcome to the backend of our e-commerce website! This application handles various functionalities related to managing orders, products, and payments.

## Accessing the App
The backend provides Swagger documentation, allowing you to explore and test the APIs directly within the application.
The application is hosted on a free instance, which may scale down due to inactivity. If you experience a delay or buffering on initial access, it might take 40-50 seconds to load. Subsequent interactions should be smooth.

**App Link**: [https://myindiaa-assignment-jv7l.onrender.com/]

## Payment Gateway

The app uses Stripe payment gateway in test mode. You can use the following fake card details for successful payments:

- **Card Number:** 4242 4242 4242 4242
- **CVV:** 123
- **Expiration Date:** 1/25

## Database Access

The MongoDB database is accessible with read-only privileges for demonstration purposes. You can connect using MongoDB Compass, NoSQLBooster, or any other MongoDB client.

**Database Link**: [mongodb+srv://readonly:KuYL6CRApD6lO8JI@myindiaa-assignment.qmdyitn.mongodb.net]

## APIs Overview

### Auth
- **POST /api/auth/register**: Register a new user.
- **POST /api/auth/login**: Log in an existing user.

### User
- **GET /api/users**: Get user profile of the logged in user.
- **PUT /api/users**: Edit user profile (edit name , email or password)

### Product
- **GET /api/products**: Retrieve products with optional search, limit, and pagination.
- **GET /api/products/:id**: Retrieve a single product.
- **POST /api/products/**: Add new product in the db (only admins can use this api).
- **PUT /api/products/:id**: Update a product object in the db liking updating the price , stock , name or description (only admins can use this api).

### Order
- **GET /api/orders**: Retrieve orders (admin sees all, user sees own).
- **GET /api/orders/:id**: Retrieve specific order details (admin can access any / non admin can only access orders owned by them).
- **POST /api/orders**: Create a new order.
- **PUT /api/orders/:id**: Admin can update status or updates field only , non admin can update shippingAddress field only
- **POST /api/orders/:id**: Cancel an order.

### Redirect urls of stripe
- **POST /api/orders/payment-success**: Handle successful payment updates.
- **GET /api/orders/payment-cancel**: Handle cancellation of payment.

## Users Overview
- There are two types of users:
  - Admin users: Admin users has some extra privileges over normal users.
  - Normal users: Can register and log in using the Auth APIs, receiving a JWT token for authentication in Swagger.

## Admin User

An admin user is automatically created if not already exists with the following credentials:

- **Email:** admin@admin.com
- **Password:** admin

This is done for testing and development purpose only.

## Products Overview

- Only admin users can add new products to the database.
- Only admin users can update details about existing products.
- Non-admin users can only view product objects.

## Order Process Overview

### Placing an Order
- When a user places an order, its initial status is **received** and the paymentStatus  is **pending**.
- The `paymentUrl` is provided in the order creation response. Users must use this URL to make the payment.
- Stripe payment gateway in test mode is used , one can add dummy card details to make the payment.

### Payment Process
- **Successful Payment**: If the payment is successful, the order status changes to **in progress** and the `paymentStatus` changes to **successful**.
- **Payment Cancelled**: If the payment is cancelled, the order is deleted from the database.

### Order Updates
- **Admin Updates**: The admin can update the `status` and `updates` fields. These fields can include order status, current location, timeline updates, etc.
- **User Updates**: Before delivery, users can update the `shippingAddress`. After delivery, the shipping address cannot be updated.

### Delivery and Cancellation
- **Order Delivered**: Once the order is delivered, the admin updates the status to **delivered**.
- **Order Cancellation**: Users can cancel an order that has been paid for but not delivered. They provide a reason, the refund will be given for that order can verify that via Stripe dashboard. The status of the order then changes to **cancelled**. When the order is cancelled or deleted products are re-stocked.

### Automatic Deletion
- **Pending Payment**: Any order with a `paymentStatus` of **pending** for more than 12 hours is automatically deleted from the database. When the order is deleted products get re-stocked.

## Running Locally

If you want to run the app locally:

1. **Create a Stripe Account**: Sign up and generate a test secret key. NOTE - keep the payments in test mode only
2. **Update Docker Compose File**: Replace your secret key [here](https://github.com/kunj-bosamia/myindiaa-assignment/blob/main/docker-compose.yaml#L66) in the `docker-compose.yml`.
3. **Launch the App**: Run `docker compose up` to start the app and MongoDB locally.
4. **Access Locally**: Visit http://127.0.0.1:5000/ to interact with the app.
5. **Mongodb url**: mongodb://localhost:27017 use this mongodb url to connect to the db with any monogdb client.