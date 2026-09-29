import { z } from 'zod';
const text = (max: number) => z.string().trim().max(max).refine(v => !/[<>]/.test(v), 'HTML is not allowed');
const name = (max = 200) => text(max).min(1, 'Required');
const optionalText = (max = 2000) => text(max).optional();
const amount = z.number().finite().min(0).max(999999);
const id = z.string().min(1).max(100);
const slug = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens');
const url = z.string().max(2048).refine(v => { if (!v) return true; if (/[\\\s<>]/.test(v)) return false; if (/^\/(?!\/)/.test(v)) return true; try { return ['http:', 'https:'].includes(new URL(v).protocol); } catch { return false; } }, 'Use a relative path or HTTP(S) URL');
const optionalUrl = url.optional();
export const ProductFormSchema = z.object({
 nameEn: name(), nameAr: name(), slug, sku: optionalText(50), descriptionEn: optionalText(), descriptionAr: optionalText(), purchaseMode: z.enum(['PURCHASABLE','CONTACT_FOR_PRICE']), basePrice: amount.optional(), discountPrice: amount.optional(), currency: z.string().regex(/^[A-Z]{3}$/), isAvailable: z.boolean(), isFeatured: z.boolean(), stockQuantity: z.number().int().min(0).max(2147483647),
 material: optionalText(), color: optionalText(), style: optionalText(), lengthCm: amount.optional(), widthCm: amount.optional(), heightCm: amount.optional(), weightKg: amount.optional(), images: z.array(url).max(30), datasheetUrl: optionalUrl, manualUrl: optionalUrl, warrantyInfoEn: optionalText(), warrantyInfoAr: optionalText(), countryOfOrigin: optionalText(), brandId: id.optional(), seriesModel: optionalText(), categories: z.array(id).max(100), applications: z.array(id).max(100),
}).refine(v => v.discountPrice === undefined || (v.basePrice !== undefined && v.discountPrice <= v.basePrice), { path: ['discountPrice'], message: 'Discount cannot exceed base price' }).refine(v => v.purchaseMode !== 'PURCHASABLE' || v.basePrice !== undefined, { path: ['basePrice'], message: 'Purchasable products need a price' });
export const CategoryFormSchema = z.object({ nameEn: name(120), nameAr: name(120), slug, parentId: z.string().max(100).optional() });
export const ApplicationFormSchema = CategoryFormSchema.omit({parentId: true});
export const BrandFormSchema = z.object({ name: name(), description: optionalText(), logoUrl: optionalUrl });
export const CouponFormSchema = z.object({ code: z.string().trim().toUpperCase().min(3).max(64).regex(/^[A-Z0-9_-]+$/), type: z.enum(['PERCENTAGE','FIXED_AMOUNT']), value: amount.positive(), minimumAmount: amount.optional(), maximumUses: z.number().int().min(1).optional(), expiresAt: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Invalid date').optional() }).refine(v => v.type !== 'PERCENTAGE' || v.value <= 100, { path:['value'], message: 'Percentage cannot exceed 100' });
export const ShippingFormSchema = z.object({ price: amount, isActive: z.boolean() });
export const AdminUserSchema = z.object({ name: name(120), email: z.email().max(254), password: z.string().min(12).max(128), role: z.enum(['ADMIN','SUPER_ADMIN','MANAGER']) });
export const VariantSchema = z.object({ productId: id, titleEn: name(), titleAr: name(), sku: optionalText(50), price: amount.optional(), stock: z.number().int().min(0).max(2147483647) });
export const SpecSchema = z.object({ productId: id, keyEn: name(), keyAr: name(), valueEn: name(2000), valueAr: name(2000), groupEn: optionalText(), groupAr: optionalText() });
export const NavigationSchema = z.object({ labelAr: name(), labelEn: name(), url, order: z.number().int().min(0).max(10000), isActive: z.boolean().optional(), parentId: id.nullish() });
export const BannerSchema = z.object({titleAr: optionalText().nullable(),titleEn:optionalText().nullable(),subtitleAr:optionalText().nullable(),subtitleEn:optionalText().nullable(),imageUrl:url,mobileImageUrl:optionalUrl.nullable(),ctaTextAr:optionalText().nullable(),ctaTextEn:optionalText().nullable(),ctaUrl:optionalUrl.nullable(),isActive:z.boolean(),startDate:z.coerce.date().nullish(),endDate:z.coerce.date().nullish(),order:z.number().int().min(0)}).refine(v=> !v.startDate || !v.endDate || v.startDate<=v.endDate, 'End date must follow start date');
export const PageSchema = z.object({titleAr:name(),titleEn:name(),contentAr:text(50000),contentEn:text(50000),images:z.array(url).max(30).optional(),isActive:z.boolean().optional()});
export const HomepageSchema = z.object({key:slug,type:name(100),titleAr:optionalText(),titleEn:optionalText(),subtitleAr:optionalText(),subtitleEn:optionalText(),contentAr:optionalText(50000),contentEn:optionalText(50000),imageAr:optionalUrl,imageEn:optionalUrl,ctaTextAr:optionalText(),ctaTextEn:optionalText(),ctaLink:optionalUrl,isActive:z.boolean().optional(),order:z.number().int().min(0).optional()});
export const SettingsSchema = z.object(Object.fromEntries(['storeNameAr','storeNameEn','logoUrl','faviconUrl','defaultCurrency','contactEmail','contactPhone','contactWhatsApp','addressAr','addressEn','googleMapsUrl','businessHoursAr','businessHoursEn','footerAboutAr','footerAboutEn','copyrightTextAr','copyrightTextEn'].map(k => [k, k.endsWith('Url') ? optionalUrl : optionalText(2000)])));
export const IdSchema = id;
export const StatusSchema = z.enum(['PENDING','PROCESSING','COMPLETED','CANCELLED']);
export const ReviewSubmissionSchema = z.object({
 rating: z.number().int().min(1).max(5),
 title: z.string().trim().max(120).optional(),
 body: z.string().trim().min(5).max(3000),
});
export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
 const result = schema.safeParse(input);
 if (!result.success) { console.warn('Admin validation rejected', { fields: result.error.issues.map(i=>i.path.join('.')), timestamp: new Date().toISOString() }); throw new Error(result.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')); }
 return result.data;
}
