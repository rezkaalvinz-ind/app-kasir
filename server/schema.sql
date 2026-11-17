-- Skema database Kasir UMKM (idempotent, aman dijalankan berulang)

create table if not exists products (
  id          serial primary key,
  name        text not null,
  category    text not null default 'Lainnya',
  price       integer not null check (price >= 0),
  cost        integer not null check (cost >= 0),
  stock       integer not null default 0 check (stock >= 0),
  min_stock   integer not null default 5 check (min_stock >= 0),
  unit        text not null default 'pcs',
  created_at  timestamptz not null default now()
);

create table if not exists customers (
  id          serial primary key,
  name        text not null,
  phone       text,
  created_at  timestamptz not null default now()
);

create table if not exists sales (
  id          serial primary key,
  code        text not null unique,
  created_at  timestamptz not null default now(),
  method      text not null check (method in ('tunai', 'qris', 'utang')),
  total       integer not null check (total >= 0),
  cash        integer not null default 0 check (cash >= 0),
  change      integer not null default 0 check (change >= 0),
  customer_id integer references customers(id)
);

create table if not exists sale_items (
  id           serial primary key,
  sale_id      integer not null references sales(id) on delete cascade,
  product_id   integer not null references products(id),
  product_name text not null,
  price        integer not null,
  cost         integer not null,
  qty          integer not null check (qty > 0)
);

create table if not exists stock_ins (
  id          serial primary key,
  product_id  integer not null references products(id),
  qty         integer not null check (qty > 0),
  cost        integer not null check (cost >= 0),
  date        timestamptz not null default now(),
  supplier    text,
  as_expense  boolean not null default false,
  initial     boolean not null default false
);

create table if not exists debts (
  id          serial primary key,
  customer_id integer not null unique references customers(id) on delete cascade,
  due_date    timestamptz not null,
  created_at  timestamptz not null default now()
);

create table if not exists debt_entries (
  id       serial primary key,
  debt_id  integer not null references debts(id) on delete cascade,
  type     text not null check (type in ('belanja', 'bayar')),
  date     timestamptz not null default now(),
  amount   integer not null check (amount > 0),
  note     text,
  method   text
);

create table if not exists users (
  id            serial primary key,
  name          text not null,
  username      text not null unique,
  password_hash text not null,
  role          text not null default 'owner' check (role in ('owner', 'staff')),
  created_at    timestamptz not null default now()
);

-- Pengaturan toko: selalu tepat satu baris (id = 1)
create table if not exists settings (
  id         integer primary key default 1 check (id = 1),
  store_name text not null default 'Toko Saya',
  updated_at timestamptz not null default now()
);

create sequence if not exists trx_code_seq start with 1135;

create index if not exists idx_sales_created_at on sales (created_at);
create index if not exists idx_sale_items_sale on sale_items (sale_id);
create index if not exists idx_debt_entries_debt on debt_entries (debt_id);
create index if not exists idx_stock_ins_date on stock_ins (date);
