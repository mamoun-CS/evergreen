import 'server-only';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

export type OutboxEventType = 'ORDER_CREATED' | 'ORDER_CONFIRMED' | 'ORDER_CANCELLED' | 'PAYMENT_SETTLED';
export type RecipientRole = 'CUSTOMER' | 'ADMIN';

export type EnqueueNotificationParams = {
  orderId?: string;
  eventType: OutboxEventType;
  recipientRole: RecipientRole;
  recipient: string;
  subject: string;
  htmlContent: string;
  payload?: Record<string, unknown>;
  dedupKey?: string;
};

export function buildDedupKey(orderId: string | undefined, eventType: string, recipientRole: string): string {
  return `${orderId || 'none'}:${eventType}:${recipientRole}`;
}

/**
 * Enqueue notification intent in the SAME transaction as the business event.
 * If the transaction rolls back, this row is rolled back.
 * If retried with the same dedupKey, unique constraints guarantee deduplication.
 */
export async function enqueueNotification(
  tx: Prisma.TransactionClient,
  params: EnqueueNotificationParams
) {
  const dedupKey = params.dedupKey || buildDedupKey(params.orderId, params.eventType, params.recipientRole);
  try {
    return await tx.notificationOutbox.create({
      data: {
        dedupKey,
        orderId: params.orderId,
        eventType: params.eventType,
        recipientRole: params.recipientRole,
        recipient: params.recipient.trim().toLowerCase(),
        subject: params.subject,
        htmlContent: params.htmlContent,
        payload: params.payload ? (params.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
        status: 'PENDING',
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Duplicate intent already recorded in database; safe idempotent no-op
      return null;
    }
    throw error;
  }
}

/**
 * Sanitize error messages so that no PII, tokens, or passwords appear in logs or DB error fields.
 */
export function sanitizeError(err: unknown): string {
  if (!err) return 'Unknown delivery failure';
  let message = err instanceof Error ? err.message : String(err);
  // Strip URLs containing tokens or secrets
  message = message.replace(/https?:\/\/[^\s]+/gi, '[URL_REDACTED]');
  // Strip email addresses
  message = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[EMAIL_REDACTED]');
  // Strip potential auth headers / tokens
  message = message.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
  return message.slice(0, 1000);
}

/**
 * Atomically claim a batch of pending or abandoned notifications using PostgreSQL FOR UPDATE SKIP LOCKED.
 */
export async function claimOutboxBatch(
  db: PrismaClient = prisma,
  limit = 10,
  workerId: string = crypto.randomUUID()
) {
  const boundedLimit = Math.max(1, Math.min(limit, 50));
  // Use raw SQL with FOR UPDATE SKIP LOCKED for high-concurrency safe claiming
  const rows = await db.$queryRaw<Array<{
    id: string;
    dedupKey: string;
    orderId: string | null;
    eventType: string;
    recipientRole: string;
    recipient: string;
    subject: string;
    htmlContent: string;
    payload: unknown;
    status: string;
    attempts: number;
    maxAttempts: number;
    lastError: string | null;
    lockedAt: Date | null;
    lockedBy: string | null;
    leaseExpiresAt: Date | null;
    nextAttemptAt: Date;
    sentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>>`
    UPDATE "NotificationOutbox"
    SET "status" = 'PROCESSING',
        "lockedAt" = NOW(),
        "lockedBy" = ${workerId},
        "leaseExpiresAt" = NOW() + INTERVAL '2 minutes',
        "attempts" = "attempts" + 1,
        "updatedAt" = NOW()
    WHERE "id" IN (
      SELECT "id" FROM "NotificationOutbox"
      WHERE ("status" = 'PENDING' OR ("status" = 'PROCESSING' AND "leaseExpiresAt" < NOW()))
        AND "nextAttemptAt" <= NOW()
      ORDER BY "createdAt" ASC
      LIMIT ${boundedLimit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
  `;
  return rows;
}

export type TransportResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  permanent?: boolean;
};

/**
 * Perform actual SMTP delivery. Bounded timeout, Message-ID deduplication.
 */
export async function deliverEmail(
  recipient: string,
  subject: string,
  html: string,
  dedupKey: string
): Promise<TransportResult> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { success: false, error: 'Invalid recipient email format', permanent: true };
  }
  const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
  if (!configured) {
    return { success: false, error: 'SMTP is not configured', permanent: false };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const client = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });

  const domain = (process.env.SMTP_FROM || 'evergreen.store').split('@').pop() || 'evergreen.store';
  const cleanDedup = dedupKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const messageId = `<${cleanDedup}@${domain}>`;

  try {
    const info = await client.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      subject,
      html,
      messageId,
      headers: {
        'X-Evergreen-Notification-Key': cleanDedup,
      },
    });
    return { success: true, messageId: info.messageId || messageId };
  } catch (error) {
    const sanitized = sanitizeError(error);
    const isPermanent = /550|551|552|553|554|invalid recipient|mailbox not found/i.test(sanitized);
    return { success: false, error: sanitized, permanent: isPermanent };
  }
}

/**
 * Process a single claimed notification. Handles exponential backoff, status updates, and email logging.
 */
export async function processClaimedNotification(
  db: PrismaClient,
  item: {
    id: string;
    dedupKey: string;
    orderId: string | null;
    recipient: string;
    subject: string;
    htmlContent: string;
    attempts: number;
    maxAttempts: number;
  }
): Promise<boolean> {
  const result = await deliverEmail(item.recipient, item.subject, item.htmlContent, item.dedupKey);

  if (result.success) {
    await db.notificationOutbox.update({
      where: { id: item.id },
      data: {
        status: 'DELIVERED',
        sentAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        leaseExpiresAt: null,
        lastError: null,
      },
    });
    await db.emailLog.create({
      data: {
        recipient: item.recipient,
        subject: item.subject,
        orderId: item.orderId,
        status: 'SENT',
        attempts: item.attempts,
      },
    }).catch(() => {});
    return true;
  }

  // Delivery failed
  const isTerminal = result.permanent || item.attempts >= item.maxAttempts;
  // Exponential backoff: 2s, 4s, 8s, 16s... up to 1 hour
  const backoffMs = Math.min(1000 * Math.pow(2, item.attempts), 3600000);
  const nextAttemptAt = new Date(Date.now() + backoffMs);

  await db.notificationOutbox.update({
    where: { id: item.id },
    data: {
      status: isTerminal ? 'FAILED' : 'PENDING',
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
      lastError: result.error || 'Delivery failed',
      nextAttemptAt: isTerminal ? undefined : nextAttemptAt,
    },
  });

  if (isTerminal) {
    await db.emailLog.create({
      data: {
        recipient: item.recipient,
        subject: item.subject,
        orderId: item.orderId,
        status: 'FAILED',
        attempts: item.attempts,
        error: result.error?.slice(0, 1000),
      },
    }).catch(() => {});
  }

  return false;
}

/**
 * Worker execution entrypoint. Bounded batch size, safe concurrency.
 */
export async function processNotificationOutbox(options?: {
  limit?: number;
  workerId?: string;
  db?: PrismaClient;
}) {
  const db = options?.db || prisma;
  const limit = options?.limit || 10;
  const workerId = options?.workerId || `worker-${crypto.randomUUID().slice(0, 8)}`;

  const batch = await claimOutboxBatch(db, limit, workerId);
  let delivered = 0;
  let failed = 0;

  for (const item of batch) {
    try {
      const ok = await processClaimedNotification(db, item);
      if (ok) delivered++;
      else failed++;
    } catch (err) {
      failed++;
      console.error('Unexpected worker failure processing notification:', sanitizeError(err));
      // Release lease on crash so it can be reclaimed
      await db.notificationOutbox.update({
        where: { id: item.id },
        data: {
          status: 'PENDING',
          lockedAt: null,
          lockedBy: null,
          leaseExpiresAt: null,
          lastError: sanitizeError(err),
        },
      }).catch(() => {});
    }
  }

  return { claimed: batch.length, delivered, failed };
}
