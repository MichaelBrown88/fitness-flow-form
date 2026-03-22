# SEO verification after deploy

Run these checks after deploying hosting so indexation and headers match the SEO foundation work.

1. **Google Search Console** — Add or open the `https://one-assess.com` property, complete domain or URL-prefix verification, then submit `https://one-assess.com/sitemap.xml`.

2. **URL Inspection** — In GSC, use URL Inspection on at least `/`, `/pricing`, and `/about`. Confirm Google can crawl them and that the reported canonical matches the page URL.

3. **Token client URLs** — Inspect a live `https://one-assess.com/r/{token}` URL (or use “Test live URL” in GSC). Confirm response headers include `X-Robots-Tag: noindex, nofollow`.

4. **robots.txt** — Open `https://one-assess.com/robots.txt` and confirm it returns 200 and includes the `Sitemap:` line.

5. **sitemap** — Open `https://one-assess.com/sitemap.xml` and confirm it lists only public marketing and legal URLs (no `/blog` until posts ship).
