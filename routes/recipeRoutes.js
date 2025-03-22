const express = require("express");
const router = express.Router();
const { 
  createRecipe, 
  getUserRecipes, 
  getRecipeById, 
  getFilteredRecipes  // Add the import here
} = require("../controllers/recipeController");  // Ensure getFilteredRecipes is part of the imports
const authMiddleware = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Recipes
 *   description: API for managing recipes
 */

/**
 * @swagger
 * /api/recipes/create:
 *   post:
 *     summary: Create a new recipe
 *     description: Allows a logged-in user to create a recipe.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - classification
 *               - description
 *               - portions
 *               - ingredients
 *               - steps
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 30
 *                 example: "Pasta Carbonara"
 *               classification:
 *                 type: string
 *                 example: "Breakfast"
 *               description:
 *                 type: string
 *                 maxLength: 200
 *                 example: "A classic Italian pasta dish with eggs, cheese, pancetta, and pepper."
 *               portions:
 *                 type: integer
 *                 example: 2
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Eggs"
 *                     amount:
 *                       type: number
 *                       example: 2
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description:
 *                       type: string
 *                       example: "Boil pasta"
 *                     photos:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *     responses:
 *       201:
 *         description: Recipe successfully created.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Server error.
 */
router.post("/create", authMiddleware, createRecipe);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   get:
 *     summary: Get recipe by ID
 *     description: Retrieves a single recipe by its ID.
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the recipe.
 *     responses:
 *       200:
 *         description: Recipe details.
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Server error.
 */
router.get("/:recipeId", getRecipeById);

/**
 * @swagger
 * /api/recipes:
 *   get:
 *     summary: Get filtered and sorted recipes
 *     description: Retrieves recipes with various filtering and sorting options.
 *     tags: [Recipes]
 *     parameters:
 *       - in: query
 *         name: name
 *         required: false
 *         schema:
 *           type: string
 *         description: Name or partial name of the recipe.
 *       - in: query
 *         name: classification
 *         required: false
 *         schema:
 *           type: string
 *         description: Classification of the recipe (e.g., Breakfast, Dinner).
 *       - in: query
 *         name: ingredient
 *         required: false
 *         schema:
 *           type: string
 *         description: Ingredient to search for.
 *       - in: query
 *         name: excludeIngredient
 *         required: false
 *         schema:
 *           type: string
 *         description: Ingredient to exclude from the recipes.
 *       - in: query
 *         name: createdBy
 *         required: false
 *         schema:
 *           type: string
 *         description: Username to filter by.
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [name, uploadDate, username]
 *         description: Field to sort the recipes by.
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (ascending or descending).
 *       - in: query
 *         name: savedByUser
 *         required: false
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by saved recipes (true to filter for saved recipes).
 *     responses:
 *       200:
 *         description: List of filtered and sorted recipes.
 *       500:
 *         description: Server error.
 */
router.get("/", getFilteredRecipes);  // This will now call the getFilteredRecipes function from recipeController

module.exports = router;
