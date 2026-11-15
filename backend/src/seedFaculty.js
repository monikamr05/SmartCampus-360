require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const FacultyProfile = require('./models/FacultyProfile');
const Department = require('./models/Department');
const Course = require('./models/Course');

const seedFaculty = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const facultyEmail = 'faculty@campus.edu';
    const facultyPassword = 'FacultyPassword123';
    const facultyName = 'Dr. Robert Smith';

    // 1. Ensure a department exists
    let dept = await Department.findOne({ code: 'CSE' });
    if (!dept) {
      dept = await Department.create({
        name: 'Computer Science & Engineering',
        code: 'CSE',
        head: facultyName,
        description: 'Department of Computer Science',
      });
      console.log('✅ Created Department: CSE');
    }

    // 2. Ensure sample course exists
    let course = await Course.findOne({ code: 'CS101' });
    if (!course) {
      course = await Course.create({
        name: 'Data Structures & Algorithms',
        code: 'CS101',
        department: dept._id,
        instructor: facultyName,
        credits: 4,
        semester: 'Fall',
        year: new Date().getFullYear(),
        maxStudents: 60,
      });
      console.log('✅ Created Course: CS101');
    }

    // 3. Ensure User exists
    let user = await User.findOne({ email: facultyEmail });
    if (user) {
      user.name = facultyName;
      user.role = 'faculty';
      user.password = facultyPassword;
      await user.save();
      console.log('✅ Updated Faculty User');
    } else {
      user = await User.create({
        name: facultyName,
        email: facultyEmail,
        password: facultyPassword,
        role: 'faculty',
      });
      console.log('✅ Created Faculty User');
    }

    // 4. Ensure FacultyProfile exists and is linked
    let profile = await FacultyProfile.findOne({
      $or: [{ user: user._id }, { email: facultyEmail }],
    });

    if (profile) {
      profile.user = user._id;
      profile.name = facultyName;
      profile.email = facultyEmail;
      profile.department = dept._id;
      if (!profile.courses.includes(course._id)) {
        profile.courses.push(course._id);
      }
      await profile.save();
      console.log('✅ Updated Faculty Profile');
    } else {
      await FacultyProfile.create({
        user: user._id,
        facultyId: 'FAC-1001',
        name: facultyName,
        email: facultyEmail,
        phone: '+1 555-0199',
        department: dept._id,
        designation: 'Professor',
        qualification: 'Ph.D. in Computer Science',
        experience: 8,
        specialization: 'Algorithms & AI',
        courses: [course._id],
        joinedYear: 2020,
      });
      console.log('✅ Created Faculty Profile with assigned course');
    }

    console.log('\n================================');
    console.log('  Faculty Login Credentials:');
    console.log(`  Email:    ${facultyEmail}`);
    console.log(`  Password: ${facultyPassword}`);
    console.log('  Role:     faculty');
    console.log('================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding faculty:', error.message);
    process.exit(1);
  }
};

seedFaculty();

