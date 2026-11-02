# Arabic and English search content and indexing

Arabic is the default at the site root (`lang="ar"`, `dir="rtl"`), under the name رتّب واطبع. English is available at `/en/` (`lang="en"`, `dir="ltr"`) as Arrange & Print. Each page links to its matching translation. Owner documentation remains outside the deployment package.

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

The real configured origin is https://arrange-print.pages.dev. The sitemap includes 26 normal pages across both languages; both 404 pages are noindex and excluded. Each indexable page has its own canonical and reciprocal ar/en hreflang links, with Arabic as x-default. The sitemap also includes alternate-language links. robots.txt points to the sitemap. Contact email is rendered into built HTML so it does not require JavaScript to be read.

## After deployment

1. Confirm Cloudflare has deployed the latest `main` commit and serves `dist` as static assets. A GitHub push alone is not evidence that a manual Cloudflare deployment updated.
2. Open the home page, each tool, `/robots.txt` and `/sitemap.xml` on the public site. Verify downloads on a phone as well as desktop.
3. Add the HTTPS URL-prefix property in Google Search Console using your Google account. If you choose HTML-file verification, provide Google's actual verification file; do not invent a verification token. Submit `/sitemap.xml` after ownership is verified, and inspect the home and tool URLs.
4. Allow time for crawling. Indexing, ranking, traffic and AdSense approval are not guaranteed. This work did not verify Search Console ownership, submit a sitemap to Google or activate advertisements.

AdSense is enabled on the home page and informational pages, after the owner reported the site ready and the Google consent message published. The three image tools, both ruler pages and error pages do not load advertising scripts. Verification metadata and ads.txt retain the real publisher ID. Local tests stub the official Google script and do not verify real ad delivery, Google approval or live consent behavior. See DEPLOY_AR.md for live checks and rollback.

Arabic search topics include ترتيب الصور للطباعة، طباعة عدة صور على ورقة A4، طباعة صورة بمقاس محدد بالسنتيمتر، تقسيم صورة إلى بوستر، واختبار مسطرة 10 سم. They appear in relevant Arabic titles and explanations rather than hidden keyword lists. English topics in the table above belong to the English versions.


## Image editing and clearer tool pages

Tools now include a local crop/rotate/flip/pixel-resize editor with PNG download. Photo layout supports individual physical frame sizes; the exact-size tool has print presets and linked dimensions; poster output supports full-image containment. Short, accurate guides remain in HTML under expandable sections, with detailed printing guides retained separately. The static advertisement placeholder is hidden so it does not look like an empty ad; the official Auto ads script and publisher configuration on informational pages are unchanged. Existing canonical, alternate-language, sitemap and structured data are retained.
