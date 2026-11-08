-- Nocturnal Tech: database setup
-- Run in Supabase: Dashboard → SQL Editor → New query → paste the whole file → Run.
-- It is safe to run again (e.g. after new sections are added): existing data is kept.

-- ---------------------------------------------------------------------------
-- Restaurants
-- One restaurant per account. Sales, inventory and expenses tables added in
-- later stages will point at restaurants.id.
-- ---------------------------------------------------------------------------
create table if not exists public.restaurants (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null unique references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 120),
  currency   text not null default 'USD' check (char_length(currency) = 3),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Team: staff who sign in with their own login and see only what their role
-- allows. The restaurant's owner is always an admin and needs no row here.
-- Each person belongs to one restaurant.
-- ---------------------------------------------------------------------------
create table if not exists public.team_members (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  role          text not null check (role in ('admin', 'finance', 'sales', 'inventory', 'hr')),
  email         text not null,
  created_at    timestamptz not null default now()
);

create index if not exists team_members_restaurant_idx on public.team_members (restaurant_id);

-- Single-use invite links. Only a hash of the token is stored, so the links
-- can't be recovered from the database.
create table if not exists public.team_invitations (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  role          text not null check (role in ('admin', 'finance', 'sales', 'inventory', 'hr')),
  token_hash    text not null unique,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '7 days',
  used_at       timestamptz
);

-- The restaurants the signed-in user belongs to with one of the given roles
-- (no roles = any role). Owners always count. Every security rule below uses it.
create or replace function public.my_restaurants(variadic p_roles text[] default '{}')
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.restaurants where owner_id = (select auth.uid())
  union
  select restaurant_id from public.team_members
  where user_id = (select auth.uid()) and (cardinality(p_roles) = 0 or role = any (p_roles));
$$;

revoke execute on function public.my_restaurants(text[]) from public, anon;
grant execute on function public.my_restaurants(text[]) to authenticated;

alter table public.team_members enable row level security;

drop policy if exists "See own membership" on public.team_members;
create policy "See own membership"
  on public.team_members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Admins and HR see the team" on public.team_members;
create policy "Admins and HR see the team"
  on public.team_members for select to authenticated
  using (restaurant_id in (select public.my_restaurants('admin', 'hr')));

drop policy if exists "Admins change roles" on public.team_members;
create policy "Admins change roles"
  on public.team_members for update to authenticated
  using (restaurant_id in (select public.my_restaurants('admin')))
  with check (restaurant_id in (select public.my_restaurants('admin')));

drop policy if exists "Admins remove members" on public.team_members;
create policy "Admins remove members"
  on public.team_members for delete to authenticated
  using (restaurant_id in (select public.my_restaurants('admin')));

alter table public.team_invitations enable row level security;

drop policy if exists "Admins manage invites" on public.team_invitations;
create policy "Admins manage invites"
  on public.team_invitations for all to authenticated
  using (restaurant_id in (select public.my_restaurants('admin')))
  with check (restaurant_id in (select public.my_restaurants('admin')));

-- What an invite link is for, so the invite page can greet the person.
create or replace function public.invite_details(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('restaurant', r.name, 'role', i.role)
  from public.team_invitations i
  join public.restaurants r on r.id = i.restaurant_id
  where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and i.used_at is null and i.expires_at > now();
$$;

revoke execute on function public.invite_details(text) from public;
grant execute on function public.invite_details(text) to anon, authenticated;

-- Uses up an invite and adds the person to the team. Not callable directly.
create or replace function public.claim_invite(p_token text, p_user uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.team_invitations;
begin
  select * into v_invite from public.team_invitations
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and used_at is null and expires_at > now()
  for update;
  if not found then
    raise exception 'invalid_invite';
  end if;
  if exists (select 1 from public.restaurants where owner_id = p_user)
     or exists (select 1 from public.team_members where user_id = p_user) then
    raise exception 'already_member';
  end if;

  insert into public.team_members (user_id, restaurant_id, role, email)
  values (p_user, v_invite.restaurant_id, v_invite.role, coalesce(p_email, ''));
  update public.team_invitations set used_at = now() where id = v_invite.id;
end;
$$;

revoke execute on function public.claim_invite(text, uuid, text) from public, anon, authenticated;

-- For someone already signed in who has no restaurant (e.g. removed, then re-invited).
create or replace function public.accept_invite(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.claim_invite(p_token, (select auth.uid()), (select email from auth.users where id = (select auth.uid())));
end;
$$;

revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- Row Level Security: a signed-in user only ever sees their own restaurant's data.
alter table public.restaurants enable row level security;

drop policy if exists "Owners can view their restaurant" on public.restaurants;
drop policy if exists "Team can view their restaurant" on public.restaurants;
create policy "Team can view their restaurant"
  on public.restaurants for select
  to authenticated
  using (id in (select public.my_restaurants()));

drop policy if exists "Owners can update their restaurant" on public.restaurants;
create policy "Owners can update their restaurant"
  on public.restaurants for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- No insert or delete policies on purpose: restaurants are created by the
-- trigger below and removed when the account is deleted.

-- ---------------------------------------------------------------------------
-- Create the restaurant automatically when someone signs up, with one branch
-- called "Main" so stock, expenses and imports have somewhere to go.
-- The name comes from the "Restaurant name" field on the sign-up form.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_restaurant uuid;
begin
  -- Someone signing up through an invite joins that team instead of getting a
  -- new restaurant. A bad or used invite cancels the sign-up.
  if new.raw_user_meta_data ? 'invite_token' then
    perform public.claim_invite(new.raw_user_meta_data ->> 'invite_token', new.id, new.email);
    update auth.users set raw_user_meta_data = raw_user_meta_data - 'invite_token' where id = new.id;
    return new;
  end if;

  insert into public.restaurants (owner_id, name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'restaurant_name'), ''), 'My restaurant')
  )
  on conflict (owner_id) do nothing
  returning id into new_restaurant;

  if new_restaurant is not null then
    insert into public.branches (restaurant_id, name) values (new_restaurant, 'Main');
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Branches (stage 2)
-- A restaurant can have one or more locations. Sales (and later stock and
-- expenses) belong to a branch.
-- ---------------------------------------------------------------------------
create table if not exists public.branches (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 80),
  created_at    timestamptz not null default now(),
  unique (restaurant_id, name),
  -- Lets other tables check that a branch belongs to the same restaurant.
  unique (id, restaurant_id)
);

alter table public.branches enable row level security;

drop policy if exists "Owners manage their branches" on public.branches;
drop policy if exists "Team can view branches" on public.branches;
create policy "Team can view branches"
  on public.branches for select to authenticated
  using (restaurant_id in (select public.my_restaurants('admin', 'finance', 'sales', 'inventory', 'hr')));

drop policy if exists "Team can change branches" on public.branches;
create policy "Team can change branches"
  on public.branches for all to authenticated
  using (restaurant_id in (select public.my_restaurants('admin')))
  with check (restaurant_id in (select public.my_restaurants('admin')));

-- ---------------------------------------------------------------------------
-- Sales (stage 2)
-- One row per item line on an order, the same shape most till (POS) systems
-- export. Rows with the same order_ref make up one order.
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id             bigint generated always as identity primary key,
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  branch_id      uuid not null,
  order_ref      text not null check (char_length(order_ref) between 1 and 64),
  sold_at        timestamptz not null,
  item_name      text not null check (char_length(item_name) between 1 and 120),
  category       text not null check (char_length(category) between 1 and 60),
  quantity       integer not null check (quantity > 0),
  unit_price     numeric(10, 2) not null check (unit_price >= 0),
  amount         numeric(12, 2) generated always as (quantity * unit_price) stored,
  channel        text not null check (channel in ('dine_in', 'takeaway', 'delivery')),
  payment_method text not null check (payment_method in ('card', 'mobile', 'cash', 'gift_card')),
  created_at     timestamptz not null default now(),
  -- The branch must belong to the same restaurant as the sale.
  foreign key (branch_id, restaurant_id)
    references public.branches (id, restaurant_id) on delete cascade
);

create index if not exists sales_restaurant_sold_at_idx on public.sales (restaurant_id, sold_at);
create index if not exists sales_branch_sold_at_idx on public.sales (branch_id, sold_at);

alter table public.sales enable row level security;

drop policy if exists "Owners manage their sales" on public.sales;
drop policy if exists "Team can view sales" on public.sales;
create policy "Team can view sales"
  on public.sales for select to authenticated
  using (restaurant_id in (select public.my_restaurants('admin', 'finance', 'sales')));

drop policy if exists "Team can change sales" on public.sales;
create policy "Team can change sales"
  on public.sales for all to authenticated
  using (restaurant_id in (select public.my_restaurants('admin', 'sales')))
  with check (restaurant_id in (select public.my_restaurants('admin', 'sales')));

-- ---------------------------------------------------------------------------
-- sales_dashboard(): every figure the Sales page needs, in one call.
-- "security invoker" means it runs as the signed-in user, so Row Level
-- Security still applies: it can only ever add up that user's own sales.
-- p_from / p_to are inclusive dates; p_branch = null means all branches.
-- ---------------------------------------------------------------------------
create or replace function public.sales_dashboard(
  p_from   date,
  p_to     date,
  p_branch uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  -- Only the columns each step needs, and the grouping values worked out once.
  cur as materialized (
    select amount, quantity, order_ref, category, item_name, branch_id, channel,
           (sold_at at time zone 'UTC')::date as day,
           extract(hour from sold_at at time zone 'UTC')::int as hour
    from public.sales
    where sold_at >= p_from::timestamptz
      and sold_at < (p_to + 1)::timestamptz
      and (p_branch is null or branch_id = p_branch)
  ),
  -- One row per order per hour and channel. Counting orders from this much
  -- smaller set is far cheaper than counting distinct receipts line by line.
  order_slots as materialized (
    select day, hour, channel, order_ref from cur group by day, hour, channel, order_ref
  ),
  -- The same number of days immediately before, for "vs previous period".
  prev as (
    select amount, quantity, order_ref from public.sales
    where sold_at >= (p_from - (p_to - p_from + 1))::timestamptz
      and sold_at < p_from::timestamptz
      and (p_branch is null or branch_id = p_branch)
  ),
  -- Long ranges are grouped by week (over ~3 months) or month (over ~13 months)
  -- so the trend chart stays readable.
  trend_revenue as (
    select
      case when p_to - p_from > 400 then date_trunc('month', day)::date
           when p_to - p_from > 92 then date_trunc('week', day)::date
           else day
      end as period,
      sum(amount) as revenue
    from cur
    group by 1
  ),
  trend_orders as (
    select
      bucket as period,
      count(*) as orders
    from (select distinct
            case when p_to - p_from > 400 then date_trunc('month', day)::date
                 when p_to - p_from > 92 then date_trunc('week', day)::date
                 else day
            end as bucket, order_ref
          from order_slots) d
    group by bucket
  ),
  trend as (
    select r.period, r.revenue, o.orders
    from trend_revenue r join trend_orders o using (period)
  )
  select jsonb_build_object(
    'bucket', case when p_to - p_from > 400 then 'month'
                   when p_to - p_from > 92 then 'week' else 'day' end,
    -- Date of the earliest sale, so the app knows if a comparison is fair.
    'first_sale', (
      select (min(sold_at) at time zone 'UTC')::date from public.sales
      where p_branch is null or branch_id = p_branch),
    'current', (
      select jsonb_build_object(
        'revenue', coalesce(sum(amount), 0),
        'orders',  (select count(*) from (select distinct order_ref from order_slots) d),
        'items',   coalesce(sum(quantity), 0))
      from cur),
    'previous', (
      select jsonb_build_object(
        'revenue', coalesce(sum(amount), 0),
        'orders',  count(distinct order_ref),
        'items',   coalesce(sum(quantity), 0))
      from prev),
    'trend', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'period', period, 'revenue', revenue, 'orders', orders) order by period), '[]'::jsonb)
      from trend),
    'by_category', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', category, 'revenue', revenue) order by revenue desc), '[]'::jsonb)
      from (select category, sum(amount) as revenue from cur group by category) x),
    'by_branch', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', b.name, 'revenue', x.revenue) order by x.revenue desc), '[]'::jsonb)
      from (select branch_id, sum(amount) as revenue from cur group by branch_id) x
      join public.branches b on b.id = x.branch_id),
    'by_channel', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', channel, 'revenue', revenue, 'orders', orders) order by revenue desc), '[]'::jsonb)
      from (select r.channel, r.revenue, o.orders
            from (select channel, sum(amount) as revenue from cur group by channel) r
            join (select channel, count(*) as orders from (select distinct channel, order_ref from order_slots) d group by channel) o
              using (channel)) x),
    'by_hour', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'hour', hour, 'orders', orders) order by hour), '[]'::jsonb)
      from (select hour, count(*) as orders from (select distinct hour, order_ref from order_slots) d group by hour) x),
    'top_items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', item_name, 'category', category, 'quantity', quantity, 'revenue', revenue)
        order by revenue desc), '[]'::jsonb)
      from (select item_name, category, sum(quantity) as quantity, sum(amount) as revenue
            from cur group by item_name, category
            order by revenue desc limit 8) x)
  );
$$;

revoke execute on function public.sales_dashboard(date, date, uuid) from public, anon;
grant execute on function public.sales_dashboard(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Inventory (stage 3)
-- Stock on hand per branch: ingredients and supplies. An item is "low" when
-- its quantity is at or below its reorder level.
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  branch_id     uuid not null,
  name          text not null check (char_length(name) between 1 and 120),
  category      text not null check (char_length(category) between 1 and 60),
  unit          text not null check (unit in ('kg', 'g', 'L', 'ml', 'pcs', 'pack')),
  quantity      numeric(12, 2) not null default 0 check (quantity >= 0),
  reorder_level numeric(12, 2) not null default 0 check (reorder_level >= 0),
  unit_cost     numeric(10, 2) not null default 0 check (unit_cost >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- The same item can't be listed twice in one branch.
  unique (branch_id, name),
  foreign key (branch_id, restaurant_id)
    references public.branches (id, restaurant_id) on delete cascade
);

create index if not exists inventory_items_restaurant_idx on public.inventory_items (restaurant_id);

alter table public.inventory_items enable row level security;

drop policy if exists "Owners manage their inventory" on public.inventory_items;
drop policy if exists "Team can view inventory" on public.inventory_items;
create policy "Team can view inventory"
  on public.inventory_items for select to authenticated
  using (restaurant_id in (select public.my_restaurants('admin', 'finance', 'inventory')));

drop policy if exists "Team can change inventory" on public.inventory_items;
create policy "Team can change inventory"
  on public.inventory_items for all to authenticated
  using (restaurant_id in (select public.my_restaurants('admin', 'inventory')))
  with check (restaurant_id in (select public.my_restaurants('admin', 'inventory')));

-- ---------------------------------------------------------------------------
-- Expenses (stage 4)
-- Money going out: rent, wages, supplier invoices and so on. branch_id can be
-- empty for costs shared by the whole restaurant (e.g. marketing).
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  branch_id     uuid,
  spent_on      date not null,
  category      text not null check (category in (
                  'ingredients', 'wages', 'rent', 'utilities', 'delivery_fees',
                  'marketing', 'maintenance', 'other')),
  description   text not null check (char_length(description) between 1 and 200),
  amount        numeric(12, 2) not null check (amount > 0),
  created_at    timestamptz not null default now(),
  -- When a branch is set, it must belong to the same restaurant.
  foreign key (branch_id, restaurant_id)
    references public.branches (id, restaurant_id) on delete cascade
);

create index if not exists expenses_restaurant_spent_on_idx on public.expenses (restaurant_id, spent_on);

alter table public.expenses enable row level security;

drop policy if exists "Owners manage their expenses" on public.expenses;
drop policy if exists "Team can view expenses" on public.expenses;
create policy "Team can view expenses"
  on public.expenses for select to authenticated
  using (restaurant_id in (select public.my_restaurants('admin', 'finance')));

drop policy if exists "Team can change expenses" on public.expenses;
create policy "Team can change expenses"
  on public.expenses for all to authenticated
  using (restaurant_id in (select public.my_restaurants('admin', 'finance')))
  with check (restaurant_id in (select public.my_restaurants('admin', 'finance')));

drop policy if exists "HR can view wages" on public.expenses;
create policy "HR can view wages"
  on public.expenses for select to authenticated
  using (category = 'wages' and restaurant_id in (select public.my_restaurants('hr')));

-- ---------------------------------------------------------------------------
-- CSV imports (stage 5)
-- One row per uploaded file. Imported sales and expenses point back to it, so
-- deleting an import ("Undo") removes exactly the rows that file added.
-- ---------------------------------------------------------------------------
create table if not exists public.imports (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  kind          text not null check (kind in ('sales', 'expenses')),
  file_name     text not null check (char_length(file_name) between 1 and 255),
  row_count     integer not null default 0 check (row_count >= 0),
  created_at    timestamptz not null default now(),
  unique (id, restaurant_id)
);

alter table public.imports enable row level security;

drop policy if exists "Owners manage their imports" on public.imports;
drop policy if exists "Team manages imports by type" on public.imports;
create policy "Team manages imports by type"
  on public.imports for all to authenticated
  using (restaurant_id in (select public.my_restaurants('admin'))
    or (kind = 'sales' and restaurant_id in (select public.my_restaurants('sales')))
    or (kind = 'expenses' and restaurant_id in (select public.my_restaurants('finance'))))
  with check (restaurant_id in (select public.my_restaurants('admin'))
    or (kind = 'sales' and restaurant_id in (select public.my_restaurants('sales')))
    or (kind = 'expenses' and restaurant_id in (select public.my_restaurants('finance'))));

-- Link sales and expenses to the import that created them (empty for rows
-- added by hand or by the demo script). The import must belong to the same restaurant.
alter table public.sales add column if not exists import_id uuid;
alter table public.expenses add column if not exists import_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sales_import_fkey') then
    alter table public.sales add constraint sales_import_fkey
      foreign key (import_id, restaurant_id)
      references public.imports (id, restaurant_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'expenses_import_fkey') then
    alter table public.expenses add constraint expenses_import_fkey
      foreign key (import_id, restaurant_id)
      references public.imports (id, restaurant_id) on delete cascade;
  end if;
end;
$$;

create index if not exists sales_import_idx on public.sales (import_id) where import_id is not null;
create index if not exists expenses_import_idx on public.expenses (import_id) where import_id is not null;

-- ---------------------------------------------------------------------------
-- expense_summary(): expense totals for a period, added up in the database
-- (so it stays correct however many expenses there are). Stage 6.
-- p_branch = null means everything, including shared costs; with a branch,
-- shared costs are left out.
-- ---------------------------------------------------------------------------
create or replace function public.expense_summary(
  p_from   date,
  p_to     date,
  p_branch uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with cur as materialized (
    select amount, category, branch_id from public.expenses
    where spent_on between p_from and p_to
      and (p_branch is null or branch_id = p_branch)
  )
  select jsonb_build_object(
    'total', (select coalesce(sum(amount), 0) from cur),
    'count', (select count(*) from cur),
    'first_expense', (select min(spent_on) from public.expenses
                      where p_branch is null or branch_id = p_branch),
    'by_category', (
      select coalesce(jsonb_agg(jsonb_build_object('name', category, 'amount', amount)
                                order by amount desc), '[]'::jsonb)
      from (select category, sum(amount) as amount from cur group by category) x),
    'by_branch', (
      select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(b.name, 'Shared'), 'amount', x.amount)
                                order by x.amount desc), '[]'::jsonb)
      from (select branch_id, sum(amount) as amount from cur group by branch_id) x
      left join public.branches b on b.id = x.branch_id)
  );
$$;

revoke execute on function public.expense_summary(date, date, uuid) from public, anon;
grant execute on function public.expense_summary(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- monthly_report(): month-by-month profit & loss plus a branch comparison,
-- for the Reports page. Stage 6. Runs as the signed-in user (RLS applies).
-- ---------------------------------------------------------------------------
create or replace function public.monthly_report(
  p_from   date,
  p_to     date,
  p_branch uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  s as materialized (
    select amount, quantity, order_ref, category, item_name, branch_id,
           date_trunc('month', sold_at at time zone 'UTC')::date as month
    from public.sales
    where sold_at >= p_from::timestamptz and sold_at < (p_to + 1)::timestamptz
      and (p_branch is null or branch_id = p_branch)
  ),
  -- One row per order per month and branch, so counting orders stays cheap.
  order_slots as materialized (
    select month, branch_id, order_ref from s group by month, branch_id, order_ref
  ),
  e as materialized (
    select amount, category, branch_id, spent_on from public.expenses
    where spent_on between p_from and p_to
      and (p_branch is null or branch_id = p_branch)
  ),
  -- Every month in the period, even months with no data.
  months as (
    select m::date as month
    from generate_series(date_trunc('month', p_from::timestamp), p_to::timestamp, interval '1 month') m
  ),
  sales_by_month as (
    select r.month, r.revenue, o.orders
    from (select month, sum(amount) as revenue from s group by month) r
    join (select month, count(*) as orders from (select distinct month, order_ref from order_slots) d group by month) o using (month)
  ),
  expenses_by_month as (
    select date_trunc('month', spent_on)::date as month, category, sum(amount) as amount
    from e group by 1, 2
  )
  select jsonb_build_object(
    'months', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'month', m.month,
        'revenue', coalesce(sm.revenue, 0),
        'orders', coalesce(sm.orders, 0),
        'expenses', coalesce((select sum(amount) from expenses_by_month x where x.month = m.month), 0),
        'by_category', coalesce((select jsonb_object_agg(category, amount) from expenses_by_month x
                                 where x.month = m.month), '{}'::jsonb)
      ) order by m.month), '[]'::jsonb)
      from months m left join sales_by_month sm on sm.month = m.month),
    'branches', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', b.name,
        'revenue', coalesce(r.revenue, 0),
        'orders', coalesce(r.orders, 0),
        'expenses', coalesce(c.amount, 0)
      ) order by coalesce(r.revenue, 0) desc), '[]'::jsonb)
      from public.branches b
      left join (select x.branch_id, x.revenue, y.orders
                 from (select branch_id, sum(amount) as revenue from s group by branch_id) x
                 join (select branch_id, count(*) as orders from (select distinct branch_id, order_ref from order_slots) d group by branch_id) y
                   using (branch_id)) r on r.branch_id = b.id
      left join (select branch_id, sum(amount) as amount from e group by branch_id) c on c.branch_id = b.id
      where p_branch is null or b.id = p_branch),
    'shared_expenses', (select coalesce(sum(amount), 0) from e where branch_id is null),
    'top_items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', item_name, 'category', category, 'quantity', quantity, 'revenue', revenue)
        order by revenue desc), '[]'::jsonb)
      from (select item_name, category, sum(quantity) as quantity, sum(amount) as revenue
            from s group by item_name, category order by revenue desc limit 10) x)
  );
$$;

revoke execute on function public.monthly_report(date, date, uuid) from public, anon;
grant execute on function public.monthly_report(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Forecasting
-- demand_history(): units sold per menu item, branch and day, for the demand
-- and inventory forecasts. Runs as the signed-in user (RLS applies).
-- ---------------------------------------------------------------------------
create or replace function public.demand_history(
  p_from   date,
  p_to     date,
  p_branch uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'branch_id', branch_id, 'item', item_name, 'category', category, 'days', days)), '[]'::jsonb)
  from (
    select branch_id, item_name, category, jsonb_object_agg(day, qty) as days
    from (
      select branch_id, item_name, category,
             (sold_at at time zone 'UTC')::date as day, sum(quantity) as qty
      from public.sales
      where sold_at >= p_from::timestamptz and sold_at < (p_to + 1)::timestamptz
        and (p_branch is null or branch_id = p_branch)
      group by 1, 2, 3, 4
    ) d
    group by 1, 2, 3
  ) x;
$$;

revoke execute on function public.demand_history(date, date, uuid) from public, anon;
grant execute on function public.demand_history(date, date, uuid) to authenticated;

-- How much stock one sold menu item uses. Names are matched against sales and
-- stock items, so one recipe covers every branch.
create table if not exists public.recipe_lines (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  menu_item     text not null check (char_length(menu_item) between 1 and 120),
  stock_item    text not null check (char_length(stock_item) between 1 and 120),
  quantity      numeric(12, 3) not null check (quantity > 0),
  created_at    timestamptz not null default now(),
  unique (restaurant_id, menu_item, stock_item)
);

alter table public.recipe_lines enable row level security;

drop policy if exists "Owners manage their recipes" on public.recipe_lines;
drop policy if exists "Team can view recipes" on public.recipe_lines;
create policy "Team can view recipes"
  on public.recipe_lines for select to authenticated
  using (restaurant_id in (select public.my_restaurants('admin', 'finance', 'inventory')));

drop policy if exists "Team can change recipes" on public.recipe_lines;
create policy "Team can change recipes"
  on public.recipe_lines for all to authenticated
  using (restaurant_id in (select public.my_restaurants('admin', 'inventory')))
  with check (restaurant_id in (select public.my_restaurants('admin', 'inventory')));

-- ---------------------------------------------------------------------------
-- Sign-in lock: one minute after every 5 wrong passwords for the same email.
-- Row Level Security with no policies, and these functions are only open to the
-- server's secret key, so counters can't be read or reset from a browser.
-- ---------------------------------------------------------------------------
create table if not exists public.login_attempts (
  email_hash   text primary key,
  failures     integer not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.login_attempts enable row level security;
revoke all on table public.login_attempts from public, anon, authenticated;

create or replace function public.login_lock_seconds(p_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select ceil(extract(epoch from locked_until - now()))::integer
    from public.login_attempts
    where email_hash = p_key and locked_until > now()
  ), 0);
$$;

create or replace function public.record_login_failure(p_key text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_failures integer;
begin
  -- Mistakes older than a day don't count towards the next lock.
  insert into public.login_attempts as a (email_hash, failures, updated_at)
  values (p_key, 1, now())
  on conflict (email_hash) do update
    set failures = case when a.updated_at < now() - interval '1 day' then 1 else a.failures + 1 end,
        updated_at = now()
  returning a.failures into v_failures;

  if v_failures >= 5 then
    update public.login_attempts
      set failures = 0, locked_until = now() + interval '1 minute'
      where email_hash = p_key;
    return 60;
  end if;
  return 0;
end;
$$;

create or replace function public.clear_login_failures(p_key text)
returns integer
language sql
security definer
set search_path = ''
as $$
  delete from public.login_attempts where email_hash = p_key;
  select 0;
$$;

revoke execute on function public.login_lock_seconds(text) from public, anon, authenticated;
revoke execute on function public.record_login_failure(text) from public, anon, authenticated;
revoke execute on function public.clear_login_failures(text) from public, anon, authenticated;
grant execute on function public.login_lock_seconds(text) to service_role;
grant execute on function public.record_login_failure(text) to service_role;
grant execute on function public.clear_login_failures(text) to service_role;

-- Lets open dashboards hear about role changes and removals as they happen.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_members') then
    alter publication supabase_realtime add table public.team_members;
  end if;
end $$;

-- Tells Supabase's API to pick up the new tables straight away.
notify pgrst, 'reload schema';
