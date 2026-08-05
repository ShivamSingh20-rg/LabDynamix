const jwt = require('jsonwebtoken');

// Base Authentication verification check
const verifyAppToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access Denied: Token missing.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ message: 'Access Denied: Token malformed.' });
  }

  try {
    // Fallback secret ensures process doesn't throw 500 if env variable is missing
    const secret = process.env.JWT_SECRET || 'your_fallback_secret_key';
    const verified = jwt.verify(token, secret);

    // Map properties safely (handles both verified.id and verified._id)
    req.user = {
      id: verified.id || verified._id,
      name: verified.name,
      email: verified.email,
      role: verified.role
    };

    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    return res.status(401).json({ message: 'Session expired or token invalid.' });
  }
};

// Flexible Role Authorization Guard
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Forbidden: User identity or role missing.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = {
  verifyAppToken,
  authorizeRoles
};