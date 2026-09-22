import {initMotion,animateElement,motionAllowed} from './motion';
initMotion();

function imageFailed(img:HTMLImageElement){
  const wrap=img.closest<HTMLElement>('.image-wrap');
  if(!wrap)return;
  wrap.classList.add('has-error');
  const message=wrap.querySelector<HTMLElement>('.image-error');if(message)message.hidden=false;
}
document.querySelectorAll<HTMLImageElement>('img').forEach(img=>{
  img.addEventListener('error',()=>imageFailed(img));
  if(img.complete&&!img.naturalWidth)imageFailed(img);
});

const filters=document.querySelector<HTMLFormElement>('[data-filters]');
if(filters){
  filters.hidden=false;
  const cards=[...document.querySelectorAll<HTMLElement>('[data-archive] [data-work-id]')];
  const selects=[...filters.querySelectorAll<HTMLSelectElement>('select')];
  const update=(changeURL=false)=>{
    const state=Object.fromEntries(selects.map(s=>[s.name,s.value]));
    let count=0;
    cards.forEach(card=>{const show=(!state.year||card.dataset.year===state.year)&&(!state.series||card.dataset.series===state.series);card.hidden=!show;if(show)count++;});
    document.querySelector('#result-count')!.textContent=String(count);
    document.querySelector<HTMLElement>('#empty-filter')!.hidden=count!==0;
    document.querySelector('#filter-status')!.textContent=Object.values(state).some(Boolean)?`已筛选 · ${count} 件作品`:'全部作品';
    if(changeURL){const u=new URL(location.href);for(const s of selects){if(s.value)u.searchParams.set(s.name,s.value);else u.searchParams.delete(s.name)}history.replaceState(null,'',u);}
  };
  const restore=()=>{const params=new URLSearchParams(location.search);for(const s of selects){const value=params.get(s.name)||'';s.value=[...s.options].some(o=>o.value===value)?value:''}update();};
  restore();
  filters.addEventListener('change',()=>update(true));
  filters.addEventListener('submit',e=>e.preventDefault());
  filters.addEventListener('reset',()=>{queueMicrotask(()=>update(true));});
  window.addEventListener('pageshow',restore);window.addEventListener('popstate',restore);
}

const dialog=document.querySelector<HTMLDialogElement>('#art-viewer');
const openButton=document.querySelector<HTMLButtonElement>('#open-viewer');
const closeButton=document.querySelector<HTMLButtonElement>('#close-viewer');
const canvas=document.querySelector<HTMLElement>('#viewer-canvas');
const status=document.querySelector<HTMLElement>('#viewer-status');
const highButton=document.querySelector<HTMLButtonElement>('#load-high');
let generation=0;
let pendingHigh:HTMLImageElement|null=null;
if(dialog&&openButton&&closeButton&&canvas&&typeof dialog.showModal==='function'){
  let closing=false;
  let closeTimer:number|undefined;
  const viewerAnimations=new Set<Animation>();
  const runViewer=(element:Element|null,frames:Keyframe[],duration:number)=>{
    const animation=animateElement(element,frames,{duration,fill:'both'});
    if(animation){viewerAnimations.add(animation);animation.finished.then(()=>{viewerAnimations.delete(animation);animation.cancel()},()=>viewerAnimations.delete(animation));}
    return animation;
  };
  const stopViewerAnimations=()=>{for(const animation of viewerAnimations)animation.cancel();viewerAnimations.clear()};
  openButton.hidden=false;
  openButton.addEventListener('click',()=>{
    if(dialog.open)return;
    const original=document.querySelector('#main-art-image .image-wrap');
    if(!original)return;
    const origin=original.querySelector('img')?.getBoundingClientRect();
    stopViewerAnimations();closing=false;delete dialog.dataset.closing;
    generation++;
    canvas.replaceChildren(original.cloneNode(true));
    canvas.classList.remove('zoomed');
    document.body.classList.add('viewer-open');dialog.showModal();closeButton.focus({preventScroll:true});
    if(status)status.textContent='';
    if(highButton)highButton.disabled=false;
    const image=canvas.querySelector('img');const dest=image?.getBoundingClientRect();
    if(image&&origin&&dest&&origin.width&&dest.width){
      image.style.transformOrigin='0 0';
      runViewer(image,[{transform:`translate(${origin.left-dest.left}px,${origin.top-dest.top}px) scale(${origin.width/dest.width},${origin.height/dest.height})`},{transform:'none'}],560);
    }
    runViewer(dialog,[{backgroundColor:'rgba(239,238,232,0)'},{backgroundColor:'rgb(239,238,232)'}],400);
    runViewer(dialog.querySelector('.viewer-toolbar'),[{opacity:0,transform:'translateY(-12px)'},{opacity:1,transform:'none'}],380);
  });
  const cleanupViewer=()=>{
    clearTimeout(closeTimer);closeTimer=undefined;stopViewerAnimations();closing=false;delete dialog.dataset.closing;
    generation++;
    if(pendingHigh){pendingHigh.onload=null;pendingHigh.onerror=null;pendingHigh=null;}
    document.body.classList.remove('viewer-open');canvas.replaceChildren();openButton.focus({preventScroll:true});
  };
  const closeViewer=()=>{
    if(closing||!dialog.open)return;
    closing=true;dialog.dataset.closing='true';generation++;stopViewerAnimations();
    const finish=()=>{if(!closing)return;dialog.close();cleanupViewer()};
    if(!motionAllowed()){finish();return}
    const image=canvas.querySelector('img');const from=image?.getBoundingClientRect();
    const to=document.querySelector('#main-art-image img')?.getBoundingClientRect();
    if(image&&from&&to&&from.width&&to.width&&!canvas.classList.contains('zoomed')){
      image.style.transformOrigin='0 0';
      runViewer(image,[{transform:'none',opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`,opacity:.15}],260);
    }
    const animation=runViewer(dialog,[{opacity:1},{opacity:0}],260);
    animation?.finished.then(finish,finish);
    // Closing always completes, including a background tab or interrupted animation.
    closeTimer=window.setTimeout(finish,340);
  };
  closeButton.addEventListener('click',closeViewer);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeViewer()});
  dialog.addEventListener('close',()=>{if(!dialog.open)cleanupViewer()});
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const buttons=[...dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(b=>!b.hidden);
    const first=buttons[0],last=buttons[buttons.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  highButton?.addEventListener('click',()=>{
    if(closing||!dialog.open||!highButton.dataset.src)return;
    highButton.disabled=true;
    if(status)status.textContent='正在加载高清细节…';
    const token=generation;
    const img=new Image();pendingHigh=img;
    img.alt=document.querySelector<HTMLImageElement>('#main-art-image img')?.alt||'作品高清细节';
    img.width=Number(highButton.dataset.width);img.height=Number(highButton.dataset.height);
    img.onload=()=>{if(token!==generation||!dialog.open)return;canvas.replaceChildren(img);canvas.classList.add('zoomed');pendingHigh=null;runViewer(img,[{opacity:.3},{opacity:1}],280);if(status)status.textContent='高清细节已加载，可滚动查看。';};
    img.onerror=()=>{if(token!==generation||!dialog.open)return;highButton.disabled=false;pendingHigh=null;if(status)status.textContent='高清图加载失败，请重试。';};
    img.src=highButton.dataset.src;
  });
}
