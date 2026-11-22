-- KaonGO home/menu upgrade for an EXISTING KaonGO Supabase project.
-- Run this after the original KaonGO database schema has already been installed.
-- Safe to re-run: columns and trigger are checked, products are upserted by name,
-- and existing total_sold counts are not reset.

begin;

alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists total_sold integer not null default 0;

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

commit;
