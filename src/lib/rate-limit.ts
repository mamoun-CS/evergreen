export function loginLimit(failures: {createdAt: Date}[], now = Date.now()) {
 const history=failures.filter(f=>now-f.createdAt.getTime()<7200000).map(f=>f.createdAt.getTime()).sort((a,b)=>a-b);
 if (!history.length) return 0;
 let blockedUntil=0;
 for(let i=0;i<history.length;i++) {
  const count=history.slice(0,i+1).filter(t=>history[i]-t<3600000).length;
  if(count>=10) blockedUntil=Math.max(blockedUntil,history[i]+3600000);
 }
 const hour=history.filter(t=>now-t<3600000),recent=hour.filter(t=>now-t<900000);
 const latest=hour[hour.length-1];
 const backoff=hour.length>=5?600000:hour.length>=3?300000:60000;
 const until=Math.max(blockedUntil,latest?latest+backoff:0,recent.length>=5?recent[recent.length-5]+900000:0);
 return Math.max(0,Math.ceil((until-now)/1000));
}

const apiWindows = new Map<string, number[]>();

export function consumeRateLimit(key: string, maximum: number, windowMs: number, now = Date.now()): boolean {
 const recent=(apiWindows.get(key) || []).filter(timestamp => now-timestamp<windowMs);
 if(recent.length>=maximum){apiWindows.set(key,recent);return false;}
 recent.push(now);apiWindows.set(key,recent);
 if(apiWindows.size>10000){for(const [entry,timestamps] of apiWindows){if(timestamps.every(timestamp=>now-timestamp>=windowMs))apiWindows.delete(entry);}}
 return true;
}

export function canReviewProduct(userId: string, productId: string, orders: Array<{userId: string | null; id: string; status: string; productIds: string[]; paid: boolean}>) {
 return orders.find(order => order.userId===userId && order.productIds.includes(productId) && (order.paid || order.status==='COMPLETED')) || null;
}
