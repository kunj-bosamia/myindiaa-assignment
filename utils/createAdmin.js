const User = require('../models/User');
const bcrypt = require('bcryptjs');

// just for development purpose it will create an admin user if not exists whenever a server starts
// email - admin@admin.com
// password - admin
exports.createAdmin = async () => {
  try {
    const adminEmail = 'admin@admin.com';
    const adminPassword = 'admin';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      const admin = new User({
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
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
