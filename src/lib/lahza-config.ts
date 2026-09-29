export interface LahzaConfig {
  secret: string;
  baseUrl: string;
  callbackUrl: string;
}

export type LahzaEnvironment = Record<string, string | undefined>;

export function getLahzaConfig(env: LahzaEnvironment = process.env): LahzaConfig {
  const missing: string[] = [];
  const secret = env.LAHZA_SECRET_KEY?.trim();
  const appUrl = env.NEXT_PUBLIC_SITE_URL?.trim() || env.NEXT_PUBLIC_APP_URL?.trim();
  const callbackUrl = env.LAHZA_CALLBACK_URL?.trim() || (appUrl ? `${appUrl.replace(/\/$/, '')}/payment/lahza/callback` : '');

  if (!secret) missing.push('LAHZA_SECRET_KEY');
  if (!callbackUrl) missing.push('LAHZA_CALLBACK_URL (or NEXT_PUBLIC_APP_URL)');
  if (missing.length) throw new Error(`Lahza is not configured: missing ${missing.join(', ')}.`);

  let parsedCallback: URL;
  try {
    parsedCallback = new URL(callbackUrl);
  } catch {
    throw new Error('Lahza is not configured: LAHZA_CALLBACK_URL must be an absolute URL.');
  }
  if (env.NODE_ENV === 'production' && parsedCallback.protocol !== 'https:') {
    throw new Error('Lahza is not configured: LAHZA_CALLBACK_URL must use HTTPS in production.');
  }

  return {
    secret: secret!,
    baseUrl: (env.LAHZA_BASE_URL?.trim() || 'https://api.lahza.io').replace(/\/$/, ''),
    callbackUrl: parsedCallback.toString(),
  };
}

export function isLahzaConfigured(env: LahzaEnvironment = process.env): boolean {
  try {
    getLahzaConfig(env);
    return true;
  } catch {
    return false;
  }
}
