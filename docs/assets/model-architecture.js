/* Animates the web version of the method figure. */
(() => {
  'use strict';
  const root=document.getElementById('model-frame');
  if(!root)return;
  const canvas=root.querySelector('.ma-canvas');
  const still=canvas.querySelector('img.ma-svg');
  if(!still||!('IntersectionObserver' in window))return;
  const load=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    load.disconnect();
    fetch(still.src)
      .then(response=>{
        if(!response.ok)throw new Error('Method figure unavailable');
        return response.text();
      })
      .then(text=>{
        const svg=new DOMParser().parseFromString(text,'image/svg+xml').documentElement;
        if(svg.localName!=='svg')return;
        still.replaceWith(svg);
        initialize(svg);
      })
      .catch(()=>{});
  },{rootMargin:'600px 0px'});
  load.observe(root);

  function initialize(svg){
    const ns='http://www.w3.org/2000/svg';
    const videoLayer=canvas.querySelector('.ma-video-layer');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const slots=[...svg.querySelectorAll('.ma-video-slot')];
    const videos=[];
    let prepared=false;
    function prepare(){
      if(prepared)return;
      prepared=true;
      svg.querySelectorAll('image[data-href]').forEach(image=>image.setAttribute('href',image.dataset.href));
      // Slots and the HTML layer share the same scaled canvas and scroll together.
      const canvasBounds=canvas.getBoundingClientRect();
      slots.forEach(slot=>{
        const bounds=slot.getBoundingClientRect();
        const group=slot.parentElement;
        const video=document.createElement('video');
        video.className='ma-paper-video';
        video.dataset.role=group.dataset.mediaRole;
        video.dataset.src=slot.dataset.src;
        video.setAttribute('aria-label',slot.dataset.label);
        video.setAttribute('webkit-playsinline','');
        video.muted=true;
        video.loop=true;
        video.playsInline=true;
        video.preload='none';
        Object.assign(video.style,{
          left:`${100*(bounds.left-canvasBounds.left)/canvasBounds.width}%`,
          top:`${100*(bounds.top-canvasBounds.top)/canvasBounds.height}%`,
          width:`${100*bounds.width/canvasBounds.width}%`,
          height:`${100*bounds.height/canvasBounds.height}%`,
        });
        const showVideo=ready=>{
          video.classList.toggle('is-ready',ready);
          group.classList.toggle('has-video',ready);
        };
        video.addEventListener('playing',()=>showVideo(true));
        video.addEventListener('error',()=>showVideo(false));
        videoLayer.appendChild(video);
        videos.push(video);
      });
    }
    const preload=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){prepare();preload.disconnect();}
    },{rootMargin:'600px 0px'});
    preload.observe(root);
    const layer=document.createElementNS(ns,'g');layer.setAttribute('aria-hidden','true');svg.appendChild(layer);
    const wires=[...svg.querySelectorAll('.ma-paper-wire[data-flow="between-modules"]')].map((path,i)=>{
      const dot=document.createElementNS(ns,'circle');
      dot.setAttribute('r','1.55');dot.setAttribute('fill',path.dataset.packetColor);dot.setAttribute('class','ma-paper-packet');layer.appendChild(dot);
      return {path,dot,offset:i*.19,reverse:path.hasAttribute('marker-start')&&!path.hasAttribute('marker-end')};
    });
    // Diagram geometry is fixed. Cache coordinates to avoid layout work during animation.
    function geometry(){
      const inverse=svg.getScreenCTM()?.inverse();if(!inverse)return;
      wires.forEach(w=>{
        const matrix=w.path.getScreenCTM(),length=w.path.getTotalLength();
        w.start=w.path.getPointAtLength(0).matrixTransform(matrix).matrixTransform(inverse);
        w.end=w.path.getPointAtLength(length).matrixTransform(matrix).matrixTransform(inverse);
      });
    }
    const sequence=role=>[...svg.querySelectorAll(`[data-media-role="${role}"]`)].sort((a,b)=>+a.dataset.gx-+b.dataset.gx);
    const depth=sequence('depth'),action=sequence('action-sequence');
    let visible=false,elapsed=0,last=0,raf=0;
    const shouldAnimate=()=>!reduced.matches&&visible&&!document.hidden;
    function media(){
      const run=shouldAnimate();
      if(run)prepare();
      videos.forEach(video=>{if(run){if(!video.getAttribute('src'))video.src=video.dataset.src;video.play().catch(()=>{});}else video.pause();});
    }
    const clamp=x=>Math.max(0,Math.min(1,x));
    function draw(){
      const original=reduced.matches;
      const t=(elapsed%9000)/1000;
      [depth,action].forEach(frames=>frames.forEach((frame,i)=>{
        const reveal=clamp((t-i*2.8/(frames.length-1))*3.5);
        frame.style.opacity=original?'1':String(reveal*clamp((9-t)*2));
      }));
      wires.forEach(({dot,start,end,offset,reverse})=>{
        if(!start)return;
        let q=(elapsed/1900+offset)%1;if(reverse)q=1-q;
        dot.setAttribute('cx',start.x+(end.x-start.x)*q);dot.setAttribute('cy',start.y+(end.y-start.y)*q);
        dot.style.opacity=original?'0':String(.85*Math.min(1,q*8,(1-q)*8));
      });
    }
    function tick(now){
      if(!shouldAnimate()){raf=0;last=0;return;}
      if(last)elapsed+=Math.min(80,now-last);last=now;draw();raf=requestAnimationFrame(tick);
    }
    function start(){media();if(!raf&&shouldAnimate())raf=requestAnimationFrame(tick);}
    function updateMotion(){
      root.classList.toggle('ma-original',reduced.matches);
      draw();
      start();
    }
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;start();},{threshold:.12}).observe(root);
    document.addEventListener('visibilitychange',start);
    reduced.addEventListener('change',updateMotion);
    window.addEventListener('resize',()=>{geometry();draw();});
    geometry();updateMotion();
  }
})();
