const User = require("../models/User");

const requireAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || user.role !== "admin") {
            return res.status(403).json({ message: "Acceso denegado: Se requiere rol de administrador" });
        }
        next();
    } catch (err) {
        console.error("❌ Error en middleware de admin:", err);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

module.exports = requireAdmin;
