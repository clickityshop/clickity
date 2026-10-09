CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE,
  reference TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  homeroom TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected'))
);

CREATE INDEX orders_created_at ON orders (created_at DESC);
