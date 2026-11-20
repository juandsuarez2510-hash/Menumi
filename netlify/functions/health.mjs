export default async function handler() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}

export const config = { path: '/api/health', rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowLimit: 120, windowSize: 60 } };
