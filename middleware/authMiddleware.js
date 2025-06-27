const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Acceso denegado" });

    try {
        // Log the token to verify it's passed correctly
        console.log("🔑 Token received:", token);

        // Verify the token
        const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
        
        // Log the decoded token
        console.log("🧩 Decoded token:", verified);
        
        // Store the userId in the request object
        req.userId = verified.userId || verified.id;
        next();
    } catch (error) {
        console.error("❌ Token verification failed:", error);
        res.status(400).json({ message: "Token inválido" });
    }
};

module.exports = authMiddleware;
