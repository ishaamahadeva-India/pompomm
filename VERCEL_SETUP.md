# Vercel: fix 404 NOT_FOUND

This repo is a **monorepo**. The Next.js app is in the **`frontend`** folder.

**You must set Root Directory in Vercel, or you will get:**  
`404 NOT_FOUND Code: NOT_FOUND ID: bom1::...`

## Steps

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your **pompomm** project.
2. Go to **Settings**.
3. In the **left sidebar**, click **Build and Deployment** (or **Build and Development**) — **not** General. Root Directory is not under General.
4. On the Build and Deployment page, **scroll down** to **Root Directory**.
5. Click **Edit** and enter: **`frontend`** (only that word, no slash before/after).
6. Click **Save**.
7. Go to **Deployments** → open the **⋮** menu on the latest deployment → **Redeploy**.

After this, Vercel will run `npm install` and `next build` inside `frontend/` and the app will deploy correctly.

---

## If you see 404 on `/` or 401 in logs

- **URL like `pompomm-xxxxx-nishcals-projects.vercel.app`** — That’s a **preview** deployment (each has a unique subdomain). Previews use the same Root Directory setting; if they were built **before** you set Root Directory to `frontend`, they can 404. Use **Redeploy** on the latest deployment so it rebuilds with the correct root.
- **401** — Often from **Deployment Protection** (Settings → Deployment Protection). If “Vercel Authentication” is on for Preview (or Production), unauthenticated visitors get 401. Turn it off for Production if you want the site public, or leave it on only for Preview.
- **Production URL** — Your main live URL is usually `pompomm.vercel.app` or the domain you assigned. Test that one; preview URLs are for branches/PRs.
