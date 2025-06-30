const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Acceso denegado" });

    console.log("🔑 Token recibido:", token);

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
        console.log("🧩 Decoded token:", verified);
        req.userId = verified.userId;
        next();
    } catch (error) {
        console.error("❌ Token verification failed:", error);
        res.status(400).json({ message: "Token inválido" });
    }
};

module.exports = authMiddleware;