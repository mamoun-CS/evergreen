/** Bound each process's pool instead of inheriting the CPU-derived default.
 * Explicit URL pool settings win. Never edits an environment file or logs a URL. */
export function pooledDatabaseUrl(env: { DATABASE_URL?: string; PRISMA_CONNECTION_LIMIT?: string }) {
  if (!env.DATABASE_URL) return undefined;
  const url = new URL(env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) return env.DATABASE_URL;
  if (!url.searchParams.has('connection_limit')) {
    const raw = env.PRISMA_CONNECTION_LIMIT || '3';
    const limit = Number(raw);
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('PRISMA_CONNECTION_LIMIT must be an integer from 1 to 20.');
    url.searchParams.set('connection_limit', String(limit));
  }
  return url.toString();
}
