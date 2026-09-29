import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import env from '@next/env';
import bcrypt from 'bcryptjs';
env.loadEnvConfig(process.cwd());
const db=new PrismaClient();const prefix=`test-${crypto.randomUUID().slice(0,8)}`;
const base='http://localhost:3107',mails=[],orders=[],users=[];let product,shipping,child,uploadedUrl;
const smtp=net.createServer(socket=>{socket.setEncoding('utf8');socket.write('220 localhost ESMTP\r\n');let buffer='',data=false,message='';socket.on('data',chunk=>{buffer+=chunk;let pos;while((pos=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,pos);buffer=buffer.slice(pos+2);if(data){if(line==='.') {mails.push(message);message='';data=false;socket.write('250 accepted\r\n');}else message+=line+'\r\n';}else if(/^EHLO|HELO/.test(line))socket.write('250 localhost\r\n');else if(/^DATA/.test(line)){data=true;socket.write('354 send data\r\n');}else if(/^QUIT/.test(line)){socket.end('221 bye\r\n');}else socket.write('250 OK\r\n');}});});
const gateway=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:true,data:{reference:req.url.split('/').pop(),status:'success',amount:2000,currency:'ILS',id:'test-charge'}}));});
function cookie(user){const payload=Buffer.from(JSON.stringify({userId:user.id,role:user.role,expiresAt:Date.now()+3600000})).toString('base64url');return `evergreen_session=${payload}.${crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update(payload).digest('base64url')}`;}
async function request(path,body,user,extra={}){const headers=new Headers({'Content-Type':'application/json','x-test-ip':prefix,...(user?{cookie:cookie(user)}:{})});for(const [name,value] of Object.entries(extra))headers.set(name,value);return fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
let log='';
try {
 await new Promise(r=>smtp.listen(2527,'127.0.0.1',r));await new Promise(r=>gateway.listen(3108,'127.0.0.1',r));
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p','3107'],{env:{...process.env,UPLOAD_DIR_DEV:'.uploads-integration-test',SMTP_HOST:'127.0.0.1',SMTP_PORT:'2527',SMTP_USER:'',SMTP_PASSWORD:'',SMTP_FROM:'store@example.test',ADMIN_EMAIL:'admin@example.test',LAHZA_SECRET_KEY:'integration-secret',LAHZA_BASE_URL:'http://127.0.0.1:3108',TRUSTED_IP_HEADER:'x-test-ip',NEXT_PUBLIC_APP_URL:base},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
 for(let i=0;i<90;i++){try{const r=await fetch(base+'/api/shipping/options');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
 for(const role of ['SUPER_ADMIN','ADMIN','MANAGER','CUSTOMER'])users.push(await db.user.create({data:{name:prefix,email:`${prefix}-${role}@example.test`,passwordHash:await bcrypt.hash('TestPassword123!',12),role}}));
 const [superAdmin,admin,manager,customer]=users;
 product=await db.product.create({data:{nameEn:prefix,nameAr:'اختبار',slug:prefix,basePrice:10,stockQuantity:10,images:[]}});
 shipping=await db.shippingOption.create({data:{code:prefix,nameEn:prefix,nameAr:'اختبار',price:0}});
 let r=await request('/api/shipping/options');for(const h of ['strict-transport-security','x-content-type-options','x-frame-options','x-xss-protection','referrer-policy','content-security-policy'])assert.ok(r.headers.get(h),h);
 const otherCustomer=await db.user.create({data:{name:prefix+' other',email:`${prefix}-other@example.test`,passwordHash:await bcrypt.hash('TestPassword123!',12),role:'CUSTOMER'}});users.push(otherCustomer);
 r=await request('/api/wishlist',{productId:product.id},customer);assert.equal(r.status,201,await r.text());
 r=await request('/api/wishlist',{productId:product.id},otherCustomer);assert.equal(r.status,201,await r.text());
 r=await fetch(`${base}/api/wishlist?productId=${encodeURIComponent(product.id)}`,{method:'DELETE',headers:{cookie:cookie(otherCustomer),'x-test-ip':prefix}});assert.equal(r.status,200);
 r=await request('/api/wishlist',undefined,customer);assert.equal((await r.json()).items.length,1);console.log('PASS wishlist ownership isolation across customer accounts');
 const sharp=(await import('sharp')).default;const uploadBuffer=await sharp({create:{width:2,height:2,channels:3,background:'#336699'}}).jpeg().toBuffer();const uploadForm=new FormData();uploadForm.append('files',new File([uploadBuffer],'untrusted-name.jpg',{type:'image/jpeg'}));uploadForm.append('category','integration');
 r=await fetch(base+'/api/admin/upload',{method:'POST',headers:{cookie:cookie(admin),'x-test-ip':prefix,origin:base},body:uploadForm});const uploadResult=await r.json();assert.equal(r.status,201,JSON.stringify(uploadResult));uploadedUrl=uploadResult.files[0].url;assert.match(uploadedUrl,/^\/uploads\/integration\/[0-9a-f-]+\.webp$/);const uploadResponse=await fetch(base+uploadedUrl);assert.equal(uploadResponse.status,200);assert.equal(uploadResponse.headers.get('content-type'),'image/webp');assert.equal(uploadResponse.headers.get('x-content-type-options'),'nosniff');const metadata=await sharp(Buffer.from(await uploadResponse.arrayBuffer())).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.exif,undefined);console.log('PASS admin image upload, UUID path, WebP re-encode and safe fallback serving');
 mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/security-headers.json',JSON.stringify(Object.fromEntries(r.headers),null,2));console.log('PASS security headers');
 const details={customerName:prefix,email:`${prefix}@example.test`,phone:'000',shippingAddress:'Test address',shippingOptionCode:prefix,language:'en',items:[{productId:product.id,quantity:2}]};
 async function checkout(){const response=await request('/api/orders',details);const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));const order=await db.order.findUniqueOrThrow({where:{orderNumber:data.order.orderNumber}});orders.push(order.id);return order;}
 const cod=await checkout();assert.equal(cod.requiresAdminConfirmation,true);assert.equal((await db.product.findUnique({where:{id:product.id}})).stockQuantity,10);assert.equal(mails.length,2);assert.ok(mails.some(m=>m.includes('Track order')));console.log('PASS COD checkout, stock unchanged, customer and admin SMTP delivery');
 r=await request(`/api/admin/orders/${cod.id}/confirm`,{},manager);assert.equal(r.status,403);
 r=await request(`/api/admin/orders/${cod.id}/confirm`,{},admin);assert.equal(r.status,200,await r.text());assert.equal((await db.product.findUnique({where:{id:product.id}})).stockQuantity,8);
 r=await request(`/api/admin/orders/${cod.id}/confirm`,{},admin);assert.equal(r.status,409);assert.equal((await db.product.findUnique({where:{id:product.id}})).stockQuantity,8);console.log('PASS role enforcement and idempotent COD confirmation');
 const rejected=await checkout();r=await request(`/api/admin/orders/${rejected.id}/reject`,{reason:'Test cancellation'},admin);assert.equal(r.status,200);assert.equal((await db.order.findUnique({where:{id:rejected.id}})).status,'CANCELLED');assert.equal((await db.product.findUnique({where:{id:product.id}})).stockQuantity,8);
 const noStock=await checkout();await db.product.update({where:{id:product.id},data:{stockQuantity:0}});r=await request(`/api/admin/orders/${noStock.id}/confirm`,{},admin);assert.equal(r.status,409);assert.equal((await db.order.findUnique({where:{id:noStock.id}})).status,'PENDING');console.log('PASS rejection and insufficient stock rollback');
 await db.product.update({where:{id:product.id},data:{stockQuantity:8}});
 const paid=await db.order.create({data:{orderNumber:prefix+'-PAID',customerName:prefix,email:details.email,phone:'000',shippingAddress:'Test',shippingMethod:prefix,totalAmount:20,paymentMethod:'LAHZA',inventoryReserved:true,items:{create:{productId:product.id,price:10,quantity:2}}}});orders.push(paid.id);
 await db.payment.create({data:{orderId:paid.id,reference:prefix+'-REFERENCE',amount:20,currency:'ILS'}});
 const event={event:'charge.success',data:{reference:prefix+'-REFERENCE'}};const raw=JSON.stringify(event);const signature=crypto.createHmac('sha256','integration-secret').update(raw).digest('hex');
 r=await request('/api/payments/lahza/webhook',event);assert.equal(r.status,401);
 r=await request('/api/payments/lahza/webhook',event,undefined,{'x-lahza-signature':'bad'});assert.equal(r.status,401);
 r=await fetch(base+'/api/payments/lahza/webhook',{method:'POST',headers:{'x-lahza-signature':crypto.createHmac('sha256','integration-secret').update('{').digest('hex'),'x-test-ip':prefix},body:'{'});assert.equal(r.status,400);
 r=await request('/api/payments/lahza/webhook',event,undefined,{'x-lahza-signature':signature});assert.equal(r.status,200,await r.text());
 r=await request('/api/payments/lahza/webhook',event,undefined,{'x-lahza-signature':signature});assert.equal(r.status,409);assert.equal((await db.order.findUnique({where:{id:paid.id}})).status,'PROCESSING');assert.equal(await db.webhookLog.count({where:{ipAddress:prefix}}),5);console.log('PASS webhook signature, JSON validation, verified payment and replay protection');
 const loginEmail=`${prefix}-registered@example.test`;
 const registration=await request('/api/auth/register',{name:prefix,email:loginEmail,password:'TestPassword123!',phone:'000'});assert.equal(registration.status,201,await registration.text());
 const loginIp=prefix+'-login';
 r=await request('/api/auth/login',{email:loginEmail,password:'wrong'},undefined,{'x-test-ip':loginIp});assert.equal(r.status,401,await r.text());r=await request('/api/auth/login',{email:loginEmail,password:'wrong'},undefined,{'x-test-ip':loginIp});assert.equal(r.status,429);assert.ok(Number(r.headers.get('retry-after'))>0);
 const successfulLogin=await request('/api/auth/login',{email:loginEmail,password:'TestPassword123!'},undefined,{'x-test-ip':prefix+'-fresh'});assert.equal(successfulLogin.status,200,await successfulLogin.text());assert.match(successfulLogin.headers.get('set-cookie'),/HttpOnly/i);assert.match(successfulLogin.headers.get('set-cookie'),/SameSite=strict/i);console.log('PASS login throttling, bcrypt verification and session cookie flags');
 for(const [path,user,status] of [['/admin/products',manager,403],['/admin/settings',admin,403],['/api/admin/audit-logs',admin,403],['/api/admin/audit-logs',superAdmin,200],['/admin/orders',manager,200]]){r=await request(path,undefined,user);assert.equal(r.status,status,path);}
 assert.ok(await db.adminAuditLog.count({where:{userId:admin.id}})>=2);assert.ok(await db.emailLog.count({where:{orderId:{in:orders},status:'SENT'}})>=6);console.log('PASS RBAC pages, audit API, mutation audit and delivery logs');
 if(process.env.KEEP_TEST_SERVER==='1'){console.log('READY_FOR_BROWSER');await new Promise(r=>setTimeout(r,120000));}
 console.log('All integration checks passed.');
} finally {
 if(child){child.kill();await Promise.race([once(child,'exit'),new Promise(r=>setTimeout(r,3000))]);}
 smtp.close();gateway.close();mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/integration-server.log',log);
 await db.emailLog.deleteMany({where:{OR:[{orderId:{in:orders}},{recipient:{startsWith:prefix}}]}});
 await db.adminAuditLog.deleteMany({where:{userId:{in:users.map(u=>u.id)}}});
 await db.webhookReceipt.deleteMany({where:{key:`charge:${prefix}-REFERENCE`}});
 await db.webhookLog.deleteMany({where:{ipAddress:prefix}});await db.loginAttempt.deleteMany({where:{ipAddress:{startsWith:prefix}}});
 await db.order.deleteMany({where:{id:{in:orders}}});if(product){await db.wishlistItem.deleteMany({where:{productId:product.id}});await db.inventoryAuditLog.deleteMany({where:{productId:product.id}});await db.product.delete({where:{id:product.id}});}if(shipping)await db.shippingOption.delete({where:{id:shipping.id}});await db.user.deleteMany({where:{OR:[{id:{in:users.map(u=>u.id)}},{email:`${prefix}-registered@example.test`}]}});await db.$disconnect();
 if(uploadedUrl){const path=await import('node:path');const dir='.uploads-integration-test';rmSync(path.join(dir,'integration',uploadedUrl.split('/').pop()),{force:true});}
}
