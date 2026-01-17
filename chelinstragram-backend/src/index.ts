import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { authenticateToken } from './middleware/authMiddleware';
import { login } from './controllers/authController';
import { getConversation, sendMessage } from "./controllers/chatController";
import multer from "multer";
import { createPost, getFeed } from "./controllers/feedController";
import path from 'path';
import { addComment, getCommentsByPost, toggleLike } from "./controllers/interactionController";
import { getProfile, updateProfile } from "./controllers/userController";

const app = express();
const upload = multer({ dest: 'uploads/' }); // Images will be saved here
app.use(express.json());

// 1. Swagger Definition
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Chelinstagram API',
            version: '1.0.0',
            description: 'Private API for Abraham and Graciela',
        },
        servers: [
            {
                url: 'http://localhost:3001',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    // Path to the API docs (where your JSDoc comments are)
    apis: ['./src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Auth Route
app.post('/api/auth/login', login);

// Chat Routes
app.get('/api/chat/conversations', authenticateToken, getConversation);
app.post('/api/chat/messages', authenticateToken, sendMessage);

// IMPORTANT: This allows your browser to see the images via URL
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.post('/api/posts', authenticateToken, upload.single('image'), createPost);
app.get('/api/posts', authenticateToken, getFeed);

// Protected Interaction Routes
app.post('/api/interactions/like', authenticateToken, toggleLike);
app.post('/api/interactions/comment', authenticateToken, addComment);
app.get('/api/interactions/comments/:postId', authenticateToken, getCommentsByPost);

// Profile Routes
app.get('/api/users/profile', authenticateToken, getProfile);
app.patch('/api/users/profile', authenticateToken, upload.single('avatar'), updateProfile);

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 API: http://localhost:${PORT}`);
    console.log(`📖 Docs: http://localhost:${PORT}/api-docs`);
});