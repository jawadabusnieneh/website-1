# English search content and indexing

The public site is now English (`lang="en"`, `dir="ltr"`) under the brand Arrange & Print. The Arabic owner documentation remains outside the deployment package.

## Search intent covered by each page

| Page | Main search topic | Supporting topics |
| --- | --- | --- |
| Home | Free photo printing tools | Home printing, printable photo PDF, private browser processing |
| Photo layout | Print multiple photos on one page | A4 and Letter photo grid, duplicate photos, picture layout PDF |
| Exact size | Print a photo at an exact size | Centimeters, millimeters, fit versus crop, actual-size PDF |
| Poster maker | Print a poster on multiple pages | Tiled poster maker, split image across pages, overlap, cut marks |
| Actual-size guide | How to print at 100% scale | Fit to page, printer margins, actual print dimensions |
| Resolution guide | Photo resolution for printing | PPI, pixels, enlargement, image quality |
| Assembly guide | Assemble a multi-page poster | Align sheets, overlap, trim and tape |
| Ruler | Printable 10 cm ruler | 100 mm print scale test |

These phrases are used naturally in relevant page titles, headings, descriptions and visible HTML explanations. There is no hidden keyword list, duplicate landing-page set or `meta keywords` tag: Google does not use that tag for web search ranking. No search-volume research or ranking claims are implied.

Each page has its own title and description. Build output includes canonical URLs, Open Graph and Twitter summary metadata. Indexable pages include WebSite and WebPage JSON-LD; the three tools also describe a free WebApplication. No fabricated reviews, ratings, author identities or search actions are included. Structured data does not guarantee rich results.

The real configured origin is https://arrange-print.pages.dev. The sitemap includes the 13 normal pages; 404 is noindex and excluded. robots.txt points to the sitemap. Contact email is rendered into built HTML so it does not require JavaScript to be read.

## After deployment

1. Confirm Cloudflare has deployed the latest `main` commit and serves `dist` as static assets. A GitHub push alone is not evidence that a manual Cloudflare deployment updated.
2. Open the home page, each tool, `/robots.txt` and `/sitemap.xml` on the public site. Verify downloads on a phone as well as desktop.
3. Add the HTTPS URL-prefix property in Google Search Console using your Google account. If you choose HTML-file verification, provide Google's actual verification file; do not invent a verification token. Submit `/sitemap.xml` after ownership is verified, and inspect the home and tool URLs.
4. Allow time for crawling. Indexing, ranking, traffic and AdSense approval are not guaranteed. This work did not verify Search Console ownership, submit a sitemap to Google or activate advertisements.

AdSense remains disabled. Follow DEPLOY_AR.md for actual publisher credentials, consent and privacy requirements before enabling it.
