import 'server-only';
import { prisma as base } from './prisma';
import { requirePermission, getClientIp } from './auth-middleware';

const mutations = new Set(['create','update','delete','upsert','updateMany','deleteMany']);
function redact(value: unknown): any {
 if (Array.isArray(value)) return value.map(redact);
 if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k])=> !/password|token|secret|hash/i.test(k)).map(([k,v])=>[k,redact(v)]));
 return value;
}
/** Actions use this client so mutation and audit record commit together. */
export const prisma = base.$extends({ query: { $allModels: { async $allOperations({model, operation, args, query}) {
 if (!mutations.has(operation)) return query(args);
 const resource = model[0].toLowerCase() + model.slice(1);
 const user = await requirePermission(operation, resource === 'user' ? 'customer' : resource);
 return base.$transaction(async tx => {
   const delegate = (tx as any)[resource];
   const old = 'where' in args ? await delegate.findFirst({where: args.where}) : null;
   if (resource === 'user' && old?.role !== 'CUSTOMER') throw new Error('Use admin management for staff accounts');
   const result = await delegate[operation](args);
   await tx.adminAuditLog.create({data:{userId:user.id,action:operation,resourceType:resource,resourceId:result.id,oldData:old ? redact(JSON.parse(JSON.stringify(old))) : undefined,newData:redact(JSON.parse(JSON.stringify(result))),ipAddress:getClientIp()}});
   return result;
 });
} } } });
