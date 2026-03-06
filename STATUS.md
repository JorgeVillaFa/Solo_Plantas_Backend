# Solo Plantas Backend — Estado del Desarrollo

Última actualización: 2026-03-06

---

## Resumen general

Backend Express + TypeScript + PostgreSQL (Prisma) para la app iOS de e-commerce de plantas.
Todos los módulos principales están implementados y funcionales. Los gaps restantes son:
tests, administración de datos, flujos de soporte (contraseña, notificaciones) y hardening menor.

---

## Modulos implementados

### Infraestructura base
| Componente | Estado | Detalle |
|---|---|---|
| Express server | Completo | `src/index.ts` — orden de middleware documentado |
| Env validation | Completo | `src/config/env.ts` — fail-fast al arranque |
| Prisma singleton | Completo | `src/config/database.ts` — hot-reload en dev |
| JWT middleware | Completo | `src/middlewares/auth.middleware.ts` — Bearer token, errores diferenciados por tipo |
| Error handler global | Completo | `src/middlewares/error.middleware.ts` — AppError con statusCode |
| Validacion de input | Completo | `src/middlewares/validate.middleware.ts` — adaptador express-validator |
| Helmet / CORS | Completo | Configurado en `index.ts` |
| Rate limiting | Completo | 20 req / 15 min / IP en login y register |
| Morgan logging | Completo | `dev` en desarrollo, `combined` en produccion |
| Graceful shutdown | Completo | SIGTERM/SIGINT — cierra HTTP + desconecta DB, timeout de 10s |
| Health check | Completo | `GET /health` — usado por Docker HEALTHCHECK |
| Swagger UI | Completo | `GET /api/v1/docs` — solo en dev/test, deshabilitado en production |
| Swagger spec | Completo | `src/config/swagger.ts` — spec OpenAPI 3.0 completa para todos los endpoints |
| Docker | Completo | Multi-stage build (builder + production), docker-compose con PostgreSQL |
| Prisma schema | Completo | `prisma/schema.prisma` — 7 modelos, PKs UUID, valores monetarios en cents |
| Seed de desarrollo | Completo | `prisma/seed.ts` — 2 genetics, 3 plantas, 2 viveros |
| Tarea de fondo | Completo | `src/utils/tasks.utils.ts` — limpieza de reservas expiradas cada 10 min |

---

### Auth — `POST|GET /api/v1/auth/*`

| Endpoint | Estado | Detalle |
|---|---|---|
| `POST /register` | Completo | bcrypt 12 rounds, normaliza email a lowercase, devuelve JWT |
| `POST /login` | Completo | Comparacion en tiempo constante (anti-timing attack), devuelve JWT |
| `POST /logout` | Completo | Stateless — solo confirma, el cliente descarta el token |
| `GET /me` | Completo | Perfil con conteo de plantas owned y ordenes totales |

**Seguridad implementada:**
- Hash bcrypt con cost 12
- La contrasena en texto plano se descarta inmediatamente post-hash
- Timing attack prevention: siempre corre `bcrypt.compare` aunque el usuario no exista
- Rate limiter 20/15min en register y login
- JWT stateless, sin sesiones en servidor (RNF003)

---

### Catalog — `GET /api/v1/catalog/*`

| Endpoint | Estado | Detalle |
|---|---|---|
| `GET /` | Completo | Lista todas las plantas con `owned` status del usuario autenticado |
| `GET /recommendations` | Completo | Llama OpenWeather API, filtra por `tempMin/tempMax`, requiere `?lat=&lon=` |
| `GET /:id` | Completo | Detalle completo + guia de cuidados (water, light, temperature, notes) |
| `GET /:id/seed` | Completo | JSON seed L-System; 403 si el usuario no es owner de la planta |

**Notas:**
- Si `OPENWEATHER_API_KEY` no esta configurada, `/recommendations` devuelve 503
- Si la API de clima falla, devuelve 502 (error upstream diferenciado)
- Todos los endpoints requieren JWT

---

### Cart — `POST|DELETE /api/v1/cart/*`

| Endpoint | Estado | Detalle |
|---|---|---|
| `POST /reserve` | Completo | Reserva ACID via `prisma.$transaction` — decrementa `stock`, incrementa `reserved` |
| `DELETE /reserve/:id` | Completo | Libera reserva — revierte stock en transaccion, solo el owner puede liberar |

**Logica de inventario:**
- Invariante: `stock + reserved + sold = total_units`
- La reserva expira despues de `CART_RESERVATION_MINUTES` (default 10 min)
- La tarea de fondo libera reservas expiradas cada 10 min (corre tambien al arranque)
- Validaciones: planta existente con inventario, stock suficiente, usuario no ya-owner

---

### Payments — `POST /api/v1/payments/*`

| Endpoint | Estado | Detalle |
|---|---|---|
| `POST /intent` | Completo | Crea Stripe PaymentIntent + registro Order `pending`; devuelve `clientSecret` |
| `POST /webhook` | Parcial | Solo maneja `payment_intent.succeeded` — confirma orden, mueve inventory, desbloquea planta |

**Flujo completo de pago:**
1. Cliente llama `POST /intent` → recibe `clientSecret` + `orderId`
2. Cliente completa el pago on-device via Stripe SDK (tarjeta nunca toca el servidor)
3. Stripe llama `POST /webhook` → el servidor confirma la orden y desbloquea la planta

**PCI compliance:** datos de tarjeta nunca llegan al servidor (RNF011)

**Pendiente en este modulo:** ver seccion de Pendientes.

---

### Orders — `GET|POST /api/v1/orders/*`

| Endpoint | Estado | Detalle |
|---|---|---|
| `GET /` | Completo | Historial del usuario autenticado, ordenado por mas reciente |
| `GET /:id` | Completo | Detalle completo con planta y vivero; 403 si la orden no pertenece al usuario |
| `POST /:id/activate` | Completo | Activacion por QR scan — sets `activatedAt` en Order y UserPlant; solo desde `confirmed` o `delivered` |

**Flujo de estados de orden:**
```
pending → confirmed → shipped → delivered → activated
```

---

### Nurseries — `GET /api/v1/nurseries`

| Endpoint | Estado | Detalle |
|---|---|---|
| `GET /` | Completo | Lista todos los viveros para el mapa MapKit; endpoint publico, sin auth |

---

## Base de datos — Modelos Prisma

| Modelo | Estado | Descripcion |
|---|---|---|
| `User` | Completo | id, email (unique), passwordHash, timestamps |
| `Plant` | Completo | Catalogo, tempMin/Max, guia cuidados, FK a PlantGenetics |
| `PlantGenetics` | Completo | Definicion L-System: axiom, rules, angle, depth, seedJson |
| `Inventory` | Completo | stock / reserved / sold por planta (1:1 con Plant) |
| `CartReservation` | Completo | Reservas temporales con expiresAt indexado |
| `UserPlant` | Completo | Registro de propiedad: owned, purchasedAt, activatedAt |
| `Order` | Completo | Historial de compras con shippingType, status flow, Stripe ID |
| `Nursery` | Completo | Puntos de recoleccion con lat/lon para MapKit |

---

## Pendientes

### P1 — Critico / Bloquea funcionalidad

#### 1. Tests — Sin cobertura
- Infraestructura lista (jest + supertest + ts-jest en devDependencies, script `npm test`)
- **Cero archivos de test escritos**
- Sin tests de integracion para ningun endpoint
- Sin tests unitarios para servicios
- El pipeline de Docker build no valida tests

#### 2. Webhook: fallos de pago sin manejar
- `payment_intent.payment_failed` no esta implementado (comentado como TODO en `payments.service.ts:133`)
- Si un pago falla, la Order queda en estado `pending` indefinidamente en la DB
- No hay logica de cancelacion de orden ni liberacion de inventario reservado en caso de fallo de pago

#### 3. Transiciones de estado de orden no expuestas
- El flujo `confirmed → shipped → delivered` no tiene endpoints API
- Solo `activated` tiene endpoint (via QR scan)
- Para marcar una orden como `shipped` o `delivered` hay que hacerlo manualmente en la DB o via Prisma Studio
- **Requiere un panel/endpoints de operador**

---

### P2 — Importante / Afecta experiencia

#### 4. Sin endpoints de administracion
No existe ninguna capa de admin/operador. Las siguientes operaciones solo son posibles via Prisma Studio o SQL directo:
- Agregar/editar/eliminar plantas del catalogo
- Actualizar stock de inventario
- Agregar viveros
- Actualizar tracking number de ordenes (`Order.trackingNumber` existe en el schema pero no hay endpoint)
- Cambiar estado de orden a `shipped` / `delivered`

#### 5. Sin endpoint GET /cart
- No hay endpoint para listar las reservas activas del usuario
- El cliente iOS no puede consultar el estado del carrito via API; debe trackear localmente lo que reservo
- Solo puede crear (`POST /reserve`) y liberar (`DELETE /reserve/:id`)

#### 6. Sin paginacion
- `GET /catalog` devuelve TODAS las plantas sin limite
- `GET /orders` devuelve TODA la historia del usuario sin limite
- A escala pueden ser respuestas grandes

#### 7. Sin filtros/busqueda en catalogo
- No hay `?search=`, `?season=`, `?minPrice=`, `?maxPrice=` en `GET /catalog`
- Toda la filtracion debe hacerse en el cliente

#### 8. Sin gestion de perfil de usuario
- No hay `PATCH /auth/me` para cambiar email o contrasena
- No hay `DELETE /auth/me` para eliminar cuenta

---

### P3 — Mejoras / Deuda tecnica

#### 9. Sin flujo de reset de contrasena
- No hay `POST /auth/forgot-password`
- No hay `POST /auth/reset-password`
- Requiere integracion con servicio de email

#### 10. Sin notificaciones por email
- No hay proveedor de email configurado (SendGrid, Resend, SES, etc.)
- Flujos que deberian enviar email: confirmacion de orden, envio, entrega

#### 11. Sin mecanismo de refresh token
- Token unico JWT con vida de 7 dias (`JWT_EXPIRES_IN=7d`)
- Al expirar, el usuario debe re-loguearse; no hay refresh token
- Para la app iOS puede ser aceptable, pero vale documentarlo

#### 12. `CartReservation.userId` sin FK relacion en Prisma
- En `schema.prisma`, `CartReservation.userId` es `String @db.Uuid` sin `@relation`
- No hay relacion Prisma hacia `User`; sin cascade delete si se elimina un usuario
- El campo `userId` en `CartReservation` no aparece en `User.cartReservations` (no existe esa relacion)

#### 13. Patron roto en nurseries
- `nurseries.controller.ts` llama `prisma` directamente (sin capa service)
- Todos los demas modulos siguen el patron controller → service
- Menor pero inconsistente con la arquitectura del proyecto

#### 14. Sin migraciones de DB en el repo
- Solo existe `prisma/schema.prisma`; no hay carpeta `prisma/migrations/`
- Las migraciones se crean con `prisma migrate dev` pero no estan commiteadas
- En produccion se usa `prisma migrate deploy` pero sin historial en el repo el estado es ambiguo

#### 15. `swaggerSpec` sin tipado fuerte
- El objeto en `src/config/swagger.ts` esta tipado como `object` implicito
- Podria usar `OpenAPIV3.Document` de `openapi-types` para validacion en compile-time

---

## Variables de entorno

| Variable | Requerida | Default | Uso |
|---|---|---|---|
| `DATABASE_URL` | Si | — | Conexion PostgreSQL |
| `JWT_SECRET` | Si | — | Firma de tokens JWT |
| `JWT_EXPIRES_IN` | No | `7d` | Tiempo de vida del JWT |
| `PORT` | No | `3000` | Puerto del servidor |
| `NODE_ENV` | No | `development` | Modo de ejecucion |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | CORS, separado por comas |
| `STRIPE_SECRET_KEY` | No* | `""` | Clave Stripe (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | No* | `""` | Secreto de webhook Stripe (`whsec_...`) |
| `OPENWEATHER_API_KEY` | No* | `""` | API key OpenWeather |
| `CART_RESERVATION_MINUTES` | No | `10` | Tiempo de vida de reservas de carrito |

*Opcionales en runtime pero necesarias para que la funcionalidad correspondiente opere. Sin ellas los endpoints devuelven 503.

---

## Comandos utiles

```bash
# Desarrollo
npm run dev                  # ts-node-dev con hot-reload

# Build y produccion
npm run build                # tsc → dist/
npm start                    # node dist/index.js

# Base de datos
npm run prisma:migrate       # Crear y aplicar migracion (dev)
npm run prisma:migrate:prod  # Aplicar migraciones en produccion
npm run prisma:seed          # Poblar DB con datos de desarrollo
npm run prisma:studio        # Abrir Prisma Studio en el browser

# Docker
docker-compose up --build    # Levanta PostgreSQL + API

# Tests (infraestructura lista, sin tests escritos aun)
npm test
```
