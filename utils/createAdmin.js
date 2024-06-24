const User = require('../models/User');

// just for development purpose it will create an admin user if not exists whenever a server starts
// email - admin@admin.com
// password - admin
exports.createAdmin = async () => {
  try {
    const adminEmail = 'admin@admin.com';
    const adminPassword = 'admin';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const admin = new User({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });

      await admin.save();
      console.log('Default admin user created');
    } else {
      console.log('Admin user already exists');
    }
  } catch (err) {
    console.error('Error creating admin user:', err);
  }
};
