/**
 * src/config/swagger.ts
 * ===========================
 * OpenAPI 3.0 specification for the Solo Plantas API.
 * Served via swagger-ui-express at GET /api/v1/docs
 * ===========================
 */

import { SwaggerUiOptions } from 'swagger-ui-express';

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Solo Plantas API',
    version: '1.0.0',
    description:
      'Backend REST API for the **Solo Plantas** iOS plant e-commerce app. ' +
      'Handles authentication, plant catalog, cart reservations, Stripe payments, and order management.',
    contact: {
      name: 'Solo Plantas Dev Team',
      url: 'https://github.com/JorgeVillaFa/Solo_Plantas_Backend',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Local development (Docker)',
    },
  ],

  // ---- Security Schemes ----
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login or /auth/register',
      },
    },

    // ---- Reusable Schemas ----
    schemas: {
      // ---- Generic ----
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Invalid email or password' },
          details: { type: 'object', nullable: true },
        },
      },

      // ---- Auth ----
      RegisterBody: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'usuario@ejemplo.com' },
          password: { type: 'string', minLength: 8, example: 'miPassword123' },
        },
      },
      LoginBody: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'usuario@ejemplo.com' },
          password: { type: 'string', example: 'miPassword123' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _count: {
                type: 'object',
                properties: {
                  userPlants: { type: 'integer', description: 'Owned plants count' },
                  orders: { type: 'integer' },
                },
              },
            },
          },
        },
      },

      // ---- Catalog ----
      PlantSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Primavera' },
          scientificName: { type: 'string', example: 'Roseodendron donnell-smithii' },
          price: { type: 'integer', example: 49900, description: 'Price in MXN cents' },
          priceActive: { type: 'boolean', example: true, description: 'false → frontend shows price as null' },
          description: { type: 'string', nullable: true },
          illustrationName: { type: 'string', nullable: true },
          dominantColor: { type: 'string', nullable: true, example: 'yellow' },
          seasonCategory: { type: 'string', nullable: true, example: 'spring' },
          growthType: { type: 'string', nullable: true, example: 'tall' },
          stock: { type: 'integer', example: 50 },
          owned: { type: 'boolean', example: false },
        },
      },
      PlantDetail: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Primavera' },
          scientificName: { type: 'string' },
          price: { type: 'integer', description: 'Price in MXN cents' },
          priceActive: { type: 'boolean' },
          description: { type: 'string', nullable: true },
          ecologicalRole: { type: 'string', nullable: true },
          illustrationName: { type: 'string', nullable: true },
          tempMin: { type: 'number', example: 15 },
          tempMax: { type: 'number', example: 38 },
          season: { type: 'string', nullable: true, example: 'Blooms January–March' },
          seasonCategory: { type: 'string', nullable: true, example: 'spring' },
          growthType: { type: 'string', nullable: true, example: 'tall' },
          dominantColor: { type: 'string', nullable: true, example: 'yellow' },
          growthMilestones: { type: 'array', items: { type: 'integer' }, example: [5, 20, 40, 70] },
          riddle: { type: 'string', nullable: true },
          careInstructions: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
            description: 'Step-by-step care guide',
          },
          stock: { type: 'integer' },
          owned: { type: 'boolean' },
          activatedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      PlantSeed: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              plantId: { type: 'string', format: 'uuid' },
              seed: {
                type: 'object',
                description: 'L-System JSON seed (<= 10 KB)',
                properties: {
                  axiom: { type: 'string', example: 'F' },
                  rules: { type: 'object', example: { F: 'FF+[+F-F-F]-[-F+F+F]' } },
                  angle: { type: 'number', example: 22.5 },
                  depth: { type: 'integer', example: 4 },
                },
              },
            },
          },
        },
      },
      RecommendationsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              currentTemp: { type: 'number', example: 23.4 },
              lat: { type: 'number', example: 20.6597 },
              lon: { type: 'number', example: -103.3496 },
              recommendations: {
                type: 'array',
                items: { $ref: '#/components/schemas/PlantSummary' },
              },
            },
          },
        },
      },

      // ---- Cart ----
      ReserveBody: {
        type: 'object',
        required: ['plantId', 'quantity'],
        properties: {
          plantId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', minimum: 1, maximum: 10, example: 1 },
        },
      },
      CartReservation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          inventoryId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer' },
          expiresAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ---- Payments ----
      PaymentIntentBody: {
        type: 'object',
        required: ['plantId', 'shippingType'],
        properties: {
          plantId: { type: 'string', format: 'uuid' },
          shippingType: { type: 'string', enum: ['delivery', 'pickup'] },
          nurseryId: { type: 'string', format: 'uuid', nullable: true, description: 'Required when shippingType is pickup' },
          address: {
            type: 'object',
            nullable: true,
            description: 'Required when shippingType is delivery',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zipCode: { type: 'string' },
              country: { type: 'string' },
              references: { type: 'string', nullable: true },
            },
          },
        },
      },
      PaymentIntentResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              clientSecret: { type: 'string', description: 'Stripe clientSecret — use on-device to complete payment' },
              orderId: { type: 'string', format: 'uuid' },
              totalAmountCents: { type: 'integer', example: 39800 },
            },
          },
        },
      },

      // ---- Orders ----
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'activated'] },
          shippingType: { type: 'string', enum: ['delivery', 'pickup'] },
          totalAmountCents: { type: 'integer' },
          shippingFeeCents: { type: 'integer' },
          trackingNumber: { type: 'string', nullable: true },
          stripePaymentIntentId: { type: 'string', nullable: true },
          shippingAddress: { type: 'string', nullable: true, description: 'JSON string of delivery address' },
          activatedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          plant: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              scientificName: { type: 'string' },
              illustrationName: { type: 'string', nullable: true },
              price: { type: 'integer', description: 'Price in MXN cents' },
            },
          },
          nursery: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              address: { type: 'string' },
            },
          },
        },
      },

      // ---- Nurseries ----
      Nursery: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Bosque Urbano Extra A.C.' },
          address: { type: 'string', example: 'Av. Patria 1000, Bosque Los Colomos, Guadalajara' },
          description: { type: 'string', example: 'NGO offering free plant adoption with just your ID.' },
          lat: { type: 'number', example: 20.709 },
          lon: { type: 'number', example: -103.396 },
          schedule: { type: 'string', nullable: true, example: 'Lun-Vie 9am-6pm, Sáb 9am-3pm' },
          phone: { type: 'string', nullable: true, example: '+52 33 1234 5678' },
        },
      },

      // ---- Chat ----
      ChatBody: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            maxLength: 2000,
            example: '¿Cuánto cuesta la Tronadora y cómo la cuido?',
          },
          conversationId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Omitir en el primer mensaje; incluir para continuar una conversación existente.',
          },
        },
      },
      ChatResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              reply: { type: 'string', example: 'La Tronadora cuesta $249.00 MXN. Para cuidarla...' },
              conversationId: {
                type: 'string',
                format: 'uuid',
                description: 'Guarda este ID para continuar la conversación en el siguiente mensaje.',
              },
            },
          },
        },
      },
    },
  },

  // ---- Paths ----
  paths: {

    // =========================
    // AUTH
    // =========================
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Crear cuenta',
        description: 'Registra un nuevo usuario y devuelve un JWT de acceso.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterBody' } } },
        },
        responses: {
          201: { description: 'Cuenta creada', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          409: { description: 'Email ya registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          422: { description: 'Validación fallida', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        description: 'Autentica usuario con email + contraseña. Devuelve JWT.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginBody' } } },
        },
        responses: {
          200: { description: 'Login exitoso', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Credenciales inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          422: { description: 'Validación fallida', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Cerrar sesión',
        description: 'Logout stateless — el servidor solo confirma. El cliente debe descartar el JWT (iOS Keychain).',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Sesión cerrada' },
          401: { description: 'Token inválido o faltante' },
        },
      },
    },

    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Perfil del usuario actual',
        description: 'Devuelve información del usuario autenticado incluyendo conteo de plantas y órdenes.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Perfil del usuario', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } } },
          401: { description: 'No autenticado' },
          404: { description: 'Usuario no encontrado' },
        },
      },
    },

    // =========================
    // CATALOG
    // =========================
    '/catalog': {
      get: {
        tags: ['Catalog'],
        summary: 'Listar plantas',
        description: 'Devuelve todas las plantas del catálogo con el status de propiedad del usuario autenticado.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de plantas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/PlantSummary' } },
                  },
                },
              },
            },
          },
          401: { description: 'No autenticado' },
        },
      },
    },

    '/catalog/recommendations': {
      get: {
        tags: ['Catalog'],
        summary: 'Recomendaciones por clima',
        description: 'Devuelve plantas adecuadas para la temperatura actual de la ubicación del usuario. Requiere OPENWEATHER_API_KEY configurada.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number' }, description: 'Latitud', example: 20.6597 },
          { name: 'lon', in: 'query', required: true, schema: { type: 'number' }, description: 'Longitud', example: -103.3496 },
        ],
        responses: {
          200: { description: 'Recomendaciones', content: { 'application/json': { schema: { $ref: '#/components/schemas/RecommendationsResponse' } } } },
          400: { description: 'lat/lon faltantes o inválidos' },
          401: { description: 'No autenticado' },
          502: { description: 'Error al consultar OpenWeather API' },
          503: { description: 'OPENWEATHER_API_KEY no configurada' },
        },
      },
    },

    '/catalog/{id}': {
      get: {
        tags: ['Catalog'],
        summary: 'Detalle de planta',
        description: 'Devuelve información completa de una planta incluyendo guía de cuidados.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID de la planta' },
        ],
        responses: {
          200: { description: 'Detalle de planta', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/PlantDetail' } } } } } },
          401: { description: 'No autenticado' },
          404: { description: 'Planta no encontrada' },
        },
      },
    },

    '/catalog/{id}/seed': {
      get: {
        tags: ['Catalog'],
        summary: 'Semilla L-System',
        description: 'Devuelve el JSON seed del L-System para generar la geometría 3D de la planta. **Solo disponible para plantas compradas (owned=true)**.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID de la planta' },
        ],
        responses: {
          200: { description: 'L-System seed', content: { 'application/json': { schema: { $ref: '#/components/schemas/PlantSeed' } } } },
          401: { description: 'No autenticado' },
          403: { description: 'Planta no comprada' },
          404: { description: 'Planta no encontrada' },
        },
      },
    },

    // =========================
    // CART
    // =========================
    '/cart/reserve': {
      post: {
        tags: ['Cart'],
        summary: 'Reservar inventario',
        description: 'Reserva unidades de una planta en el carrito. La reserva expira automáticamente (por defecto 10 min). Operación ACID.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReserveBody' } } },
        },
        responses: {
          201: { description: 'Reserva creada', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/CartReservation' } } } } } },
          401: { description: 'No autenticado' },
          404: { description: 'Planta o inventario no encontrado' },
          409: { description: 'Stock insuficiente o planta ya comprada' },
          422: { description: 'Validación fallida' },
        },
      },
    },

    '/cart/reserve/{id}': {
      delete: {
        tags: ['Cart'],
        summary: 'Liberar reserva',
        description: 'Cancela una reserva de carrito y devuelve las unidades al stock disponible.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID de la reserva' },
        ],
        responses: {
          200: { description: 'Reserva liberada', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { released: { type: 'boolean' }, reservationId: { type: 'string', format: 'uuid' } } } } } } } },
          401: { description: 'No autenticado' },
          403: { description: 'La reserva pertenece a otro usuario' },
          404: { description: 'Reserva no encontrada' },
        },
      },
    },

    // =========================
    // PAYMENTS
    // =========================
    '/payments/intent': {
      post: {
        tags: ['Payments'],
        summary: 'Crear PaymentIntent',
        description: 'Crea un Stripe PaymentIntent y un registro de orden pendiente. **Requiere una reserva de carrito activa** (`POST /cart/reserve`) para la planta — rechaza con 409 si no existe. El `clientSecret` retornado se usa en el cliente iOS para completar el pago sin que datos de tarjeta toquen este servidor (PCI-DSS).',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentIntentBody' } } },
        },
        responses: {
          201: { description: 'PaymentIntent creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentIntentResponse' } } } },
          401: { description: 'No autenticado' },
          404: { description: 'Planta o inventario no encontrado' },
          409: { description: 'Sin reserva activa, planta con precio desactivado o stock insuficiente' },
          422: { description: 'Validación fallida' },
          503: { description: 'Stripe no configurado' },
        },
      },
    },

    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Stripe Webhook',
        description: 'Endpoint para eventos de Stripe. **No requiere autenticación JWT** — se verifica la firma del webhook de Stripe. En `payment_intent.succeeded`: confirma la orden, mueve inventario y desbloquea la planta para el usuario.',
        parameters: [
          { name: 'stripe-signature', in: 'header', required: true, schema: { type: 'string' }, description: 'Firma HMAC generada por Stripe' },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', description: 'Raw Stripe event payload' } } },
        },
        responses: {
          200: { description: 'Evento recibido', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { received: { type: 'boolean' } } } } } } } },
          400: { description: 'Firma inválida o header faltante' },
        },
      },
    },

    // =========================
    // ORDERS
    // =========================
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: 'Historial de órdenes',
        description: 'Devuelve todas las órdenes del usuario autenticado, de más reciente a más antigua.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de órdenes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                  },
                },
              },
            },
          },
          401: { description: 'No autenticado' },
        },
      },
    },

    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Detalle de orden',
        description: 'Devuelve información completa de una orden específica.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID de la orden' },
        ],
        responses: {
          200: { description: 'Detalle de orden', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Order' } } } } } },
          401: { description: 'No autenticado' },
          403: { description: 'La orden pertenece a otro usuario' },
          404: { description: 'Orden no encontrada' },
        },
      },
    },

    '/orders/{id}/activate': {
      post: {
        tags: ['Orders'],
        summary: 'Activar orden (QR scan)',
        description: 'Activa una orden al escanear el código QR de la planta física. Establece `activatedAt` en la orden y en el registro `UserPlant`. Solo funciona en órdenes con status `confirmed` o `delivered`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID de la orden' },
        ],
        responses: {
          200: {
            description: 'Orden activada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        activated: { type: 'boolean' },
                        orderId: { type: 'string', format: 'uuid' },
                        activatedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Estado de orden no permite activación' },
          401: { description: 'No autenticado' },
          403: { description: 'La orden pertenece a otro usuario' },
          404: { description: 'Orden no encontrada' },
          409: { description: 'Orden ya activada' },
        },
      },
    },

    // =========================
    // CHAT
    // =========================
    '/chat': {
      post: {
        tags: ['Chat'],
        summary: 'Enviar mensaje a SolBot',
        description:
          'Envía un mensaje al asistente de Solo Plantas (SolBot). ' +
          'SolBot solo responde preguntas relacionadas con la app: catálogo de plantas, ' +
          'cuidados, viveros, órdenes y pagos. ' +
          'El historial de conversación se guarda en el servidor — incluye `conversationId` ' +
          'para continuar una sesión existente. ' +
          'Responde en el idioma del mensaje.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatBody' } } },
        },
        responses: {
          200: {
            description: 'Respuesta del asistente',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatResponse' } } },
          },
          401: { description: 'No autenticado' },
          404: { description: 'conversationId no encontrado o no pertenece al usuario' },
          422: { description: 'Validación fallida (message vacío o mayor a 2000 caracteres)' },
        },
      },
    },

    // =========================
    // NURSERIES
    // =========================
    '/nurseries': {
      get: {
        tags: ['Nurseries'],
        summary: 'Listar viveros',
        description: 'Devuelve todos los puntos de recolección (nurseries) para el mapa MapKit. **Endpoint público, no requiere autenticación.**',
        responses: {
          200: {
            description: 'Lista de viveros',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Nursery' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  // Tags with descriptions (shown in Swagger UI sidebar)
  tags: [
    { name: 'Auth', description: 'Registro, login y gestión de sesión JWT' },
    { name: 'Catalog', description: 'Catálogo de plantas, detalle y semillas L-System' },
    { name: 'Cart', description: 'Reservas de inventario (ACID, expiran automáticamente)' },
    { name: 'Payments', description: 'Stripe PaymentIntent y webhook' },
    { name: 'Orders', description: 'Historial de órdenes y activación por QR' },
    { name: 'Nurseries', description: 'Puntos de recolección para MapKit' },
    { name: 'Chat', description: 'SolBot — asistente conversacional con historial multi-turn' },
  ],
};

// Swagger UI display options
export const swaggerUiOptions: SwaggerUiOptions = {
  customSiteTitle: 'Solo Plantas API Docs',
  swaggerOptions: {
    persistAuthorization: true, // Keep the Bearer token between page refreshes
    displayRequestDuration: true,
    filter: true,
  },
};
