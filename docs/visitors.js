(() => {
  const statsUrl = document.currentScript.dataset.visitsApi || 'api/visits.json';
  const canvas = document.getElementById('visitor-globe');
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('globe-tooltip');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = reduced, hovered = false, visible = false, rotation = -105;
  let world = null, stats = null, width = 0, height = 0, last = 0, hits = [];
  let projection=null,path=null,graticule=null,globeTask=null,animation=0;
  function loadGlobe() {
    if(globeTask)return globeTask;
    globeTask=Promise.all([
      new Promise((resolve,reject)=>{
        if(window.d3){resolve();return;}
        const script=document.createElement('script');script.src='assets/d3.min.js?v=1';
        script.onload=resolve;script.onerror=reject;document.head.appendChild(script);
      }),
      fetch('assets/world-countries.geojson?v=1').then(r=>{if(!r.ok)throw Error();return r.json();})
    ]).then(([,data])=>{
      world=data;projection=d3.geoOrthographic().clipAngle(90).precision(.5);
      path=d3.geoPath(projection,ctx);graticule=d3.geoGraticule().step([30,30])();
      resize();startAnimation();
    }).catch(()=>{globeTask=null;});
    return globeTask;
  }
  const warm=new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)){loadGlobe();warm.disconnect();}
  },{rootMargin:'600px 0px'});
  warm.observe(canvas);
  const countryName = country => {
    try { return new Intl.DisplayNames(['en'], {type:'region'}).of(country.code); }
    catch (_) { return country.name; }
  };
  function paint() {
    if (!width || !projection) return;
    ctx.clearRect(0,0,width,height);
    const radius = Math.min(width * .44, height * .44), cx = width / 2, cy = height / 2;
    projection.translate([cx,cy]).scale(radius).rotate([rotation,-16]);
    ctx.beginPath(); path({type:'Sphere'}); ctx.fillStyle='#112333'; ctx.fill(); ctx.strokeStyle='#6ea4bb55'; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); path(graticule); ctx.strokeStyle='#83adc218'; ctx.lineWidth=.6; ctx.stroke();
    if (world) {
      ctx.beginPath(); path(world); ctx.fillStyle='#294451'; ctx.fill(); ctx.strokeStyle='#87a9b350'; ctx.lineWidth=.55; ctx.stroke();
    }
    hits = [];
    const center = projection.invert([cx,cy]);
    for (const country of stats?.countries || []) {
      const location = [country.lon,country.lat];
      if (d3.geoDistance(location,center) >= Math.PI/2-.015) continue;
      const [x,y] = projection(location);
      const size = Math.min(7, 1.5 + Math.log2(country.count + 1)*.7);
      const glow = ctx.createRadialGradient(x,y,0,x,y,size*3);
      glow.addColorStop(0,`rgba(255,130,55,${Math.min(.85,.3+Math.log2(country.count+1)*.09)})`);
      glow.addColorStop(1,'rgba(255,100,30,0)');
      ctx.beginPath(); ctx.arc(x,y,size*3,0,Math.PI*2); ctx.fillStyle=glow; ctx.fill();
      ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fillStyle='#ff9958'; ctx.fill();
      ctx.beginPath(); ctx.arc(x-size*.2,y-size*.2,size*.35,0,Math.PI*2); ctx.fillStyle='#ffe2ad'; ctx.fill();
      hits.push({x,y,size,country});
    }
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1,2);
    width=rect.width; height=rect.height;
    canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0); paint();
  }
  function animate(now) {
    if(!visible||document.hidden||!projection){animation=0;last=0;return;}
    const elapsed = last ? Math.min(now-last,100) : 0; last=now;
    if (visible && !document.hidden && !paused && !hovered) { rotation += elapsed*.004; paint(); }
    animation=requestAnimationFrame(animate);
  }
  function startAnimation(){if(!animation&&visible&&!document.hidden&&projection)animation=requestAnimationFrame(animate);}
  document.addEventListener('visibilitychange',startAnimation);
  canvas.addEventListener('pointermove', event => {
    const rect=canvas.getBoundingClientRect(), x=event.clientX-rect.left, y=event.clientY-rect.top;
    hovered = true;
    const hit=hits.find(p=>Math.hypot(p.x-x,p.y-y)<p.size+8);
    tooltip.hidden=!hit;
    if (hit) {
      tooltip.textContent = `${countryName(hit.country)} · ${hit.country.count.toLocaleString('en')} ${hit.country.count === 1 ? 'view' : 'views'}`;
      tooltip.style.left = `${Math.max(-40,Math.min(x+10,width-100))}px`;
      tooltip.style.top = `${Math.max(0,y-28)}px`;
    }
  });
  canvas.addEventListener('pointerleave', () => {hovered=false; tooltip.hidden=true;});
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting; if(visible){loadGlobe();paint();startAnimation();}}).observe(canvas);
  async function fetchJson(url, options) {
    const response = await fetch(url, {cache: 'no-store', ...options});
    if (!response.ok) throw new Error('Visitor statistics unavailable');
    return response.json();
  }
  function updateStats(data) {
    if (!Number.isInteger(data.total) || !Number.isInteger(data.country_count) ||
        !Number.isInteger(data.unknown) || !Array.isArray(data.countries)) throw new Error('Invalid visitor statistics');
    if (!stats?.countries.length && data.countries.length) rotation = -data.countries[0].lon;
    stats = data;
    paint();
  }
  async function startLiveStats() {
    let endpoint = statsUrl;
    try {
      let data = await fetchJson(endpoint);
      if (data.endpoint) {
        const url = new URL(data.endpoint, document.baseURI);
        if (url.origin !== location.origin && url.protocol !== 'https:') throw new Error('Visitor API requires HTTPS');
        endpoint = url.href;
        data = await fetchJson(endpoint);
      }
      if (data.live === false) return;
      updateStats(data);
    } catch (_) {
      // Still attempt to record the visit if the initial read fails.
    }
    const random = crypto.getRandomValues(new Uint8Array(16));
    const id = Array.from(random, n => n.toString(16).padStart(2, '0')).join('');
    let pending = true;
    async function refresh() {
      const options = pending ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id})} : {};
      try {
        updateStats(await fetchJson(endpoint, options));
        pending = false;
      } catch (_) {
        // Keep the last available map and retry on the next refresh.
      }
    }
    await refresh();
    setInterval(() => { if (!document.hidden) refresh(); }, 30000);
  }
  resize();
  startLiveStats();
})();
