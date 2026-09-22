const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const active=new Set<Animation>();
const ease='cubic-bezier(.22,.8,.18,1)';
export const motionAllowed=()=>!reduce.matches&&document.documentElement.dataset.motion!=='off';
export function animateElement(el:Element|null,frames:Keyframe[],options:KeyframeAnimationOptions={}):Animation|null{
  if(!el||!motionAllowed()||typeof el.animate!=='function')return null;
  const animation=el.animate(frames,{duration:720,easing:ease,fill:'backwards',...options});
  active.add(animation);animation.finished.then(()=>active.delete(animation),()=>active.delete(animation));
  return animation;
}

export function initMotion(){
  const button=document.querySelector<HTMLButtonElement>('.motion-toggle');
  const navigationStyle=document.createElement('style');
  navigationStyle.id='navigation-motion';document.head.append(navigationStyle);
  const revealed=new WeakSet<Element>();
  let observer:IntersectionObserver|undefined;
  let frame=0;
  const featured=[...document.querySelectorAll<HTMLElement>('.featured-card')];
  const hero=document.querySelector<HTMLElement>('.hero');
  const lines=[...document.querySelectorAll<HTMLElement>('.name-line')];
  const heroArt=document.querySelector<HTMLElement>('.hero-art>a');
  const drift=()=>{
    frame=0;if(!motionAllowed()||document.hidden)return;
    const height=innerHeight;
    const small=innerWidth<=760;
    // Read first, then write. No continuous loop when the user stops scrolling.
    const positions=featured.map(el=>({el,rect:el.getBoundingClientRect()}));
    const heroRect=hero?.getBoundingClientRect();
    for(const {el,rect} of positions){
      if(rect.top>height+100||rect.bottom< -100)continue;
      const amount=(height*.5-(rect.top+rect.height*.5))/(height+rect.height);
      const range=small?10:44;
      el.style.setProperty('--drift-y',`${Math.max(-22,Math.min(22,amount*range)).toFixed(2)}px`);
    }
    if(heroRect&&heroRect.bottom>0){
      const progress=Math.max(0,Math.min(1,-heroRect.top/Math.max(heroRect.height,1)));
      lines.forEach((line,i)=>line.style.setProperty('--name-shift',`${progress*(i?1:-1)*(small?8:22)}px`));
      heroArt?.style.setProperty('--hero-drift',`${progress*(small?9:28)}px`);
    }
  };
  const schedule=()=>{if(!frame&&motionAllowed()&&!document.hidden)frame=requestAnimationFrame(drift)};
  const reveal=(el:HTMLElement)=>{
    if(revealed.has(el)||!motionAllowed())return;
    revealed.add(el);el.dataset.motionSeen='true';
    const picture=el.classList.contains('image-wrap');
    const delay=Number(el.dataset.motionDelay||0);
    animateElement(el,[{opacity:picture ? .3 : 0,transform:picture?'translateY(40px) scale(.965)':'translateY(24px)'},{opacity:1,transform:'none'}],{duration:picture?900:680,delay});
  };
  const prepareReveals=()=>{
    const selectors=[
      '.section-heading>div','.section-note','.featured-card .image-wrap','.featured-card .work-meta',
      '.archive-foot','.about-teaser h2','.artist-summary','.about-teaser .text-link','.contact-teaser>a','.page-heading>div','.archive-grid .work-card',
      '.story-section>.eyebrow','.story-section .prose>*','.details-section>h2','.detail-images figure','.work-pagination',
      '.about-body>.prose>*','.contact-body>*'
    ].join(',');
    const targets=[...document.querySelectorAll<HTMLElement>(selectors)];
    observer?.disconnect();
    if(typeof IntersectionObserver==='undefined')return;
    observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){reveal(entry.target as HTMLElement);observer?.unobserve(entry.target)}}},{threshold:0,rootMargin:'0px 0px -28px 0px'});
    targets.forEach(el=>{
      if(el.classList.contains('work-meta'))el.dataset.motionDelay='110';
      // Normal content remains visible before observer initialization or failure.
      if(!revealed.has(el))observer?.observe(el);
    });
  };
  const intro=()=>{
    const letters=[...document.querySelectorAll<HTMLElement>('.name-letter')];
    letters.forEach((el,i)=>animateElement(el,[{opacity:0,transform:'translateY(.5em) rotate(5deg)'},{opacity:1,transform:'none'}],{duration:850,delay:80+i*34}));
    animateElement(document.querySelector('.hero-copy>.eyebrow'),[{opacity:0,transform:'translateX(-14px)'},{opacity:1,transform:'none'}],{duration:600});
    animateElement(heroArt,[{opacity:.2,transform:'translateY(26px) scale(.965)'},{opacity:1,transform:'none'}],{duration:1050,delay:140});
    animateElement(document.querySelector('.hero-intro'),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:650,delay:340});
    animateElement(document.querySelector('#main-art-image'),[{opacity:.2,transform:'translateY(30px) scale(.975)'},{opacity:1,transform:'none'}],{duration:900});
    document.querySelectorAll('.artwork-info>.eyebrow,.artwork-info>h1,.artwork-info>.art-summary,.artwork-info dl>div').forEach((el,i)=>animateElement(el,[{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'none'}],{duration:680,delay:120+i*90}));
    animateElement(document.querySelector('.detail-figure>figcaption'),[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:500,delay:200});
  };
  const sync=()=>{
    const enabled=motionAllowed();
    navigationStyle.textContent=enabled?'@view-transition{navigation:auto}':'';
    if(button){button.hidden=false;button.disabled=reduce.matches;button.setAttribute('aria-pressed',String(!enabled));button.setAttribute('aria-label',enabled?'关闭非必要动效':'开启非必要动效');button.querySelector('span')!.textContent=reduce.matches?'系统关闭':enabled?'开':'关'}
    if(!enabled){
      observer?.disconnect();for(const animation of active)animation.cancel();active.clear();
      cancelAnimationFrame(frame);frame=0;
      featured.forEach(el=>el.style.removeProperty('--drift-y'));
      lines.forEach(el=>el.style.removeProperty('--name-shift'));heroArt?.style.removeProperty('--hero-drift');
    }else{prepareReveals();schedule()}
  };
  button?.addEventListener('click',()=>{
    const off=motionAllowed();document.documentElement.dataset.motion=off?'off':'on';
    try{localStorage.setItem('jqy-motion',off?'off':'on')}catch{}
    sync();if(!off)intro();
  });
  reduce.addEventListener('change',sync);
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  addEventListener('pageshow',event=>{if(event.persisted){for(const animation of active)animation.cancel();sync()}schedule()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else schedule()});
  // Reveal content immediately when keyboard focus reaches it.
  document.addEventListener('focusin',event=>{const target=event.target as Element;for(const animation of active){const el=(animation.effect as KeyframeEffect|null)?.target;if(el?.contains(target))animation.finish()}});
  sync();
  const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
  if(navigation?.type!=='back_forward')intro();
}
