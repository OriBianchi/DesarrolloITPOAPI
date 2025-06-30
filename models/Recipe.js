const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema({
    status: { type: Boolean, default: false }, // False until authorized
    uploadDate: { type: Date, default: Date.now },
    name: { type: String, required: true, maxlength: 30 },
    classification: { 
        type: String, 
        required: true, 
        enum: ["Desayuno", "Almuerzo", "Cena", "Merienda", "Snack", "Vegano", "Vegetariano", "Sin TACC", "Otro"] 
    },
    description: { type: String, required: true, maxlength: 200 },
    rating: { type: Number, default: 0 },
    ratings: [{ userId: mongoose.Schema.Types.ObjectId, rating: Number }], // For calculating avg rating

    // TO-DO: GESTIONAR TEMA IMAGWENES
    frontpagePhotos: [{ data: Buffer, contentType: String }], // Storing images directly in MongoDB
    portions: { type: Number, required: true },
    ingredients: [{ name: String, amount: Number }],
    steps: [{ description: String, photos: [{ data: Buffer, contentType: String }] }],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    comments: [{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true},
  text: { type: String, required: true, maxlength: 500 },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}]

});

module.exports = mongoose.model("Recipe", recipeSchema);
