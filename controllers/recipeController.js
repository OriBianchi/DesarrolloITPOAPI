const Recipe = require("../models/Recipe");
const User = require("../models/User");

// Create a new recipe
exports.createRecipe = async (req, res) => {
    try {
        const userId = req.userId; // Set in authentication middleware
        const { name, classification, description, portions, ingredients, steps } = req.body;

        // Validate required fields
        if (!name || !classification || !description || !portions || !ingredients || !steps) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        // Create the new recipe
        const newRecipe = new Recipe({
            name,
            classification,
            description,
            portions,
            ingredients,
            steps,
            userId
        });

        // Save recipe
        const savedRecipe = await newRecipe.save();

        // Add recipe ID to the user's recipes array
        await User.findByIdAndUpdate(userId, { $push: { recipes: savedRecipe._id } });

        res.status(201).json({ message: "Receta creada con éxito", recipe: savedRecipe });

    } catch (error) {
        console.error("❌ Error creating recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Get all recipes from a user by username
exports.getUserRecipes = async (req, res) => {
    try {
        const { username } = req.params;  // Get username from the route parameter
        
        // Find the user by username
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Now that we have the user, find their recipes
        const recipes = await Recipe.find({ userId: user._id });  // Search by userId, which we get from the found user

        res.status(200).json(recipes);
    } catch (error) {
        console.error("❌ Error fetching user recipes:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Get a single recipe by ID
exports.getRecipeById = async (req, res) => {
    try {
        const recipeId = req.params.recipeId;
        const recipe = await Recipe.findById(recipeId).populate("userId", "username email");

        if (!recipe) {
            return res.status(404).json({ message: "Receta no encontrada" });
        }

        res.status(200).json(recipe);
    } catch (error) {
        console.error("❌ Error fetching recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Get filtered recipes based on query parameters
exports.getFilteredRecipes = async (req, res) => {
    try {
        // Extract query params
        const {
            name,
            classification,
            ingredient,
            excludeIngredient,
            createdBy,
            sortBy,
            sortOrder = "asc",
            savedByUser, // New query parameter to filter by saved recipes
        } = req.query;

        // Build Mongo query
        const query = {};

        // Filter by name (partial match)
        if (name) {
            query.name = { $regex: name, $options: "i" };  // Case-insensitive match
        }

        // Filter by classification
        if (classification) {
            query.classification = classification;
        }

        // Filter by ingredients (recipes that contain this ingredient)
        if (ingredient) {
            query["ingredients.name"] = { $regex: ingredient, $options: "i" };  // Case-insensitive match
        }

        // Exclude recipes with specific ingredient
        if (excludeIngredient) {
            query["ingredients.name"] = { $ne: excludeIngredient };  // Exclude recipes containing this ingredient
        }

        // Filter by user ID
        if (createdBy) {
            const user = await User.findOne({ username: createdBy });
            if (user) {
                query.userId = user._id;
            } else {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }
        }

        // Handle filtering by saved recipes
        if (savedByUser === "true") {
            const user = await User.findById(req.userId).select("savedRecipes");
            if (!user) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }
            query._id = { $in: user.savedRecipes };  // Only return recipes that the user has saved
        }

        // Build sort object
        const sort = {};
        if (sortBy) {
            if (sortBy === "name" || sortBy === "uploadDate" || sortBy === "username") {
                sort[sortBy] = sortOrder === "asc" ? 1 : -1;
            }
        }

        // Retrieve recipes from the database
        const recipes = await Recipe.find(query).sort(sort);

        return res.status(200).json({ recipes });
    } catch (error) {
        console.error("❌ Error fetching recipes:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};
