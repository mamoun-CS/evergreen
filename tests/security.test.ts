import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { verifyLahzaSignature } from '../src/lib/payment-utils';
import { loginLimit } from '../src/lib/rate-limit';
import { canAccess, pageResource } from '../src/lib/rbac';
import { ProductFormSchema, CouponFormSchema, CategoryFormSchema, NavigationSchema, BannerSchema, HomepageSchema, AdminUserSchema } from '../src/lib/validation';
import { csvCell } from '../src/lib/audit-filters';
import { getLahzaConfig, isLahzaConfigured } from '../src/lib/lahza-config';
import { canReviewProduct } from '../src/lib/rate-limit';
import { canAccessWishlistItem } from '../src/lib/wishlist';
import { parseCompareSlugs } from '../src/lib/compare';
import { validateImageUpload } from '../src/lib/upload-validation';
import { detectImageType } from '../src/lib/upload-validation';
const body=Buffer.from('{"event":"charge.success"}'),secret='test-secret';
test('Lahza config requires a server secret and callback without returning secrets publicly',()=>{
 assert.throws(()=>getLahzaConfig({}),/LAHZA_SECRET_KEY/);
 assert.throws(()=>getLahzaConfig({LAHZA_SECRET_KEY:'secret'}),/LAHZA_CALLBACK_URL/);
 const config=getLahzaConfig({LAHZA_SECRET_KEY:'private',NEXT_PUBLIC_APP_URL:'https://store.example.test',LAHZA_BASE_URL:'https://gateway.example.test/'});
 assert.equal(config.baseUrl,'https://gateway.example.test');
 assert.equal(config.callbackUrl,'https://store.example.test/payment/lahza/callback');
 assert.equal(config.secret,'private');
 assert.equal(isLahzaConfigured({LAHZA_SECRET_KEY:'private',LAHZA_CALLBACK_URL:'https://store.example.test/callback'}),true);
 assert.equal(isLahzaConfigured({}),false);
 assert.throws(()=>getLahzaConfig({LAHZA_SECRET_KEY:'private',LAHZA_CALLBACK_URL:'http://store.example.test/callback',NODE_ENV:'production'}),/HTTPS/);
});
test('review permission requires a completed or paid order for the same customer and product',()=>{
 const orders=[{id:'paid-order',userId:'buyer',status:'PROCESSING',productIds:['p1'],paid:true},{id:'pending-order',userId:'buyer',status:'PENDING',productIds:['p1'],paid:false},{id:'delivered-order',userId:'buyer',status:'COMPLETED',productIds:['p2'],paid:false}];
 assert.equal(canReviewProduct('buyer','p1',orders)?.id,'paid-order');
 assert.equal(canReviewProduct('buyer','p2',orders)?.id,'delivered-order');
 assert.equal(canReviewProduct('other','p1',orders),null);
 assert.equal(canReviewProduct('buyer','p3',orders),null);
});
test('wishlist ownership check prevents cross-customer item access',()=>{
 assert.equal(canAccessWishlistItem('owner-1','owner-1'),true);
 assert.equal(canAccessWishlistItem('owner-1','owner-2'),false);
 assert.equal(canAccessWishlistItem('','owner-2'),false);
});
test('comparison accepts at most four unique product slugs',()=>{
 assert.deepEqual(parseCompareSlugs('a,b,c,d'),['a','b','c','d']);
 assert.equal(parseCompareSlugs('a,b,c,d,e'),null);
 assert.equal(parseCompareSlugs('a,a'),null);
 assert.equal(parseCompareSlugs(''),null);
 assert.equal(parseCompareSlugs('a,'.concat('x'.repeat(161))),null);
});
test('upload validation checks magic bytes, MIME, and the 5 MB limit',()=>{
 const jpeg=Uint8Array.from([0xff,0xd8,0xff,0x00]);
 const png=Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
 const webp=Uint8Array.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]);
 assert.equal(validateImageUpload(jpeg,'image/jpeg',jpeg.length),'image/jpeg');
 assert.equal(validateImageUpload(png,'image/png',png.length),'image/png');
 assert.equal(validateImageUpload(webp,'image/webp',webp.length),'image/webp');
 assert.equal(validateImageUpload(jpeg,'image/png',jpeg.length),null);
 assert.equal(validateImageUpload(Uint8Array.from([0,1,2,3]),'image/jpeg',4),null);
 assert.equal(validateImageUpload(jpeg,'image/jpeg',5*1024*1024+1),null);
});
test('image signature detection is independent of the client MIME declaration',()=>{
 const jpeg=Uint8Array.from([0xff,0xd8,0xff,0x00]);
 assert.equal(detectImageType(jpeg),'image/jpeg');
 assert.equal(detectImageType(Uint8Array.from([0,1,2,3])),null);
});
test('signature validates exact raw bytes and rejects malformed lengths without throwing',()=>{
 const signature=crypto.createHmac('sha256',secret).update(body).digest('hex');
 assert.equal(verifyLahzaSignature(body,signature,secret),true);
 for(const invalid of ['', 'a', 'z'.repeat(64),signature.slice(1),signature+'00'])assert.equal(verifyLahzaSignature(body,invalid,secret),false);
 assert.equal(verifyLahzaSignature(Buffer.concat([body,Buffer.from(' ')]),signature,secret),false);
 assert.equal(verifyLahzaSignature(body,signature,''),false);
});
test('rate limits first, third, fifth and tenth failures and expires',()=>{
 const now=Date.now();const failures=(n:number)=>Array.from({length:n},()=>({createdAt:new Date(now)}));
 assert.equal(loginLimit([],now),0);assert.equal(loginLimit(failures(1),now),60);assert.equal(loginLimit(failures(3),now),300);assert.equal(loginLimit(failures(5),now),900);assert.equal(loginLimit(failures(10),now),3600);assert.equal(loginLimit(failures(10),now+3600001),0);
 const staggered=Array.from({length:10},(_,i)=>({createdAt:new Date(now-(9-i)*180000)}));
 assert.equal(loginLimit(staggered,now+1800000),1800,'one hour block survives earlier failures aging out');
});
test('RBAC denies unknown resources, managers mutations, admin settings and bulk deletion',()=>{
 assert.equal(canAccess({role:'MANAGER'},'read','order'),true);
 for(const role of ['CUSTOMER','MANAGER'])assert.equal(canAccess({role},'update','product'),false);
 for(const resource of ['settings','admins','unknown'])assert.equal(canAccess({role:'ADMIN'},'update',resource),false);
 assert.equal(canAccess({role:'ADMIN'},'deleteMany','product'),false);
 assert.equal(canAccess({role:'ADMIN'},'update','product'),true);
 assert.equal(canAccess({role:'SUPER_ADMIN'},'update','admins'),true);
});
test('admin route resources are explicit and preserve role boundaries',()=>{
 assert.equal(pageResource('/admin/shipping'),'shipping');
 assert.equal(pageResource('/admin/inventory'),'inventory');
 assert.equal(pageResource('/admin/content/policies'),'content');
 assert.equal(pageResource('/admin/settings'),'settings');
 assert.equal(pageResource('/admin/not-a-route'),'unknown');
 assert.equal(canAccess({role:'ADMIN'},'update','shipping'),true);
 assert.equal(canAccess({role:'MANAGER'},'read','shipping'),false);
 assert.equal(canAccess({role:'MANAGER'},'read','order'),true);
 assert.equal(canAccess({role:'SUPER_ADMIN'},'update','content'),true);
});
const product={nameEn:'Planter',nameAr:'أصيص',slug:'planter',purchaseMode:'PURCHASABLE',basePrice:0,currency:'ILS',isAvailable:true,isFeatured:false,stockQuantity:3,images:[],categories:["category-planters"],applications:[]};
test('product schema rejects corrupt prices, stock, oversized text, HTML and mass assignment',()=>{
 assert.equal(ProductFormSchema.safeParse(product).success,true);
 for(const change of [{basePrice:-1},{basePrice:Infinity},{stockQuantity:1.5},{nameEn:'x'.repeat(201)},{nameAr:'<script>alert(1)</script>'},{slug:'bad slug'},{discountPrice:1}])assert.equal(ProductFormSchema.safeParse({...product,...change}).success,false);
 assert.equal('id' in ProductFormSchema.parse({...product,id:'injected'}),false);
});
test('coupon, category, URLs, admin roles and existing CMS payloads validate',()=>{
 assert.equal(CouponFormSchema.safeParse({code:'ABC',type:'PERCENTAGE',value:101}).success,false);
 assert.equal(CouponFormSchema.safeParse({code:'ABC',type:'FIXED_AMOUNT',value:5,maximumUses:1.5}).success,false);
 assert.equal(CategoryFormSchema.safeParse({nameAr:'أ',nameEn:'A',slug:'bad!'}).success,false);
 for(const url of ['javascript:alert(1)','//evil.example','/\\evil.example'])assert.equal(NavigationSchema.safeParse({labelAr:'أ',labelEn:'A',url,order:0}).success,false);
 assert.equal(BannerSchema.safeParse({imageUrl:'https://example.test/image.jpg',titleAr:null,ctaUrl:null,order:0,isActive:true}).success,true);
 assert.equal(HomepageSchema.safeParse({key:'hero',type:'HERO',titleEn:'Title'}).success,true);
 assert.equal(AdminUserSchema.safeParse({name:'A',email:'a@example.test',password:'longpassword123',role:'CUSTOMER'}).success,false);
});
test('CSV neutralizes spreadsheet formulas',()=>{assert.equal(csvCell('=CMD()'),'"\'=CMD()"');assert.equal(csvCell('a"b'),'"a""b"');});

test('product edits require a category and preserve optional editable metadata', () => {
 assert.equal(ProductFormSchema.safeParse({...product,categories:[]}).success,false);
 const result = ProductFormSchema.parse({...product,color:'????',metaTitleAr:'????',sourceUrl:'/source',accessories:['other-product'],basePrice:0});
 assert.equal(result.color,'????');
 assert.equal(result.metaTitleAr,'????');
 assert.deepEqual(result.accessories,['other-product']);
 assert.equal(result.basePrice,0);
});
