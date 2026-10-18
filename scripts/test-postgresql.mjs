import { execSync } from 'node:child_process';
import { URL } from 'node:url';

// ---------------------------------------------------------------------------
// Ever Green — Safe PostgreSQL Test Runner
// ---------------------------------------------------------------------------
// Validates the test environment BEFORE executing any database-connected tests.
// Exits with non-zero status if any safety check fails.
// ---------------------------------------------------------------------------

function fail(message) {
  console.error(`[TEST RUNNER SAFETY] ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Phase 1: Validate DATABASE_URL_TEST before any Prisma or application import
// ---------------------------------------------------------------------------

// 1. Require NODE_ENV=test
if (process.env.NODE_ENV !== 'test') {
  fail('NODE_ENV must be set to "test" before running PostgreSQL integration tests.');
}

// 2. Require DATABASE_URL_TEST
const databaseUrlTest = process.env.DATABASE_URL_TEST;
if (!databaseUrlTest) {
  fail('DATABASE_URL_TEST is required. Copy .env.test.example to .env.test and configure it.');
}

// 3. Parse and validate the URL
let parsed;
try {
  parsed = new URL(databaseUrlTest);
} catch (err) {
  fail(`DATABASE_URL_TEST is not a valid URL: ${err.message}`);
}

// 4. Require PostgreSQL protocol
if (!parsed.protocol.startsWith('postgres')) {
  fail(`Unsupported protocol "${parsed.protocol}". Only PostgreSQL is allowed.`);
}

// 5. Require local host only
const host = parsed.hostname.toLowerCase();
const isLocal = host === '127.0.0.1' || host === 'localhost' || host === '::1';
if (!isLocal) {
  fail(`Remote database host "${host}" is rejected. Only 127.0.0.1/localhost allowed.`);
}

// 6. Require dedicated test port (not 5432)
if (!parsed.port || parsed.port === '5432') {
  fail(`Port ${parsed.port || '5432 (default)'} is rejected. Use a dedicated test port such as 5433.`);
}

// 7. Require test database name prefix
const dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
if (!dbName.startsWith('evergreen_test')) {
  fail(`Database name "${dbName}" is not an approved test database. Must start with "evergreen_test".`);
}

// 8. Reject production database names
const dbNameLower = dbName.toLowerCase();
if (dbNameLower === 'evergreen' || dbNameLower === 'production' || dbNameLower === 'prod' || dbNameLower === 'main') {
  fail(`Database name "${dbName}" is a production database name. Aborting.`);
}

// 9. Reject production username
const username = decodeURIComponent(parsed.username || '');
if (['postgres', 'admin', 'root', 'evergreen'].includes(username.toLowerCase())) {
  fail(`Username "${username}" is unsafe for a test database.`);
}

// 10. Require password
const password = decodeURIComponent(parsed.password || '');
if (!password || password.length < 8) {
  fail('Test database password must be at least 8 characters.');
}

// 11. Ensure DATABASE_URL (used by Prisma singleton) is NOT production
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && databaseUrl.includes('evergreen') && !databaseUrl.includes('_test')) {
  fail('DATABASE_URL appears to target production. Unset it before running tests.');
}

// ---------------------------------------------------------------------------
// All safety checks passed
// ---------------------------------------------------------------------------
console.log('[TEST RUNNER SAFETY] All isolation checks passed.');
console.log(`[TEST RUNNER SAFETY] Target: ${parsed.hostname}:${parsed.port}/${dbName}`);

// ---------------------------------------------------------------------------
// Phase 2: Safe Prisma migration runner (prepared, NOT executed)
// ---------------------------------------------------------------------------
// To apply migrations to the isolated test database, run manually before tests:
//
//   export DATABASE_URL_TEST="postgresql://evergreen_test:<password>@127.0.0.1:5433/evergreen_test"
//   node scripts/test-postgresql.mjs --migrate
//
// This will:
//   1. Re-validate DATABASE_URL_TEST (above)
//   2. Set DATABASE_URL to the validated test URL in the Prisma CLI child process
//   3. Run `npx prisma migrate deploy` against the test database only
//   4. Never touch the production DATABASE_URL
// ---------------------------------------------------------------------------

function runPrismaMigrateDeploy() {
  const migrateEnv = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrlTest, // Explicit override: Prisma CLI uses test URL only
  };

  console.log('[TEST RUNNER SAFETY] Running prisma migrate deploy against isolated test database...');
  try {
    execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
      stdio: 'inherit',
      env: migrateEnv,
    });
    console.log('[TEST RUNNER SAFETY] Migration completed successfully.');
  } catch (err) {
    console.error(`[TEST RUNNER SAFETY] Migration failed: ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Phase 3: Run integration tests
// ---------------------------------------------------------------------------

if (process.argv.includes('--migrate')) {
  runPrismaMigrateDeploy();
  process.exit(0);
}

try {
  execSync('npx tsx --test tests/order-claim-postgresql.test.mjs', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrlTest, // Redirect Prisma singleton to test DB
    },
  });
} catch (err) {
  console.error(`[TEST RUNNER SAFETY] Test execution failed: ${err.message}`);
  process.exit(1);
}
