require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const FacultyProfile = require('./models/FacultyProfile');
const Department = require('./models/Department');
const Course = require('./models/Course');

const facultiesData = [
  {
    name: 'Dr. Rajesh Sharma',
    email: 'rajesh.sharma@campus.edu',
    facultyId: 'FAC-1001',
    designation: 'Professor & HOD',
    qualification: 'Ph.D. in Artificial Intelligence (IIT Delhi)',
    specialization: 'Artificial Intelligence & Deep Learning',
    experience: 14,
    phone: '+91 98765 43210',
    deptCode: 'CSE',
    deptName: 'Computer Science & Engineering',
    courseCode: 'CS301',
    courseName: 'Deep Learning & Neural Networks',
  },
  {
    name: 'Dr. Priya Nambiar',
    email: 'priya.nambiar@campus.edu',
    facultyId: 'FAC-1002',
    designation: 'Associate Professor',
    qualification: 'Ph.D. in Cyber Security (IISc Bangalore)',
    specialization: 'Cybersecurity, Cryptography & Network Security',
    experience: 10,
    phone: '+91 98765 43211',
    deptCode: 'ISE',
    deptName: 'Information Science & Engineering',
    courseCode: 'IS204',
    courseName: 'Network Security & Cryptography',
  },
  {
    name: 'Prof. Vikramaditya Joshi',
    email: 'vikram.joshi@campus.edu',
    facultyId: 'FAC-1003',
    designation: 'Associate Professor',
    qualification: 'M.Tech, Ph.D. in VLSI & Embedded Systems (NIT Surathkal)',
    specialization: 'Embedded Systems, IoT & Robotics',
    experience: 9,
    phone: '+91 98765 43212',
    deptCode: 'ECE',
    deptName: 'Electronics & Communication Engineering',
    courseCode: 'EC202',
    courseName: 'Microcontrollers & Embedded Systems',
  },
  {
    name: 'Dr. Sneha Kulkarni',
    email: 'sneha.kulkarni@campus.edu',
    facultyId: 'FAC-1004',
    designation: 'Assistant Professor',
    qualification: 'Ph.D. in Data Science & Cloud Computing (BITS Pilani)',
    specialization: 'Cloud Computing, Big Data Analytics & Distributed Systems',
    experience: 6,
    phone: '+91 98765 43213',
    deptCode: 'CSE',
    deptName: 'Computer Science & Engineering',
    courseCode: 'CS205',
    courseName: 'Cloud Computing Architecture',
  },
  {
    name: 'Dr. Amitav Banerjee',
    email: 'amitav.banerjee@campus.edu',
    facultyId: 'FAC-1005',
    designation: 'Professor',
    qualification: 'Ph.D. in Thermal & Fluid Engineering (IIT Madras)',
    specialization: 'Computational Fluid Dynamics & Thermodynamics',
    experience: 12,
    phone: '+91 98765 43214',
    deptCode: 'ME',
    deptName: 'Mechanical Engineering',
    courseCode: 'ME302',
    courseName: 'Applied Thermodynamics & Heat Transfer',
  },
];

const DEFAULT_PASSWORD = 'Faculty@123';

const seedFaculties = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    for (const f of facultiesData) {
      // 1. Ensure Department exists
      let dept = await Department.findOne({ code: f.deptCode });
      if (!dept) {
        dept = await Department.create({
          name: f.deptName,
          code: f.deptCode,
          head: f.name,
          description: `Department of ${f.deptName}`,
        });
        console.log(`🏛️  Created Department: ${f.deptCode} (${f.deptName})`);
      }

      // 2. Ensure Course exists and is assigned
      let course = await Course.findOne({ code: f.courseCode });
      if (!course) {
        course = await Course.create({
          name: f.courseName,
          code: f.courseCode,
          department: dept._id,
          instructor: f.name,
          credits: 4,
          semester: 'Fall',
          year: new Date().getFullYear(),
          maxStudents: 60,
        });
        console.log(`📚 Created Course: ${f.courseCode} - ${f.courseName}`);
      }

      // 3. Create or update User login
      let user = await User.findOne({ email: f.email.toLowerCase() });
      if (user) {
        user.name = f.name;
        user.role = 'faculty';
        user.password = DEFAULT_PASSWORD;
        await user.save();
        console.log(`👤 Updated User account: ${f.email}`);
      } else {
        user = await User.create({
          name: f.name,
          email: f.email.toLowerCase(),
          password: DEFAULT_PASSWORD,
          role: 'faculty',
        });
        console.log(`👤 Created User account: ${f.email}`);
      }

      // 4. Create or update FacultyProfile
      let profile = await FacultyProfile.findOne({
        $or: [{ facultyId: f.facultyId }, { email: f.email.toLowerCase() }, { user: user._id }],
      });

      if (profile) {
        profile.user = user._id;
        profile.facultyId = f.facultyId;
        profile.name = f.name;
        profile.email = f.email.toLowerCase();
        profile.phone = f.phone;
        profile.department = dept._id;
        profile.designation = f.designation;
        profile.qualification = f.qualification;
        profile.specialization = f.specialization;
        profile.experience = f.experience;
        if (!profile.courses.includes(course._id)) {
          profile.courses.push(course._id);
        }
        await profile.save();
        console.log(`🧑‍🏫 Updated Faculty Profile: ${f.name} (${f.facultyId})\n`);
      } else {
        await FacultyProfile.create({
          user: user._id,
          facultyId: f.facultyId,
          name: f.name,
          email: f.email.toLowerCase(),
          phone: f.phone,
          department: dept._id,
          designation: f.designation,
          qualification: f.qualification,
          specialization: f.specialization,
          experience: f.experience,
          courses: [course._id],
          status: 'active',
          joinedYear: new Date().getFullYear() - Math.min(f.experience, 5),
        });
        console.log(`🧑‍🏫 Created Faculty Profile: ${f.name} (${f.facultyId})\n`);
      }
    }

    console.log('========================================================================');
    console.log(' 🎉 5 Faculty Members Successfully Added!');
    console.log(' Default Password for all accounts: ' + DEFAULT_PASSWORD);
    console.log('========================================================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding faculties:', error.message);
    process.exit(1);
  }
};

seedFaculties();

