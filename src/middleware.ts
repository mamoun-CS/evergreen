import { NextRequest, NextResponse } from 'next/server';
import { canAccess, pageResource } from './lib/rbac';
export async function middleware(req: NextRequest) {
 const bytes = crypto.getRandomValues(new Uint8Array(16));
 const nonce = btoa(String.fromCharCode(...bytes));
 const csp = ["default-src 'self'", `script-src 'self' 'nonce-${nonce}'` + (process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''), "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "img-src 'self' data:", "font-src 'self' https://fonts.gstatic.com", "connect-src 'self'", "frame-src 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');
 const requestHeaders = new Headers(req.headers); requestHeaders.set('x-csp-nonce', nonce);
 const secure = (response: NextResponse) => { response.headers.set('Content-Security-Policy', csp); return response; };
 const proceed = () => secure(NextResponse.next({ request: { headers: requestHeaders } }));
 if (!req.nextUrl.pathname.startsWith('/admin')) return proceed();
 const value=req.cookies.get('evergreen_session')?.value;
 if(!value || !process.env.ADMIN_SESSION_SECRET)return secure(NextResponse.redirect(new URL('/login',req.url)));
 try {
  const [payload,signature]=value.split('.');const decode=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('HMAC',key,decode(signature),new TextEncoder().encode(payload)))throw new Error('Invalid session');
  const session=JSON.parse(new TextDecoder().decode(decode(payload)));
  if(session.expiresAt<=Date.now())throw new Error('Expired session');
  if(!canAccess(session,'read',pageResource(req.nextUrl.pathname)) || (session.role==='MANAGER'&&req.nextUrl.pathname.startsWith('/admin/orders/pending')))return secure(new NextResponse('Forbidden',{status:403}));
  return proceed();
 }catch{return secure(NextResponse.redirect(new URL('/login',req.url)));}
}
export const config = { matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|webp|gif|svg|ico|css|js|map|woff2?|pdf|txt)$).*)'] };
