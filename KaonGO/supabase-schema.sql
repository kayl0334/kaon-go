-- ============================================================
-- KaonGO database setup for Supabase
-- Paste this whole file into Supabase Dashboard > SQL Editor > New query, then Run.
-- ============================================================

create extension if not exists pgcrypto;

-- USER PROFILES ------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  user_type text not null default 'College Student',
  city text not null default 'Iligan City',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create a profile automatically whenever Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- MENU / PRODUCTS ----------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('Meals', 'Snacks', 'Drinks')),
  price numeric(10,2) not null check (price >= 0),
  stall_name text not null default 'Campus Canteen',
  description text not null default '',
  emoji text not null default '🍽️',
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- Add fields used by the richer KaonGO menu and the student-favorites ranking.
-- These ALTER statements are safe to run again on an existing project.
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists total_sold integer not null default 0;

-- Expanded campus menu for KaonGO.
insert into public.products (name, category, price, stall_name, description, emoji, image_url, total_sold, is_available)
values
  ('Chicken Rice', 'Meals', 65.00, 'Campus Canteen', 'Crispy fried chicken, warm rice, and a comforting sauce. A campus classic for a filling break.', '🍗', 'assets/chicken-rice.webp', 0, true),
  ('Beef Tapa Rice', 'Meals', 85.00, 'Campus Canteen', 'Savory beef tapa with garlic rice and a sunny-side egg.', '🍳', 'assets/beef-tapa-rice.webp', 0, true),
  ('Chicken Adobo Rice', 'Meals', 75.00, 'Homeplate Stall', 'Tender chicken adobo served with steamed rice and a rich, savory sauce.', '🍲', 'assets/chicken-adobo-rice.webp', 0, true),
  ('Tuna Sandwich', 'Snacks', 45.00, 'Snack Corner', 'Toasted bread with creamy tuna filling and crisp greens.', '🥪', 'assets/tuna-sandwich.webp', 0, true),
  ('Pork Siomai (6 pcs)', 'Snacks', 40.00, 'Snack Corner', 'Six steamed siomai pieces served with a chili-soy dipping sauce.', '🥟', 'assets/siomai.webp', 0, true),
  ('Classic Fries', 'Snacks', 35.00, 'Snack Corner', 'Golden, crispy fries with ketchup.', '🍟', 'assets/fries.webp', 0, true),
  ('Iced Lemon Tea', 'Drinks', 30.00, 'Campus Drinks', 'Refreshing iced tea with a bright lemon twist.', '🍋', 'assets/iced-lemon-tea.webp', 0, true),
  ('Iced Coffee', 'Drinks', 45.00, 'Campus Drinks', 'Chilled, smooth coffee for an afternoon study session.', '☕', 'assets/iced-coffee.webp', 0, true),
  ('Mango Shake', 'Drinks', 55.00, 'Campus Drinks', 'A cool, creamy mango shake made for sunny campus afternoons.', '🥭', 'assets/mango-shake.webp', 0, true)
on conflict (name) do update set
  category = excluded.category,
  price = excluded.price,
  stall_name = excluded.stall_name,
  description = excluded.description,
  emoji = excluded.emoji,
  image_url = excluded.image_url,
  is_available = excluded.is_available;

-- ORDERS --------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  pickup_location text not null default 'Campus Canteen',
  pickup_time timestamptz not null,
  order_notes text,
  payment_method text not null default 'cash'
    check (payment_method in ('cash', 'ewallet')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 20),
  created_at timestamptz not null default now()
);

create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

-- Count units submitted in orders so the homepage can rank actual favorites.
create or replace function public.record_product_order_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.product_id is not null then
    update public.products
    set total_sold = total_sold + new.quantity
    where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists order_item_counts_toward_popularity on public.order_items;
create trigger order_item_counts_toward_popularity
after insert on public.order_items
for each row execute procedure public.record_product_order_count();

-- ROW LEVEL SECURITY -------------------------------------------
-- RLS makes sure a signed-in customer can only access their own
-- profile, orders and order items. Menu items are public/read-only.
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Anyone can view available products" on public.products;
create policy "Anyone can view available products"
on public.products for select to anon, authenticated
using (is_available = true);

drop policy if exists "Users can read their own orders" on public.orders;
create policy "Users can read their own orders"
on public.orders for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own orders" on public.orders;
create policy "Users can create their own orders"
on public.orders for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own order items" on public.order_items;
create policy "Users can read their own order items"
on public.order_items for select to authenticated
using (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_items.order_id
      and public.orders.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can add items to their own orders" on public.order_items;
create policy "Users can add items to their own orders"
on public.order_items for insert to authenticated
with check (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_items.order_id
      and public.orders.user_id = (select auth.uid())
  )
);

-- Secure order creation. Prices are read from products in the database,
-- not trusted from the browser. The order and all order items are created
-- in one database transaction.
create or replace function public.place_order(
  p_items jsonb,
  p_pickup_location text,
  p_pickup_time timestamptz,
  p_order_notes text default null,
  p_payment_method text default 'cash'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_total numeric(10,2) := 0;
  v_validated_items jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to place an order.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Your cart is empty or invalid.';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  if p_pickup_time is null or p_pickup_time < now() then
    raise exception 'Choose a pickup time in the future.';
  end if;

  if p_payment_method not in ('cash', 'ewallet') then
    raise exception 'Choose a valid payment method.';
  end if;

  -- Validate each item and calculate the authoritative total from DB prices.
  for v_item in
    select value from jsonb_array_elements(p_items) as item_rows(value)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity < 1 or v_quantity > 20 then
      raise exception 'Each item quantity must be between 1 and 20.';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id and is_available = true;

    if not found then
      raise exception 'One of the selected products is unavailable.';
    end if;

    v_total := v_total + (v_product.price * v_quantity);
    v_validated_items := v_validated_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'product_name', v_product.name,
        'unit_price', v_product.price,
        'quantity', v_quantity
      )
    );
  end loop;

  insert into public.orders (
    user_id,
    status,
    total_amount,
    pickup_location,
    pickup_time,
    order_notes,
    payment_method,
    payment_status
  ) values (
    v_user_id,
    'pending',
    v_total,
    coalesce(nullif(trim(p_pickup_location), ''), 'Campus Canteen'),
    p_pickup_time,
    nullif(trim(coalesce(p_order_notes, '')), ''),
    p_payment_method,
    case when p_payment_method = 'ewallet' then 'pending' else 'unpaid' end
  ) returning id into v_order_id;

  for v_item in
    select value from jsonb_array_elements(v_validated_items) as valid_rows(value)
  loop
    insert into public.order_items (
      order_id, product_id, product_name, unit_price, quantity
    ) values (
      v_order_id,
      (v_item ->> 'product_id')::uuid,
      v_item ->> 'product_name',
      (v_item ->> 'unit_price')::numeric,
      (v_item ->> 'quantity')::integer
    );
  end loop;

  return v_order_id;
end;
$$;

-- Least-privilege access for the browser client. RLS still controls each row.
grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;
grant execute on function public.place_order(jsonb, text, timestamptz, text, text) to authenticated;

-- ============================================================
-- AFTER RUNNING THIS FILE:
-- 1. Confirm profiles, products, orders, and order_items appear in Table Editor.
-- 2. Three sample products should appear in public.products.
-- 3. Do not add a service_role / secret key to app.js.
-- ============================================================
