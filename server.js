const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const authRoutes = require("./routes/auth");
const recipeRoutes = require("./routes/recipeRoutes"); // Added Recipe Routes
const userRecipeRoutes = require("./routes/userRecipeRoutes");

dotenv.config();
const app = express();

// Middleware to parse JSON
app.use(express.json());  // Ensure this is before routes

app.use(cors());

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Desarrollo I TPO API",
            version: "1.0.0",
            description: "API for user authentication and recipe management",
        },
        servers: [
            {
                url: "https://desarrolloitpoapi.onrender.com",
                description: "Producción (Render)"
              },
            {
              url: "http://localhost:5000",
              description: "Localhost (para desarrollo)"
            }
          ],                   
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: ["./routes/*.js"], // Ensures both auth and recipe routes are documented
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Database connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB Atlas');
});
mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error (EVENT):', err);
});
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/recipes", recipeRoutes); // Added recipe routes
app.use("/api/user/recipes", userRecipeRoutes); // Added user recipe routes here after json middleware

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
