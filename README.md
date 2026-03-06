# 🌿 Solo Plantas — Backend API

Express + TypeScript + PostgreSQL (via Prisma) backend for the **Solo Plantas** iOS plant e-commerce app.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript 5 |
| Framework | Express 4 |
| ORM | Prisma 5 (PostgreSQL) |
| Auth | JWT + bcrypt |
| Payments | Stripe (Test Mode) |
| Climate | OpenWeather API |
| Container | Docker + docker-compose |
| CI/CD | GitHub Actions (Sprint 1) |

---

## Quick Start (Local Dev with Docker)

### 1. Clone & install dependencies
```bash
git clone <repo-url>
cd solo-plantas-api
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and fill in your keys:
#   JWT_SECRET, STRIPE_SECRET_KEY, OPENWEATHER_API_KEY
```

### 3. Start PostgreSQL + API with Docker Compose
```bash
docker-compose up
# API available at: http://localhost:3000
# PostgreSQL at: localhost:5432
```

### 4. (Alternative) Run without Docker
```bash
# Make sure PostgreSQL is running locally
# Set DATABASE_URL in .env to point to your local instance
npx prisma migrate dev
npx prisma db seed
npm run dev
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | ❌ | Create account |
| POST | `/api/v1/auth/login` | ❌ | Login, receive JWT |
| POST | `/api/v1/auth/logout` | ✅ | Logout (client clears token) |
| GET | `/api/v1/auth/me` | ✅ | Current user profile |
| GET | `/api/v1/catalog` | ✅ | Plant catalog with owned status |
| GET | `/api/v1/catalog/:id` | ✅ | Plant detail + care guide |
| GET | `/api/v1/catalog/:id/seed` | ✅ | L-System JSON seed |
| GET | `/api/v1/catalog/recommendations?lat=&lon=` | ✅ | Climate recommendations |
| POST | `/api/v1/cart/reserve` | ✅ | Reserve inventory (ACID) |
| DELETE | `/api/v1/cart/reserve/:id` | ✅ | Release reservation |
| POST | `/api/v1/payments/intent` | ✅ | Create Stripe PaymentIntent |
| POST | `/api/v1/payments/confirm` | ✅ | Confirm payment, unlock plant |
| POST | `/api/v1/payments/webhook` | ❌ | Stripe webhook |
| GET | `/api/v1/orders` | ✅ | Order history |
| GET | `/api/v1/orders/:id` | ✅ | Order detail |
| POST | `/api/v1/orders/:uuid/activate` | ✅ | QR scan activation |
| GET | `/api/v1/nurseries` | ❌ | Pickup locations |
| GET | `/health` | ❌ | Health check |

---

## Database

Prisma manages the PostgreSQL schema. Key tables:

- **users** — Auth (RF001)
- **plants** — Catalog with climate data (RF003, RF006)
- **plant_genetics** — L-System seeds ≤10KB (RF002, RNF009)
- **inventory** — Stock management with ACID reservations (RF004)
- **cart_reservations** — 10-minute inventory holds (RF004)
- **user_plants** — Ownership registry, owned:boolean maps to UI lock state (RNF007)
- **orders** — Purchase records with QR activation (RF016, RF018)
- **nurseries** — Pickup locations for MapKit (RF011)

### Migrations
```bash
npx prisma migrate dev --name <description>  # Create migration
npx prisma migrate deploy                     # Apply in production
npx prisma studio                             # Visual DB browser
```

---

## Security Notes

- Passwords hashed with bcrypt (cost=12). Plain text nulled immediately after hashing (RNF018).
- JWT stored in iOS Keychain by client. Server is fully stateless (RNF003).
- **NEVER** commit `.env`. Credentials via secure DM → Azure App Services config vars.
- Stripe keys: only `sk_test_` keys allowed in this project (Inf004).
- Card data never touches this server — delegated to Stripe PCI-DSS L1 (RNF011).

---

## Testing
```bash
npm test               # Run all tests with coverage
npm test -- --watch    # Watch mode
```

Coverage threshold: 70% on critical routes (auth, checkout, cart) per QA plan (Section 7.2 SPMP).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Hot-reload dev server |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled JS |
| `npm test` | Jest tests + coverage |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run dev migrations |
| `npm run prisma:seed` | Seed dev data |
| `npm run prisma:studio` | Open Prisma Studio |




```
npm i

docker-compose down
docker-compose build --no-cache
docker-compose up

npm run prisma:seed

npx prisma studio
```