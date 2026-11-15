// Role-based access control middleware
// Usage: router.get('/admin-only', protect, requireRole('admin'), handler)
//        router.get('/staff',      protect, requireRole('admin', 'faculty'), handler)

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. Required role: ${roles.join(' or ')}`,
    });
  }
  next();
};

module.exports = { requireRole };
