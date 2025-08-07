
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token missing" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.userType;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
