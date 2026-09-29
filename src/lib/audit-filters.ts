import { Prisma } from '@prisma/client';
export function auditFilters(params: URLSearchParams): Prisma.AdminAuditLogWhereInput {
 const userId=params.get('userId') || undefined, action=params.get('action') || undefined, resourceType=params.get('resourceType') || undefined;
 const from=params.get('from'),to=params.get('to');
 const gte=from?new Date(from):undefined;const lte=to?new Date(`${to}T23:59:59.999Z`):undefined;
 if((gte&&Number.isNaN(gte.getTime()))||(lte&&Number.isNaN(lte.getTime()))) throw new Error('Invalid date range');
 return {userId,action,resourceType,createdAt:gte||lte?{gte,lte}:undefined};
}
export function csvCell(value:unknown) {let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
