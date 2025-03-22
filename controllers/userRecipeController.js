const User = require("../models/User");
const Recipe = require("../models/Recipe");

// Save a recipe (add to savedRecipes)
exports.saveRecipe = async (req, res) => {
    try {
        const userId = req.userId; // Retrieved from authentication middleware
        const { recipeId } = req.body;

        // Check if the recipe exists
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ message: "Receta no encontrada" });
        }

        // Update user's savedRecipes array if it's not already saved
        const user = await User.findById(userId);
        if (user.savedRecipes.includes(recipeId)) {
            return res.status(400).json({ message: "Receta ya guardada" });
        }

        user.savedRecipes.push(recipeId);
        await user.save();

        res.status(200).json({ message: "Receta guardada con éxito" });
    } catch (error) {
        console.error("❌ Error saving recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Remove a saved recipe
exports.unsaveRecipe = async (req, res) => {
    try {
        const userId = req.userId; // Retrieved from authentication middleware
        const { recipeId } = req.body;

        // Remove recipe from savedRecipes
        await User.findByIdAndUpdate(userId, { $pull: { savedRecipes: recipeId } });

        res.status(200).json({ message: "Receta eliminada de guardados" });
    } catch (error) {
        console.error("❌ Error removing saved recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Get all saved recipes for a user
exports.getSavedRecipes = async (req, res) => {
    try {
        const userId = req.userId; // Retrieved from authentication middleware

        // Find user and populate savedRecipes
        const user = await User.findById(userId).populate("savedRecipes");
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.status(200).json(user.savedRecipes);
    } catch (error) {
        console.error("❌ Error fetching saved recipes:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};
