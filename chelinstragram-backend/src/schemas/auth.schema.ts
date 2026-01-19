export const authSchemas = {
    LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
            username: { type: 'string', example: 'abraham_meza' },
            password: { type: 'string', example: 'password123' }
        }
    },
    AuthResponse: {
        type: 'object',
        properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' }
        }
    }
};