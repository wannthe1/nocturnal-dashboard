-- Nocturnal Tech: demo data
-- Fills one restaurant with three branches, a realistic year of orders (up to
-- yesterday), a stock list for each branch and a year of expenses, so the
-- dashboard has something to show.
--
-- How to use: run schema.sql first. Then SQL Editor → New query → paste this
-- whole file → Run. It takes a few seconds.
--
-- Running it again replaces that restaurant's branches, sales, inventory,
-- expenses and import history with fresh demo data. It never touches any other
-- restaurant.

do $$
declare
  -- Change this if your restaurant has a different name.
  target_name constant text := 'Midnight Bites';
  rid uuid;
  inserted integer;
begin
  select id into rid
  from public.restaurants
  where name = target_name
  order by created_at desc
  limit 1;

  if rid is null then
    raise exception 'No restaurant named "%". Edit target_name at the top of this script.', target_name;
  end if;

  -- Same "random" numbers every run, so the demo is repeatable.
  perform setseed(0.42);

  -- Start clean: imports (and the rows they added), expenses, then branches,
  -- which also deletes their sales and stock.
  delete from public.imports where restaurant_id = rid;
  delete from public.expenses where restaurant_id = rid;
  delete from public.branches where restaurant_id = rid;

  -- Branches: relative size and how customers order there.
  create temp table demo_branch (name text, size numeric, takeaway numeric, delivery numeric) on commit drop;
  insert into demo_branch values
    ('Downtown',  1.00, 0.25, 0.25),
    ('Riverside', 0.75, 0.20, 0.35),
    ('Airport',   0.55, 0.60, 0.00);

  insert into public.branches (restaurant_id, name)
  select rid, name from demo_branch;

  -- Menu: price and how popular each item is (weight).
  create temp table demo_menu (item text, category text, price numeric, weight numeric,
                               lo numeric, hi numeric) on commit drop;
  insert into demo_menu (item, category, price, weight) values
    ('Classic Smash Burger',    'Burgers',           11.50, 14),
    ('Midnight Double',         'Burgers',           14.90, 10),
    ('Crispy Chicken Burger',   'Burgers',           12.50,  9),
    ('Truffle Mushroom Burger', 'Burgers',           15.50,  5),
    ('Veggie Burger',           'Burgers',           11.90,  5),
    ('Fries',                   'Sides',              4.50, 16),
    ('Loaded Fries',            'Sides',              7.90,  7),
    ('Onion Rings',             'Sides',              5.50,  5),
    ('Chicken Wings (6)',       'Sides',              9.50,  7),
    ('Korean Chicken Bowl',     'Bowls',             13.90,  5),
    ('Halloumi Grain Bowl',     'Bowls',             12.90,  3),
    ('Chocolate Lava Cake',     'Desserts & Shakes',  7.50,  3),
    ('Vanilla Milkshake',       'Desserts & Shakes',  6.50,  6),
    ('Soft Drink',              'Drinks',             3.20, 15),
    ('Craft Lemonade',          'Drinks',             4.20,  6),
    ('Iced Coffee',             'Drinks',             4.80,  5),
    ('Craft Beer',              'Drinks',             6.90,  5);

  -- Opening hours 11:00–02:00, busiest at lunch, dinner and late evening.
  create temp table demo_hour (h int, weight numeric, lo numeric, hi numeric) on commit drop;
  insert into demo_hour (h, weight) values
    (11, 4), (12, 10), (13, 10), (14, 6), (15, 3), (16, 3), (17, 5), (18, 9),
    (19, 11), (20, 10), (21, 8), (22, 6), (23, 5), (0, 4), (1, 2);

  -- Turn weights into ranges between 0 and 1, so a random number picks one.
  with c as (
    select item,
           sum(weight) over (order by item) / sum(weight) over () as hi,
           weight / sum(weight) over () as w
    from demo_menu)
  update demo_menu m set hi = c.hi, lo = c.hi - c.w from c where c.item = m.item;

  with c as (
    select h,
           sum(weight) over (order by h) / sum(weight) over () as hi,
           weight / sum(weight) over () as w
    from demo_hour)
  update demo_hour d set hi = c.hi, lo = c.hi - c.w from c where c.h = d.h;

  insert into public.sales
    (restaurant_id, branch_id, order_ref, sold_at, item_name, category,
     quantity, unit_price, channel, payment_method)
  with
  days as (
    select d::date as day,
           -- Weekends are busier.
           case extract(isodow from d)
             when 1 then 0.80 when 2 then 0.85 when 3 then 0.90 when 4 then 1.00
             when 5 then 1.30 when 6 then 1.40 else 1.10 end as dow_f,
           -- Quieter in January, busier in summer and December.
           case extract(month from d)
             when 1 then 0.82 when 2 then 0.88 when 3 then 0.95 when 4 then 1.00
             when 5 then 1.05 when 6 then 1.12 when 7 then 1.18 when 8 then 1.15
             when 9 then 1.00 when 10 then 1.02 when 11 then 1.05 else 1.25 end as season_f,
           -- Slow growth: about +16% over the year.
           0.92 + 0.16 * ((d::date - (current_date - 365)) / 365.0) as trend_f
    from generate_series(current_date - 365, current_date - 1, interval '1 day') d
  ),
  orders as (
    select b.id as branch_id, db.takeaway, db.delivery, dy.day, n,
           random() as r_hour, random() as r_min, random() as r_chan,
           random() as r_pay, random() as r_lines
    from days dy
    cross join demo_branch db
    join public.branches b on b.restaurant_id = rid and b.name = db.name
    cross join lateral generate_series(
      1,
      greatest(1, round(60 * db.size * dy.dow_f * dy.season_f * dy.trend_f
                        * (0.85 + random() * 0.30))::int)
    ) as n
  ),
  numbered as (
    select o.*, row_number() over (order by o.day, o.branch_id, o.n) as seq
    from orders o
  ),
  lines as (
    select nb.*, h.h, random() as r_item, random() as r_qty
    from numbered nb
    join demo_hour h on nb.r_hour >= h.lo and nb.r_hour < h.hi
    cross join lateral generate_series(
      1,
      case when nb.r_lines < 0.35 then 1 when nb.r_lines < 0.70 then 2
           when nb.r_lines < 0.90 then 3 else 4 end
    ) as l
  )
  select
    rid,
    li.branch_id,
    'MB-' || lpad(li.seq::text, 6, '0'),
    (li.day + make_interval(hours => li.h, mins => floor(li.r_min * 60)::int)) at time zone 'UTC',
    m.item,
    m.category,
    case when li.r_qty < 0.85 then 1 when li.r_qty < 0.97 then 2 else 3 end,
    m.price,
    case when li.r_chan < li.takeaway then 'takeaway'
         when li.r_chan < li.takeaway + li.delivery then 'delivery'
         else 'dine_in' end,
    case when li.r_pay < 0.62 then 'card' when li.r_pay < 0.82 then 'mobile'
         when li.r_pay < 0.95 then 'cash' else 'gift_card' end
  from lines li
  join demo_menu m on li.r_item >= m.lo and li.r_item < m.hi;

  get diagnostics inserted = row_count;
  raise notice 'Added % sale lines to "%".', inserted, target_name;

  -- Inventory: the same stock list in every branch, scaled to branch size.
  -- About a quarter start at or below their reorder level, and a few at zero.
  create temp table demo_stock (name text, category text, unit text, reorder numeric, cost numeric) on commit drop;
  insert into demo_stock values
    ('Beef patties',        'Meat & Protein', 'pcs',  400, 1.10),
    ('Chicken breast',      'Meat & Protein', 'kg',    25, 7.80),
    ('Chicken wings',       'Meat & Protein', 'kg',    20, 5.90),
    ('Halloumi',            'Dairy',          'kg',     6, 11.50),
    ('Cheddar slices',      'Dairy',          'pcs',  500, 0.12),
    ('Milk',                'Dairy',          'L',     20, 1.05),
    ('Vanilla ice cream',   'Dairy',          'L',     15, 4.20),
    ('Brioche buns',        'Bakery',         'pcs',  450, 0.35),
    ('Potatoes',            'Produce',        'kg',    80, 0.90),
    ('Lettuce',             'Produce',        'kg',    10, 2.60),
    ('Tomatoes',            'Produce',        'kg',    12, 2.80),
    ('Onions',              'Produce',        'kg',    15, 1.20),
    ('Mushrooms',           'Produce',        'kg',     8, 5.40),
    ('Lemons',              'Produce',        'kg',     6, 2.90),
    ('Rice',                'Dry Goods',      'kg',    20, 1.70),
    ('Kimchi',              'Dry Goods',      'kg',     5, 6.50),
    ('Dark chocolate',      'Dry Goods',      'kg',     4, 9.80),
    ('Coffee beans',        'Dry Goods',      'kg',     5, 18.00),
    ('Frying oil',          'Dry Goods',      'L',     40, 2.10),
    ('Truffle mayo',        'Sauces',         'L',      4, 14.00),
    ('House burger sauce',  'Sauces',         'L',      6, 6.00),
    ('Soft drink syrup',    'Drinks',         'L',     30, 3.40),
    ('Craft beer',          'Drinks',         'pcs',  120, 1.60),
    ('Takeaway boxes',      'Packaging',      'pack',  10, 12.00),
    ('Paper bags',          'Packaging',      'pack',   8, 9.50),
    ('Napkins',             'Packaging',      'pack',   6, 4.00);

  insert into public.inventory_items
    (restaurant_id, branch_id, name, category, unit, quantity, reorder_level, unit_cost)
  select
    rid, b.id, s.name, s.category, s.unit,
    greatest(0, round(round(s.reorder * db.size) * (random() * 4 - 0.15))),
    round(s.reorder * db.size),
    s.cost
  from demo_stock s
  cross join demo_branch db
  join public.branches b on b.restaurant_id = rid and b.name = db.name;

  get diagnostics inserted = row_count;
  raise notice 'Added % inventory items to "%".', inserted, target_name;

  -- Expenses, worked out from each branch's sales so the numbers fit together.
  -- Only dates up to yesterday are added.
  insert into public.expenses (restaurant_id, branch_id, spent_on, category, description, amount)
  -- Weekly supplier invoice, paid the Monday after: about 31% of that week's sales.
  select rid, branch_id, wk + 7, 'ingredients', 'Weekly supplier invoice',
         round(rev * 0.31 * (0.94 + random() * 0.12)::numeric, 2)
  from (select branch_id, date_trunc('week', sold_at)::date as wk, sum(amount) as rev
        from public.sales where restaurant_id = rid group by 1, 2) w
  where wk + 7 <= current_date - 1

  union all
  -- Payroll every two weeks: about 30% of sales in that fortnight.
  select rid, branch_id, period_end, 'wages', 'Staff payroll',
         round(rev * 0.30 * (0.97 + random() * 0.06)::numeric, 2)
  from (select branch_id,
               (current_date - 365) + ((sold_at::date - (current_date - 365)) / 14) * 14 + 13 as period_end,
               sum(amount) as rev
        from public.sales where restaurant_id = rid group by 1, 2) p
  where period_end <= current_date - 1

  union all
  -- Delivery platform commission, billed on the last day of each month: 25% of delivery sales.
  select rid, branch_id, (mon + interval '1 month' - interval '1 day')::date, 'delivery_fees', 'Delivery platform commission',
         round(rev * 0.25, 2)
  from (select branch_id, date_trunc('month', sold_at)::date as mon, sum(amount) as rev
        from public.sales where restaurant_id = rid and channel = 'delivery' group by 1, 2) d
  where (mon + interval '1 month' - interval '1 day')::date <= current_date - 1

  union all
  -- Electricity, gas and water, billed at month end: higher in winter and summer.
  select rid, branch_id, (mon + interval '1 month' - interval '1 day')::date, 'utilities', 'Electricity, gas & water',
         round(rev * 0.025 * case when extract(month from mon) in (12, 1, 2) then 1.3
                                  when extract(month from mon) in (6, 7, 8) then 1.15 else 1 end, 2)
  from (select branch_id, date_trunc('month', sold_at)::date as mon, sum(amount) as rev
        from public.sales where restaurant_id = rid group by 1, 2) u
  where (mon + interval '1 month' - interval '1 day')::date <= current_date - 1

  union all
  -- Rent on the 1st of each month.
  select rid, b.id, m::date, 'rent', 'Monthly rent',
         case b.name when 'Downtown' then 4200 when 'Riverside' then 3200 else 3500 end
  from public.branches b
  cross join generate_series(date_trunc('month', current_date - 365), current_date - 1, interval '1 month') m
  where b.restaurant_id = rid

  union all
  -- Occasional repairs and equipment, most months.
  select rid, b.id, m::date + floor(random() * 27)::int, 'maintenance',
         (array['Fryer service', 'Refrigeration repair', 'Kitchen equipment', 'Plumbing repair',
                'Coffee machine service', 'Pest control'])[1 + floor(random() * 6)::int],
         round((80 + random() * 820)::numeric, 2)
  from public.branches b
  cross join generate_series(date_trunc('month', current_date - 365), current_date - 32, interval '1 month') m
  where b.restaurant_id = rid and random() < 0.75

  union all
  -- Shared costs (no branch): marketing and software.
  select rid, null, m::date + 2, 'marketing',
         (array['Social media ads', 'Local print & flyers', 'Food blogger campaign'])[1 + floor(random() * 3)::int],
         round((1800 + random() * 1700)::numeric, 2)
  from generate_series(date_trunc('month', current_date - 365), current_date - 3, interval '1 month') m

  union all
  select rid, null, m::date, 'other', 'POS & accounting software', 149
  from generate_series(date_trunc('month', current_date - 365), current_date - 1, interval '1 month') m;

  get diagnostics inserted = row_count;
  raise notice 'Added % expenses to "%".', inserted, target_name;
end;
$$;
