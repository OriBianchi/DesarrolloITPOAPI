const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    savedRecipes: { type: [mongoose.Schema.Types.ObjectId], ref: "Recipe", default: [] },  // Initialized as an empty array
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
