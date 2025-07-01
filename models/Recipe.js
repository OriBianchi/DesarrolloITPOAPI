const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema({
    status: { type: Boolean, default: false },
    uploadDate: { type: Date, default: Date.now },
    name: { type: String, required: true, maxlength: 30 },
    classification: { 
        type: String, 
        required: true, 
        enum: ["Desayuno", "Almuerzo", "Cena", "Merienda", "Snack", "Vegano", "Vegetariano", "Sin TACC", "Otro"] 
    },
    description: { type: String, required: true, maxlength: 200 },
    rating: { type: Number, default: 0 },
    frontpagePhotos: [{ data: Buffer, contentType: String }],
    portions: { type: Number, required: true },
    ingredients: [{
      name: { type: String, required: true },
      amount: { type: Number, required: true },
      unit: {
        type: String,
        enum: ["g", "kg", "unidades", "tazas", "ml", "cucharadas", "cucharaditas", "pizca", "litros", "cc"],
        required: true
      }
    }],
    steps: [{ description: String, photos: [{ data: Buffer, contentType: String }] }],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true},
    comments: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      username: { type: String, required: true },
      text: { type: String, required: true, maxlength: 500 },
      rating: { type: Number, required: true, min: 1, max: 5 },
      approved: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }]
    
});

module.exports = mongoose.model("Recipe", recipeSchema);
