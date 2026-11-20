import { db, ensureAdminAccounts, jsonResponse, publicUser, readSession } from './shared.mjs';

export default async function handler(request) {
  const path = new URL(request.url).pathname;
  if (!['/api/admin/users', '/api/admin/overview'].includes(path)) {
    return jsonResponse({ error: 'Ruta no encontrada.' }, 404);
  }
  if (request.method !== 'GET') return jsonResponse({ error: 'Método no permitido.' }, 405);

  const session = await readSession(request);
  if (!session) return jsonResponse({ error: 'Inicia sesión para continuar.' }, 401);
  if (session.role !== 'admin') return jsonResponse({ error: 'No tienes acceso al panel de administración.' }, 403);

  try {
    await ensureAdminAccounts();
    const rows = await db.sql`
      SELECT id, username, full_name, email, role, is_active, favorite_cuisines,
        dietary_preferences, spice_level, profile_notes, created_at, last_login_at,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = users.id) AS order_count
      FROM users
      WHERE role = 'user'
      ORDER BY created_at ASC
    `;
    const users = rows.map((user) => ({ ...publicUser(user), createdAt: user.created_at, lastLoginAt: user.last_login_at, orderCount: Number(user.order_count || 0) }));
    if (path === '/api/admin/users') return jsonResponse({ users });

    const orders = await db.sql`
      SELECT o.id, o.items, o.total_cop, o.delivery_address, o.phone, o.note, o.status, o.created_at,
        u.id AS user_id, u.full_name, u.email
      FROM orders o JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC LIMIT 200
    `;
    return jsonResponse({
      users,
      orders: orders.map((order) => ({
        id: String(order.id), items: order.items, totalCop: Number(order.total_cop),
        address: order.delivery_address, phone: order.phone, note: order.note, status: order.status,
        createdAt: order.created_at,
        user: { id: String(order.user_id), fullName: order.full_name, email: order.email || '' },
      })),
    });
  } catch (error) {
    console.error('Menumi admin request failed:', error.message);
    return jsonResponse({ error: 'No fue posible consultar las cuentas.' }, 500);
  }
}

export const config = {
  path: '/api/admin/*',
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowLimit: 60, windowSize: 60 },
};
