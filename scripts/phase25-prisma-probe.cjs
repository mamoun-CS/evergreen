// Opt-in instrumentation for isolated local benchmark processes only.
// Emits durations, never SQL text, parameters, credentials or customer data.
if (process.env.EVERGREEN_LOCAL_PERF_PROBE === '1') {
  const { URL } = require('node:url');
  const target = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) throw new Error('Local benchmark database required');
  const client = require('@prisma/client');
  const Original = client.PrismaClient;
  client.PrismaClient = class extends Original {
    constructor(options = {}) {
      super({ ...options, log: [...(options.log || []).filter(item => item !== 'query' && item?.level !== 'query'), { emit: 'event', level: 'query' }] });
      this.$on('query', event => process.stdout.write(`EVERGREEN_SQL ${JSON.stringify({ at: Date.now(), durationMs: event.duration, kind: /^\s*(\w+)/.exec(event.query)?.[1] })}\n`));
    }
  };
}
