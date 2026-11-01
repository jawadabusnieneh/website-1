import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const config = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
if (config.siteUrl) {
  const url = new URL(config.siteUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw Error('siteUrl must be a real HTTPS URL without query or fragment');
  }
  config.siteUrl = url.origin + url.pathname.replace(/\/$/, '');
}
if (config.email && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(config.email)) {
  throw Error('Enter a valid public contact email address');
}
if (config.adsensePublisherId && !/^ca-pub-\d{16}$/.test(config.adsensePublisherId)) {
  throw Error('Invalid AdSense publisher ID');
}
if (config.adsEnabled && (!config.adsensePublisherId || !config.siteUrl)) {
  throw Error('Real site URL and publisher ID required');
}
fs.rmSync('dist', {recursive: true, force: true});
fs.cpSync('src', 'dist', {recursive: true});
fs.mkdirSync('dist/assets/vendor', {recursive: true});
fs.copyFileSync('node_modules/pdf-lib/dist/pdf-lib.min.js', 'dist/assets/vendor/pdf-lib.min.js');
fs.copyFileSync('node_modules/pdf-lib/LICENSE.md', 'dist/assets/vendor/pdf-lib-LICENSE.txt');
const licenses = ['pdf-lib', '@pdf-lib/standard-fonts', '@pdf-lib/upng', 'pako', 'tslib'];
let notices = 'Local pdf-lib 1.17.1 and bundled dependency licenses\n';
for (const dependency of licenses) {
  const base = 'node_modules/' + dependency;
  const file = fs.readdirSync(base).find(name => /^licen[cs]e/i.test(name));
  if (!file) throw Error('Missing license: ' + dependency);
  notices += '\n\n== ' + dependency + ' ==\n' + fs.readFileSync(path.join(base, file), 'utf8').replaceAll('\r\n', '\n');
}
fs.writeFileSync('dist/assets/vendor/THIRD_PARTY_NOTICES.txt', notices);
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
fs.writeFileSync('dist/assets/config.js', 'window.SITE_CONFIG = ' + json({siteName: config.siteName, email: config.email}) + ';');
const htmlFiles = fs.readdirSync('dist').filter(name => name.endsWith('.html'));
const urlFor = file => config.siteUrl + '/' + (file === 'index.html' ? '' : file);
const toolFeatures = {
  'arrange.html': ['Multiple photos on A4 or Letter', 'Reorder and duplicate images', 'Photo grid PDF download'],
  'size.html': ['Photo dimensions in centimeters or millimeters', 'Fit or center crop without stretching', 'Actual-size PDF download'],
  'poster.html': ['Multi-page tiled posters', 'Assembly overlap and cut marks', 'Numbered PDF pages'],
};
for (const file of htmlFiles) {
  let html = fs.readFileSync('dist/' + file, 'utf8').replaceAll('Arrange &amp; Print', escape(config.siteName));
  const title = html.match(/<title>(.*?)<\/title>/s)[1];
  const description = html.match(/<meta name="description" content="([^"]*)">/)[1];
  let head = `<meta property="og:type" content="website"><meta property="og:locale" content="en_US"><meta property="og:site_name" content="${escape(config.siteName)}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}">`;
  if (config.siteUrl && file !== '404.html') {
    const url = urlFor(file);
    head += `<link rel="canonical" href="${escape(url)}"><meta property="og:url" content="${escape(url)}">`;
    const websiteId = config.siteUrl + '/#website';
    const graph = [
      {'@type': 'WebSite', '@id': websiteId, name: config.siteName, url: config.siteUrl + '/', inLanguage: 'en'},
      {'@type': 'WebPage', '@id': url + '#webpage', url, name: title.replaceAll('&amp;', '&'), description: description.replaceAll('&amp;', '&'), inLanguage: 'en', isPartOf: {'@id': websiteId}, ...(toolFeatures[file] ? {mainEntity: {'@id': url + '#tool'}} : {})},
    ];
    if (toolFeatures[file]) graph.push({
      '@type': 'WebApplication', '@id': url + '#tool', name: title.replaceAll('&amp;', '&'), url,
      description: description.replaceAll('&amp;', '&'), inLanguage: 'en', applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any', browserRequirements: 'Requires a modern browser with JavaScript, Canvas and Web Workers',
      isAccessibleForFree: true, featureList: toolFeatures[file],
    });
    head += `<script type="application/ld+json">${json({'@context': 'https://schema.org', '@graph': graph})}</script>`;
  }
  if (!config.siteUrl || file === '404.html') head += '<meta name="robots" content="noindex,follow">';
  if (config.adsEnabled && file !== 'ruler.html') {
    head += `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsensePublisherId}" crossorigin="anonymous"></script>`;
  }
  html = html.replace('<!-- SITE_HEAD -->', head);
  if (file === 'contact.html' && config.email) {
    html = html.replace('Email contact has not been configured yet.', `<a href="mailto:${escape(config.email)}">${escape(config.email)}</a>`);
  }
  if (config.adsEnabled) html = html.replace('Reserved ad space · Advertising is currently disabled', 'Reserved ad space');
  fs.writeFileSync('dist/' + file, html);
}
if (config.siteUrl) {
  const entries = htmlFiles.filter(file => file !== '404.html').map(file => `<url><loc>${escape(urlFor(file))}</loc></url>`);
  fs.writeFileSync('dist/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + entries.join('') + '</urlset>');
  fs.writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${config.siteUrl}/sitemap.xml\n`);
} else {
  fs.writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n');
  console.log('No real URL: canonical and sitemap omitted, indexing disabled until configuration.');
}
if (config.adsEnabled) fs.writeFileSync('dist/ads.txt', `google.com, ${config.adsensePublisherId.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file); else files.push(file);
  }
}
walk('dist');
if (files.length >= 1000 || files.some(file => fs.statSync(file).size >= 25 * 1024 * 1024)) throw Error('Cloudflare upload limits exceeded');
fs.rmSync('ratteb-print-deploy.zip', {force: true});
execFileSync('python3', ['-c', `import zipfile,pathlib\nwith zipfile.ZipFile('ratteb-print-deploy.zip','w',zipfile.ZIP_DEFLATED) as z:\n for f in pathlib.Path('dist').rglob('*'):\n  if f.is_file(): z.write(f,f.relative_to('dist'))`]);
console.log(`Built ${files.length} files and deployment ZIP.`);
