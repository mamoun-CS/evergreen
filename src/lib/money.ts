import 'server-only';

import { Prisma } from '@prisma/client';

const MINOR_UNIT_FACTOR = new Prisma.Decimal(100);

/** Converts a database decimal to Lahza's integer minor-unit representation exactly. */
export function toMinorUnits(amount: Prisma.Decimal | string | number): string {
  const minor = new Prisma.Decimal(amount).mul(MINOR_UNIT_FACTOR);
  if (!minor.isInteger() || minor.isNegative()) {
    throw new Error('Amount must be a non-negative value with no more than two decimal places.');
  }
  return minor.toFixed(0);
}

export function fromMinorUnits(amount: string | number): Prisma.Decimal {
  const minor = new Prisma.Decimal(amount);
  if (!minor.isInteger() || minor.isNegative()) throw new Error('Invalid minor-unit amount.');
  return minor.div(MINOR_UNIT_FACTOR);
}

export function sumLineItems(items: Array<{ price: Prisma.Decimal; quantity: number }>): Prisma.Decimal {
  return items.reduce((total, item) => total.plus(item.price.mul(item.quantity)), new Prisma.Decimal(0));
}
