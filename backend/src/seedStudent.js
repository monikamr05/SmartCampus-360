require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const StudentProfile = require('./models/StudentProfile');
const Department = require('./models/Department');
const Course = require('./models/Course');

const seedStudent = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const studentEmail = 'student@campus.edu';
    const studentPassword = 'StudentPassword123';
    const studentName = 'Alex Johnson';

    // 1. Ensure department exists
    let dept = await Department.findOne({ code: 'CSE' });
    if (!dept) {
      dept = await Department.create({
        name: 'Computer Science & Engineering',
        code: 'CSE',
        head: 'Dr. Robert Smith',
        description: 'Department of Computer Science',
      });
    }

    // 2. Ensure course exists
    let course = await Course.findOne({ code: 'CS101' });
    if (!course) {
      course = await Course.create({
        name: 'Data Structures & Algorithms',
        code: 'CS101',
        department: dept._id,
        credits: 4,
        semester: 'Fall',
        year: new Date().getFullYear(),
      });
    }

    // 3. Ensure User exists
    let user = await User.findOne({ email: studentEmail });
    if (user) {
      user.name = studentName;
      user.role = 'student';
      user.password = studentPassword;
      await user.save();
      console.log('✅ Updated Student User');
    } else {
      user = await User.create({
        name: studentName,
        email: studentEmail,
        password: studentPassword,
        role: 'student',
      });
      console.log('✅ Created Student User');
    }

    // 4. Ensure StudentProfile exists
    let profile = await StudentProfile.findOne({
      $or: [{ user: user._id }, { email: studentEmail }],
    });

    if (profile) {
      profile.user = user._id;
      profile.name = studentName;
      profile.email = studentEmail;
      profile.department = dept._id;
      if (!profile.courses.includes(course._id)) {
        profile.courses.push(course._id);
      }
      await profile.save();
      console.log('✅ Updated Student Profile');
    } else {
      await StudentProfile.create({
        user: user._id,
        studentId: 'STU-202401',
        name: studentName,
        email: studentEmail,
        department: dept._id,
        enrolledYear: 2024,
        semester: 3,
        gpa: 3.75,
        attendancePct: 88,
        status: 'active',
        courses: [course._id],
      });
      console.log('✅ Created Student Profile');
    }

    console.log('\n================================');
    console.log('  Student Login Credentials:');
    console.log(`  Email:    ${studentEmail}`);
    console.log(`  Password: ${studentPassword}`);
    console.log('  Role:     student');
    console.log('================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding student:', error.message);
    process.exit(1);
  }
};

seedStudent();

