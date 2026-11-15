require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@campus.edu';
    const adminPassword = 'AdminPassword123';

    let admin = await User.findOne({ email: adminEmail });
    if (admin) {
      admin.name = 'System Administrator';
      admin.role = 'admin';
      admin.password = adminPassword;
      await admin.save();
      console.log(`✅ Admin account updated successfully!`);
    } else {
      admin = await User.create({
        name: 'System Administrator',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });
      console.log(`✅ Admin account created successfully!`);
    }

    console.log('\n================================');
    console.log('  Admin Credentials:');
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log('  Role:     admin');
    console.log('================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
    process.exit(1);
  }
};

seedAdmin();

