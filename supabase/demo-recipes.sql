-- Optional: recipes for the demo menu, so the inventory forecast has something
-- to work with. Run once in the SQL Editor after schema.sql and demo-data.sql.
-- Safe to re-run. Change the restaurant name below if yours is different.

insert into public.recipe_lines (restaurant_id, menu_item, stock_item, quantity)
select r.id, x.menu_item, x.stock_item, x.quantity
from public.restaurants r
cross join (values
  ('Classic Smash Burger', 'Beef patties', 1), ('Classic Smash Burger', 'Brioche buns', 1), ('Classic Smash Burger', 'Cheddar slices', 1),
  ('Classic Smash Burger', 'Lettuce', 0.02), ('Classic Smash Burger', 'Tomatoes', 0.03), ('Classic Smash Burger', 'House burger sauce', 0.02),
  ('Midnight Double', 'Beef patties', 2), ('Midnight Double', 'Brioche buns', 1), ('Midnight Double', 'Cheddar slices', 2),
  ('Midnight Double', 'Lettuce', 0.02), ('Midnight Double', 'House burger sauce', 0.03),
  ('Crispy Chicken Burger', 'Chicken breast', 0.15), ('Crispy Chicken Burger', 'Brioche buns', 1), ('Crispy Chicken Burger', 'Lettuce', 0.02),
  ('Crispy Chicken Burger', 'Frying oil', 0.03), ('Crispy Chicken Burger', 'House burger sauce', 0.02),
  ('Truffle Mushroom Burger', 'Beef patties', 1), ('Truffle Mushroom Burger', 'Brioche buns', 1), ('Truffle Mushroom Burger', 'Mushrooms', 0.06),
  ('Truffle Mushroom Burger', 'Truffle mayo', 0.02), ('Truffle Mushroom Burger', 'Cheddar slices', 1),
  ('Veggie Burger', 'Brioche buns', 1), ('Veggie Burger', 'Mushrooms', 0.05), ('Veggie Burger', 'Lettuce', 0.03),
  ('Veggie Burger', 'Tomatoes', 0.04), ('Veggie Burger', 'House burger sauce', 0.02),
  ('Fries', 'Potatoes', 0.25), ('Fries', 'Frying oil', 0.02),
  ('Loaded Fries', 'Potatoes', 0.3), ('Loaded Fries', 'Frying oil', 0.02), ('Loaded Fries', 'Cheddar slices', 2), ('Loaded Fries', 'Onions', 0.02),
  ('Onion Rings', 'Onions', 0.15), ('Onion Rings', 'Frying oil', 0.03),
  ('Chicken Wings (6)', 'Chicken wings', 0.35), ('Chicken Wings (6)', 'Frying oil', 0.03),
  ('Korean Chicken Bowl', 'Chicken breast', 0.15), ('Korean Chicken Bowl', 'Rice', 0.12), ('Korean Chicken Bowl', 'Kimchi', 0.05),
  ('Halloumi Grain Bowl', 'Halloumi', 0.1), ('Halloumi Grain Bowl', 'Rice', 0.12), ('Halloumi Grain Bowl', 'Tomatoes', 0.03), ('Halloumi Grain Bowl', 'Lettuce', 0.02),
  ('Chocolate Lava Cake', 'Dark chocolate', 0.05), ('Chocolate Lava Cake', 'Vanilla ice cream', 0.05),
  ('Vanilla Milkshake', 'Milk', 0.2), ('Vanilla Milkshake', 'Vanilla ice cream', 0.12),
  ('Soft Drink', 'Soft drink syrup', 0.03),
  ('Craft Lemonade', 'Lemons', 0.08),
  ('Iced Coffee', 'Coffee beans', 0.02), ('Iced Coffee', 'Milk', 0.1),
  ('Craft Beer', 'Craft beer', 1)
) as x(menu_item, stock_item, quantity)
where r.name = 'Midnight Bites'
on conflict (restaurant_id, menu_item, stock_item) do nothing;
