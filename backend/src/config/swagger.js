const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dumu Waks API Documentation',
      version: '1.0.0',
      description: 'AI-Powered Technician & Community Platform API',
      contact: {
        name: 'Dumu Waks Team',
        email: 'support@ementech.co.ke'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://dumuwaks.co.ke',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        // User Schema
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            phoneNumber: { type: 'string', example: '+254712345678' },
            role: {
              type: 'string',
              enum: ['customer', 'technician', 'admin', 'corporate', 'support'],
              example: 'customer'
            },
            profilePicture: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                publicId: { type: 'string' }
              }
            },
            bio: { type: 'string' },
            location: {
              type: 'object',
              properties: {
                type: { type: 'string', default: 'Point' },
                coordinates: { type: 'array', items: { type: 'number' } },
                address: { type: 'string' }
              }
            },
            rating: {
              type: 'object',
              properties: {
                average: { type: 'number', example: 4.5 },
                count: { type: 'number', example: 24 }
              }
            },
            isEmailVerified: { type: 'boolean' },
            status: {
              type: 'string',
              enum: ['active', 'suspended', 'deactivated', 'banned']
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Booking Schema
        Booking: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            bookingNumber: { type: 'string', example: 'BKG-1728563421-00001' },
            customer: { $ref: '#/components/schemas/User' },
            technician: { $ref: '#/components/schemas/User' },
            serviceType: { type: 'string', example: 'plumbing' },
            description: { type: 'string' },
            status: {
              type: 'string',
              enum: [
                'pending', 'awaiting_acceptance', 'accepted', 'in_progress',
                'completed', 'cancelled', 'disputed', 'refunded'
              ]
            },
            scheduledDate: { type: 'string', format: 'date-time' },
            serviceLocation: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                coordinates: { type: 'array', items: { type: 'number' } },
                address: { type: 'string' }
              }
            },
            pricing: {
              type: 'object',
              properties: {
                serviceCharge: { type: 'number' },
                materialsTotal: { type: 'number' },
                platformFee: { type: 'number' },
                totalAmount: { type: 'number' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },

        // Transaction Schema
        Transaction: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            transactionNumber: { type: 'string', example: 'TXN-1728563421-000001' },
            booking: { type: 'string' },
            payer: { type: 'string' },
            payee: { type: 'string' },
            amount: {
              type: 'object',
              properties: {
                gross: { type: 'number' },
                platformFee: { type: 'number' },
                net: { type: 'number' }
              }
            },
            gateway: {
              type: 'string',
              enum: ['mpesa', 'stripe', 'cash', 'wallet']
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'refunded']
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },

        // Post Schema
        Post: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
            type: {
              type: 'string',
              enum: ['text', 'image', 'video', 'portfolio', 'tip', 'question']
            },
            caption: { type: 'string' },
            media: { type: 'array', items: { type: 'object' } },
            engagement: {
              type: 'object',
              properties: {
                likes: { type: 'array', items: { type: 'string' } },
                comments: { type: 'array' },
                shares: { type: 'number' },
                views: { type: 'number' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },

        // Review Schema
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            booking: { type: 'string' },
            reviewer: { $ref: '#/components/schemas/User' },
            reviewee: { $ref: '#/components/schemas/User' },
            rating: {
              type: 'object',
              properties: {
                overall: { type: 'number', minimum: 1, maximum: 5 },
                quality: { type: 'number' },
                timeliness: { type: 'number' },
                professionalism: { type: 'number' },
                communication: { type: 'number' }
              }
            },
            title: { type: 'string' },
            comment: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },

        // Support Ticket Schema
        SupportTicket: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            ticketNumber: { type: 'string', example: 'TKT-1728563421-000001' },
            customer: { $ref: '#/components/schemas/User' },
            assignedTo: { $ref: '#/components/schemas/User' },
            subject: { type: 'string' },
            description: { type: 'string' },
            category: {
              type: 'string',
              enum: [
                'account', 'booking', 'payment', 'technical', 'billing',
                'complaint', 'feature_request', 'bug_report', 'general', 'other'
              ]
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent']
            },
            status: {
              type: 'string',
              enum: [
                'open', 'assigned', 'in_progress', 'waiting_customer',
                'waiting_internal', 'resolved', 'closed', 'reopened'
              ]
            },
            messages: { type: 'array', items: { type: 'object' } },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },

        // Error Response
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } }
          }
        },

        // Success Response
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ForbiddenError: {
          description: 'User does not have permission to access this resource',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User management and profiles'
      },
      {
        name: 'Bookings',
        description: 'Service booking management'
      },
      {
        name: 'Transactions',
        description: 'Payment and transaction management'
      },
      {
        name: 'Posts',
        description: 'Social media posts and community content'
      },
      {
        name: 'Reviews',
        description: 'Reviews and ratings'
      },
      {
        name: 'Conversations',
        description: 'Chat conversations'
      },
      {
        name: 'Messages',
        description: 'Chat messages'
      },
      {
        name: 'Notifications',
        description: 'User notifications'
      },
      {
        name: 'Support',
        description: 'Customer support and tickets'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/docs/swagger.docs.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
