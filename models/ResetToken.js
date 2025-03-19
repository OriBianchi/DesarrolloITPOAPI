const mongoose = require("mongoose");

const ResetTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to the User model
        required: true,
    },
    resetToken: {
        type: String,
        required: true,
    },
    expirationDate: {
        type: Date,
        required: true,
    },
});

module.exports = mongoose.model("ResetToken", ResetTokenSchema);
