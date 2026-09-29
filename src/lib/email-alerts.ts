import { sendEmail } from './email-service';
import { appUrl, escapeHtml as e, frame } from './email-templates/utils';
export function sendLoginAlert(ip: string, email: string, attempts: number) { return sendEmail(process.env.ADMIN_EMAIL || '', 'Suspicious login activity', frame(`<p>IP: ${e(ip)}</p><p>Email: ${e(email)}</p><p>Failures: ${attempts}</p><p>${new Date().toISOString()}</p><a href="${e(appUrl())}/admin/login-attempts">Review login attempts</a>`)); }
