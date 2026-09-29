import { NextRequest, NextResponse } from 'next/server';
import { canAccess, pageResource } from './lib/rbac';
export async function middleware(req: NextRequest) {
 const value=req.cookies.get('evergreen_session')?.value;
 if(!value || !process.env.ADMIN_SESSION_SECRET)return NextResponse.redirect(new URL('/login',req.url));
 try {
  const [payload,signature]=value.split('.');const decode=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('HMAC',key,decode(signature),new TextEncoder().encode(payload)))throw new Error('Invalid session');
  const session=JSON.parse(new TextDecoder().decode(decode(payload)));
  if(session.expiresAt<=Date.now())throw new Error('Expired session');
  if(!canAccess(session,'read',pageResource(req.nextUrl.pathname)) || (session.role==='MANAGER'&&req.nextUrl.pathname.startsWith('/admin/orders/pending')))return new NextResponse('Forbidden',{status:403});
  return NextResponse.next();
 }catch{return NextResponse.redirect(new URL('/login',req.url));}
}
export const config={matcher:['/admin/:path*']};
