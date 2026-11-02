import {t} from './i18n.js';
import {cropGeometry,outputSize,renderEdited,checkImageBudget} from './image-edit.js';
const $=id=>document.getElementById(id);
export function createEditor(getImages,onApply) {
  const dialog=$('image-editor');if(!dialog)return()=>{};
  let image,source,draft,valid=false,generation=0;
  const message=(text,error=false)=>{$('editor-status').textContent=t(text);$('editor-status').classList.toggle('error',error)};
  const resetDraft=()=>({crop:{x:0,y:0,w:100,h:100},turns:0,flip:false,width:source.w,height:source.h});
  function fields(){for(const key of ['x','y','w','h'])$('crop-'+key).value=Number(draft.crop[key].toFixed(3));$('pixel-width').value=draft.width;$('pixel-height').value=draft.height;$('flip-image').setAttribute('aria-pressed',String(draft.flip))}
  function render(){try{
    outputSize(source,draft);const preview=renderEdited(source,draft,640),out=$('editor-preview');out.width=preview.width;out.height=preview.height;out.getContext('2d').drawImage(preview,0,0);
    $('editor-size').textContent=`${draft.width} × ${draft.height} px`;
    const g=cropGeometry(source,draft);message(draft.width>g.rotatedW+1?t('Enlarging does not add image detail.'):'');valid=true;
  }catch(e){message(e.message,true);valid=false}
    $('editor-apply').disabled=!valid;$('editor-download').disabled=!valid;
  }
  function naturalSize(){const g=cropGeometry(source,draft);draft.width=Math.max(1,Math.round(g.rotatedW));draft.height=Math.max(1,Math.round(g.rotatedH));fields()}
  for(const key of ['x','y','w','h'])$('crop-'+key).addEventListener('input',()=>{
    draft.crop[key]=Number($('crop-'+key).value);$('crop-preset').value='custom';
    try{naturalSize()}catch{}render();
  });
  $('crop-preset').onchange=()=>{
    const ratio=$('crop-preset').value;if(ratio==='custom')return;
    draft.crop={x:0,y:0,w:100,h:100};
    if(ratio!=='original'){
      const target=Number(ratio);
      if(source.w/source.h>target){draft.crop.w=100*source.h*target/source.w;draft.crop.x=(100-draft.crop.w)/2}
      else{draft.crop.h=100*source.w/target/source.h;draft.crop.y=(100-draft.crop.h)/2}
    }
    naturalSize();render();
  };
  for(const side of ['width','height'])$('pixel-'+side).addEventListener('input',()=>{
    draft[side]=Number($('pixel-'+side).value);
    try{const g=cropGeometry(source,draft);if(side==='width'){draft.height=Math.max(1,Math.round(draft.width*g.rotatedH/g.rotatedW));$('pixel-height').value=draft.height}else{draft.width=Math.max(1,Math.round(draft.height*g.rotatedW/g.rotatedH));$('pixel-width').value=draft.width}}catch{}
    render();
  });
  function turn(delta){draft.turns=(draft.turns+delta+4)%4;[draft.width,draft.height]=[draft.height,draft.width];fields();render()}
  $('rotate-left').onclick=()=>turn(-1);$('rotate-right').onclick=()=>turn(1);
  $('flip-image').onclick=()=>{draft.flip=!draft.flip;fields();render()};
  $('editor-reset').onclick=()=>{draft=resetDraft();$('crop-preset').value='original';fields();render()};
  $('editor-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{generation++;image=null;source=null;draft=null});
  $('editor-download').onclick=()=>{try{const c=renderEdited(source,draft);c.toBlob(blob=>{if(!blob){message('Could not create the edited PNG.',true);return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='arrange-print-edited.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)},'image/png')}catch(e){message(e.message,true)}};
  $('editor-apply').onclick=async()=>{
    if(!valid||!image)return;const run=++generation;const target=image,original=source;
    $('editor-apply').disabled=true;message('Applying changes…');
    try{
      const unchanged=draft.turns===0&&!draft.flip&&draft.crop.x===0&&draft.crop.y===0&&draft.crop.w===100&&draft.crop.h===100&&draft.width===original.w&&draft.height===original.h;const canvas=unchanged?null:renderEdited(original,draft),data=unchanged?original.data:canvas.toDataURL('image/png'),el=unchanged?original.el:new Image();if(!unchanged){el.src=data;await el.decode()}if(run!==generation)return;
      const edit={...target,original,edits:structuredClone(draft),w:draft.width,h:draft.height,el,data};
      checkImageBudget(getImages().map(im=>im.id===target.id?edit:im));
      Object.assign(target,edit);if(target.printLocked!==false)target.printH=target.printW*target.h/target.w;
      dialog.close();onApply(target);
    }catch(e){if(run===generation){message(e.message,true);$('editor-apply').disabled=false}}
  };
  return im=>{
    image=im;source=im.original||{w:im.w,h:im.h,el:im.el,data:im.data};draft=im.edits?structuredClone(im.edits):resetDraft();generation++;
    $('crop-preset').value=im.edits?'custom':'original';$('editor-name').textContent=im.name;fields();render();dialog.showModal();$('editor-close').focus();
  };
}
