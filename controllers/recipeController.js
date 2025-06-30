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

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Create the new recipe
        const newRecipe = new Recipe({
            name,
            classification,
            description,
            portions,
            ingredients,
            steps,
            userId,
            username: user.username
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
        const { username } = req.params;
        const requestingUserId = req.userId;

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        const requestingUser = await User.findById(requestingUserId);

        const isAdmin = requestingUser?.role === "admin";
        const isOwner = requestingUserId === user._id.toString();

        const filter = { userId: user._id };
        if (!isAdmin && !isOwner) {
            filter.status = true; // Only approved if not owner/admin
        }

        const recipes = await Recipe.find(filter);
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

        if (!recipe) return res.status(404).json({ message: "Receta no encontrada" });

        const requestingUserId = req.userId;
        const requestingUser = await User.findById(requestingUserId);

        const isAdmin = requestingUser?.role === "admin";
        const isOwner = recipe.userId._id.toString() === requestingUserId;

        if (!recipe.status && !isAdmin && !isOwner) {
            return res.status(403).json({ message: "No tienes permiso para ver esta receta" });
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

// Update an existing recipe
exports.updateRecipe = async (req, res) => {
    try {
        const recipeId = req.params.recipeId;
        const userId = req.userId;

        const existingRecipe = await Recipe.findById(recipeId);

        if (!existingRecipe) {
            return res.status(404).json({ message: "Receta no encontrada" });
        }

        if (existingRecipe.userId.toString() !== userId) {
            return res.status(403).json({ message: "No tienes permiso para editar esta receta" });
        }

        const allowedFields = ["name", "classification", "description", "portions", "ingredients", "steps"];
        for (const key in req.body) {
            if (allowedFields.includes(key)) {
                existingRecipe[key] = req.body[key];
            }
        }

        const updatedRecipe = await existingRecipe.save();
        res.status(200).json({ message: "Receta actualizada con éxito", recipe: updatedRecipe });

    } catch (error) {
        console.error("❌ Error updating recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Delete a recipe (only by owner)
exports.deleteRecipe = async (req, res) => {
    try {
        const recipeId = req.params.recipeId;
        const userId = req.userId;

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ message: "Receta no encontrada" });
        }

        if (recipe.userId.toString() !== userId) {
            return res.status(403).json({ message: "No tienes permiso para eliminar esta receta" });
        }

        await Recipe.findByIdAndDelete(recipeId);

        res.status(200).json({ message: "Receta eliminada con éxito" });
    } catch (error) {
        console.error("❌ Error deleting recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Rate or update rating on a recipe
exports.rateRecipe = async (req, res) => {
    try {
        const userId = req.userId;
        const recipeId = req.params.recipeId;
        const { rating } = req.body;

        if (typeof rating !== "number" || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "La calificación debe ser un número entre 1 y 5" });
        }

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ message: "Receta no encontrada" });
        }

        const existingRatingIndex = recipe.ratings.findIndex(r => r.userId.toString() === userId);

        if (existingRatingIndex !== -1) {
            // Update existing rating
            recipe.ratings[existingRatingIndex].rating = rating;
        } else {
            // Add new rating
            recipe.ratings.push({ userId, rating });
        }

        // Recalculate average
        const total = recipe.ratings.reduce((sum, r) => sum + r.rating, 0);
        recipe.rating = total / recipe.ratings.length;

        await recipe.save();

        res.status(200).json({ message: "Calificación registrada", rating: recipe.rating });
    } catch (error) {
        console.error("❌ Error rating recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};
exports.addComment = async (req, res) => {
    try {
        const userId = req.userId;
        const { text } = req.body;
        const recipeId = req.params.recipeId;

        if (!text || text.length > 500) {
            return res.status(400).json({ message: "Comentario inválido" });
        }

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ message: "Receta no encontrada" });
        }

        const newComment = {
            userId,
            text,
            approved: false, // default
            createdAt: new Date()
        };

        recipe.comments.push(newComment);
        await recipe.save();

        res.status(201).json({ message: "Comentario enviado para revisión" });
    } catch (error) {
        console.error("❌ Error al comentar:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};
exports.approveComment = async (req, res) => {
    try {
        const { recipeId, commentId } = req.params;

        // You can add role-based checks here if needed
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) return res.status(404).json({ message: "Receta no encontrada" });

        const comment = recipe.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comentario no encontrado" });

        comment.approved = true;
        await recipe.save();

        res.status(200).json({ message: "Comentario aprobado" });
    } catch (error) {
        console.error("❌ Error aprobando comentario:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};
exports.rejectComment = async (req, res) => {
    try {
        const { recipeId, commentId } = req.params;

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) return res.status(404).json({ message: "Receta no encontrada" });

        const comment = recipe.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comentario no encontrado" });

        // Remove the comment manually
        recipe.comments = recipe.comments.filter(c => c._id.toString() !== commentId);

        await recipe.save();

        res.status(200).json({ message: "Comentario rechazado y eliminado" });
    } catch (error) {
        console.error("❌ Error rejecting comment:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

exports.approveRecipe = async (req, res) => {
    try {
        const { recipeId } = req.params;

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ message: "Receta no encontrada" });
        }

        recipe.status = true;
        await recipe.save();

        res.status(200).json({ message: "Receta aprobada con éxito" });
    } catch (error) {
        console.error("❌ Error approving recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

exports.rejectRecipe = async (req, res) => {
    try {
        const { recipeId } = req.params;

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ message: "Receta no encontrada" });
        }

        await Recipe.findByIdAndDelete(recipeId);

        res.status(200).json({ message: "Receta rechazada y eliminada correctamente" });
    } catch (error) {
        console.error("❌ Error rejecting recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

exports.getPendingRecipes = async (req, res) => {
    try {
        const recipes = await Recipe.find({ status: false }).populate("userId", "username email");

        res.status(200).json({ pendingRecipes: recipes });
    } catch (error) {
        console.error("❌ Error fetching pending recipes:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

exports.getPendingComments = async (req, res) => {
    try {
        const recipes = await Recipe.find({ "comments.approved": false })
            .select("name comments")
            .populate("comments.userId", "username");

        const unapprovedComments = [];

        recipes.forEach(recipe => {
            recipe.comments.forEach(comment => {
                if (!comment.approved) {
                    unapprovedComments.push({
                        recipeId: recipe._id,
                        recipeName: recipe.name,
                        commentId: comment._id,
                        text: comment.text,
                        user: comment.userId,
                        createdAt: comment.createdAt
                    });
                }
            });
        });

        res.status(200).json(unapprovedComments);
    } catch (err) {
        console.error("❌ Error fetching unapproved comments:", err);
        res.status(500).json({ message: "Error en el servidor" });
    }
};
