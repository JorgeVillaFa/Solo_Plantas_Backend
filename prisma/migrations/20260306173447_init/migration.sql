-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plant_genetics" (
    "id" UUID NOT NULL,
    "axiom" VARCHAR(500) NOT NULL,
    "rules" JSONB NOT NULL,
    "angle" DOUBLE PRECISION NOT NULL,
    "depth" INTEGER NOT NULL,
    "seedJson" TEXT NOT NULL,

    CONSTRAINT "plant_genetics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plants" (
    "id" UUID NOT NULL,
    "commonName" VARCHAR(255) NOT NULL,
    "scientificName" VARCHAR(255) NOT NULL,
    "priceInCents" INTEGER NOT NULL,
    "description" TEXT,
    "imageUrl" VARCHAR(500),
    "ecosystemNotes" TEXT,
    "tempMin" DOUBLE PRECISION NOT NULL,
    "tempMax" DOUBLE PRECISION NOT NULL,
    "season" VARCHAR(50),
    "careWater" VARCHAR(500),
    "careLight" VARCHAR(500),
    "careTemperature" VARCHAR(500),
    "careNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lSeedId" UUID NOT NULL,

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plantId" UUID NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_reservations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inventoryId" UUID NOT NULL,

    CONSTRAINT "cart_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_plants" (
    "id" UUID NOT NULL,
    "owned" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "userId" UUID NOT NULL,
    "plantId" UUID NOT NULL,

    CONSTRAINT "user_plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "shippingType" VARCHAR(20) NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "shippingFeeCents" INTEGER NOT NULL DEFAULT 0,
    "stripePaymentIntentId" VARCHAR(255),
    "trackingNumber" VARCHAR(255),
    "shippingAddress" TEXT,
    "nurseryId" UUID,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "plantId" UUID NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurseries" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "schedule" VARCHAR(500),
    "phone" VARCHAR(50),

    CONSTRAINT "nurseries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_plantId_key" ON "inventory"("plantId");

-- CreateIndex
CREATE INDEX "cart_reservations_expiresAt_idx" ON "cart_reservations"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_plants_userId_plantId_key" ON "user_plants"("userId", "plantId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_lSeedId_fkey" FOREIGN KEY ("lSeedId") REFERENCES "plant_genetics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_reservations" ADD CONSTRAINT "cart_reservations_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plants" ADD CONSTRAINT "user_plants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plants" ADD CONSTRAINT "user_plants_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_nurseryId_fkey" FOREIGN KEY ("nurseryId") REFERENCES "nurseries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
