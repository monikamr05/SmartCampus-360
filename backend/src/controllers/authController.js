const jwt = require('jsonwebtoken');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const FacultyProfile = require('../models/FacultyProfile');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Helper: Ensure profile exists for student / faculty
const ensureUserProfile = async (user) => {
  try {
    if (user.role === 'student') {
      let profile = await StudentProfile.findOne({
        $or: [{ user: user._id }, { email: user.email }],
      });
      if (profile) {
        if (!profile.user) {
          profile.user = user._id;
          await profile.save();
        }
      } else {
        const studentId = `STU-${Math.floor(100000 + Math.random() * 900000)}`;
        await StudentProfile.create({
          user: user._id,
          studentId,
          name: user.name,
          email: user.email,
          enrolledYear: new Date().getFullYear(),
          semester: 1,
        });
      }
    } else if (user.role === 'faculty') {
      let profile = await FacultyProfile.findOne({
        $or: [{ user: user._id }, { email: user.email }],
      });
      if (profile) {
        if (!profile.user) {
          profile.user = user._id;
          await profile.save();
        }
      } else {
        const facultyId = `FAC-${Math.floor(1000 + Math.random() * 9000)}`;
        await FacultyProfile.create({
          user: user._id,
          facultyId,
          name: user.name,
          email: user.email,
          joinedYear: new Date().getFullYear(),
        });
      }
    }
  } catch (err) {
    console.error('Error ensuring user profile:', err.message);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: role || 'student',
    });

    await ensureUserProfile(user);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (user && (await user.matchPassword(password))) {
      await ensureUserProfile(user);

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not found' });
  }
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
};

module.exports = { registerUser, loginUser, getUserProfile };
