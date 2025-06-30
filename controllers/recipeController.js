const Recipe = require("../models/Recipe");
const User = require("../models/User");

// Crear receta
exports.createRecipe = async (req, res) => {
    try {
        const userId = req.userId;

        const { name, classification, description, portions, ingredients, steps } = req.body;

        if (!name || !classification || !description || !portions || !ingredients || !steps) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

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

        const savedRecipe = await newRecipe.save();
        await User.findByIdAndUpdate(userId, { $push: { recipes: savedRecipe._id } });

        res.status(201).json({ message: "Receta creada con éxito", recipe: savedRecipe });
    } catch (error) {
        console.error("❌ Error creating recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Obtener recetas de un usuario
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
            filter.status = true;
        }

        const recipes = await Recipe.find(filter);
        res.status(200).json(recipes);
    } catch (error) {
        console.error("❌ Error fetching user recipes:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Obtener receta por ID
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

// Obtener recetas filtradas
exports.getFilteredRecipes = async (req, res) => {
    try {
        const {
            name,
            classification,
            ingredient,
            excludeIngredient,
            createdBy,
            sortBy,
            sortOrder = "asc",
            savedByUser
        } = req.query;

        const query = {};

        if (name) {
            query.$or = [
                { name: { $regex: name, $options: "i" } },
                { description: { $regex: name, $options: "i" } },
                { "ingredients.name": { $regex: name, $options: "i" } }
            ];
        }

        if (classification) {
            query.classification = classification;
        }

        if (ingredient) {
            const ingredientes = ingredient.split(',').map(i => i.trim().toLowerCase());
            query["ingredients.name"] = { $in: ingredientes };
        }

        if (excludeIngredient) {
            const excludeArray = excludeIngredient.split(',').map(s => s.trim());
            query["ingredients.name"] = { $nin: excludeArray };
        }

        if (createdBy) {
            const usernames = createdBy.split(',').map(u => u.trim());
            const users = await User.find({ username: { $in: usernames } });

            if (users.length > 0) {
                const userIds = users.map(u => u._id);
                query.userId = { $in: userIds };
            } else {
                return res.status(404).json({ message: "Ninguno de los usuarios fue encontrado" });
            }
        }

        if (savedByUser === "true") {
            const user = await User.findById(req.userId).select("savedRecipes");
            if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
            query._id = { $in: user.savedRecipes };
        }

        const sort = {};
        if (sortBy && ["name", "uploadDate", "username"].includes(sortBy)) {
            sort[sortBy] = sortOrder === "asc" ? 1 : -1;
        }

        let recipes = await Recipe.find(query).sort(sort);

        if (req.userId) {
            const user = await User.findById(req.userId).select("savedRecipes");
            const savedSet = new Set(user?.savedRecipes.map(id => id.toString()));

            recipes = recipes.map(recipe => {
                const recipeObj = recipe.toObject();
                recipeObj.isSaved = savedSet.has(recipe._id.toString());
                return recipeObj;
            });
        }

        res.status(200).json({ recipes });
    } catch (error) {
        console.error("❌ Error fetching recipes:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Actualizar receta
exports.updateRecipe = async (req, res) => {
    try {
        const recipeId = req.params.recipeId;
        const userId = req.userId;

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) return res.status(404).json({ message: "Receta no encontrada" });
        if (recipe.userId.toString() !== userId) {
            return res.status(403).json({ message: "No tienes permiso para editar esta receta" });
        }

        const allowedFields = ["name", "classification", "description", "portions", "ingredients", "steps"];
        for (const key in req.body) {
            if (allowedFields.includes(key)) {
                recipe[key] = req.body[key];
            }
        }

        const updatedRecipe = await recipe.save();
        res.status(200).json({ message: "Receta actualizada", recipe: updatedRecipe });
    } catch (error) {
        console.error("❌ Error updating recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Eliminar receta
exports.deleteRecipe = async (req, res) => {
    try {
        const recipeId = req.params.recipeId;
        const userId = req.userId;

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) return res.status(404).json({ message: "Receta no encontrada" });
        if (recipe.userId.toString() !== userId) {
            return res.status(403).json({ message: "No tienes permiso para eliminar esta receta" });
        }

        await Recipe.findByIdAndDelete(recipeId);
        res.status(200).json({ message: "Receta eliminada" });
    } catch (error) {
        console.error("❌ Error deleting recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Calificar receta
exports.rateRecipe = async (req, res) => {
    try {
        const userId = req.userId;
        const recipeId = req.params.recipeId;
        const { rating } = req.body;

        if (typeof rating !== "number" || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "La calificación debe ser un número entre 1 y 5" });
        }

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) return res.status(404).json({ message: "Receta no encontrada" });

        const existing = recipe.ratings.findIndex(r => r.userId.toString() === userId);
        if (existing !== -1) {
            recipe.ratings[existing].rating = rating;
        } else {
            recipe.ratings.push({ userId, rating });
        }

        recipe.rating = recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length;
        await recipe.save();

        res.status(200).json({ message: "Calificación actualizada", rating: recipe.rating });
    } catch (error) {
        console.error("❌ Error rating recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Comentar receta
exports.addComment = async (req, res) => {
    try {
        const userId = req.userId;
        const { text } = req.body;
        const recipeId = req.params.recipeId;

        if (!text || text.length > 500) {
            return res.status(400).json({ message: "Comentario inválido" });
        }

        // Buscar receta
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) return res.status(404).json({ message: "Receta no encontrada" });

        // Buscar username del autor del comentario
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        // Agregar comentario con username incluido
        recipe.comments.push({
            userId,
            username: user.username,
            text,
            approved: false,
            createdAt: new Date()
        });

        await recipe.save();

        res.status(201).json({ message: "Comentario enviado" });

    } catch (error) {
        console.error("❌ Error comentando:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Aprobar comentario
exports.approveComment = async (req, res) => {
    try {
        const { recipeId, commentId } = req.params;
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

// Rechazar comentario
exports.rejectComment = async (req, res) => {
    try {
        const { recipeId, commentId } = req.params;
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) return res.status(404).json({ message: "Receta no encontrada" });

        recipe.comments = recipe.comments.filter(c => c._id.toString() !== commentId);
        await recipe.save();

        res.status(200).json({ message: "Comentario eliminado" });
    } catch (error) {
        console.error("❌ Error rechazando comentario:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Aprobar receta
exports.approveRecipe = async (req, res) => {
    try {
        const { recipeId } = req.params;
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) return res.status(404).json({ message: "Receta no encontrada" });

        recipe.status = true;
        await recipe.save();
        res.status(200).json({ message: "Receta aprobada" });
    } catch (error) {
        console.error("❌ Error aprobando receta:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Rechazar receta
exports.rejectRecipe = async (req, res) => {
    try {
        const { recipeId } = req.params;
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) return res.status(404).json({ message: "Receta no encontrada" });

        await Recipe.findByIdAndDelete(recipeId);
        res.status(200).json({ message: "Receta eliminada" });
    } catch (error) {
        console.error("❌ Error rechazando receta:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Pendientes
exports.getPendingRecipes = async (req, res) => {
    try {
        const recipes = await Recipe.find({ status: false }).populate("userId", "username email");
        res.status(200).json({ pendingRecipes: recipes });
    } catch (error) {
        console.error("❌ Error pendientes:", error);
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
    } catch (error) {
        console.error("❌ Error comentarios pendientes:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};