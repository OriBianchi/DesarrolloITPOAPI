const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const authRoutes = require("./routes/auth");

dotenv.config();
const app = express();

// Middleware to parse JSON
app.use(express.json());
app.use(cors());

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",  // Swagger version
        info: {
            title: "Desarrollo I TPO API",  // API title
            version: "1.0.0",  // API version
            description: "API for user authentication and management",  // API description
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 5000}`,  // URL of the API
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",  // Optional: just for documentation, indicates JWT
                },
            },
        },
    },
    apis: ["./routes/*.js"],  // Path to the routes you want to document
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Swagger UI setup
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Database connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
