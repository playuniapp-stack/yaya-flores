CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price TEXT DEFAULT '',
  availability TEXT DEFAULT 'Disponível hoje',
  images TEXT DEFAULT '[]',
  addons TEXT DEFAULT '[]',
  active INTEGER DEFAULT 1,
  novelty INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_active_sort ON products(active, sort_order);
