const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check if header exists and starts with Bearer
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // 2. Extract token from header
    const token = authHeader.split(" ")[1];

    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach user ID to request object
    req.user = { id: decoded.id };

    next(); // Let the request continue to the route
  } catch (err) {
    res.status(401).json({ message: "Token is invalid", error: err.message });
  }
};

module.exports = protect;



