const express = require("express");
const router = express.Router();

const {
  saveRecipe,
  unsaveRecipe,
  getSavedRecipes
} = require("../controllers/userRecipeController");

const authMiddleware = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Saved Recipes
 *   description: For handling saved recipes of a user.
 */

/**
 * @swagger
 * /api/user/recipes/save:
 *   post:
 *     summary: Save a recipe to the user's saved recipes
 *     description: Allows a logged-in user to save a recipe.
 *     tags: [Saved Recipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipeId
 *             properties:
 *               recipeId:
 *                 type: string
 *                 example: "60b90b100f1c2c1b8a9b3f2c"
 *     responses:
 *       200:
 *         description: Recipe saved successfully.
 *       400:
 *         description: Recipe already saved.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Server error.
 */
router.post("/save", authMiddleware, saveRecipe);

/**
 * @swagger
 * /api/user/recipes/unsave:
 *   post:
 *     summary: Remove a saved recipe from the user's saved recipes
 *     description: Allows a logged-in user to unsave a recipe.
 *     tags: [Saved Recipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipeId
 *             properties:
 *               recipeId:
 *                 type: string
 *                 example: "60b90b100f1c2c1b8a9b3f2c"
 *     responses:
 *       200:
 *         description: Recipe removed from saved list.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Server error.
 */
router.post("/unsave", authMiddleware, unsaveRecipe);

/**
 * @swagger
 * /api/user/recipes/saved:
 *   get:
 *     summary: Get all saved recipes for the authenticated user
 *     description: Fetches all recipes that the user has saved.
 *     tags: [Saved Recipes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved recipes.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Server error.
 */
router.get("/saved", authMiddleware, getSavedRecipes);

module.exports = router;