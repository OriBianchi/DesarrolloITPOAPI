const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    savedRecipes: { type: [mongoose.Schema.Types.ObjectId], ref: "Recipe", default: [] },  // Initialized as an empty array
    role: { type: String, enum: ["user", "admin"], default: "user" },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
