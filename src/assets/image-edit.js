// Edits always render from the original image, so repeated editing does not compound resampling.
export function cropGeometry(source, edit) {
  const {x,y,w,h} = edit.crop;
  if (![x,y,w,h].every(Number.isFinite) || x<0 || y<0 || w<=0 || h<=0 || x+w>100.00001 || y+h>100.00001) throw Error('The crop must stay inside the image.');
  const crop = {x:source.w*x/100,y:source.h*y/100,w:source.w*w/100,h:source.h*h/100};
  const rotated = Math.abs(edit.turns)%2===1;
  return {...crop, rotatedW:rotated?crop.h:crop.w,rotatedH:rotated?crop.w:crop.h};
}
export function outputSize(source, edit) {
  const g=cropGeometry(source,edit),width=Math.round(edit.width),height=Math.round(edit.height);
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width>8192||height>8192||width*height>12000000)throw Error('Choose dimensions up to 8192 pixels per side and 12 megapixels total.');
  // At most one pixel of rounding is allowed; resizing must never stretch the original ratio.
  if(Math.abs(height-width*g.rotatedH/g.rotatedW)>1.01)throw Error('Keep width and height linked to avoid stretching.');
  return {width,height,...g};
}
export function renderEdited(source, edit, maxSide=Infinity) {
  const size=outputSize(source,edit),scale=Math.min(1,maxSide/Math.max(size.width,size.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(size.width*scale));canvas.height=Math.max(1,Math.round(size.height*scale));
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.translate(canvas.width/2,canvas.height/2);
  ctx.scale((edit.flip?-1:1)*canvas.width/size.rotatedW,canvas.height/size.rotatedH);
  ctx.rotate(edit.turns*Math.PI/2);
  ctx.drawImage(source.el,size.x,size.y,size.w,size.h,-size.w/2,-size.h/2,size.w,size.h);
  return canvas;
}
export function imageUsage(images) {
  let pixels=0,bytes=0;const seen=new Set();
  for(const im of images)for(const item of [im,im.original]){
    if(!item||seen.has(item.el))continue;seen.add(item.el);pixels+=item.w*item.h;bytes+=item.data.length*.75;
  }
  return {pixels,bytes};
}
export function checkImageBudget(images) {
  const used=imageUsage(images);
  if(used.pixels>32000000)throw Error('Originals and edits exceed 32 megapixels. Remove an image or use smaller dimensions.');
  if(used.bytes>80*1024*1024)throw Error('Originals and edits exceed 80 MiB. Remove an image or use smaller dimensions.');
}
