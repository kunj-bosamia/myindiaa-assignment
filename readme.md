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

### Order
- **GET /api/orders**: Retrieve orders (admin sees all, user sees own).
- **GET /api/orders/:id**: Retrieve specific order details (admin can access any / non admin can only access orders owned by them).
- **POST /api/orders**: Create a new order.
- **PUT /api/orders/:id**: Admin can update status or updates field only , non admin can update shippingAddress field only 

### Redirect urls of stripe
- **POST /api/orders/payment-success**: Handle successful payment updates.
- **GET /api/orders/payment-cancel**: Handle cancellation of payment.

## Admin User

An admin user is automatically created if not already exists with the following credentials:

- **Email:** admin@admin.com
- **Password:** admin

## Running Locally

If you want to run the app locally:

1. **Create a Stripe Account**: Sign up and generate a test secret key.
2. **Update Docker Compose File**: Replace the secret key (here){https://github.com/kunj-bosamia/myindiaa-assignment/blob/main/docker-compose.yaml#L66} in the `docker-compose.yml`.
3. **Launch the App**: Run `docker compose up` to start the app and MongoDB locally.
4. **Access Locally**: Visit http://127.0.0.1:5000/ to interact with the app.
5. **Mongodb url**: mongodb://localhost:27017 use this mongodb url to connect to the db with any monogdb client.
