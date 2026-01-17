import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { authenticateToken } from './middleware/authMiddleware';
import { login } from './controllers/authController';
import { getConversation, sendMessage, startConversation } from "./controllers/chatController";
import multer from "multer";
import { createPost, deletePost, getFeed, updatePost } from "./controllers/feedController";
import path from 'path';
import { addComment, getCommentsByPost, toggleLike } from "./controllers/interactionController";
import { getProfile, getUserById, searchUsers, updateProfile, toggleFollow } from "./controllers/userController";
import cors from 'cors';
import { authSchemas } from "./schemas/auth.schema";
import { userSchemas } from "./schemas/user.schema";
import { chatSchemas } from "./schemas/chat.schema";
import { feedSchemas } from "./schemas/feed.schema";
import { interactionSchemas } from "./schemas/interaction.schema";

const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true, // Useful if you ever switch to cookies for Auth
};

const app = express();

// --- MULTER CONFIGURATION START ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Make sure this folder exists in your root
    },
    filename: (req, file, cb) => {
        // Generates a name like: 1705432100-992837.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });
// --- MULTER CONFIGURATION END ---

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
            schemas: {
                ...userSchemas,
                ...authSchemas,
                ...chatSchemas,
                ...feedSchemas,
                ...interactionSchemas
            }
        },
    },
    // Path to the API docs (where your JSDoc comments are)
    apis: ['./src/controllers/*.ts'],
};

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST') console.log('Body Payload:', req.body);
    next();
});

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs-json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Auth Route
app.post('/api/auth/login', login);

// Chat Routes
app.get('/api/chat/conversations', authenticateToken, getConversation);
app.post('/api/chat/messages', authenticateToken, sendMessage);
app.post('/api/chat/start', authenticateToken, startConversation);

// IMPORTANT: This allows your browser to see the images via URL
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Post Routes
app.post('/api/posts', authenticateToken, upload.single('image'), createPost);
app.get('/api/posts', authenticateToken, getFeed);
app.patch('/api/posts/:postId', authenticateToken, updatePost);
app.delete('/api/posts/:postId', authenticateToken, deletePost);

// Protected Interaction Routes
app.post('/api/interactions/like', authenticateToken, toggleLike);
app.post('/api/interactions/comment', authenticateToken, addComment);
app.get('/api/interactions/comments/:postId', authenticateToken, getCommentsByPost);

// Profile Routes
app.get('/api/users/profile', authenticateToken, getProfile);
app.patch('/api/users/profile', authenticateToken, upload.single('avatar'), updateProfile);
app.post('/api/users/follow', authenticateToken, toggleFollow);

// User Search Route
app.get('/api/users/search', authenticateToken, searchUsers);
app.get('/api/users/:userId', authenticateToken, getUserById);

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 API: http://localhost:${PORT}`);
    console.log(`📖 Docs: http://localhost:${PORT}/api-docs`);
});