// Import dependencies
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // To generate secure tokens
const nodemailer = require("nodemailer"); // For sending emails
const User = require("../models/User");  // Ensure this path is correct
const ResetToken = require("../models/ResetToken");  // A new model to store reset tokens
console.log(ResetToken);  // This should log the model definition, not 'undefined'

// Register function
exports.register = async (req, res) => {
    try {
        console.log("📥 Received request:", req.body);

        const { username, email, password } = req.body;

        // Validate input fields
        if (!username || !email || !password) {
            console.error("❌ Missing required fields");
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.error("⚠️ User already exists:", existingUser);
            return res.status(400).json({ message: "El usuario ya existe" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("🔐 Hashed password generated");

        // Create new user
        const user = new User({ username, email, password: hashedPassword });
        console.log("📌 Saving user to DB:", user);

        // Save user to the database
        await user.save();

        console.log("✅ User registered successfully!");
        return res.status(201).json({ message: "Usuario registrado con éxito" });

    } catch (error) {
        console.error("❌ Error al registrar usuario:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
};

// Login function
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input fields
        if (!email || !password) {
            console.error("❌ Missing required fields");
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            console.error("⚠️ User not found:", email);
            return res.status(400).json({ message: "Usuario no encontrado" });
        }

        // Compare the password with the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.error("❌ Invalid credentials");
            return res.status(400).json({ message: "Credenciales inválidas" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        console.log("✅ User logged in successfully!");
        return res.status(200).json({ token });

    } catch (error) {
        console.error("❌ Error during login:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
};

// Get user function
exports.getUser = async (req, res) => {
    try {
        const userId = req.userId;  // Make sure this is correctly set in the middleware
        console.log("🔍 Searching for user with ID:", userId);

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            console.error("⚠️ User not found:", userId);
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Exclude password from the user object
        const { password, ...userData } = user._doc;

        return res.status(200).json(userData);

    } catch (error) {
        console.error("❌ Error getting user:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
};

// Request password reset function
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({ message: "El correo electrónico es obligatorio" });
        }

        // Find the user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Usuario no encontrado" });
        }

        // Generate reset code (6 characters, alphanumeric)
        const resetCode = crypto.randomBytes(3).toString('hex');  // 6 chars (3 bytes * 2 hex chars each)

        // Save the reset code in the database with expiration
        const expirationDate = Date.now() + 3600000;  // Code expires in 1 hour
        const resetTokenDoc = new ResetToken({ userId: user._id, resetToken: resetCode, expirationDate });
        await resetTokenDoc.save();

        // Send reset code via email (email sending logic)
        const transporter = nodemailer.createTransport({
            service: "gmail",  // For example, using Gmail (configure your own email service)
            auth: {
                user: "email.serviceacc.1@gmail.com",  // Your Gmail email
                pass: "hxko gpme rmjb lbva",           // The App Password
            },
        });

        const mailOptions = {
            to: email,
            subject: "Password Reset Request",
            html: `<p>You requested a password reset. Your reset code is: <strong>${resetCode}</strong></p>`,  // Sending the code instead of a link
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("❌ Error sending email:", err);
                return res.status(500).json({ message: "Error al enviar el correo electrónico" });
            }
            console.log("✅ Reset email sent:", info.response);
            return res.status(200).json({ message: "Se ha enviado un correo electrónico con el código de restablecimiento" });
        });
        
    } catch (error) {
        console.error("❌ Error requesting password reset:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
};

// Verify reset code function
exports.verifyResetCode = async (req, res) => {
    try {
        const { resetCode } = req.body;

        // Validate reset code
        if (!resetCode) {
            return res.status(400).json({ message: "El código de restablecimiento es obligatorio" });
        }

        // Check if the reset token exists and is valid
        const resetTokenDoc = await ResetToken.findOne({ resetToken: resetCode });
        if (!resetTokenDoc || resetTokenDoc.expirationDate < Date.now()) {
            return res.status(400).json({ message: "Código de restablecimiento inválido o expirado" });
        }

        return res.status(200).json({ message: "Código de restablecimiento verificado" });

    } catch (error) {
        console.error("❌ Error verifying reset code:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
};

// Reset password function
exports.resetPassword = async (req, res) => {
    try {
        const { resetCode, newPassword } = req.body;

        // Validate input
        if (!resetCode || !newPassword) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        // Find the reset token in the database
        const resetTokenDoc = await ResetToken.findOne({ resetToken: resetCode });
        if (!resetTokenDoc || resetTokenDoc.expirationDate < Date.now()) {
            return res.status(400).json({ message: "Código de restablecimiento inválido o expirado" });
        }

        // Find the user and update password
        const user = await User.findById(resetTokenDoc.userId);
        if (!user) {
            return res.status(400).json({ message: "Usuario no encontrado" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        // Remove the reset token after successful password reset
        await ResetToken.deleteOne({ resetToken: resetCode });

        return res.status(200).json({ message: "Contraseña restablecida con éxito" });

    } catch (error) {
        console.error("❌ Error resetting password:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
};
