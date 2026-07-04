// ── Supabase setup ───────────────────────────────────────────────────────
// 1. Go to your Supabase project → Settings → API
// 2. Paste your Project URL and anon/public key below
// 3. Run the SQL in supabase-setup.sql (included alongside this file) once,
//    in the Supabase SQL editor, to create the "profiles" table + policies.
const SUPABASE_URL = 'https://vigjumdpadyslbcvjeel.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qkYURGAEv7vAgFXwFzgsdQ_VU0g6dZr';

let supabaseClient = null;
try {
  if (window.supabase && SUPABASE_URL.startsWith('http')) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) { console.warn('Supabase not configured yet:', e); }

// ── State ─────────────────────────────────────────────────────────────────
const bgMusic = new Audio('./assets/audio/cafe-music.mp3');

bgMusic.loop = true;
bgMusic.volume = 0.25;

const S = {
  cup:'mug', base:'coffee', addons:[], drink:'cappuccino',
  recipeName:'', subject:'', task:'', username:'',
  duration:25, timerSecs:0, timerTotal:0,
  timerRunning:false, timerIv:null, focusActive:false, pendingPage:null,
  recipes: JSON.parse(localStorage.getItem('bf_recipes')||'[]'),
  sharedRecipes: JSON.parse(localStorage.getItem('bf_shared')||'[]'),
  rooms: JSON.parse(localStorage.getItem('bf_rooms')||'[]'),
  recipeTab:'mine',
  recipePage:0, recipeSearch:'', recipeSubject:'', recipeSort:'newest', quickTab:'all',
  ambience: localStorage.getItem('bf_ambience') || 'cozy-cafe',
  soundOn: localStorage.getItem('bf_sound') !== 'off',
  joinRoomId:null, modalBase:'coffee',
  authTab:'signin', user:null
};

const DRINKS = {
  'cappuccino': {label:'Cappuccino', cup:'teacup', base:'coffee', addons:['vanilla'], temp:'hot'},
  'matcha-latte': {label:'Matcha Latte', cup:'glass', base:'matcha', addons:['vanilla'], temp:'hot'},
  'mocha': {label:'Mocha', cup:'mug', base:'chocolate', addons:['whipped','cinnamon'], temp:'hot'},
  'hot-chocolate': {label:'Hot Chocolate', cup:'mug', base:'chocolate', addons:['marshmallow','whipped'], temp:'hot'},
  'black-coffee': {label:'Black Coffee', cup:'mug', base:'coffee', addons:[], temp:'hot'},
  'milk-tea': {label:'Milk Tea', cup:'teacup', base:'tea', addons:['boba'], temp:'hot'},
  'caramel-latte': {label:'Caramel Latte', cup:'glass', base:'coffee', addons:['caramel','vanilla'], temp:'hot'},
  'vanilla-latte': {label:'Vanilla Latte', cup:'glass', base:'coffee', addons:['vanilla'], temp:'hot'},
  'honey-tea': {label:'Honey Tea', cup:'teacup', base:'tea', addons:['honey'], temp:'hot'},
  'iced-americano': {label:'Iced Americano', cup:'glass', base:'coffee', addons:['ice'], temp:'cold'}
};

// ── Color maps ────────────────────────────────────────────────────────────
const BC = {
  coffee:    { liq:'#7B5535', liq2:'#5A3A20', liq3:'#A07040', foam:'#D4AA7A', foamH:'#EDD9A3', steam:'rgba(240,220,195,0.7)', shadow:'rgba(90,58,32,0.4)' },
  matcha:    { liq:'#7FA85A', liq2:'#5A7A3A', liq3:'#A8C880', foam:'#B8D890', foamH:'#D8F0B8', steam:'rgba(180,215,150,0.6)', shadow:'rgba(80,110,50,0.35)' },
  tea:       { liq:'#C08040', liq2:'#9A6020', liq3:'#E0A860', foam:'#E8C898', foamH:'#F8E8C8', steam:'rgba(230,200,155,0.6)', shadow:'rgba(150,100,40,0.35)' },
  chocolate: { liq:'#4A2818', liq2:'#301408', liq3:'#6A3828', foam:'#7A4830', foamH:'#A07050', steam:'rgba(180,130,100,0.6)', shadow:'rgba(50,20,10,0.45)' }
};

// ── Build cup SVG (old watercolour art style) ─────────────────────────────
function buildCupSVG(opts={}) {
  const {
    size=200, fillFraction=1, steam=true,
    cup=S.cup, base=S.base, addons=S.addons, drink=S.drink
  } = opts;
  const C = BC[base]||BC.coffee;
  const H = Math.round(size*1.35);
  const cx = size/2;
  const uid = 'c'+Math.random().toString(36).slice(2,7);

  // ── Cup geometry ──────────────────────────────────────────────────────
  const shapes = {
    mug: {
      // outer silhouette
      outer: `M${cx-52},45 C${cx-54},45 ${cx-56},47 ${cx-55},50 L${cx-44},${H-48} C${cx-42},${H-34} ${cx-18},${H-22} ${cx},${H-22} C${cx+18},${H-22} ${cx+42},${H-34} ${cx+44},${H-48} L${cx+55},50 C${cx+56},47 ${cx+54},45 ${cx+52},45 Z`,
      // inner liquid zone
      lx:cx-44, ly:58, lw:88,
      innerBottom: H-28,
      // handle
      handle:`M${cx+48},75 C${cx+72},75 ${cx+78},90 ${cx+78},115 C${cx+78},140 ${cx+72},152 ${cx+48},152`,
      // rim ellipse
      rim:`<ellipse cx="${cx}" cy="47" rx="52" ry="10" fill="${C.foamH}" fill-opacity="0.55" stroke="${C.liq2}" stroke-width="1.5"/>`,
      // saucer
      saucer:'',
      // highlight
      hl:`M${cx-38},65 C${cx-34},80 ${cx-32},110 ${cx-33},140`,
    },
    teacup: {
      outer:`M${cx-44},52 C${cx-46},52 ${cx-48},54 ${cx-47},57 L${cx-37},${H-52} C${cx-35},${H-38} ${cx-16},${H-26} ${cx},${H-26} C${cx+16},${H-26} ${cx+35},${H-38} ${cx+37},${H-52} L${cx+47},57 C${cx+48},54 ${cx+46},52 ${cx+44},52 Z`,
      lx:cx-37, ly:64, lw:74,
      innerBottom:H-32,
      handle:`M${cx+40},70 C${cx+60},70 ${cx+65},88 ${cx+65},108 C${cx+65},128 ${cx+60},140 ${cx+40},140`,
      rim:`<ellipse cx="${cx}" cy="54" rx="44" ry="8" fill="${C.foamH}" fill-opacity="0.5" stroke="${C.liq2}" stroke-width="1.5"/>`,
      saucer:`<ellipse cx="${cx}" cy="${H-26}" rx="58" ry="9" fill="${C.liq3}" fill-opacity="0.35" stroke="${C.liq2}" stroke-width="1.2"/>`,
      hl:`M${cx-32},72 C${cx-28},88 ${cx-27},112 ${cx-28},134`,
    },
    glass: {
      outer:`M${cx-36},28 L${cx-46},${H-38} L${cx+46},${H-38} L${cx+36},28 Z`,
      lx:cx-34, ly:35, lw:68,
      innerBottom:H-42,
      handle:'',
      rim:`<rect x="${cx-38}" y="23" width="76" height="10" rx="4" fill="${C.foamH}" fill-opacity="0.6" stroke="${C.liq2}" stroke-width="1.2"/>`,
      saucer:'',
      hl:`M${cx-26},42 C${cx-22},70 ${cx-22},100 ${cx-24},130`,
    },
    takeaway: {
      outer:`M${cx-36},46 L${cx-30},30 L${cx+30},30 L${cx+36},46 L${cx+44},${H-40} L${cx-44},${H-40} Z`,
      lx:cx-38, ly:56, lw:76,
      innerBottom:H-44,
      handle:'',
      rim:`<rect x="${cx-38}" y="26" width="76" height="22" rx="4" fill="${C.liq2}" fill-opacity="0.7" stroke="${C.liq2}" stroke-width="1.5"/>`,
      saucer:'',
      hl:`M${cx-28},60 C${cx-24},82 ${cx-23},108 ${cx-25},130`,
    }
  };
  const sh = shapes[cup]||shapes.mug;
  const lx=sh.lx, lw=sh.lw;
  const liquidAvail = sh.innerBottom - sh.ly;
  const fillH = Math.max(0, liquidAvail * fillFraction);
  const fillY = sh.ly + (liquidAvail - fillH);

  // ── Addon presence ─────────────────────────────────────────────────────
  const hasWhipped   = addons.includes('whipped');
  const hasCaramel   = addons.includes('caramel');
  const hasHoney     = addons.includes('honey');
  const hasCinnamon  = addons.includes('cinnamon');
  const hasMarshmallow = addons.includes('marshmallow');
  const hasBoba      = addons.includes('boba');
  const hasVanilla   = addons.includes('vanilla');
  const hasIce       = addons.includes('ice') || (DRINKS[drink] && DRINKS[drink].temp==='cold');

  // Top of liquid surface Y
  const surfaceY = fillH > 0 ? fillY : sh.ly;

  // ── Whipped cream (billowy mounds) ────────────────────────────────────
  const whippedCream = (hasWhipped && fillFraction > 0.05) ? `
    <g clip-path="url(#${uid}-cup)">
      <!-- whipped cream base mound -->
      <ellipse cx="${lx+lw*0.5}" cy="${surfaceY-2}" rx="${lw*0.42}" ry="12" fill="white" fill-opacity="0.92"/>
      <ellipse cx="${lx+lw*0.35}" cy="${surfaceY-8}" rx="${lw*0.25}" ry="10" fill="white" fill-opacity="0.88"/>
      <ellipse cx="${lx+lw*0.65}" cy="${surfaceY-6}" rx="${lw*0.22}" ry="9" fill="white" fill-opacity="0.85"/>
      <ellipse cx="${lx+lw*0.5}" cy="${surfaceY-14}" rx="${lw*0.28}" ry="9" fill="white" fill-opacity="0.9"/>
      <ellipse cx="${lx+lw*0.5}" cy="${surfaceY-21}" rx="${lw*0.16}" ry="7" fill="white" fill-opacity="0.85"/>
      <!-- cream shading -->
      <ellipse cx="${lx+lw*0.38}" cy="${surfaceY-5}" rx="${lw*0.15}" ry="5" fill="${C.foam}" fill-opacity="0.45"/>
      <ellipse cx="${lx+lw*0.62}" cy="${surfaceY-3}" rx="${lw*0.12}" ry="4" fill="${C.foam}" fill-opacity="0.35"/>
      <!-- highlight on cream -->
      <ellipse cx="${lx+lw*0.44}" cy="${surfaceY-18}" rx="${lw*0.07}" ry="3" fill="white" fill-opacity="0.9"/>
    </g>` : '';

  // ── Vanilla foam (thinner airy layer) ────────────────────────────────
  const vanillaFoam = (!hasWhipped && hasVanilla && fillFraction > 0.05) ? `
    <g clip-path="url(#${uid}-cup)">
      <ellipse cx="${lx+lw*0.5}" cy="${surfaceY+1}" rx="${lw*0.45}" ry="7" fill="${C.foamH}" fill-opacity="0.85"/>
      <ellipse cx="${lx+lw*0.5}" cy="${surfaceY-4}" rx="${lw*0.35}" ry="5" fill="white" fill-opacity="0.6"/>
      <!-- tiny bubbles -->
      <circle cx="${lx+lw*0.3}" cy="${surfaceY}" r="2.5" fill="white" fill-opacity="0.7"/>
      <circle cx="${lx+lw*0.6}" cy="${surfaceY-1}" r="2" fill="white" fill-opacity="0.65"/>
      <circle cx="${lx+lw*0.45}" cy="${surfaceY-2}" r="1.5" fill="white" fill-opacity="0.6"/>
    </g>` : '';

  const iceCubes = hasIce && fillFraction > 0.08 ? `
    <g clip-path="url(#${uid}-cup)" opacity="${0.25 + fillFraction*0.65}">
      <rect x="${lx+9}" y="${surfaceY+10}" width="${14*fillFraction+5}" height="${12*fillFraction+4}" rx="3" fill="#f6fbff" fill-opacity="0.72" transform="rotate(-16 ${lx+15} ${surfaceY+16})"/>
      <rect x="${lx+35}" y="${surfaceY+6}" width="${12*fillFraction+5}" height="${11*fillFraction+4}" rx="3" fill="#e9f6fb" fill-opacity="0.66" transform="rotate(14 ${lx+40} ${surfaceY+12})"/>
      <rect x="${lx+58}" y="${surfaceY+15}" width="${11*fillFraction+4}" height="${10*fillFraction+4}" rx="3" fill="#f8fdff" fill-opacity="0.62" transform="rotate(-7 ${lx+62} ${surfaceY+20})"/>
    </g>` : '';

  // ── Boba pearls ───────────────────────────────────────────────────────
  const bobaCount = 5;
  const bobaPearls = hasBoba && fillH > 20 ? Array.from({length:bobaCount},(_, i)=>{
    const bx = lx + 12 + (i*14);
    const by = sh.innerBottom - 16 + (i%2)*8;
    return `<circle cx="${bx}" cy="${by}" r="6" fill="#1A0A04" fill-opacity="0.85" clip-path="url(#${uid}-cup)"/>
            <circle cx="${bx-2}" cy="${by-2}" r="2" fill="#4A2418" fill-opacity="0.5" clip-path="url(#${uid}-cup)"/>`;
  }).join('') : '';

  // ── Marshmallows ──────────────────────────────────────────────────────
  const marshBits = hasMarshmallow && fillFraction > 0.08 ? `
    <g clip-path="url(#${uid}-cup)">
      <rect x="${lx+8}"  y="${surfaceY+4}"  width="13" height="10" rx="4" fill="white" fill-opacity="0.9"/>
      <rect x="${lx+28}" y="${surfaceY+2}"  width="11" height="9"  rx="3" fill="white" fill-opacity="0.88"/>
      <rect x="${lx+48}" y="${surfaceY+5}"  width="12" height="9"  rx="4" fill="#FFF0F0" fill-opacity="0.9"/>
      <rect x="${lx+66}" y="${surfaceY+3}"  width="10" height="8"  rx="3" fill="white" fill-opacity="0.85"/>
      <!-- shading on marshmallows -->
      <rect x="${lx+8}"  y="${surfaceY+10}" width="13" height="4" rx="2" fill="${C.foam}" fill-opacity="0.25"/>
      <rect x="${lx+48}" y="${surfaceY+11}" width="12" height="3" rx="2" fill="${C.foam}" fill-opacity="0.2"/>
    </g>` : '';

  // ── Caramel drizzle ───────────────────────────────────────────────────
  const caramelDrizzle = hasCaramel && fillFraction > 0.05 ? `
    <g clip-path="url(#${uid}-cup)">
      <path d="M${lx+10},${surfaceY-2} Q${lx+22},${surfaceY+6} ${lx+40},${surfaceY+1} Q${lx+58},${surfaceY-4} ${lx+lw-12},${surfaceY+4}" stroke="#C8842A" stroke-width="2.8" fill="none" stroke-linecap="round" opacity="0.85"/>
      <path d="M${lx+20},${surfaceY+6} Q${lx+35},${surfaceY+14} ${lx+55},${surfaceY+8}" stroke="#E09A3A" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.65"/>
    </g>` : '';

  // ── Honey swirl ───────────────────────────────────────────────────────
  const honeySwirl = hasHoney && fillFraction > 0.05 ? `
    <g clip-path="url(#${uid}-cup)">
      <path d="M${lx+lw*0.5},${surfaceY+2} m-18,0 a18,5 0 1,1 36,0" stroke="#D4A020" stroke-width="2.5" fill="none" opacity="0.8" stroke-linecap="round"/>
      <circle cx="${lx+lw*0.5}" cy="${surfaceY+2}" r="3.5" fill="#E8B030" fill-opacity="0.7"/>
    </g>` : '';

  // ── Cinnamon sprinkle ─────────────────────────────────────────────────
  const cinnamonSpots = hasCinnamon && fillFraction > 0.05 ? (() => {
    const spots = [[lx+14,surfaceY+5,2.2],[lx+28,surfaceY+2,1.8],[lx+44,surfaceY+7,2],[lx+60,surfaceY+3,1.8],[lx+38,surfaceY+10,1.5],[lx+22,surfaceY+12,1.6]];
    return `<g clip-path="url(#${uid}-cup)">${spots.map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="${r*1.5}" ry="${r*0.7}" fill="#8B3A10" fill-opacity="${0.55+Math.random()*0.2}" transform="rotate(${Math.random()*60-30},${x},${y})"/>`).join('')}</g>`;
  })() : '';

  // ── Natural liquid surface (slightly wavy) ────────────────────────────
  const surfaceWave = fillH > 4 ? `
    <path d="M${lx+2},${surfaceY+3} Q${lx+lw*0.25},${surfaceY-2} ${lx+lw*0.5},${surfaceY+3} Q${lx+lw*0.75},${surfaceY+7} ${lx+lw-2},${surfaceY+3}"
      stroke="${C.foam}" stroke-width="1.5" fill="none" stroke-opacity="0.5" clip-path="url(#${uid}-cup)"/>` : '';

  // ── Watercolour liquid layers ─────────────────────────────────────────
  const liquidLayers = fillH > 0 ? `
    <!-- base liquid -->
    <rect x="${lx}" y="${fillY}" width="${lw}" height="${fillH+2}" fill="${C.liq}" clip-path="url(#${uid}-cup)"/>
    <!-- darker depth at bottom -->
    <rect x="${lx}" y="${sh.innerBottom - Math.min(fillH, liquidAvail)*0.35}" width="${lw}" height="${Math.min(fillH, liquidAvail)*0.35 + 2}" fill="${C.liq2}" fill-opacity="0.55" clip-path="url(#${uid}-cup)"/>
    <!-- lighter surface layer -->
    <rect x="${lx}" y="${fillY}" width="${lw}" height="${Math.min(fillH*0.2, 18)}" fill="${C.liq3}" fill-opacity="0.4" clip-path="url(#${uid}-cup)"/>
    <!-- meniscus / light edge -->
    <ellipse cx="${lx+lw*0.5}" cy="${surfaceY+3}" rx="${lw*0.44}" ry="5" fill="${C.foam}" fill-opacity="0.3" clip-path="url(#${uid}-cup)"/>
    ` : '';

  // ── Plain coffee foam (if no other topping) ───────────────────────────
  const plainFoam = (!hasWhipped && !hasVanilla && fillFraction > 0.85 && (base==='coffee'||base==='matcha')) ? `
    <ellipse cx="${lx+lw*0.5}" cy="${surfaceY+2}" rx="${lw*0.43}" ry="8" fill="${C.foam}" fill-opacity="0.7" clip-path="url(#${uid}-cup)"/>
    <ellipse cx="${lx+lw*0.5}" cy="${surfaceY-1}" rx="${lw*0.3}" ry="5" fill="${C.foamH}" fill-opacity="0.5" clip-path="url(#${uid}-cup)"/>
    ` : '';

  // ── Cup body watercolour shading ──────────────────────────────────────
  const cupBody = `
    <!-- cup shadow / base fill -->
    <path d="${sh.outer}" fill="${C.liq2}" fill-opacity="0.18"/>
    <!-- cup light side -->
    <path d="${sh.outer}" fill="${C.foamH}" fill-opacity="0.08"/>
  `;

  // ── Highlight stroke on cup ───────────────────────────────────────────
  const cupHL = `<path d="${sh.hl}" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-opacity="0.22" clip-path="url(#${uid}-cup)"/>`;

  // ── Steam wisps (organic curving paths) ───────────────────────────────
  const steamPaths = (steam && fillFraction > 0.08) ? [
    {dx:-16, delay:'0s', dur:'2.8s'},
    {dx:0,   delay:'1s', dur:'3.2s'},
    {dx:14,  delay:'1.9s', dur:'2.6s'}
  ].map(({dx,delay,dur},i)=>`
    <path d="M${cx+dx},${sh.ly-8} C${cx+dx+6},${sh.ly-22} ${cx+dx-7},${sh.ly-36} ${cx+dx+4},${sh.ly-52} C${cx+dx+12},${sh.ly-66} ${cx+dx-5},${sh.ly-80} ${cx+dx+3},${sh.ly-95}" stroke="${C.steam}" stroke-width="${2-i*0.3}" fill="none" stroke-linecap="round">
      <animate attributeName="opacity" values="0;0.75;0.4;0" dur="${dur}" begin="${delay}" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="translate" values="0,0;${4-i},${-8}" dur="${dur}" begin="${delay}" repeatCount="indefinite"/>
    </path>`).join('') : '';

  return `<svg width="${size}" height="${H}" viewBox="0 0 ${size} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="${uid}-cup"><path d="${sh.outer}"/></clipPath>
  </defs>

  <!-- drop shadow -->
  <ellipse cx="${cx}" cy="${H-12}" rx="${size*0.38}" ry="9" fill="${C.shadow}" fill-opacity="0.6"/>

  <!-- cup body watercolour base -->
  ${cupBody}

  <!-- liquid layers -->
  ${liquidLayers}

  <!-- surface wave -->
  ${surfaceWave}

  <!-- plain foam -->
  ${plainFoam}

  <!-- add-ons below whipped cream -->
  ${bobaCount ? bobaPearls : ''}
  ${iceCubes}
  ${marshBits}
  ${caramelDrizzle}
  ${honeySwirl}
  ${cinnamonSpots}

  <!-- whipped cream / vanilla on top -->
  ${vanillaFoam}
  ${whippedCream}

  <!-- cup outline (drawn over liquid) -->
  <path d="${sh.outer}" stroke="${C.liq2}" stroke-width="2.2" fill="none" stroke-linejoin="round"/>
  ${sh.handle ? `<path d="${sh.handle}" stroke="${C.liq2}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` : ''}
  ${sh.rim}
  ${sh.saucer}

  <!-- highlight -->
  ${cupHL}

  <!-- steam -->
  ${steamPaths}
</svg>`;
}

// ── Nav ───────────────────────────────────────────────────────────────────
function showPage(name) {
  if(S.focusActive && name!=='study'){
    S.pendingPage=name;
    document.getElementById('leave-modal').classList.add('open');
    playPageSound('close');
    return;
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.remove('active'));
  const nl = document.getElementById('nl-'+name);
  if(nl) nl.classList.add('active');
  if(name==='brew') renderCupPreview();
  if(name==='recipes') renderRecipes();
  if(name==='cafe') renderRooms();
  if(name==='home') renderHeroCup();
}

function renderHeroCup(){
  const el = document.getElementById('hero-cup');
  if(el) el.innerHTML = buildCupSVG({size:180,fillFraction:1,steam:true,drink:'caramel-latte',cup:'glass',base:'coffee',addons:['caramel','vanilla']});
}
function renderCupPreview(){
  const el = document.getElementById('cup-preview');
  if(el) el.innerHTML = `<div style="font-family:'Caveat',cursive;color:var(--gold);font-size:1.15rem;margin-bottom:-0.7rem;">${DRINKS[S.drink]?.label||'Custom Brew'}</div>` + buildCupSVG({size:230,fillFraction:1,steam:true,drink:S.drink});
}

function applyDrinkPreset(key){
  const d=DRINKS[key]||DRINKS.cappuccino;
  S.drink=key; S.cup=d.cup; S.base=d.base; S.addons=[...d.addons];
  document.querySelectorAll('[data-group="drink"]').forEach(c=>c.classList.toggle('sel', c.dataset.val===key));
  document.querySelectorAll('[data-group="cup"]').forEach(c=>c.classList.toggle('sel', c.dataset.val===S.cup));
  document.querySelectorAll('[data-group="base"]').forEach(c=>c.classList.toggle('sel', c.dataset.val===S.base));
  document.querySelectorAll('[data-group="addons"]').forEach(c=>c.classList.toggle('sel', S.addons.includes(c.dataset.val)));
  const name=document.getElementById('recipe-name');
  if(name && !name.value) name.placeholder=`Name your ${d.label.toLowerCase()}...`;
  renderCupPreview();
}

let audioCtx=null, masterGain=null, ambientNodes=[];
const ambientProfiles={
  'cozy-cafe':{hum:180, noise:0.020, pulse:0.18},
  'rainy-bookstore':{hum:140, noise:0.035, pulse:0.10},
  'vintage-library':{hum:110, noise:0.014, pulse:0.08},
  'fireplace':{hum:95, noise:0.028, pulse:0.22},
  'midnight-cafe':{hum:155, noise:0.018, pulse:0.12},
  'kyoto-tea':{hum:220, noise:0.012, pulse:0.16},
  'autumn-coffee':{hum:165, noise:0.024, pulse:0.14},
  'forest-cabin':{hum:125, noise:0.030, pulse:0.11},
  'ocean-waves':{hum:75, noise:0.040, pulse:0.09},
  'white-noise':{hum:60, noise:0.055, pulse:0.04}
};
function initAudio(){
  if(audioCtx) return;
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  masterGain=audioCtx.createGain();
  masterGain.gain.value=S.soundOn?0.16:0;
  masterGain.connect(audioCtx.destination);
  startAmbience(S.ambience);
}
function startAmbience(name){
  if(!audioCtx) return;
  ambientNodes.forEach(n=>{try{n.stop&&n.stop();}catch(e){} try{n.disconnect&&n.disconnect();}catch(e){}});
  ambientNodes=[];
  const p=ambientProfiles[name]||ambientProfiles['cozy-cafe'];
  const osc=audioCtx.createOscillator(), gain=audioCtx.createGain(), lfo=audioCtx.createOscillator(), lfoGain=audioCtx.createGain();
  osc.type='sine'; osc.frequency.value=p.hum; gain.gain.value=0.05;
  lfo.frequency.value=p.pulse; lfoGain.gain.value=0.025; lfo.connect(lfoGain); lfoGain.connect(gain.gain);
  osc.connect(gain); gain.connect(masterGain); osc.start(); lfo.start();
  const buffer=audioCtx.createBuffer(1, audioCtx.sampleRate*2, audioCtx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*p.noise;
  const noise=audioCtx.createBufferSource(), ng=audioCtx.createGain(), filter=audioCtx.createBiquadFilter();
  noise.buffer=buffer; noise.loop=true; filter.type='lowpass'; filter.frequency.value=name==='white-noise'?1800:650;
  ng.gain.value=0.18; noise.connect(filter); filter.connect(ng); ng.connect(masterGain); noise.start();
  ambientNodes=[osc,lfo,noise,gain,ng,filter];
}
function setAmbience(name){
  S.ambience=name; localStorage.setItem('bf_ambience',name);
  initAudio(); startAmbience(name);
}
function toggleSound() {
  S.soundOn = !S.soundOn;

  localStorage.setItem(
    'bf_sound',
    S.soundOn ? 'on' : 'off'
  );

  document
    .getElementById('sound-toggle')
    .classList.toggle('on', S.soundOn);

  if (S.soundOn) {
    bgMusic.play();
  } else {
    bgMusic.pause();
  }
}
function playPageSound(type='turn'){
  initAudio(); if(!S.soundOn) return;
  const src=audioCtx.createBufferSource(), g=audioCtx.createGain(), buffer=audioCtx.createBuffer(1, audioCtx.sampleRate*0.18, audioCtx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length)*0.15;
  src.buffer=buffer; g.gain.value=type==='open'?0.22:0.12; src.connect(g); g.connect(masterGain); src.start();
}

// ── Chips ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    const g = chip.dataset.group, v = chip.dataset.val;
    if(!g||!v) return;
    initAudio();
    if(g==='drink'){
      applyDrinkPreset(v);
    } else if(g==='addons'){
      chip.classList.toggle('sel');
      S.addons = chip.classList.contains('sel')
        ? [...new Set([...S.addons,v])]
        : S.addons.filter(x=>x!==v);
    } else if(g==='modal-base'){
      document.querySelectorAll('[data-group="modal-base"]').forEach(c=>c.classList.remove('sel'));
      chip.classList.add('sel'); S.modalBase=v;
    } else {
      document.querySelectorAll(`[data-group="${g}"]`).forEach(c=>c.classList.remove('sel'));
      chip.classList.add('sel'); S[g]=v;
    }
    if(g!=='modal-base' && g!=='drink') renderCupPreview();
  });
});

// ── Session ───────────────────────────────────────────────────────────────
function startSession(){
  initAudio();
  setAmbience(document.getElementById('field-ambience').value || S.ambience);
  S.recipeName = document.getElementById('recipe-name').value || 'Unnamed Brew';
  S.username   = document.getElementById('field-username').value || (S.user?.username) || 'Me';
  S.subject    = document.getElementById('field-subject').value || 'General Study';
  S.task       = document.getElementById('field-task').value || 'Focus session';
  S.duration   = parseInt(document.getElementById('field-duration').value);
  S.timerSecs  = S.duration*60; S.timerTotal = S.timerSecs;
  S.timerRunning=false; S.focusActive=true;
  document.querySelector('.nav').classList.add('focus-locked');
  document.getElementById('page-study').classList.add('focus-mode');
  document.getElementById('study-sub-lbl').textContent = S.subject;
  document.getElementById('study-task-lbl').textContent = S.task;
  document.getElementById('ambient-lbl').textContent = 'Your brew is ready. Press play to begin.';
  document.getElementById('play-btn').textContent='▶';
  renderTimerCup(); updateTimerDisp(); showPage('study');
}

function renderTimerCup(f){
  const frac = f!==undefined?f:1;
  const el = document.getElementById('timer-cup-area');
  if(el) el.innerHTML = buildCupSVG({size:260,fillFraction:frac,steam:frac>0.12});
}
function updateTimerDisp(){
  const m=Math.floor(S.timerSecs/60), s=S.timerSecs%60;
  document.getElementById('time-disp').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function toggleTimer(){
  if(S.timerRunning){
    clearInterval(S.timerIv); S.timerRunning=false;
    document.getElementById('play-btn').textContent='▶';
    document.getElementById('ambient-lbl').textContent='Paused. Your brew is waiting…';
  } else {
    S.timerRunning=true;
    document.getElementById('play-btn').textContent='⏸';
    document.getElementById('ambient-lbl').textContent='Brewing… let the time flow.';
    S.timerIv=setInterval(()=>{
      if(S.timerSecs<=0){clearInterval(S.timerIv);S.timerRunning=false;finishSession();return;}
      S.timerSecs--;
      const f=S.timerSecs/S.timerTotal;
      updateTimerDisp(); renderTimerCup(f);
      if(S.timerSecs===Math.floor(S.timerTotal*0.5)) document.getElementById('ambient-lbl').textContent='Halfway — your brew is halfway empty.';
      if(S.timerSecs===Math.floor(S.timerTotal*0.25)) document.getElementById('ambient-lbl').textContent='Almost there… savour the last sips.';
    },1000);
  }
}
function resetSession(){
  clearInterval(S.timerIv); S.timerRunning=false; S.timerSecs=S.timerTotal;
  document.getElementById('play-btn').textContent='▶';
  document.getElementById('ambient-lbl').textContent='Your brew is ready. Press play to begin.';
  renderTimerCup(1); updateTimerDisp();
}
function finishSession(){
  clearInterval(S.timerIv); S.timerRunning=false;
  S.focusActive=false;
  document.querySelector('.nav').classList.remove('focus-locked');
  document.getElementById('page-study').classList.remove('focus-mode');
  document.getElementById('play-btn').textContent='▶';
  const elapsed=S.timerTotal-S.timerSecs;
  const mins=Math.round(elapsed/60)||1;
  const now=new Date();
  const dateStr=now.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const recipe={id:Date.now(),_ts:Date.now(),name:S.recipeName,cup:S.cup,base:S.base,drink:S.drink,addons:[...S.addons],
    subject:S.subject,task:S.task,duration:mins,date:dateStr,username:S.username||'Me',favorite:false,shared:false};
  S.recipes.unshift(recipe);
  localStorage.setItem('bf_recipes',JSON.stringify(S.recipes));
  if(S.user){ saveRecipeToCloud(recipe); } // fire-and-forget — recipe is already safe locally either way
  showToast('✓ Session saved to your recipe book!');
  renderTimerCup(0);
  document.getElementById('ambient-lbl').textContent=`${mins} min brewed. Beautiful. ☕`;
  setTimeout(()=>showPage('recipes'),2200);
}

function requestEndSession(){
  if(S.focusActive){
    document.getElementById('leave-modal').classList.add('open');
    playPageSound('close');
  } else {
    finishSession();
  }
}
function continueStudying(){
  document.getElementById('leave-modal').classList.remove('open');
  S.pendingPage=null;
}
function confirmEndSession(){
  document.getElementById('leave-modal').classList.remove('open');
  const target=S.pendingPage;
  S.pendingPage=null;
  finishSession();
  if(target) setTimeout(()=>showPage(target),300);
}

// ── Study Café / Rooms ────────────────────────────────────────────────────
function saveRooms(){ localStorage.setItem('bf_rooms',JSON.stringify(S.rooms)); }

function createRoom(){
  const name = document.getElementById('room-name').value.trim();
  const user = document.getElementById('room-username').value.trim();
  if(!name){ showToast('Give your table a name ☕'); return; }
  if(!user){ showToast('Tell us your name first!'); return; }
  const base = S.modalBase||'coffee';
  const room = {
    id:Date.now(), name, members:[{username:user,base,cup:'mug',addons:[]}],
    created:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}),
    recipes:[]
  };
  S.rooms.unshift(room); saveRooms(); renderRooms();
  document.getElementById('room-name').value='';
  showToast(`Table "${name}" is open!`);
}

function renderRooms(){
  const grid = document.getElementById('rooms-grid');
  if(!S.rooms.length){
    grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1;"><p>No tables open yet — be the first to brew together ☕</p></div>`;
    return;
  }
  grid.innerHTML = S.rooms.map(room=>{
    const memberCups = room.members.map(m=>`
      <div class="member-slot">
        ${buildCupSVG({size:52,fillFraction:1,steam:false,cup:m.cup||'mug',base:m.base||'coffee',addons:m.addons||[]})}
        <span class="member-name">${m.username}</span>
      </div>`).join('');
    const sharedCount = room.recipes?room.recipes.length:0;
    return `<div class="room-card">
      <div class="room-card-name">${room.name}</div>
      <div class="room-card-meta">
        <span>👥 ${room.members.length} at the table · ${room.created}</span>
        <span>📖 ${sharedCount} shared recipe${sharedCount!==1?'s':''}</span>
      </div>
      <div class="room-table">${memberCups}</div>
      <button class="room-join-btn" onclick="openJoinModal(${room.id})">Take a seat →</button>
    </div>`;
  }).join('');
}

// ── Join modal ────────────────────────────────────────────────────────────
function openJoinModal(roomId){
  S.joinRoomId=roomId;
  const room=S.rooms.find(r=>r.id===roomId);
  if(!room) return;
  document.getElementById('modal-room-name').textContent=room.name;
  document.getElementById('modal-room-sub').textContent=`${room.members.length} friend${room.members.length!==1?'s':''} brewing at this table`;
  document.getElementById('modal-username').value=S.user?.username||'';
  document.getElementById('join-modal').classList.add('open');
}
function closeJoinModal(e){ if(e.target===document.getElementById('join-modal')) closeJoinModalDirect(); }
function closeJoinModalDirect(){ document.getElementById('join-modal').classList.remove('open'); }

function joinRoom(){
  const room=S.rooms.find(r=>r.id===S.joinRoomId);
  if(!room) return;
  const user=document.getElementById('modal-username').value.trim();
  if(!user){ showToast('Please enter your name'); return; }
  const base=S.modalBase||'coffee';
  // prevent duplicate names
  if(!room.members.find(m=>m.username===user)){
    room.members.push({username:user,base,cup:'mug',addons:[]});
  }
  saveRooms(); closeJoinModalDirect();
  renderRooms();
  // Pre-fill brew page for this session
  document.getElementById('field-username').value=user;
  showToast(`You joined "${room.name}"! Now brew your drink.`);
  showPage('brew');
}

// ── Recipe Book ───────────────────────────────────────────────────────────
function setRecipeTab(tab){
  S.recipeTab=tab;
  S.recipePage=0;
  S.quickTab='all';
  document.querySelectorAll('.rtab-pill').forEach(t=>t.classList.remove('active'));
  document.getElementById('rtab-'+tab).classList.add('active');
  const pill=document.querySelector('.rtabs-pill');
  if(pill) pill.classList.toggle('tab-shared', tab==='shared');
  renderRecipes();
}

const addonNames={whipped:'Whipped Cream',caramel:'Caramel',honey:'Honey',cinnamon:'Cinnamon',marshmallow:'Marshmallows',boba:'Boba',vanilla:'Vanilla Foam'};
const baseNames={coffee:'Coffee',matcha:'Matcha',tea:'Tea',chocolate:'Hot Chocolate'};
const sortLabels={newest:'Newest ↓', oldest:'Oldest ↑', favorite:'Favorites ★'};
function recipeListRaw(){ return S.recipeTab==='mine' ? S.recipes : S.sharedRecipes; }
function filteredRecipes(){
  let list=[...recipeListRaw()];
  const q=S.recipeSearch.toLowerCase();
  if(q) list=list.filter(r=>[r.name,r.subject,r.task,r.username,DRINKS[r.drink]?.label,baseNames[r.base]].join(' ').toLowerCase().includes(q));
  if(S.recipeSubject) list=list.filter(r=>r.subject===S.recipeSubject);
  if(S.quickTab==='favorites') list=list.filter(r=>r.favorite);
  if(S.quickTab!=='all' && S.quickTab!=='favorites') list=list.filter(r=>(r.drink||r.base)===S.quickTab || r.base===S.quickTab);
  list.sort((a,b)=>{
    const at=a._ts||a.id||0, bt=b._ts||b.id||0;
    if(S.recipeSort==='favorite') return (b.favorite?1:0)-(a.favorite?1:0) || bt-at;
    return S.recipeSort==='oldest' ? at-bt : bt-at;
  });
  return list;
}
function updateRecipeFilters(){
  S.recipeSearch=document.getElementById('recipe-search')?.value||'';
  S.recipeSubject=document.getElementById('filter-subject')?.value||'';
  S.recipePage=0; renderRecipes();
}
// Tap-to-cycle sort button — one control instead of a dropdown, keeps the
// toolbar to a single tidy row.
function cycleSort(){
  const order=['newest','oldest','favorite'];
  S.recipeSort = order[(order.indexOf(S.recipeSort)+1) % order.length];
  const btn=document.getElementById('sort-btn');
  if(btn) btn.textContent = sortLabels[S.recipeSort];
  S.recipePage=0; renderRecipes();
}
function setQuickTab(tab){
  S.quickTab=tab; S.recipePage=0; renderRecipes();
}
function saveRecipeLists(){
  localStorage.setItem('bf_recipes',JSON.stringify(S.recipes));
  localStorage.setItem('bf_shared',JSON.stringify(S.sharedRecipes));
}
function toggleFavorite(id,event){
  if(event) event.stopPropagation();
  const all=[...S.recipes,...S.sharedRecipes];
  const r=all.find(x=>String(x.id)===String(id));
  if(r){
    r.favorite=!r.favorite; saveRecipeLists(); renderRecipes();
    if(S.user && S.recipes.includes(r)) updateRecipeFavoriteCloud(r);
  }
}
function refreshRecipeTools(list){
  const subjectSel=document.getElementById('filter-subject');
  const tabs=document.getElementById('journal-tabs');
  const sortBtn=document.getElementById('sort-btn');
  const raw=recipeListRaw();
  if(subjectSel){
    const current=subjectSel.value;
    const subjects=[...new Set(raw.map(r=>r.subject).filter(Boolean))].sort();
    subjectSel.innerHTML='<option value="">All subjects</option>'+subjects.map(s=>`<option value="${s}">${s}</option>`).join('');
    subjectSel.value=subjects.includes(current)?current:'';
  }
  if(sortBtn) sortBtn.textContent = sortLabels[S.recipeSort];
  if(tabs){
    const common=['all','favorites','cappuccino','matcha-latte','caramel-latte','honey-tea'];
    tabs.innerHTML=common.map(t=>`<button class="journal-tab ${S.quickTab===t?'active':''}" onclick="setQuickTab('${t}')">${t==='all'?'All':t==='favorites'?'★ Favorites':(DRINKS[t]?.label||t)}</button>`).join('');
  }
}

// Recipe cards now show a full-sized, accurate cup that mirrors exactly
// what was brewed (same cup shape, base, drink and add-ons), rendered
// bigger and steaming gently so it feels alive on the page.
function renderRecipes(){
  const grid=document.getElementById('recipe-grid');
  const list = filteredRecipes();
  refreshRecipeTools(list);
  const prevBtn=document.getElementById('page-prev');
  const nextBtn=document.getElementById('page-next');
  const pageCount=document.getElementById('page-count');
  if(!list.length){
    grid.innerHTML=`<div class="recipe-card empty-state"><p>${S.recipeTab==='mine'?'No recipes yet — brew your first session':'No shared brews yet — join a study table to create one together'}</p><div class="rc-note">Blank pages are waiting for the next warm memory.</div></div>
    <div class="recipe-card empty-state"><p>Open the Brew page, finish a session, and this journal will begin to fill.</p></div>`;
    if(prevBtn) prevBtn.disabled=true;
    if(nextBtn) nextBtn.disabled=true;
    if(pageCount) pageCount.textContent='blank journal';
    return;
  }
  const maxPage=Math.max(0, Math.ceil(list.length/2)-1);
  S.recipePage=Math.min(S.recipePage,maxPage);
  const spread=list.slice(S.recipePage*2,S.recipePage*2+2);
  grid.innerHTML = spread.map((r,i)=>{
    const drinkKey=r.drink||r.base;
    const drinkLabel=DRINKS[drinkKey]?.label||baseNames[r.base]||'Custom Brew';
    const fullCup=buildCupSVG({size:120,fillFraction:1,steam:true,cup:r.cup,base:r.base,drink:drinkKey,addons:r.addons||[]});
    const ings=[drinkLabel,...(r.addons||[]).filter(a=>a!=='ice').map(a=>addonNames[a]||a)].join(', ');
    return `<div class="recipe-card ${r.favorite?'favorite-page':''}" onclick="changeRecipePage(${i===0?-1:1})">
      ${r.shared?'<div class="rc-badge">shared brew</div>':''}
      <div class="rc-top">
        <div class="rc-headline">
          <div class="rc-name">${r.name}</div>
          <div class="rc-meta">
            <span>📚 ${r.subject}</span>
            <span>✏️ ${r.task}</span>
            <span>⏱ ${r.duration} min · ${r.date}</span>
            ${r.username?`<span>☕ by ${r.username}</span>`:''}
          </div>
        </div>
        <div class="rc-cup-frame">
          <div class="rc-cup-label">${drinkLabel}</div>
          ${fullCup}
        </div>
      </div>
      <div class="rc-ingredients">${ings}</div>
      <div class="rc-note">I brewed this while studying ${r.subject}. The cup kept time, and the page kept the feeling.</div>
      <button class="fav-btn ${r.favorite?'':'off'}" onclick="toggleFavorite('${r.id}',event)" title="Favorite recipe">★</button>
    </div>`;
  }).join('');
  if(spread.length===1){
    grid.innerHTML += `<div class="recipe-card empty-state"><p>This side of the spread is still untouched.</p><div class="rc-note">A future recipe belongs here.</div></div>`;
  }
  if(prevBtn) prevBtn.disabled=S.recipePage===0;
  if(nextBtn) nextBtn.disabled=S.recipePage>=maxPage;
  if(pageCount) pageCount.textContent=`spread ${S.recipePage+1} of ${maxPage+1}`;
}

// ── Realistic 3D page-flip animation ────────────────────────────────────
let flippingPage=false;
function changeRecipePage(delta){
  if(flippingPage) return;
  const list = filteredRecipes();
  const maxPage=Math.max(0, Math.ceil(list.length/2)-1);
  const next=Math.max(0, Math.min(maxPage, S.recipePage+delta));
  if(next===S.recipePage) return;

  const shell = document.querySelector('.flipbook-shell');
  const grid = document.getElementById('recipe-grid');
  if(!shell || !grid){ S.recipePage=next; renderRecipes(); return; }

  flippingPage = true;
  playPageSound('turn');

  const frontHTML = grid.innerHTML;

  S.recipePage = next;
  renderRecipes();
  const backHTML = grid.innerHTML;

  const gridRect = grid.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();

  const dir = delta>0 ? 'next' : 'prev';
  const flip = document.createElement('div');
  flip.className = 'page-flip-3d '+dir;
  flip.style.top = (gridRect.top - shellRect.top) + 'px';
  flip.style.left = (gridRect.left - shellRect.left) + 'px';
  flip.style.width = gridRect.width + 'px';
  flip.style.height = gridRect.height + 'px';
  flip.innerHTML =
    `<div class="flip-face flip-front"><div class="recipe-grid flip-grid">${frontHTML}</div></div>
     <div class="flip-face flip-back"><div class="recipe-grid flip-grid">${backHTML}</div></div>`;
  shell.appendChild(flip);

  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{ flip.classList.add('turning'); });
  });

  setTimeout(()=>{
    flip.remove();
    flippingPage = false;
  }, 900);
}

// ── Auth (Supabase) ──────────────────────────────────────────────────────
function openAuthModal(tab='signin'){
  setAuthTab(tab);
  document.getElementById('auth-modal').classList.add('open');
}
function closeAuthModal(e){ if(e.target===document.getElementById('auth-modal')) closeAuthModalDirect(); }
function closeAuthModalDirect(){
  document.getElementById('auth-modal').classList.remove('open');
  document.getElementById('auth-msg').textContent='';
  document.getElementById('auth-msg').className='auth-msg';
}
function setAuthTab(tab){
  S.authTab=tab;
  document.getElementById('auth-tab-signin').classList.toggle('active', tab==='signin');
  document.getElementById('auth-tab-signup').classList.toggle('active', tab==='signup');
  document.getElementById('auth-username-row').style.display = tab==='signup' ? 'block' : 'none';
  document.getElementById('auth-title').textContent = tab==='signup' ? 'Join the café' : 'Welcome back';
  document.getElementById('auth-sub').textContent = tab==='signup'
    ? 'Create a membership so your brews follow you between visits.'
    : 'Sign in to keep your recipes with you, wherever you brew.';
  document.getElementById('auth-submit-btn').textContent = tab==='signup' ? 'Join the Café →' : 'Sign In →';
  document.getElementById('auth-msg').textContent='';
  document.getElementById('auth-msg').className='auth-msg';
}
function setAuthMsg(msg, type){
  const el=document.getElementById('auth-msg');
  el.textContent=msg; el.className='auth-msg'+(type?(' '+type):'');
}
function togglePasswordVisibility(){
  const input=document.getElementById('auth-password');
  const btn=document.getElementById('pw-toggle-btn');
  const willShow = input.type==='password';
  input.type = willShow ? 'text' : 'password';
  btn.textContent = willShow ? '🙈' : '👁';
  btn.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
}
// Translates Supabase's raw auth errors into something a person can act on,
// without changing what actually happened.
function friendlyAuthError(err){
  const msg = (err && err.message) || '';
  if(/invalid login credentials/i.test(msg)){
    return "That email and password don't match our records. Double-check for typos — tap the eye icon to reveal what you typed — or confirm your email first if this account is brand new.";
  }
  if(/email not confirmed/i.test(msg)) return 'Please confirm your email first — check your inbox for the confirmation link, then sign in.';
  if(/user already registered/i.test(msg)) return 'An account with that email already exists — try signing in instead.';
  if(/password should be at least/i.test(msg)) return msg;
  return msg || 'Something went wrong. Please try again.';
}
async function submitAuth(){
  if(!supabaseClient){
    setAuthMsg('Supabase isn\'t connected yet — add your Project URL and anon key at the top of script.js.', 'error');
    return;
  }
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const username = document.getElementById('auth-username').value.trim();
  if(!email || !password){ setAuthMsg('Please fill in your email and password.', 'error'); return; }
  if(S.authTab==='signup' && password.length<6){ setAuthMsg('Password should be at least 6 characters.', 'error'); return; }

  const btn=document.getElementById('auth-submit-btn');
  const originalLabel=btn.textContent;
  btn.disabled=true; btn.textContent='Brewing…';

  try {
    if(S.authTab==='signup'){
      if(!username){ setAuthMsg('Please tell us your name.', 'error'); return; }
      const { data, error } = await supabaseClient.auth.signUp({
        email, password, options:{ data:{ username } }
      });
      if(error) throw error;
      // Save the public profile row (matches your existing profiles table:
      // id, username, avatar_url — no email column, so we don't send one).
      if(data.user){
        try { await supabaseClient.from('profiles').upsert({ id:data.user.id, username }); }
        catch(profileErr){ console.warn('Profile save failed (non-blocking):', profileErr); }
      }
      if(data.session){
        setAuthMsg('Welcome to the café! ☕', 'success');
        setTimeout(closeAuthModalDirect, 900);
      } else {
        setAuthMsg('Check your inbox to confirm your email, then sign in.', 'success');
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if(error) throw error;
      setAuthMsg('Welcome back! ☕', 'success');
      setTimeout(closeAuthModalDirect, 700);
    }
  } catch(err){
    console.error('Auth error:', err);
    setAuthMsg(friendlyAuthError(err), 'error');
  } finally {
    btn.disabled=false; btn.textContent=originalLabel;
  }
}
async function signOutUser(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  showToast('Signed out — come back soon ☕');
  // handleSessionChange (via onAuthStateChange) restores guest recipes and clears S.user
}
function renderAuthUI(){
  const nav=document.getElementById('nav-auth');
  if(S.user){
    const initial=(S.user.username||S.user.email||'?').trim().charAt(0).toUpperCase();
    nav.innerHTML = `
      <div class="nav-user">
        <div class="nav-user-avatar">${initial}</div>
        <span class="nav-user-name">${S.user.username||S.user.email}</span>
      </div>
      <a class="signout-link" onclick="signOutUser()">Sign Out</a>`;
    const uField=document.getElementById('field-username');
    if(uField && !uField.value) uField.value=S.user.username||'';
  } else {
    nav.innerHTML = `<a onclick="openAuthModal('signin')" id="nl-signin">Sign In</a>`;
  }
}

// ── Recipe cloud sync ────────────────────────────────────────────────────
// Matches the real schema: study_sessions (subject/task/duration) →
// drinks (cup/base/add_ons, keyed to a session) → recipes (name/notes/
// favorite, keyed to a drink + the owning user). All three are written
// together when a session finishes, and joined back together on load.
function guessDrinkKey(cup, base, addons){
  const set = new Set(addons||[]);
  const match = Object.entries(DRINKS).find(([, d]) =>
    d.cup===cup && d.base===base && d.addons.length===set.size && d.addons.every(a=>set.has(a))
  );
  return match ? match[0] : base;
}
const RECIPE_SELECT = 'id, recipe_name, notes, favorite, created_at, drinks(cup, base, add_ons, image, study_sessions(subject, task, duration))';

async function saveRecipeToCloud(recipe){
  if(!supabaseClient || !S.user) return null;
  try {
    const { data: sessionRow, error: sessionErr } = await supabaseClient.from('study_sessions')
      .insert({ user_id:S.user.id, subject:recipe.subject, task:recipe.task, duration:recipe.duration, completed:true })
      .select().single();
    if(sessionErr) throw sessionErr;

    // `drinks.image` is repurposed to hold the drink preset key (e.g.
    // "cappuccino") so the exact cup art can be redrawn later.
    const { data: drinkRow, error: drinkErr } = await supabaseClient.from('drinks')
      .insert({ session_id:sessionRow.id, cup:recipe.cup, base:recipe.base, add_ons:recipe.addons||[], image:recipe.drink })
      .select().single();
    if(drinkErr) throw drinkErr;

    const { data: recipeRow, error: recipeErr } = await supabaseClient.from('recipes')
      .insert({ user_id:S.user.id, drink_id:drinkRow.id, recipe_name:recipe.name, notes:'', favorite:!!recipe.favorite })
      .select().single();
    if(recipeErr) throw recipeErr;

    recipe._cloudId = recipeRow.id;
    return recipeRow;
  } catch(e){
    console.warn('Could not sync recipe to Supabase (it is still saved locally):', e);
    return null;
  }
}
async function updateRecipeFavoriteCloud(recipe){
  if(!supabaseClient || !S.user || !recipe._cloudId) return;
  try {
    await supabaseClient.from('recipes').update({ favorite: !!recipe.favorite })
      .eq('id', recipe._cloudId).eq('user_id', S.user.id);
  } catch(e){ console.warn('Could not sync favorite to Supabase:', e); }
}
function cloudRowToRecipe(row){
  const drink = row.drinks || {};
  const session = drink.study_sessions || {};
  const addons = Array.isArray(drink.add_ons) ? drink.add_ons : [];
  const drinkKey = drink.image || guessDrinkKey(drink.cup, drink.base, addons);
  const created = row.created_at ? new Date(row.created_at) : new Date();
  return {
    id: row.id, _cloudId: row.id, _ts: created.getTime(),
    name: row.recipe_name || 'Unnamed Brew',
    cup: drink.cup||'mug', base: drink.base||'coffee', drink: drinkKey, addons,
    subject: session.subject||'General Study', task: session.task||'Focus session',
    duration: session.duration||0,
    date: created.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
    username: S.user?.username || 'Me',
    favorite: !!row.favorite, shared:false
  };
}
async function loadCloudRecipes(guestSnapshot){
  if(!supabaseClient || !S.user) return;
  const localGuest = guestSnapshot || [];
  try {
    const { data, error } = await supabaseClient.from('recipes')
      .select(RECIPE_SELECT).eq('user_id', S.user.id).order('created_at', { ascending:false });
    if(error) throw error;

    if((!data || data.length===0) && localGuest.length>0){
      // First time this account has synced — carry the guest's local brews
      // up to the cloud so nothing made before signing in gets lost.
      for(const r of localGuest){ await saveRecipeToCloud(r); }
      const retry = await supabaseClient.from('recipes')
        .select(RECIPE_SELECT).eq('user_id', S.user.id).order('created_at', { ascending:false });
      S.recipes = (retry.data||[]).map(cloudRowToRecipe);
    } else {
      S.recipes = (data||[]).map(cloudRowToRecipe);
    }
    saveRecipeLists();
    if(document.getElementById('page-recipes').classList.contains('active')) renderRecipes();
  } catch(e){
    console.warn('Could not load recipes from Supabase:', e);
  }
}

async function handleSessionChange(session){
  if(session?.user){
    let username = session.user.user_metadata?.username;
    if(!username){
      const { data: profile } = await supabaseClient.from('profiles').select('username').eq('id', session.user.id).single();
      username = profile?.username;
    }
    const justSignedIn = !S.user;
    const guestSnapshot = justSignedIn ? [...S.recipes] : null;
    if(justSignedIn) localStorage.setItem('bf_recipes_guest', JSON.stringify(guestSnapshot));
    S.user = { id:session.user.id, email:session.user.email, username };
    renderAuthUI();
    await loadCloudRecipes(guestSnapshot || []);
  } else {
    if(S.user){
      S.recipes = JSON.parse(localStorage.getItem('bf_recipes_guest')||'[]');
      saveRecipeLists();
      if(document.getElementById('page-recipes').classList.contains('active')) renderRecipes();
    }
    S.user = null;
    renderAuthUI();
  }
}
async function initAuthState(){
  if(!supabaseClient) return;
  const { data:{ session } } = await supabaseClient.auth.getSession();
  await handleSessionChange(session);
  supabaseClient.auth.onAuthStateChange((_event, session)=>{ handleSessionChange(session); });
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2800);
}

// ── Init ──────────────────────────────────────────────────────────────────
document.getElementById('field-ambience').value=S.ambience;
document.getElementById('sound-toggle').classList.toggle('on',S.soundOn);
document.addEventListener('pointerdown',()=>{ initAudio(); if(audioCtx && audioCtx.state==='suspended') audioCtx.resume(); },{once:true});
try { initAudio(); } catch(e) {}
applyDrinkPreset(S.drink);
renderHeroCup();
renderCupPreview();
renderAuthUI();
initAuthState();

document.addEventListener('click', startMusic, { once: true });

function startMusic() {
  bgMusic.play().catch(err => console.log(err));
}