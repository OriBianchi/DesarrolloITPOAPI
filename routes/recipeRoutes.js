const express = require("express");
const router = express.Router();

const { 
  createRecipe, 
  getUserRecipes, 
  getRecipeById, 
  getFilteredRecipes,
  updateRecipe,
  deleteRecipe,
  rateRecipe,
  addComment,
  approveRecipe,
  rejectRecipe,
  approveComment, // 👈 new
  rejectComment,
  getPendingRecipes,
  getPendingComments
} = require("../controllers/recipeController");

const authMiddleware = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

/**
 * @swagger
 * tags:
 *   name: Recipes
 *   description: API for managing recipes
 */

/**
 * @swagger
 * /api/recipes/pending:
 *   get:
 *     summary: Get all recipes pending approval
 *     description: Allows an admin to fetch all unapproved recipes (status = false).
 *     tags: [Admin Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unapproved recipes.
 *       403:
 *         description: Forbidden – admin access required.
 *       500:
 *         description: Server error.
 */
router.get("/pending", authMiddleware, requireAdmin, getPendingRecipes);

/**
 * @swagger
 * /api/recipes/comments/pending:
 *   get:
 *     summary: Get all comments pending approval
 *     description: Allows an admin to view all unapproved comments across all recipes.
 *     tags: [Admin Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unapproved comments.
 *       403:
 *         description: Forbidden – admin access required.
 *       500:
 *         description: Server error.
 */
router.get("/comments/pending", authMiddleware, requireAdmin, getPendingComments);


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
 * /api/recipes/{recipeId}:
 *   put:
 *     summary: Update a recipe
 *     description: Allows the recipe owner to update their recipe.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the recipe to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               classification:
 *                 type: string
 *               description:
 *                 type: string
 *               portions:
 *                 type: number
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     amount:
 *                       type: number
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description:
 *                       type: string
 *                     photos:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       200:
 *         description: Recipe updated successfully.
 *       403:
 *         description: Forbidden – not the recipe owner.
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Server error.
 */
router.put("/:recipeId", authMiddleware, updateRecipe);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   delete:
 *     summary: Delete a recipe
 *     description: Allows the recipe owner to delete their recipe.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the recipe to delete.
 *     responses:
 *       200:
 *         description: Recipe deleted successfully.
 *       403:
 *         description: Forbidden – not the recipe owner.
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Server error.
 */
router.delete("/:recipeId", authMiddleware, deleteRecipe);

/**
 * @swagger
 * /api/recipes/{recipeId}/rate:
 *   post:
 *     summary: Rate a recipe
 *     description: Allows a user to rate a recipe (1 to 5). Only one rating per user.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the recipe to rate.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 example: 4
 *     responses:
 *       200:
 *         description: Rating submitted or updated.
 *       400:
 *         description: Invalid input or rating out of range.
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Server error.
 */
router.post("/:recipeId/rate", authMiddleware, rateRecipe);

/**
 * @swagger
 * /api/recipes/{recipeId}/comment:
 *   post:
 *     summary: Add a comment to a recipe
 *     description: Allows a logged-in user to leave a comment. Comments require admin approval before being visible.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the recipe to comment on.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 500
 *                 example: "¡Me encantó esta receta! Muy fácil de seguir."
 *     responses:
 *       201:
 *         description: Comment submitted for approval.
 *       400:
 *         description: Invalid input (e.g., missing or too long comment).
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Server error.
 */
router.post("/:recipeId/comment", authMiddleware, addComment);


/**
 * @swagger
 * tags:
 *   name: Admin Tasks
 *   description: For accepting and rejecting Recipes and Comments.
 */

/**
 * @swagger
 * /api/recipes/{recipeId}/comments/{commentId}/approve:
 *   patch:
 *     summary: Approve a comment on a recipe
 *     description: Allows an admin to approve a comment so it becomes visible to all users.
 *     tags: [Admin Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the recipe that contains the comment.
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the comment to approve.
 *     responses:
 *       200:
 *         description: Comment approved successfully.
 *       403:
 *         description: Forbidden – admin access required.
 *       404:
 *         description: Recipe or comment not found.
 *       500:
 *         description: Server error.
 */
router.patch("/:recipeId/comments/:commentId/approve", authMiddleware, requireAdmin, approveComment);

/**
 * @swagger
 * /api/recipes/{recipeId}/comments/{commentId}/reject:
 *   delete:
 *     summary: Reject and delete a comment
 *     description: Allows an admin to reject a comment. The comment is permanently deleted.
 *     tags: [Admin Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the recipe that contains the comment.
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the comment to reject and delete.
 *     responses:
 *       200:
 *         description: Comment successfully deleted.
 *       403:
 *         description: Forbidden – admin access required.
 *       404:
 *         description: Recipe or comment not found.
 *       500:
 *         description: Server error.
 */
router.delete("/:recipeId/comments/:commentId/reject", authMiddleware, requireAdmin, rejectComment);

/**
 * @swagger
 * /api/recipes/{recipeId}/approve:
 *   patch:
 *     summary: Approve a recipe
 *     description: Allows an admin to approve a recipe, making it publicly visible.
 *     tags: [Admin Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the recipe to approve.
 *     responses:
 *       200:
 *         description: Recipe approved successfully.
 *       403:
 *         description: Forbidden – admin access required.
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Server error.
 */
router.patch("/:recipeId/approve", authMiddleware, requireAdmin, approveRecipe);

/**
 * @swagger
 * /api/recipes/{recipeId}/reject:
 *   delete:
 *     summary: Reject and delete a recipe
 *     description: Allows an admin to reject (delete) a recipe from the system.
 *     tags: [Admin Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the recipe to reject and delete.
 *     responses:
 *       200:
 *         description: Recipe rejected and deleted.
 *       403:
 *         description: Forbidden – admin access required.
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Server error.
 */
router.delete("/:recipeId/reject", authMiddleware, requireAdmin, rejectRecipe);

module.exports = router;
