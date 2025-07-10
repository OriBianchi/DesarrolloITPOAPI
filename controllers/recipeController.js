const Recipe = require("../models/Recipe");
const User = require("../models/User");

const VALID_UNITS = [
    "g", "kg", "unidades", "tazas", "ml",
    "cucharadas", "cucharaditas", "pizca", "litros", "cc"
];

const encodeImageToBase64 = (image) => {
    if (!image || !image.data) return null;
    return {
        base64: `data:${image.contentType};base64,${image.data.toString('base64')}`
    };
};

const transformRecipeImages = (recipe) => {
    const r = recipe.toObject ? recipe.toObject() : recipe;

    r.frontpagePhotos = (r.frontpagePhotos || []).map(encodeImageToBase64).filter(Boolean);
    r.steps = (r.steps || []).map(step => ({
        ...step,
        photos: (step.photos || []).map(encodeImageToBase64).filter(Boolean)
    }));

    return r;
};

const decodeBase64Image = (photo) => {
    if (!photo || !photo.data) return null;
    return {
        data: Buffer.from(photo.data, 'base64'),
        contentType: photo.contentType || 'image/jpeg'
    };
};

const recalculateRating = (recipe) => {
    const approvedWithRating = recipe.comments.filter(c => c.approved && typeof c.rating === "number");
    if (approvedWithRating.length === 0) {
        recipe.rating = 0;
    } else {
        const avg = approvedWithRating.reduce((sum, c) => sum + c.rating, 0) / approvedWithRating.length;
        recipe.rating = Math.round(avg * 10) / 10; // redondeo a 1 decimal
    }
};


// Crear receta
exports.createRecipe = async (req, res) => {
    try {
        const userId = req.userId;

        const { name, classification, description, portions, ingredients, steps } = req.body;
        const frontpagePhotosInput = req.body.frontpagePhotos || [];

        // Validar campos obligatorios
        if (!name || !classification || !description || !portions || !ingredients || !steps) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        // Buscar usuario para guardar username
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        // Limitar y decodificar imágenes de portada (máx 3)
        const frontpagePhotos = frontpagePhotosInput
            .slice(0, 3)
            .map(decodeBase64Image)
            .filter(Boolean); // Elimina nulos por seguridad

        // Decodificar fotos en los pasos (máx 3 por paso)
        const parsedSteps = steps.map((step) => ({
            description: step.description,
            photos: (step.photos || [])
                .slice(0, 3)
                .map(decodeBase64Image)
                .filter(Boolean)
        }));

        // Convertir nombres de ingredientes a minúsculas
        // Validar y normalizar ingredientes
        const validUnits = ["g", "kg", "unidades", "tazas", "ml", "cucharadas", "cucharaditas", "pizca", "otro"];

        // 👇 Sacá la división acá:
        const normalizedIngredients = ingredients.map(i => {
          if (!i.name || !i.amount || !i.unit || !VALID_UNITS.includes(i.unit)) {
            throw new Error(`Ingrediente inválido: ${JSON.stringify(i)}`);
          }

          return {
            name: i.name.toLowerCase(),
            amount: i.amount, // 👈 YA NO DIVIDAS
            unit: i.unit.toLowerCase()
          };
        });


        // Crear y guardar receta
        const newRecipe = new Recipe({
            name,
            classification,
            description,
            portions,
            ingredients: normalizedIngredients,
            steps: parsedSteps,
            frontpagePhotos,
            userId,
            username: user.username
        });

        const savedRecipe = await newRecipe.save();

        // Opcional: actualizar usuario si guardás recetas en su documento
        await User.findByIdAndUpdate(userId, { $push: { recipes: savedRecipe._id } });

        res.status(201).json({ message: "Receta creada con éxito", recipe: savedRecipe });

    } catch (error) {
        console.error("❌ Error creando receta:", error);
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
        const transformed = recipes.map(transformRecipeImages);

        res.status(200).json(transformed);
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

        recipe.comments = recipe.comments.filter(c => c.approved);

        const transformed = transformRecipeImages(recipe);
        res.status(200).json(transformed);
    } catch (error) {
        console.error("❌ Error fetching recipe:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

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
        console.log("📥 Query params:", req.query);

        // Búsqueda por nombre, descripción o ingrediente
        if (name) {
            const nameRegex = new RegExp(name, "i");
            query.$or = [
                { name: nameRegex },
                { description: nameRegex },
                { "ingredients.name": nameRegex }
            ];
            console.log("🔍 Name search added:", query.$or);
        }

        // Clasificación
        if (classification) {
            const tipos = classification.split(',').map(c => new RegExp(`^${c.trim()}$`, "i"));
            query.classification = { $in: tipos };
            console.log("📂 Classification filter:", query.classification);
        }

        // Incluir y excluir ingredientes
        const condicionesIngrediente = [];

        if (ingredient) {
          const incluidos = ingredient.split(',').map(i => i.trim());
          const incluyeAND = incluidos.map(i => ({
            "ingredients.name": new RegExp(`^${i}$`, "i")
          }));
          condicionesIngrediente.push(...incluyeAND);
        }


        if (excludeIngredient) {
            const excluidos = excludeIngredient.split(',').map(i => i.trim());
            condicionesIngrediente.push({
                "ingredients.name": {
                    $nin: excluidos.map(i => new RegExp(`^${i}$`, "i"))
                }
            });
        }

        if (condicionesIngrediente.length === 1) {
            Object.assign(query, condicionesIngrediente[0]);
        } else if (condicionesIngrediente.length > 1) {
            query.$and = condicionesIngrediente;
        }

        console.log("🧾 Final query before user filters:", JSON.stringify(query, null, 2));

        // Autor
        if (createdBy) {
            const usernames = createdBy.split(',').map(u => u.trim());
            const users = await User.find({ username: { $in: usernames } });

            if (users.length > 0) {
                const userIds = users.map(u => u._id);
                query.userId = { $in: userIds };
                console.log("👤 Author filter:", userIds);
            } else {
                return res.status(404).json({ message: "Ninguno de los usuarios fue encontrado" });
            }
        }

        // Guardados
        if (savedByUser === "true") {
            const user = await User.findById(req.userId).select("savedRecipes");
            if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
            query._id = { $in: user.savedRecipes };
            console.log("💾 Saved recipes filter:", user.savedRecipes);
        }

        // Ordenamiento
        const sort = {};
        if (sortBy && ["name", "uploadDate", "username"].includes(sortBy)) {
            sort[sortBy] = sortOrder === "asc" ? 1 : -1;
            console.log("📊 Sorting:", sort);
        }

        console.log("🚀 Final Mongo query:", JSON.stringify(query, null, 2));

        let recipes = await Recipe.find(query).sort(sort).populate("userId", "username");

        // Campo isSaved
        if (req.userId) {
            const user = await User.findById(req.userId).select("savedRecipes");
            const savedSet = new Set(user?.savedRecipes.map(id => id.toString()));

            recipes = recipes.map(recipe => {
                const transformed = transformRecipeImages(recipe);
                transformed.isSaved = savedSet.has(recipe._id.toString());
                return transformed;
            });
        } else {
            recipes = recipes.map(transformRecipeImages);
        }

        console.log("✅ Recetas encontradas:", recipes.length);
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

        const {
            name,
            classification,
            description,
            portions,
            ingredients,
            steps,
            frontpagePhotos
        } = req.body;

        if (name) recipe.name = name;
        if (classification) recipe.classification = classification;
        if (description) recipe.description = description;
        if (portions) recipe.portions = portions;

        if (Array.isArray(ingredients)) {
            recipe.ingredients = ingredients.map(i => {
                if (!i.name || !i.amount || !i.unit || !VALID_UNITS.includes(i.unit)) {
                    throw new Error(`Ingrediente inválido: ${JSON.stringify(i)}`);
                }

                return {
                    name: i.name.toLowerCase(),
                    amount: i.amount,
                    unit: i.unit.toLowerCase()
                };
            });
        }

        // Procesar fotos portada si vienen
        if (Array.isArray(frontpagePhotos)) {
            recipe.frontpagePhotos = frontpagePhotos
                .slice(0, 3)
                .map(decodeBase64Image)
                .filter(Boolean);
        }

        // Procesar pasos con fotos si vienen
        if (Array.isArray(steps)) {
            recipe.steps = steps.map((step) => ({
                description: step.description,
                photos: (step.photos || [])
                    .slice(0, 3)
                    .map(decodeBase64Image)
                    .filter(Boolean)
            }));
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

// Comentar receta
exports.addComment = async (req, res) => {
    try {
        const userId = req.userId;
        const { text, rating } = req.body;
        const recipeId = req.params.recipeId;

        if (!text || text.length > 500 || typeof rating !== "number" || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Comentario o calificación inválida" });
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
            rating,
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
        recalculateRating(recipe);
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
        recalculateRating(recipe);
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

exports.getPendingRecipes = async (req, res) => {
    try {
        let recipes = await Recipe.find({ status: false }).populate("userId", "username");

        // Aplicamos la transformación (solo 1 imagen, sin steps completos)
        recipes = recipes.map(transformRecipeImages);

        res.status(200).json({ pendingRecipes: recipes });
    } catch (error) {
        console.error("❌ Error en getPendingRecipes:", error);
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
// Chequear receta duplicada del mismo usuario

exports.checkUserRecipeName = async (req, res) => {
  try {
    const { name } = req.query;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ message: "Falta el nombre" });
    }

    const exists = await Recipe.findOne({ name, userId });
    if (exists) {
      return res.json({ exists: true, id: exists._id });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("❌ Error checkUserRecipeName:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};
