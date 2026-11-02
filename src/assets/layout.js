export const PT=72/25.4;
export function layout(mode,o,images){
 let [w,h]=o.paper==='letter'?[215.9,279.4]:[210,297];if(o.landscape)[w,h]=[h,w];
 const m=o.margin, gap=o.gap, aw=w-2*m, ah=h-2*m;
 if(!(m>=0&&aw>0&&ah>0))throw Error('The margins leave no printable area.');
 const pages=[];const page=()=>({w,h,items:[],marks:[]});
 const place=(p,img,x,y,bw,bh,fit='contain')=>{const scale=fit==='cover'?Math.max(bw/img.w,bh/img.h):Math.min(bw/img.w,bh/img.h);const dw=img.w*scale,dh=img.h*scale;p.items.push({id:img.id,x:x+(bw-dw)/2,y:y+(bh-dh)/2,w:dw,h:dh,clip:{x,y,w:bw,h:bh}})};
 if(mode==='arrange'&&o.layoutMode==='custom'){
 let p=page(),x=m,y=m,rowH=0;pages.push(p);
 for(const img of images)for(let c=0;c<img.copies;c++){
  const bw=img.printW,bh=img.printH;
  if(!Number.isFinite(bw)||!Number.isFinite(bh)||bw<1||bh<1||bw>aw+.00001||bh>ah+.00001)throw Error('A photo size exceeds the printable area. Reduce it or change paper orientation.');
  if(x+bw>w-m+.00001){x=m;y+=rowH+gap;rowH=0}
  if(y+bh>h-m+.00001){p=page();pages.push(p);x=m;y=m;rowH=0}
  place(p,img,x,y,bw,bh,o.arrangeFit||'contain');x+=bw+gap;rowH=Math.max(rowH,bh);
 }
 }else if(mode==='arrange'){
 const cols=o.cols,rows=o.rows,cw=(aw-(cols-1)*gap)/cols,ch=(ah-(rows-1)*gap)/rows;if(cw<5||ch<5)throw Error('Reduce the number of cells, margins or gaps.');let n=0,p;
 for(const img of images)for(let c=0;c<img.copies;c++){if(n%(cols*rows)===0){p=page();pages.push(p)}const k=n%(cols*rows);place(p,img,m+(k%cols)*(cw+gap),m+Math.floor(k/cols)*(ch+gap),cw,ch,o.arrangeFit||'contain');n++}
 }else if(mode==='size'){
 const bw=o.width*(o.unit==='cm'?10:1),bh=o.height*(o.unit==='cm'?10:1);if(bw>aw||bh>ah)throw Error('The requested size is larger than the available area. Try another orientation, a smaller frame or smaller margins.');const p=page();place(p,images[0],(w-bw)/2,(h-bh)/2,bw,bh,o.fit);pages.push(p);
 }else{
 const cols=o.posterCols,rows=o.posterRows,over=o.overlap;if(over>=Math.min(aw,ah)/2)throw Error('Overlap is too large for the printable area.');const totalW=cols*aw-(cols-1)*over,totalH=rows*ah-(rows-1)*over;const img=images[0];const scale=(o.posterFit==='contain'?Math.min:Math.max)(totalW/img.w,totalH/img.h);const iw=img.w*scale,ih=img.h*scale;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const p=page();p.label=`${r+1} / ${c+1}`;p.items.push({id:img.id,x:m-(iw-totalW)/2-c*(aw-over),y:m-(ih-totalH)/2-r*(ah-over),w:iw,h:ih,clip:{x:m,y:m,w:aw,h:ah}});if(o.marks){for(const [x,y] of [[m,m],[w-m,m],[m,h-m],[w-m,h-m]]){p.marks.push({x1:x-2,y1:y,x2:x+2,y2:y},{x1:x,y1:y-2,x2:x,y2:y+2})}}pages.push(p)}
 }
 if(pages.length>30)throw Error('The limit is 30 pages. Reduce the number of copies or pages.');return pages;
}
