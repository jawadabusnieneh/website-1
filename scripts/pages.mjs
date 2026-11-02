import './pages-ar.mjs';
import './pages-en.mjs';
import fs from 'node:fs';
for (const lang of ['ar', 'en']) {
  const dir = lang === 'en' ? 'src/en' : 'src';
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.html'))) {
    let html = fs.readFileSync(`${dir}/${file}`, 'utf8');
    const target = lang === 'en' ? `../${file}` : `en/${file}`;
    const label = lang === 'en' ? 'العربية' : 'English';
    const switcher = `<a class="language-switch" href="${target}" hreflang="${lang === 'en' ? 'ar' : 'en'}" lang="${lang === 'en' ? 'ar' : 'en'}" aria-label="${lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}">${label}</a>`;
    html = html.replace('</nav></div></header>', `${switcher}</nav></div></header>`);
    if (lang === 'en') html = html.replaceAll('href="assets/', 'href="../assets/').replaceAll('src="assets/', 'src="../assets/');
    fs.writeFileSync(`${dir}/${file}`, html);
  }
}
console.log('Generated Arabic and English pages with matching language links');
