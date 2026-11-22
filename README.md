# KaonGO — Home & Menu Upgrade

A plain HTML, one-CSS-file, and vanilla JavaScript campus food-ordering app based on the KaonGO Figma prototype. It uses Supabase for authentication, product data, profiles, and orders.

## What's new in this version

- A redesigned home dashboard with a personalized greeting, stronger campus-food hero section, category shortcuts, motivational student note, and campus-favorites carousel.
- Nine menu items across Meals, Snacks, and Drinks.
- Nine locally stored food photos in `assets/`; the app does not depend on remote food-image URLs.
- Updated KaonGO logo using the uploaded orange serving-cloche icon in the loading, authentication, and home header screens.
- Product photos on menu cards, product details, and checkout summaries.
- A live popularity counter in Supabase. Every ordered quantity increments the product's `total_sold`, and the home screen sorts products by that count once sales data exists. Before there are orders, the home page clearly labels its suggestions as starter picks instead of claiming they are bestsellers.
- Search and an All / Meals / Snacks / Drinks filter.
- The project still has exactly one CSS file: `style.css`.

## Project structure

```text
KaonGO-Home-Upgrade/
├── index.html
├── style.css
├── app.js
├── supabase-schema.sql
├── README.md
└── assets/
    ├── chicken-rice.webp
    ├── beef-tapa-rice.webp
    ├── chicken-adobo-rice.webp
    ├── tuna-sandwich.webp
    ├── siomai.webp
    ├── fries.webp
    ├── iced-lemon-tea.webp
    ├── iced-coffee.webp
    └── mango-shake.webp
```

Keep the `assets` folder beside `index.html`, `style.css`, and `app.js`. Do not move the images out of that folder.

## Step 1 — Open in VS Code

1. Download and extract the ZIP.
2. In VS Code, choose **File → Open Folder** and select `KaonGO-Home-Upgrade`.
3. Make sure the Explorer shows `index.html`, `style.css`, `app.js`, `supabase-schema.sql`, and the `assets` folder.
4. Open `index.html` and click **Go Live** using the Live Server extension.

Do not open the HTML by double-clicking it as a `file:///` URL. Use Live Server.

## Step 2 — Update your existing Supabase database

This upgrade adds `image_url` and `total_sold` fields to `products`, makes all nine menu items available, and adds a database trigger to count ordered quantities.

**For your existing KaonGO project, run only the upgrade script:**

1. Open your existing KaonGO Supabase project.
2. Go to **SQL Editor → New query**.
3. Open `supabase-home-menu-upgrade.sql` from this project in VS Code.
4. Copy the entire file and paste it into the Supabase SQL Editor.
5. Click **Run**.

This focused migration does not recreate your authentication, profiles, or order tables. It uses `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`, and product upserts, so it can be run again. Existing `total_sold` counts are not reset.

**For a brand-new Supabase project only**, run the complete `supabase-schema.sql` instead of the upgrade script.

After the upgrade runs, open **Table Editor → products** and confirm these nine items exist:

| Product | Category | Price |
|---|---|---:|
| Chicken Rice | Meals | PHP 65 |
| Beef Tapa Rice | Meals | PHP 85 |
| Chicken Adobo Rice | Meals | PHP 75 |
| Tuna Sandwich | Snacks | PHP 45 |
| Pork Siomai (6 pcs) | Snacks | PHP 40 |
| Classic Fries | Snacks | PHP 35 |
| Iced Lemon Tea | Drinks | PHP 30 |
| Iced Coffee | Drinks | PHP 45 |
| Mango Shake | Drinks | PHP 55 |

## Step 3 — Check your Supabase connection

Your Project URL and Publishable key have already been entered at the top of `app.js` based on the values supplied during setup. Keep the `sb_publishable_...` key there; never paste a Supabase secret or service-role key into browser code.

The code loads the Supabase browser library from jsDelivr in `index.html`, so Live Server needs an internet connection.

## Step 4 — Keep account confirmation disabled for your current test setup

You asked for users to enter KaonGO immediately after signup. In Supabase, go to **Authentication → Sign In / Providers → Email** and keep **Confirm Email** turned off. Keep **Allow new users to sign up** turned on. With email confirmation disabled, Supabase can return a signed-in session from account creation. Re-enable verification before a public launch if you need to verify that users own their email addresses.

## Step 5 — Test the home and menu screens

1. Refresh the Live Server browser tab with **Ctrl + Shift + R**.
2. Log in to KaonGO.
3. The Home tab should display the redesigned dashboard.
4. Try the category shortcuts and the **See all** link.
5. Open Menu and try All, Meals, Snacks, Drinks, and search.
6. Open a food item to see its larger photo, description, and quantity selector.
7. Add it to cart and check the photo in the checkout summary.
8. Place a test order. The database trigger increments `products.total_sold` by the ordered quantity. Refresh Home to see real order counts used for the favorites ranking.

## Notes

- The menu prices and stalls are sample content for the prototype. Confirm them with the real campus stalls before launch.
- The photos are generated sample food imagery, not verified photos from the actual stalls.
- `total_sold` counts quantities submitted in KaonGO orders. A separate staff workflow should be added before treating these counts as completed/paid sales, because this starter does not yet decrement the count when an order is cancelled.
- E-wallet selection is recorded, but this starter does not process GCash or Maya payments.
- Row-level security remains enabled for customer profiles and orders. Products are readable to visitors so they can browse the menu.

## Troubleshooting

**The menu only shows the original three products or displays no photos:** Run the updated `supabase-schema.sql` in your existing Supabase project, then refresh Live Server. Keep the `assets` folder in the same project folder as `index.html`.

**Images are broken:** Check that the folder name is exactly `assets` and that all nine `.webp` files are inside it.

**The console says a column `image_url` or `total_sold` does not exist:** The updated SQL has not been run against the Supabase project connected in `app.js`.

**Home says student picks instead of most ordered:** That is expected until one or more orders have been submitted. The section switches to actual order counts after the first order.
