const TASKS = [
  {id:'t2', pi:60, gr:40, hi:100,
    en:'Black Material Picking',
    enAlt:'Black-item pickup: approach the cart, reach and grasp, then lift and hold.'},
  {id:'t3', pi:50, gr:70, hi:100,
    en:'Black Material Shelf Stocking',
    enAlt:'Black-item placement: turn to the shelf, place the item on the middle shelf, then withdraw.'},
  {id:'t4', pi:60, gr:60, hi:90,
    en:'White Material Picking',
    enAlt:'White-item pickup: reach, grasp, and lift the white item from the cart.'},
  {id:'t5', pi:60, gr:80, hi:100,
    en:'White Material Shelf Stocking',
    enAlt:'White-item placement: turn to the shelf, place the item on the upper shelf, then withdraw.'},
  {id:'t6', pi:40, gr:30, hi:80,
    en:'Bimanual Object Storage',
    enAlt:'Object sorting: pick up objects, turn to the bins, and sort them.'},
  {id:'t7', pi:80, gr:80, hi:100,
    en:'Garment Hanging',
    enAlt:'Garment hanging: pick up a garment, turn to the rack, and hang it.'},
  {id:'t8', pi:50, gr:40, hi:90,
    en:'Laundry Basket Relocation',
    enAlt:'Laundry-basket transfer: open the wardrobe, lift the basket, and carry it down.'}
];

let selected = TASKS[0].id;

const storyList = document.getElementById('story-list');
const overviewBenches = [...document.querySelectorAll('.benches .bench[data-tasks]')];
const taskPanel = document.getElementById('task-panel');
const taskChart = document.getElementById('bench-task');
const taskChartTitle = document.getElementById('bench-task-title');

function taskById(id) { return TASKS.find(task => task.id === id); }

function renderTaskChart() {
  const task = taskById(selected);
  taskPanel.setAttribute('aria-labelledby', `task-tab-${selected}`);
  taskChartTitle.textContent = task.en;
  const scoreLabels = taskChart.querySelectorAll('.bench-scores b');
  taskChart.querySelectorAll('.bench-bar').forEach((bar, index) => {
    const percent = `${task[bar.dataset.model]}%`;
    const label = `${bar.querySelector('small').textContent} ${percent}`;
    bar.style.setProperty('--h', percent);
    bar.setAttribute('aria-label', label);
    scoreLabels[index].textContent = label;
  });
}

function groupFor(id) {
  const bench = overviewBenches.find(item => benchTasks(item).includes(id));
  return bench ? benchTasks(bench) : [id];
}

function layoutGroup(ids) {
  if (!storyList) return;
  const mark = `${ids.join(' ')}`;
  if (storyList.dataset.layout === mark) {
    storyList.querySelectorAll('.story-card').forEach(card => {
      card.classList.toggle('is-on', card.dataset.task === selected);
    });
    return;
  }
  storyList.dataset.layout = mark;
  storyList.replaceChildren();
  ids.forEach(id => {
    const task = taskById(id);
    const figure = document.createElement('figure');
    figure.className = 'story-card';
    figure.dataset.task = id;
    if (id === selected) figure.classList.add('is-on');
    const frameEl = document.createElement('div');
    frameEl.className = 'story-frame';
    const picture = document.createElement('picture');
    const animation = document.createElement('source');
    animation.media = '(prefers-reduced-motion: no-preference)';
    animation.srcset = `assets/task-demos/${id}.gif`;
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 416;
    img.height = 234;
    img.src = `assets/task-demos/${id}.jpg`;
    img.alt = task.enAlt;
    picture.append(animation, img);
    frameEl.appendChild(picture);
    const caption = document.createElement('figcaption');
    const title = document.createElement('b');
    title.textContent = task.en;
    caption.append(title);
    figure.append(frameEl, caption);
    storyList.appendChild(figure);
  });
}

function benchTasks(bench) {
  return (bench.dataset.tasks || '').split(/\s+/).filter(Boolean);
}

function selectTask(id, scroll) {
  selected = id;
  document.querySelectorAll('#pills button').forEach(button => {
    button.setAttribute('aria-selected', button.dataset.task === id ? 'true' : 'false');
  });
  let group = [];
  overviewBenches.forEach(bench => {
    const tasks = benchTasks(bench);
    const on = tasks.includes(id);
    bench.classList.toggle('is-current', on);
    if (on) {
      group = tasks;
      bench.setAttribute('aria-current', 'true');
    } else {
      bench.removeAttribute('aria-current');
    }
  });
  document.querySelectorAll('#pills button').forEach(button => {
    button.classList.toggle('in-group', group.includes(button.dataset.task));
  });
  renderTaskChart();
  layoutGroup(group.length ? group : [id]);
  const pill = document.querySelector(`#pills button[data-task="${id}"]`);
  const pills = document.getElementById('pills');
  if (pill && pills && pills.scrollWidth > pills.clientWidth + 1) {
    const delta = pill.getBoundingClientRect().left - pills.getBoundingClientRect().left;
    const left = pills.scrollLeft + delta - Math.max(0, (pills.clientWidth - pill.offsetWidth) / 2);
    pills.scrollTo({left: Math.max(0, left), behavior:'auto'});
  }
  if (scroll === 'keys') document.getElementById('task-keys').scrollIntoView({behavior:'smooth', block:'nearest'});
}

document.querySelectorAll('.bench').forEach(bench => {
  bench.addEventListener('click', event => {
    const tasks = benchTasks(bench);
    if (tasks.length && !tasks.includes(selected)) selectTask(tasks[0], 'keys');
    else if (tasks.length) document.getElementById('task-keys').scrollIntoView({behavior:'smooth', block:'nearest'});
    const bar = event.target.closest('.bench-bar');
    if (!bar || !bench.contains(bar)) return;
    const plot = bar.closest('.bench-plot');
    const on = plot.classList.contains('is-on');
    document.querySelectorAll('.bench-plot.is-on').forEach(el => el.classList.remove('is-on'));
    if (!on) plot.classList.add('is-on');
  });
});

if ('IntersectionObserver' in window) {
  const benchReveal = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (entry.intersectionRatio < 0.25) continue;
      entry.target.classList.replace('is-awaiting-reveal', 'is-revealed');
      observer.unobserve(entry.target);
    }
  }, {threshold: 0.25});

  document.querySelectorAll('.bench-chart').forEach(chart => {
    chart.classList.add('is-awaiting-reveal');
    benchReveal.observe(chart);
  });
}

const mosaic = document.getElementById('ego-mosaic');
const rollout = document.getElementById('rollout-video');
const rolloutStage = document.querySelector('.rollout-stage');
const rolloutPlay = document.querySelector('.rollout-play');
const speedButtons = [...document.querySelectorAll('.rollout-speed button')];
const instructionSubtitle = document.querySelector('.rollout-subtitle');
const instructionText = document.getElementById('rollout-instruction-text');
const rolloutReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const rolloutIntroEnd = 1.85;
const rolloutSubtitleReady = 2.2;
let rolloutIntroFrame = 0;
let instructionFade;
const inset = document.getElementById('rollout-inset-video');
const insetFrame = document.getElementById('rollout-inset');
const insetLabel = document.getElementById('rollout-inset-label');
// Exact prompt_schedule text from recorded simulation artifacts; sources in rollouts-1117/simulation-prompts.json.
const ROLLOUT_PHASES = {
  "household": [
    {
      "time": 0,
      "en": "Walk to the table and raise both hands.",
      "promptId": "S1",
      "promptSource": "sort"
    },
    {
      "time": 11.25,
      "en": "Pick up the light pink cup with the left hand.",
      "promptId": "S2",
      "promptSource": "sort"
    },
    {
      "time": 15.5,
      "en": "Pick up the green toy car with the right hand.",
      "promptId": "S3",
      "promptSource": "sort"
    },
    {
      "time": 21,
      "en": "Turn left to face the table where the baskets are.",
      "promptId": "S4",
      "promptSource": "sort"
    },
    {
      "time": 25.25,
      "en": "Put the cup into the pink basket and the toy car into the green basket.",
      "promptId": "S5",
      "promptSource": "sort"
    },
    {
      "time": 31.5,
      "en": "Turn right to face the tabletop.",
      "promptId": "S6",
      "promptSource": "sort"
    },
    {
      "time": 37.5,
      "en": "Tidy up the clothes.",
      "promptId": "clothes",
      "promptSource": "user_requested_placeholder"
    },
    {
      "time": 62.5,
      "en": "Walk to the wardrobe",
      "promptId": "3-1",
      "promptSource": "wardrobe"
    },
    {
      "time": 71.5,
      "en": "Push the wardrobe door open to the left with the right hand",
      "promptId": "3-2",
      "promptSource": "wardrobe"
    },
    {
      "time": 79,
      "en": "Squat and lift the laundry basket with the right hand",
      "promptId": "3-3",
      "promptSource": "wardrobe"
    },
    {
      "time": 94.75,
      "en": "Step back and grab the other side of the laundry basket with the left hand",
      "promptId": "3-4",
      "promptSource": "wardrobe"
    },
    {
      "time": 105.5,
      "en": "Set the laundry basket on the floor to the right of the wardrobe",
      "promptId": "3-5",
      "promptSource": "wardrobe"
    }
  ],
  "factory": [
    {
      "time": 0,
      "en": "Walk to the cart nearly",
      "promptId": "S1",
      "promptSource": "factory"
    },
    {
      "time": 11.25,
      "en": "Pick a black item from the cart",
      "promptId": "S2",
      "promptSource": "factory"
    },
    {
      "time": 22,
      "en": "Place the black item on the middle shelf",
      "promptId": "S3",
      "promptSource": "factory"
    },
    {
      "time": 34,
      "en": "Walk to the cart nearly",
      "promptId": "S4",
      "promptSource": "factory"
    },
    {
      "time": 44.25,
      "en": "Pick a white item from the cart",
      "promptId": "S5",
      "promptSource": "factory"
    },
    {
      "time": 53,
      "en": "Place the white item on the upper shelf",
      "promptId": "S6",
      "promptSource": "factory"
    }
  ]
};
let activeRollout = 'household';
function configureInset(button) {
  inset.pause();
  inset.muted=true;inset.playsInline=true;
  inset.removeAttribute('src');
  inset.load();
  const source=button.dataset.insetSrc;
  insetFrame.hidden=!source;
  if(!source){delete inset.dataset.src;return;}
  inset.dataset.src=source;
  inset.poster=button.dataset.insetPoster||'';
  insetLabel.textContent=button.dataset.insetLabel||'';
}
function syncInset(force=false) {
  if(insetFrame.hidden)return;
  if(!visibleEnough(rollout)||document.hidden){inset.pause();return;}
  if(!inset.getAttribute('src')&&rollout.currentSrc){inset.preload='auto';inset.src=inset.dataset.src;inset.load();}
  if(inset.readyState<1)return;
  inset.playbackRate=rollout.playbackRate;
  const target=Math.min(rollout.currentTime,Math.max(0,inset.duration-1/30));
  const drift=Math.abs(inset.currentTime-target);
  if(drift > (force ? .015 : .08)){try{inset.currentTime=target;}catch(_){}}
  if(!rollout.paused&&!rollout.ended&&!rollout.seeking&&rollout.readyState>=3){
    if(inset.paused)inset.play().catch(()=>{});
  }
  else inset.pause();
}


const seekRange = document.getElementById('rollout-range');
const seekElapsed = document.getElementById('rollout-elapsed');
const seekDuration = document.getElementById('rollout-duration');
let scrubbing = false;
let scrubWasPlaying = false;
let scrubFrame = 0;
let holdPlaying = false;

function formatClock(seconds, round) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = round ? Math.round(seconds) : Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function paintSeek(seconds) {
  const duration = Number.isFinite(rollout.duration) ? rollout.duration : 0;
  const ratio = duration > 0 ? Math.min(1, Math.max(0, seconds / duration)) : 0;
  if (!scrubbing) seekRange.value = String(Math.round(ratio * 1000));
  seekRange.style.setProperty('--p', `${ratio * 100}%`);
  seekElapsed.textContent = formatClock(scrubbing ? (Number(seekRange.value) / 1000) * duration : seconds);
  seekDuration.textContent = duration ? formatClock(duration, true) : '0:00';
  seekRange.setAttribute('aria-valuetext', seekElapsed.textContent);
}

function timeFromRange() {
  const duration = Number.isFinite(rollout.duration) ? rollout.duration : 0;
  return (Number(seekRange.value) / 1000) * duration;
}

// Use the media clock so the opening follows playback, clip changes and seeks.
function paintRolloutIntro(time = rollout.currentTime) {
  const motion = !rolloutReducedMotion.matches;
  const introEnd = motion ? rolloutIntroEnd : 0.35;
  const fade = (start, end) => Math.min(1, Math.max(0, (time - start) / (end - start)));
  const titleOpacity = motion ? 1 - fade(1.0, introEnd) : Number(time < introEnd);
  const blackOpacity = motion ? 1 - fade(0.28, introEnd) : titleOpacity;
  const subtitleOpacity = motion ? fade(1.55, rolloutSubtitleReady) : 1 - titleOpacity;
  rolloutStage.classList.toggle('is-intro', time < introEnd);
  rolloutStage.style.setProperty('--rollout-title-opacity', titleOpacity);
  rolloutStage.style.setProperty('--rollout-black-opacity', blackOpacity);
  rolloutStage.style.setProperty('--rollout-subtitle-opacity', subtitleOpacity);
}

function syncRolloutIntro() {
  cancelAnimationFrame(rolloutIntroFrame);
  paintRolloutIntro();
  const end = rolloutReducedMotion.matches ? 0.35 : rolloutSubtitleReady;
  if (rollout.currentTime < end && !rollout.paused && !rollout.seeking && rollout.readyState >= 3) {
    rolloutIntroFrame = requestAnimationFrame(syncRolloutIntro);
  }
}

function syncRolloutLabel() {
  if (!rolloutPlay) return;
  const paused = rollout.paused;
  rolloutPlay.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  updateCurrentInstruction(rollout.currentTime || 0);
}

function updateCurrentInstruction(time) {
  const sourceTime = time + Number(rollout.dataset.trimStart || 0);
  const phases = ROLLOUT_PHASES[activeRollout];
  let phase = phases[0];
  for (const candidate of phases) {
    if (candidate.time > sourceTime) break;
    phase = candidate;
  }
  if (!instructionText || !phase) return;
  if (instructionText.textContent !== phase.en) {
    instructionText.textContent = phase.en;
    instructionFade?.cancel();
    if (!rolloutReducedMotion.matches && time >= rolloutSubtitleReady && !rollout.paused && !rollout.seeking) {
      instructionFade = instructionSubtitle.animate([{opacity: 0.5}, {opacity: 1}], {duration: 220, easing: 'ease-out'});
    }
  }
}

function showRolloutPlayButton(error) {
  if (error.name !== 'AbortError') rolloutStage.classList.add('show-play-control');
}

function toggleRollout() {
  if (rollout.paused) {
    ensureVideoSource(rollout);
    rollout.play().catch(showRolloutPlayButton);
  } else {
    rolloutStage.classList.add('show-play-control');
    rollout.pause();
  }
}

function seekTo(time, resume) {
  const shouldPlay = resume !== false;
  updateCurrentInstruction(time);
  const play = () => {
    holdPlaying = false;
    paintSeek(Number.isFinite(rollout.currentTime) ? rollout.currentTime : time);
    if (!shouldPlay) {
      rollout.pause();
      rolloutStage.classList.remove('is-playing');
      syncRolloutLabel();
      return;
    }
    rollout.play().catch(() => rolloutStage.classList.remove('is-playing'));
  };
  if (shouldPlay) holdPlaying = true;
  const apply = () => {
    if (Math.abs(rollout.currentTime - time) < 0.25) {
      play();
      return;
    }
    const after = () => {
      rollout.removeEventListener('seeked', after);
      updateCurrentInstruction(rollout.currentTime);
      play();
    };
    rollout.addEventListener('seeked', after);
    rollout.pause();
    try {
      rollout.currentTime = time;
    } catch (error) {
      after();
    }
  };
  if (mediaCanSeek()) {
    apply();
    return;
  }
  const before = rollout.currentTime;
  try { rollout.currentTime = time; } catch (error) { /* not seekable yet */ }
  window.setTimeout(() => {
    if (Math.abs(rollout.currentTime - time) < 0.75) {
      updateCurrentInstruction(rollout.currentTime);
      play();
      return;
    }
    try { rollout.currentTime = before; } catch (error) { /* ignore */ }
    holdPlaying = false;
    makeSeekable(time);
  }, 350);
}

function mediaCanSeek() {
  try {
    return rollout.seekable && rollout.seekable.length > 0 && rollout.seekable.end(0) > 1;
  } catch (error) {
    return false;
  }
}

let seekableTask = null;
let seekTarget = 0;
let clipGen = 0;
function makeSeekable(time) {
  seekTarget = time;
  const gen = clipGen;
  const src = rollout.dataset.src;
  if (!seekableTask) {
    seekableTask = fetch(src)
      .then(response => response.blob())
      .then(blob => new Promise(resolve => {
        if (gen !== clipGen) {
          resolve();
          return;
        }
        const rate = rollout.playbackRate;
        const paused = rollout.paused;
        if (clipUrl) URL.revokeObjectURL(clipUrl);
        clipUrl = URL.createObjectURL(blob);
        rollout.src = clipUrl;
        rollout.addEventListener('loadedmetadata', () => {
          rollout.playbackRate = rate;
          const after = () => {
            rollout.removeEventListener('seeked', after);
            updateCurrentInstruction(rollout.currentTime);
            if (!paused) rollout.play().catch(() => rolloutStage.classList.remove('is-playing'));
            resolve();
          };
          rollout.addEventListener('seeked', after);
          try {
            rollout.currentTime = seekTarget;
          } catch (error) {
            after();
          }
        }, {once: true});
      }))
      .catch(() => { seekableTask = null; });
  }
  return seekableTask;
}

const sourceReady = new Promise(resolve => {
  const done = () => resolve();
  rollout.muted = true;
  rollout.autoplay = false;
  rollout.playsInline = true;
  rollout.preload = 'none';
  if (rollout.readyState >= 1) done();
  else {
    rollout.addEventListener('loadedmetadata', done, {once: true});
    rollout.addEventListener('error', done, {once: true});
  }
});

const scrollPlays = [];

function ensureVideoSource(video) {
  if (video.dataset.poster && !video.poster) video.poster = video.dataset.poster;
  if (!video.getAttribute('src') && video.dataset.src) {
    video.preload = 'metadata';
    video.src = video.dataset.src;
  }
}

function visibleEnough(el) {
  const rect = el.getBoundingClientRect();
  if (rect.height < 8) return false;
  const viewH = window.innerHeight || document.documentElement.clientHeight;
  const shown = Math.min(rect.bottom, viewH) - Math.max(rect.top, 64);
  const need = Math.min(rect.height * 0.4, Math.max(160, viewH * 0.28));
  return shown >= need;
}

function bindScrollPlay(video, onPlayBlocked = () => {}) {
  if (!video) return;
  let userPaused = false;
  let automaticPauses = 0;
  let playPending = false;
  video.autoplay = false;
  if(video.dataset.poster){
    const posterLoader=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){video.poster=video.dataset.poster;posterLoader.disconnect();}
    },{rootMargin:'600px 0px'});
    posterLoader.observe(video);
  }
  const inView = () => !document.hidden && visibleEnough(video);
  const pauseOutside = () => {
    if (!video.paused) {
      automaticPauses += 1;
      video.pause();
    }
  };
  video.addEventListener('pause', () => {
    if (automaticPauses) {
      automaticPauses -= 1;
      return;
    }
    if (inView()) userPaused = true;
  });
  video.addEventListener('play', () => {
    userPaused = false;
    // A pending play can complete after a fast scroll away.
    if (!inView()) pauseOutside();
  });
  const sync = () => {
    if (!inView()) {
      pauseOutside();
      return;
    }
    if (userPaused || !video.paused || playPending) return;
    ensureVideoSource(video);
    playPending = true;
    video.play().catch(onPlayBlocked).finally(() => { playPending = false; });
  };
  scrollPlays.push(sync);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(sync, {threshold: [0, 0.1, 0.25, 0.4, 0.6, 1]});
    observer.observe(video);
  }
}

bindScrollPlay(rollout, showRolloutPlayButton);
bindScrollPlay(mosaic);

let videoScrollFrame = 0;
function syncScrollVideos() {
  if (videoScrollFrame) return;
  videoScrollFrame = requestAnimationFrame(() => {
    videoScrollFrame = 0;
    scrollPlays.forEach(sync => sync());
  });
}
window.addEventListener('scroll', syncScrollVideos, {passive: true});
window.addEventListener('resize', syncScrollVideos);
document.addEventListener('visibilitychange', syncScrollVideos);

function whenReady(fn) {
  ensureVideoSource(rollout);
  sourceReady.then(fn);
}

rolloutPlay.addEventListener('click', toggleRollout);
rollout.addEventListener('click', toggleRollout);
rollout.addEventListener('play', () => {
  rolloutStage.classList.add('is-playing');
  rolloutStage.classList.remove('show-play-control');
  syncRolloutLabel();
});
['loadeddata', 'playing', 'pause', 'seeking', 'seeked', 'timeupdate'].forEach(type => {
  rollout.addEventListener(type, syncRolloutIntro);
});
rolloutReducedMotion.addEventListener('change', syncRolloutIntro);
rollout.addEventListener('pause', () => {
  if (!scrubbing && !holdPlaying) rolloutStage.classList.remove('is-playing');
  syncRolloutLabel();
});
const hasRolloutFrameClock = typeof rollout.requestVideoFrameCallback === 'function';
if (hasRolloutFrameClock) {
  function syncInstructionFrame(_, {mediaTime}) {
    if (!rollout.paused && !rollout.seeking) updateCurrentInstruction(mediaTime);
    rollout.requestVideoFrameCallback(syncInstructionFrame);
  }
  rollout.requestVideoFrameCallback(syncInstructionFrame);
}
rollout.addEventListener('timeupdate', () => {
  if (!hasRolloutFrameClock || rollout.paused || rollout.seeking) updateCurrentInstruction(rollout.currentTime);
  if (!scrubbing) paintSeek(rollout.currentTime);
});
rollout.addEventListener('seeked', () => updateCurrentInstruction(rollout.currentTime));
rollout.addEventListener('loadedmetadata', () => {
  seekRange.disabled = !(Number.isFinite(rollout.duration) && rollout.duration > 0);
  paintSeek(rollout.currentTime || 0);
});
rollout.addEventListener('durationchange', () => {
  seekRange.disabled = !(Number.isFinite(rollout.duration) && rollout.duration > 0);
  if (!scrubbing) paintSeek(rollout.currentTime || 0);
});
seekRange.addEventListener('pointerdown', () => {
  scrubbing = true;
  scrubWasPlaying = !rollout.paused;
  rollout.pause();
});
seekRange.addEventListener('input', () => {
  const ratio = Number(seekRange.value) / 10;
  seekRange.style.setProperty('--p', `${ratio}%`);
  seekElapsed.textContent = formatClock(timeFromRange());
  seekRange.setAttribute('aria-valuetext', seekElapsed.textContent);
  if (!mediaCanSeek()) return;
  if (scrubFrame) return;
  scrubFrame = requestAnimationFrame(() => {
    scrubFrame = 0;
    try { rollout.currentTime = timeFromRange(); } catch (error) { /* not seekable yet */ }
    updateCurrentInstruction(rollout.currentTime);
  });
});
seekRange.addEventListener('change', () => {
  if (scrubFrame) {
    cancelAnimationFrame(scrubFrame);
    scrubFrame = 0;
  }
  const resume = scrubbing ? scrubWasPlaying : !rollout.paused;
  scrubbing = false;
  whenReady(() => seekTo(timeFromRange(), resume));
});
if (rollout.readyState >= 1) {
  seekRange.disabled = !(Number.isFinite(rollout.duration) && rollout.duration > 0);
  paintSeek(rollout.currentTime || 0);
}
speedButtons.forEach(button => {
  button.addEventListener('click', () => {
    const rate = Number(button.dataset.rate);
    speedButtons.forEach(item => item.setAttribute('aria-pressed', item === button ? 'true' : 'false'));
    whenReady(() => { rollout.playbackRate = rate; });
  });
});
['timeupdate','ratechange'].forEach(type=>rollout.addEventListener(type,()=>syncInset()));
['play','playing','pause','ended'].forEach(type=>rollout.addEventListener(type,()=>syncInset(true)));
['waiting','seeking'].forEach(type=>rollout.addEventListener(type,()=>inset.pause()));
rollout.addEventListener('seeked',()=>syncInset(true));
inset.addEventListener('loadedmetadata',()=>syncInset(true));
inset.addEventListener('canplay',()=>syncInset());
inset.addEventListener('seeked',()=>syncInset());

const rolloutCap = document.querySelector('.rollout-cap');
const rolloutPicks = [...document.querySelectorAll('.rollout-picks button')];
let clipUrl = null;

function selectRollout(button) {
  if (!button || button.getAttribute('aria-pressed') === 'true') return;
  rolloutPicks.forEach(item => {
    const on = item === button;
    item.setAttribute('aria-pressed', on ? 'true' : 'false');
    item.classList.toggle('is-on', on);
  });
  const section = document.getElementById('rollout');
  if (section) section.dataset.clip = button.dataset.clip;
  activeRollout = button.dataset.clip;
  cancelAnimationFrame(rolloutIntroFrame);
  instructionFade?.cancel();
  rolloutStage.classList.remove('show-play-control');
  paintRolloutIntro(0);
  configureInset(button);
  if (rolloutCap) rolloutCap.textContent = button.dataset.cap;
  const rate = rollout.playbackRate || 1;
  clipGen += 1;
  seekableTask = null;
  if (clipUrl) {
    URL.revokeObjectURL(clipUrl);
    clipUrl = null;
  }
  rollout.dataset.src = button.dataset.src;
  rollout.dataset.trimStart = button.dataset.trimStart || '0';
  rollout.dataset.poster = button.dataset.poster || '';
  rollout.poster = button.dataset.poster || '';
  rollout.src = button.dataset.src;
  rollout.playbackRate = rate;
  rollout.muted = true;
  updateCurrentInstruction(0);
  paintSeek(0);
  rollout.play().catch(error => {
    rolloutStage.classList.remove('is-playing');
    showRolloutPlayButton(error);
  });
}

rolloutPicks.forEach(button => {
  button.addEventListener('click', () => selectRollout(button));
});
configureInset(rolloutPicks[0]);
updateCurrentInstruction(0);

document.getElementById('pills').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  selectTask(button.dataset.task);
  const benchRow = taskPanel.parentElement;
  benchRow.scrollLeft = benchRow.scrollWidth - benchRow.clientWidth;
  const card = storyList.querySelector('.story-card.is-on');
  if (card) {
    card.querySelector('img').loading = 'eager';
    if (window.matchMedia('(max-width: 800px)').matches) {
      card.scrollIntoView({block:'nearest', inline:'nearest'});
    }
  }
});

document.getElementById('copy-bib').addEventListener('click', async () => {
  const text = document.getElementById('bibtex').textContent.trim();
  try {
    await navigator.clipboard.writeText(text);
    const button = document.getElementById('copy-bib');
    const previous = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = previous; }, 1400);
  } catch (error) { /* clipboard unavailable */ }
});

// Bring the human and T800 together as the opening scene leaves the viewport.
const heroScene = document.getElementById('hero');
const heroReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const heroDeck = heroScene?.querySelector('.hero-deck');
let heroDeckShift = 0;
let heroMotionFrame = 0;
function updateHeroMotion() {
  heroMotionFrame = 0;
  if (!heroScene) return;
  const rect = heroScene.getBoundingClientRect();
  const travel = Math.max(0, -rect.top + 64);
  const p = heroReducedMotion.matches ? 0 : Math.min(1, travel / (rect.height * .65));
  const eased = p * p * (3 - 2 * p);
  heroScene.style.setProperty('--hero-converge', `${eased * rect.width * .24}px`);
  heroScene.style.setProperty('--hero-drop', `${eased * rect.height * .24}px`);
  heroScene.style.setProperty('--hero-blur', `${eased * 10}px`);
  heroScene.style.setProperty('--hero-presence', `${1 - eased * .9}`);
  if (heroDeck) {
    // Measure its natural center without the previous frame's translation.
    // Scale is centered, so it does not change this measurement.
    const deckRect = heroDeck.getBoundingClientRect();
    const naturalCenter = (deckRect.top + deckRect.bottom) / 2 - heroDeckShift;
    const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 64;
    const visibleTop = Math.max(headerBottom, rect.top);
    const visibleBottom = Math.min(window.innerHeight, rect.bottom);
    const visibleCenter = (visibleTop + visibleBottom) / 2;
    const settle = heroReducedMotion.matches ? 0 : Math.min(1, travel / (rect.height * .3));
    const centerBlend = settle * settle * (3 - 2 * settle);
    heroDeckShift = (visibleCenter - naturalCenter) * centerBlend;
    const maxScale = Math.min(window.innerWidth <= 560 ? 1.28 : 1.85,
      (rect.width - 40) / heroDeck.offsetWidth);
    heroScene.style.setProperty('--hero-deck-y', `${heroDeckShift}px`);
    const deckScale = 1 + (maxScale - 1) * eased;
    heroScene.style.setProperty('--hero-deck-scale', `${deckScale}`);
    heroScene.style.setProperty('--hero-links-drop', `${(deckScale - 1) * heroDeck.offsetHeight / 2}px`);
  }

}
function scheduleHeroMotion() {
  if (!heroMotionFrame) heroMotionFrame = requestAnimationFrame(updateHeroMotion);
}
window.addEventListener('scroll', scheduleHeroMotion, {passive: true});
window.addEventListener('resize', scheduleHeroMotion, {passive: true});
heroReducedMotion.addEventListener('change', scheduleHeroMotion);
document.fonts?.ready.then(scheduleHeroMotion);
updateHeroMotion();

const progress = document.getElementById('progress');
function onScroll() {
  const height = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${height > 0 ? (window.scrollY / height) * 100 : 0}%`;
  const hero = document.getElementById('hero');
  document.body.classList.toggle('on-hero', hero ? hero.getBoundingClientRect().bottom > 72 : false);
  const links = [...document.querySelectorAll('.toc a')];
  const line = parseFloat(getComputedStyle(document.getElementById('intro')).scrollMarginTop) + 8;
  let current = null;
  links.forEach(link => {
    const section = document.querySelector(link.getAttribute('href'));
    if (section && section.getBoundingClientRect().top <= line) current = link;
  });
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
  if (atBottom) current = links[links.length - 1];
  links.forEach(link => link.setAttribute('aria-current', link === current ? 'true' : 'false'));
}

window.addEventListener('scroll', onScroll, {passive:true});
window.addEventListener('resize', onScroll);
requestAnimationFrame(() => document.body.classList.add('ready'));
selectTask(selected, false);
onScroll();

const scaleStill = document.getElementById('scale-still');
const scaleFrameEl = document.getElementById('scale-frame');
const scaleReplay = document.getElementById('scale-replay');
const scaleImage = scaleStill.querySelector('img');
const scaleMobileSource = scaleStill.querySelector('source');
const scaleLayout = window.matchMedia(scaleMobileSource.media);
const scaleReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let scaleSvg = null;
let scaleAnim = 0;
let scaleRequest;
let scalePlayed = false;

const scaleWatch = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  if (scaleSvg && entries.some(entry => entry.intersectionRatio >= 0.35)) playScale();
}, {threshold: 0.35}) : null;

function paintScale(progress) {
  if (!scaleSvg) return;
  scaleSvg.querySelectorAll('.scale-reveal').forEach(rect => {
    rect.setAttribute('width', String(Number(rect.dataset.width) * progress));
  });
}

function playScale() {
  cancelAnimationFrame(scaleAnim);
  if (!scaleSvg) return;
  scalePlayed = true;
  scaleWatch?.disconnect();
  if (scaleReducedMotion.matches) {
    paintScale(1);
    return;
  }
  const started = performance.now();
  const dur = 2800;
  const tick = now => {
    const p = Math.min(1, (now - started) / dur);
    paintScale(1 - Math.pow(1 - p, 2));
    if (p < 1) scaleAnim = requestAnimationFrame(tick);
  };
  paintScale(0);
  scaleAnim = requestAnimationFrame(tick);
}

function loadScaleFigure() {
  scaleRequest?.abort();
  const request = new AbortController();
  scaleRequest = request;
  cancelAnimationFrame(scaleAnim);
  scaleSvg?.remove();
  scaleSvg = null;
  scaleStill.hidden = false;
  scaleReplay.hidden = true;
  const src = scaleLayout.matches ? scaleMobileSource.srcset : scaleImage.src;
  fetch(src, {signal: request.signal})
    .then(response => {
      if (!response.ok) throw new Error('scale svg');
      return response.text();
    })
    .then(text => {
      if (request.signal.aborted) return;
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg || doc.querySelector('parsererror')) return;
      svg.setAttribute('aria-label', scaleImage.alt);
      scaleStill.hidden = true;
      scaleFrameEl.append(svg);
      scaleSvg = svg;
      scaleReplay.hidden = false;
      if (!scalePlayed) {
        if (!scaleReducedMotion.matches) paintScale(0);
        if (scaleWatch) scaleWatch.observe(scaleFrameEl);
        else playScale();
      }
    })
    .catch(() => {});
}

if (scaleWatch) {
  const scaleLoader=new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)){scaleLoader.disconnect();loadScaleFigure();}
  },{rootMargin:'600px 0px'});
  scaleLoader.observe(scaleFrameEl);
} else {
  loadScaleFigure();
}
scaleLayout.addEventListener('change', () => {
  if (scaleRequest) loadScaleFigure();
});
scaleReplay.addEventListener('click', playScale);
