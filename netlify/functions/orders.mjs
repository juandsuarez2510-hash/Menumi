import { randomUUID } from 'node:crypto';
import { db, jsonResponse, originIsAllowed, readSession } from './shared.mjs';

const catalog = new Map([
  ['Combo Mecato Mixto', 20000], ['Combo Menumi Clásico', 42000], ['Combo Pareja', 68000],
  ['Empanaditas de kimchi', 14000], ['Patacón bao', 18500], ['Rollitos de aguacate y mango', 16000],
  ['Sancocho ramen', 32000], ['Lechona bao bun', 28000], ['Pescado en salsa de tamarindo', 34000],
  ['Arroz chino paisa', 26000], ['Fideos de plátano', 24000], ['Arroz con leche brûlée', 12000],
  ['Buñuelo de sésamo', 10000], ['Lulada de yuzu', 9000], ['Té de panela con jengibre', 8000],
  ['Cerveza artesanal', 12000],
]);

export default async function handler(request) {
  if (new URL(request.url).pathname !== '/api/orders') return jsonResponse({ error: 'Ruta no encontrada.' }, 404);
  const session = await readSession(request);
  if (!session) return jsonResponse({ error: 'Inicia sesión para registrar tu pedido.' }, 401);

  if (request.method === 'GET') {
    try {
      const orders = await db.sql`
        SELECT id, items, total_cop, delivery_address, phone, note, status, created_at
        FROM orders WHERE user_id = ${session.id}
        ORDER BY created_at DESC LIMIT 30
      `;
      return jsonResponse({ orders });
    } catch (error) {
      console.error('Menumi orders read failed:', error.message);
      return jsonResponse({ error: 'No fue posible consultar tus pedidos.' }, 500);
    }
  }

  if (request.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405);
  if (!originIsAllowed(request)) return jsonResponse({ error: 'Origen no permitido.' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 12_288) return jsonResponse({ error: 'La solicitud es demasiado grande.' }, 413);

  try {
    const body = await request.json();
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : '';
    if (!address || address.length > 300 || !/^[+\d\s().-]{7,24}$/.test(phone)) {
      return jsonResponse({ error: 'Escribe una dirección y un teléfono válidos.' }, 400);
    }
    if (!Array.isArray(body?.items) || !body.items.length || body.items.length > 30) {
      return jsonResponse({ error: 'Tu carrito está vacío o tiene demasiados productos.' }, 400);
    }

    const items = [];
    let total = 0;
    for (const item of body.items) {
      const price = catalog.get(item?.name);
      if (!price || Number(item?.price) !== price) return jsonResponse({ error: 'Uno de los productos ya no está disponible.' }, 400);
      items.push({ name: item.name, price });
      total += price;
    }

    const orderId = randomUUID();
    const rows = await db.sql`
      INSERT INTO orders (id, user_id, items, total_cop, delivery_address, phone, note)
      VALUES (${orderId}, ${session.id}, ${JSON.stringify(items)}::jsonb, ${total}, ${address}, ${phone}, ${note})
      RETURNING id, items, total_cop, delivery_address, phone, note, status, created_at
    `;
    return jsonResponse({ order: rows[0] }, 201);
  } catch (error) {
    console.error('Menumi order create failed:', error.message);
    return jsonResponse({ error: 'No fue posible guardar tu pedido.' }, 500);
  }
}

export const config = {
  path: '/api/orders',
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowLimit: 12, windowSize: 60 },
};
