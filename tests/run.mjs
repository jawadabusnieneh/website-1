import {chromium} from '@playwright/test';import {PDFDocument,PDFName,PDFRawStream,decodePDFRawStream} from 'pdf-lib';import fs from 'node:fs';import assert from 'node:assert/strict';import http from 'node:http';import path from 'node:path';import {layout,PT} from '../src/assets/layout.js';
fs.mkdirSync('test-results',{recursive:true});let checks=0;const ok=(condition,msg)=>{assert.ok(condition,msg);checks++;console.log('PASS '+msg)};
const server=http.createServer((req,res)=>{const target=path.resolve('dist','.'+decodeURIComponent(req.url.split('?')[0].endsWith('/')?req.url.split('?')[0]+'index.html':req.url.split('?')[0]));if(!target.startsWith(path.resolve('dist')+path.sep)){res.writeHead(403).end();return}try{res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(target))}catch{res.writeHead(404).end()}});await new Promise(r=>server.listen(8091,'127.0.0.1',r));let browser;
try{
browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({acceptDownloads:true});page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));let remote=0;page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8091')&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))remote++});
await page.goto('http://127.0.0.1:8091');const fixtures=await page.evaluate(()=>{const make=(w,h,color,format='image/png')=>{let c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,w,h);x.clearRect(0,0,10,10);return c.toDataURL(format).split(',')[1]};return {red:make(600,400,'#f00'),blue:make(400,600,'#00f'),webp:make(400,400,'#0f0','image/webp'),jpg:make(300,200,'#f0f','image/jpeg')}});
const file=(name,key='red',mimeType='image/png')=>({name,mimeType,buffer:Buffer.from(fixtures[key],'base64')});
const siteConfig=JSON.parse(fs.readFileSync('site.config.json','utf8'));
const titles=new Set(),descriptions=new Set();
for(const f of ['','en/'].flatMap(prefix=>fs.readdirSync('dist/'+prefix).filter(x=>x.endsWith('.html')).map(x=>prefix+x))){
 const baseFile=f.split('/').pop(),lang=f.startsWith('en/')?'en':'ar';
 await page.goto('http://127.0.0.1:8091/'+f);
 const title=await page.title(),description=await page.locator('meta[name="description"]').getAttribute('content');
 ok(title.length>10,'title '+f);
 assert(!titles.has(title)&&!descriptions.has(description),'unique metadata '+f);titles.add(title);descriptions.add(description);
 ok(await page.locator('html').getAttribute('lang')===lang&&await page.locator('html').getAttribute('dir')===(lang==='ar'?'rtl':'ltr')&&(/[\p{Script=Arabic}]/u.test(await page.locator('body').evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('.language-switch').forEach(e=>e.remove());return copy.textContent}))===(lang==='ar')),'localized language and direction '+f);
 assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'),title);
 assert.equal(await page.locator('meta[property="og:description"]').getAttribute('content'),description);
 assert.equal(await page.locator('meta[name="twitter:description"]').getAttribute('content'),description);
 if(baseFile!=='404.html'){
   const canonical=siteConfig.siteUrl+'/'+(f==='index.html'?'':f==='en/index.html'?'en/':f);
   assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),canonical);
   const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
   assert(graph['@graph'].some(x=>x['@type']==='WebPage'&&x.url===canonical&&x.inLanguage===lang));
   if(['arrange.html','size.html','poster.html'].includes(baseFile))assert(graph['@graph'].some(x=>x['@type']==='WebApplication'&&x.isAccessibleForFree===true));
 }else assert((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
 ok(true,'canonical, social metadata and structured data '+f);
 if(siteConfig.adsensePublisherId){
   const tag=page.locator('meta[name="google-adsense-account"]');
   if(baseFile==='ruler.html')assert.equal(await tag.count(),0);
   else{assert.equal(await tag.count(),1);assert.equal(await tag.getAttribute('content'),siteConfig.adsensePublisherId)}
   if(!siteConfig.adsEnabled)assert.equal(await page.locator('script[src*="pagead2.googlesyndication.com"]').count(),0);
   ok(true,'publisher verification without advertising on '+f);
 }

 const links=await page.locator('a[href]').evaluateAll(as=>as.map(a=>a.getAttribute('href')).filter(x=>!x.startsWith('http')&&!x.startsWith('#')&&!x.startsWith('mailto:')));
 for(const href of links)assert.ok(fs.existsSync(path.join('dist',path.dirname(f),href)),`${f} -> ${href}`);
 if(baseFile==='contact.html')ok(await page.getByRole('link',{name:siteConfig.email,exact:true}).getAttribute('href')==='mailto:'+siteConfig.email,'configured email is accessible in contact page');
 if(baseFile!=='404.html'){
  for(const [code,target]of [['ar',baseFile],['en','en/'+baseFile],['x-default',baseFile]]){
   const url=siteConfig.siteUrl+'/'+(target==='index.html'?'':target==='en/index.html'?'en/':target);
   assert.equal(await page.locator(`link[rel="alternate"][hreflang="${code}"]`).getAttribute('href'),url);
  }
  ok(true,'matching Arabic/English hreflang '+f);
 }
 const switchLink=page.locator('.language-switch');
 assert.equal(await switchLink.getAttribute('hreflang'),lang==='ar'?'en':'ar');
 ok(await switchLink.count()===1,'language switch available on '+f);
 if(baseFile==='index.html')await page.screenshot({path:`test-results/desktop-home-${lang}.png`,fullPage:true});
}
checks++;console.log('PASS all local links');
if(siteConfig.adsensePublisherId)ok(fs.readFileSync('dist/ads.txt','utf8')===`google.com, ${siteConfig.adsensePublisherId.replace('ca-','')}, DIRECT, f08c47fec0942fa0\n`,'ads.txt contains the real publisher record');
ok(titles.size===28&&descriptions.size===28,'all page titles and descriptions are unique');
const sitemap=fs.readFileSync('dist/sitemap.xml','utf8');
ok((sitemap.match(/<loc>/g)||[]).length===26&&sitemap.includes(siteConfig.siteUrl+'/')&&fs.readFileSync('dist/robots.txt','utf8').includes(siteConfig.siteUrl+'/sitemap.xml'),'sitemap and robots reference the configured live domain');
for(const [file,phrase]of [['en/arrange.html','print multiple photos on one page'],['en/size.html','print a photo at'],['en/poster.html','print a poster on multiple pages']])ok(fs.readFileSync('dist/'+file,'utf8').toLowerCase().includes(phrase),'search intent covered in '+file);

await page.goto('http://127.0.0.1:8091/en/arrange.html');await page.locator('#files').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await page.waitForFunction(()=>document.querySelector('#status').classList.contains('error'));ok((await page.locator('.sheet').count())===0,'corrupt file rejected visibly');
await page.locator('#files').setInputFiles([file('red.png'),file('blue.png','blue'),file('green.webp','webp','image/webp'),file('pink.jpg','jpg','image/jpeg')]);await page.waitForFunction(()=>document.querySelectorAll('.photo').length===4);ok(await page.locator('.sheet').count()===1,'JPG PNG WebP decoded and previewed');
await page.locator('.photo').first().getByRole('button',{name:'↓ Move down'}).click();ok((await page.locator('.photo .name').first().textContent()).includes('blue.png'),'keyboard-accessible move button changes order');
await page.locator('.photo').nth(1).dragTo(page.locator('.photo').first(),{sourcePosition:{x:10,y:10},targetPosition:{x:10,y:10}});ok((await page.locator('.photo .name').first().textContent()).includes('red.png'),'drag and drop changes order');await page.locator('.photo').first().getByRole('button',{name:'Duplicate',exact:true}).click();ok(await page.locator('.photo').count()===5,'duplicate creates image');await page.locator('.photo input').first().fill('4');await page.locator('.photo input').first().dispatchEvent('change');await page.waitForFunction(()=>document.querySelectorAll('.sheet').length===2);ok(true,'copies produce all-page preview');
async function exportPDF(name){const dl=page.waitForEvent('download');await page.locator('#download').click();const d=await dl;const dest='test-results/'+name+'.pdf';await d.saveAs(dest);return await PDFDocument.load(fs.readFileSync(dest))}
function streams(doc){return doc.getPages().map(p=>{let c=p.node.Contents();const arr=c?.asArray?c.asArray():[c];return arr.map(ref=>{const st=doc.context.lookup(ref);return st instanceof PDFRawStream?Buffer.from(decodePDFRawStream(st).decode()).toString('latin1'):''}).join('\n')})}
function dimensions(doc,w,h,n,tolerance=.001){ok(doc.getPageCount()===n,'PDF page count '+n);for(const p of doc.getPages()){assert.ok(Math.abs(p.getWidth()-w*PT)<tolerance);assert.ok(Math.abs(p.getHeight()-h*PT)<tolerance)}ok(true,'PDF media boxes '+w+'×'+h+'mm')}
function clips(doc,w,h,margin){let count=0;for(const s of streams(doc)){for(const m of s.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re\s+W/g)){const [x,y,cw,ch]=m.slice(1).map(Number);assert.ok(x>=margin*PT-.01&&y>=margin*PT-.01&&x+cw<=(w-margin)*PT+.01&&y+ch<=(h-margin)*PT+.01);count++}}ok(count>0,'actual PDF clip rectangles remain inside margins')}
let doc=await exportPDF('arrange-a4');ok(doc.context.enumerateIndirectObjects().some(([,obj])=>obj instanceof PDFRawStream&&obj.dict.has(PDFName.of('SMask'))),'PNG transparency preserved as PDF soft mask');dimensions(doc,210,297,2);clips(doc,210,297,10);
await page.locator('#paper').selectOption('letter');await page.locator('#landscape').check();doc=await exportPDF('arrange-letter');dimensions(doc,279.4,215.9,2);clips(doc,279.4,215.9,10);
await page.locator('#cols').fill('1');await page.locator('#rows').fill('1');await page.locator('.photo input').first().fill('30');await page.locator('.photo input').first().dispatchEvent('change');await page.locator('#rows').dispatchEvent('change');ok(await page.locator('#download').isDisabled(),'more than 30 pages blocked');await page.locator('#cols').fill('2');await page.locator('#rows').fill('3');await page.locator('.photo input').first().fill('4');await page.locator('.photo input').first().dispatchEvent('change');await page.locator('#rows').dispatchEvent('change');await page.locator('#remember').check();ok(await page.evaluate(()=>!!localStorage.getItem('ratteb-preferences')),'optional preferences saved');await page.locator('#clear-preferences').click();ok(await page.evaluate(()=>!localStorage.getItem('ratteb-preferences')),'preferences clear');
await page.goto('http://127.0.0.1:8091/en/size.html');await page.locator('#files').setInputFiles('tests/fixtures/phone-orientation-6.jpg');await page.waitForFunction(()=>document.querySelector('.photo .name')?.textContent.includes('40×80'));ok(true,'phone EXIF orientation 6 yields upright 40×80 image');await page.locator('#files').setInputFiles(file('red.png'));await page.waitForFunction(()=>document.querySelectorAll('.sheet').length===1);await page.locator('#width').fill('10');await page.locator('#height').fill('15');await page.locator('#height').dispatchEvent('change');doc=await exportPDF('size-contain');dimensions(doc,210,297,1);clips(doc,210,297,10);
let s=streams(doc)[0];const nums=[...s.matchAll(/([\d.]+) 0 0 ([\d.]+) 0 0 cm/g)].map(m=>m.slice(1).map(Number));ok(nums.some(([w,h])=>Math.abs(w-100*PT)<.01&&Math.abs(h-(100/1.5)*PT)<.01),'contain PDF image 100×66.667mm within 100×150mm frame');
await page.locator('#fit').selectOption('cover');doc=await exportPDF('size-cover');s=streams(doc)[0];ok([...s.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re/g)].some(m=>Math.abs(+m[3]-100*PT)<.01&&Math.abs(+m[4]-150*PT)<.01),'cover crop frame exactly 100×150mm');
await page.locator('#unit').selectOption('mm');await page.locator('#width').fill('100');await page.locator('#height').fill('150');await page.locator('#height').dispatchEvent('change');doc=await exportPDF('size-mm');ok(streams(doc)[0]===s,'centimeter and millimeter exports have identical geometry');
await page.locator('#width').fill('400');await page.locator('#width').dispatchEvent('change');ok(await page.locator('#download').isDisabled(),'oversize dimensions block export');
await page.goto('http://127.0.0.1:8091/en/poster.html');await page.locator('#files').setInputFiles(file('red.png'));await page.waitForFunction(()=>document.querySelectorAll('.sheet').length===4);await page.locator('#marks').check();doc=await exportPDF('poster');dimensions(doc,210,297,4);clips(doc,210,297,10);ok(streams(doc).every(s=>s.includes(' l\n')&&s.includes('Tj')),'poster cut marks and numbering in every PDF page');
const model=layout('poster',{paper:'a4',margin:10,gap:0,posterCols:2,posterRows:2,overlap:5,marks:true},[{id:1,w:600,h:400}]);ok(Math.abs(model[0].items[0].x-model[1].items[0].x-185)<.0001,'poster adjacent origins preserve 5mm overlap');
const waiting=page.waitForFunction(()=>document.querySelector('#cancel').disabled===false);await page.locator('#download').click();await waiting;await page.locator('#cancel').click();ok((await page.locator('#status').textContent()).includes('Canceled'),'PDF cancellation reports cancellation');
await page.setViewportSize({width:390,height:844});for(const prefix of ['', 'en/'])for(const f of ['index.html','arrange.html','size.html','poster.html','contact.html','ruler.html']){await page.goto('http://127.0.0.1:8091/'+prefix+f);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile no overflow '+prefix+f)}
await page.goto('http://127.0.0.1:8091/en/poster.html');await page.locator('#files').setInputFiles(file('red.png'));await page.waitForFunction(()=>document.querySelectorAll('.sheet').length===4);await page.screenshot({path:'test-results/mobile-poster.png',fullPage:true});
await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/desktop-poster.png',fullPage:true});await page.goto('http://127.0.0.1:8091/en/ruler.html');await page.pdf({path:'test-results/ruler.pdf',preferCSSPageSize:true,printBackground:true});const ruler=await PDFDocument.load(fs.readFileSync('test-results/ruler.pdf'));dimensions(ruler,210,297,1,.5);ok(await page.locator('.ruler').evaluate(el=>Math.abs(el.getBoundingClientRect().width-100*96/25.4)<.1),'ruler CSS physical length 100mm');await page.goto('http://127.0.0.1:8091/arrange.html');
await page.locator('#files').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken image')});
await page.waitForFunction(()=>document.querySelector('#status').classList.contains('error'));
ok((await page.locator('#status').textContent()).includes('تعذّر فتح الصورة'),'Arabic corrupt-file error');
await page.locator('#files').setInputFiles([file('red.png'),file('blue.png','blue')]);
await page.waitForFunction(()=>document.querySelectorAll('.photo').length===2);
await page.locator('.photo').first().getByRole('button',{name:'↓ للأسفل'}).focus();await page.keyboard.press('Enter');
ok((await page.locator('.photo .name').first().textContent()).includes('blue.png'),'Arabic keyboard reordering');
ok((await page.locator('#page-count').textContent()).includes('عدد الصفحات'),'Arabic page count');
doc=await exportPDF('arrange-ar');dimensions(doc,210,297,1);clips(doc,210,297,10);
await page.goto('http://127.0.0.1:8091/size.html');await page.locator('#files').setInputFiles(file('red.png'));
await page.waitForFunction(()=>document.querySelectorAll('.sheet').length===1);
await page.locator('#width').fill('400');await page.locator('#width').dispatchEvent('change');
ok((await page.locator('#status').textContent()).includes('المقاس المطلوب أكبر'),'Arabic layout validation');
await page.locator('#width').fill('10');await page.locator('#width').dispatchEvent('change');
doc=await exportPDF('size-ar');dimensions(doc,210,297,1);clips(doc,210,297,10);
await page.goto('http://127.0.0.1:8091/poster.html');await page.locator('#files').setInputFiles(file('red.png'));
await page.waitForFunction(()=>document.querySelectorAll('.sheet').length===4);
ok((await page.locator('#status').textContent()).includes('تنبيه جودة'),'Arabic image-quality warning');
doc=await exportPDF('poster-ar');dimensions(doc,210,297,4);clips(doc,210,297,10);
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile-poster-ar.png',fullPage:true});
await page.locator('.language-switch').click();await page.waitForURL('**/en/poster.html');
ok(await page.locator('html').getAttribute('lang')==='en','switch to English keeps corresponding tool');
await page.locator('.language-switch').click();await page.waitForURL('**/poster.html');
ok(await page.locator('html').getAttribute('lang')==='ar','switch back restores Arabic RTL');
await page.goto('http://127.0.0.1:8091/en/');ok(await page.locator('html').getAttribute('lang')==='en','English directory homepage loads');
ok(errors.length===0,'no browser JavaScript errors: '+errors.join(';'));ok(remote===0,'no external requests during tools');
fs.writeFileSync('test-results/results.json',JSON.stringify({checks,passed:true},null,2));console.log(`ALL ${checks} CHECKS PASSED`);
}finally{await browser?.close();server.close()}
