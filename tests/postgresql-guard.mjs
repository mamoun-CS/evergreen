import { URL } from 'node:url';

// ---------------------------------------------------------------------------
// Ever Green — Isolated PostgreSQL Test Guard (fail-closed)
// ---------------------------------------------------------------------------
// This module MUST be imported before any application module that uses Prisma.
// It validates DATABASE_URL_TEST, redirects process.env.DATABASE_URL to the
// isolated test database, and prevents accidental use of production credentials.

// Approved test database name prefixes (must match docker-compose.test.yml)
const APPROVED_TEST_DB_PREFIXES = ['evergreen_test'];

// Hosts that are explicitly rejected (remote / cloud / production-like)
const REJECTED_HOST_PATTERNS = [
  'prisma.io',
  'aws.amazon.com',
  'rds.',
  'azure.com',
  'googleapis.com',
  'supabase.com',
  'cockroachlabs.cloud',
  'elephantsql.com',
  'herokuapp.com',
];

// Production database name patterns that must never be targeted
const PRODUCTION_DB_PATTERNS = ['evergreen', 'production', 'prod', 'main'];

// Usernames that are unsafe for a test database
const UNSAFE_USERNAMES = ['postgres', 'admin', 'root', 'evergreen'];

let _guardActive = false;
let _validatedUrl = null;
let _prismaClient = null;

/**
 * Validate a database URL string against strict isolation rules.
 * Throws on any violation. Returns a normalized URL object on success.
 */
function validateDatabaseUrl(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    throw new Error(
      'TEST_GUARD: DATABASE_URL_TEST is required but not set. ' +
      'Copy .env.test.example to .env.test and configure the isolated test database.'
    );
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch (err) {
    throw new Error(`TEST_GUARD: DATABASE_URL_TEST is not a valid URL: ${err.message}`);
  }

  // Protocol must be PostgreSQL
  if (!parsed.protocol.startsWith('postgres')) {
    throw new Error(
      `TEST_GUARD: Unsupported protocol "${parsed.protocol}". Only PostgreSQL is allowed.`
    );
  }

  // Host must be local only
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  if (!isLocal) {
    throw new Error(
      `TEST_GUARD: Remote database host "${host}" is rejected. ` +
      'Only 127.0.0.1, localhost, or ::1 are allowed for test databases.'
    );
  }

  // Reject known remote/cloud host patterns
  for (const pattern of REJECTED_HOST_PATTERNS) {
    if (host.includes(pattern)) {
      throw new Error(
        `TEST_GUARD: Host "${host}" matches rejected pattern "${pattern}". Remote hosts are prohibited.`
      );
    }
  }

  // Port must be present and must NOT be the production port 5432
  const port = parsed.port;
  if (!port) {
    throw new Error(
      'TEST_GUARD: DATABASE_URL_TEST must specify an explicit port (default 5432 is production). ' +
      'Use a dedicated test port such as 5433.'
    );
  }
  if (port === '5432') {
    throw new Error(
      'TEST_GUARD: Port 5432 is the production PostgreSQL port. Use a dedicated test port such as 5433.'
    );
  }

  // Database name must start with an approved test prefix
  const dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
  if (!dbName) {
    throw new Error('TEST_GUARD: DATABASE_URL_TEST must specify a database name.');
  }
  const hasApprovedPrefix = APPROVED_TEST_DB_PREFIXES.some((prefix) =>
    dbName === prefix || dbName.startsWith(prefix)
  );
  if (!hasApprovedPrefix) {
    throw new Error(
      `TEST_GUARD: Database name "${dbName}" is not an approved test database. ` +
      `Name must start with one of: ${APPROVED_TEST_DB_PREFIXES.join(', ')}`
    );
  }

  // Reject production-like database names
  const dbNameLower = dbName.toLowerCase();
  for (const pattern of PRODUCTION_DB_PATTERNS) {
    if (dbNameLower === pattern || dbNameLower.startsWith(pattern + '_') && !hasApprovedPrefix) {
      // Allow evergreen_test* but block evergreen, production, prod, main
      if (pattern === 'evergreen' && !dbName.startsWith('evergreen_test')) {
        throw new Error(
          `TEST_GUARD: Database name "${dbName}" resembles a production database. ` +
          'Use a name starting with "evergreen_test".'
        );
      }
    }
  }

  // Username must not be an unsafe production credential
  const username = decodedComponent(parsed.username);
  if (UNSAFE_USERNAMES.includes(username.toLowerCase())) {
    throw new Error(
      `TEST_GUARD: Username "${username}" is unsafe for a test database. ` +
      'Use a dedicated test user such as "evergreen_test".'
    );
  }

  // Password must be present and reasonably strong (not empty, not production-like)
  const password = decodedComponent(parsed.password);
  if (!password || password.length < 8) {
    throw new Error(
      'TEST_GUARD: Test database password must be at least 8 characters.'
    );
  }

  // Never allow DATABASE_URL_TEST to point at a production-named database
  if (
    dbNameLower === 'evergreen' ||
    dbNameLower === 'production' ||
    dbNameLower === 'prod' ||
    dbNameLower === 'main'
  ) {
    throw new Error(
      `TEST_GUARD: Database name "${dbName}" is a production database name. Aborting.`
    );
  }

  return parsed;
}

/**
 * Decode a URL component safely (handles percent-encoding).
 */
function decodedComponent(value) {
  try {
    return value ? decodeURIComponent(value) : '';
  } catch {
    return value || '';
  }
}

/**
 * Activate the test guard. Must be called before importing Prisma or app modules.
 * Returns the validated test database URL.
 */
function activateTestGuard() {
  if (_guardActive) {
    return _validatedUrl;
  }

  const databaseUrlTest = process.env.DATABASE_URL_TEST;
  const parsed = validateDatabaseUrl(databaseUrlTest);

  // Store the validated URL
  _validatedUrl = parsed.toString();

  // Override DATABASE_URL so the Prisma singleton (src/lib/prisma.ts) and any
  // application module that reads process.env.DATABASE_URL uses the test DB.
  // We set it BEFORE any PrismaClient is constructed.
  process.env.DATABASE_URL = _validatedUrl;

  // Neutralize any production DATABASE_URL that might have been set previously
  // by dotenv or shell environment. We keep DATABASE_URL_TEST as the source of truth.
  _guardActive = true;

  return _validatedUrl;
}

/**
 * Get the validated test database URL. Throws if guard not activated.
 */
function getTestDatabaseUrl() {
  if (!_guardActive || !_validatedUrl) {
    throw new Error(
      'TEST_GUARD: Guard not activated. Call activateTestGuard() before accessing the database.'
    );
  }
  return _validatedUrl;
}

/**
 * Create a PrismaClient connected exclusively to the validated test database.
 * Uses datasources override to bypass any global Prisma singleton configuration.
 */
async function createTestPrismaClient() {
  const { PrismaClient } = await import('@prisma/client');

  if (!_guardActive || !_validatedUrl) {
    throw new Error(
      'TEST_GUARD: Guard not activated. Call activateTestGuard() before creating a PrismaClient.'
    );
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: _validatedUrl,
      },
    },
  });

  // Verify the effective connection target before returning
  await prisma.$connect();

  // Run a lightweight query to confirm we are connected to the test database
  const result = await prisma.$queryRawUnsafe(
    'SELECT current_database() AS db_name, current_user AS db_user, inet_server_addr() AS server_host'
  );
  const row = result[0];
  const dbName = row.db_name;
  const dbUser = row.db_user;
  const serverHost = row.server_host;

  // Confirm database name starts with approved prefix
  const hasApprovedPrefix = APPROVED_TEST_DB_PREFIXES.some((prefix) =>
    dbName === prefix || dbName.startsWith(prefix)
  );
  if (!hasApprovedPrefix) {
    await prisma.$disconnect();
    throw new Error(
      `TEST_GUARD: Connected to unverified database "${dbName}". ` +
      'Expected a test database starting with "evergreen_test".'
    );
  }

  // Confirm server is local (127.0.0.1 or ::1)
  if (serverHost && serverHost !== '127.0.0.1' && serverHost !== '::1' && serverHost !== 'localhost') {
    await prisma.$disconnect();
    throw new Error(
      `TEST_GUARD: Connected to remote server "${serverHost}". Only local PostgreSQL is allowed.`
    );
  }

  _prismaClient = prisma;
  return prisma;
}

/**
 * Get the active test PrismaClient. Throws if not connected.
 */
function getTestPrismaClient() {
  if (!_prismaClient) {
    throw new Error(
      'TEST_GUARD: No active PrismaClient. Call createTestPrismaClient() first.'
    );
  }
  return _prismaClient;
}

/**
 * Disconnect the test PrismaClient and deactivate the guard.
 */
async function deactivateTestGuard() {
  if (_prismaClient) {
    try {
      await _prismaClient.$disconnect();
    } catch {
      // Ignore disconnect errors during cleanup
    }
    _prismaClient = null;
  }
  _guardActive = false;
  _validatedUrl = null;
  // Restore DATABASE_URL to a safe empty state to prevent accidental reuse
  delete process.env.DATABASE_URL;
}

/**
 * Check if the guard is currently active.
 */
function isGuardActive() {
  return _guardActive;
}

/**
 * Validate that DATABASE_URL (process.env) points to the test database.
 * Used before running migrations or any destructive operation.
 */
function assertTestDatabaseTarget() {
  if (!_guardActive) {
    throw new Error(
      'TEST_GUARD: Guard not activated. Cannot assert test database target.'
    );
  }
  const currentUrl = process.env.DATABASE_URL;
  if (currentUrl !== _validatedUrl) {
    throw new Error(
      'TEST_GUARD: DATABASE_URL has been altered from the validated test URL. ' +
      'Aborting to prevent accidental production access.'
    );
  }
}

export {
  activateTestGuard,
  getTestDatabaseUrl,
  createTestPrismaClient,
  getTestPrismaClient,
  deactivateTestGuard,
  isGuardActive,
  assertTestDatabaseTarget,
  validateDatabaseUrl,
};
