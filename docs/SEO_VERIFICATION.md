# SEO verification after deploy

Run these checks after deploying hosting so indexation and headers match the SEO foundation work.

1. **Google Search Console** — Add or open the `https://one-assess.com` property, complete domain or URL-prefix verification, then submit `https://one-assess.com/sitemap.xml`.

2. **URL Inspection** — In GSC, use URL Inspection on at least `/`, `/pricing`, and `/about`. Confirm Google can crawl them and that the reported canonical matches the page URL.

3. **Token client URLs** — Inspect a live `https://one-assess.com/r/{token}` URL (or use “Test live URL” in GSC). Confirm response headers include `X-Robots-Tag: noindex, nofollow`.

4. **robots.txt** — Open `https://one-assess.com/robots.txt` and confirm it returns 200 and includes the `Sitemap:` line.

5. **sitemap** — Open `https://one-assess.com/sitemap.xml` and confirm it lists only public marketing and legal URLs (no `/blog` until posts ship).

---

## Ongoing: Search Console iteration

Every month or quarter, in Google Search Console:

- Review **Queries** and **Pages** with high **impressions** but low **CTR**; rewrite `title` / `description` for that path in [`src/constants/seo.ts`](../src/constants/seo.ts), then redeploy.
- When a URL starts earning impressions for new terms, check that the **visible H1 and opening copy** on that page still match the promise in the meta (especially `/` and `/pricing`).

Keep [`index.html`](../index.html) **static** `<title>` and `<meta name="description">` aligned with `SEO_INDEXABLE_BY_PATH[ROUTES.HOME]` (see HTML comment in the file).

---

## When the blog goes live

While [`src/pages/Blog.tsx`](../src/pages/Blog.tsx) is thin or placeholder, it stays **`noindex`** and `/blog` stays **out** of the sitemap.

When you ship real posts:

1. Remove **`noindex`** from the Blog page `Seo` usage (or set `noindex={false}` with real meta from `seo.ts`).
2. Add **`/blog`** to **`PUBLIC_SITEMAP_PATHS`** in [`src/constants/seo.ts`](../src/constants/seo.ts) and add a `<url>` for `/blog` in [`public/sitemap.xml`](../public/sitemap.xml).
3. In [`firebase.json`](../firebase.json), **remove** the hosting header rule that sets `X-Robots-Tag: noindex, nofollow` for `/blog` (if you want the hub indexed).
4. Optionally add per-post routes to the sitemap when you have a post detail URL pattern.

---

## Off-site (not in repo)

- Claim or update **G2**, **Capterra**, **GetApp**, etc. with the same **brand name**, **https://one-assess.com**, and **coach/gym fitness assessment** positioning so listings match on-page copy.
