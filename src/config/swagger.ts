import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Crypto Rewards API',
      version: '1.0.0',
      description:
        'API for rewarding users with crypto tokens on EVM-compatible blockchains',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['userId', 'walletAddress'],
          properties: {
            userId: {
              type: 'string',
              description: 'Unique identifier for the user',
            },
            walletAddress: {
              type: 'string',
              description: 'User Ethereum wallet address',
              example: '0x1234567890123456789012345678901234567890',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        TokenRewardResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            message: {
              type: 'string',
              example: 'Tokens successfully transferred',
            },
            data: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID',
                },
                recipient: {
                  type: 'string',
                  description: 'Recipient wallet address',
                },
                amount: {
                  type: 'string',
                  description: 'Amount of tokens transferred',
                },
                token: {
                  type: 'object',
                  properties: {
                    address: {
                      type: 'string',
                      description: 'Token contract address',
                    },
                    name: {
                      type: 'string',
                      description: 'Token name',
                    },
                    symbol: {
                      type: 'string',
                      description: 'Token symbol',
                    },
                  },
                },
                transactionHash: {
                  type: 'string',
                  description: 'Transaction hash',
                },
                blockNumber: {
                  type: 'number',
                  description: 'Block number where the transaction was mined',
                },
              },
            },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            data: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        LinkWalletResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            message: {
              type: 'string',
              example: 'Wallet successfully linked to user',
            },
            data: {
              $ref: '#/components/schemas/User',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec; 