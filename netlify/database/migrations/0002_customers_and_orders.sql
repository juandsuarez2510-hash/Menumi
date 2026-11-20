ALTER TABLE admins RENAME TO users;
ALTER TABLE admin_sessions RENAME TO user_sessions;
ALTER TABLE user_sessions RENAME COLUMN admin_id TO user_id;
ALTER INDEX admin_sessions_expires_at_idx RENAME TO user_sessions_expires_at_idx;

ALTER TABLE users ADD COLUMN full_name TEXT;
UPDATE users SET full_name = username WHERE full_name IS NULL;
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN email_normalized TEXT UNIQUE;
ALTER TABLE users ADD COLUMN favorite_cuisines TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN dietary_preferences TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN spice_level SMALLINT NOT NULL DEFAULT 2 CHECK (spice_level BETWEEN 0 AND 3);
ALTER TABLE users ADD COLUMN profile_notes TEXT NOT NULL DEFAULT '';

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total_cop INTEGER NOT NULL CHECK (total_cop > 0),
  delivery_address TEXT NOT NULL,
  phone TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'recibido' CHECK (status IN ('recibido', 'confirmado', 'en preparación', 'en camino', 'entregado', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX orders_user_id_created_at_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);
