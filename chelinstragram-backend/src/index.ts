import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { authenticateToken } from './middleware/authMiddleware';
import { login } from './controllers/authController';
import { getConversation, sendMessage } from "./controllers/chatController";

const app = express();
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
app.get('/api/chat/conversations', authenticateToken, getConversation);
app.post('/api/chat/messages', authenticateToken, sendMessage);

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 API: http://localhost:${PORT}`);
    console.log(`📖 Docs: http://localhost:${PORT}/api-docs`);
});