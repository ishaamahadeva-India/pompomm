# Admin dashboard

## URL

- **Local:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Production:** `https://your-domain.com/admin`

## Who can see it

Only users with **role = admin** can access the admin section. If you are logged in as a normal user, the app will redirect you away from `/admin`.

## How to get admin access

1. Log in once with your mobile number so your user row exists.
2. In your PostgreSQL database, set your user to admin:

```sql
UPDATE users SET role = 'admin' WHERE mobile_number = '+91XXXXXXXXXX';
```

Replace `+91XXXXXXXXXX` with your full mobile number (e.g. `+917330333743`).

3. Log out and log in again (or refresh). The **Admin** link will appear in the header and you can open the dashboard.

## What’s in the admin dashboard

- **Overview** – Total users, subscriptions, campaigns, views, revenue, fraud events.
- **Campaigns** – List and manage campaigns.
- **Distribution** – Create and manage distribution campaigns; view creator stats; approve/hold payouts; export CSV.
- **Users** – List users; suspend if needed.
- **Fraud** – Recent fraud log entries.
