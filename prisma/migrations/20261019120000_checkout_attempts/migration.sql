CREATE TABLE "CheckoutAttempt" (
    "keyHash" TEXT NOT NULL,
    "ownerId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentInitState" TEXT NOT NULL,
    "authorizationUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("keyHash"),
    CONSTRAINT "CheckoutAttempt_orderId_key" UNIQUE ("orderId"),
    CONSTRAINT "CheckoutAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CheckoutAttempt_paymentInitState_check" CHECK ("paymentInitState" IN ('COD', 'INITIALIZING', 'READY', 'UNKNOWN'))
);
