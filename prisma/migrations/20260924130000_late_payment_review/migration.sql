-- A verified charge after a released stock hold must remain paid and be surfaced for fulfillment review.
ALTER TABLE "Order" ADD COLUMN "fulfillmentNeedsReview" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Order_fulfillmentNeedsReview_idx" ON "Order"("fulfillmentNeedsReview");
