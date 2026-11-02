import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PDFName} from 'pdf-lib';
const PT=72/25.4;
export async function runAdvanced({page,ok,exportPDF,dimensions,clips,streams,file}) {
 const origin='http://127.0.0.1:8091/';
 for(const prefix of ['en/','']){
  const ar=prefix==='';
  await page.setViewportSize({width:1440,height:1000});await page.goto(origin+prefix+'arrange.html');
  const pattern=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=400;const x=c.getContext('2d');x.fillStyle='red';x.fillRect(0,0,300,400);x.fillStyle='blue';x.fillRect(300,0,300,400);x.fillStyle='#00ff00';x.fillRect(100,0,100,100);x.clearRect(250,150,100,100);return c.toDataURL('image/png').split(',')[1]});
  await page.locator('#files').setInputFiles([{name:'pattern.png',mimeType:'image/png',buffer:Buffer.from(pattern,'base64')},file('blue.png','blue')]);
  await page.waitForFunction(()=>document.querySelectorAll('.photo').length===2);
  await page.locator('#layoutMode').selectOption('custom');
  ok(await page.locator('.photo-print').first().isVisible(),'individual print-size controls '+(ar?'ar':'en'));
  for(const card of await page.locator('.photo').all()){
   await card.locator('.photo-print input[type=checkbox]').uncheck();
   await card.locator('[data-print=printW]').fill('100');await card.locator('[data-print=printW]').dispatchEvent('change');
   await card.locator('[data-print=printH]').fill('150');await card.locator('[data-print=printH]').dispatchEvent('change');
  }
  let doc=await exportPDF('custom-sizes-'+(ar?'ar':'en'));dimensions(doc,210,297,2);clips(doc,210,297,10);
  ok(streams(doc).every(s=>[...s.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re/g)].some(m=>Math.abs(+m[3]-100*PT)<.01&&Math.abs(+m[4]-150*PT)<.01)),'custom 100×150mm frames exported exactly');
  await page.locator('[data-print=printW]').first().fill('400');await page.locator('[data-print=printW]').first().dispatchEvent('change');
  ok(await page.locator('#download').isDisabled()&&await page.locator('#status').evaluate(e=>e.classList.contains('error')),'oversized individual frame blocks export');
  await page.locator('[data-print=printW]').first().fill('100');await page.locator('[data-print=printW]').first().dispatchEvent('change');
  const edit=()=>page.locator('.photo').first().getByRole('button',{name:ar?'تعديل الصورة':'Edit image',exact:true});
  await edit().click();ok(await page.locator('#image-editor').evaluate(e=>e.open),'image editor dialog opens');
  await page.locator('#crop-preset').selectOption('1');await page.locator('#rotate-right').click();await page.locator('#flip-image').click();
  await page.locator('#pixel-width').fill('200');await page.locator('#pixel-width').dispatchEvent('input');
  ok(await page.locator('#pixel-height').inputValue()==='200','crop, rotation and linked pixel dimensions');
  await page.locator('#editor-apply').click();await page.waitForFunction(()=>!document.querySelector('#image-editor').open);
  const result=await page.locator('.photo img').first().evaluate(el=>{const c=document.createElement('canvas');c.width=el.naturalWidth;c.height=el.naturalHeight;const x=c.getContext('2d');x.drawImage(el,0,0);return{w:c.width,h:c.height,top:[...x.getImageData(100,25,1,1).data],bottom:[...x.getImageData(100,175,1,1).data],center:[...x.getImageData(100,100,1,1).data],corner:[...x.getImageData(25,25,1,1).data]}});
  ok(result.w===200&&result.h===200&&result.top[0]>240&&result.top[2]<10&&result.bottom[2]>240&&result.center[3]===0&&result.corner[1]>240&&result.corner[0]<10,'edited pixels have correct rotation, crop and preserved transparency');
  doc=await exportPDF('edited-layout-'+(ar?'ar':'en'));dimensions(doc,210,297,2);
  ok(doc.context.enumerateIndirectObjects().some(([,obj])=>obj.dict?.get?.(PDFName.of('Width'))?.asNumber?.()===200&&obj.dict?.get?.(PDFName.of('Height'))?.asNumber?.()===200),'edited image export completes');
  await edit().click();await page.locator('#editor-reset').click();await page.locator('#editor-apply').click();await page.waitForFunction(()=>!document.querySelector('#image-editor').open);
  ok(await page.locator('.photo img').first().evaluate(el=>el.naturalWidth===600&&el.naturalHeight===400),'reset restores original pixels after applying edits');
  await edit().click();await page.locator('#rotate-right').click();await page.locator('#editor-close').click();
  ok(await page.locator('.photo img').first().evaluate(el=>el.naturalWidth===600&&el.naturalHeight===400),'closing editor discards draft changes');
  await edit().click();await page.locator('#crop-x').fill('90');await page.locator('#crop-x').dispatchEvent('input');
  ok(await page.locator('#editor-apply').isDisabled(),'crop outside image is rejected');
  await page.locator('#editor-reset').click();await page.locator('#pixel-width').fill('9000');await page.locator('#pixel-width').dispatchEvent('input');
  ok(await page.locator('#editor-apply').isDisabled(),'pixel dimension limit is enforced');
  await page.locator('#pixel-width').fill('300');await page.locator('#pixel-width').dispatchEvent('input');
  const download=page.waitForEvent('download');await page.locator('#editor-download').click();const png=await download;const dest=`test-results/edited-${ar?'ar':'en'}.png`;await png.saveAs(dest);const bytes=fs.readFileSync(dest);
  ok(bytes.readUInt32BE(16)===300&&bytes.readUInt32BE(20)===200,'downloaded PNG has requested 300×200 pixel dimensions');
  await page.setViewportSize({width:390,height:844});
  ok(await page.locator('#image-editor').evaluate(el=>el.getBoundingClientRect().left>=0&&el.getBoundingClientRect().right<=innerWidth&&el.scrollWidth<=el.clientWidth),'mobile editor fits viewport');
  await page.screenshot({path:`test-results/editor-${ar?'ar':'en'}.png`,fullPage:true});await page.keyboard.press('Escape');
  ok(await page.locator('#image-editor').evaluate(el=>!el.open),'Escape closes editor');
  await page.goto(origin+prefix+'size.html');await page.locator('#files').setInputFiles(file('red.png'));await page.waitForFunction(()=>document.querySelectorAll('.sheet').length===1);
  await page.locator('#lockRatio').check();await page.locator('#width').fill('12');await page.locator('#width').dispatchEvent('change');
  ok(Number(await page.locator('#height').inputValue())===8,'physical print dimensions link to photo ratio');
  await page.locator('#unit').selectOption('mm');ok(Number(await page.locator('#width').inputValue())===120&&Number(await page.locator('#height').inputValue())===80,'changing units preserves physical print size');
  await page.locator('#sizePreset').selectOption('127,177.8');doc=await exportPDF('preset-5x7-'+(ar?'ar':'en'));dimensions(doc,210,297,1);clips(doc,210,297,10);
  ok([...streams(doc)[0].matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re/g)].some(m=>Math.abs(+m[3]-127*PT)<.01&&Math.abs(+m[4]-177.8*PT)<.01),'5×7 inch preset produces a 127×177.8mm frame');
  await page.goto(origin+prefix+'poster.html');await page.locator('#files').setInputFiles(file('red.png'));await page.waitForFunction(()=>document.querySelectorAll('.sheet').length===4);
  await page.locator('#posterFit').selectOption('contain');doc=await exportPDF('poster-fit-'+(ar?'ar':'en'));dimensions(doc,210,297,4);clips(doc,210,297,10);
  ok([...streams(doc)[0].matchAll(/([\d.]+) 0 0 ([\d.]+) 0 0 cm/g)].some(m=>Math.abs(+m[1]-375*PT)<.01&&Math.abs(+m[2]-250*PT)<.01),'poster Fit keeps the entire 3:2 image without crop');
  ok((await page.locator('#layout-summary').textContent()).includes('375')&&(await page.locator('#layout-summary').textContent()).includes('549'),'finished poster dimensions are shown');
 }
}
