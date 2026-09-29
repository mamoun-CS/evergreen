import { prisma } from '../prisma';
import { sendRecoveryEmail1, sendRecoveryEmail2 } from '../email-service'; // Wait, I need to add these to email-service

export async function sendRecoveryEmails() {
  if (process.env.ABANDONED_CART_EMAILS_ENABLED !== 'true') return { sent: 0, skipped: true };
  let sent = 0;
  // Get carts abandoned > 4 hours ago that haven't had email sent
  const cartsFor1stEmail = await prisma.abandonedCart.findMany({
    where: {
      email: { not: '' },
      recoveryEmailSentAt: null,
      abandonedAt: {
        lt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      }
    },
    take: 100
  });
  
  for (const cart of cartsFor1stEmail) {
    const delivered = await sendRecoveryEmail1(cart);
    if (delivered) sent += 1;
    if (delivered) await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { recoveryEmailSentAt: new Date() }
    });
  }
  
  // Get carts > 24 hours after first email
  const cartsFor2ndEmail = await prisma.abandonedCart.findMany({
    where: {
      recoveryEmailSentAt: {
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      recoveryEmail2SentAt: null
    },
    take: 100
  });
  
  for (const cart of cartsFor2ndEmail) {
    const delivered = await sendRecoveryEmail2(cart);
    if (delivered) sent += 1;
    if (delivered) await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { recoveryEmail2SentAt: new Date() }
    });
  }
  return { sent, skipped: false };
}
