export const authSchemas = {
    LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
            username: { type: 'string', example: 'abraham_meza' },
            password: { type: 'string', example: '!Q2w3e4r5' }
        }
    },
    AuthResponse: {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Login successful!' },
            accessToken: {
                type: 'string',
                description: 'JWT short-lived access token'
            },
            user: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    displayName: { type: 'string', nullable: true },
                    avatarUrl: { type: 'string', nullable: true }
                }
            }
        }
    }
};