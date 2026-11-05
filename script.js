// ── Supabase setup ───────────────────────────────────────────────────────
// 1. Go to your Supabase project → Settings → API
// 2. Paste your Project URL and anon/public key below
// 3. For the Study Café, run supabase/cafes.sql once in the Supabase SQL
//    editor (creates the café tables, functions and security rules).
const SUPABASE_URL = 'https://vigjumdpadyslbcvjeel.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qkYURGAEv7vAgFXwFzgsdQ_VU0g6dZr';

// What an emailed link put in the address bar, read before the Supabase
// client tidies it away: a password-reset link, or an expired/used link.
const AUTH_URL_STATE = (()=>{
  const h=new URLSearchParams(location.hash.replace(/^#/,'')), q=new URLSearchParams(location.search);
  return { recovery: h.get('type')==='recovery' || q.get('type')==='recovery',
           error: h.get('error_description') || q.get('error_description') || '', recoveryEvent:false };
})();

let supabaseClient = null;
try {
  if (window.supabase && SUPABASE_URL.startsWith('http')) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Listen straight away so a password-reset arrival isn't missed.
    supabaseClient.auth.onAuthStateChange(event=>{
      if(event==='PASSWORD_RECOVERY'){
        AUTH_URL_STATE.recoveryEvent=true;
        if(typeof openAuthModal==='function' && document.getElementById('auth-modal')) openAuthModal('reset');
      }
    });
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
  recipeTab:'mine',
  recipePage:0, recipeSearch:'', recipeSubject:'', recipeSort:'newest', quickTab:'all',
  ambience: localStorage.getItem('bf_ambience') || 'cozy-cafe',
  soundOn: localStorage.getItem('bf_sound') !== 'off',
  
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
  'iced-americano': {label:'Iced Americano', cup:'glass', base:'coffee', addons:['ice'], temp:'cold'},
  'espresso': {label:'Espresso', cup:'demitasse', base:'coffee', addons:[], temp:'hot'},
  'cafe-au-lait': {label:'Café au Lait', cup:'bowl', base:'coffee', addons:['vanilla'], temp:'hot'},
  'chai-latte': {label:'Chai Latte', cup:'enamel', base:'chai', addons:['vanilla','cinnamon'], temp:'hot'},
  'london-fog': {label:'London Fog', cup:'teacup', base:'earlgrey', addons:['vanilla'], temp:'hot'},
  'golden-milk': {label:'Golden Milk', cup:'glass', base:'golden', addons:['honey'], temp:'hot'},
  'hibiscus-cooler': {label:'Hibiscus Cooler', cup:'tumbler', base:'hibiscus', addons:['ice'], temp:'cold'},
  'irish-cream': {label:'Irish Cream Coffee', cup:'footed', base:'coffee', addons:['whipped'], temp:'hot'}
};

// ── Color maps ────────────────────────────────────────────────────────────
const BC = {
  coffee:    { liq:'#7B5535', liq2:'#5A3A20', liq3:'#A07040', foam:'#D4AA7A', foamH:'#EDD9A3', steam:'rgba(240,220,195,0.7)', shadow:'rgba(90,58,32,0.4)' },
  matcha:    { liq:'#7FA85A', liq2:'#5A7A3A', liq3:'#A8C880', foam:'#B8D890', foamH:'#D8F0B8', steam:'rgba(180,215,150,0.6)', shadow:'rgba(80,110,50,0.35)' },
  tea:       { liq:'#C08040', liq2:'#9A6020', liq3:'#E0A860', foam:'#E8C898', foamH:'#F8E8C8', steam:'rgba(230,200,155,0.6)', shadow:'rgba(150,100,40,0.35)' },
  chocolate: { liq:'#4A2818', liq2:'#301408', liq3:'#6A3828', foam:'#7A4830', foamH:'#A07050', steam:'rgba(180,130,100,0.6)', shadow:'rgba(50,20,10,0.45)' },
  chai:      { liq:'#B07A4A', liq2:'#7A4A28', liq3:'#D6A878', foam:'#E8CFA8', foamH:'#F6E6CC', steam:'rgba(235,210,180,0.65)', shadow:'rgba(110,70,40,0.38)' },
  earlgrey:  { liq:'#9C8A7A', liq2:'#6A5A4C', liq3:'#C8B8A8', foam:'#E2D8CE', foamH:'#F4EEE8', steam:'rgba(225,215,205,0.65)', shadow:'rgba(90,80,70,0.35)' },
  hibiscus:  { liq:'#B8324A', liq2:'#7A1A2E', liq3:'#E0607A', foam:'#F0B0BC', foamH:'#FAD8DE', steam:'rgba(240,190,200,0.6)', shadow:'rgba(120,30,50,0.35)' },
  golden:    { liq:'#E0A830', liq2:'#B07818', liq3:'#F2CC6A', foam:'#F6E2A8', foamH:'#FBF0CC', steam:'rgba(245,225,170,0.65)', shadow:'rgba(160,110,30,0.35)' }
};

// ── Build cup SVG: vintage watercolour illustration ──────────────────────
// Cream porcelain with sage folk-flower sprigs, clear glass mugs showing the
// drink's layers, seen from a little above so latte art, foam and toppings
// show on the surface. Everything is drawn in a fixed 200 × 270 space and
// scaled, so cups look the same at any size. fillFraction lowers the drink
// as a study session runs.
function buildCupSVG(opts={}) {
  const {
    size:outSize=200, fillFraction=1, steam=true,
    cup=S.cup, base=S.base, addons=S.addons, drink=S.drink
  } = opts;
  const C = BC[base]||BC.coffee;
  const W=200, H=270, cx=100;
  const uid = 'c'+Math.random().toString(36).slice(2,8);
  const f = Math.max(0, Math.min(1, fillFraction));
  const INK='#6b5440', SAGE='#7d9468', SAGE2='#a4b48c';

  const has = a => (addons||[]).includes(a);
  const hasIce = has('ice') || (DRINKS[drink] && DRINKS[drink].temp==='cold');
  const hasWhip = has('whipped'), hasFoam = has('vanilla');
  const artDrinks = ['cappuccino','vanilla-latte','caramel-latte','matcha-latte','milk-tea'];
  const latteArt = !hasWhip && !hasIce && (hasFoam || artDrinks.includes(drink)) && base!=='tea' && base!=='hibiscus';
  const cocoaDust = drink==='cappuccino' || base==='chocolate' || has('cinnamon');

  // ── cup geometry ──
  const G = {
    mug:     { mat:'porcelain', rimY:100, rimRx:62, depth:46, saucer:false,
               body:`M${cx-62},100 C${cx-63},160 ${cx-58},206 ${cx-46},220 Q${cx},236 ${cx+46},220 C${cx+58},206 ${cx+63},160 ${cx+62},100 Z`,
               handle:`M${cx+60},124 C${cx+96},120 ${cx+100},176 ${cx+57},188`, bottomY:228 },
    teacup:  { mat:'porcelain', rimY:126, rimRx:60, depth:30, saucer:true,
               body:`M${cx-60},126 C${cx-58},176 ${cx-32},206 ${cx},206 C${cx+32},206 ${cx+58},176 ${cx+60},126 Z`,
               handle:`M${cx+54},140 C${cx+84},134 ${cx+86},172 ${cx+44},182`, bottomY:206 },
    glass:   { mat:'glass', rimY:92, rimRx:56, depth:118, saucer:false,
               body:`M${cx-56},92 L${cx-50},214 Q${cx-49},228 ${cx-36},229 L${cx+36},229 Q${cx+49},228 ${cx+50},214 L${cx+56},92 Z`,
               handle:`M${cx+53},118 C${cx+90},116 ${cx+94},182 ${cx+51},192`, bottomY:229 },
    demitasse:{ mat:'porcelain', rimY:152, rimRx:40, depth:18, saucer:true, saucerRx:64,
               body:`M${cx-40},152 C${cx-40},184 ${cx-26},202 ${cx},202 C${cx+26},202 ${cx+40},184 ${cx+40},152 Z`,
               handle:`M${cx+37},162 C${cx+58},160 ${cx+58},186 ${cx+31},190`, bottomY:202 },
    bowl:    { mat:'porcelain', rimY:142, rimRx:78, depth:30, saucer:false, foot:true,
               body:`M${cx-78},142 C${cx-76},190 ${cx-42},214 ${cx},214 C${cx+42},214 ${cx+76},190 ${cx+78},142 Z`, handle:'', bottomY:214 },
    enamel:  { mat:'porcelain', style:'enamel', rimY:110, rimRx:58, depth:40, saucer:false,
               body:`M${cx-58},110 L${cx-58},214 Q${cx-58},226 ${cx-46},227 Q${cx},233 ${cx+46},227 Q${cx+58},226 ${cx+58},214 L${cx+58},110 Z`,
               handle:`M${cx+57},130 C${cx+88},128 ${cx+90},178 ${cx+57},186`, bottomY:228 },
    tumbler: { mat:'glass', rimY:70, rimRx:46, depth:148, saucer:false,
               body:`M${cx-46},70 L${cx-40},222 Q${cx-39},232 ${cx-28},232 L${cx+28},232 Q${cx+39},232 ${cx+40},222 L${cx+46},70 Z`, handle:'', bottomY:232 },
    footed:  { mat:'glass', rimY:84, rimRx:50, depth:100, saucer:false, stem:true,
               body:`M${cx-50},84 C${cx-52},146 ${cx-42},188 ${cx},192 C${cx+42},188 ${cx+52},146 ${cx+50},84 Z`, handle:'', bottomY:192 },
    takeaway:{ mat:'paper', rimY:86, rimRx:52, depth:120, saucer:false,
               body:`M${cx-52},86 L${cx-40},226 Q${cx},234 ${cx+40},226 L${cx+52},86 Z`, handle:'', bottomY:230 },
  };
  const g = G[cup] || G.mug;
  const ry = r => r*0.27;
  const rimRy = ry(g.rimRx);

  // ── defs: gradients, the sage sprig motif, the watercolour edge ──
  const defs = `
    <filter id="${uid}-wc" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <linearGradient id="${uid}-porc" x1="0" x2="1"><stop offset="0" stop-color="#e9dfcc"/><stop offset="0.28" stop-color="#fbf6ec"/><stop offset="0.62" stop-color="#f1e8d8"/><stop offset="1" stop-color="#d6c7ad"/></linearGradient>
    <linearGradient id="${uid}-inner" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8cbb3"/><stop offset="1" stop-color="#f2eadb"/></linearGradient>
    <radialGradient id="${uid}-surf" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="${C.liq3}"/><stop offset="0.55" stop-color="${C.liq}"/><stop offset="1" stop-color="${C.liq2}"/></radialGradient>
    <linearGradient id="${uid}-layers" x1="0" y1="0" x2="0" y2="1">
      ${hasIce ? `<stop offset="0" stop-color="${C.liq}" stop-opacity="0.9"/><stop offset="1" stop-color="${C.liq2}"/>`
               : `<stop offset="0" stop-color="${C.foamH}"/><stop offset="0.16" stop-color="${C.foam}"/><stop offset="0.42" stop-color="${C.liq3}"/><stop offset="0.75" stop-color="${C.liq}"/><stop offset="1" stop-color="${C.liq2}"/>`}
    </linearGradient>
    <linearGradient id="${uid}-glass" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.18" stop-color="#fff" stop-opacity="0.05"/><stop offset="0.8" stop-color="#fff" stop-opacity="0.03"/><stop offset="1" stop-color="#fff" stop-opacity="0.28"/></linearGradient>
    <linearGradient id="${uid}-enamel" x1="0" x2="1"><stop offset="0" stop-color="#e2ddd0"/><stop offset="0.3" stop-color="#faf8f2"/><stop offset="0.7" stop-color="#efebe0"/><stop offset="1" stop-color="#cfc8b6"/></linearGradient>
    <linearGradient id="${uid}-kraft" x1="0" x2="1"><stop offset="0" stop-color="#c9a77a"/><stop offset="0.35" stop-color="#e6cfa8"/><stop offset="1" stop-color="#b8956a"/></linearGradient>
    <clipPath id="${uid}-body"><path d="${g.body}"/><ellipse cx="${cx}" cy="${g.rimY}" rx="${g.rimRx-1}" ry="${ry(g.rimRx)-1}"/></clipPath>
    <g id="${uid}-sprig">
      <path d="M0,9 C1,5 1,1 0,-3" fill="none" stroke="${SAGE}" stroke-width="1" stroke-linecap="round"/>
      <path d="M0,4 C-5,2 -7,6 -2,7 Z M0,2 C5,0 7,4 2,5 Z" fill="${SAGE}" opacity="0.85"/>
      <g transform="translate(0,-6)" fill="${SAGE}">
        <circle cx="0" cy="-3.2" r="1.9"/><circle cx="3" cy="-1" r="1.9"/><circle cx="1.9" cy="2.6" r="1.9"/><circle cx="-1.9" cy="2.6" r="1.9"/><circle cx="-3" cy="-1" r="1.9"/>
        <circle cx="0" cy="0" r="1.2" fill="#c9a24a"/>
      </g>
      <circle cx="-5" cy="-11" r="0.9" fill="${SAGE2}"/><circle cx="5" cy="-10" r="0.8" fill="${SAGE2}"/><circle cx="6" cy="2" r="0.7" fill="${SAGE2}"/>
    </g>`;

  // ── the drink's surface, with toppings ──
  // where the surface sits for this fill level, and how wide it is there
  let surfY, surfRx;
  if(g.mat==='porcelain'){ surfY = g.rimY + 4 + (1-f)*g.depth*0.55; surfRx = (g.rimRx-6) - (1-f)*14; }
  else { surfY = g.rimY + 6 + (1-f)*g.depth; const t=(surfY-g.rimY)/(g.bottomY-g.rimY); surfRx = (g.rimRx-5) - t*(g.mat==='paper'?12:6); }
  const surfRy = ry(surfRx);
  const showDrink = f > 0.03;

  function heart(x,y,rx,r_y,fill){
    return `<path d="M${x},${y+r_y*0.62} C${x-rx*0.62},${y+r_y*0.05} ${x-rx*0.4},${y-r_y*0.8} ${x},${y-r_y*0.22} C${x+rx*0.4},${y-r_y*0.8} ${x+rx*0.62},${y+r_y*0.05} ${x},${y+r_y*0.62}Z" fill="${fill}"/>`;
  }
  let toppings='';
  if(showDrink){
    const x=cx, y=surfY, rx=surfRx, r_y=surfRy;
    // crema / milk ring
    toppings += `<ellipse cx="${x}" cy="${y}" rx="${rx*0.94}" ry="${r_y*0.9}" fill="none" stroke="${C.foam}" stroke-opacity="0.55" stroke-width="2.4"/>`;
    if(latteArt){
      toppings += `<ellipse cx="${x}" cy="${y}" rx="${rx*0.7}" ry="${r_y*0.66}" fill="${C.foam}" opacity="0.5"/>`;
      toppings += heart(x, y, rx*0.95, r_y*1.05, C.foamH) + heart(x, y+r_y*0.12, rx*0.55, r_y*0.6, C.liq3) + heart(x, y+r_y*0.2, rx*0.32, r_y*0.34, C.foamH);
    } else if(hasFoam || (drink==='cappuccino')){
      toppings += `<ellipse cx="${x}" cy="${y}" rx="${rx*0.86}" ry="${r_y*0.8}" fill="${C.foamH}" opacity="0.92"/>`;
    }
    if(cocoaDust && !hasWhip && (latteArt || hasFoam || drink==='cappuccino')){
      for(let i=0;i<26;i++){ const a=i*2.39, d=Math.sqrt(i/26); toppings += `<circle cx="${(x+Math.cos(a)*d*rx*0.6).toFixed(1)}" cy="${(y+Math.sin(a)*d*r_y*0.55).toFixed(1)}" r="${(0.7+(i%3)*0.35).toFixed(2)}" fill="#6a3a1e" opacity="0.7"/>`; }
    }
    if(has('honey')) toppings += `<path d="M${x-rx*0.45},${y} C${x-rx*0.45},${y-r_y*0.7} ${x+rx*0.45},${y-r_y*0.7} ${x+rx*0.4},${y} C${x+rx*0.35},${y+r_y*0.5} ${x-rx*0.2},${y+r_y*0.45} ${x-rx*0.15},${y}" fill="none" stroke="#d9a42a" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>`;
    if(has('marshmallow')) [[-0.45,-0.1],[-0.1,-0.35],[0.3,-0.05],[0.05,0.3],[-0.35,0.35]].forEach(([dx,dy])=>{ toppings += `<rect x="${x+dx*rx-6}" y="${y+dy*r_y*1.6-4}" width="12" height="9" rx="3.5" fill="#fffaf4" stroke="#d8c8b8" stroke-width="0.8"/>`; });
    if(hasIce && g.mat!=='glass') [[-0.4,-0.1],[0.15,-0.3],[0.35,0.2]].forEach(([dx,dy])=>{ toppings += `<rect x="${x+dx*rx-8}" y="${y+dy*r_y*1.6-6}" width="16" height="12" rx="3" fill="#eef7fb" fill-opacity="0.85" stroke="#b8d0da" stroke-width="0.8"/>`; });
  }
  // whipped cream dome (sits on the surface, rises above the rim when full)
  let whip='';
  if(showDrink && hasWhip){
    const x=cx, y=surfY+surfRy*0.35, rx=surfRx*1.02;
    // a billowing dome of cream: three soft swirls stacked
    whip = `<path d="M${x-rx},${y} C${x-rx*1.02},${y-14} ${x-rx*0.82},${y-24} ${x-rx*0.6},${y-26} C${x-rx*0.62},${y-40} ${x-rx*0.3},${y-48} ${x-rx*0.08},${y-44} C${x},${y-58} ${x+rx*0.32},${y-56} ${x+rx*0.34},${y-42} C${x+rx*0.62},${y-44} ${x+rx*0.8},${y-30} ${x+rx*0.7},${y-22} C${x+rx*0.92},${y-20} ${x+rx*1.02},${y-10} ${x+rx},${y} Q${x},${y+surfRy*0.9} ${x-rx},${y} Z" fill="#fffaf2" stroke="#cdbda6" stroke-width="1.1"/>
      <path d="M${x-rx*0.62},${y-12} C${x-rx*0.3},${y-22} ${x+rx*0.25},${y-20} ${x+rx*0.62},${y-12}" fill="none" stroke="#e2d3bc" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M${x-rx*0.36},${y-30} C${x-rx*0.12},${y-38} ${x+rx*0.18},${y-36} ${x+rx*0.34},${y-30}" fill="none" stroke="#e2d3bc" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M${x+rx*0.55},${y-8} C${x+rx*0.75},${y-14} ${x+rx*0.8},${y-22} ${x+rx*0.7},${y-22}" fill="none" stroke="#d6c6ae" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`;
    for(let i=0;i<22;i++){ const a=i*2.39, d=Math.sqrt(i/22); whip += `<circle cx="${(x+Math.cos(a)*d*rx*0.55).toFixed(1)}" cy="${(y-32+Math.sin(a)*d*13).toFixed(1)}" r="${(0.8+(i%3)*0.45).toFixed(2)}" fill="#6a3a1e" opacity="0.7"/>`; }
    if(has('caramel')) whip += `<path d="M${x-rx*0.6},${y-14} l${rx*0.3},-10 l${rx*0.2},14 l${rx*0.25},-16 l${rx*0.25},14" fill="none" stroke="#b8742a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if(showDrink && has('caramel')){
    toppings += `<path d="M${cx-surfRx*0.6},${surfY-2} l${surfRx*0.3},-${surfRy*0.5} l${surfRx*0.3},${surfRy*0.8} l${surfRx*0.3},-${surfRy*0.8} l${surfRx*0.3},${surfRy*0.6}" fill="none" stroke="#b8742a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
  }

  // ── steam ──
  const steamTop = (hasWhip && showDrink) ? surfY-56 : g.rimY-8;
  const steamPaths = (steam && f>0.08 && !hasIce) ? [-16,0,14].map((dx,i)=>`
    <path d="M${cx+dx},${steamTop} C${cx+dx+6},${steamTop-14} ${cx+dx-7},${steamTop-28} ${cx+dx+4},${steamTop-44} C${cx+dx+12},${steamTop-58} ${cx+dx-5},${steamTop-70} ${cx+dx+3},${steamTop-84}" stroke="${C.steam}" stroke-width="${1.8-i*0.3}" fill="none" stroke-linecap="round">
      <animate attributeName="opacity" values="0;0.75;0.4;0" dur="${[2.8,3.2,2.6][i]}s" begin="${[0,1,1.9][i]}s" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="translate" values="0,0;${4-i},-8" dur="${[2.8,3.2,2.6][i]}s" begin="${[0,1,1.9][i]}s" repeatCount="indefinite"/>
    </path>`).join('') : '';

  // ── handle (drawn as a thick outlined loop) ──
  const handle = g.handle ? (g.mat==='glass'
    ? `<path d="${g.handle}" fill="none" stroke="${INK}" stroke-opacity="0.55" stroke-width="12" stroke-linecap="round"/><path d="${g.handle}" fill="none" stroke="#eef2ef" stroke-opacity="0.85" stroke-width="9" stroke-linecap="round"/><path d="${g.handle}" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="2" stroke-linecap="round" transform="translate(-1.5,-1.5)"/>`
    : `<path d="${g.handle}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="${g.handle}" fill="none" stroke="#f3ebdc" stroke-width="8" stroke-linecap="round"/><path d="${g.handle}" fill="none" stroke="${SAGE}" stroke-opacity="0.55" stroke-width="1" stroke-linecap="round" transform="translate(1,1)"/>`) : '';

  // ── saucer ──
  const sk = (g.saucerRx||88)/88;
  const saucer = g.saucer ? `
    <ellipse cx="${cx}" cy="${g.bottomY+10*sk}" rx="${88*sk}" ry="${24*sk}" fill="url(#${uid}-porc)" stroke="${INK}" stroke-width="1.4"/>
    <ellipse cx="${cx}" cy="${g.bottomY+8*sk}" rx="${76*sk}" ry="${19*sk}" fill="none" stroke="${SAGE}" stroke-width="1.6" stroke-dasharray="1.6 5" stroke-linecap="round"/>
    <ellipse cx="${cx}" cy="${g.bottomY+7*sk}" rx="${48*sk}" ry="${11*sk}" fill="#e2d6c0" stroke="${INK}" stroke-opacity="0.35" stroke-width="1"/>
    ${[-70,-46,46,70].map(dx=>`<use href="#${uid}-sprig" transform="translate(${cx+dx*sk},${g.bottomY+(12 + (Math.abs(dx)>60?-4:6))*sk}) scale(${0.8*sk})"/>`).join('')}` : '';
  // a café-au-lait bowl stands on a little foot ring; an Irish coffee glass on a stem
  const foot = g.foot ? `<ellipse cx="${cx}" cy="${g.bottomY+4}" rx="34" ry="8" fill="url(#${uid}-porc)" stroke="${INK}" stroke-width="1.3"/>` : '';
  const stem = g.stem ? `
    <path d="M${cx-7},${g.bottomY-2} C${cx-3},${g.bottomY+10} ${cx-3},${g.bottomY+30} ${cx-6},${g.bottomY+40} L${cx+6},${g.bottomY+40} C${cx+3},${g.bottomY+30} ${cx+3},${g.bottomY+10} ${cx+7},${g.bottomY-2} Z" fill="#eef2ef" fill-opacity="0.6" stroke="${INK}" stroke-opacity="0.65" stroke-width="1.2"/>
    <ellipse cx="${cx}" cy="${g.bottomY+14}" rx="7" ry="3.5" fill="#eef2ef" fill-opacity="0.7" stroke="${INK}" stroke-opacity="0.6" stroke-width="1"/>
    <ellipse cx="${cx}" cy="${g.bottomY+42}" rx="38" ry="8" fill="#eef2ef" fill-opacity="0.55" stroke="${INK}" stroke-opacity="0.65" stroke-width="1.3"/>
    <path d="M${cx-30},${g.bottomY+44} Q${cx},${g.bottomY+50} ${cx+30},${g.bottomY+44}" stroke="#fff" stroke-opacity="0.7" stroke-width="1.4" fill="none"/>` : '';

  // ── body ──
  let body='';
  if(g.mat==='porcelain'){
    const enamel = g.style==='enamel';
    const SP = { teacup:[[[-34,158],[2,170],[34,156],[-14,190],[22,190]],1.05], demitasse:[[[-18,178],[14,182]],0.8],
                 bowl:[[[-52,170],[-18,186],[18,188],[52,172]],1.1], mug:[[[-38,146],[0,156],[36,142],[-22,190],[16,196],[46,186]],1.25] };
    const [spots, sc] = SP[cup] || SP.mug;
    const sprigs = enamel ? '' : spots.map(([dx,y],i)=>`<use href="#${uid}-sprig" transform="translate(${cx+dx},${y}) rotate(${(i%3-1)*16}) scale(${sc})"/>`).join('');
    const enamelBits = enamel ? `
        <path d="M${cx-60},${g.bottomY-14} Q${cx},${g.bottomY-6} ${cx+60},${g.bottomY-14}" fill="none" stroke="#2f4a6a" stroke-width="3"/>
        <path d="M${cx-34},150 q3,-2 5,1 q-1,3 -5,-1z M${cx+22},196 q3,-2 4,1 q-2,2 -4,-1z M${cx-48},204 q2,-1 3,1 q-1,2 -3,-1z" fill="#3a3a44" opacity="0.75"/>` : '';
    body = `
      ${foot}
      <path d="${g.body}" fill="url(#${uid}-${enamel?'enamel':'porc'})"/>
      <g clip-path="url(#${uid}-body)">${sprigs}${enamelBits}
        <path d="M${cx-g.rimRx},${g.rimY+12} Q${cx},${g.rimY+12+rimRy*2.1} ${cx+g.rimRx},${g.rimY+12}" fill="none" stroke="${SAGE}" stroke-width="1.4" opacity="0.75"/>
        <path d="M${cx+g.rimRx*0.62},${g.rimY+20} C${cx+g.rimRx*0.7},${g.rimY+60} ${cx+g.rimRx*0.62},${g.rimY+90} ${cx+g.rimRx*0.45},${g.rimY+110}" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="4" stroke-linecap="round"/>
      </g>
      <path d="${g.body}" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <!-- looking into the cup -->
      <ellipse cx="${cx}" cy="${g.rimY}" rx="${g.rimRx}" ry="${rimRy}" fill="url(#${uid}-inner)"/>
      <clipPath id="${uid}-in"><ellipse cx="${cx}" cy="${g.rimY+0.5}" rx="${g.rimRx-3}" ry="${rimRy-2}"/></clipPath>
      <g clip-path="url(#${uid}-in)">
        ${showDrink ? `<ellipse cx="${cx}" cy="${surfY}" rx="${surfRx}" ry="${surfRy}" fill="url(#${uid}-surf)"/>${toppings}`
                    : `<ellipse cx="${cx}" cy="${g.rimY+g.depth*0.5}" rx="${g.rimRx*0.55}" ry="${rimRy*0.5}" fill="none" stroke="${C.liq}" stroke-opacity="0.35" stroke-width="1.5"/>`}
      </g>
      <ellipse cx="${cx}" cy="${g.rimY}" rx="${g.rimRx}" ry="${rimRy}" fill="none" stroke="${INK}" stroke-width="1.4"/>
      ${enamel ? `<ellipse cx="${cx}" cy="${g.rimY}" rx="${g.rimRx}" ry="${rimRy}" fill="none" stroke="#2f4a6a" stroke-width="3.2"/>`
               : `<ellipse cx="${cx}" cy="${g.rimY+1.6}" rx="${g.rimRx-2.5}" ry="${rimRy-1.6}" fill="none" stroke="${SAGE}" stroke-width="1" opacity="0.7"/>`}`;
  } else if(g.mat==='glass'){
    const ice = hasIce && showDrink ? [[-24,0.12,-14],[8,0.06,10],[26,0.22,-6],[-6,0.3,18]].map(([dx,t,rot])=>{ const y=surfY+8+t*(g.bottomY-surfY); return `<rect x="${cx+dx-11}" y="${y}" width="22" height="18" rx="4" fill="#f2fafd" fill-opacity="0.55" stroke="#fff" stroke-opacity="0.8" stroke-width="1" transform="rotate(${rot} ${cx+dx} ${y+9})"/>`; }).join('') : '';
    const boba = has('boba') && showDrink ? [-30,-16,-2,12,26,-22,4,20].map((dx,i)=>`<circle cx="${cx+dx}" cy="${g.bottomY-12-(i>4?11:0)}" r="6" fill="#2a160c"/><circle cx="${cx+dx-2}" cy="${g.bottomY-14-(i>4?11:0)}" r="1.6" fill="#7a5a48"/>`).join('') : '';
    body = `
      ${stem}
      <g clip-path="url(#${uid}-body)">
        ${showDrink ? `<rect x="${cx-60}" y="${surfY}" width="120" height="${g.bottomY-surfY+4}" fill="url(#${uid}-layers)"/>
          <path d="M${cx-60},${surfY+(g.bottomY-surfY)*0.38} C${cx-20},${surfY+(g.bottomY-surfY)*0.32} ${cx+20},${surfY+(g.bottomY-surfY)*0.44} ${cx+60},${surfY+(g.bottomY-surfY)*0.36}" fill="none" stroke="${C.liq2}" stroke-opacity="0.18" stroke-width="10"/>
          ${ice}${boba}
          <ellipse cx="${cx}" cy="${surfY}" rx="${surfRx}" ry="${surfRy}" fill="url(#${uid}-surf)"/>${toppings}` : ''}
        ${g.stem ? '' : `<rect x="${cx-60}" y="${g.bottomY-12}" width="120" height="14" fill="#e6efec" fill-opacity="0.45"/>`}
      </g>
      <path d="${g.body}" fill="url(#${uid}-glass)"/>
      <path d="${g.body.replace(/\s*Z$/,'')}" fill="none" stroke="${INK}" stroke-opacity="0.7" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M${cx-g.rimRx+10},${g.rimY+12} L${cx-g.rimRx+14},${g.bottomY-22}" stroke="#fff" stroke-opacity="0.7" stroke-width="3" stroke-linecap="round"/>
      <path d="M${cx-g.rimRx+18},${g.rimY+18} L${cx-g.rimRx+20},${g.rimY+58}" stroke="#fff" stroke-opacity="0.45" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M${cx+g.rimRx-12},${g.rimY+16} L${cx+g.rimRx-16},${g.bottomY-28}" stroke="#fff" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="${cx}" cy="${g.rimY}" rx="${g.rimRx}" ry="${rimRy}" fill="none" stroke="${INK}" stroke-opacity="0.75" stroke-width="1.3"/>
      <ellipse cx="${cx}" cy="${g.rimY+1.5}" rx="${g.rimRx-3}" ry="${rimRy-1.5}" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.2"/>
      ${hasIce ? `<path d="M${cx+g.rimRx*0.25},${surfY+40} L${cx+g.rimRx*0.6},${g.rimY-56}" stroke="#a8452e" stroke-width="5" stroke-linecap="round"/><path d="M${cx+g.rimRx*0.28},${surfY+20} L${cx+g.rimRx*0.6},${g.rimY-52}" stroke="#e8c8a8" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>` : ''}`;
  } else {
    // takeaway: kraft paper cup with a lid and a stamped sleeve
    body = `
      <g clip-path="url(#${uid}-body)">
        <rect x="${cx-60}" y="80" width="120" height="160" fill="url(#${uid}-kraft)"/>
        ${showDrink ? `<rect x="${cx-60}" y="${surfY}" width="120" height="${g.bottomY-surfY}" fill="${C.liq2}" opacity="0.14"/>` : ''}
        <rect x="${cx-60}" y="132" width="120" height="50" fill="#f3ead8"/>
        <path d="M${cx-60},132 h120 M${cx-60},182 h120" stroke="${INK}" stroke-width="1.2"/>
      </g>
      <path d="${g.body}" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <circle cx="${cx}" cy="157" r="16" fill="none" stroke="${SAGE}" stroke-width="1.4"/>
      <use href="#${uid}-sprig" transform="translate(${cx},160) scale(1.2)"/>
      <path d="M${cx-58},86 L${cx-56},72 Q${cx},62 ${cx+56},72 L${cx+58},86 Q${cx},96 ${cx-58},86 Z" fill="#f1e8d8" stroke="${INK}" stroke-width="1.4"/>
      <ellipse cx="${cx}" cy="71" rx="44" ry="9" fill="#e6dac4" stroke="${INK}" stroke-opacity="0.6" stroke-width="1"/>
      <ellipse cx="${cx+20}" cy="69" rx="6" ry="2" fill="${INK}" opacity="0.5"/>`;
  }

  return `<svg width="${outSize}" height="${Math.round(outSize*1.35)}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>${defs}</defs>
  <ellipse cx="${cx}" cy="${H-22}" rx="${g.saucer?96*sk:(cup==='bowl'?84:66)}" ry="${g.saucer?14*sk:10}" fill="${C.shadow}" fill-opacity="0.35"/>
  <g filter="url(#${uid}-wc)">
    ${saucer}
    ${g.mat==='porcelain' ? handle : ''}
    ${body}
    ${g.mat!=='porcelain' ? handle : ''}
    ${whip}
  </g>
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
  if(name!=='caferoom') leaveRoomRealtime();
  if(name!=='brew') S.cafeBrew=null;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.remove('active'));
  const nl = document.getElementById('nl-'+(name==='caferoom'?'cafe':name));
  if(nl) nl.classList.add('active');
  if(name==='brew'){ renderCupPreview(); updateBrewCafeBanner(); }
  if(name==='recipes'){ resetRecipeBookCover(); renderRecipes(); }
  if(name==='cafe') renderCafeList();
  if(name==='home') renderHeroCup();
  if(name==='profile') renderProfilePage();
  if(audioCtx) applyMusic();   // "Match the café" follows you in and out of cafés
}

function renderHeroCup(){
  const el = document.getElementById('hero-cup');
  if(el) el.innerHTML = buildCupSVG({size:180,fillFraction:1,steam:true,drink:'caramel-latte',cup:'glass',base:'coffee',addons:['caramel','vanilla']});
}
function renderCupPreview(){
  const el = document.getElementById('cup-preview');
  if(el) el.innerHTML = `<div class="preview-drink-label">${DRINKS[S.drink]?.label||'Custom Brew'}</div>` + buildCupSVG({size:210,fillFraction:1,steam:true,drink:S.drink});
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

let audioCtx=null, masterGain=null;
function initAudio(){
  if(audioCtx) return;
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  masterGain=audioCtx.createGain();
  masterGain.gain.value=S.soundOn?0.16:0;
  masterGain.connect(audioCtx.destination);
}
// (The Gazette's weather report still follows the café you last sat in.)
function setAmbience(name){ S.ambience=name; localStorage.setItem('bf_ambience',name); }
// ── The gramophone: music for studying ────────────────────────────────────
// Your own café recording; real songs for the Parisian café, the tea house
// and the library (free music by Kevin MacLeod, incompetech.com, CC BY 4.0 —
// credited in the gramophone menu and README); and three pieces composed
// live in the browser for the bookstore, the jazz café and the beach.
// "Match the café" plays the music of whichever café you're sitting in.
const ROOM_AUDIO = './assets/audio/rooms/';
const MUSIC_STATIONS = {
  auto:     { label:'Match the café',       note:'each café plays its own music' },
  records:  { label:'Café Records',         note:'the house song', tracks:[{ title:'Café Records', src:'./assets/audio/cafe-music.mp3', own:true }] },
  parisian: { label:'Parisian Café',        note:'accordion and gentle piano', tracks:[{title:'Parisian', file:'parisian.m4a'}, {title:'Avec Soin', file:'avec-soin.m4a'}] },
  rain:     { label:'Rainy Bookstore',      note:'soft piano and rain on the glass', gen:'rain', tracks:[{title:'Rainy Day Piano', own:true}] },
  koto:     { label:'Kyoto Tea House',      note:'koto and flute', tracks:[{title:'Ishikari Lore', file:'ishikari-lore.m4a'}, {title:'Ripples', file:'ripples.m4a'}] },
  jazz:     { label:'Midnight Jazz Café',   note:'walking bass, brushes, vinyl', gen:'jazz', tracks:[{title:'Midnight Jazz', own:true}] },
  nocturne: { label:'Library Reading Room', note:'Satie and Bach on the piano', tracks:[{title:'Gymnopédie No. 1', file:'gymnopedie-no-1.m4a'}, {title:'Prelude in C (BWV 846)', file:'prelude-in-c.m4a'}] },
  bossa:    { label:'Beach Café',           note:'nylon guitar and the waves', gen:'bossa', tracks:[{title:'Seaside Bossa', own:true}] },
};
const VIBE_MUSIC = { parisian:'parisian', bookstore:'rain', kyoto:'koto', midnight:'jazz', library:'nocturne', beach:'bossa', cabin:'bossa' };
S.music = localStorage.getItem('bf_music') || 'auto';
if(!MUSIC_STATIONS[S.music]) S.music='auto';
S.musicVol = Math.min(1, Math.max(0, parseFloat(localStorage.getItem('bf_music_vol') ?? '0.6')));

function musicPlaying(){
  if(S.music!=='auto') return S.music;
  const inCafe = S.room?.cafe && document.getElementById('page-caferoom')?.classList.contains('active');
  return inCafe ? (VIBE_MUSIC[S.room.cafe.vibe] || 'records') : 'records';
}
const MX = { bus:null, noise:null, timer:null, key:null, step:0, nextT:0, bed:[], prev:{} };
const mtof = m => 440*Math.pow(2,(m-69)/12);
function mxBus(){
  if(MX.bus || !audioCtx) return MX.bus;
  MX.bus=audioCtx.createGain(); MX.bus.gain.value=0;
  const comp=audioCtx.createDynamicsCompressor(); comp.threshold.value=-18; comp.ratio.value=3;
  MX.bus.connect(comp); comp.connect(audioCtx.destination);
  const len=audioCtx.sampleRate*2, buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  MX.noise=buf;
  return MX.bus;
}
// one note: an oscillator with a plucked or held envelope, optionally filtered
function mxTone(t, f, {wave='sine', vol=0.1, a=0.006, hold=0, d=1.2, cutoff=0, detune=0, bend=0, vib=0}={}){
  const ac=audioCtx, o=ac.createOscillator(), g=ac.createGain();
  o.type=wave; o.detune.value=detune;
  o.frequency.setValueAtTime(bend ? f*Math.pow(2,bend/12) : f, t);
  if(bend) o.frequency.exponentialRampToValueAtTime(f, t+0.07);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t+a);
  if(hold) g.gain.setValueAtTime(vol, t+a+hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t+a+hold+d);
  let src=o;
  if(cutoff){ const fl=ac.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=cutoff; o.connect(fl); src=fl; }
  if(vib){ const l=ac.createOscillator(), lg=ac.createGain(); l.frequency.value=5.2; lg.gain.value=f*vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+a+hold+d+0.1); }
  src.connect(g); g.connect(MX.bus); o.start(t); o.stop(t+a+hold+d+0.08);
}
function mxNoise(t, {vol=0.05, d=0.12, a=0.004, type='bandpass', freq=4000, q=0.8}={}){
  const ac=audioCtx, n=ac.createBufferSource(), fl=ac.createBiquadFilter(), g=ac.createGain();
  n.buffer=MX.noise; fl.type=type; fl.frequency.value=freq; fl.Q.value=q;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);
  n.connect(fl); fl.connect(g); g.connect(MX.bus); n.start(t, Math.random()); n.stop(t+a+d+0.05);
}
// instruments
const INS = {
  piano:(t,m,v=0.09,d=2.2)=>{ const f=mtof(m); mxTone(t,f,{vol:v,d}); mxTone(t,f*2,{wave:'triangle',vol:v*0.18,d:d*0.35}); mxTone(t,f*3,{vol:v*0.05,d:0.3}); },
  epiano:(t,m,v=0.07,d=1.6)=>{ const f=mtof(m); mxTone(t,f,{vol:v,d}); mxTone(t,f*4,{vol:v*0.1,d:0.35}); },
  koto:(t,m,v=0.09)=>{ const f=mtof(m); mxTone(t,f,{wave:'triangle',vol:v,d:1.5,cutoff:2600,bend:0.35}); mxTone(t,f*2,{vol:v*0.3,d:0.45}); mxTone(t,f*3,{wave:'triangle',vol:v*0.08,d:0.2}); },
  accordion:(t,m,dur,v=0.03,bright=1500)=>{ const f=mtof(m); mxTone(t,f,{wave:'sawtooth',vol:v,a:0.03,hold:dur,d:0.12,cutoff:bright,detune:-7}); mxTone(t,f,{wave:'sawtooth',vol:v,a:0.03,hold:dur,d:0.12,cutoff:bright,detune:8}); },
  bass:(t,m,dur=0.5,v=0.13)=>{ const f=mtof(m); mxTone(t,f,{wave:'triangle',vol:v,a:0.01,d:dur,cutoff:700}); mxTone(t,f,{vol:v*0.6,a:0.01,d:dur*0.8}); },
  guitar:(t,m,v=0.06)=>{ const f=mtof(m); mxTone(t,f,{wave:'triangle',vol:v,d:1.1,cutoff:2000}); mxTone(t,f*2,{vol:v*0.15,d:0.25}); },
  flute:(t,m,dur,v=0.045)=>{ mxTone(t,mtof(m),{vol:v,a:0.08,hold:dur,d:0.35,vib:0.006}); },
  pad:(t,m,dur,v=0.025)=>{ mxTone(t,mtof(m),{wave:'triangle',vol:v,a:0.6,hold:dur,d:1.5,cutoff:900}); },
};
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const chance = p => Math.random()<p;
// a melody that moves mostly by step through a scale, drifting back to the middle
function mxWalk(key, scale, lo, hi){
  const prev = MX.prev[key] ?? scale[Math.floor(scale.length/2)];
  let i = scale.indexOf(prev); if(i<0) i=Math.floor(scale.length/2);
  const mid=(lo+hi)/2, bias = prev>mid ? -0.25 : 0.25;
  i += Math.round((Math.random()*2-1)*1.6 + bias);
  i = Math.max(0, Math.min(scale.length-1, i));
  let n=scale[i]; while(n>hi) n-=12; while(n<lo) n+=12;
  MX.prev[key]=n; return n;
}
const near = (key, tones, lo, hi) => { const p=MX.prev[key] ?? (lo+hi)/2; let best=null;
  for(const c of tones) for(let o=-24;o<=24;o+=12){ const n=c+o; if(n<lo||n>hi) continue; if(best==null || Math.abs(n-p)<Math.abs(best-p)) best=n; }
  MX.prev[key]=best; return best; };

// the pieces: each says how fast it goes and what to play on every eighth note
const PIECES = {
  rain:{ bpm:66, per:8, swing:0, bed:'rain',
    bars:[[41,[53,57,60,64]],[40,[52,55,59,62]],[38,[50,53,57,60]],[36,[48,52,55,59]],[41,[53,57,60,64]],[40,[52,55,59,62]],[45,[57,60,64,67]],[43,[55,59,62,65]]],
    play(bar, s, t, dur){
      const [root,ch]=this.bars[bar%8];
      if(s===0) INS.piano(t, root, 0.07, 3);
      const arp=[0,1,2,3,2,1,2,1][s]; INS.piano(t, ch[arp]+12, 0.035, 1.6);
      if((s===0||s===4||(s===6&&chance(0.3))) && chance(0.6)) INS.piano(t+0.01, mxWalk('mel',[72,74,76,79,81,84],72,86), 0.06, 2.4);
    }},
  jazz:{ bpm:96, per:8, swing:0.62, bed:'vinyl',
    bars:[[36,[63,67,70,74]],[41,[57,60,63,67]],[34,[62,65,69,72]],[43,[58,62,65,69]],[36,[63,67,70,74]],[41,[57,60,63,67]],[34,[62,65,69,72]],[34,[62,65,69,72]]],
    play(bar, s, t, dur){
      const [root,ch]=this.bars[bar%8], next=this.bars[(bar+1)%8][0];
      if(s%2===0){
        const beat=s/2, walk=[root, root+(chance(0.5)?3:4), root+7, next+(chance(0.5)?1:-1)][beat];
        INS.bass(t, walk, 0.55, 0.12);
        mxNoise(t, {vol: beat%2 ? 0.035 : 0.018, d:0.22, a:0.02, type:'bandpass', freq:3500, q:0.6});   // brushes
      } else if(s===3||s===7){ mxNoise(t, {vol:0.014, d:0.06, type:'highpass', freq:7000}); }
      if(s===0 || (s===3 && chance(0.7))) ch.forEach((n,i)=>INS.epiano(t+i*0.008, n, 0.028, 1.2));
      if(chance(s%2===0 ? 0.32 : 0.22)) INS.epiano(t, mxWalk('mel',[70,72,73,74,77,79,80,82,84],70,86), 0.055, 0.9);
    }},
  bossa:{ bpm:124, per:8, swing:0, bed:'waves',
    bars:[[36,[52,55,59,64]],[45,[55,60,64,67]],[38,[53,57,60,65]],[43,[53,59,62,65]],[40,[55,59,62,67]],[45,[55,61,64,67]],[38,[53,57,60,65]],[43,[53,59,62,65]]],
    play(bar, s, t, dur){
      const [root,ch]=this.bars[bar%8];
      if(s===0) INS.bass(t, root, 0.6, 0.11); if(s===3) INS.bass(t, root+7, 0.3, 0.08); if(s===4) INS.bass(t, root+7, 0.5, 0.1);
      const hits = bar%2 ? [0,3,6] : [2,4,7];
      if(hits.includes(s)) ch.forEach((n,i)=>INS.guitar(t+i*0.012, n, 0.03));
      mxNoise(t, {vol: s%2 ? 0.012 : 0.007, d:0.05, type:'highpass', freq:6500});   // shaker
      if((s===0||s===4) && chance(0.35)) INS.flute(t, mxWalk('mel',[72,74,76,79,81,84],72,86), dur*3, 0.035);
    }},
};

// soft backgrounds under the music
function mxStartBed(kind){
  const ac=audioCtx, mk=(type,freq,q=0.7)=>{ const f=ac.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q; return f; };
  const loop=(vol, chain)=>{ const n=ac.createBufferSource(), g=ac.createGain(); n.buffer=MX.noise; n.loop=true; g.gain.value=vol;
    let x=n; chain.forEach(c=>{ x.connect(c); x=c; }); x.connect(g); g.connect(MX.bus); n.start(); MX.bed.push(n,g,...chain); return g; };
  const lfo=(g, rate, depth)=>{ const l=ac.createOscillator(), lg=ac.createGain(); l.frequency.value=rate; lg.gain.value=depth; l.connect(lg); lg.connect(g.gain); l.start(); MX.bed.push(l,lg); };
  if(kind==='rain'){ loop(0.05,[mk('highpass',900),mk('lowpass',5500)]); loop(0.03,[mk('lowpass',400)]); }
  if(kind==='waves'){ const g=loop(0.05,[mk('lowpass',650)]); lfo(g, 0.09, 0.045); }
  if(kind==='wind'){ const g=loop(0.02,[mk('bandpass',500,0.4)]); lfo(g, 0.05, 0.015); }
  if(kind==='murmur'){ const g=loop(0.016,[mk('bandpass',700,0.6)]); lfo(g, 0.3, 0.008); }
  if(kind==='room'){ loop(0.008,[mk('lowpass',300)]); }
  if(kind==='vinyl'){ loop(0.006,[mk('bandpass',1200,0.5)]); }
  MX.bedKind=kind;
}
function mxTick(){
  const piece=PIECES[MX.key]; if(!piece || !audioCtx) return;
  const beat=60/piece.bpm, eighth=beat/2;
  while(MX.nextT < audioCtx.currentTime + 0.3){
    const s=MX.step % piece.per, bar=Math.floor(MX.step/piece.per);
    const dur = piece.swing ? (s%2===0 ? beat*piece.swing : beat*(1-piece.swing)) : eighth;
    try{ piece.play(bar, s, MX.nextT, dur); }catch(e){ console.warn(e); }
    if(piece.bed==='vinyl' && chance(0.18)) mxNoise(MX.nextT+Math.random()*dur, {vol:0.02, d:0.004, a:0.001, type:'highpass', freq:2500});   // crackle
    if(piece.bed==='rain' && chance(0.12)) mxTone(MX.nextT+Math.random()*dur, 2000+Math.random()*2500, {vol:0.006, d:0.05});        // drips
    MX.nextT += dur; MX.step++;
  }
}
function mxStop(){
  clearInterval(MX.timer); MX.timer=null; MX.key=null;
  MX.bed.forEach(n=>{ try{ n.stop&&n.stop(); }catch(e){} try{ n.disconnect(); }catch(e){} }); MX.bed=[];
}
function mxStart(key){
  if(MX.key===key) return;
  mxStop(); if(!mxBus()) return;
  MX.key=key; MX.step=0; MX.prev={}; MX.nextT=audioCtx.currentTime+0.15;
  mxStartBed(PIECES[key].bed);
  MX.timer=setInterval(mxTick, 60); mxTick();
}
const trackSrc = t => t.src || ROOM_AUDIO + t.file;
const MP = { station:null, index:0 };
// one record player for everything: each station's tracks play in turn, round and round
bgMusic.loop = false;
bgMusic.addEventListener('ended', ()=>{
  const st=MUSIC_STATIONS[MP.station]; if(!st) return;
  MP.index=(MP.index+1) % st.tracks.length;
  bgMusic.src=trackSrc(st.tracks[MP.index]); bgMusic.play().catch(()=>{});
  renderMusicMenu();
});
function applyMusic(){
  const key=musicPlaying(), st=MUSIC_STATIONS[key];
  bgMusic.volume = Math.min(1, 0.45*S.musicVol);
  if(audioCtx && masterGain) masterGain.gain.value = S.soundOn ? 0.16 : 0;
  if(MP.station!==key){
    MP.station=key; MP.index=0;
    if(!st.gen) bgMusic.src=trackSrc(st.tracks[0]);
  }
  if(!S.soundOn){ bgMusic.pause(); mxStop(); if(MX.bus) MX.bus.gain.value=0; }
  else if(st.gen){            // composed live in the browser
    bgMusic.pause();
    if(audioCtx){ mxBus(); MX.bus.gain.setTargetAtTime(1.1*S.musicVol, audioCtx.currentTime, 0.4); mxStart(st.gen); }
  } else { mxStop(); if(MX.bus) MX.bus.gain.value=0; bgMusic.play().catch(()=>{}); }
  renderMusicMenu();
}
function setMusic(key){ if(!MUSIC_STATIONS[key]) return; S.music=key; localStorage.setItem('bf_music',key); initAudio(); if(audioCtx?.state==='suspended') audioCtx.resume(); if(!S.soundOn){ S.soundOn=true; localStorage.setItem('bf_sound','on'); } applyMusic(); }
function setMusicVol(v){ S.musicVol=Math.min(1,Math.max(0,+v)); localStorage.setItem('bf_music_vol',String(S.musicVol)); bgMusic.volume=Math.min(1,0.45*S.musicVol); if(MX.bus && MX.key && audioCtx) MX.bus.gain.setTargetAtTime(1.1*S.musicVol, audioCtx.currentTime, 0.1); }
function nextTrack(){ const st=MUSIC_STATIONS[MP.station]; if(!st || st.tracks.length<2) return; MP.index=(MP.index+1)%st.tracks.length; bgMusic.src=trackSrc(st.tracks[MP.index]); if(S.soundOn) bgMusic.play().catch(()=>{}); renderMusicMenu(); }
function toggleMusicMenu(force){
  const m=document.getElementById('music-menu'); if(!m) return;
  const open = typeof force==='boolean' ? force : !m.classList.contains('open');
  m.classList.toggle('open', open); document.getElementById('sound-toggle').setAttribute('aria-expanded', String(open));
  if(open) renderMusicMenu();
}
function renderMusicMenu(){
  document.getElementById('sound-toggle')?.classList.toggle('on', S.soundOn);
  const list=document.getElementById('music-list'); if(!list) return;
  const key=musicPlaying(), st=MUSIC_STATIONS[key], tr=st.tracks[MP.station===key ? MP.index : 0];
  const now=document.getElementById('music-now');
  now.innerHTML = S.soundOn ? `Now playing: <b>${esc(tr.title)}</b>${tr.own?'':` <span>· ${esc(st.label)}</span>`}${st.tracks.length>1?` <button type="button" class="music-skip" onclick="nextTrack()" title="Next song" aria-label="Next song">&#8250;&#8250;</button>`:''}` : 'The gramophone is resting';
  list.innerHTML = Object.entries(MUSIC_STATIONS).map(([k,s])=>`
    <button type="button" class="music-row ${S.music===k?'sel':''}" role="radio" aria-checked="${S.music===k}" onclick="setMusic('${k}')">
      <span class="music-dot" aria-hidden="true"></span>
      <span class="music-txt"><b>${s.label}</b><i>${k==='auto' ? (S.room?.cafe ? `here: ${MUSIC_STATIONS[VIBE_MUSIC[S.room.cafe.vibe]]?.label||'Café Records'}` : 'Café Records outside a café') : s.note}</i></span>
      ${S.soundOn && key===k ? '<span class="music-eq" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}
    </button>`).join('');
  const credit=document.getElementById('music-credit'); if(credit) credit.hidden = !!tr.own;
  const t=document.getElementById('music-power'); if(t) t.textContent = S.soundOn ? 'Lift the needle' : 'Play';
  const v=document.getElementById('music-vol'); if(v && document.activeElement!==v) v.value=S.musicVol;
  const np=document.getElementById('cr-nowplaying'); if(np) np.textContent = S.soundOn ? tr.title : 'music off';
}
function toggleSound(){
  S.soundOn=!S.soundOn; localStorage.setItem('bf_sound', S.soundOn?'on':'off');
  initAudio(); if(audioCtx?.state==='suspended') audioCtx.resume();
  applyMusic();
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
    } else {
      document.querySelectorAll(`[data-group="${g}"]`).forEach(c=>c.classList.remove('sel'));
      chip.classList.add('sel'); S[g]=v;
    }
    if(g!=='drink') renderCupPreview();
  });
});

// ── Session ───────────────────────────────────────────────────────────────
const ICON_PLAY='<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M7 4.6v10.8l8.6-5.4z" fill="currentColor"/></svg>';
const ICON_PAUSE='<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><rect x="5.6" y="4.6" width="2.8" height="10.8" rx="0.5" fill="currentColor"/><rect x="11.6" y="4.6" width="2.8" height="10.8" rx="0.5" fill="currentColor"/></svg>';
const ICON_RESTART='<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4.6 10a5.4 5.4 0 1 0 1.7-3.95" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5.6 2.9v3.6h3.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function setPlayIcon(running){
  const btn=document.getElementById('play-btn');
  if(!btn) return;
  btn.innerHTML = running ? ICON_PAUSE : ICON_PLAY;
  btn.setAttribute('aria-label', running ? 'Pause' : 'Start');
  btn.title = running ? 'Pause' : 'Start';
}
function startSession(){
  if(S.cafeBrew){ bringBrewToTable(); return; }
  initAudio();
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
  setPlayIcon(false);
  renderTimerCup(); updateTimerDisp(); showPage('study');
}

function renderTimerCup(f){
  const frac = f!==undefined?f:1;
  const el = document.getElementById('timer-cup-area');
  if(el) el.innerHTML = buildCupSVG({size:205,fillFraction:frac,steam:frac>0.12});
}
function updateTimerDisp(){
  const m=Math.floor(S.timerSecs/60), s=S.timerSecs%60;
  document.getElementById('time-disp').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  const fill=document.getElementById('steep-fill');
  if(fill) fill.style.width = (S.timerTotal ? (1 - S.timerSecs/S.timerTotal)*100 : 0)+'%';
}
function toggleTimer(){
  if(S.timerRunning){
    clearInterval(S.timerIv); S.timerRunning=false;
    setPlayIcon(false);
    document.getElementById('ambient-lbl').textContent='Paused. Your brew is waiting…';
  } else {
    S.timerRunning=true;
    setPlayIcon(true);
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
  setPlayIcon(false);
  document.getElementById('ambient-lbl').textContent='Your brew is ready. Press play to begin.';
  renderTimerCup(1); updateTimerDisp();
}
// Only a session that runs its full time is written into the recipe book;
// ending early just closes the session.
function finishSession(completed=true){
  clearInterval(S.timerIv); S.timerRunning=false;
  const wasActive=S.focusActive;
  S.focusActive=false;
  document.querySelector('.nav').classList.remove('focus-locked');
  document.getElementById('page-study').classList.remove('focus-mode');
  setPlayIcon(false);
  if(!completed || !wasActive){
    if(wasActive){ showToast('Session ended early — not added to your recipe book'); playPageSound('close'); }
    S.timerSecs=S.timerTotal; renderTimerCup(1); updateTimerDisp();
    return false;
  }
  const mins=Math.max(1, Math.round(S.timerTotal/60));
  const now=new Date();
  const dateStr=now.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const recipe={id:Date.now(),_ts:Date.now(),name:S.recipeName,cup:S.cup,base:S.base,drink:S.drink,addons:[...S.addons],
    subject:S.subject,task:S.task,duration:mins,date:dateStr,username:S.username||'Me',favorite:false,shared:false};
  S.recipes.unshift(recipe);
  localStorage.setItem('bf_recipes',JSON.stringify(S.recipes));
  if(S.user){ saveRecipeToCloud(recipe); } // fire-and-forget — recipe is already safe locally either way
  showToast('Session saved to your recipe book');
  renderTimerCup(0);
  document.getElementById('ambient-lbl').textContent=`${mins} min brewed. Beautifully done.`;
  setTimeout(()=>{ if(document.getElementById('page-study').classList.contains('active')) showPage('recipes'); },2200);
  return true;
}

function requestEndSession(){
  if(S.focusActive){
    document.getElementById('leave-modal').classList.add('open');
    playPageSound('close');
  } else {
    showPage('brew');
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
  finishSession(false);
  showPage(target || 'brew');
}

// ── Study Café ────────────────────────────────────────────────────────────
// Cafés are shared through Supabase (see supabase/cafes.sql): everyone at a
// table sees each other's drinks, who is here right now, and one shared
// timer run by the café's owner.

// Plain text for anything a person typed (café names, usernames), so it can
// never be read as HTML when it's shown on someone else's screen.
function esc(v){
  return String(v ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

// Café types: the look of the room, its ambience, and what's on the menu.
const CAFE_VIBES = {
  parisian: { label:'Parisian Café', tagline:'striped awnings and warm croissants', ambience:'cozy-cafe',
    menu:[
      {key:'cappuccino',    name:'Café Crème',        note:'velvet foam, slow mornings'},
      {key:'hot-chocolate', name:'Chocolat Chaud',    note:'thick, dark and comforting'},
      {key:'cafe-au-lait',  name:'Café au Lait',       note:'in a wide breakfast bowl'},
      {key:'black-coffee',  name:'Petit Noir',         note:'short, strong, no fuss'},
    ]},
  bookstore: { label:'Rainy Bookstore', tagline:'rain on the glass, pages turning', ambience:'rainy-bookstore',
    menu:[
      {key:'caramel-latte', name:'Chapter One Caramel', note:'for long first pages'},
      {key:'milk-tea',      name:'Storm Milk Tea',      note:'with chewy pearls'},
      {key:'mocha',         name:'Inkwell Mocha',       note:'dark chocolate and espresso'},
      {key:'chai-latte',    name:'Paperback Chai',      note:'spiced, for long chapters'},
    ]},
  kyoto: { label:'Kyoto Tea House', tagline:'paper screens and quiet steam', ambience:'kyoto-tea',
    menu:[
      {key:'matcha-latte', name:'Ceremonial Matcha', note:'whisked bright and green'},
      {key:'honey-tea',    name:'Honey Hōjicha',     note:'roasted, mellow, golden'},
      {key:'milk-tea',     name:'Royal Milk Tea',    note:'creamy black tea'},
      {key:'black-coffee', name:'Kissaten Pour-Over', note:'slow-dripped, clean'},
    ]},
  midnight: { label:'Midnight Jazz Café', tagline:'low lamps and a slow saxophone', ambience:'midnight-cafe',
    menu:[
      {key:'espresso',       name:'Blue Note Espresso', note:'for the late set'},
      {key:'mocha',          name:'Midnight Mocha',     note:'chocolate after dark'},
      {key:'iced-americano', name:'Moonlit Americano',  note:'over ice'},
      {key:'vanilla-latte',  name:'Velvet Vanilla',     note:'smooth as a ballad'},
    ]},
  library: { label:'Library Reading Room', tagline:'green lamps and leather chairs', ambience:'vintage-library',
    menu:[
      {key:'london-fog',   name:"Scholar's London Fog", note:'Earl Grey, steamed milk'},
      {key:'cappuccino',   name:'Reading Room Cappuccino', note:'a quiet classic'},
      {key:'black-coffee', name:'Archive Roast',       note:'deep and steady'},
      {key:'matcha-latte', name:'Margin Notes Matcha', note:'calm focus'},
    ]},
  beach: { label:'Beach Café', tagline:'sea breeze and red umbrellas', ambience:'ocean-waves',
    menu:[
      {key:'iced-americano', name:'Seaside Cold Brew',    note:'over ice, by the water'},
      {key:'caramel-latte',  name:'Salted Caramel Latte', note:'sweet with a hint of sea salt'},
      {key:'hibiscus-cooler',name:'Hibiscus Cooler',      note:'ruby red, over ice'},
      {key:'matcha-latte',   name:'Coconut Matcha',       note:'green, creamy, breezy'},
    ]},
};
const VIBE_KEYS = Object.keys(CAFE_VIBES);
// (cafés opened as the old Fireside Cabin are shown as the Beach Café)
const vibeOf = key => CAFE_VIBES[key==='cabin' ? 'beach' : key] || CAFE_VIBES.parisian;
const myCafeName = () => S.user?.username || (S.user?.email||'').split('@')[0] || 'Friend';
// What to call someone at a café: their name if they've set one, else their username.
const personName = m => (m && (m.name || m.username)) || 'Friend';

// Names and portraits for café people (from public.cafe_people). If that
// function isn't in the database yet, seats simply fall back to usernames.
let peopleRpcMissing = false;
async function attachPeople(members){
  const ids=[...new Set(members.map(m=>m.user_id || m.from_user).filter(Boolean))];
  let rows=[];
  if(ids.length && !peopleRpcMissing){
    const { data, error } = await CafeDB.sb.rpc('cafe_people', {p_ids:ids});
    if(error){ if(/cafe_people|function/i.test(error.message||'')) peopleRpcMissing=true; console.warn('Café names not loaded:', error.message); }
    else rows = Array.isArray(data) ? data : (data ? [data] : []);
  }
  const byId=Object.fromEntries(rows.map(r=>[r.id, r]));
  // your own name and picture are always to hand, even before cafe_people exists
  if(S.user && S.profile) byId[S.user.id] = {...(byId[S.user.id]||{}), display_name:S.profile.display_name, avatar_url:S.profile.avatar_url, username:S.profile.username, look:S.profile.look};
  members.forEach(m=>{
    const p=byId[m.user_id || m.from_user]; if(!p) return;
    m.name = p.display_name || null;
    m.avatar = p.avatar_url || null;
    m.look = p.look || null;
  });
  return members;
}

// ── Data layer: every Supabase call the café makes ──
const CafeDB = {
  get sb(){ if(!supabaseClient) throw new Error('The café is offline right now'); return supabaseClient; },
  check({data, error}){ if(error) throw new Error(error.message || 'Something went wrong'); return data; },

  async listMine(){
    const mine = this.check(await this.sb.from('cafe_members').select('cafe_id').eq('user_id', S.user.id));
    const ids = mine.map(m=>m.cafe_id);
    if(!ids.length) return [];
    const cafes = this.check(await this.sb.from('cafes').select('*').in('id', ids).order('created_at', {ascending:false}));
    const members = this.check(await this.sb.from('cafe_members').select('*').in('cafe_id', ids).order('joined_at'));
    await attachPeople(members);
    return cafes.map(c=>({...c, members: members.filter(m=>m.cafe_id===c.id)}));
  },
  async listInvites(){
    return this.check(await this.sb.from('cafe_invites')
      .select('id, cafe_id, from_user, from_username, created_at, cafes(name, vibe, invite_code)')
      .eq('to_user', S.user.id).order('created_at', {ascending:false}))
      .map(inv=>({...inv, user_id:inv.from_user, username:inv.from_username}));
  },
  async create(name, vibe){ return this.check(await this.sb.rpc('create_cafe', {p_name:name, p_vibe:vibe, p_username:myCafeName()})); },
  async joinByCode(code){ return this.check(await this.sb.rpc('join_cafe', {p_code:code, p_username:myCafeName()})); },
  async declineInvite(id){ this.check(await this.sb.from('cafe_invites').delete().eq('id', id)); },
  async getCafe(id){
    const cafe = this.check(await this.sb.from('cafes').select('*').eq('id', id).maybeSingle());
    if(!cafe) return null;
    const members = this.check(await this.sb.from('cafe_members').select('*').eq('cafe_id', id).order('joined_at'));
    await attachPeople(members);
    return {...cafe, members};
  },
  async setDrink(cafeId, drink){
    this.check(await this.sb.from('cafe_members').update({drink}).eq('cafe_id', cafeId).eq('user_id', S.user.id));
  },
  async invite(cafeId, username){ return this.check(await this.sb.rpc('invite_to_cafe', {p_cafe:cafeId, p_username:username})); },
  async timer(cafeId, action, secs){ return this.check(await this.sb.rpc('cafe_timer', {p_cafe:cafeId, p_action:action, p_secs:secs ?? null})); },
  async serverNow(){ return this.check(await this.sb.rpc('server_now')); },
  async leave(cafeId){ this.check(await this.sb.from('cafe_members').delete().eq('cafe_id', cafeId).eq('user_id', S.user.id)); },
  async close(cafeId){ this.check(await this.sb.from('cafes').delete().eq('id', cafeId)); },

  // Live updates for one café: seats/drinks/timer changes, and who is here now.
  subscribeCafe(cafeId, {onChange, onPresence}){
    const ch = this.sb.channel('cafe:'+cafeId, {config:{presence:{key:S.user.id}}});
    ch.on('postgres_changes', {event:'*', schema:'public', table:'cafe_members', filter:`cafe_id=eq.${cafeId}`}, ()=>onChange())
      .on('postgres_changes', {event:'*', schema:'public', table:'cafes', filter:`id=eq.${cafeId}`}, ()=>onChange())
      .on('presence', {event:'sync'}, ()=>onPresence(Object.keys(ch.presenceState())))
      .subscribe(async status=>{ if(status==='SUBSCRIBED') await ch.track({username:myCafeName()}); });
    return ()=>{ try{ this.sb.removeChannel(ch); }catch(e){} };
  },
  subscribeInvites(onChange){
    const ch = this.sb.channel('invites:'+S.user.id)
      .on('postgres_changes', {event:'*', schema:'public', table:'cafe_invites', filter:`to_user=eq.${S.user.id}`}, ()=>onChange())
      .subscribe();
    return ()=>{ try{ this.sb.removeChannel(ch); }catch(e){} };
  },
};

// ── Painted atmosphere vignettes ──────────────────────────────────────────
// A small watercolour of each café type, in the same hand as the café rooms:
// soft washes, wobbly ink, paper grain. Used on the picker, invitations and
// café cards.
let vibeArtUid=0;
function vibeArtSVG(key, {cls=''}={}){
  const k = key==='cabin' ? 'beach' : (CAFE_VIBES[key] ? key : 'parisian');
  const u='va'+(++vibeArtUid), dark = k==='midnight' || k==='library';
  const ink='#4a3428', L=`stroke="${ink}" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"`;
  const W=(d,fill,op=1)=>`<path d="${d}" fill="${fill}" opacity="${op}"/>`;
  let scene='';
  switch(k){
    case 'parisian': {
      const stripes=[...Array(9)].map((_,i)=>`<path d="M${18+i*14},20 L${32+i*14},20 L${32+i*14},36 Q${25+i*14},42 ${18+i*14},36 Z" fill="${i%2?'#f4e9d6':'#8e2f3c'}" ${L} stroke-width="0.7"/>`).join('');
      scene = `<rect width="160" height="110" fill="#ecd3bf"/>${W('M0,0 H160 V110 H0 Z','url(#'+u+'-g)')}
        <rect x="0" y="86" width="160" height="24" fill="#b88f6a"/><path d="M0,86 H160" stroke="#8a6448" stroke-width="1.4"/>
        <rect x="14" y="14" width="132" height="8" fill="#5a2a2a" ${L}/>
        ${stripes}
        <rect x="26" y="40" width="50" height="46" fill="#f6c98a" ${L}/><rect x="26" y="40" width="50" height="46" fill="url(#${u}-glow)"/>
        <path d="M51,40 V86 M26,60 H76" ${L} stroke-width="1.6"/>
        <rect x="88" y="40" width="40" height="46" fill="#7a4a34" ${L}/><circle cx="121" cy="64" r="1.6" fill="#e3c27a"/>
        <rect x="92" y="44" width="32" height="18" fill="#f6c98a" opacity="0.8" ${L} stroke-width="0.7"/>
        <ellipse cx="44" cy="94" rx="14" ry="3" fill="#e8dcc8" ${L}/><path d="M44,94 V106 M38,108 H50" ${L} stroke-width="1.4"/>
        <path d="M60,108 L62,92 Q66,82 70,92 L72,108 M61,98 H71" fill="none" ${L} stroke-width="1.3"/>
        <path d="M134,86 L132,74 H146 L144,86 Z" fill="#a4553f" ${L}/><circle cx="139" cy="68" r="8" fill="#6f8a5a" ${L}/><circle cx="134" cy="64" r="2" fill="#d77a7a"/><circle cx="143" cy="66" r="2" fill="#f2e3b0"/>
        <rect x="64" y="25" width="0" height="0"/>`;
      break; }
    case 'bookstore': {
      const spines=(x,y,n)=>[...Array(n)].map((_,i)=>`<rect x="${x+i*6}" y="${y+(i%3)}" width="5" height="${13-(i%3)}" fill="${['#7a2e3a','#3f5a6e','#c4973c','#5f7a4a','#8a5a3a','#6a4a6a'][i%6]}"/>`).join('');
      scene = `<rect width="160" height="110" fill="#4a3a30"/>
        <rect x="8" y="8" width="58" height="80" fill="#5a4636" ${L}/>${[22,40,58,76].map(y=>`<path d="M8,${y} H66" stroke="#2e2218" stroke-width="2"/>`).join('')}
        ${spines(11,9,9)}${spines(11,27,9)}${spines(11,45,9)}${spines(11,63,8)}
        <rect x="76" y="10" width="76" height="62" fill="#8ea3ae" ${L}/>
        <rect x="76" y="10" width="76" height="62" fill="url(#${u}-rain)"/>
        <path d="M114,10 V72 M76,41 H152" stroke="#3a2a20" stroke-width="2.4"/>
        <path d="M80,72 C96,62 128,66 150,58 L152,72 Z" fill="#5f727c" opacity="0.6"/>
        ${[[84,18],[100,30],[126,22],[140,48],[92,54],[132,60]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.4" fill="#e4eef2" opacity="0.8"/>`).join('')}
        <rect x="0" y="88" width="160" height="22" fill="#6b4a32"/><path d="M0,88 H160" stroke="#3a2a20" stroke-width="1.4"/>
        <path d="M96,88 L100,78 H118 L122,88 Z" fill="#f2e6cf" ${L}/><path d="M109,78 V88" ${L} stroke-width="0.8"/>
        <circle cx="140" cy="80" r="14" fill="url(#${u}-lamp)"/><path d="M134,84 L137,76 H143 L146,84 Z" fill="#c4973c" ${L}/>
        <rect x="128" y="88" width="8" height="10" rx="1" fill="#f3ead8" ${L}/><path d="M131,86 q1,-3 0,-5" fill="none" stroke="#fffaf0" stroke-width="0.8"/>`;
      break; }
    case 'kyoto': {
      const grid=[...Array(5)].map((_,i)=>`<path d="M${52+i*18},10 V82" stroke="#6b4f3a" stroke-width="1.3"/>`).join('')+[...Array(4)].map((_,i)=>`<path d="M44,${24+i*16} H124" stroke="#6b4f3a" stroke-width="1.3"/>`).join('');
      scene = `<rect width="160" height="110" fill="#efe3c6"/>
        <rect x="44" y="8" width="80" height="76" fill="#fbf4e2" stroke="#4a3424" stroke-width="3"/>${grid}
        <path d="M128,70 C132,52 140,40 154,30" fill="none" stroke="#4a3424" stroke-width="1.6"/>
        ${[[140,42],[148,34],[134,56],[152,48]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.2" fill="#f0b4bc" opacity="0.9"/>`).join('')}
        <path d="M22,6 V16" stroke="${ink}" stroke-width="1"/><ellipse cx="22" cy="32" rx="12" ry="15" fill="#c8453a" ${L}/>
        <path d="M11,26 H33 M10,32 H34 M11,38 H33" stroke="#9a2f28" stroke-width="0.8"/><rect x="18" y="15" width="8" height="3" fill="#2e2016"/><rect x="18" y="46" width="8" height="3" fill="#2e2016"/>
        <rect x="0" y="84" width="160" height="26" fill="#c9c18a"/>${[0,40,80,120].map(x=>`<path d="M${x},84 V110" stroke="#5a4a2a" stroke-width="1.2"/>`).join('')}<path d="M0,84 H160" stroke="#5a4a2a" stroke-width="1.6"/>
        <ellipse cx="80" cy="92" rx="34" ry="6" fill="#4a3424" ${L}/><path d="M56,94 V100 M104,94 V100" stroke="#2e2016" stroke-width="2.2"/>
        <path d="M72,88 C72,82 88,82 88,88 Z" fill="#7d9468" ${L}/><path d="M88,85 l6,-2" ${L}/><circle cx="80" cy="81" r="1.4" fill="#7d9468"/>
        <rect x="20" y="96" width="22" height="8" rx="2" fill="#7a2e3a" ${L}/><rect x="118" y="96" width="22" height="8" rx="2" fill="#3f5470" ${L}/>`;
      break; }
    case 'midnight': {
      scene = `<rect width="160" height="110" fill="#1d1a2e"/>
        <path d="M46,88 V30 C46,14 60,6 80,6 C100,6 114,14 114,30 V88 Z" fill="#1b2350" ${L}/>
        <path d="M46,88 V30 C46,14 60,6 80,6 C100,6 114,14 114,30 V88 Z" fill="url(#${u}-sky)"/>
        <circle cx="98" cy="24" r="7" fill="#f5e6b8"/><circle cx="101" cy="22" r="6" fill="#1f2754"/>
        ${[[60,22],[72,14],[86,30],[64,40],[106,44]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="0.9" fill="#fff8e0"/>`).join('')}
        <path d="M46,88 V66 H54 V58 H62 V70 H70 V52 H78 V64 H88 V56 H96 V68 H104 V60 H114 V88 Z" fill="#0b0d1c"/>
        ${[[57,62],[73,58],[81,70],[91,62],[99,72],[108,66]].map(([x,y])=>`<rect x="${x}" y="${y}" width="2" height="2" fill="#f3d58a"/>`).join('')}
        <path d="M80,6 V88 M46,48 H114" stroke="#c4973c" stroke-width="1.2" opacity="0.8"/>
        <path d="M30,0 C34,20 34,60 40,92 L20,92 C24,60 22,20 30,0 Z" fill="#6a1e2e" ${L}/><path d="M130,0 C126,20 126,60 120,92 L140,92 C136,60 138,20 130,0 Z" fill="#6a1e2e" ${L}/>
        <rect x="0" y="92" width="160" height="18" fill="#15121e"/><path d="M0,92 H160" stroke="#c4973c" stroke-width="1"/>
        <circle cx="80" cy="88" r="20" fill="url(#${u}-candle)"/><rect x="77" y="80" width="6" height="12" rx="1" fill="#efe3c6" ${L} stroke-width="0.8"/><path d="M80,72 C83,76 82,79 80,80 C78,79 77,76 80,72 Z" fill="#f6c45a"/>
        <rect x="122" y="90" width="24" height="12" fill="#5a3420" ${L}/><ellipse cx="134" cy="90" rx="11" ry="2.4" fill="#1a1414" ${L} stroke-width="0.7"/>
        <path d="M136,89 L140,74" stroke="#d9b66a" stroke-width="1.6"/><path d="M140,76 C142,66 148,58 156,52 C158,60 156,70 150,76 C147,79 142,79 140,76 Z" fill="#d9b66a" ${L}/><path d="M146,66 C150,64 154,58 156,52" fill="none" stroke="#a8823a" stroke-width="0.8"/>`;
      break; }
    case 'library': {
      const shelf=(x)=>`<rect x="${x}" y="6" width="44" height="82" fill="#3a2a1e" ${L}/>`+[20,38,56,74].map(y=>`<path d="M${x},${y} H${x+44}" stroke="#1e140c" stroke-width="2"/>`).join('')
        +[7,25,43,61].map(y=>[...Array(7)].map((_,i)=>`<rect x="${x+2+i*6}" y="${y+(i%2)}" width="5" height="${12-(i%2)}" fill="${['#7a2e3a','#2f5a40','#c4973c','#5a3a24','#3e4a6a','#8a6a3a'][(i+y)%6]}"/>`).join('')).join('');
      scene = `<rect width="160" height="110" fill="#2b4436"/>${shelf(4)}${shelf(112)}
        <path d="M56,6 H104 V88 H56 Z" fill="#355443"/><rect x="62" y="12" width="36" height="28" fill="#d9c8a0" stroke="#c4973c" stroke-width="2"/><path d="M62,32 C70,26 76,30 82,26 C88,22 94,28 98,26 V40 H62 Z" fill="#6f8a5a"/><circle cx="88" cy="20" r="3" fill="#f3d58a"/>
        <rect x="0" y="88" width="160" height="22" fill="#5a3a24"/><path d="M0,88 H160" stroke="#2a1a10" stroke-width="1.4"/>
        <circle cx="80" cy="82" r="32" fill="url(#${u}-lamp)"/>
        <path d="M66,66 H94 L90,58 H70 Z" fill="#2f6a4a" ${L}/><path d="M80,66 V86" stroke="#c4973c" stroke-width="2"/><ellipse cx="80" cy="88" rx="9" ry="2.4" fill="#c4973c" ${L} stroke-width="0.8"/>
        <path d="M100,92 C108,88 116,88 124,92 C132,88 140,88 148,92 L148,100 C140,96 132,96 124,100 C116,96 108,96 100,100 Z" fill="#f3ead8" ${L} stroke-width="0.8"/><path d="M124,92 V100" ${L} stroke-width="0.7"/>`;
      break; }
    default: { // beach
      scene = `<rect width="160" height="110" fill="#bfe0ef"/><rect width="160" height="58" fill="url(#${u}-sky)"/>
        <circle cx="122" cy="20" r="9" fill="#fff4cc" opacity="0.9"/>
        <path d="M0,46 C30,40 60,44 90,40 C120,36 140,42 160,40 V60 H0 Z" fill="#7aa36a" opacity="0.7"/>
        <rect x="0" y="54" width="160" height="22" fill="#3f86bf"/>${[62,68].map(y=>`<path d="M6,${y} q6,-2 12,0 M40,${y} q6,-2 12,0 M80,${y+2} q6,-2 12,0 M118,${y} q6,-2 12,0" fill="none" stroke="#d8ecf6" stroke-width="0.9"/>`).join('')}
        <path d="M96,60 L100,46 L104,60 Z" fill="#fff" ${L} stroke-width="0.6"/><path d="M94,61 H108 L106,64 H96 Z" fill="#7a3a2a"/>
        <rect x="0" y="76" width="160" height="34" fill="#c8683c"/><path d="M0,90 H160 M40,76 L30,110 M80,76 V110 M120,76 L130,110" stroke="#a9502c" stroke-width="0.9"/>
        <path d="M0,76 H160" stroke="#fffaf0" stroke-width="3"/>${[...Array(17)].map((_,i)=>`<path d="M${4+i*10},66 V76" stroke="#fffaf0" stroke-width="2.2"/>`).join('')}<path d="M0,66 H160" stroke="#fffaf0" stroke-width="2.4"/>
        <path d="M36,104 V40" stroke="#efe3c6" stroke-width="2"/>
        <path d="M8,42 Q36,14 64,42 Z" fill="#c0392b" ${L}/>${[0,1,2,3,4,5,6].map(i=>`<path d="M36,22 L${12+i*8},42" stroke="${i%2?'#f6ead6':'#a52f25'}" stroke-width="${i%2?2.4:0.6}"/>`).join('')}<path d="M8,42 Q36,14 64,42" fill="none" ${L}/>
        <path d="M128,104 L124,86 H148 L144,104 Z" fill="#b5532f" ${L}/>
        ${[[130,78],[140,74],[136,84],[146,82],[126,86]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${5+i%2}" fill="${i%2?'#e0648a':'#c94a74'}" opacity="0.9"/>`).join('')}<circle cx="136" cy="90" r="4" fill="#6f8a5a"/>
        <ellipse cx="80" cy="100" rx="14" ry="3" fill="#fffaf0" ${L}/><path d="M80,100 V108" ${L} stroke-width="1.4"/>`;
    }
  }
  return `<svg class="vibe-art ${cls}" viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <filter id="${u}-p" x="-3%" y="-3%" width="106%" height="106%">
        <feTurbulence type="fractalNoise" baseFrequency="0.045 0.06" numOctaves="2" seed="11" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="5" result="blot"/>
        <feColorMatrix in="blot" type="matrix" values="0 0 0 0 ${dark?'0.85':'0.25'}  0 0 0 0 ${dark?'0.75':'0.15'}  0 0 0 0 ${dark?'0.55':'0.06'}  0 0 0 ${dark?'0.35':'0.6'} -0.3" result="b2"/>
        <feComposite in="b2" in2="d" operator="in" result="b3"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="grain"/>
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.12  0 0 0 0.35 -0.1" result="g2"/>
        <feComposite in="g2" in2="d" operator="in" result="g3"/>
        <feMerge><feMergeNode in="d"/><feMergeNode in="b3"/><feMergeNode in="g3"/></feMerge>
      </filter>
      <radialGradient id="${u}-glow" cx="50%" cy="60%" r="70%"><stop offset="0" stop-color="#fff2c8" stop-opacity="0.8"/><stop offset="1" stop-color="#e2a060" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}-lamp"><stop offset="0" stop-color="#ffe6a8" stop-opacity="0.75"/><stop offset="1" stop-color="#ffe6a8" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}-candle"><stop offset="0" stop-color="#ffd890" stop-opacity="0.6"/><stop offset="1" stop-color="#ffd890" stop-opacity="0"/></radialGradient>
      <linearGradient id="${u}-sky" x1="0" y1="0" x2="0" y2="1">${k==='midnight' ? '<stop offset="0" stop-color="#0e1330"/><stop offset="1" stop-color="#2b3a74"/>' : '<stop offset="0" stop-color="#9fd0ea"/><stop offset="1" stop-color="#f3e3c4"/>'}</linearGradient>
      <linearGradient id="${u}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.12"/><stop offset="1" stop-color="#5a3020" stop-opacity="0.18"/></linearGradient>
      <pattern id="${u}-rain" width="9" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(12)"><path d="M3,0 V7" stroke="#eef5f8" stroke-width="0.7" opacity="0.7"/></pattern>
    </defs>
    <g filter="url(#${u}-p)">${scene}</g>
    <rect width="160" height="110" fill="url(#${u}-g)" opacity="0.6"/>
  </svg>`;
}

// ── The café list (Study Café page) ──
let selectedVibe = 'midnight';
let unsubInvites = null;

function renderVibePicker(){
  const el=document.getElementById('vibe-picker');
  if(!el) return;
  el.innerHTML = VIBE_KEYS.map(k=>{
    const v=CAFE_VIBES[k];
    return `<button type="button" class="vibe-tile ${k===selectedVibe?'sel':''}" onclick="pickVibe('${k}')" aria-pressed="${k===selectedVibe}">
      <span class="vibe-pic">${vibeArtSVG(k)}</span>
      <span class="vibe-name">${v.label}</span>
      <span class="vibe-tag">${v.tagline}</span>
      <span class="vibe-seal" aria-hidden="true"><svg viewBox="0 0 20 20" width="13" height="13"><path d="M5 10.5l3.2 3.2L15 6.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </button>`;
  }).join('');
}
function pickVibe(k){ selectedVibe=k; renderVibePicker(); }

async function renderCafeList(){
  const signedIn = !!S.user;
  document.getElementById('cafe-signed-out').hidden = signedIn;
  document.getElementById('cafe-signed-in').hidden = !signedIn;
  if(!signedIn){ if(unsubInvites){ unsubInvites(); unsubInvites=null; } return; }
  renderVibePicker();
  if(!unsubInvites){ try{ unsubInvites = CafeDB.subscribeInvites(()=>renderCafeList()); }catch(e){} }
  renderCafeFriendCards();
  const grid=document.getElementById('rooms-grid');
  const invitesEl=document.getElementById('cafe-invites');
  try{
    const [cafes, invites] = await Promise.all([CafeDB.listMine(), CafeDB.listInvites()]);
    await attachPeople(invites);
    S.cafes = cafes;
    invitesEl.hidden = !invites.length;
    invitesEl.innerHTML = invites.length ? `<h3 class="cafe-section-h"><span>Invitations</span></h3>` + invites.map(inv=>{
      const v=vibeOf(inv.cafes?.vibe);
      return `<div class="invite-card">
        <span class="invite-pic">${vibeArtSVG(inv.cafes?.vibe)}</span>
        <div class="invite-text"><strong>${esc(personName(inv))}</strong> invited you to <em>${esc(inv.cafes?.name||'a café')}</em>
          <span class="invite-vibe">${v.label}</span></div>
        <div class="invite-actions">
          <button class="btn-p vbtn" onclick="acceptInvite('${esc(inv.cafes?.invite_code||'')}')">${vicon('door')}Join</button>
          <button class="btn-s invite-decline" onclick="declineInvite('${esc(inv.id)}')">Decline</button>
        </div>
      </div>`;
    }).join('') : '';
    grid.innerHTML = cafes.length ? cafes.map(cafeCardHTML).join('')
      : `<div class="empty-state" style="grid-column:1/-1;"><p>No cafés yet — open one above, or join a friend's with their code.</p></div>`;
  } catch(e){
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p>${esc(cafeErrorText(e))}</p></div>`;
  }
}
function cafeCardHTML(c){
  const v=vibeOf(c.vibe);
  // who's at the table: each person's animal in a little cameo, with their drink beside them
  const people=c.members.slice(0,8).map(m=>`
    <div class="member-slot" title="${esc(personName(m))}${m.drink?' — '+esc(m.drink.label||''):''}">
      <span class="member-cameo">${characterSVG(m.look || defaultCharFor(m.user_id))}</span>
      ${m.drink ? `<span class="member-cup">${buildCupSVG({size:40,fillFraction:1,steam:false,cup:m.drink.cup||'mug',base:m.drink.base||'coffee',drink:m.drink.drink,addons:m.drink.addons||[]})}</span>` : ''}
      <span class="member-name">${esc(personName(m))}</span>
    </div>`).join('');
  return `<div class="room-card">
    <div class="room-card-art">${vibeArtSVG(c.vibe)}</div>
    <div class="room-card-label"><span class="room-card-vibe">${v.label}</span></div>
    <div class="room-card-name">${esc(c.name)}</div>
    <div class="room-card-meta"><span>${c.members.length} seated</span><i></i><span>${c.owner_id===S.user.id?'you host':'guest'}</span></div>
    <div class="room-card-date">${v.tagline}</div>
    <div class="room-people">${people}</div>
    <button class="room-join-btn vbtn" onclick="enterCafe('${esc(c.id)}')">${vicon('door')}Enter café</button>
  </div>`;
}
function cafeErrorText(e){
  const m=String(e?.message||e);
  if(/cafes_vibe_check/.test(m)) return 'That café type isn’t set up in the database yet — run the latest supabase/cafes.sql in the Supabase SQL editor.';
  if(/schema cache|does not exist|Could not find the (table|function)/i.test(m))
    return 'The café tables aren’t set up in Supabase yet — run supabase/cafes.sql in the Supabase SQL editor.';
  return m;
}

async function createCafe(){
  const nameEl=document.getElementById('room-name');
  const name=nameEl.value.trim();
  if(!name){ showToast('Give your café a name'); nameEl.focus(); return; }
  try{
    let cafe;
    try{ cafe = await CafeDB.create(name, selectedVibe); }
    catch(e){
      // A database set up before the Beach Café existed still lists the old
      // Fireside Cabin instead; the site shows a "cabin" café as the Beach
      // Café everywhere, so save it under that name.
      if(selectedVibe==='beach' && /cafes_vibe_check/.test(e?.message||'')) cafe = await CafeDB.create(name, 'cabin');
      else throw e;
    }
    nameEl.value='';
    showToast(`"${name}" is open`);
    enterCafe(cafe.id);
  } catch(e){ showToast(cafeErrorText(e)); }
}
async function joinWithCode(){
  const el=document.getElementById('join-code');
  const code=el.value.trim();
  if(!code){ el.focus(); return; }
  try{ const id=await CafeDB.joinByCode(code); el.value=''; enterCafe(id); }
  catch(e){ showToast(cafeErrorText(e)); }
}
async function acceptInvite(code){
  try{ const id=await CafeDB.joinByCode(code); enterCafe(id); }
  catch(e){ showToast(cafeErrorText(e)); }
}
async function declineInvite(id){
  try{ await CafeDB.declineInvite(id); renderCafeList(); } catch(e){ showToast(cafeErrorText(e)); }
}

// Invite links look like …/Brew-Focus/?cafe=AB12CD. Opening one joins that
// café (after signing in, if needed).
function inviteLinkFor(code){ return `${location.origin}${location.pathname}?cafe=${encodeURIComponent(code)}`; }
S.pendingCafeCode = new URLSearchParams(location.search).get('cafe');
async function processPendingInvite(authChecked){
  const code=S.pendingCafeCode;
  if(!code) return;
  if(!S.user){
    if(authChecked){
      showPage('cafe');
      openAuthModal('signin');
      setAuthMsg('Log in (or sign up) to take your seat at your friend’s café.', '');
    }
    return;
  }
  S.pendingCafeCode=null;
  history.replaceState(null, '', location.pathname);
  try{ const id=await CafeDB.joinByCode(code); closeAuthModalDirect(); enterCafe(id); }
  catch(e){ showToast(cafeErrorText(e)); showPage('cafe'); }
}

// ── Inside a café ──
S.room = null; // { id, cafe, presence:Set, unsub, tick, offset, lastFrac }

async function enterCafe(id){
  if(!S.user){ openAuthModal('signin'); return; }
  leaveRoomRealtime();
  S.room = { id, cafe:null, presence:new Set([S.user.id]), unsub:null, tick:null, offset:0, lastFrac:null };
  showPage('caferoom');
  try{
    const cafe = await CafeDB.getCafe(id);
    if(!S.room || S.room.id!==id) return;
    if(!cafe){ showToast('That café is no longer open'); showPage('cafe'); return; }
    S.room.offset = await measureClockOffset();
    if(!S.room || S.room.id!==id) return;
    S.room.cafe = cafe;
    renderCafeRoom();
    const vibe=vibeOf(cafe.vibe);
    setAmbience(vibe.ambience);
    applyMusic();
    S.room.unsub = CafeDB.subscribeCafe(id, {
      onChange: ()=>refreshCafeRoom(),
      onPresence: ids=>{ if(S.room){ S.room.presence=new Set([S.user.id, ...ids]); renderSeats(true); } },
    });
    S.room.tick = setInterval(tickCafeTimer, 250);   // keeps everyone's clocks turning over together
  } catch(e){ showToast(cafeErrorText(e)); showPage('cafe'); }
}
// How far this device's clock is from the server's, so the shared timer reads
// the same on every screen. Takes a few quick readings and trusts the one
// with the shortest round trip (the least room for delay to skew it).
async function measureClockOffset(){
  let best=null;
  for(let i=0;i<3;i++){
    try{
      const t0=performance.now(), w0=Date.now();
      const server=await CafeDB.serverNow();
      const rtt=performance.now()-t0;
      const offset=Date.parse(server) - (w0 + rtt/2);
      if(!best || rtt<best.rtt) best={rtt, offset};
    }catch(e){ break; }
  }
  return best ? best.offset : 0;
}

// Several changes often land together (a seat and the timer, say), so live
// updates are gathered into one refresh, and a reply that has been
// overtaken by a newer one is ignored rather than overwriting fresher data.
function refreshCafeRoom(){
  if(!S.room) return;
  clearTimeout(S.room.refreshTimer);
  S.room.refreshTimer = setTimeout(loadCafeRoom, 120);
}
async function loadCafeRoom(){
  if(!S.room) return;
  const seq = S.room.seq = (S.room.seq||0) + 1;
  const roomId = S.room.id;
  try{
    const cafe=await CafeDB.getCafe(roomId);
    if(!S.room || S.room.id!==roomId || seq!==S.room.seq) return;
    if(!cafe || !cafe.members.some(m=>m.user_id===S.user.id)){
      showToast('This café has closed its doors'); leaveRoomRealtime(); S.room=null; showPage('cafe'); return;
    }
    S.room.cafe=cafe; S.room.lastFrac=null;
    renderCafeRoom();
  } catch(e){ console.warn(e); }
}
function leaveRoomRealtime(){
  if(!S.room) return;
  clearSitters(); closeCallCard();
  if(S.room.unsub) S.room.unsub();
  if(S.room.tick) clearInterval(S.room.tick);
  clearTimeout(S.room.refreshTimer);
  S.room.unsub=null; S.room.tick=null;
}
function backToCafeList(){ leaveRoomRealtime(); S.room=null; showPage('cafe'); }
function returnToCafeRoom(){ const id=S.cafeBrew || S.room?.id; S.cafeBrew=null; if(id) enterCafe(id); else showPage('cafe'); }

const isHost = ()=> S.room?.cafe?.owner_id===S.user?.id;
const myMember = ()=> S.room?.cafe?.members.find(m=>m.user_id===S.user?.id);

function renderCafeRoom(){
  const c=S.room?.cafe; if(!c) return;
  const v=vibeOf(c.vibe);
  const room=document.getElementById('cafe-room');
  const vk = c.vibe==='cabin' ? 'beach' : c.vibe;
  room.className = 'cr vibe-'+(CAFE_VIBES[vk]?vk:'parisian');
  // the floor around the room takes on the café's colour too
  document.getElementById('page-caferoom').style.background = getComputedStyle(room).getPropertyValue('--cr-page').trim() || '#1a0f08';
  document.getElementById('cr-vibe').textContent = v.label;
  document.getElementById('cr-name').textContent = c.name;
  document.getElementById('cr-sign').textContent = c.name;
  document.getElementById('cr-tagline').textContent = v.tagline;
  document.getElementById('cr-leave').textContent = isHost() ? 'Close this café' : 'Leave this café';
  renderSeats(true);
  renderMyDrinkPanel();
  renderCafeTimer();
}

// Seats around the table: each person's drink, name card, and whether
// they're here right now. Drinks empty together as the shared timer runs.
function timerState(){
  const c=S.room?.cafe; if(!c) return {remaining:0, total:1, running:false};
  let remaining=c.timer_remaining_secs;
  if(c.timer_started_at){
    const elapsed=Math.floor((Date.now()+S.room.offset - Date.parse(c.timer_started_at))/1000);
    remaining=Math.max(0, c.timer_remaining_secs - elapsed);
  }
  return {remaining, total:c.timer_duration_secs||1, running:!!c.timer_started_at};
}
// ── Vintage line icons (engraving style) ──
const VICON = {
  cards:   '<rect x="5.5" y="4" width="11" height="8" rx="0.8" transform="rotate(8 11 8)" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6"/><rect x="3" y="7" width="12" height="8.6" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.6 10.2h4.4M5.6 12.6h6.6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
  back:    '<path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  letter:  '<rect x="2.8" y="5" width="14.4" height="10" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.2 5.6L10 11l6.8-5.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="10" cy="12.6" r="1.5" fill="currentColor" opacity="0.55"/>',
  kettle:  '<path d="M5 15.5h10M6 15.5c-.9-1.6-1.2-3.4-.6-5.6.6-2.2 2.4-3.4 4.6-3.4s4 1.2 4.6 3.4c.6 2.2.3 4-.6 5.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M14.7 9.4l2.6-1.8M8.6 6.5c0-1 .6-1.8 1.4-1.8s1.4.8 1.4 1.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M8 3.2c.4-.6.4-1.1 0-1.7M11.2 3.2c.4-.6.4-1.1 0-1.7" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>',
  menu:    '<path d="M5 3.5h10v13H5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.5 7h5M7.5 9.6h5M7.5 12.2h3.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M5 3.5c-1 0-1.6.7-1.6 1.6M15 16.5c1 0 1.6-.7 1.6-1.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  door:    '<path d="M5 17V3.6h8.4V17M3.4 17h13.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11.2" cy="10.6" r="0.9" fill="currentColor"/><path d="M5 3.6l4 1.4V17" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>',
  cup:     '<path d="M4.5 7.5h9v3.6a4.5 4.5 0 0 1-9 0z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M13.5 8.6h1.2a2 2 0 0 1 0 4h-1.4M3.5 16h11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M7.5 5.4c.4-.6.4-1.2 0-1.8M10.5 5.4c.4-.6.4-1.2 0-1.8" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>',
  copy:    '<rect x="6.5" y="6.5" width="9.5" height="10" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 13.5V4.2c0-.5.4-.8.8-.8H12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  send:    '<path d="M3 10l13.5-6-4.5 13-2.6-5.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.4 11.6L16.5 4" stroke="currentColor" stroke-width="1.2"/>',
  key:     '<circle cx="6.5" cy="10" r="3.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M9.9 10H17M14.2 10v2.6M16.2 10v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
};
const vicon = (name, size=16) => `<svg class="vicon" viewBox="0 0 20 20" width="${size}" height="${size}" aria-hidden="true">${VICON[name]||''}</svg>`;

// ── The round table and its chairs ──
// Drawn in a 1000 × 440 box; seats sit around an ellipse so the table reads
// as round, seen from a little above. You always sit at the front.
const TABLE = { cx:500, cy:236, rx:270, ry:90, chairRx:372, chairRy:142, cupRx:178, cupRy:62, w:1000, h:440 };
const TABLE_STYLE = {   // tabletop finish and centrepiece for each café type
  parisian:'marble', bookstore:'wood', kyoto:'wood', midnight:'lacquer', library:'leather', beach:'linen' };
const CENTREPIECE = { parisian:'flowers', bookstore:'books', kyoto:'ikebana', midnight:'candle', library:'lamp', beach:'carafe' };

// Seats go round the table leaving the front open (that's where we're
// looking from); seat 0 — yours — is at the front left.
const FRONT_GAP = 64*Math.PI/180;
function seatAngles(n){ return Array.from({length:n}, (_,i)=> Math.PI/2 + FRONT_GAP/2 + i*(2*Math.PI-FRONT_GAP)/Math.max(1,n-1)); }
function seatPoint(a, rx, ry){ return { x:TABLE.cx + rx*Math.cos(a), y:TABLE.cy + ry*Math.sin(a) }; }
function depthScale(y){ return 0.78 + 0.34*(y - (TABLE.cy-TABLE.chairRy))/(2*TABLE.chairRy); }

// A bentwood bistro chair. "near" chairs face away from us (we see the
// back hoop in front of the seat); "far" chairs face us across the table.
function chairSVG(x, y, s, near){
  const legs = `<path d="M-22,6 L-27,60 M22,6 L27,60 M-14,-4 L-17,52 M14,-4 L17,52" />`;
  const hoop = `<ellipse cx="0" cy="38" rx="22" ry="6" fill="none"/>`;
  const seat = `<ellipse class="ch-seat" cx="0" cy="0" rx="29" ry="9.5"/>`;
  const backFar  = `<path d="M-19,-3 C-24,-40 -21,-80 0,-82 C21,-80 24,-40 19,-3"/><path d="M-11,-7 C-15,-36 -12,-64 0,-65 C12,-64 15,-36 11,-7"/>`;
  const backNear = `<path d="M-19,6 C-24,-32 -21,-74 0,-76 C21,-74 24,-32 19,6"/><path d="M-11,3 C-15,-28 -12,-58 0,-59 C12,-58 15,-28 11,3"/>`;
  const shadow = `<ellipse class="ch-shadow" cx="0" cy="60" rx="34" ry="7"/>`;
  const body = shadow + (near ? legs+hoop+seat+backNear : backFar+legs+seat+hoop);
  return `<g class="cr-chair ${near?'near':'far'}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})">${body}</g>`;
}

// A zabuton floor cushion for the tea house, where everyone sits on the
// tatami instead of on chairs. Puffy square, stitched edge and a centre tuft.
const ZABUTON_COLOURS = ['var(--chair-seat)', '#3f5470', '#a8553a', '#6a5a7a'];
function zabutonSVG(x, y, s, i){
  const col = ZABUTON_COLOURS[i % ZABUTON_COLOURS.length];
  return `<g class="cr-zabuton" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})">
    <ellipse class="zb-shadow" cx="2" cy="16" rx="50" ry="10"/>
    <path class="zb-side" style="fill:${col}" d="M-44,0 Q-46,10 -38,15 Q0,19 38,15 Q46,10 44,0 Z"/>
    <path class="zb-side-shade" d="M-44,0 Q-46,10 -38,15 Q0,19 38,15 Q46,10 44,0 Z"/>
    <path class="zb-top" style="fill:${col}" d="M-34,-15 Q0,-19 34,-15 Q40,-14 42,-8 Q46,0 44,2 Q0,9 -44,2 Q-46,0 -42,-8 Q-40,-14 -34,-15 Z"/>
    <path class="zb-sheen" d="M-30,-12 Q0,-15 30,-12 Q4,-9 -30,-12 Z"/>
    <path class="zb-stitch" d="M-34,-10 Q0,-13 34,-10 Q38,-4 38,-1 Q0,4 -38,-1 Q-38,-4 -34,-10 Z"/>
    <path class="zb-tuft" d="M-4,-6 L4,-2 M4,-6 L-4,-2"/>
  </g>`;
}

// A low chabudai tea table: thick round top on four short legs.
function lowTableSVG(){
  const {cx,cy,rx,ry}=TABLE;
  const leg = (dx)=>`<path d="M${cx+dx-9},${cy+60} L${cx+dx-7},${cy+112} Q${cx+dx},${cy+117} ${cx+dx+7},${cy+112} L${cx+dx+9},${cy+60} Z" fill="var(--table-2)"/>
    <path d="M${cx+dx-3},${cy+66} L${cx+dx-2},${cy+108}" stroke="rgba(255,255,255,0.12)" stroke-width="3"/>`;
  return `<ellipse cx="${cx}" cy="${cy+112}" rx="${rx-10}" ry="30" fill="rgba(0,0,0,0.3)"/>
    ${leg(-170)}${leg(170)}
    <ellipse cx="${cx}" cy="${cy+22}" rx="${rx}" ry="${ry}" fill="var(--table-2)"/>`;
}

// ── Café characters ───────────────────────────────────────────────────────
// Storybook animals in old-fashioned café clothes, drawn like a vintage
// children's book plate: sepia ink, soft watercolour washes on paper. A
// character is a handful of named choices (never raw colours), drawn fresh
// as an SVG bust that sits on a café chair or cushion.
const CHAR = {
  animal:  { cat:'Cat', rabbit:'Rabbit', fox:'Fox', bear:'Bear', mouse:'Mouse', owl:'Owl', dog:'Dog', hedgehog:'Hedgehog' },
  fur:     { ginger:'#d0894f', honey:'#d8b07a', cocoa:'#8c6448', chestnut:'#a4643c', slate:'#8e9096', charcoal:'#55504b', oat:'#e8dcc2', snow:'#fcfaf5' },
  outfit:  { cardigan:'Cardigan', waistcoat:'Waistcoat', scarf:'Scarf', collar:'Collar' },
  color:   { burgundy:'#7a2e3a', mustard:'#c4973c', sage:'#7f9470', rose:'#c48a8c', slate:'#4e5a70', rust:'#a4552f', oat:'#d9c8a4', cocoa:'#6b4a34' },
  hat:     { none:'None', beret:'Beret', flatcap:'Flat cap', cloche:'Cloche', boater:'Boater', flower:'Flower', bow:'Bow' },
  glasses: { none:'None', round:'Spectacles', halfmoon:'Half-moon' },
  face:    { smile:'Content', happy:'Happy', wink:'Wink', sleepy:'Sleepy' },
};
const CHAR_KEYS = { animal:'animal', fur:'fur', outfit:'outfit', outfitColor:'color', hat:'hat', hatColor:'color', glasses:'glasses', face:'face' };
const CHAR_PRESETS = [
  {animal:'cat', fur:'ginger', outfit:'cardigan', outfitColor:'sage', hat:'none', glasses:'none', face:'smile'},
  {animal:'rabbit', fur:'snow', outfit:'collar', outfitColor:'rose', hat:'flower', glasses:'none', face:'happy'},
  {animal:'fox', fur:'ginger', outfit:'waistcoat', outfitColor:'burgundy', hat:'flatcap', hatColor:'cocoa', glasses:'none', face:'wink'},
  {animal:'bear', fur:'cocoa', outfit:'scarf', outfitColor:'mustard', hat:'none', glasses:'round', face:'smile'},
  {animal:'mouse', fur:'slate', outfit:'cardigan', outfitColor:'burgundy', hat:'bow', hatColor:'mustard', glasses:'none', face:'happy'},
  {animal:'owl', fur:'chestnut', outfit:'waistcoat', outfitColor:'sage', hat:'none', glasses:'halfmoon', face:'smile'},
  {animal:'dog', fur:'honey', outfit:'scarf', outfitColor:'burgundy', hat:'beret', hatColor:'slate', glasses:'none', face:'happy'},
  {animal:'hedgehog', fur:'cocoa', outfit:'cardigan', outfitColor:'mustard', hat:'none', glasses:'round', face:'sleepy'},
  {animal:'cat', fur:'charcoal', outfit:'collar', outfitColor:'burgundy', hat:'beret', hatColor:'burgundy', glasses:'none', face:'smile'},
  {animal:'rabbit', fur:'oat', outfit:'scarf', outfitColor:'sage', hat:'cloche', hatColor:'rose', glasses:'none', face:'smile'},
  {animal:'bear', fur:'honey', outfit:'waistcoat', outfitColor:'mustard', hat:'boater', glasses:'none', face:'happy'},
  {animal:'fox', fur:'chestnut', outfit:'cardigan', outfitColor:'oat', hat:'none', glasses:'round', face:'smile'},
  {animal:'mouse', fur:'honey', outfit:'collar', outfitColor:'sage', hat:'flower', glasses:'none', face:'smile'},
  {animal:'dog', fur:'charcoal', outfit:'waistcoat', outfitColor:'rust', hat:'flatcap', hatColor:'slate', glasses:'none', face:'smile'},
  {animal:'owl', fur:'oat', outfit:'scarf', outfitColor:'rose', hat:'none', glasses:'round', face:'happy'},
  {animal:'cat', fur:'snow', outfit:'scarf', outfitColor:'slate', hat:'cloche', hatColor:'burgundy', glasses:'none', face:'sleepy'},
  {animal:'hedgehog', fur:'chestnut', outfit:'collar', outfitColor:'rose', hat:'bow', hatColor:'burgundy', glasses:'none', face:'happy'},
  {animal:'bear', fur:'charcoal', outfit:'cardigan', outfitColor:'rust', hat:'beret', hatColor:'mustard', glasses:'none', face:'wink'},
];
// Keep only choices we know how to draw; anything else falls back.
function normalizeChar(c){
  const d={animal:'cat', fur:'ginger', outfit:'cardigan', outfitColor:'sage', hat:'none', hatColor:'burgundy', glasses:'none', face:'smile'};
  if(!c || typeof c!=='object') return d;
  const out={...d};
  for(const [k,group] of Object.entries(CHAR_KEYS)) if(typeof c[k]==='string' && Object.prototype.hasOwnProperty.call(CHAR[group], c[k])) out[k]=c[k];
  return out;
}
// Someone who hasn't chosen yet still gets a character, always the same one.
function defaultCharFor(id){
  let h=2166136261; for(const ch of String(id||'')){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619)>>>0; }
  return {...CHAR_PRESETS[h % CHAR_PRESETS.length]};
}
// mix a colour towards black (amt<0) or cream (amt>0)
function tint(hex, amt){
  const n=parseInt(hex.slice(1),16), r=n>>16, g=(n>>8)&255, b=n&255;
  const to = amt<0 ? [40,26,18] : [250,244,232], t=Math.abs(amt);
  const m=(a,z)=>Math.round(a+(z-a)*t);
  return '#'+[m(r,to[0]),m(g,to[1]),m(b,to[2])].map(v=>v.toString(16).padStart(2,'0')).join('');
}

let charUid=0;
// pose: 'bust' (portrait), 'stand' (step 0/1/2 for walking), 'sit' (on a chair), 'kneel' (on a cushion)
const CHAR_FULL_H = 188;                                   // height of the full-body drawing
const CHAR_ANCHOR = { stand:0.985, sit:150/188, kneel:161/188 };   // where it touches the floor or seat
function characterSVG(cfg, {cls='', title='', pose='bust', step=0}={}){
  const c=normalizeChar(cfg), u='ch'+(++charUid);
  const ink='#4a3428', lw=`stroke="${ink}" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"`;
  const fur=CHAR.fur[c.fur], furD=tint(fur,-0.22), furL=c.fur==='snow'||c.fur==='oat' ? '#fffdf9' : tint(fur,0.62);
  const pink='#e7a9a4', cloth=CHAR.color[c.outfitColor], hatC=CHAR.color[c.hatColor];
  const F=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${lw} ${extra}/>`;
  const wash=(d)=>`<path d="${d}" fill="url(#${u}-w)"/>`;          // a little watercolour shading
  let ears='', head='', face='', back='';
  // eyes / nose anchor per animal
  let ey=57, ex=10.5, noseY=65, cheeks=true;
  switch(c.animal){
    case 'rabbit':
      ears = F('M45,38 C37,20 38,2 47,1 C56,0 57,20 53,38 Z',fur)+F('M47,34 C43,20 44,8 47,6 C51,8 52,20 50,34 Z',pink,'stroke-width="0.8"')
           + F('M67,38 C63,20 64,0 73,1 C82,2 83,20 75,38 Z',fur)+F('M70,34 C68,20 69,8 73,6 C76,8 77,20 73,34 Z',pink,'stroke-width="0.8"');
      head = F('M33,57 C33,40 45,31 60,31 C75,31 87,40 87,57 C87,72 75,82 60,82 C45,82 33,72 33,57 Z',fur)
           + `<ellipse cx="55" cy="68" rx="6" ry="5" fill="${furL}"/><ellipse cx="65" cy="68" rx="6" ry="5" fill="${furL}"/>`;
      noseY=65; break;
    case 'fox':
      ears = F('M35,46 L31,18 L52,33 Z',fur)+F('M37,40 L35,25 L46,34 Z',furD,'stroke-width="0.8"')
           + F('M85,46 L89,18 L68,33 Z',fur)+F('M83,40 L85,25 L74,34 Z',furD,'stroke-width="0.8"');
      head = F('M31,52 C31,38 45,31 60,31 C75,31 89,38 89,52 C89,64 74,78 60,84 C46,78 31,64 31,52 Z',fur)
           + F('M33,56 C42,57 52,63 60,84 C68,63 78,57 87,56 C85,68 72,79 60,84 C48,79 35,68 33,56 Z',furL,'stroke-width="0.9"');
      noseY=79; ey=55; break;
    case 'bear':
      ears = `<circle cx="37" cy="36" r="10" fill="${fur}" ${lw}/><circle cx="37" cy="36" r="5.5" fill="${furD}"/><circle cx="83" cy="36" r="10" fill="${fur}" ${lw}/><circle cx="83" cy="36" r="5.5" fill="${furD}"/>`;
      head = F('M31,58 C31,40 44,31 60,31 C76,31 89,40 89,58 C89,74 76,84 60,84 C44,84 31,74 31,58 Z',fur)
           + `<ellipse cx="60" cy="69" rx="12" ry="9" fill="${furL}" ${lw} stroke-width="0.9"/>`;
      noseY=65; break;
    case 'mouse':
      ears = `<circle cx="32" cy="38" r="14" fill="${fur}" ${lw}/><circle cx="32" cy="38" r="8.5" fill="${pink}"/><circle cx="88" cy="38" r="14" fill="${fur}" ${lw}/><circle cx="88" cy="38" r="8.5" fill="${pink}"/>`;
      head = F('M33,54 C33,39 46,32 60,32 C74,32 87,39 87,54 C87,66 76,75 65,79 C62,80.5 58,80.5 55,79 C44,75 33,66 33,54 Z',fur);
      noseY=76; ey=55; break;
    case 'owl':
      ears = F('M35,40 L30,20 L47,33 Z',furD)+F('M85,40 L90,20 L73,33 Z',furD);
      head = F('M30,58 C30,38 44,30 60,30 C76,30 90,38 90,58 C90,74 76,84 60,84 C44,84 30,74 30,58 Z',fur)
           + `<circle cx="48.5" cy="56" r="12" fill="${furL}" ${lw} stroke-width="0.9"/><circle cx="71.5" cy="56" r="12" fill="${furL}" ${lw} stroke-width="0.9"/>`
           + `<path d="M50,38 l3,3 l3,-3 M58,36 l2.5,3 l2.5,-3 M64,38 l3,3 l3,-3" fill="none" stroke="${furD}" stroke-width="1.2"/>`;
      ey=56; ex=11.5; cheeks=false; noseY=0; break;
    case 'dog':
      back = F('M36,40 C24,40 18,60 22,78 C25,86 35,84 38,74 C41,62 42,46 36,40 Z',furD)+F('M84,40 C96,40 102,60 98,78 C95,86 85,84 82,74 C79,62 78,46 84,40 Z',furD);
      head = F('M34,57 C34,40 46,31 60,31 C74,31 86,40 86,57 C86,72 74,82 60,82 C46,82 34,72 34,57 Z',fur)
           + `<ellipse cx="60" cy="69" rx="12.5" ry="9.5" fill="${furL}" ${lw} stroke-width="0.9"/>`;
      ears = '';
      noseY=65; break;
    case 'hedgehog': {
      let d='M26,64'; const n=13;
      for(let i=0;i<=n;i++){ const a=Math.PI*(1.05+0.9*i/n), r1=36, r2=27; const x1=60+r1*Math.cos(a), y1=58+r1*Math.sin(a)*0.92, a2=Math.PI*(1.05+0.9*(i+0.5)/n), x2=60+r2*Math.cos(a2), y2=58+r2*Math.sin(a2)*0.92; d+=` L${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`; }
      d+=' L94,64 C90,76 76,84 60,84 C44,84 30,76 26,64 Z';
      back = F(d,furD) + `<path d="${d}" fill="url(#${u}-s)"/>`;
      head = F('M35,60 C35,46 46,38 60,38 C74,38 85,46 85,60 C85,70 72,79 60,81 C48,79 35,70 35,60 Z',furL);
      ears = `<circle cx="40" cy="44" r="4.5" fill="${furL}" ${lw}/><circle cx="80" cy="44" r="4.5" fill="${furL}" ${lw}/>`;
      noseY=76; ey=60; break; }
    default: // cat
      ears = F('M36,46 L33,20 L53,34 Z',fur)+F('M38,41 L37,27 L47,35 Z',pink,'stroke-width="0.8"')
           + F('M84,46 L87,20 L67,34 Z',fur)+F('M82,41 L83,27 L73,35 Z',pink,'stroke-width="0.8"');
      head = F('M32,58 C32,41 45,32 60,32 C75,32 88,41 88,58 C88,73 75,82 60,82 C45,82 32,73 32,58 Z',fur)
           + `<path d="M50,34 l2,7 M58,32.5 l0,7 M66,33 l-1.5,7" stroke="${furD}" stroke-width="1.6" stroke-linecap="round"/>`;
      noseY=66;
  }
  // nose, mouth and whiskers
  let nose='';
  if(c.animal==='owl') nose=`<path d="M56.5,62 L63.5,62 L60,70 Z" fill="#c4973c" ${lw}/>`;
  else if(c.animal==='fox'||c.animal==='hedgehog'||c.animal==='mouse') nose=`<ellipse cx="60" cy="${noseY}" rx="3.2" ry="2.5" fill="${c.animal==='mouse'?pink:ink}" ${lw} stroke-width="0.9"/>`;
  else nose=`<path d="M55.5,${noseY-1.5} C55.5,${noseY-3.5} 64.5,${noseY-3.5} 64.5,${noseY-1.5} C64.5,${noseY+0.5} 61,${noseY+2.5} 60,${noseY+2.5} C59,${noseY+2.5} 55.5,${noseY+0.5} 55.5,${noseY-1.5} Z" fill="${c.animal==='rabbit'||c.animal==='cat'?pink:ink}" ${lw} stroke-width="0.9"/>`
    + `<path d="M60,${noseY+2.5} v2.5 M60,${noseY+5} q-3,3 -6,1 M60,${noseY+5} q3,3 6,1" fill="none" stroke="${ink}" stroke-width="1.1" stroke-linecap="round"/>`;
  const whiskers = (c.animal==='cat'||c.animal==='rabbit'||c.animal==='mouse')
    ? `<path d="M46,${noseY+1} l-14,-3 M46,${noseY+4} l-14,2 M74,${noseY+1} l14,-3 M74,${noseY+4} l14,2" stroke="${ink}" stroke-width="0.7" opacity="0.7"/>` : '';
  // eyes
  const L=60-ex, R=60+ex, big=c.animal==='owl';
  const open=(x)=> big ? `<circle cx="${x}" cy="${ey}" r="5.6" fill="#d9a441" ${lw} stroke-width="1"/><circle cx="${x}" cy="${ey}" r="3" fill="${ink}"/><circle cx="${x+1.2}" cy="${ey-1.4}" r="1" fill="#fff"/>`
                       : `<ellipse cx="${x}" cy="${ey}" rx="2.4" ry="2.9" fill="${ink}"/><circle cx="${x+0.8}" cy="${ey-1.1}" r="0.8" fill="#fff8ec"/>`;
  const shut=(x)=>`<path d="M${x-3.6},${ey+0.4} Q${x},${ey-3.4} ${x+3.6},${ey+0.4}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`;
  const sleepy=(x)=>`<path d="M${x-3.6},${ey} Q${x},${ey+2.6} ${x+3.6},${ey}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/><path d="M${x-3.6},${ey-1.2} H${x+3.6}" stroke="${ink}" stroke-width="0.8" opacity="0.6"/>`;
  const eyes = c.face==='happy' ? shut(L)+shut(R) : c.face==='wink' ? open(L)+shut(R) : c.face==='sleepy' ? sleepy(L)+sleepy(R) : open(L)+open(R);
  const blush = cheeks ? `<ellipse cx="${L-6}" cy="${ey+9}" rx="5" ry="3" fill="#e0837e" opacity="0.32"/><ellipse cx="${R+6}" cy="${ey+9}" rx="5" ry="3" fill="#e0837e" opacity="0.32"/>` : '';
  let glasses='';
  if(c.glasses==='round') glasses=`<g fill="rgba(255,250,235,0.18)" stroke="#a8823a" stroke-width="1.5"><circle cx="${L}" cy="${ey}" r="${big?9.5:7.2}"/><circle cx="${R}" cy="${ey}" r="${big?9.5:7.2}"/></g><path d="M${L+(big?9.5:7.2)},${ey} Q60,${ey-3} ${R-(big?9.5:7.2)},${ey}" fill="none" stroke="#a8823a" stroke-width="1.4"/>`;
  if(c.glasses==='halfmoon') glasses=`<g fill="rgba(255,250,235,0.18)" stroke="#a8823a" stroke-width="1.5"><path d="M${L-7.5},${ey+1.5} H${L+7.5} C${L+7.5},${ey+8} ${L-7.5},${ey+8} ${L-7.5},${ey+1.5} Z"/><path d="M${R-7.5},${ey+1.5} H${R+7.5} C${R+7.5},${ey+8} ${R-7.5},${ey+8} ${R-7.5},${ey+1.5} Z"/></g><path d="M${L+7.5},${ey+2} Q60,${ey-0.5} ${R-7.5},${ey+2}" fill="none" stroke="#a8823a" stroke-width="1.3"/>`;
  // clothes: a fur chest under old-fashioned clothes
  const bodyD='M12,124 C14,102 32,90 60,90 C88,90 106,102 108,124 Z';
  let body='';
  if(c.outfit==='waistcoat'){
    body = F(bodyD,'#fffcf6') + F('M12,124 C14,102 30,91 47,90 L60,113 L60,124 Z',cloth) + F('M108,124 C106,102 90,91 73,90 L60,113 L60,124 Z',cloth)
         + wash('M12,124 C14,102 30,91 47,90 L60,113 L60,124 Z') + wash('M108,124 C106,102 90,91 73,90 L60,113 L60,124 Z')
         + `<circle cx="64" cy="116" r="1.5" fill="${ink}"/><circle cx="64" cy="121" r="1.5" fill="${ink}"/><path d="M28,108 h10 M82,108 h10" stroke="${ink}" stroke-width="1" opacity="0.6"/>`
         + F('M60,94 L51,89 L51,99 Z',tint(cloth,-0.35)) + F('M60,94 L69,89 L69,99 Z',tint(cloth,-0.35)) + `<circle cx="60" cy="94" r="2.4" fill="${tint(cloth,-0.35)}" ${lw}/>`;
  } else if(c.outfit==='scarf'){
    body = F(bodyD,'#e2d4b6') + wash(bodyD) + `<path d="M30,104 v18 M90,104 v18" stroke="rgba(74,52,40,0.25)" stroke-width="1"/>`
         + F('M40,88 C50,98 70,98 80,88 L83,97 C70,107 50,107 37,97 Z',cloth)
         + `<path d="M43,93 C53,101 67,101 77,93" fill="none" stroke="${tint(cloth,0.55)}" stroke-width="2.4"/>`
         + F('M64,100 L73,121 L63,123 L57,102 Z',cloth) + `<path d="M62,108 L70,106 M64,114 L72,112" stroke="${tint(cloth,0.55)}" stroke-width="2.2"/><path d="M63,123 l-1,3 M66,122.5 l-0.5,3 M69,122 l0,3 M72,121.5 l0.5,3" stroke="${cloth}" stroke-width="1.3"/>`;
  } else if(c.outfit==='collar'){
    body = F(bodyD,cloth) + wash(bodyD)
         + F('M60,92 C56,101 45,102 42,93 C48,90 55,90 60,92 Z','#fffdf8') + F('M60,92 C64,101 75,102 78,93 C72,90 65,90 60,92 Z','#fffdf8')
         + `<circle cx="60" cy="100" r="2.6" fill="#c4973c" ${lw} stroke-width="0.9"/>`;
  } else { // cardigan over a cream blouse
    body = F(bodyD,cloth) + wash(bodyD)
         + F('M47,90 L60,112 L73,90 C68,92 52,92 47,90 Z','#fffcf6')
         + `<path d="M47,90 L60,112 L73,90" fill="none" stroke="${tint(cloth,-0.3)}" stroke-width="3.2" stroke-linejoin="round"/>`
         + `<circle cx="60" cy="116" r="1.7" fill="${tint(cloth,0.5)}" ${lw} stroke-width="0.7"/><circle cx="60" cy="121.5" r="1.7" fill="${tint(cloth,0.5)}" ${lw} stroke-width="0.7"/>`
         + `<path d="M24,110 l4,0 M92,110 l4,0" stroke="${ink}" stroke-width="0.9" opacity="0.5"/>`;
  }
  // a soft, rounded neck that widens into the collar (no square edges)
  const neck = `<path d="M47,93 C47,86 51,80 60,80 C69,80 73,86 73,93 C67,95.5 53,95.5 47,93 Z" fill="${c.animal==='hedgehog'?furL:fur}" ${lw}/>`;
  // something on the head
  let hat='';
  const hatTop = c.animal==='hedgehog' ? 6 : 0;      // hedgehogs wear hats a little lower, over their spines
  const H=(d,fill)=>F(d,fill,`transform="translate(0 ${hatTop})"`)+`<path d="${d}" fill="url(#${u}-w)" transform="translate(0 ${hatTop})"/>`;
  if(c.hat==='beret') hat = H('M28,38 C30,23 52,16 71,20 C88,23 96,31 92,39 C78,45 42,46 28,38 Z',hatC) + `<path d="M62,18 l2,-6" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" transform="translate(0 ${hatTop})"/>`;
  if(c.hat==='flatcap') hat = H('M31,41 C29,24 45,18 62,18 C80,18 93,26 91,38 C78,35 46,36 31,41 Z',hatC) + H('M38,41 C50,48 74,48 87,40 C80,49 48,52 38,41 Z',tint(hatC,-0.25)) + `<circle cx="61" cy="19" r="2" fill="${tint(hatC,-0.3)}" ${lw} transform="translate(0 ${hatTop})"/>`;
  if(c.hat==='cloche') hat = H('M29,46 C27,23 43,13 60,13 C77,13 93,23 91,46 C84,41 36,41 29,46 Z',hatC) + H('M30,39 C44,34 76,34 90,39 L90,44 C76,39 44,39 30,44 Z',tint(hatC,-0.3))
        + `<g transform="translate(0 ${hatTop})"><circle cx="79" cy="38" r="3.4" fill="#fffcf6" ${lw} stroke-width="0.8"/><circle cx="84" cy="36.5" r="2.8" fill="#e7a9a4" ${lw} stroke-width="0.8"/><circle cx="79" cy="38" r="1" fill="#c4973c"/></g>`;
  if(c.hat==='boater') hat = `<g transform="translate(0 ${hatTop})"><ellipse cx="60" cy="35" rx="35" ry="6.5" fill="#e3c98c" ${lw}/><path d="M42,35 L44,19 C52,16 68,16 76,19 L78,35 Z" fill="#e3c98c" ${lw}/><path d="M43,27 C52,25 68,25 77,27 L77.6,32 C68,30 52,30 42.4,32 Z" fill="${CHAR.color[c.outfitColor]}" ${lw} stroke-width="0.9"/><path d="M46,21 l28,0 M45,24 l30,0" stroke="#b8975a" stroke-width="0.6"/></g>`;
  if(c.hat==='flower') hat = `<g transform="translate(${c.animal==='rabbit'?2:0} ${hatTop})"><path d="M78,40 l6,-6 M80,41 l8,-2" stroke="#6f8a5a" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="88" cy="35" rx="4" ry="2.4" fill="#7f9470" ${lw} stroke-width="0.8" transform="rotate(-30 88 35)"/>${[0,72,144,216,288].map(a=>{const r=a*Math.PI/180; return `<circle cx="${(79+4.2*Math.cos(r)).toFixed(1)}" cy="${(33+4.2*Math.sin(r)).toFixed(1)}" r="3" fill="#fffcf6" ${lw} stroke-width="0.8"/>`;}).join('')}<circle cx="79" cy="33" r="2.4" fill="#c4973c" ${lw} stroke-width="0.8"/></g>`;
  if(c.hat==='bow') hat = `<g ${lw} fill="${hatC}" transform="translate(0 ${hatTop})"><path d="M80,32 L68,24 L69,40 Z"/><path d="M80,32 L92,24 L91,40 Z"/><circle cx="80" cy="32" r="3.6"/></g>`;
  // ── full body: torso and arms in the same clothes, then legs and shoes ──
  let tail='', full='';
  if(pose!=='bust'){
    const shoe='#3d2b20', paw=c.animal==='hedgehog'?furL:fur;
    const trousers = c.outfit==='waistcoat' ? tint(cloth,-0.42) : c.outfit==='cardigan' ? '#cbb896' : '#6b4a34';
    const sleeve = c.outfit==='waistcoat' ? '#fffcf6' : c.outfit==='scarf' ? '#e2d4b6' : cloth;
    const torsoD='M38,92 C32,98 31,122 33,146 L87,146 C89,122 88,98 82,92 C74,88 46,88 38,92 Z';
    let torso='';
    if(c.outfit==='waistcoat'){
      torso = F(torsoD,'#fffcf6') + F('M38,92 C32,98 31,122 33,146 L60,146 L60,113 L50,89 Z',cloth) + F('M82,92 C88,98 89,122 87,146 L60,146 L60,113 L70,89 Z',cloth)
            + wash('M38,92 C32,98 31,122 33,146 L60,146 L60,113 L50,89 Z') + wash('M82,92 C88,98 89,122 87,146 L60,146 L60,113 L70,89 Z')
            + `<circle cx="63.5" cy="120" r="1.5" fill="${ink}"/><circle cx="63.5" cy="128" r="1.5" fill="${ink}"/><circle cx="63.5" cy="136" r="1.5" fill="${ink}"/><path d="M40,124 h8 M72,124 h8" stroke="${ink}" stroke-width="0.9" opacity="0.6"/>`
            + F('M60,95 L52,90.5 L52,99.5 Z',tint(cloth,-0.35)) + F('M60,95 L68,90.5 L68,99.5 Z',tint(cloth,-0.35)) + `<circle cx="60" cy="95" r="2.2" fill="${tint(cloth,-0.35)}" ${lw}/>`;
    } else if(c.outfit==='scarf'){
      torso = F(torsoD,'#e2d4b6') + wash(torsoD) + `<path d="M36,138 h48" stroke="rgba(74,52,40,0.3)" stroke-width="1"/>`
            + F('M42,88 C51,98 69,98 78,88 L80,96 C68,105 52,105 40,96 Z',cloth) + `<path d="M44,93 C53,101 67,101 76,93" fill="none" stroke="${tint(cloth,0.55)}" stroke-width="2.2"/>`
            + F('M63,100 L70,126 L62,128 L57,102 Z',cloth) + `<path d="M61,110 L68,108 M63,118 L70,116" stroke="${tint(cloth,0.55)}" stroke-width="2"/><path d="M62,128 l-1,3 M65,127.5 l-0.5,3 M68,127 l0,3" stroke="${cloth}" stroke-width="1.2"/>`;
    } else if(c.outfit==='collar'){
      torso = F(torsoD,cloth) + wash(torsoD)
            + F('M60,93 C56,101 46,102 43,94 C49,91 55,91 60,93 Z','#fffdf8') + F('M60,93 C64,101 74,102 77,94 C71,91 65,91 60,93 Z','#fffdf8')
            + `<circle cx="60" cy="101" r="2.4" fill="#c4973c" ${lw} stroke-width="0.9"/>`;
    } else {
      torso = F(torsoD,cloth) + wash(torsoD) + F('M49,89 L60,110 L71,89 C66,91 54,91 49,89 Z','#fffcf6')
            + `<path d="M49,89 L60,110 L71,89" fill="none" stroke="${tint(cloth,-0.3)}" stroke-width="3" stroke-linejoin="round"/>`
            + [116,124,132,140].map(y=>`<circle cx="60" cy="${y}" r="1.6" fill="${tint(cloth,0.5)}" ${lw} stroke-width="0.7"/>`).join('')
            + `<path d="M34,140 h52" stroke="${tint(cloth,-0.3)}" stroke-width="2.4" opacity="0.6"/>`;
    }
    // arms: hanging (and swinging as they walk), or resting on the lap
    const swing = pose==='stand' && step ? (step===1 ? 9 : -9) : 0;
    const armL = pose==='stand'
      ? `<g transform="rotate(${swing} 40 95)">${F('M40,93 C31,99 28,116 29,132 C32,137 38,137 39,132 C39,118 41,107 45,99 Z',sleeve)}<circle cx="33.5" cy="135" r="5.2" fill="${paw}" ${lw}/></g>`
      : `${F('M40,93 C31,102 30,122 37,137 C40,141 47,141 48,137 C42,125 41,110 45,99 Z',sleeve)}<circle cx="47" cy="140" r="5" fill="${paw}" ${lw}/>`;
    const armR = pose==='stand'
      ? `<g transform="rotate(${-swing} 80 95)">${F('M80,93 C89,99 92,116 91,132 C88,137 82,137 81,132 C81,118 79,107 75,99 Z',sleeve)}<circle cx="86.5" cy="135" r="5.2" fill="${paw}" ${lw}/></g>`
      : `${F('M80,93 C89,102 90,122 83,137 C80,141 73,141 72,137 C78,125 79,110 75,99 Z',sleeve)}<circle cx="73" cy="140" r="5" fill="${paw}" ${lw}/>`;
    // legs
    const dress = c.outfit==='collar';
    let legs='';
    if(pose==='stand'){
      const lift=[0, -4, 0][step], liftR=[0, 0, -4][step];
      const leg=(x0,x1,dy,col)=>`<g transform="translate(0 ${dy})">${F(`M${x0},150 L${x0+16},150 L${x0+15},${dress?176:177} L${x0+2},${dress?176:177} Z`,col)}<ellipse cx="${x0+8.5}" cy="179" rx="9" ry="4.4" fill="${shoe}" ${lw}/><path d="M${x0+3},177.5 q5.5,-2 11,0" fill="none" stroke="rgba(255,240,220,0.35)" stroke-width="1"/></g>`;
      legs = leg(40,0,lift, dress?paw:trousers) + leg(64,0,liftR, dress?paw:trousers);
      legs += dress ? F('M34,140 C30,152 27,162 26,168 C42,174 78,174 94,168 C93,162 90,152 86,140 Z',cloth) + wash('M34,140 C30,152 27,162 26,168 C42,174 78,174 94,168 C93,162 90,152 86,140 Z') + `<path d="M28,165 C44,170 76,170 92,165" fill="none" stroke="#fffdf8" stroke-width="2" opacity="0.8"/>`
                    : F('M33,142 L87,142 L86,155 L34,155 Z',trousers);
    } else if(pose==='sit'){
      // seen from the front: the lap comes towards us, the lower legs hang down
      const lap = dress ? cloth : trousers;
      legs = F('M41,152 L55,152 L54,172 L42,172 Z',dress?paw:trousers) + F('M65,152 L79,152 L78,172 L66,172 Z',dress?paw:trousers)
           + `<ellipse cx="48" cy="175" rx="8.4" ry="4.6" fill="${shoe}" ${lw}/><ellipse cx="72" cy="175" rx="8.4" ry="4.6" fill="${shoe}" ${lw}/>`
           + F('M32,140 C31,150 36,157 60,157 C84,157 89,150 88,140 Z',lap) + wash('M32,140 C31,150 36,157 60,157 C84,157 89,150 88,140 Z');
    } else { // kneel: folded legs tucked under on the cushion
      const lap = dress ? cloth : trousers;
      legs = F('M30,140 C26,152 31,161 60,161 C89,161 94,152 90,140 Z',lap) + wash('M30,140 C26,152 31,161 60,161 C89,161 94,152 90,140 Z')
           + `<path d="M40,158 C48,161 72,161 80,158" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="2"/>`;
    }
    // tails peep out at the side
    const T=(d,fill,x='')=>F(d,fill)+x;
    if(c.animal==='cat') tail = T('M84,140 C100,140 108,124 103,108 C101,103 96,104 97,110 C101,122 96,132 84,133 Z',fur, `<path d="M99,121 l5,1 M100,113 l5,-1" stroke="${furD}" stroke-width="1.6"/>`);
    if(c.animal==='fox') tail = T('M82,148 C104,153 114,128 106,110 C101,124 92,133 82,137 Z',fur) + T('M106,110 C110,118 108,127 104,132 C102,124 104,116 106,110 Z',furL);
    if(c.animal==='mouse') tail = `<path d="M84,150 C100,156 110,142 104,126 C102,121 98,122 99,126" fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="round"/><path d="M84,150 C100,156 110,142 104,126 C102,121 98,122 99,126" fill="none" stroke="${pink}" stroke-width="2" stroke-linecap="round"/>`;
    if(c.animal==='dog') tail = T('M83,138 C96,135 101,124 99,114 C95,119 92,126 83,131 Z',fur);
    if(c.animal==='rabbit') tail = `<circle cx="88" cy="146" r="7" fill="${furL}" ${lw}/>`;
    if(c.animal==='owl') tail = T('M78,146 L92,152 L86,142 Z',furD);
    if(pose==='sit'){ /* tails tuck down beside the seat */ }
    full = `${tail}${legs}${torso}${armL}${armR}`;
  }
  const isFull = pose!=='bust';
  return `<svg class="char ${cls}" viewBox="0 0 120 ${isFull?CHAR_FULL_H:124}" role="img" aria-label="${esc(title||'café character')}">
    <defs>
      <filter id="${u}-p" x="-6%" y="-6%" width="112%" height="112%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05 0.07" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="3" seed="3" result="blot"/>
        <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.4 -0.4 -0.4 0 1.12" result="dk"/>
        <feComposite in="dk" in2="d" operator="in" result="dkm"/>
        <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.18  0 0 0 0 0.08  0 0 0 0.9 -0.42" result="b2"/>
        <feComposite in="b2" in2="dkm" operator="in" result="b3"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="grain"/>
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.12  0 0 0 0.45 -0.15" result="g2"/>
        <feComposite in="g2" in2="dkm" operator="in" result="g3"/>
        <feMerge><feMergeNode in="d"/><feMergeNode in="b3"/><feMergeNode in="g3"/></feMerge>
      </filter>
      <linearGradient id="${u}-w" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#fff8e8" stop-opacity="0.22"/><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a2416" stop-opacity="0.22"/></linearGradient>
      <pattern id="${u}-s" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0,0 V3" stroke="${ink}" stroke-width="0.8" opacity="0.4"/></pattern>
    </defs>
    <g filter="url(#${u}-p)">
      <g transform="translate(0 4)">${back}</g>${isFull ? full : body}${neck}
      <g transform="translate(0 ${c.animal==='mouse'?7:4})">${ears}${head}
      ${blush}${eyes}${nose}${whiskers}${glasses}${hat}</g>
    </g>
  </svg>`;
}

// ── The café's animals ──
// Friends appear as the animal they chose (or one picked for them). While
// the shared timer runs everyone sits at their place; when it's paused or
// not started they get up and wander about the room, and when the host
// starts it again they walk back and sit down. (Each screen animates its
// own wandering; only the seats and the timer are shared.)
const ROAM_SPEED = 62, RETURN_SPEED = 150;          // in table units per second
const roamingAllowed = () => !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function sitterFloor(rec){ return { x:rec.seat.x, y: rec.seat.kneel ? rec.seat.y + 4 : rec.seat.y + 58*depthScale(rec.seat.y) }; }
function placeSitter(rec, x, y, dur, pose){
  const el=rec.el, standing = pose==='stand';
  const anchor = standing ? CHAR_ANCHOR.stand : (rec.seat.kneel ? CHAR_ANCHOR.kneel : CHAR_ANCHOR.sit);
  const sc = standing ? depthScale(y) : rec.seat.s;
  el.style.transition = dur ? `left ${dur}s linear, top ${dur}s linear, transform ${dur}s linear` : 'none';
  el.style.left=(x/TABLE.w*100).toFixed(2)+'%'; el.style.top=(y/TABLE.h*100).toFixed(2)+'%';
  el.style.transform=`translate(-50%, ${(-anchor*100).toFixed(1)}%) scale(${sc.toFixed(3)})`;
  el.style.zIndex=String(Math.round(y));
  rec.x=x; rec.y=y;
}
function setSitterPose(rec, pose){            // 'seated' | 'idle' | 'walking'
  rec.el.classList.toggle('seated', pose==='seated');
  rec.el.classList.toggle('walking', pose==='walking');
  rec.state=pose;
}
// a point on the floor that isn't under the table, isn't over your own
// place at the front, and can be reached without walking through the table
const inTable=(x,y)=>{ const dx=(x-TABLE.cx)/335, dy=(y-TABLE.cy-10)/150; return dx*dx+dy*dy<1; };
const crossesTable=(a,b)=>{ for(let k=1;k<16;k++){ const f=k/16; if(inTable(a.x+(b.x-a.x)*f, a.y+(b.y-a.y)*f)) return true; } return false; };
// the way from one place to another, going round the table rather than over it
function routeAround(from, to){
  if(!crossesTable(from,to)) return [to];
  const RX=372, RY=178, cy=TABLE.cy+10;
  const ang=p=>Math.atan2((p.y-cy)/RY, (p.x-TABLE.cx)/RX);
  let a0=ang(from), a1=ang(to), d=a1-a0;
  while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI;
  const n=Math.max(1, Math.ceil(Math.abs(d)/(Math.PI/5))), pts=[];
  for(let i=0;i<=n;i++){ const a=a0+d*i/n; pts.push({x:TABLE.cx+RX*Math.cos(a), y:cy+RY*Math.sin(a)}); }
  return [...pts, to];
}
function roamTarget(from){
  for(let t=0;t<40;t++){
    const x=70+Math.random()*860, y=60+Math.random()*365;
    if(inTable(x,y) || (y>318 && Math.abs(x-TABLE.cx)<220)) continue;
    if(!crossesTable(from,{x,y})) return {x,y};
  }
  return from;
}
function sitterWalk(rec, to, speed, then){
  clearTimeout(rec.timer);
  const legs = rec.x==null ? [to] : routeAround({x:rec.x, y:rec.y}, to);
  setSitterPose(rec,'walking');
  const next=()=>{
    const p=legs.shift(); if(!p){ then(); return; }
    const dur=Math.max(0.12, Math.hypot(p.x-rec.x, p.y-rec.y)/speed);
    placeSitter(rec, p.x, p.y, dur, 'stand');
    rec.timer=setTimeout(next, dur*1000);
  };
  next();
}
function sitterWander(rec){
  if(rec.mode!=='roam') return;
  sitterWalk(rec, roamTarget(rec), ROAM_SPEED, ()=>{
    if(rec.mode!=='roam') return;
    setSitterPose(rec,'idle');
    rec.timer=setTimeout(()=>sitterWander(rec), 1400+Math.random()*3600);
  });
}
function sitterSitDown(rec, animate){
  clearTimeout(rec.timer);
  const sit=()=>{ setSitterPose(rec,'seated'); placeSitter(rec, rec.seat.x, rec.seat.y, 0, 'seat'); };
  if(!animate || rec.state==='seated' || rec.x==null) return sit();
  sitterWalk(rec, sitterFloor(rec), RETURN_SPEED, sit);
}
function sitterGetUp(rec){
  clearTimeout(rec.timer);
  const f=sitterFloor(rec);
  setSitterPose(rec,'idle'); placeSitter(rec, f.x, f.y, 0, 'stand');
  rec.timer=setTimeout(()=>sitterWander(rec), 300+Math.random()*1500);
}
function buildSitter(rec, m){
  const look=m.look || defaultCharFor(m.user_id), name=personName(m);
  rec.el.innerHTML =
    `<div class="cs-pose cs-seat">${characterSVG(look,{pose:rec.seat.kneel?'kneel':'sit', title:name})}</div>`
  + `<div class="cs-pose cs-stand"><div class="cs-step cs-s0">${characterSVG(look,{pose:'stand', title:name})}</div>`
  + `<div class="cs-step cs-s1">${characterSVG(look,{pose:'stand', step:1, title:name})}</div>`
  + `<div class="cs-step cs-s2">${characterSVG(look,{pose:'stand', step:2, title:name})}</div></div>`;
}
function syncSitters(angles, who, vibe){
  const layer=document.getElementById('cr-sitters'); if(!layer || !S.room) return;
  if(!S.room.sitters){ S.room.sitters=new Map(); layer.innerHTML=''; }
  const st=S.room.sitters;
  const running = timerState().running, roamOK = roamingAllowed();
  const seen=new Set();
  angles.forEach((a,i)=>{
    const m=who[i]; if(!m) return;
    seen.add(m.user_id);
    const mine = m.user_id===S.user.id;
    const seat=sitterSpot(a, vibe), here = mine || S.room.presence.has(m.user_id);
    let rec=st.get(m.user_id), fresh=false;
    if(!rec){ rec={uid:m.user_id, el:document.createElement('div'), mode:null, state:null, x:null, y:null}; rec.el.className='cr-sitter'+(mine?' me':'');
      if(!mine){ const uid=m.user_id; rec.el.addEventListener('click', e=>openCallCard(uid, e)); rec.el.setAttribute('role','button'); rec.el.tabIndex=0;
        rec.el.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openCallCard(uid, e); } }); }
      layer.appendChild(rec.el); st.set(m.user_id, rec); fresh=true; }
    const moved = !rec.seat || rec.seat.x!==seat.x || rec.seat.y!==seat.y || rec.seat.kneel!==seat.kneel;
    rec.seat=seat;
    const key=JSON.stringify(normalizeChar(m.look || defaultCharFor(m.user_id)))+(seat.kneel?'k':'c');
    if(rec.key!==key){ rec.key=key; buildSitter(rec, m); }
    rec.el.title = mine ? 'You' : personName(m)+(here?'':' (away)')+' — tap for their calling card';
    rec.el.classList.toggle('away', !here);
    // away friends doze in their seats; everyone here wanders while the timer is off
    const want = (running || !here || !roamOK) ? 'seated' : 'roam';
    if(want!==rec.mode){
      rec.mode=want;
      if(want==='seated') sitterSitDown(rec, !fresh); else sitterGetUp(rec);
    } else if(moved && rec.state==='seated'){ placeSitter(rec, seat.x, seat.y, 0, 'seat'); }
  });
  for(const [uid,rec] of st) if(!seen.has(uid)){ clearTimeout(rec.timer); rec.el.remove(); st.delete(uid); }
}
function clearSitters(){
  if(!S.room?.sitters) return;
  for(const rec of S.room.sitters.values()){ clearTimeout(rec.timer); rec.el.remove(); }
  S.room.sitters.clear();
}
// Where a sitter goes for seat angle a: on the chair seat, or kneeling on the cushion.
function sitterSpot(a, vibe){
  const p=seatPoint(a, TABLE.chairRx, TABLE.chairRy), ds=depthScale(p.y);
  if(vibe==='kyoto'){ const near=Math.sin(a)>0.05; return { x:p.x, y:p.y + (near?40:22) - 6*ds, s:ds*1.08, kneel:true }; }
  return { x:p.x, y:p.y - 3*ds, s:ds, kneel:false };
}

// The centrepiece goes in the gap between the two seats furthest back, so
// nobody's drink stands in front of it.
function centrepieceSpot(seatCount){
  const a=seatAngles(seatCount);
  let best=null;
  for(let i=0;i<a.length;i++){
    const mid=(a[i] + (a[(i+1)%a.length] + (i+1===a.length ? 2*Math.PI : 0)))/2;
    if(!best || Math.sin(mid) < Math.sin(best)) best=mid;
  }
  return { x:TABLE.cx + TABLE.rx*0.5*Math.cos(best), y:TABLE.cy + TABLE.ry*0.42*Math.sin(best) + 8 };
}
function centrepieceSVG(kind, at){
  const x=at.x, y=at.y;
  const glow = `<ellipse cx="${x}" cy="${y-30}" rx="70" ry="44" fill="url(#cp-glow)"/>`;
  switch(kind){
    case 'candle': return glow+`<rect x="${x-7}" y="${y-38}" width="14" height="34" rx="2" fill="#efe3c6"/><path d="M${x},${y-50} C${x+6},${y-42} ${x+4},${y-38} ${x},${y-37} C${x-4},${y-38} ${x-6},${y-42} ${x},${y-50}z" fill="#f6c45a"/><ellipse cx="${x}" cy="${y-3}" rx="20" ry="6" fill="#b48a3a"/>`;
    case 'carafe': return `<path d="M${x-12},${y-6} C${x-18},${y-24} ${x-14},${y-36} ${x-6},${y-42} L${x-6},${y-56} L${x+6},${y-56} L${x+6},${y-42} C${x+14},${y-36} ${x+18},${y-24} ${x+12},${y-6}z" fill="rgba(210,235,245,0.65)" stroke="#8aa7b4" stroke-width="1.5"/><path d="M${x-12},${y-20} C${x-6},${y-17} ${x+6},${y-23} ${x+13},${y-20} L${x+12},${y-6} L${x-12},${y-6}z" fill="rgba(240,170,90,0.55)"/><circle cx="${x+30}" cy="${y-8}" r="8" fill="#f2cf3a" stroke="#c9a420"/><circle cx="${x+44}" cy="${y-4}" r="7" fill="#f2cf3a" stroke="#c9a420"/><path d="M${x+34},${y-16} c4,-6 10,-6 12,-2" stroke="#5f7a4a" stroke-width="2" fill="none"/>`;
    case 'lantern': return glow+`<path d="M${x-14},${y-6} h28 l-3,-34 h-22z" fill="rgba(255,200,110,0.55)" stroke="#2e1a0c" stroke-width="3"/><path d="M${x-10},${y-40} h20 M${x},${y-40} v-10" stroke="#2e1a0c" stroke-width="3" fill="none"/><ellipse cx="${x}" cy="${y-22}" rx="5" ry="8" fill="#ffd27a"/>`;
    case 'lamp': return glow+`<path d="M${x-26},${y-44} h52 l-8,-14 h-36z" fill="#2f6a4a" stroke="#173025" stroke-width="2"/><path d="M${x},${y-44} v38" stroke="#b48a3a" stroke-width="4"/><ellipse cx="${x}" cy="${y-4}" rx="22" ry="6" fill="#b48a3a"/>`;
    case 'books': return `<rect x="${x-34}" y="${y-14}" width="68" height="12" rx="2" fill="#7a2e3a"/><rect x="${x-28}" y="${y-25}" width="58" height="11" rx="2" fill="#2f5a4a"/><rect x="${x-31}" y="${y-35}" width="54" height="10" rx="2" fill="#c7a86d"/><path d="M${x-22},${y-8} h50" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>`;
    case 'ikebana': return `<path d="M${x},${y-10} C${x-6},${y-40} ${x-26},${y-58} ${x-34},${y-66} M${x},${y-10} C${x+4},${y-36} ${x+18},${y-54} ${x+30},${y-60}" stroke="#4a3a24" stroke-width="2.5" fill="none"/><circle cx="${x-34}" cy="${y-66}" r="7" fill="#e6a0a8"/><circle cx="${x+30}" cy="${y-60}" r="6" fill="#f0c4c8"/><circle cx="${x-14}" cy="${y-44}" r="5" fill="#e6a0a8"/><path d="M${x-22},${y-2} h44 l-6,-14 h-32z" fill="#3a2a1e"/>`;
    default: return `<path d="M${x-12},${y-4} C${x-16},${y-24} ${x-8},${y-34} ${x},${y-34} C${x+8},${y-34} ${x+16},${y-24} ${x+12},${y-4}z" fill="#e8dcc2" stroke="#8a6a4a" stroke-width="1.5"/>
      <path d="M${x},${y-34} C${x-6},${y-52} ${x-16},${y-60} ${x-22},${y-66} M${x},${y-34} C${x+2},${y-54} ${x+10},${y-62} ${x+18},${y-70} M${x},${y-34} v-36" stroke="#5f7a4a" stroke-width="2" fill="none"/>
      <circle cx="${x-22}" cy="${y-68}" r="7" fill="#c8453a"/><circle cx="${x+18}" cy="${y-72}" r="6" fill="#e6a0a8"/><circle cx="${x}" cy="${y-74}" r="7" fill="#f3d58a"/>`;
  }
}

function tableclothSVG(){
  const {cx,cy,rx,ry}=TABLE, drop=78, n=18;
  let hem=''; for(let i=0;i<n;i++){ const x0=cx-rx+6+i*(2*rx-12)/n, w=(2*rx-12)/n; hem+=` q${(w/2).toFixed(1)},14 ${w.toFixed(1)},0`; }
  return `<path d="M${cx-rx},${cy} A${rx},${ry} 0 0 0 ${cx+rx},${cy} L${cx+rx-6},${cy+drop} L${cx-rx+6},${cy+drop} Z" fill="#f2ecdf"/>
    <path d="M${cx-rx+6},${cy+drop} ${hem}" fill="#f7f2e7" stroke="#d8cdb6" stroke-width="1.2"/>
    <path d="M${cx-rx+40},${cy+20} L${cx-rx+46},${cy+drop} M${cx-80},${cy+ry-4} L${cx-82},${cy+drop+4} M${cx+90},${cy+ry-6} L${cx+94},${cy+drop+4} M${cx+rx-40},${cy+20} L${cx+rx-46},${cy+drop}" stroke="rgba(150,130,100,0.25)" stroke-width="3" fill="none"/>
    <path d="M${cx-rx+8},${cy+drop-10} H${cx+rx-8}" stroke="#e2d6bd" stroke-width="2" stroke-dasharray="2 5"/>`;
}

function tableSVG(seatCount, vibe){
  const {cx,cy,rx,ry} = TABLE;
  const angles = seatAngles(seatCount);
  const chairs = angles.map(a=>{ const p=seatPoint(a, TABLE.chairRx, TABLE.chairRy); return {...p, near: Math.sin(a) > 0.05}; });
  // the tea house sits on floor cushions round a low table instead
  const tatami = vibe==='kyoto';
  const seatArt = (c)=> tatami ? zabutonSVG(c.x, c.y + (c.near ? 40 : 22), depthScale(c.y)*1.5, c.i) : chairSVG(c.x, c.y, depthScale(c.y), c.near);
  chairs.forEach((c,i)=>{ c.i=i; });
  const farChairs  = chairs.filter(c=>!c.near).sort((a,b)=>a.y-b.y).map(seatArt).join('');
  const nearChairs = chairs.filter(c=> c.near).sort((a,b)=>a.y-b.y).map(seatArt).join('');
  const finish = TABLE_STYLE[vibe] || 'wood';
  return `<svg class="cr-furniture" viewBox="0 0 ${TABLE.w} ${TABLE.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <radialGradient id="top-sheen" cx="42%" cy="34%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.04"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/></radialGradient>
      <radialGradient id="cp-glow"><stop offset="0" stop-color="#ffd890" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd890" stop-opacity="0"/></radialGradient>
      <pattern id="top-wood" width="140" height="22" patternUnits="userSpaceOnUse"><rect width="140" height="22" fill="var(--table)"/><path d="M0 6 C35 2 70 10 140 5 M0 15 C40 19 90 11 140 17" stroke="var(--table-2)" stroke-opacity="0.45" stroke-width="1.4" fill="none"/></pattern>
      <pattern id="top-marble" width="260" height="120" patternUnits="userSpaceOnUse"><rect width="260" height="120" fill="#efe9df"/><path d="M-10 30 C40 10 70 60 130 40 S220 70 270 30 M20 100 C70 80 120 110 170 85 S240 90 270 110" stroke="#b9ada0" stroke-width="1.6" fill="none" opacity="0.7"/><path d="M60 0 C80 30 60 60 90 120" stroke="#cfc4b6" stroke-width="1" fill="none"/></pattern>
      <pattern id="top-lacquer" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#1a1420"/></pattern>
      <pattern id="top-linen" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#f7f2e7"/><path d="M0 6h12M6 0v12" stroke="#ece4d2" stroke-width="0.8"/></pattern>
      <pattern id="top-leather" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#2f5a40"/><circle cx="2" cy="2" r="0.7" fill="#244834"/><circle cx="6" cy="6" r="0.7" fill="#3a6a4c"/></pattern>
    </defs>
    ${tatami ? '' : `<ellipse cx="${cx}" cy="${cy+196}" rx="250" ry="26" fill="rgba(0,0,0,0.32)"/>`}
    ${farChairs}
    ${tatami ? lowTableSVG() : `<path d="M${cx-26},${cy+20} C${cx-20},${cy+90} ${cx-30},${cy+150} ${cx-40},${cy+186} L${cx+40},${cy+186} C${cx+30},${cy+150} ${cx+20},${cy+90} ${cx+26},${cy+20}z" fill="var(--table-2)"/>
    <path d="M${cx-8},${cy+30} C${cx-6},${cy+90} ${cx-10},${cy+150} ${cx-14},${cy+184}" stroke="rgba(255,255,255,0.12)" stroke-width="5" fill="none"/>
    <ellipse cx="${cx}" cy="${cy+190}" rx="92" ry="16" fill="var(--table-2)"/>
    <ellipse cx="${cx}" cy="${cy+16}" rx="${rx}" ry="${ry}" fill="var(--table-2)"/>`}
    ${finish==='linen' ? tableclothSVG() : ''}
    <ellipse class="cr-tabletop" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#top-${finish})"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#top-sheen)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="var(--table-rim)" stroke-width="4"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx-16}" ry="${ry-6}" fill="none" stroke="var(--table-rim)" stroke-opacity="0.35" stroke-width="1.2"/>
    ${centrepieceSVG(CENTREPIECE[vibe], centrepieceSpot(seatCount))}
    ${nearChairs}
  </svg>`;
}

// Everyone seated around the table: you at the front, then the others; any
// spare chairs stay empty (always at least four chairs, at most eight).
function renderSeats(force){
  const c=S.room?.cafe; if(!c) return;
  const {remaining,total,running}=timerState();
  const frac = (running || remaining<total) ? remaining/total : 1;
  // a session that just finished leaves the cups empty until the next one
  // starts, or until that person orders or brews something new
  if(running && S.room.emptied) S.room.emptied=null;
  const emptied = S.room.emptied;
  const levelOf = m => emptied && emptied[m.user_id]===JSON.stringify(m.drink||null) ? 0 : frac;
  const key=Math.round(frac*100)+(emptied?'e'+Object.keys(emptied).length:'');
  const seatCount = Math.min(8, Math.max(4, c.members.length + (c.members.length<8 ? 1 : 0)));
  const vibe = c.vibe==='cabin' ? 'beach' : c.vibe;
  const layoutKey = `${vibe}|${seatCount}`;
  const wrap=document.getElementById('cr-tablewrap');
  if(force || wrap.dataset.layout!==layoutKey){ wrap.querySelector('.cr-furniture-slot').innerHTML = tableSVG(seatCount, vibe); wrap.dataset.layout=layoutKey; }
  if(!force && key===S.room.lastFrac) return;
  S.room.lastFrac=key;
  const me=c.members.find(m=>m.user_id===S.user.id);
  const others=c.members.filter(m=>m!==me);
  const angles=seatAngles(seatCount);
  // You take the front-left seat; friends fill the seats nearest the front
  // and at the sides first, and the far side only once it gets busy.
  const fillOrder=angles.slice(1).map((a,i)=>({a, i:i+1})).sort((p,q)=>Math.sin(q.a)-Math.sin(p.a)).map(p=>p.i);
  const who=new Array(seatCount).fill(null);
  if(me) who[0]=me;
  others.forEach((m,k)=>{ if(fillOrder[k]!=null) who[fillOrder[k]]=m; });
  const html = angles.map((a,i)=>{
    const m=who[i];
    // cups on the far side stand near the back rim, on the near side by the front edge, so tall cups never hide a name card behind them
    const p={ x: TABLE.cx + TABLE.cupRx*Math.cos(a), y: TABLE.cy + (Math.sin(a)<0 ? 98 : 80)*Math.sin(a) };
    const s=depthScale(seatPoint(a, TABLE.chairRx, TABLE.chairRy).y);
    const pos=`left:${(p.x/TABLE.w*100).toFixed(2)}%; top:${(p.y/TABLE.h*100).toFixed(2)}%; --s:${s.toFixed(3)}; z-index:${Math.round(p.y)};`;
    if(!m) return `<div class="cr-seat open" style="${pos}" title="${c.vibe==='kyoto'?'An empty cushion':'An empty chair'} — invite a friend"></div>`;
    const here=S.room.presence.has(m.user_id);
    const mine=m.user_id===S.user.id;
    const cupArt = m.drink
      ? buildCupSVG({size:104, fillFraction:levelOf(m), steam: levelOf(m)>0.08, cup:m.drink.cup||'mug', base:m.drink.base||'coffee', drink:m.drink.drink, addons:m.drink.addons||[]})
      : '';
    // Your own place: tap the little menu card (or your cup) to order from your seat.
    const cup = mine
      ? (m.drink ? `<button type="button" class="cr-mycup" onclick="openOrderMenu()" title="Order something else" aria-label="Order something else">${cupArt}</button>`
                 : `<button type="button" class="seat-order" onclick="openOrderMenu()" aria-label="Order a drink"><span class="seat-order-card">${vicon('menu',18)}<span>Menu</span></span><span class="seat-order-hint">tap to order</span></button>`)
      : (m.drink ? cupArt : `<div class="seat-empty" aria-hidden="true"></div>`);
    return `<div class="cr-seat ${here?'here':'away'} ${mine?'me':''}" style="${pos}">
      <div class="cr-cup">${cup}</div>
      <div class="cr-card">
        <span class="cr-dot" title="${here?'Here now':'Away'}"></span><span class="cr-who">${esc(personName(m))}</span>${m.user_id===c.owner_id?'<span class="cr-host">host</span>':''}
      </div>
      ${m.drink ? `<div class="cr-drinkname">${esc(m.drink.label||'')}</div>` : (mine ? '' : `<div class="cr-drinkname">deciding\u2026</div>`)}
    </div>`;
  }).join('');
  document.getElementById('cr-seats').innerHTML = html;
  // friends at the table: sitting while the timer runs, wandering when it's off
  syncSitters(angles, who, vibe);
}

function renderMyDrinkPanel(){
  const me=myMember(); const el=document.getElementById('cr-mine');
  if(!me){ el.innerHTML=''; return; }
  el.innerHTML = me.drink
    ? `<div class="cr-mine-label">Your drink</div>
       <div class="cr-mine-name">${esc(me.drink.label||'')}</div>
       <div class="cr-mine-how">${me.drink.how==='brewed'?'brewed by you':'ordered from the menu'}</div>
       <div class="cr-mine-actions"><button class="btn-s vbtn" onclick="openOrderMenu()">${vicon('menu')}Order something else</button><button class="btn-s vbtn" onclick="brewForCafe()">${vicon('kettle')}Brew another</button></div>`
    : `<div class="cr-mine-label">You've taken a seat</div>
       <div class="cr-mine-name">What will you have?</div>
       <div class="cr-mine-actions"><button class="btn-p vbtn" onclick="brewForCafe()">${vicon('kettle')}Brew your own</button><button class="btn-s vbtn" onclick="openOrderMenu()">${vicon('menu')}Order from the menu</button></div>`;
}

// ── Ordering & brewing ──
function openOrderMenu(){
  const c=S.room?.cafe; if(!c) return;
  const v=vibeOf(c.vibe);
  document.getElementById('order-title').textContent = `${v.label} Menu`;
  document.getElementById('order-sub').textContent = v.tagline;
  document.getElementById('order-list').innerHTML = v.menu.map((item,i)=>`
    <button type="button" class="order-item" onclick="orderDrink(${i})">
      <span class="order-name">${item.name}</span>
      <span class="order-leader" aria-hidden="true"></span>
      <span class="order-note">${item.note}</span>
    </button>`).join('');
  document.getElementById('order-modal').classList.add('open');
}
function closeOrderMenu(e){ if(!e || e.target===document.getElementById('order-modal')) document.getElementById('order-modal').classList.remove('open'); }
async function orderDrink(i){
  const item=vibeOf(S.room?.cafe?.vibe).menu[i]; if(!item) return;
  const d=DRINKS[item.key]||DRINKS.cappuccino;
  closeOrderMenu();
  await placeMyDrink({drink:item.key, base:d.base, cup:d.cup, addons:[...d.addons], label:item.name, how:'ordered'});
  showToast(`${item.name} is on its way to the table`);
}
async function placeMyDrink(drink){
  try{
    await CafeDB.setDrink(S.room.id, drink);
    const me=myMember(); if(me) me.drink=drink;
    S.room.lastFrac=null; renderSeats(true); renderMyDrinkPanel();
  } catch(e){ showToast(cafeErrorText(e)); }
}
function brewForCafe(){
  if(!S.room) return;
  S.cafeBrew = S.room.id;
  S.cafeBrewName = S.room.cafe?.name || 'your café';
  showPage('brew');
}
async function bringBrewToTable(){
  const id=S.cafeBrew; if(!id) return;
  const name=document.getElementById('recipe-name').value.trim() || DRINKS[S.drink]?.label || 'House Brew';
  const drink={drink:S.drink, base:S.base, cup:S.cup, addons:[...S.addons], label:name, how:'brewed'};
  try{
    await CafeDB.setDrink(id, drink);
    S.cafeBrew=null;
    showToast('Your brew is on the table');
    enterCafe(id);
  } catch(e){ showToast(cafeErrorText(e)); }
}
function updateBrewCafeBanner(){
  const banner=document.getElementById('brew-cafe-banner');
  const begin=document.querySelector('.brew-begin');
  const on=!!S.cafeBrew;
  if(banner){ banner.hidden=!on; document.getElementById('brew-cafe-name').textContent = S.cafeBrewName||''; }
  if(begin) begin.textContent = on ? 'Take it to the table' : 'Begin session';
}

// ── The shared timer ──
function fmtClock(secs){ return String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0'); }
function renderCafeTimer(){
  const c=S.room?.cafe; if(!c) return;
  const {remaining,total,running}=timerState();
  document.getElementById('cr-time').textContent = fmtClock(remaining);
  document.getElementById('cr-steep').style.width = ((1-remaining/total)*100)+'%';
  const hostM=c.members.find(m=>m.user_id===c.owner_id); const host=hostM ? personName(hostM) : 'the host';
  const status=document.getElementById('cr-timer-status');
  const ctrl=document.getElementById('cr-timer-ctrl');
  if(isHost()){
    const mins=Math.round(total/60);
    ctrl.innerHTML = `
      <select class="cr-duration" onchange="setCafeDuration(this.value)" ${running?'disabled':''} aria-label="Session length">
        ${[15,25,40,50,60,90].map(m=>`<option value="${m}" ${m===mins?'selected':''}>${m} min</option>`).join('')}
        ${[15,25,40,50,60,90].includes(mins)?'':`<option value="${mins}" selected>${mins} min</option>`}
      </select>
      <button class="btn-ic" onclick="cafeTimer('reset')" title="Restart" aria-label="Restart">${ICON_RESTART}</button>
      <button class="btn-ic play" onclick="cafeTimer('${running?'pause':'start'}')" aria-label="${running?'Pause':'Start'}" title="${running?'Pause':'Start'}">${running?ICON_PAUSE:ICON_PLAY}</button>`;
    status.textContent = running ? 'Everyone is studying — you’re keeping time.' : (remaining<total ? 'Paused. Start again when everyone is ready.' : 'Start the timer when everyone has a drink.');
  } else {
    ctrl.innerHTML='';
    status.textContent = running ? `Studying together — ${host} is keeping time.` : (remaining<total ? `Paused by ${host}.` : `Waiting for ${host} to start the timer.`);
  }
}
async function cafeTimer(action, secs){
  try{
    const c=await CafeDB.timer(S.room.id, action, secs);
    S.room.seq=(S.room.seq||0)+1;   // anything fetched before this is now stale
    Object.assign(S.room.cafe, c); S.room.lastFrac=null; renderCafeRoom();
  }
  catch(e){ showToast(cafeErrorText(e)); }
}
function setCafeDuration(mins){ cafeTimer('set', parseInt(mins,10)*60); }
function tickCafeTimer(){
  const c=S.room?.cafe; if(!c) return;
  const {remaining,running}=timerState();
  if(S.room.lastRunning!==running){ S.room.lastRunning=running; renderSeats(true); }   // sit down / get up
  renderSeats(false);
  document.getElementById('cr-time').textContent = fmtClock(remaining);
  document.getElementById('cr-steep').style.width = ((1-remaining/(c.timer_duration_secs||1))*100)+'%';
  if(running && remaining<=0) finishCafeSession();
}
// When the shared timer runs out, everyone with a drink gets the session in
// their recipe book (once), and the host's browser resets the clock.
function finishCafeSession(){
  const c=S.room.cafe;
  // everyone has drunk up: keep these cups empty after the timer resets
  S.room.emptied = Object.fromEntries(c.members.filter(m=>m.drink).map(m=>[m.user_id, JSON.stringify(m.drink)]));
  const key=`bf_cafe_done_${c.id}_${c.timer_started_at}`;
  if(!localStorage.getItem(key)){
    localStorage.setItem(key,'1');
    const me=myMember();
    if(me?.drink){
      const mins=Math.max(1, Math.round(c.timer_duration_secs/60));
      const d=me.drink;
      const recipe={id:Date.now(), _ts:Date.now(), name:d.label||'Café Brew', cup:d.cup, base:d.base, drink:d.drink, addons:[...(d.addons||[])],
        subject:c.name, task:`Studied together at ${c.name}`, duration:mins,
        date:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
        username:personName(me), favorite:false, shared:true};
      S.sharedRecipes.unshift(recipe); saveRecipeLists();
      showToast('Session complete — saved to Shared Brews in your recipe book');
    } else {
      showToast('Session complete');
    }
    playPageSound('close');
  }
  if(isHost()) setTimeout(()=>{ if(S.room?.cafe?.timer_started_at===c.timer_started_at) cafeTimer('reset'); }, 2500);
}

// ── Invites ──
// ── Friends: calling cards ────────────────────────────────────────────────
// Like the visiting cards of old: leave your card for someone by their
// username; once they accept it you're friends. Cards that arrive show as a
// wax seal on your name in the bar, on the Study Café page, and in the card
// box; friends can be invited to a café with one tap.
S.friends = { list:[], incoming:[], outgoing:[], loaded:false, missing:false };
let unsubFriends=null;
const FriendsDB = {
  async list(){ return CafeDB.check(await CafeDB.sb.rpc('my_friends')) || []; },
  async send(username){ return CafeDB.check(await CafeDB.sb.rpc('send_friend_request', {p_username:username})); },
  async respond(id, accept){ return CafeDB.check(await CafeDB.sb.rpc('respond_friend_request', {p_id:id, p_accept:accept})); },
  async remove(id){ CafeDB.check(await CafeDB.sb.from('friendships').delete().eq('id', id)); },
  subscribe(cb){
    const ch=CafeDB.sb.channel('friends:'+S.user.id)
      .on('postgres_changes', {event:'*', schema:'public', table:'friendships', filter:`addressee=eq.${S.user.id}`}, ()=>cb())
      .on('postgres_changes', {event:'*', schema:'public', table:'friendships', filter:`requester=eq.${S.user.id}`}, ()=>cb())
      .subscribe();
    return ()=>{ try{ CafeDB.sb.removeChannel(ch); }catch(e){} };
  },
};
const friendName = f => f.display_name || f.username || 'A friend';
async function loadFriends(){
  if(!S.user || !supabaseClient){ S.friends={list:[], incoming:[], outgoing:[], loaded:false, missing:false}; renderFriendBadges(); return; }
  try{
    const rows=(await FriendsDB.list()).map(r=>({...r, look:r.look||null}));
    S.friends = { list:rows.filter(r=>r.status==='accepted'), incoming:rows.filter(r=>r.status==='pending'&&r.direction==='in'),
                  outgoing:rows.filter(r=>r.status==='pending'&&r.direction==='out'), loaded:true, missing:false };
  } catch(e){
    const missing=/my_friends|schema cache|does not exist|Could not find/i.test(e.message||'');
    S.friends={list:[], incoming:[], outgoing:[], loaded:true, missing};
    if(!missing) console.warn('Friends not loaded:', e.message);
  }
  if(!unsubFriends && !S.friends.missing){ try{ unsubFriends=FriendsDB.subscribe(()=>loadFriends()); }catch(e){} }
  renderFriendBadges();
  renderMailbox();
  if(document.getElementById('page-cafe').classList.contains('active')) renderCafeFriendCards();
  if(document.getElementById('page-profile').classList.contains('active')) renderGazetteFriends();
  if(document.getElementById('invite-modal')?.classList.contains('open')) renderInviteFriends();
  if(document.getElementById('cr-callcard')?.dataset.uid) renderCallCard(document.getElementById('cr-callcard').dataset.uid);
}
function stopFriends(){ stopMail(); if(unsubFriends){ unsubFriends(); unsubFriends=null; } S.friends={list:[], incoming:[], outgoing:[], loaded:false, missing:false}; renderFriendBadges(); }
function friendStatus(uid){
  if(S.friends.list.some(f=>f.user_id===uid)) return 'friend';
  if(S.friends.incoming.some(f=>f.user_id===uid)) return 'incoming';
  if(S.friends.outgoing.some(f=>f.user_id===uid)) return 'outgoing';
  return 'none';
}
const FRIEND_MSG = {
  sent:     n=>[`Your card is on its way to ${n}.`, 'success'],
  accepted: n=>[`${n} had already left a card for you — you're now friends.`, 'success'],
  pending:  n=>[`Your card is already waiting for ${n}.`, ''],
  already_friends: n=>[`You and ${n} are already friends.`, ''],
  not_found: n=>[`No one called "${n}" has joined Brew & Focus yet.`, 'error'],
  yourself: ()=>['That’s your own card!', ''],
};
async function sendFriendCard(username, msgEl){
  const name=String(username||'').trim().replace(/^@/,'');
  if(!name) return;
  if(S.friends.missing){ const m='Friends aren’t set up in Supabase yet — run supabase/friends.sql in the SQL editor.'; if(msgEl) setMsgEl(msgEl,m,'error'); else showToast(m); return; }
  try{
    const res=await FriendsDB.send(name);
    const [m,t]=(FRIEND_MSG[res]||(()=>[String(res),'']))(name);
    if(msgEl) setMsgEl(msgEl,m,t); else showToast(m);
    playPageSound('turn');
    await loadFriends();
    return res;
  } catch(e){ const m=cafeErrorText(e); if(msgEl) setMsgEl(msgEl,m,'error'); else showToast(m); }
}
function setMsgEl(el,m,t){ el.textContent=m; el.className='auth-msg'+(t?' '+t:''); }
async function answerFriendCard(id, accept){
  try{ await FriendsDB.respond(id, accept); playPageSound(accept?'open':'close'); showToast(accept ? 'You have a new friend at the café' : 'Card returned with thanks'); await loadFriends(); }
  catch(e){ showToast(cafeErrorText(e)); }
}
async function removeFriendCard(id, label){
  if(label && !confirm(label)) return;
  try{ await FriendsDB.remove(id); await loadFriends(); } catch(e){ showToast(cafeErrorText(e)); }
}

// a calling card: the person's animal in an oval, their name in copperplate, their @handle in type
function callingCardHTML(f, actions='', extra=''){
  return `<div class="ccard ${extra}">
    <span class="ccard-cameo">${characterSVG(f.look || defaultCharFor(f.user_id))}</span>
    <span class="ccard-txt"><b>${esc(friendName(f))}</b><i>@${esc(f.username||'')}</i></span>
    ${actions ? `<span class="ccard-act">${actions}</span>` : ''}
  </div>`;
}
const fbtn=(label, onclick, cls='')=>`<button type="button" class="ccard-btn ${cls}" onclick="${onclick}">${label}</button>`;

// ── The mailbox: letters between friends, and finding new ones ───────────
// Friends write each other letters (optionally enclosing an invitation to the
// café they're sitting in); the "Find friends" tab searches everyone by name
// or username so you can leave your calling card. Unread letters and waiting
// cards show as a wax seal on your name.
S.mail = { letters:[], loaded:false, missing:false };
S.mbox = { tab:'letters', open:null, q:'', results:null, draft:{} };
let unsubMail=null, mailSearchTimer=null;
const MailDB = {
  async list(){ return CafeDB.check(await CafeDB.sb.from('letters').select('*').order('created_at', {ascending:false}).limit(400)) || []; },
  async send(to, body, cafe){ return CafeDB.check(await CafeDB.sb.rpc('send_letter', {p_to:to, p_body:body, p_cafe:cafe||null})); },
  async markRead(from){ return CafeDB.check(await CafeDB.sb.rpc('mark_letters_read', {p_from:from})); },
  async search(q){ return CafeDB.check(await CafeDB.sb.rpc('search_people', {p_query:q})) || []; },
  subscribe(cb){
    const ch=CafeDB.sb.channel('mail:'+S.user.id)
      .on('postgres_changes', {event:'*', schema:'public', table:'letters', filter:`recipient=eq.${S.user.id}`}, ()=>cb())
      .on('postgres_changes', {event:'*', schema:'public', table:'letters', filter:`sender=eq.${S.user.id}`}, ()=>cb())
      .subscribe();
    return ()=>{ try{ CafeDB.sb.removeChannel(ch); }catch(e){} };
  },
};
const ENVELOPE_SVG = `<svg class="mb-env" viewBox="0 0 120 84" aria-hidden="true"><rect x="6" y="10" width="108" height="68" rx="3" fill="#fbf6ea" stroke="#7a2e3a" stroke-width="1.6"/><path d="M6 13l54 38 54-38" fill="none" stroke="#7a2e3a" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 78l40-30M114 78L74 48" fill="none" stroke="#7a2e3a" stroke-width="1" opacity="0.5"/><circle cx="60" cy="51" r="11" fill="#7a2e3a"/><circle cx="60" cy="51" r="7.5" fill="none" stroke="#c25a6a" stroke-width="1.2"/><path d="M56.5 51.5l2.5 2.5 5-5" fill="none" stroke="#f6e2b8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="92" y="18" width="14" height="17" fill="none" stroke="#c7a86d" stroke-width="1.2" stroke-dasharray="2 1.5"/></svg>`;
const SEARCH_ICON = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12.6 12.6l4.4 4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const lettersWith = uid => S.mail.letters.filter(l=>l.sender===uid || l.recipient===uid).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));   // newest first
const unreadFrom = uid => S.mail.letters.filter(l=>l.sender===uid && l.recipient===S.user?.id && !l.read_at).length;
const unreadTotal = () => S.mail.letters.filter(l=>l.recipient===S.user?.id && !l.read_at).length;
const mailNews = () => S.friends.incoming.length + unreadTotal();
// your closest correspondents: the friends you write to most
function topFriends(n=3){
  const score=f=>lettersWith(f.user_id).length;
  return [...S.friends.list].sort((a,b)=>score(b)-score(a) || String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,n);
}
async function loadMail(){
  if(!S.user || !supabaseClient){ S.mail={letters:[], loaded:false, missing:false}; return; }
  const before=S.mail.loaded ? new Set(S.mail.letters.map(l=>l.id)) : null;
  try{ S.mail={letters:await MailDB.list(), loaded:true, missing:false}; }
  catch(e){
    const missing=/letters|schema cache|does not exist|Could not find/i.test(e.message||'');
    S.mail={letters:[], loaded:true, missing}; if(!missing) console.warn('Letters not loaded:', e.message);
  }
  if(!unsubMail && !S.mail.missing){ try{ unsubMail=MailDB.subscribe(()=>loadMail()); }catch(e){} }
  // a letter just arrived: say so, unless you're reading that very conversation
  if(before){
    const fresh=S.mail.letters.filter(l=>!before.has(l.id) && l.recipient===S.user.id && !l.read_at);
    const reading=document.getElementById('friends-modal')?.classList.contains('open') && S.mbox.tab==='letters';
    const f=fresh.length && S.friends.list.find(x=>x.user_id===fresh[0].sender);
    if(f && !(reading && S.mbox.open===f.user_id)){ showToast(`A letter from ${friendName(f)} has arrived`); playPageSound('open'); }
  }
  afterMailChange();
}
function afterMailChange(){
  renderFriendBadges();
  renderMailbox();
  if(document.getElementById('page-cafe').classList.contains('active')) renderCafeFriendCards();
  if(document.getElementById('page-profile').classList.contains('active')) renderGazetteFriends();
}
function stopMail(){ if(unsubMail){ unsubMail(); unsubMail=null; } S.mail={letters:[], loaded:false, missing:false}; S.mbox={tab:'letters', open:null, q:'', results:null, draft:{}}; }

// ── The mailbox in the header ──
// A little brass roadside mailbox beside your name: its red flag goes up
// when a letter or calling card arrives. Click it for "Today's Post": cards
// waiting, your friends as envelopes, and the way into the full mailbox.
const POSTBOX_SVG = `<svg viewBox="0 0 40 46" width="34" height="39" aria-hidden="true">
  <defs>
    <linearGradient id="pbGreen" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b04a5c"/><stop offset="0.55" stop-color="#7a2e3a"/><stop offset="1" stop-color="#521a24"/></linearGradient>
    <linearGradient id="pbBrass" x1="0" x2="1"><stop offset="0" stop-color="#9a7430"/><stop offset="0.5" stop-color="#f0d898"/><stop offset="1" stop-color="#a8823a"/></linearGradient>
    <linearGradient id="pbWood" x1="0" x2="1"><stop offset="0" stop-color="#5a3a22"/><stop offset="0.5" stop-color="#94704a"/><stop offset="1" stop-color="#5a3a22"/></linearGradient>
  </defs>
  <!-- wooden post -->
  <path d="M7.6 26h6.8v20H7.6z" fill="url(#pbWood)" stroke="#2a170c" stroke-width="0.7"/>
  <path d="M9.4 29v15M12.2 31v12" stroke="#3a2414" stroke-width="0.5" opacity="0.7"/>
  <!-- green column with a pagoda cap and finial -->
  <path d="M7 11.5h8v20H7z" fill="url(#pbGreen)" stroke="#3a1018" stroke-width="0.7"/>
  <path d="M3.6 11.5L7.4 7.2h7.2l3.8 4.3z" fill="url(#pbGreen)" stroke="#3a1018" stroke-width="0.7" stroke-linejoin="round"/>
  <path d="M3.2 11.5h15.6" stroke="url(#pbBrass)" stroke-width="1.1"/>
  <path d="M11 7.2V4.4" stroke="#3a1018" stroke-width="0.9"/><ellipse cx="11" cy="3.6" rx="1.5" ry="1.9" fill="url(#pbBrass)" stroke="#3a1018" stroke-width="0.6"/><circle cx="11" cy="1.4" r="0.8" fill="url(#pbBrass)"/>
  <rect x="8.6" y="13.4" width="4.8" height="3.6" rx="0.4" fill="url(#pbBrass)" stroke="#5a4218" stroke-width="0.4"/>
  <!-- the box itself, door facing us -->
  <path d="M14.4 30.5V20.4a6 6 0 0 1 6-6h12.2a6 6 0 0 1 6 6v10.1z" fill="url(#pbGreen)" stroke="#3a1018" stroke-width="0.8" stroke-linejoin="round"/>
  <path d="M17 16.4c2.4-.9 11-.9 14.8-.6" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M15.6 30.2V21a4.4 4.4 0 0 1 4.4-4.4h0.8a4.4 4.4 0 0 1 4.4 4.4v9.2" fill="none" stroke="#3a1018" stroke-width="0.6"/>
  <circle cx="20.4" cy="22.6" r="2.1" fill="none" stroke="url(#pbBrass)" stroke-width="0.9"/><circle cx="20.4" cy="22.6" r="0.8" fill="url(#pbBrass)"/>
  <path d="M17.4 26.4c1-1 2-1 3 0 1-1 2-1 3 0" fill="none" stroke="url(#pbBrass)" stroke-width="0.7" stroke-linecap="round"/>
  <rect x="27" y="24.2" width="9.4" height="4" rx="0.4" fill="none" stroke="url(#pbBrass)" stroke-width="0.8"/>
  <path d="M28.6 26.2h6.2" stroke="url(#pbBrass)" stroke-width="0.6" stroke-dasharray="1.2 0.8"/>
  <path d="M14.2 30.6h24.6" stroke="url(#pbBrass)" stroke-width="1.2" stroke-linecap="round"/>
  <!-- scrolled iron bracket -->
  <path d="M15 31.6h16.4c1.6 0 2 1.4 1 2.4-3 3-9.4 5.4-17.4 6.4" fill="none" stroke="url(#pbBrass)" stroke-width="1.1" stroke-linecap="round"/>
  <path d="M30.6 33.6a1.6 1.6 0 1 0-1.6 1.6M22.4 37.4c-1.6.4-2.6-1-1.6-2.2s2.8-.2 2.4 1.2" fill="none" stroke="url(#pbBrass)" stroke-width="0.8" stroke-linecap="round"/>
  <!-- the red flag: lowered until there's post, then raised -->
  <g class="nav-post-flag"><path d="M33.4 25V15.2" stroke="#5a4218" stroke-width="1.3" stroke-linecap="round"/><path d="M33.4 15.2h5v3.4h-5z" fill="url(#pbBrass)" stroke="#5a4218" stroke-width="0.6" stroke-linejoin="round"/><circle cx="33.4" cy="25" r="0.9" fill="#5a4218"/></g>
</svg>`;
function navPostHTML(){ return `<button type="button" class="nav-post" id="nav-post" onclick="toggleMailTray()" aria-haspopup="dialog" aria-expanded="false" aria-controls="mail-tray" title="Your mailbox">${POSTBOX_SVG}<span class="nav-post-n"></span></button>`; }
function renderFriendBadges(){
  const n=mailNews(), b=document.getElementById('nav-post');
  if(b){
    b.classList.toggle('has-mail', n>0);
    b.querySelector('.nav-post-n').textContent = n ? (n>9?'9+':String(n)) : '';
    b.title = n ? `${n} new in your mailbox` : 'Your mailbox';
    b.setAttribute('aria-label', b.title);
  }
  renderMailTray();
}
function toggleMailTray(force){
  const t=document.getElementById('mail-tray'), b=document.getElementById('nav-post'); if(!t) return;
  const open = typeof force==='boolean' ? force : t.hidden;
  if(open && !S.user){ openAuthModal('signin'); return; }
  t.hidden=!open; b?.setAttribute('aria-expanded', String(open));
  if(open){
    const r=b.getBoundingClientRect();
    t.style.top=Math.round(r.bottom+10)+'px';
    t.style.right=Math.max(8, Math.round(innerWidth - r.right - 12))+'px';
    renderMailTray(); loadFriends(); loadMail(); playPageSound('turn');
    // point the tray's little arrow at the mailbox
    const tr=t.getBoundingClientRect(); t.style.setProperty('--arrow-x', Math.round(r.left + r.width/2 - tr.left - 7)+'px');
  }
}
function renderMailTray(){
  const t=document.getElementById('mail-tray'); if(!t || t.hidden) return;
  const F=S.friends, unread=unreadTotal();
  const head=`<div class="mt-head"><span class="mt-k">The Café Post</span><b>${unread ? `${unread} new letter${unread>1?'s':''}` : 'Today’s post'}</b></div>`;
  if(F.missing){ t.innerHTML=head+`<p class="mt-note">The mailbox isn’t set up yet — run <b>supabase/friends.sql</b> in Supabase.</p>`; return; }
  const last=uid=>lettersWith(uid)[0];
  const rows=[...F.list].sort((a,b)=>unreadFrom(b.user_id)-unreadFrom(a.user_id) || (last(b.user_id)?.created_at||'').localeCompare(last(a.user_id)?.created_at||'') || friendName(a).localeCompare(friendName(b)));
  const go=(js)=>`toggleMailTray(false); ${js}`;
  t.innerHTML = head
    + (F.incoming.length ? `<button type="button" class="mt-cards" onclick="${go(`openMailbox('cards')`)}">${vicon('cards')}<span>${F.incoming.length} calling card${F.incoming.length>1?'s':''} waiting</span><i>›</i></button>` : '')
    + `<div class="mt-list">${rows.length ? rows.slice(0,5).map(f=>envelopeHTML(f, go(`openMailbox('letters','${f.user_id}')`))).join('')
        : `<p class="mt-note">No friends in your mailbox yet. Find a fellow student and leave your calling card.</p>`}</div>`
    + (rows.length>5 ? `<p class="mt-more">and ${rows.length-5} more in the mailbox</p>` : '')
    + `<div class="mt-foot"><button type="button" class="mt-btn" onclick="${go(`openMailbox('find')`)}">${SEARCH_ICON}Find friends</button><button type="button" class="mt-btn p" onclick="${go(`openMailbox('letters')`)}">${vicon('letter')}Open the mailbox</button></div>`;
}
document.addEventListener('click', e=>{ const t=document.getElementById('mail-tray'); if(t && !t.hidden && !e.target.closest('#mail-tray, #nav-post')) toggleMailTray(false); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ const t=document.getElementById('mail-tray'); if(t && !t.hidden) toggleMailTray(false); } });

function openMailbox(tab, uid){
  if(!S.user){ openAuthModal('signin'); return; }
  const unread=unreadTotal();
  S.mbox.tab = uid ? 'letters' : (tab || (S.friends.incoming.length && !unread ? 'cards' : 'letters'));
  if(uid) S.mbox.open=uid;
  else if(S.mbox.tab==='letters' && unread){ const l=S.mail.letters.find(x=>x.recipient===S.user.id && !x.read_at); if(l) S.mbox.open=l.sender; }
  document.getElementById('friends-modal').classList.add('open');
  renderMailbox(); loadFriends(); loadMail();
}
const openCardBox = () => openMailbox();
function closeMailbox(e){ if(!e || e.target===document.getElementById('friends-modal')) document.getElementById('friends-modal').classList.remove('open'); }
const closeCardBox = closeMailbox;
function setMailTab(t){ S.mbox.tab=t; renderMailbox(); if(t==='find') setTimeout(()=>document.getElementById('mb-q')?.focus(), 30); }
function openThread(uid){
  S.mbox.tab='letters'; S.mbox.open=uid; renderMailbox();
  if(uid && matchMedia('(min-width:701px)').matches) setTimeout(()=>document.getElementById('mb-text')?.focus({preventScroll:true}), 30);
}

function renderMailbox(){
  const modal=document.getElementById('friends-modal'); if(!modal?.classList.contains('open')) return;
  const today=new Date(), pmEl=document.getElementById('mb-today');
  if(pmEl) pmEl.innerHTML=`<i>BREW &amp; FOCUS</i><b>${today.getDate()} ${today.toLocaleDateString('en-GB',{month:'short'}).toUpperCase()}</b><i>${today.getFullYear()}</i>`;
  const F=S.friends, tabs=document.getElementById('mb-tabs'), body=document.getElementById('mb-body');
  const unread=unreadTotal();
  tabs.innerHTML=[['letters','Letters',unread],['find','Find friends',0],['cards','Calling cards',F.incoming.length]].map(([k,l,n])=>
    `<button type="button" class="mb-tab ${S.mbox.tab===k?'on':''}" role="tab" aria-selected="${S.mbox.tab===k}" onclick="setMailTab('${k}')">${l}${n?`<span class="mb-n">${n}</span>`:''}</button>`).join('');
  if(F.missing){ body.innerHTML=`<div class="mb-empty">${ENVELOPE_SVG}<p>The mailbox isn’t set up in Supabase yet — run <b>supabase/friends.sql</b> in the SQL editor, then come back.</p></div>`; return; }
  if(S.mbox.tab==='find') return renderMailFind(body);
  if(S.mbox.tab==='cards') return renderMailCards(body);
  renderMailLetters(body);
}

// ── Letters ──
function renderMailLetters(body){
  const F=S.friends;
  const ta=document.getElementById('mb-text'), hadFocus = ta && document.activeElement===ta;
  if(ta?.dataset.uid) S.mbox.draft[ta.dataset.uid]=ta.value;
  if(!F.list.length){
    body.innerHTML=`<div class="mb-empty">${ENVELOPE_SVG}<p>No letters yet — there’s no one to write to.<br>Find a fellow student and leave your calling card.</p><button type="button" class="btn-p vbtn" onclick="setMailTab('find')">${vicon('key')}Find friends</button></div>`;
    return;
  }
  const open=S.mbox.open && F.list.find(f=>f.user_id===S.mbox.open);
  if(open && unreadFrom(open.user_id)) markThreadRead(open.user_id);
  const last=uid=>lettersWith(uid)[0];
  const rows=[...F.list].sort((a,b)=>(last(b.user_id)?.created_at||'').localeCompare(last(a.user_id)?.created_at||'') || friendName(a).localeCompare(friendName(b)));
  body.innerHTML=`<div class="mb-letters ${open?'reading':''}">
    <div class="mb-list">${rows.map(f=>envelopeHTML(f, `openThread('${f.user_id}')`, open&&open.user_id===f.user_id)).join('')}</div>
    <div class="mb-thread">${open ? threadHTML(open) : `<div class="mb-pick">${ENVELOPE_SVG}<p>Choose a friend to read your letters, or to write one.</p></div>`}</div>
  </div>`;
  if(open){
    const sc=document.getElementById('mb-scroll'); if(sc) sc.scrollTop=sc.scrollHeight;
    const nt=document.getElementById('mb-text');
    if(nt){ nt.value=S.mbox.draft[open.user_id]||''; if(hadFocus){ nt.focus({preventScroll:true}); nt.setSelectionRange(nt.value.length, nt.value.length); } }
  }
}
// ── Airmail: printed stamps and postmarks ──
// Flat two-colour stamps in red, blue and navy (like old airmail), each on
// perforated stamp paper: the sender's animal, or a little café motif.
const STAMP_INKS=['#c8423a','#3a5fa8','#1f2a4a','#d0892a','#2f6a4a'];
const strHash = v => { let h=2166136261; for(const ch of String(v||'')){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619)>>>0; } return h; };
const STAMP_MOTIFS = {
  cup:'<path d="M5 13h12v3.6a6 6 0 0 1-12 0z" fill="#fbf3e2"/><path d="M17 14.2h1.4a2.3 2.3 0 0 1 0 4.6H16.6" fill="none" stroke="#fbf3e2" stroke-width="1.4"/><path d="M3 23.2h17" stroke="#fbf3e2" stroke-width="1.6" stroke-linecap="round"/><path d="M8.5 10.5c-1-1.4 1-2.2 0-3.8M12 10.5c-1-1.4 1-2.2 0-3.8" fill="none" stroke="#fbf3e2" stroke-width="1.1" stroke-linecap="round"/>',
  heart:'<path d="M12 24C4 18 3 13.5 5 10.6 7 7.8 10.8 8.4 12 11c1.2-2.6 5-3.2 7-.4 2 2.9 1 7.4-7 13.4z" fill="#fbf3e2"/><circle cx="16.6" cy="11.4" r="1.1" fill="currentColor" opacity="0.5"/>',
  bird:'<path d="M3.5 17c3.5-.4 6.6-2.2 8.6-5.4 1.4-2.2 4-3.2 6.4-2.4l2.2-.9-1.2 2c.4 3.6-2.2 7.2-6.6 8.2-3.2.8-6.6.2-9.4-1.5z" fill="#fbf3e2"/><path d="M9 15.6c2.4-2.6 5.6-3.4 8.2-3" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.55"/><circle cx="17.6" cy="11" r="0.8" fill="currentColor"/>',
  croissant:'<path d="M3 18c1.5-6 6-9.4 9-9.4S19.5 12 21 18c-1.6.6-3 .2-3.8-.9-1 2.4-3 3.4-5.2 3.4s-4.2-1-5.2-3.4C6 18.2 4.6 18.6 3 18z" fill="#fbf3e2"/><path d="M8.2 11.4l1.6 7M12 9v11.4M15.8 11.4l-1.6 7" stroke="currentColor" stroke-width="0.9" opacity="0.5"/>',
  teapot:'<path d="M6 13.5h11v4a5.5 5.5 0 0 1-11 0z" fill="#fbf3e2"/><path d="M6 15.5c-2.6-.4-3.6-2.8-3-4.4M17 14.2c2.6-1.4 3.6.6 2 3.2" fill="none" stroke="#fbf3e2" stroke-width="1.4" stroke-linecap="round"/><path d="M8 13.5c0-2.4 7-2.4 7 0" fill="#fbf3e2"/><circle cx="11.5" cy="10.2" r="1.2" fill="#fbf3e2"/><path d="M5 24h13" stroke="#fbf3e2" stroke-width="1.4" stroke-linecap="round"/>',
  branch:'<path d="M5 24C9 18 12 13 19 7" fill="none" stroke="#fbf3e2" stroke-width="1.3" stroke-linecap="round"/><path d="M9 18c-3-.2-4.6-2.2-4.8-4.6 2.6.4 4.4 2 4.8 4.6zM12.6 13.4c.2-2.8 2-4.6 4.6-5-.2 2.6-1.8 4.4-4.6 5zM14 15.2c2.6-.8 4.8.2 6 2.2-2.4.8-4.6 0-6-2.2z" fill="#fbf3e2"/><circle cx="10.6" cy="20.2" r="1.6" fill="#fbf3e2"/><circle cx="12.6" cy="19.2" r="1.4" fill="#fbf3e2"/>',
};
const MOTIF_KEYS=Object.keys(STAMP_MOTIFS);
function pstamp(inner, ink, denom, cls=''){
  return `<span class="pstamp ${cls}" style="--sc:${ink}" aria-hidden="true"><span class="ps-in">${inner}</span>${denom?`<b>${denom}</b>`:''}</span>`;
}
function animalStamp(look, uid, cls=''){ return pstamp(characterSVG(look||defaultCharFor(uid)), STAMP_INKS[strHash(uid)%3], '', 'animal '+cls); }
function motifStamp(seed, cls=''){
  const h=strHash(seed), key=MOTIF_KEYS[h%MOTIF_KEYS.length], ink=STAMP_INKS[(h>>4)%STAMP_INKS.length];
  return pstamp(`<svg viewBox="0 0 24 28" style="color:${ink}">${STAMP_MOTIFS[key]}</svg>`, ink, ['3','5','8','10','12'][(h>>8)%5], 'motif '+cls);
}
// a round postmark with the town ring and date, and wavy cancellation lines
let pmUid=0;
function postmarkSVG(d){
  const u='pm'+(++pmUid);
  return `<svg class="am-pm" viewBox="0 0 112 56" aria-hidden="true">
    <defs><path id="${u}" d="M8 28a20 20 0 1 1 40 0a20 20 0 1 1 -40 0"/></defs>
    <g fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="28" cy="28" r="25" stroke-width="1.6"/><circle cx="28" cy="28" r="15" stroke-width="1"/>
      <path d="M58 17q5-4 10 0t10 0 10 0 10 0 10 0" stroke-width="1.5"/><path d="M58 27q5-4 10 0t10 0 10 0 10 0 10 0" stroke-width="1.5"/><path d="M58 37q5-4 10 0t10 0 10 0 10 0 10 0" stroke-width="1.5"/></g>
    <text font-family="Lora, serif" font-size="6" letter-spacing="1.2" fill="currentColor"><textPath href="#${u}" startOffset="3%">BREW &amp; FOCUS · CAFÉ POST ·</textPath></text>
    <text x="28" y="28" text-anchor="middle" font-family="'Playfair Display', serif" font-size="8.4" font-weight="700" fill="currentColor">${d.getDate()} ${d.toLocaleDateString('en-GB',{month:'short'}).toUpperCase()}</text>
    <text x="28" y="36" text-anchor="middle" font-family="Lora, serif" font-size="5.4" fill="currentColor">${d.getFullYear()}</text>
  </svg>`;
}

// a friend as an airmail envelope: their animal on the stamp, the latest line, an unread seal
function envelopeHTML(f, onclick, on){
  const l=lettersWith(f.user_id)[0], n=unreadFrom(f.user_id);
  return `<button type="button" class="mb-row mb-envelope ${on?'on':''} ${n?'unread':''}" onclick="${onclick}">
    <span class="mb-row-stamp">${animalStamp(f.look, f.user_id)}</span>
    <span class="mb-row-txt"><em>${n ? 'a letter from' : l ? 'correspondence with' : 'write to'}</em><b>${esc(friendName(f))}</b><i>${l ? (l.sender===S.user.id?'You: ':'')+esc(l.body.replace(/\s+/g,' ').slice(0,70)) : 'No letters yet — say hello'}</i></span>
    ${n?`<span class="mb-seal" title="${n} unread">${n}</span>`:''}
  </button>`;
}
function threadHTML(f){
  const ls=lettersWith(f.user_id).slice(0,80).reverse();
  const c=S.room?.cafe, canInvite = c && !c.members.some(m=>m.user_id===f.user_id);
  const first=esc(friendName(f).split(' ')[0]);
  return `<div class="mb-thread-head">
      <button type="button" class="mb-back" onclick="openThread(null)" aria-label="All letters">‹</button>
      <span class="mb-cameo">${characterSVG(f.look||defaultCharFor(f.user_id))}</span>
      <span class="mb-row-txt"><b>${esc(friendName(f))}</b><i>@${esc(f.username||'')}</i></span>
      <button type="button" class="ccard-btn quiet" onclick="removeFriendCard('${f.id}', 'Part ways with ${esc(friendName(f)).replace(/'/g,'')}? Your letters will stay in your mailbox.')">Part ways</button>
    </div>
    <div class="mb-scroll" id="mb-scroll">${ls.length ? ls.map(l=>letterHTML(l,f)).join('') : `<p class="mb-hint mb-first">No letters yet. Write the first one below.</p>`}</div>
    <div class="mb-compose">
      <div class="mb-pad-k">From the desk of ${esc(personName({name:S.profile?.display_name, username:S.user?.username}))}</div>
      <textarea id="mb-text" data-uid="${f.user_id}" maxlength="1000" rows="3" placeholder="Dear ${first}, …" aria-label="Your letter to ${first}"
        oninput="S.mbox.draft['${f.user_id}']=this.value" onkeydown="if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();postLetter();}"></textarea>
      <div class="mb-compose-foot">
        ${canInvite ? `<label class="mb-enclose"><input type="checkbox" id="mb-enclose"> Enclose an invitation to <i>${esc(c.name)}</i></label>` : '<span></span>'}
        <button type="button" class="mb-post" id="mb-post" onclick="postLetter()"><span class="mb-post-seal" aria-hidden="true">B&amp;F</span>Seal &amp; post</button>
      </div>
      <div class="auth-msg" id="mb-msg"></div>
    </div>`;
}
function letterHTML(l, f){
  const mine=l.sender===S.user.id, d=new Date(l.created_at);
  const when=d.toLocaleDateString('en-GB',{day:'numeric', month:'short'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit', minute:'2-digit'});
  // an airmail sheet: Par Avion, who it's from or to, the sender's stamps, cancelled by a postmark
  const who = mine ? `<i>To</i>${esc(f ? friendName(f) : '')}` : `<i>From</i>${esc(f ? friendName(f) : '')}`;
  const stamps = (mine ? animalStamp(myLook(), S.user.id) : animalStamp(f?.look, f?.user_id)) + motifStamp(l.id);
  const head = `<div class="am-top"><div class="am-addr"><span class="am-label">Par Avion · Air Mail</span><span class="am-line">${who}</span></div><div class="am-post">${postmarkSVG(d)}<span class="am-stamps">${stamps}</span></div></div>`;
  const ticket = l.cafe_code ? `<div class="mb-ticket"><span class="mb-ticket-k">Enclosed</span><b>An invitation to ${esc(l.cafe_name||'a café')}</b>${
    mine ? `<i>code ${esc(l.cafe_code)}</i>` : `<button type="button" class="ccard-btn p" onclick="joinFromLetter('${esc(l.cafe_code)}')">Join the café</button>`}</div>` : '';
  return `<div class="mb-letter ${mine?'mine':'theirs'}"><div class="mb-paper airmail">${head}<p>${esc(l.body)}</p>${ticket}</div><div class="mb-when">${when}${mine && l.read_at ? ' · read' : ''}</div></div>`;
}
async function markThreadRead(uid){
  const now=new Date().toISOString(); let n=0;
  S.mail.letters.forEach(l=>{ if(l.sender===uid && l.recipient===S.user.id && !l.read_at){ l.read_at=now; n++; } });
  if(!n) return;
  renderFriendBadges();
  try{ await MailDB.markRead(uid); }catch(e){}
}
async function postLetter(){
  const ta=document.getElementById('mb-text'), uid=ta?.dataset.uid; if(!uid) return;
  const enc=!!document.getElementById('mb-enclose')?.checked, body=ta.value.trim(), msg=document.getElementById('mb-msg'), btn=document.getElementById('mb-post');
  if(!body && !enc){ ta.focus(); return; }
  if(S.mail.missing){ setMsgEl(msg, 'Letters aren’t set up in Supabase yet — run supabase/friends.sql again.', 'error'); return; }
  btn.disabled=true;
  try{
    const res=await MailDB.send(uid, body, enc ? S.room?.cafe?.id : null);
    if(res==='sent'){ S.mbox.draft[uid]=''; ta.value=''; playPageSound('turn'); showToast(enc ? 'Letter posted, with your café invitation' : 'Letter posted'); await loadMail(); }
    else setMsgEl(msg, ({not_friends:'You can only write to friends.', not_member:'You can only enclose a café you’re sitting in.', too_long:'That letter is a little long — keep it under 1,000 characters.', empty:'Write a few words first.'})[res] || String(res), 'error');
  } catch(e){ setMsgEl(msg, cafeErrorText(e), 'error'); }
  finally{ if(document.body.contains(btn)) btn.disabled=false; }
}
function joinFromLetter(code){ closeMailbox(); acceptInvite(code); }

// ── Find friends ──
function renderMailFind(body){
  if(!document.getElementById('mb-q')){
    body.innerHTML=`<div class="mb-find">
      <div class="mb-search">${SEARCH_ICON}<input id="mb-q" type="search" placeholder="Search by name or @username" autocomplete="off" spellcheck="false" oninput="mailSearch(this.value)" aria-label="Search for people"></div>
      <p class="mb-hint">Find a fellow student and leave your calling card. Once they accept it, you can write to each other.</p>
      <div id="mb-results"></div>
    </div>`;
    document.getElementById('mb-q').value=S.mbox.q;
  }
  renderMailResults();
}
function mailSearch(v){
  S.mbox.q=v; clearTimeout(mailSearchTimer);
  if(v.trim().replace(/^@/,'').length<2){ S.mbox.results=null; renderMailResults(); return; }
  renderMailResults();
  mailSearchTimer=setTimeout(async ()=>{
    let res;
    try{ res={q:v, rows:await MailDB.search(v)}; }
    catch(e){ res={q:v, error:/search_people|schema cache|Could not find/i.test(e.message||'') ? 'Search isn’t set up in Supabase yet — run supabase/friends.sql again.' : cafeErrorText(e)}; }
    if(S.mbox.q===v){ S.mbox.results=res; renderMailResults(); }
  }, 280);
}
function renderMailResults(){
  const el=document.getElementById('mb-results'); if(!el) return;
  const q=S.mbox.q.trim(), R=S.mbox.results;
  if(q.replace(/^@/,'').length<2){ el.innerHTML=''; return; }
  if(!R || R.q!==S.mbox.q){ el.innerHTML=`<p class="mb-hint">Looking through the guest book…</p>`; return; }
  if(R.error){ el.innerHTML=`<p class="mb-hint">${esc(R.error)}</p>`; return; }
  if(!R.rows.length){ el.innerHTML=`<p class="mb-hint">No one by that name has joined Brew & Focus yet — send them your café link instead.</p>`; return; }
  el.innerHTML=`<div class="ccards">${R.rows.map(p=>{
    const st = S.friends.loaded ? friendStatus(p.user_id) : p.status, inc=S.friends.incoming.find(f=>f.user_id===p.user_id);
    const act = st==='friend' ? fbtn('Write a letter', `openThread('${p.user_id}')`, 'p')
      : st==='outgoing' ? `<span class="ccard-wait">card waiting</span>`
      : st==='incoming' && inc ? fbtn('Accept their card', `answerFriendCard('${inc.id}',true)`, 'p')
      : fbtn('Leave my card', `sendFriendCard('${esc(p.username)}')`, 'p');
    return callingCardHTML(p, act); }).join('')}</div>`;
}

// ── Calling cards ──
function renderMailCards(body){
  const F=S.friends;
  const sec=(title, inner)=>`<div class="cb-sec"><h4 class="cb-h"><span>${title}</span></h4>${inner}</div>`;
  let html=sec(`Cards for you${F.incoming.length?` <em>${F.incoming.length}</em>`:''}`, F.incoming.length
    ? `<div class="ccards">${F.incoming.map(f=>callingCardHTML(f, fbtn('Accept',`answerFriendCard('${f.id}',true)`,'p')+fbtn('Decline',`answerFriendCard('${f.id}',false)`), 'in')).join('')}</div>`
    : `<p class="mb-hint">No cards waiting for you just now.</p>`);
  if(F.outgoing.length) html+=sec('Cards you’ve left', `<div class="ccards">${F.outgoing.map(f=>callingCardHTML(f, `<span class="ccard-wait">awaiting reply</span>`+fbtn('Withdraw',`removeFriendCard('${f.id}')`,'quiet'), 'out')).join('')}</div>`);
  html+=`<p class="mb-hint mb-cards-foot">Looking for someone? <button type="button" class="mb-inline" onclick="setMailTab('find')">Find friends</button></p>`;
  body.innerHTML=html;
}

// ── On the Study Café page: cards waiting for you ──
function renderCafeFriendCards(){
  const el=document.getElementById('cafe-friend-cards'); if(!el) return;
  const inc=S.friends.incoming;
  el.hidden=!inc.length;
  el.innerHTML = inc.length ? `<h3 class="cafe-section-h"><span>Calling cards</span></h3><div class="ccards wide">${inc.map(f=>callingCardHTML(f, fbtn('Accept',`answerFriendCard('${f.id}',true)`,'p')+fbtn('Decline',`answerFriendCard('${f.id}',false)`), 'in')).join('')}</div>` : '';
  const fb=document.getElementById('cafe-friends-btn');
  const n=mailNews(); if(fb) fb.innerHTML = `${vicon('letter')}Mailbox${n?` <em>${n}</em>`:''}`;
}

// ── In the Gazette: Café Society shows your closest correspondents ──
function renderGazetteFriends(){
  const el=document.getElementById('gz-friends'); if(!el) return;
  const top=topFriends(3), n=mailNews();
  el.innerHTML = (top.length ? `<div class="gz-top-k">Closest correspondents</div><div class="gz-friends-row">${top.map(f=>`<span class="gz-friend" title="${esc(friendName(f))}">${characterSVG(f.look||defaultCharFor(f.user_id))}<i>${esc(friendName(f).split(' ')[0])}</i></span>`).join('')}</div>` : '')
    + `<button type="button" class="gz-link gz-cardbox" onclick="openMailbox()">${n ? `${n} new in your mailbox` : top.length ? 'Open the mailbox' : 'Find friends in the mailbox'}</button>`;
}

// ── At the café table: tap someone's animal for their calling card ──
function openCallCard(uid, ev){
  if(ev) ev.stopPropagation();
  const m=S.room?.cafe?.members.find(x=>x.user_id===uid); if(!m || uid===S.user?.id) return;
  const pop=document.getElementById('cr-callcard'); pop.dataset.uid=uid;
  renderCallCard(uid);
  const wrap=document.getElementById('cr-tablewrap').getBoundingClientRect(), el=ev?.currentTarget?.getBoundingClientRect?.();
  if(el){ pop.style.left=Math.max(8, Math.min(wrap.width-250, el.left-wrap.left+el.width/2-125))+'px'; pop.style.top=Math.max(6, el.top-wrap.top-6)+'px'; }
  pop.hidden=false;
}
function closeCallCard(){ const p=document.getElementById('cr-callcard'); if(p){ p.hidden=true; delete p.dataset.uid; } }
function renderCallCard(uid){
  const pop=document.getElementById('cr-callcard'); const m=S.room?.cafe?.members.find(x=>x.user_id===uid); if(!pop || !m) return;
  const st=friendStatus(uid), inc=S.friends.incoming.find(f=>f.user_id===uid);
  const act = S.friends.missing ? `<span class="ccard-wait">friends not set up yet</span>`
    : st==='friend' ? fbtn('Write a letter',`closeCallCard(); openMailbox('letters','${uid}')`,'p')
    : st==='outgoing' ? `<span class="ccard-wait">your card is waiting</span>`
    : st==='incoming' ? fbtn('Accept their card',`answerFriendCard('${inc.id}',true)`,'p')
    : fbtn('Leave my card',`sendFriendCard('${esc(m.username)}')`,'p');
  pop.innerHTML = `<button type="button" class="cc-x" onclick="closeCallCard()" aria-label="Close">×</button>`
    + callingCardHTML({user_id:m.user_id, username:m.username, display_name:m.name, look:m.look}, act, 'solo')
    + (m.drink ? `<div class="cc-drink">having ${esc(m.drink.label||'a drink')}</div>` : '');
}

// ── In the invite window: your friends, one tap away ──
function renderInviteFriends(){
  const el=document.getElementById('invite-friends'); if(!el) return;
  const c=S.room?.cafe, seated=new Set((c?.members||[]).map(m=>m.user_id));
  const list=S.friends.list.filter(f=>!seated.has(f.user_id));
  el.hidden=!list.length;
  el.innerHTML = list.length ? `<label class="room-f-label">From your mailbox</label><div class="inv-friends">${list.map(f=>`<button type="button" class="inv-friend" onclick="inviteFriendFromModal('${esc(f.username)}', this)"><span class="inv-cameo">${characterSVG(f.look||defaultCharFor(f.user_id))}</span><span>${esc(friendName(f))}</span><em>invite</em></button>`).join('')}</div>` : '';
}
async function inviteFriendFromModal(username, btn){
  try{ const res=await CafeDB.invite(S.room.id, username);
    if(res==='sent'){ btn.classList.add('done'); btn.querySelector('em').textContent='sent'; btn.disabled=true; setInviteMsg(`Invitation sent to ${username}.`,'success'); }
    else setInviteMsg(res==='already_member' ? `${username} already has a seat here.` : String(res),'');
  } catch(e){ setInviteMsg(cafeErrorText(e),'error'); }
}

function openInviteModal(){
  const c=S.room?.cafe; if(!c) return;
  document.getElementById('invite-cafe-name').textContent = c.name;
  document.getElementById('invite-link').value = inviteLinkFor(c.invite_code);
  document.getElementById('invite-code').textContent = c.invite_code;
  document.getElementById('invite-username').value='';
  setInviteMsg('');
  renderInviteFriends();
  document.getElementById('invite-modal').classList.add('open');
}
function closeInviteModal(e){ if(!e || e.target===document.getElementById('invite-modal')) document.getElementById('invite-modal').classList.remove('open'); }
function setInviteMsg(msg, type){ const el=document.getElementById('invite-msg'); el.textContent=msg; el.className='auth-msg'+(type?' '+type:''); }
async function copyInviteLink(){
  const input=document.getElementById('invite-link');
  try{ await navigator.clipboard.writeText(input.value); setInviteMsg('Link copied — send it to a friend.', 'success'); }
  catch(e){ input.select(); document.execCommand && document.execCommand('copy'); setInviteMsg('Link selected — copy it and send it to a friend.', 'success'); }
}
async function sendInvite(){
  const el=document.getElementById('invite-username');
  const name=el.value.trim();
  if(!name){ el.focus(); return; }
  try{
    const res=await CafeDB.invite(S.room.id, name);
    const msgs={sent:[`Invitation sent to ${name}.`,'success'], not_found:[`No one called "${name}" has joined Brew & Focus yet — send them the link instead.`,'error'],
      already_member:[`${name} already has a seat here.`,''], yourself:['That’s you!','']};
    const [m,t]=msgs[res]||[String(res),''];
    setInviteMsg(m,t);
    if(res==='sent') el.value='';
  } catch(e){ setInviteMsg(cafeErrorText(e),'error'); }
}

// ── Leaving / closing ──
async function leaveCafePermanently(){
  const c=S.room?.cafe; if(!c) return;
  const host=isHost();
  const ok=confirm(host ? `Close "${c.name}" for everyone? This can't be undone.` : `Leave "${c.name}"? You can come back with the invite code.`);
  if(!ok) return;
  try{
    if(host) await CafeDB.close(c.id); else await CafeDB.leave(c.id);
    showToast(host ? 'Café closed' : 'You left the café');
    backToCafeList();
  } catch(e){ showToast(cafeErrorText(e)); }
}

// ── Recipe Book ───────────────────────────────────────────────────────────
// The book stays closed until tapped — opening is a small deliberate ritual.
// It slides right to make room, then unfolds fully; closing folds shut and
// slides back to center — a mirrored, physical round trip.
function resetRecipeBookCover(){
  const cover=document.getElementById('book-cover');
  const openView=document.getElementById('book-open-view');
  const content=document.getElementById('book-content');
  const chrome=document.getElementById('book-reader-chrome');
  const bookObject=document.querySelector('.book-object');
  if(content){ content.classList.remove('is-open','content-ready'); }
  if(cover){ cover.style.display=''; delete cover.dataset.animating; }
  if(openView){ openView.classList.remove('shown'); openView.style.display='none'; }
  if(chrome){ chrome.classList.remove('shown'); chrome.style.display='none'; }
  if(bookObject){
    bookObject.getAnimations().forEach(a=>a.cancel());
    bookObject.classList.remove('sliding-solo','sliding-with-pages','is-open'); bookObject.style.setProperty('--book-shift','0px');
    bookObject.style.transformOrigin=''; delete bookObject.dataset.shift;
  }
  document.querySelectorAll('.cover-flip-stage').forEach(el=>el.remove());
  if(cover) cover.style.visibility='';
  setCoverOwner();
}

// Waits for a specific CSS transition to actually finish on an element
// (rather than a guessed delay), with a fallback timeout as a safety net.
function waitForTransitionEnd(el, propertyName, timeoutMs){
  return new Promise(resolve=>{
    let done=false;
    const handler=(e)=>{ if(e.target!==el || e.propertyName!==propertyName) return; done=true; el.removeEventListener('transitionend', handler); resolve(); };
    el.addEventListener('transitionend', handler);
    setTimeout(()=>{ if(!done){ el.removeEventListener('transitionend', handler); resolve(); } }, timeoutMs);
  });
}
// Puts the book straight into its open or closed resting state, no motion.
function setBookState(open, shift){
  const cover=document.getElementById('book-cover');
  const openView=document.getElementById('book-open-view');
  const content=document.getElementById('book-content');
  const chrome=document.getElementById('book-reader-chrome');
  const bookObject=document.querySelector('.book-object');
  const els=[bookObject, content, openView, chrome].filter(Boolean);
  els.forEach(el=>el.style.transition='none');
  cover.style.display = open ? 'none' : '';
  openView.style.display = open ? 'block' : 'none';
  openView.classList.toggle('shown', open);
  content.classList.toggle('is-open', open);
  content.classList.toggle('content-ready', open);
  bookObject.classList.toggle('is-open', open);
  bookObject.style.setProperty('--book-shift', (shift||0)+'px');
  if(chrome){ chrome.style.display = open ? 'block' : 'none'; chrome.classList.toggle('shown', open); }
  void bookObject.offsetWidth;
  els.forEach(el=>el.style.transition='');
}

// Snapshot of the open spread (call while the book is open): its size, and
// a copy of it to paint onto the turning cover and the page beneath it.
function snapshotSpread(){
  const shell=document.querySelector('.flipbook-shell');
  const grid=document.getElementById('recipe-grid');
  const cols=getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
  return {w:shell.offsetWidth, h:shell.offsetHeight, twoCol: cols>=2, clone: shell.cloneNode(true)};
}

// Geometry of the closed book: spine width, cover size, and how far the book
// must slide right so its spine sits at the centre of the scene — where the
// cover hinges open and where the open spread's binding will be.
//
// On wide screens the closed book is exactly the right half of the open
// book (see --page-w / --book-h in the CSS), so as the cover swings it
// reveals the real right-hand page, its back carries the real left-hand
// page, and once it lands the picture IS the open spread — one book, no
// swap. On narrow screens (stacked pages, or no room on the left) the cover
// swings partway and fades instead.
function closedBookGeometry(scene, bookObject, content, cover, spread){
  const spineEl = bookObject.querySelector('.book-spine-fixed');
  const spineW = spineEl ? spineEl.offsetWidth : 0;
  const W = content.offsetWidth;
  const face = cover.querySelector('.cover-face') || cover;
  const objW = bookObject.offsetWidth;
  const sceneW = scene.clientWidth;
  const shiftFull = objW/2 - spineW;
  const sceneLeft = scene.getBoundingClientRect().left;
  const fits = sceneLeft + sceneW/2 - W >= 8;
  const spreadMode = fits && !!spread && spread.twoCol && Math.abs(spread.w - 2*W) <= 6;
  // Phones: a single-page book. Closed and open it's the same size, so the
  // cover swings off to the left revealing the real first page beneath it.
  const singleMode = !spreadMode && !!spread && !spread.twoCol && Math.abs(spread.w - W) <= 6;
  const pageMode = spreadMode || singleMode;
  const H = pageMode ? spread.h : face.offsetHeight;
  return {spineW, W, H, front: pageMode ? cover : face, spread, spreadMode, singleMode, pageMode, objW, sceneW,
          left:bookObject.offsetLeft, top:bookObject.offsetTop, fits, shift: fits ? shiftFull : 0};
}

// Builds the overlay that draws the cover swinging: the page underneath,
// the shadow the cover casts on it, and the curling cover leaf itself. It
// sits in the scene (outside the book's clipping) with the book's own tilt
// and shift, so it lines up exactly with the real cover.
function buildCoverStage(scene, g){
  const stage = makeDiv('cover-flip-stage');
  stage.setAttribute('aria-hidden','true');
  Object.assign(stage.style,{
    left:g.left+'px', top:g.top+'px', width:g.objW+'px', height:g.H+'px',
    transform:`rotate(-0.5deg) translateX(${g.shift}px)`
  });
  // Perspective lives on an untransformed inner layer: Chrome stops hiding
  // back faces when perspective shares an element with a 2D transform.
  const space = makeDiv('cover-flip-space');
  space.style.perspectiveOrigin = `${g.spineW}px ${g.H/2}px`;
  stage.appendChild(space);

  let under, back, backW = g.W;
  if(g.spreadMode){
    // Right half of the real spread under the cover; left half on its back.
    under = placeEl(makeDiv('cover-under-clip'), g.spineW, 0, g.W, g.H);
    under.appendChild(paperClone(g.spread.clone, 2*g.W, g.H, -g.W));
    back = g.spread.clone; backW = 2*g.W;
  } else if(g.singleMode){
    // The real first page under the cover; the cover's inside on its back.
    under = placeEl(makeDiv('cover-under-clip'), g.spineW, 0, g.W, g.H);
    under.appendChild(paperClone(g.spread.clone, g.W, g.H, 0));
    back = makeDiv('cover-inside');
  } else {
    under = placeEl(makeDiv('cover-under-page'), g.spineW, 0, g.W, g.H);
    back = makeDiv('cover-inside');
  }
  const tableShadow = placeEl(makeDiv('cover-table-shadow'), g.spineW - g.W, 0, g.W, g.H);
  const cast = placeEl(makeDiv('flip-cast-shadow'), g.spineW, 0, g.W, g.H);
  cast.style.background = 'linear-gradient(to right, rgba(25,12,4,0.6), rgba(25,12,4,0.2) 40%, rgba(25,12,4,0) 80%)';
  const parts = buildCurlLeaf({hinge:g.spineW, y:0, W:g.W, H:g.H, gap:0, dir:1, front:g.front, back, backW});
  // The leaf sits in its own full-size layer (carrying the perspective) so
  // it can fade without flattening.
  const fader = makeDiv('cover-flip-space');
  fader.style.perspectiveOrigin = space.style.perspectiveOrigin;
  fader.appendChild(parts.leaf);
  space.append(tableShadow, under, cast, fader);
  scene.appendChild(stage);
  return {stage, cast, parts, fader, tableShadow};
}
function coverSwingAnimations(c, g, duration){
  const anims = animateCurl(c.parts, {dir:1, duration, angle: (g.fits || g.singleMode) ? 180 : 100, fadeEl: g.fits ? null : c.fader, lift:22});
  if(g.fits) anims.push(c.tableShadow.animate([
    {opacity:0}, {opacity:0, offset:0.55}, {opacity:1}
  ], {duration, easing:'ease-in', fill:'both'}));
  anims.push(c.cast.animate([
    {opacity:0}, {opacity:1, offset:0.25}, {opacity:0.5, offset:0.6}, {opacity:0}
  ], {duration, easing:'ease-out', fill:'both'}));
  return anims;
}

// Narrow-screen fallback only: the half-open book drawn by the overlay and
// the real (stacked) spread have different sizes, so both follow the same
// outline while they cross-fade.
function settleTransforms(bookObject, stage, g){
  const sr = bookObject.getBoundingClientRect();
  const st = stage.getBoundingClientRect();
  const scx = st.left + st.width/2, scy = st.top + st.height/2;      // stage centre (its transform origin)
  const hingeX = scx - g.objW/2 + g.spineW;
  const ow = g.fits ? 2*g.W : g.W, oh = g.H;
  const ocx = g.fits ? hingeX : hingeX + g.W/2, ocy = scy;            // overlay footprint centre
  const rcx = sr.left + sr.width/2, rcy = sr.top + sr.height/2;      // spread centre
  const kx = ow/sr.width, ky = oh/sr.height;
  bookObject.style.transformOrigin = 'center center';
  const base = stage.style.transform;
  // Scale about the overlay's centre, expressed relative to the stage's
  // untransformed origin (its slide right isn't applied yet at that point).
  const cx = ocx-scx+g.shift, cy = ocy-scy;
  return {
    bookSmall: `translate(${ocx-rcx}px, ${ocy-rcy}px) rotate(-0.5deg) scale(${kx.toFixed(4)}, ${ky.toFixed(4)})`,
    bookFull: 'rotate(-0.5deg)',
    stageSmall: base,
    stageFull: `translate(${rcx-ocx}px, ${rcy-ocy}px) translate(${cx}px, ${cy}px) scale(${(1/kx).toFixed(4)}, ${(1/ky).toFixed(4)}) translate(${-cx}px, ${-cy}px) ${base}`
  };
}

// The reader's page controls slip in after the book is open and out
// before it closes.
function readerExtras(show){
  const chrome=document.getElementById('book-reader-chrome');
  const out=[];
  if(chrome) out.push(chrome.animate(show ? [{opacity:0},{opacity:1}] : [{opacity:1},{opacity:0}],
    {duration: show ? 400 : 220, fill: show ? 'none' : 'forwards'}));
  return out;
}

const COVER_SWING_MS = 1400;
const SETTLE_MS = 750;

async function openRecipeBook(){
  const cover=document.getElementById('book-cover');
  const content=document.getElementById('book-content');
  const bookObject=document.querySelector('.book-object');
  const scene=document.querySelector('.book-shelf-scene');
  if(!cover || !bookObject || !scene || cover.dataset.animating==='1') return;
  cover.dataset.animating='1';
  playPageSound('open');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion || !Element.prototype.animate){
    setBookState(true, 0); renderRecipes(); cover.dataset.animating='0'; return;
  }

  // Lay out the open spread for an instant (never painted) to snapshot it.
  setBookState(true, 0);
  renderRecipes();
  const spread = snapshotSpread();
  setBookState(false, 0);
  const g = closedBookGeometry(scene, bookObject, content, cover, spread);
  bookObject.dataset.shift = String(g.shift);

  // Stage 1 — slide the closed book right until its spine sits at the
  // centre, where the binding of the open spread will be.
  if(g.shift){
    bookObject.classList.add('sliding-solo');
    bookObject.style.setProperty('--book-shift', g.shift+'px');
    await waitForTransitionEnd(bookObject, 'transform', 650);
    bookObject.classList.remove('sliding-solo');
  }

  // Stage 2 — the cover lifts from the spine, curls, and lays open to the
  // left, revealing the pages.
  const c = buildCoverStage(scene, g);
  cover.style.visibility='hidden';
  const swing = coverSwingAnimations(c, g, COVER_SWING_MS);
  await swing[0].finished.catch(()=>{});

  if(g.pageMode){
    // The overlay now shows exactly the open book, in exactly its place:
    // swap in the real one underneath it — nothing visibly changes.
    setBookState(true, 0);
    cover.style.visibility='';
    c.stage.remove();
    readerExtras(true);
  } else {
    // Narrow screens: the real (stacked) spread grows out of the overlay's
    // footprint as the overlay fades.
    setBookState(true, 0);
    cover.style.visibility='';
    const t = settleTransforms(bookObject, c.stage, g);
    const ease = 'cubic-bezier(0.35,0,0.15,1)';
    const grow = bookObject.animate([
      {transform:t.bookSmall, opacity:0},
      {opacity:0, offset:0.1},
      {opacity:1, offset:0.6},
      {transform:t.bookFull, opacity:1}
    ], {duration:SETTLE_MS, easing:ease});
    c.stage.animate([
      {transform:t.stageSmall, opacity:1},
      {opacity:1, offset:0.1},
      {opacity:0, offset:0.6},
      {transform:t.stageFull, opacity:0}
    ], {duration:SETTLE_MS, easing:ease, fill:'forwards'});
    await grow.finished.catch(()=>{});
    bookObject.style.transformOrigin='';
    c.stage.remove();
  }
  cover.dataset.animating='0';
}

async function closeRecipeBook(){
  const cover=document.getElementById('book-cover');
  const content=document.getElementById('book-content');
  const chrome=document.getElementById('book-reader-chrome');
  const bookObject=document.querySelector('.book-object');
  const scene=document.querySelector('.book-shelf-scene');
  if(!cover || !bookObject || !scene || cover.dataset.animating==='1') return;
  cover.dataset.animating='1';
  playPageSound('close');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion || !Element.prototype.animate){
    setBookState(false, 0); cover.dataset.animating='0'; return;
  }

  // Tuck away the bookmark and page controls first.
  const extras = readerExtras(false);
  await Promise.all(extras.map(a=>a.finished.catch(()=>{})));

  // Snapshot the spread as it is now, and measure the closed book.
  const spread = snapshotSpread();
  setBookState(false, 0);
  const g = closedBookGeometry(scene, bookObject, content, cover, spread);
  setBookState(true, 0);
  bookObject.dataset.shift = String(g.shift);

  const c = buildCoverStage(scene, g);
  const swing = coverSwingAnimations(c, g, COVER_SWING_MS);
  swing.forEach(a=>{ a.pause(); a.currentTime = COVER_SWING_MS; }); // cover lying open

  if(g.pageMode){
    // The overlay is a pixel match for the open book: swap to the closed
    // book (cover hidden beneath the overlay) with no visible change.
    cover.style.visibility='hidden';
    setBookState(false, g.shift);
  } else {
    // Narrow screens: the stacked spread shrinks into the half-open book.
    c.stage.style.opacity='0';
    const t = settleTransforms(bookObject, c.stage, g);
    const ease = 'cubic-bezier(0.65,0,0.85,1)';
    const shrink = bookObject.animate([
      {transform:t.bookFull, opacity:1},
      {opacity:1, offset:0.4},
      {opacity:0, offset:0.9},
      {transform:t.bookSmall, opacity:0}
    ], {duration:SETTLE_MS, easing:ease, fill:'forwards'});
    c.stage.animate([
      {transform:t.stageFull, opacity:0},
      {opacity:0, offset:0.4},
      {opacity:1, offset:0.9},
      {transform:t.stageSmall, opacity:1}
    ], {duration:SETTLE_MS, easing:ease, fill:'forwards'});
    await shrink.finished.catch(()=>{});
    cover.style.visibility='hidden';
    setBookState(false, g.shift);
    shrink.cancel();
    bookObject.style.transformOrigin='';
    c.stage.getAnimations().forEach(a=>a.cancel());
    c.stage.style.opacity='1';
  }
  extras.forEach(a=>a.cancel());

  // The cover lifts off the table and swings shut over the pages.
  swing.forEach(a=>{ a.playbackRate = -1; a.play(); });
  await swing[0].finished.catch(()=>{});
  cover.style.visibility='';
  c.stage.remove();

  // The closed book slides back to centre.
  if(g.shift){
    bookObject.classList.add('sliding-solo');
    bookObject.style.setProperty('--book-shift', '0px');
    await waitForTransitionEnd(bookObject, 'transform', 650);
    bookObject.classList.remove('sliding-solo');
  }
  cover.dataset.animating='0';
}


function setRecipeTab(tab){
  S.recipeTab=tab;
  S.recipePage=0;
  S.quickTab='all';
  document.querySelectorAll('.ri-tab').forEach(t=>{ const on=t.id==='rtab-'+tab; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); });
  renderRecipes();
}

const addonNames={whipped:'Whipped Cream',caramel:'Caramel',honey:'Honey',cinnamon:'Cinnamon',marshmallow:'Marshmallows',boba:'Boba',vanilla:'Vanilla Foam'};
const baseNames={coffee:'Coffee',matcha:'Matcha',tea:'Tea',chocolate:'Hot Chocolate',chai:'Chai',earlgrey:'Earl Grey',hibiscus:'Hibiscus',golden:'Golden Milk'};
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
function setRecipeSort(v){
  S.recipeSort = ['newest','oldest','favorite'].includes(v) ? v : 'newest';
  S.recipePage=0; renderRecipes();
}
function clearRecipeFilters(){
  const q=document.getElementById('recipe-search'); if(q) q.value='';
  const sub=document.getElementById('filter-subject'); if(sub) sub.value='';
  S.recipeSearch=''; S.recipeSubject=''; S.quickTab='all'; S.recipePage=0;
  renderRecipes();
}
function setQuickTab(tab){
  S.quickTab=tab||'all'; S.recipePage=0; renderRecipes();
}
// The bell cord: a tug rings the bell and lowers (or lifts) the index card.
function toggleRecipeFilters(force){
  const drop=document.getElementById('ri-drop'), pull=document.getElementById('bell-pull');
  if(!drop || !pull) return;
  const open = typeof force==='boolean' ? force : !drop.classList.contains('open');
  drop.classList.toggle('open', open);
  pull.setAttribute('aria-expanded', String(open));
  if(typeof force!=='boolean'){
    pull.classList.remove('tugged'); void pull.offsetWidth; pull.classList.add('tugged');
    playBell();
    if(open) setTimeout(()=>document.getElementById('recipe-search')?.focus({preventScroll:true}), 450);
  }
}
// A small brass shop bell: two bright partials ringing out over a second.
function playBell(){
  initAudio(); if(!S.soundOn || !audioCtx) return;
  const t=audioCtx.currentTime;
  [[1568,0.16,1.2],[2349,0.07,0.8],[3136,0.04,0.5],[1568,0.08,1.0,0.16]].forEach(([f,v,d,delay=0])=>{
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type='sine'; o.frequency.value=f;
    g.gain.setValueAtTime(0.0001, t+delay);
    g.gain.exponentialRampToValueAtTime(v, t+delay+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t+delay+d);
    o.connect(g); g.connect(masterGain); o.start(t+delay); o.stop(t+delay+d+0.05);
  });
}
function saveRecipeLists(){
  localStorage.setItem('bf_recipes',JSON.stringify(S.recipes));
  localStorage.setItem('bf_shared',JSON.stringify(S.sharedRecipes));
}
// ── Tearing a page out of the recipe book ──
let pendingDelete=null;
function askDeleteRecipe(id, event){
  if(event) event.stopPropagation();
  const r=[...S.recipes,...S.sharedRecipes].find(x=>String(x.id)===String(id)); if(!r) return;
  pendingDelete=r.id;
  document.getElementById('del-name').textContent=r.name||'this recipe';
  document.getElementById('delete-modal').classList.add('open');
}
function closeDeleteRecipe(){ pendingDelete=null; document.getElementById('delete-modal').classList.remove('open'); }
async function confirmDeleteRecipe(){
  const id=pendingDelete; closeDeleteRecipe(); if(id==null) return;
  const r=[...S.recipes,...S.sharedRecipes].find(x=>String(x.id)===String(id));
  // lift a copy of the page off the book before it's gone, then tear it away
  const card=document.querySelector(`.recipe-card[data-rid="${CSS.escape(String(id))}"]`);
  const tear = card ? tearPageCopy(card) : null;
  playTearSound();
  S.recipes=S.recipes.filter(x=>String(x.id)!==String(id));
  S.sharedRecipes=S.sharedRecipes.filter(x=>String(x.id)!==String(id));
  saveRecipeLists();
  // keep the page you were on, unless it no longer exists
  const per=pagesPerSpread(), max=Math.max(0, Math.ceil(filteredRecipes().length/per)-1);
  S.recipePage=Math.min(S.recipePage, max);
  renderRecipes();
  if(tear) tear();
  showToast(`"${r?.name||'Recipe'}" was torn out of your book`);
  if(r && S.user && r._cloudId) deleteRecipeCloud(r);
}
// The sound of a page being ripped out: a burst of rough, crackling paper
// fibres that rises and trails off.
function playTearSound(){
  initAudio(); if(!S.soundOn || !audioCtx) return;
  if(audioCtx.state==='suspended') audioCtx.resume();
  const ac=audioCtx, sr=ac.sampleRate, dur=1.05, n=Math.floor(sr*dur), buf=ac.createBuffer(1,n,sr), d=buf.getChannelData(0);
  let grain=0, amp=0;
  for(let i=0;i<n;i++){
    const t=i/n;
    // fibres giving way one after another: sparse at the first tug, a dense rip, then the snap as it comes free
    if(--grain<=0){ const dense = t<0.12 ? 0.04 : t<0.6 ? 0.012 : 0.02; grain=Math.floor(sr*(0.003+Math.random()*dense)); amp=0.2+Math.random()*0.8; }
    let env = t<0.03 ? t/0.03*0.5 : t<0.12 ? 0.45 : t<0.6 ? 0.6+0.4*(t-0.12)/0.48 : t<0.66 ? 1 : Math.pow(Math.max(0,1-(t-0.66)/0.34), 2.2);
    if(t>0.08 && t<0.13) env*=0.25;                                                                    // a pause after the first tug
    d[i]=(Math.random()*2-1)*amp*env*(Math.random()<0.004 ? 2.4 : 1);                                // the odd sharp crack
  }
  const src=ac.createBufferSource(); src.buffer=buf;
  const hp=ac.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=900;
  const bp=ac.createBiquadFilter(); bp.type='peaking'; bp.frequency.value=2800; bp.Q.value=0.8; bp.gain.value=7;
  const lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=7500;
  const g=ac.createGain(); g.gain.value=0.9;
  src.connect(hp); hp.connect(bp); bp.connect(lp); lp.connect(g); g.connect(masterGain||ac.destination);
  src.start();
}
// Copies the page into two pieces along a ragged tear near the binding,
// laid exactly over the real page; returns a function that rips them away.
function tearPageCopy(card){
  const shell=document.querySelector('.flipbook-shell'), grid=card.parentElement;
  if(!shell || !grid || !Element.prototype.animate) return null;
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const x=grid.offsetLeft+card.offsetLeft, y=grid.offsetTop+card.offsetTop, w=card.offsetWidth, h=card.offsetHeight;
  // the binding is on the side of the page nearest the gutter
  const bindLeft = pagesPerSpread()===1 || card.offsetLeft > grid.offsetWidth/2 - 4;
  const base = bindLeft ? 0.13*w : 0.87*w, pts=[], ph=Math.random()*6, steps=64;
  for(let i=0;i<=steps;i++){
    const yy=h*i/steps, t=i/steps;
    const drift=(bindLeft?1:-1)*(Math.sin(t*Math.PI)*12 + Math.sin(t*5.3+ph)*5);   // the long wander of the tear
    const jag=(Math.random()*2-1)*(i%3===0 ? 6 : 2.5);                              // short, sharp fibre jags
    pts.push([base+drift+jag, yy]);
  }
  const line=(dx)=>pts.map(([px,py])=>`${(px+dx).toFixed(1)}px ${py.toFixed(1)}px`).join(',');
  const out = bindLeft ? 1 : -1;                           // which way the page side lies from the tear
  const pageEdge=bindLeft?`${w+40}px`:'-40px', stubEdge=bindLeft?'-40px':`${w+40}px`;
  const poly=(edge, dx)=>`polygon(${edge} -40px, ${line(dx)}, ${edge} ${h+40}px)`;
  const layer=makeDiv('tear-layer'); Object.assign(layer.style,{left:x+'px', top:y+'px', width:w+'px', height:h+'px'});
  const piece=(cls, edge, dx, fibre)=>{
    const p=makeDiv('tear-piece '+cls);
    if(fibre){ const f=makeDiv('tear-fibre'); f.style.clipPath=poly(edge, dx - out*3); p.appendChild(f); }
    const c=card.cloneNode(true); c.removeAttribute('onclick'); c.removeAttribute('data-rid'); uniquifyIds(c);
    Object.assign(c.style,{position:'absolute', inset:'0', width:w+'px', height:h+'px', margin:'0', transform:'none', transition:'none', minHeight:'0', clipPath:poly(edge, dx)});
    p.appendChild(c); return p;
  };
  const page=piece('tear-leaf', pageEdge, 0, true), stub=piece('tear-stub', stubEdge, 0, true);
  // the fibres on the stub side show on its torn edge too
  stub.querySelector('.tear-fibre').style.clipPath=poly(stubEdge, out*3);
  layer.append(stub, page); shell.appendChild(layer);
  return ()=>{
    // The tear runs from the top down: the page swings away about the point
    // where it's still attached at the bottom of the tear, lifting off the
    // book as it goes, so the gap opens from the top first. Once it gives
    // way at the bottom, the page drops away.
    const foot=pts[pts.length-1][0];
    page.style.transformOrigin = `${foot}px ${h}px`;
    stub.style.transformOrigin = `${foot}px ${h}px`;
    const T=(x,y,r,ry,z=0)=>`translate3d(${x}px,${y}px,${z}px) rotate(${r}deg) rotateY(${ry}deg)`;
    const sh=(x,y,b,a)=>`drop-shadow(${x}px ${y}px ${b}px rgba(20,10,5,${a}))`;
    const D=1500;
    const a=page.animate([
      { transform:T(0,0,0,0),                         filter:sh(0,2,3,0.2), offset:0 },
      { transform:T(out*1,-2,out*0.5,0),              filter:sh(out*1,3,4,0.25), offset:0.08, easing:'ease-out' },    // first tug
      { transform:T(0,0,out*0.2,0),                   filter:sh(0,2,3,0.2), offset:0.13, easing:'ease-in' },
      { transform:T(out*2,-3,out*2.4,out*-6,8),       filter:sh(out*4,6,7,0.3), offset:0.3 },                         // ripping down…
      { transform:T(out*4,-5,out*5.5,out*-14,16),     filter:sh(out*8,10,10,0.34), offset:0.5 },
      { transform:T(out*7,-6,out*8,out*-20,22),       filter:sh(out*12,14,13,0.38), offset:0.6, easing:'cubic-bezier(.5,0,.9,.6)' }, // …and free
      { transform:T(out*w*0.45,h*0.28,out*17,out*-26,30), filter:sh(out*16,22,16,0.36), opacity:1, offset:0.84 },
      { transform:T(out*w*0.8,h*0.52,out*27,out*-34,30),  filter:sh(out*16,26,18,0), opacity:0, offset:1 }
    ], {duration:D, fill:'forwards'});
    stub.animate([
      { transform:'rotate(0deg)', opacity:1, offset:0 },
      { transform:`rotate(${-out*0.35}deg)`, offset:0.08 },                      // the binding pulls back
      { transform:'rotate(0deg)', offset:0.16 },
      { transform:`rotate(${-out*0.25}deg)`, offset:0.6 },                       // a last tug as it gives way
      { transform:'rotate(0deg)', opacity:1, offset:0.7 },
      { transform:'translateY(4px)', opacity:0, offset:1 }
    ], {duration:D, easing:'ease-out', fill:'forwards'});
    // as the paper curls up off the book, its torn side catches a little shadow
    const shade=makeDiv('tear-shade'); shade.style.background=`linear-gradient(${bindLeft?90:270}deg, rgba(40,22,10,0.42), rgba(40,22,10,0) 45%)`;
    shade.style.clipPath=page.querySelector('.recipe-card').style.clipPath; page.appendChild(shade);
    shade.animate([{opacity:0}, {opacity:0, offset:0.12}, {opacity:0.7, offset:0.5}, {opacity:0.5, offset:0.7}, {opacity:0.2}], {duration:D, fill:'forwards'});
    // little scraps of paper fall from the torn edge as it gives way
    for(let i=0;i<6;i++){
      const pt=pts[Math.floor((0.15+0.7*Math.random())*pts.length)], bit=makeDiv('tear-bit');
      const sz=3+Math.random()*4;
      Object.assign(bit.style,{left:(pt[0]-sz/2)+'px', top:pt[1]+'px', width:sz+'px', height:(sz*0.7)+'px'});
      layer.appendChild(bit);
      bit.animate([{transform:'translate(0,0) rotate(0)', opacity:0}, {opacity:1, offset:0.15},
                   {transform:`translate(${out*(6+Math.random()*20)}px,${30+Math.random()*60}px) rotate(${(Math.random()*2-1)*200}deg)`, opacity:0}],
                  {duration:900+Math.random()*400, delay:250+Math.random()*600, easing:'cubic-bezier(.3,.1,.6,1)', fill:'both'});
    }
    a.finished.then(()=>layer.remove()).catch(()=>layer.remove());
  };
}
async function deleteRecipeCloud(recipe){
  try{
    const { error } = await supabaseClient.from('recipes').delete().eq('id', recipe._cloudId).eq('user_id', S.user.id);
    if(error) throw error;
  } catch(e){ console.warn('Could not remove the recipe from Supabase:', e); }
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
const drinkLabel = k => DRINKS[k]?.label || baseNames[k] || k;
// The cover reads "Selena's Recipe Book" (or "My Recipe Book" before signing in).
function setCoverOwner(){
  const el=document.getElementById('cover-byline-name'); if(!el) return;
  const name=(S.user ? displayNameOf() : '').trim();
  const text = name ? (/s$/i.test(name) ? name+'\u2019' : name+'\u2019s') : 'My';
  el.textContent=text;
  el.parentElement.classList.toggle('long', text.length>11);
  el.parentElement.classList.toggle('xlong', text.length>17);
}
function toRoman(n){
  const t=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let out=''; for(const [v,r] of t) while(n>=v){ out+=r; n-=v; } return out || 'I';
}
function refreshRecipeTools(list){
  const subjectSel=document.getElementById('filter-subject');
  const sortSel=document.getElementById('sort-select');
  const raw=recipeListRaw();
  if(subjectSel){
    const current=subjectSel.value;
    const subjects=[...new Set(raw.map(r=>r.subject).filter(Boolean))].sort();
    subjectSel.innerHTML='<option value="">All subjects</option>'+subjects.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
    subjectSel.value=subjects.includes(current)?current:'';
  }
  if(sortSel) sortSel.value = S.recipeSort;
  const drinkSel=document.getElementById('filter-drink');
  if(drinkSel){
    // the drinks actually in this book, most brewed first
    const counts={};
    raw.forEach(r=>{ const k=r.drink||r.base; if(k) counts[k]=(counts[k]||0)+1; });
    const drinks=Object.keys(counts).sort((a,b)=>counts[b]-counts[a] || drinkLabel(a).localeCompare(drinkLabel(b)));
    const favs=raw.filter(r=>r.favorite).length;
    drinkSel.innerHTML = `<option value="all">All drinks</option><option value="favorites">Favourites only (${favs})</option>`
      + (drinks.length ? `<optgroup label="Drinks">${drinks.map(k=>`<option value="${esc(k)}">${esc(drinkLabel(k))} (${counts[k]})</option>`).join('')}</optgroup>` : '');
    if(S.quickTab!=='all' && S.quickTab!=='favorites' && !counts[S.quickTab]) S.quickTab='all';
    drinkSel.value = S.quickTab;
  }
  const filtering = !!(S.recipeSearch || S.recipeSubject || S.quickTab!=='all');
  const countEl=document.getElementById('ri-count');
  if(countEl) countEl.textContent = !raw.length ? (S.recipeTab==='mine' ? 'Your book is waiting for its first recipe' : 'No shared brews yet')
    : filtering ? `${list.length} of ${raw.length} recipe${raw.length===1?'':'s'} match` : `${raw.length} recipe${raw.length===1?'':'s'} in this book`;
  const clr=document.getElementById('ri-clear'); if(clr) clr.hidden=!filtering;
}

// Recipe cards now show a full-sized, accurate cup that mirrors exactly
// what was brewed (same cup shape, base, drink and add-ons), rendered
// bigger and steaming gently so it feels alive on the page.
// Phones show one page at a time (a single-page book); wider screens show
// a two-page spread.
const PHONE_BOOK_MQ = window.matchMedia ? window.matchMedia('(max-width:700px)') : null;
function pagesPerSpread(){ return PHONE_BOOK_MQ && PHONE_BOOK_MQ.matches ? 1 : 2; }
if(PHONE_BOOK_MQ){
  const relayout=()=>{ const v=document.getElementById('book-open-view'); if(v && v.style.display==='block') renderRecipes(); };
  if(PHONE_BOOK_MQ.addEventListener) PHONE_BOOK_MQ.addEventListener('change', relayout);
  else if(PHONE_BOOK_MQ.addListener) PHONE_BOOK_MQ.addListener(relayout);
}

function renderRecipes(){
  const grid=document.getElementById('recipe-grid');
  const list = filteredRecipes();
  refreshRecipeTools(list);
  const prevBtn=document.getElementById('page-prev');
  const nextBtn=document.getElementById('page-next');
  const pageCount=document.getElementById('page-count');
  if(!list.length){
    grid.innerHTML=`<div class="recipe-card empty-state"><p>${S.recipeTab==='mine'?'No recipes yet — brew your first session':'No shared brews yet — join a study table to create one together'}</p><div class="rc-note">Blank pages are waiting for the next warm memory.</div></div>`
      + (pagesPerSpread()===2 ? `<div class="recipe-card empty-state"><p>Open the Brew page, finish a session, and this journal will begin to fill.</p></div>` : '');
    if(prevBtn) prevBtn.disabled=true;
    if(nextBtn) nextBtn.disabled=true;
    if(pageCount) pageCount.textContent='blank journal';
    return;
  }
  const per=pagesPerSpread();
  const maxPage=Math.max(0, Math.ceil(list.length/per)-1);
  S.recipePage=Math.min(S.recipePage,maxPage);
  const spread=list.slice(S.recipePage*per,S.recipePage*per+per);
  grid.innerHTML = spread.map((r,i)=>{
    const drinkKey=r.drink||r.base;
    const drinkLabel=DRINKS[drinkKey]?.label||baseNames[r.base]||'Custom Brew';
    // the cup it was actually brewed in, painted as on the Brew page
    const fullCup=buildCupSVG({size:104,fillFraction:1,steam:true,cup:r.cup||'glass',base:r.base,drink:drinkKey,addons:r.addons||[]});
    const ings=[drinkLabel,...(r.addons||[]).filter(a=>a!=='ice').map(a=>addonNames[a]||a)];
    const pageNo=S.recipePage*per+i+1;
    const row=(k,v)=>`<div class="rc-row"><dt>${k}</dt><dd>${v}</dd></div>`;
    return `<div class="recipe-card ${r.favorite?'favorite-page':''}" data-rid="${esc(r.id)}" onclick="changeRecipePage(${per===1||i===1?1:-1})">
      ${r.shared?'<div class="rc-badge">shared brew</div>':''}
      <div class="rc-kicker">Recipe No. ${toRoman(pageNo)}</div>
      <div class="rc-name">${esc(r.name)}</div>
      <div class="rc-sub">a ${esc(drinkLabel)}${r.subject?`, brewed for ${esc(r.subject)}`:''}</div>
      <div class="rc-vignette" aria-hidden="true">${fullCup}</div>
      <div class="rc-sec"><h4 class="rc-h"><span>I.</span>In the cup</h4>
        <ul class="rc-ings">${ings.slice(0,4).map(x=>`<li>${esc(x)}</li>`).join('')}${ings.length>4?`<li class="rc-more">+ ${ings.length-4} more</li>`:''}</ul>
      </div>
      <div class="rc-sec"><h4 class="rc-h"><span>II.</span>The session</h4>
        <dl class="rc-ledger">
          ${row('Subject', esc(r.subject||'—'))}
          ${r.task?row('Task', esc(r.task)):''}
          ${row('Steeped', `${r.duration} min · ${esc(r.date||'')}`)}
          ${r.username?row('Brewed by', esc(r.username)):''}
        </dl>
      </div>
      <div class="rc-note">The cup kept time, and the page kept the feeling.</div>
      <div class="rc-foot">
        <span class="rc-folio">— ${pageNo} —</span>
        <button class="rc-del" onclick="askDeleteRecipe('${r.id}',event)" title="Tear out this page" aria-label="Delete this recipe"><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M4.5 5.5h11M8 5.5V4h4v1.5M6 5.5l.8 10.5h6.4l.8-10.5M8.6 8.4v5M11.4 8.4v5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="fav-btn ${r.favorite?'':'off'}" onclick="toggleFavorite('${r.id}',event)" title="${r.favorite?'Remove from favourites':'Add to favourites'}" aria-label="Favourite recipe" aria-pressed="${!!r.favorite}"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M10 2.2l2.3 5 5.4.5-4.1 3.6 1.2 5.3L10 13.9l-4.8 2.7 1.2-5.3-4.1-3.6 5.4-.5z" fill="currentColor" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round"/></svg></button>
      </div>
    </div>`;
  }).join('');
  if(spread.length===1 && per===2){
    grid.innerHTML += `<div class="recipe-card empty-state"><div class="rc-orn" aria-hidden="true">&#10086;</div><p>This side of the spread is still untouched.</p><div class="rc-note">A future recipe belongs here.</div></div>`;
  }
  if(prevBtn) prevBtn.disabled=S.recipePage===0;
  if(nextBtn) nextBtn.disabled=S.recipePage>=maxPage;
  if(pageCount) pageCount.textContent=`${per===1?'page':'spread'} ${S.recipePage+1} of ${maxPage+1}`;
}

// ── Realistic 3D page-flip animation ────────────────────────────────────
// Only one leaf turns, hinged at the spine, the way a real page does. The
// leaf is built from a few nested vertical strips so it can curl: the outer
// edge leads as the page lifts, then trails as it falls flat on the other
// side. Light falls off the turning paper, and it casts a soft shadow on
// the page it uncovers and on the page it lands on.
let flippingPage=false;
const FLIP_MS=1150;
const FLIP_STRIPS=5;

// A detached copy of a page, pinned to an exact size so it can be clipped
// into strips without reflowing.
// Gives every id inside a copied element a fresh name, and points the copy's
// own references (e.g. the cup's clip-path="url(#…)") at the renamed ids.
// Stripping ids instead would break those references — the liquid would
// lose its glass-shaped clip and show as a plain rectangle mid-animation.
let cloneIdSeq=0;
function uniquifyIds(root){
  const map={}; const n=++cloneIdSeq;
  root.querySelectorAll('[id]').forEach(el=>{ const nid=`${el.id}-k${n}`; map[el.id]=nid; el.id=nid; });
  if(!n || !Object.keys(map).length) return;
  root.querySelectorAll('*').forEach(el=>{
    for(const at of [...el.attributes]){
      let v=at.value;
      if(v.includes('url(#')) v=v.replace(/url\(#([^)]+)\)/g,(m,id)=>map[id]?`url(#${map[id]})`:m);
      if((at.name==='href'||at.name==='xlink:href') && v.startsWith('#') && map[v.slice(1)]) v='#'+map[v.slice(1)];
      if(v!==at.value) el.setAttribute(at.name, v);
    }
  });
}
function paperClone(card, w, h, left){
  const c=card.cloneNode(true);
  ['id','onclick','onkeydown','tabindex','role'].forEach(a=>c.removeAttribute(a));
  uniquifyIds(c);
  Object.assign(c.style,{position:'absolute', top:'0', left:(left||0)+'px', width:w+'px', height:h+'px',
    minHeight:'0', margin:'0', transform:'none', transition:'none', boxSizing:'border-box',
    display:'', visibility:'', filter:'none', transformStyle:'flat'});
  return c;
}
function placeEl(el, x, y, w, h){
  Object.assign(el.style,{left:x+'px', top:y+'px', width:w+'px', height:h+'px'});
  return el;
}
function makeDiv(cls){ const d=document.createElement('div'); d.className=cls; return d; }

// Builds a turnable leaf hinged at x = hinge, made of nested vertical strips
// so it can bend. dir>0 turns right-to-left (hinge on the leaf's left edge),
// dir<0 turns left-to-right. `gap` is the space between the two pages at the
// spine; the leaf spans half of it so the page lands exactly in place.
// A point d px from the spine on the front lands d px from the spine on the
// other side, so the back face shows its page mirrored across the spine.
function buildCurlLeaf({hinge, y, W, H, gap=0, dir, front, back, frontW=W, backW=W}){
  const leafW = W + gap/2;
  const s = leafW / FLIP_STRIPS;
  const leaf = placeEl(makeDiv('flip-leaf'), dir>0 ? hinge : hinge-leafW, y, leafW, H);
  leaf.style.transformOrigin = dir>0 ? 'left center' : 'right center';

  const offNear = i => gap/2 - i*s;            // page lying beside the spine on the leaf's own side
  const offFar  = i => -(leafW - (i+1)*s);     // page mirrored across the spine
  const frontOff = dir>0 ? offNear : offFar;
  const backOff  = dir>0 ? offFar  : offNear;

  const strips=[], shades=[];
  let parent = leaf;
  for(let i=0;i<FLIP_STRIPS;i++){
    const strip = makeDiv('flip-strip');
    strip.style.width = (s+0.6)+'px'; // hair of overlap hides seams between strips
    if(dir>0){ strip.style.left = (i===0 ? 0 : s)+'px'; strip.style.transformOrigin='left center'; }
    else     { strip.style.left = (i===0 ? leafW-s : -s)+'px'; strip.style.transformOrigin='right center'; }

    const frontFace = makeDiv('flip-face');
    frontFace.appendChild(paperClone(front, frontW, H, frontOff(i)));
    const backFace = makeDiv('flip-face flip-face-back');
    backFace.appendChild(paperClone(back, backW, H, backOff(i)));

    // Shading deepens smoothly toward the outer edge, where the paper curls
    // most. Each face gets a gradient spanning its own slice so neighbouring
    // strips blend without visible bands. d0/d1 = distance from the spine at
    // the face's local left/right edge (back faces are mirrored).
    const near=i*s, far=(i+1)*s;
    const faces = [[frontFace, dir>0 ? [near,far] : [far,near]], [backFace, dir>0 ? [far,near] : [near,far]]];
    faces.forEach(([face,[d0,d1]])=>{
      const shade = makeDiv('flip-shade');
      const a = d => (0.5 + 0.5*d/leafW).toFixed(3);
      shade.style.background = `linear-gradient(to right, rgba(42,22,10,${a(d0)}), rgba(42,22,10,${a(d1)}))`;
      face.appendChild(shade);
      shades.push(shade);
    });
    strip.append(frontFace, backFace);
    parent.appendChild(strip);
    strips.push(strip);
    parent = strip;
  }
  return {leaf, strips, shades};
}

// Animates a curl leaf through its turn. Returns every animation, the main
// rotation first. `angle` < 180 with `fadeEl` lets a leaf swing partway and
// fade out (used where there's no room for it to lie flat). The fade must go
// on a wrapper, never the leaf: animating opacity on a preserve-3d element
// flattens it in Chrome, and the back faces stop rendering.
function animateCurl({leaf, strips, shades}, {dir, duration, angle=180, fadeEl=null, lift=28}){
  const anims=[];
  anims.push(leaf.animate([
    {transform:'rotateY(0deg)'},
    {transform:`rotateY(${-dir*lift}deg)`, offset:0.22, easing:'cubic-bezier(0.4,0,0.6,1)'},
    {transform:`rotateY(${-dir*angle}deg)`}
  ], {duration, easing:'cubic-bezier(0.55,0.06,0.3,1)', fill:'both'}));
  if(fadeEl) anims.push(fadeEl.animate([{opacity:1},{opacity:1, offset:0.7},{opacity:0}], {duration, fill:'both'}));

  // Curl: the outer edge leads while lifting, then trails as it falls flat.
  strips.forEach((strip,i)=>{
    if(i===0) return;
    const b = 7 + i*1.5;
    anims.push(strip.animate([
      {transform:'rotateY(0deg)'},
      {transform:`rotateY(${-dir*b}deg)`, offset:0.25},
      {transform:`rotateY(${-dir*b*0.35}deg)`, offset:0.5},
      {transform:`rotateY(${dir*b*0.8}deg)`, offset:0.78},
      {transform:'rotateY(0deg)'}
    ], {duration, easing:'ease-in-out', fill:'both'}));
  });

  // Paper darkens as it turns edge-on to the light, brightens as it lies flat.
  shades.forEach(el=>{
    anims.push(el.animate([
      {opacity:0},
      {opacity:0.42, offset:0.5},
      {opacity:0.08, offset:0.85},
      {opacity:0}
    ], {duration, easing:'linear', fill:'both'}));
  });
  return anims;
}

function changeRecipePage(delta){
  if(flippingPage) return;
  const list = filteredRecipes();
  const maxPage=Math.max(0, Math.ceil(list.length/pagesPerSpread())-1);
  const next=Math.max(0, Math.min(maxPage, S.recipePage+delta));
  if(next===S.recipePage) return;

  const shell = document.querySelector('.flipbook-shell');
  const grid = document.getElementById('recipe-grid');
  const oldCards=[...(grid?.children||[])];
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!shell || !grid || !oldCards.length || reduceMotion || !Element.prototype.animate){
    S.recipePage=next; renderRecipes(); playPageSound('turn'); return;
  }

  flippingPage = true;
  playPageSound('turn');

  // Measure the current spread with layout offsets (not bounding rects) so
  // the book's slight tilt doesn't skew the numbers.
  const gx=grid.offsetLeft, gy=grid.offsetTop;
  const rect=c=>({x:gx+c.offsetLeft, y:gy+c.offsetTop, w:c.offsetWidth, h:c.offsetHeight});
  const oldRects=oldCards.map(rect);
  const oldGrid={x:gx, y:gy, w:grid.offsetWidth, h:grid.offsetHeight};
  const frontCards=oldCards.map(c=>c.cloneNode(true));

  S.recipePage = next;
  renderRecipes();
  const newCards=[...grid.children];
  const dir = delta>0 ? 1 : -1;
  if(oldCards.length===1 && newCards.length===1){
    flipSinglePage(shell, frontCards[0], newCards[0], oldRects[0], dir)
      .catch(()=>{}).then(()=>{ flippingPage=false; });
    return;
  }
  const stacked = oldRects.length<2 || oldRects[1].y >= oldRects[0].y + oldRects[0].h - 1;

  const run = stacked
    ? flipStackedPage(shell, frontCards, oldGrid, dir)
    : flipSpreadLeaf(shell, frontCards, newCards, oldRects, newCards.map(rect), dir);
  run.catch(()=>{}).then(()=>{ flippingPage=false; });
}

function flipSpreadLeaf(shell, oldCards, newCards, oldRects, newRects, dir){
  const [L, R] = oldRects;
  const W = R.w;
  const H = Math.max(L.h, R.h, newRects[0]?.h||0, newRects[1]?.h||0);
  const top = Math.min(L.y, R.y);
  const gap = Math.max(0, R.x - (L.x + L.w));
  const hinge = L.x + L.w + gap/2;

  const stage = makeDiv('page-flip-stage');
  stage.style.perspectiveOrigin = `${hinge}px ${top + H/2}px`;

  // The page that stays put keeps showing the old content until the leaf
  // lands on it (underneath, the grid already holds the new spread).
  const stayRect = dir>0 ? L : R;
  const stay = placeEl(makeDiv('flip-static'), stayRect.x, top, stayRect.w, H);
  stay.appendChild(paperClone(oldCards[dir>0?0:1], stayRect.w, H));
  stage.appendChild(stay);

  // Shadow the lifting leaf throws onto the page it uncovers…
  const turnRect = dir>0 ? R : L;
  const castShadow = placeEl(makeDiv('flip-cast-shadow'), turnRect.x, top, turnRect.w, H);
  castShadow.style.background = `linear-gradient(to ${dir>0?'right':'left'}, rgba(25,12,4,0.55), rgba(25,12,4,0.18) 35%, rgba(25,12,4,0) 75%)`;
  stage.appendChild(castShadow);
  // …and onto the page it's about to settle on.
  const landShadow = placeEl(makeDiv('flip-cast-shadow'), stayRect.x, top, stayRect.w, H);
  landShadow.style.background = `linear-gradient(to ${dir>0?'left':'right'}, rgba(25,12,4,0.5), rgba(25,12,4,0.12) 45%, rgba(25,12,4,0) 85%)`;
  stage.appendChild(landShadow);

  // The leaf: hinged at the spine, built from nested strips so it can bend.
  const parts = buildCurlLeaf({hinge, y:top, W, H, gap, dir,
    front: oldCards[dir>0?1:0], back: newCards[dir>0?0:1]});
  stage.appendChild(parts.leaf);
  shell.appendChild(stage);

  const anims = animateCurl(parts, {dir, duration:FLIP_MS});
  castShadow.animate([
    {opacity:0}, {opacity:1, offset:0.2}, {opacity:0.55, offset:0.5}, {opacity:0}
  ], {duration:FLIP_MS*0.8, easing:'ease-out', fill:'forwards'});
  landShadow.animate([
    {opacity:0}, {opacity:0, offset:0.5}, {opacity:0.9, offset:0.82}, {opacity:0}
  ], {duration:FLIP_MS, easing:'ease-in', fill:'forwards'});

  return anims[0].finished.then(()=>stage.remove(), ()=>stage.remove());
}

// Phone (single-page book): turning forward, the page curls up from the
// spine and over to the left, off the edge of the book; turning back, the
// previous page curls in from the left and settles on top.
function flipSinglePage(shell, oldCard, newCard, r, dir){
  const stage = makeDiv('page-flip-stage');
  stage.style.perspectiveOrigin = `${r.x}px ${r.y + r.h/2}px`;
  const fader = makeDiv('flip-fader');
  fader.style.perspectiveOrigin = stage.style.perspectiveOrigin;
  const paperBack = makeDiv('recipe-card flip-paper-back');
  const turning = dir>0 ? oldCard : newCard;
  const parts = buildCurlLeaf({hinge:r.x, y:r.y, W:r.w, H:r.h, gap:0, dir:1, front:turning, back:paperBack});
  if(dir<0){
    // Keep the current page showing underneath until the previous one lands.
    const stay = placeEl(makeDiv('flip-static'), r.x, r.y, r.w, r.h);
    stay.appendChild(paperClone(oldCard, r.w, r.h));
    stage.appendChild(stay);
  }
  const cast = placeEl(makeDiv('flip-cast-shadow'), r.x, r.y, r.w, r.h);
  cast.style.background = 'linear-gradient(to right, rgba(25,12,4,0.5), rgba(25,12,4,0.15) 40%, rgba(25,12,4,0) 80%)';
  fader.appendChild(parts.leaf);
  stage.append(cast, fader);
  shell.appendChild(stage);
  const anims = animateCurl(parts, {dir:1, duration:FLIP_MS, fadeEl:fader});
  anims.push(cast.animate([{opacity:0},{opacity:1, offset:0.25},{opacity:0.4, offset:0.6},{opacity:0}],
    {duration:FLIP_MS, easing:'ease-out', fill:'both'}));
  if(dir<0) anims.forEach(a=>{ a.pause(); a.currentTime=FLIP_MS; a.playbackRate=-1; a.play(); });
  return anims[0].finished.then(()=>stage.remove(), ()=>stage.remove());
}

// Phone layout: the spread is stacked, so the whole sheet peels away from
// one edge, revealing the next spread beneath it.
function flipStackedPage(shell, oldCards, g, dir){
  const stage = makeDiv('page-flip-stage');
  stage.style.perspectiveOrigin = `${dir>0 ? g.x : g.x+g.w}px ${g.y + g.h/2}px`;
  const sheet = placeEl(makeDiv('flip-leaf flip-sheet'), g.x, g.y, g.w, g.h);
  sheet.style.transformOrigin = dir>0 ? 'left center' : 'right center';
  const inner = makeDiv('recipe-grid');
  Object.assign(inner.style,{position:'absolute', inset:'0', minHeight:'0'});
  oldCards.forEach(c=>{ c.removeAttribute('onclick'); inner.appendChild(c); });
  const shade = makeDiv('flip-shade');
  sheet.append(inner, shade);
  stage.appendChild(sheet);
  shell.appendChild(stage);
  const a = sheet.animate([
    {transform:'rotateY(0deg)', opacity:1},
    {transform:`rotateY(${-dir*70}deg)`, opacity:1, offset:0.7},
    {transform:`rotateY(${-dir*105}deg)`, opacity:0}
  ], {duration:FLIP_MS*0.8, easing:'cubic-bezier(0.5,0.05,0.4,1)', fill:'forwards'});
  shade.animate([{opacity:0},{opacity:0.45}], {duration:FLIP_MS*0.8, fill:'forwards'});
  return a.finished.then(()=>stage.remove(), ()=>stage.remove());
}

// ── Profile page (The Brew & Focus Gazette) ─────────────────────────────
// Your name, username and picture, plus a front page of your study year
// drawn from your recipe book. Saved through supabase/profiles.sql.
S.profile = null;   // { username, display_name, avatar_url, joined }
const USERNAME_RULE = /^[A-Za-z0-9._-]{2,24}$/;
const displayNameOf = () => S.profile?.display_name || S.user?.username || (S.user?.email||'').split('@')[0] || 'Friend';

function profileErrorText(e){
  const m=String(e?.message||e);
  if(/schema cache|does not exist|Could not find the function|get_my_profile|set_my_profile|set_my_avatar|Bucket not found/i.test(m))
    return 'Profile editing needs a one-time database update (supabase/profiles.sql).';
  return m;
}

// Read your profile after signing in; keeps the nav and café name in step.
async function loadMyProfile(){
  if(!supabaseClient || !S.user) return;
  try{
    const { data, error } = await supabaseClient.rpc('get_my_profile');
    if(error) throw error;
    S.profile = data || null;
    if(S.profile?.username) S.user.username = S.profile.username;
    // a character chosen before the database could store one lives in your account details
    if(S.profile && !S.profile.look && S.user.meta?.look) S.profile.look = S.user.meta.look;
  } catch(e){ S.profile = null; console.warn('Profile not loaded:', e.message||e); }
}

// ── The Character Studio ──
let charDraft=null;
const myLook = () => normalizeChar(S.profile?.look || S.user?.meta?.look || defaultCharFor(S.user?.id));
function renderCharSticker(){
  const el=document.getElementById('gz-char-sticker'); if(!el || !S.user) return;
  el.innerHTML = characterSVG(myLook(), {title:'Your café character'}) + '<span class="gz-char-cap">At the café</span>';
}
function openCharStudio(){
  if(!S.user){ openAuthModal('signin'); return; }
  document.getElementById('gz-char-sticker')?.classList.add('lit');   // colour comes in once tapped
  charDraft = myLook();
  document.getElementById('char-msg').textContent='';
  renderCharStudio();
  document.getElementById('char-modal').classList.add('open');
}
function closeCharStudio(e){ if(!e || e.target===document.getElementById('char-modal')){ document.getElementById('char-modal').classList.remove('open'); document.getElementById('gz-char-sticker')?.classList.remove('lit'); } }
const CHAR_ROWS = [
  ['animal','Animal','animal'], ['fur','Fur','fur'], ['face','Expression','face'], ['glasses','Spectacles','glasses'],
  ['hat','On the head','hat'], ['hatColor','Its colour','color'], ['outfit','Wearing','outfit'], ['outfitColor','Its colour','color'],
];
function sameChar(a,b){ return Object.keys(CHAR_KEYS).every(k=>a[k]===b[k] || (k==='hatColor' && a.hat===b.hat && ['none','boater','flower'].includes(a.hat))); }
function renderCharStudio(){
  const d=charDraft;
  document.getElementById('char-preview').innerHTML = characterSVG(d, {title:'Your café character', pose:'stand'});
  document.getElementById('char-presets').innerHTML = CHAR_PRESETS.map((c,i)=>{
    const n=normalizeChar(c);
    return `<button type="button" class="char-preset ${sameChar(n,d)?'sel':''}" onclick="pickCharPreset(${i})" aria-label="Character ${i+1}">${characterSVG(n)}</button>`;
  }).join('');
  document.getElementById('char-opts').innerHTML = CHAR_ROWS.map(([key,label,group])=>{
    if(key==='hatColor' && ['none','boater','flower'].includes(d.hat)) return '';
    const opts=Object.entries(CHAR[group]);
    const swatch = group==='fur' || group==='color';
    return `<div class="char-row"><span class="char-label">${label}</span><div class="char-chips">${opts.map(([v,val])=>{
      const on=d[key]===v;
      if(swatch){
        const col=Array.isArray(val)?val[0]:val;
        const nice=v.charAt(0).toUpperCase()+v.slice(1);
        return `<button type="button" class="char-sw ${on?'sel':''}" style="--sw:${col}" onclick="setCharOpt('${key}','${v}')" title="${nice}" aria-label="${label}: ${nice}" aria-pressed="${on}"></button>`;
      }
      return `<button type="button" class="char-chip ${on?'sel':''}" onclick="setCharOpt('${key}','${v}')" aria-pressed="${on}">${val}</button>`;
    }).join('')}</div></div>`;
  }).join('');
}
function setCharOpt(k,v){ if(!charDraft) return; charDraft=normalizeChar({...charDraft, [k]:v}); renderCharStudio(); }
function pickCharPreset(i){ charDraft=normalizeChar(CHAR_PRESETS[i]); renderCharStudio(); }
function shuffleChar(){
  const pick=g=>{ const k=Object.keys(CHAR[g]); return k[Math.floor(Math.random()*k.length)]; };
  const c={}; for(const [k,g] of Object.entries(CHAR_KEYS)) c[k]=pick(g);
  if(Math.random()<0.4) c.hat='none'; if(Math.random()<0.65) c.glasses='none';
  charDraft=normalizeChar(c); renderCharStudio();
}
async function saveChar(){
  if(!S.user || !charDraft) return;
  const btn=document.getElementById('char-save'), msg=document.getElementById('char-msg');
  const look={...charDraft}; if(['none','boater','flower'].includes(look.hat)) delete look.hatColor;
  btn.disabled=true; msg.textContent='Saving…'; msg.className='char-msg';
  let stored=false;
  try{
    const { data, error } = await supabaseClient.rpc('set_my_character', { p_character: look });
    if(error) throw error;
    stored = data==='ok';
  } catch(e){ console.warn('Character not stored in profile:', e.message||e); }
  // keep a copy in your account too, so it survives even if the café database is behind
  try{ await supabaseClient.auth.updateUser({ data:{ look } }); S.user.meta={...(S.user.meta||{}), look}; } catch(e){}
  S.profile={...(S.profile||{}), look};
  btn.disabled=false;
  renderCharSticker();
  if(S.room?.cafe){ attachPeople(S.room.cafe.members).then(()=>renderSeats(true)); }
  if(stored){ msg.textContent=''; closeCharStudio(); showToast('Your character has taken their seat'); }
  else { msg.textContent='Saved on this account. Friends will see it once the café database is updated (supabase/profiles.sql).'; msg.className='char-msg warn'; }
}

function renderProfilePage(){
  const signedIn=!!S.user;
  document.getElementById('gz-signedout').hidden = signedIn;
  document.getElementById('gz-grid').hidden = !signedIn;
  const now=new Date();
  document.getElementById('gz-date').textContent = now.toLocaleDateString('en-GB',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
  if(!signedIn) return;
  const p=S.profile||{};
  const username=p.username || S.user.username || '';
  document.getElementById('gz-name').textContent = displayNameOf();
  document.getElementById('gz-handle').textContent = username;
  renderCharSticker();
  // the portrait
  const img=document.getElementById('gz-avatar');
  const empty=document.getElementById('gz-avatar-empty');
  if(p.avatar_url){ img.src=p.avatar_url; img.hidden=false; empty.hidden=true; } else { img.removeAttribute('src'); img.hidden=true; empty.hidden=false; }
  document.getElementById('gz-remove-photo').hidden = !p.avatar_url;
  // member since
  const joined = p.joined ? new Date(p.joined) : now;
  document.getElementById('gz-since-year').textContent = joined.getFullYear();
  document.getElementById('gz-since-text').textContent =
    `Joined the café on ${joined.toLocaleDateString('en-GB',{day:'numeric', month:'long', year:'numeric'})}, and has been brewing ever since.`;
  document.getElementById('gz-est').textContent = joined.getFullYear();
  // the study year, from the recipe book
  const all=[...(S.recipes||[]), ...(S.sharedRecipes||[])];
  const minutes=all.reduce((n,r)=>n+(Number(r.duration)||0),0);
  document.getElementById('gz-hours').textContent = minutes>=60 ? (minutes/60).toFixed(minutes<600?1:0) : minutes;
  document.getElementById('gz-hours-unit').textContent = minutes>=60 ? 'hours' : 'minutes';
  document.getElementById('gz-hours-text').textContent = all.length
    ? `Across ${all.length} session${all.length===1?'':'s'}, ${all.length===1?'one cup':'cup after cup'}, the pages kept turning.`
    : 'No sessions on record yet — the first cup is still waiting to be brewed.';
  document.getElementById('gz-volume').textContent = `Vol. I · No. ${all.length+1}`;
  const tally=(key)=>{ const m=new Map(); all.forEach(r=>{ const k=key(r); if(k) m.set(k,(m.get(k)||0)+1); }); return [...m.entries()].sort((a,b)=>b[1]-a[1]); };
  const topDrink=tally(r=>r.drink||r.base)[0];
  const topEl=document.getElementById('gz-topbrew');
  if(topDrink){
    const key=topDrink[0], d=DRINKS[key]||{};
    const sample=all.find(r=>(r.drink||r.base)===key)||{};
    topEl.innerHTML = `<div class="gz-cup">${buildCupSVG({size:120, fillFraction:1, steam:false, cup:'glass', base:sample.base||d.base||'coffee', drink:key, addons:sample.addons||d.addons||[]})}</div>
      <div class="gz-topbrew-name">${esc(d.label || baseNames[key] || key)}</div>
      <div class="gz-small">brewed ${topDrink[1]} time${topDrink[1]===1?'':'s'}</div>`;
  } else {
    topEl.innerHTML = `<div class="gz-small gz-center">To be announced — brew your first cup to claim the title.</div>`;
  }
  const subjects=tally(r=>r.subject && r.subject!=='General Study' ? r.subject : null).slice(0,5);
  document.getElementById('gz-subjects').innerHTML = subjects.length
    ? subjects.map(([s])=>`<li>${esc(s)}</li>`).join('')
    : `<li class="gz-small">Yet to be written</li>`;
  const recent=[...all].sort((a,b)=>(b._ts||b.id||0)-(a._ts||a.id||0)).slice(0,3);
  document.getElementById('gz-recent').innerHTML = recent.length
    ? recent.map(r=>`<article><h4>${esc(r.name||'Untitled Brew')}</h4><p>${esc(r.subject||'')}${r.task?` — ${esc(r.task)}`:''}. ${Number(r.duration)||0} minutes${r.shared?' at a shared table':''}.</p><span class="gz-dateline-small">${esc(r.date||'')}</span></article>`).join('')
    : `<p class="gz-small">The presses are quiet. Finish a study session and the first story will run here.</p>`;
  document.getElementById('gz-member-no').textContent = 'No. ' + String(gzHash(S.user.id||'') % 10000).padStart(4,'0');
  const monthStart=new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonth=all.filter(r=>Number(r._ts||r.id)>=monthStart);
  const monthMin=thisMonth.reduce((n,r)=>n+(Number(r.duration)||0),0);
  document.getElementById('gz-month').innerHTML = `<b>${now.toLocaleDateString('en-GB',{month:'long'})}:</b> ${thisMonth.length} session${thisMonth.length===1?'':'s'}, ${monthMin} minutes.`;
  renderGazetteExtras(all);
  fillExtras();
  // the edit form
  const n=document.getElementById('gz-in-name'), u=document.getElementById('gz-in-username');
  if(document.activeElement!==n) n.value = p.display_name || '';
  if(document.activeElement!==u) u.value = username;
  n.placeholder = username || 'Your name';
}

// ── More of the Gazette: stories and columns written from your recipe book ──
const GZ_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const GZ_AMBIENCE = { 'cozy-cafe':'Cozy Café', 'rainy-bookstore':'Rainy Bookstore', 'vintage-library':'Vintage Library', 'fireplace':'Fireplace Reading Room',
  'midnight-cafe':'Midnight Café', 'kyoto-tea':'Kyoto Tea House', 'autumn-coffee':'Autumn Coffee Shop', 'forest-cabin':'Forest Cabin', 'ocean-waves':'Ocean Waves', 'white-noise':'White Noise' };
const GZ_WEATHER = {
  'cozy-cafe':      ['Warm and steamy', 'Clear skies over the counter, with a light drizzle of milk foam by afternoon.', 21],
  'rainy-bookstore':['Steady rain', 'Showers against the shop window all day. Ideal reading conditions; umbrellas optional.', 14],
  'vintage-library':['Still and hushed', 'Calm air between the stacks, with scattered turning of pages.', 18],
  'fireplace':      ['Crackling and cosy', 'A warm front from the hearth; outlook settled into the evening.', 23],
  'midnight-cafe':  ['Clear and starry', 'A slow saxophone drifting in from the west. Visibility: excellent till late.', 12],
  'kyoto-tea':      ['Mild, with steam', 'Gentle breezes through the paper screens; a quiet day ahead.', 17],
  'autumn-coffee':  ['Crisp, golden leaves', 'Cool mornings and amber afternoons. Bring a scarf.', 11],
  'forest-cabin':   ['Pine-scented', 'Light winds through the trees, wood smoke rising by dusk.', 9],
  'ocean-waves':    ['Sea breeze', 'Rolling surf and bright spells; tide in your favour all afternoon.', 22],
  'white-noise':    ['Overcast hum', 'A steady, even hum with no surprises. Focus expected to hold.', 16],
};
const GZ_SIGNS = [
  'The beans are in your favour today. Begin the hardest chapter first; the rest will follow like a second cup.',
  'A quiet corner awaits you. Guard it well, and twenty-five minutes will feel like ten.',
  'Expect a small breakthrough after the third page. Celebrate with something warm.',
  'A friend may ask you to study together. Say yes, and pour two cups.',
  'Your notes are wiser than you think. Re-read yesterday’s before starting today’s.',
  'Patience is steeping. Do not lift the lid too early.',
  'Today favours the methodical. Line up your pens; the stars will do the rest.',
  'An old question will finally make sense. Write it down before it cools.',
];
const GZ_QUOTES = [
  ['Well begun is half done.', 'Aristotle'],
  ['It does not matter how slowly you go, so long as you do not stop.', 'Confucius'],
  ['An investment in knowledge pays the best interest.', 'Benjamin Franklin'],
  ['The beautiful thing about learning is that nobody can take it away from you.', 'B. B. King'],
  ['Live as if you were to die tomorrow. Learn as if you were to live forever.', 'Mahatma Gandhi'],
  ['I have no special talents. I am only passionately curious.', 'Albert Einstein'],
];
const GZ_WORDS = [
  ['Lucubration','loo-kyoo-BRAY-shun','Study or writing done late at night, by lamplight.'],
  ['Cogitate','KOJ-ih-tayt','To think deeply and carefully about something.'],
  ['Ruminate','ROO-mih-nayt','To turn a thought over and over, as one stirs a cup.'],
  ['Vade mecum','VAH-day MAY-kum','A handbook carried everywhere for constant reference.'],
  ['Erudite','EHR-yoo-dyte','Having or showing great learning.'],
  ['Assiduous','uh-SID-yoo-us','Showing great care and steady perseverance.'],
  ['Marginalia','mar-jih-NAY-lee-uh','Notes written in the margins of a book.'],
  ['Sedulous','SEJ-uh-lus','Diligent in application; persistent.'],
];
// The moon tonight, from a known new moon and the length of a lunar month.
function moonPhase(date=new Date()){
  const days=(date.getTime() - Date.UTC(2000,0,6,18,14))/86400000;
  const f=((days % 29.530588853) + 29.530588853) % 29.530588853 / 29.530588853;
  const names=['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'];
  return { name:names[Math.round(f*8)%8], f };
}
const GZ_ADS = [
  ['WANTED', 'One quiet corner table, window seat preferred. Will trade for good company and a warm scone.'],
  ['FOR SALE', 'Highlighters, barely used, all colours. Owner has discovered the pencil. Enquire at the counter.'],
  ['LOST', 'One train of thought, last seen around page 42. If found, please return before the exam.'],
  ['NOTICE', 'The café regrets that the last croissant has been eaten. More are expected at dawn.'],
];
function gzHash(str){ let h=0; for(const ch of str) h=(h*31 + ch.charCodeAt(0))|0; return Math.abs(h); }
function gzDay(t){ const d=new Date(t); d.setHours(0,0,0,0); return d.getTime(); }

function gazetteStats(all){
  const DAY=86400000;
  const withTime=all.filter(r=>Number(r._ts||r.id)>1e11).map(r=>({...r, t:Number(r._ts||r.id)}));
  const minutes=all.reduce((n,r)=>n+(Number(r.duration)||0),0);
  const longest=all.reduce((m,r)=>(Number(r.duration)||0)>(Number(m?.duration)||0)?r:m, null);
  const days=[...new Set(withTime.map(r=>gzDay(r.t)))].sort((a,b)=>a-b);
  let best=0, run=0, prev=null;
  for(const d of days){ run = (prev!==null && d-prev===DAY) ? run+1 : 1; best=Math.max(best,run); prev=d; }
  const today=gzDay(Date.now());
  let current=0;
  if(days.length && (today-days[days.length-1]) <= DAY){ current=1; for(let i=days.length-1;i>0 && days[i]-days[i-1]===DAY;i--) current++; }
  const byWeekday=[0,0,0,0,0,0,0]; withTime.forEach(r=>byWeekday[new Date(r.t).getDay()]++);
  const weekStart=today - 6*DAY, prevStart=today - 13*DAY;
  const bases=Object.keys(BC);
  const exchange=bases.map(b=>{
    const now=withTime.filter(r=>r.base===b && r.t>=weekStart).length;
    const before=withTime.filter(r=>r.base===b && r.t>=prevStart && r.t<weekStart).length;
    return {b, now, before, total:all.filter(r=>r.base===b).length};
  });
  const tally=key=>{ const m=new Map(); all.forEach(r=>{ const k=key(r); if(k) m.set(k,(m.get(k)||0)+1); }); return [...m.entries()].sort((a,b)=>b[1]-a[1]); };
  return { sessions:all.length, minutes, avg: all.length ? Math.round(minutes/all.length) : 0, longest, daysStudied:days.length, current, best,
    favourites:all.filter(r=>r.favorite).length, shared:all.filter(r=>r.shared).length, byWeekday, exchange,
    topSubject:tally(r=>r.subject && r.subject!=='General Study' ? r.subject : null)[0],
    topCup:tally(r=>r.cup)[0], busiestDay: byWeekday.some(n=>n) ? byWeekday.indexOf(Math.max(...byWeekday)) : null };
}

function renderGazetteExtras(all){
  const st=gazetteStats(all);
  const name=displayNameOf();
  const cupNames={mug:'vintage mug', teacup:'teacup', glass:'latte glass', takeaway:'takeaway cup'};
  // Lead story
  const headline = st.sessions
    ? `${esc(name).toUpperCase()} LOGS ${st.sessions} SESSION${st.sessions===1?'':'S'}, ${st.minutes>=60?(st.minutes/60).toFixed(1)+' HOURS':st.minutes+' MINUTES'} AT THE DESK`
    : `${esc(name).toUpperCase()} TAKES A SEAT AT THE CAFÉ`;
  const paras = st.sessions ? [
    `In what regulars are calling a steady and studious run, ${esc(name)} has completed ${st.sessions} focus session${st.sessions===1?'':'s'} at Brew &amp; Focus, averaging ${st.avg} minutes a sitting.`,
    st.longest ? `The longest stretch on record came during “${esc(st.longest.name||'an untitled brew')}”, a ${Number(st.longest.duration)||0}-minute session${st.longest.subject?` devoted to ${esc(st.longest.subject)}`:''}. Witnesses report the cup was empty long before the work was.` : '',
    st.topSubject ? `${esc(st.topSubject[0])} remains the subject of choice, appearing in ${st.topSubject[1]} session${st.topSubject[1]===1?'':'s'}.` : '',
    st.topCup ? `Asked about the ${cupNames[st.topCup[0]]||st.topCup[0]}, a favourite companion through ${st.topCup[1]} session${st.topCup[1]===1?'':'s'}, our subject declined to comment, citing a deadline.` : '',
    st.busiestDay!==null ? `${['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'][st.busiestDay]} have proved the busiest day at the desk.` : '',
    st.current>1 ? `With a ${st.current}-day streak under way, the presses are being kept warm for tomorrow’s edition.` : `The Gazette will continue to follow the story closely.`,
  ].filter(Boolean) : [
    `A new face has been spotted at Brew &amp; Focus. ${esc(name)} joined the café recently and is expected to brew a first cup any day now.`,
    `Staff report that a quiet corner has been kept free, a timer has been set to twenty-five minutes, and the kettle is warm.`,
    `The Gazette will report on the first session as soon as it is complete. Readers are advised to watch this space.`,
  ];
  document.getElementById('gz-lead-head').innerHTML = headline;
  document.getElementById('gz-lead-body').innerHTML = paras.map(p=>`<p>${p}</p>`).join('');
  // Weather (from your chosen ambience)
  const amb = S.ambience in GZ_WEATHER ? S.ambience : 'cozy-cafe';
  const [sky, outlook, temp] = GZ_WEATHER[amb];
  document.getElementById('gz-weather').innerHTML = `
    <div class="gz-weather-top"><div class="gz-temp">${temp}°</div><div><b>${sky}</b><span>${GZ_AMBIENCE[amb]}</span></div></div>
    <p class="gz-text">${outlook}</p>
    <div class="gz-tides"><span>Focus: <b>high</b></span><span>Distractions: <b>low</b></span><span>Steam: <b>rising</b></span></div>`;
  // By the numbers
  const rows=[['Sessions',st.sessions],['Average sitting',`${st.avg} min`],['Longest sitting',`${Number(st.longest?.duration)||0} min`],['Days at the desk',st.daysStudied],
    ['Current streak',`${st.current} day${st.current===1?'':'s'}`],['Best streak',`${st.best} day${st.best===1?'':'s'}`],['Favourites',st.favourites],['Shared brews',st.shared]];
  document.getElementById('gz-numbers').innerHTML = rows.map(([k,v])=>`<div><span>${k}</span><i></i><b>${v}</b></div>`).join('');
  // The week at a glance
  const max=Math.max(1, ...st.byWeekday);
  const order=[1,2,3,4,5,6,0];
  document.getElementById('gz-week').innerHTML = `
    <div class="gz-plot">${order.map(d=>{ const n=st.byWeekday[d]; const pct=n?Math.max(Math.round(n/max*100),6):0;
      return `<div class="gz-col${d===st.busiestDay&&n?' top':''}"><span class="gz-col-n">${n||''}</span><i style="height:${pct}%"></i></div>`; }).join('')}</div>
    <div class="gz-axis">${order.map(d=>`<span>${GZ_DAYS[d]}</span>`).join('')}</div>`;
  // The Bean Exchange
  const names={coffee:'Coffee', matcha:'Matcha', tea:'Tea', chocolate:'Cocoa', chai:'Chai', earlgrey:'Earl Grey', hibiscus:'Hibiscus', golden:'Golden'};
  const exMax=Math.max(1, ...st.exchange.map(x=>x.total));
  document.getElementById('gz-exchange').innerHTML = `<div class="gz-ex-head"><span>Bean</span><span>All-time</span><span>Wk</span><span>Chg</span></div>` +
    [...st.exchange].sort((a,b)=>(b.total+b.now)-(a.total+a.now)).slice(0,4).map(x=>{ const ch=x.now-x.before; const sym = ch>0?'▲':ch<0?'▼':'—';
      return `<div class="gz-ex-row"><span>${names[x.b]}</span><span class="gz-ex-bar"><i style="width:${Math.round(x.total/exMax*100)}%"></i><em>${x.total}</em></span><span>${x.now}</span><span class="${ch>0?'up':ch<0?'down':''}">${sym}${ch?' '+Math.abs(ch):''}</span></div>`; }).join('') +
    `<p class="gz-small gz-ex-note">Cups brewed this week against last week. All-time leader: <b>${names[[...st.exchange].sort((a,b)=>b.total-a.total)[0].b]}</b>.</p>`;
  // This term's subjects, and the word and quote of the day
  renderTermSubjects();
  const dayIndex=Math.floor(Date.now()/86400000);
  const [w, say, means] = GZ_WORDS[(dayIndex*3) % GZ_WORDS.length];
  document.getElementById('gz-word').innerHTML = `<div class="gz-word-k">Word of the Day</div><p><b>${w}</b> <span>(${say})</span> \u2014 ${means}</p>`;
  const [q, who] = GZ_QUOTES[dayIndex % GZ_QUOTES.length];
  document.getElementById('gz-quote').innerHTML = `<blockquote>“${q}”</blockquote><cite>— ${who}</cite>`;
  // Small ads
  document.getElementById('gz-ads').innerHTML = GZ_ADS.map(([k,t])=>`<div class="gz-ad"><b>${k}.</b> ${t}</div>`).join('');
  renderGazetteSociety();
}

// Your cafés, fetched when the page opens.
async function renderGazetteSociety(){
  renderGazetteFriends();
  const el=document.getElementById('gz-society');
  if(!S.user || !supabaseClient){ el.innerHTML=''; return; }
  try{
    const cafes = await CafeDB.listMine();
    if(!document.getElementById('page-profile').classList.contains('active')) return;
    el.innerHTML = cafes.length
      ? cafes.slice(0,4).map(c=>`<div class="gz-soc"><b>${esc(c.name)}</b> <span>${vibeOf(c.vibe).label}</span><p>${c.members.map(m=>esc(personName(m))).join(', ')}${c.owner_id===S.user.id?' — hosted by our subject':''}.</p></div>`).join('')
      : `<p class="gz-small">Our subject has not yet been seen at a shared table. Readers wishing to study together may send an invitation.</p>`;
  } catch(e){
    el.innerHTML = `<p class="gz-small">The society pages are being typeset. Check back shortly.</p>`;
  }
}

// ── This term's subjects ──
// The subjects you're taking this semester, kept with your account. Tap one
// to see how long you've studied it: every finished session counts.
const termSubjects = () => (Array.isArray(S.user?.meta?.subjects) ? S.user.meta.subjects : []).filter(x=>typeof x==='string' && x.trim()).slice(0,10);
let termOpen=null;
const sameSubject = (a,b) => String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();
function subjectStats(name){
  const all=[...(S.recipes||[]), ...(S.sharedRecipes||[])].filter(r=>sameSubject(r.subject, name));
  const mins=all.reduce((t,r)=>t+(Number(r.duration)||0),0);
  const weekAgo=Date.now()-7*86400000;
  const week=all.filter(r=>(r._ts||r.id||0)>=weekAgo).reduce((t,r)=>t+(Number(r.duration)||0),0);
  const last=all.reduce((m,r)=>Math.max(m, r._ts||r.id||0),0);
  return {mins, week, sessions:all.length, last};
}
const fmtHours = m => { if(m<60) return `${m} min`; const h=(m/60).toFixed(1).replace(/\.0$/,''); return `${h} hr${h==='1'?'':'s'}`; };
function renderTermSubjects(){
  const el=document.getElementById('gz-term'); if(!el) return;
  const list=termSubjects();
  const dl=document.getElementById('term-subjects'); if(dl) dl.innerHTML=list.map(x=>`<option value="${esc(x)}">`).join('');
  if(termOpen && !list.some(x=>sameSubject(x,termOpen))) termOpen=null;
  if(!list.length){ el.innerHTML=`<p class="gz-small gz-center">Enrol below — add the subjects you’re taking this term, then tap one to see your hours.</p>`; return; }
  const stats=list.map(x=>({name:x, ...subjectStats(x)})), max=Math.max(60, ...stats.map(x=>x.mins));
  el.innerHTML = `<ul class="gz-term-list">${stats.map((x,i)=>`<li><button type="button" class="gz-term-sub ${sameSubject(termOpen,x.name)?'on':''}" onclick="toggleTermSubject(${i})" aria-expanded="${sameSubject(termOpen,x.name)}">
      <span>${esc(x.name)}</span><em aria-hidden="true"></em><i>${x.mins ? fmtHours(x.mins) : '0 hrs'}</i></button></li>`).join('')}</ul>`
    + (termOpen ? (()=>{ const x=stats.find(y=>sameSubject(y.name,termOpen)), idx=list.findIndex(y=>sameSubject(y,x.name));
        const drop=`<button type="button" class="gz-link gz-term-drop" onclick="removeTermSubject(${idx})">drop this subject</button>`;
        if(!x.sessions) return `<div class="gz-term-detail fresh">
          <div class="gz-term-fresh-k">Fresh on the timetable</div>
          <p class="gz-small">No study hours on the books yet.</p>
          <div class="gz-term-acts"><button type="button" class="gz-press gz-term-brew" onclick="brewForSubject(${idx})">Brew for ${esc(x.name)}</button>${drop}</div>
        </div>`;
        const last = new Date(x.last).toLocaleDateString('en-GB',{day:'numeric', month:'short'});
        return `<div class="gz-term-detail">
          <div class="gz-term-hours"><b>${fmtHours(x.mins)}</b><span>studied in ${esc(x.name)}</span></div>
          <div class="gz-term-bar" aria-hidden="true"><i style="width:${Math.round(x.mins/max*100)}%"></i></div>
          <p class="gz-small">${x.sessions} finished session${x.sessions>1?'s':''} · ${fmtHours(x.week)} this week · last studied ${last}</p>
          ${drop}
        </div>`; })() : '');
}
// start a brew with this subject already written on the order slip
function brewForSubject(i){
  const x=termSubjects()[i]; if(!x) return;
  showPage('brew');
  const f=document.getElementById('field-subject'); if(f){ f.value=x; f.dispatchEvent(new Event('input')); }
  document.querySelector('.order-slip')?.scrollIntoView({behavior:'smooth', block:'center'});
}
function toggleTermSubject(i){ const x=termSubjects()[i]; termOpen = sameSubject(termOpen,x) ? null : x; renderTermSubjects(); }
async function saveTermSubjects(list){
  const prev=S.user.meta?.subjects;
  S.user.meta={ ...(S.user.meta||{}), subjects:list };
  renderTermSubjects();
  try{ const { error } = await supabaseClient.auth.updateUser({ data:{ subjects:list } }); if(error) throw error; }
  catch(e){ S.user.meta.subjects=prev; renderTermSubjects(); setProfileMsg('Couldn\u2019t save your subjects just now \u2014 please try again.', 'error'); }
}
function addTermSubject(){
  const inp=document.getElementById('gz-term-in'), name=inp.value.replace(/\s+/g,' ').trim().slice(0,40);
  if(!name || !S.user) return;
  const list=termSubjects();
  if(list.some(x=>sameSubject(x,name))){ termOpen=list.find(x=>sameSubject(x,name)); inp.value=''; renderTermSubjects(); return; }
  if(list.length>=10){ setProfileMsg('Ten subjects is a full timetable — drop one to add another.', 'error'); return; }
  inp.value=''; termOpen=name; saveTermSubjects([...list, name]);
}
function removeTermSubject(i){ const list=termSubjects(); if(!list[i]) return; termOpen=null; saveTermSubjects(list.filter((_,j)=>j!==i)); }

// Bio, favourite song and favourite book: typed straight onto the page and
// saved with the account (no form to submit).
const EXTRA_FIELDS = { bio:['gz-bio',220], fav_song:['gz-song',80], fav_book:['gz-book',80] };
let extrasTimer=null, extrasSaved='';
function readExtras(){ const o={}; for(const [k,[id,max]] of Object.entries(EXTRA_FIELDS)) o[k]=document.getElementById(id).value.trim().slice(0,max); return o; }
function fillExtras(){
  const m=S.user?.meta||{};
  for(const [k,[id]] of Object.entries(EXTRA_FIELDS)){ const el=document.getElementById(id); if(document.activeElement!==el) el.value=m[k]||''; }
  extrasSaved=JSON.stringify(readExtras());
}
function queueExtrasSave(){ clearTimeout(extrasTimer); extrasTimer=setTimeout(saveExtras, 1200); }
async function saveExtras(){
  clearTimeout(extrasTimer);
  if(!supabaseClient || !S.user) return;
  const data=readExtras(); const key=JSON.stringify(data);
  if(key===extrasSaved) return;
  extrasSaved=key;
  try{
    const { error } = await supabaseClient.auth.updateUser({ data });
    if(error) throw error;
    S.user.meta={ ...(S.user.meta||{}), ...data };
    setProfileMsg('Saved to the morning edition.', 'success');
  } catch(e){ extrasSaved=''; setProfileMsg('Couldn\u2019t save that just now \u2014 please try again.', 'error'); }
}

function setProfileMsg(msg, type){ const el=document.getElementById('gz-msg'); el.textContent=msg||''; el.className='gz-msg'+(type?' '+type:''); }

async function saveProfile(){
  if(!supabaseClient || !S.user) return;
  const name=document.getElementById('gz-in-name').value.trim();
  const username=document.getElementById('gz-in-username').value.trim().replace(/^@/,'');
  if(!USERNAME_RULE.test(username)){ setProfileMsg('Usernames are 2–24 letters or numbers (you can also use . _ -), with no spaces.', 'error'); return; }
  if(name.length>40){ setProfileMsg('Please keep your name under 40 characters.', 'error'); return; }
  const btn=document.getElementById('gz-save'); const label=btn.textContent;
  btn.disabled=true; btn.textContent='Printing…';
  try{
    const { data, error } = await supabaseClient.rpc('set_my_profile', { p_display_name:name, p_username:username });
    if(error) throw error;
    if(data==='taken'){ setProfileMsg(`“${username}” is already taken — try another.`, 'error'); return; }
    if(data==='invalid'){ setProfileMsg('Usernames are 2–24 letters or numbers (you can also use . _ -), with no spaces.', 'error'); return; }
    // keep the account's own record in step too
    try { await supabaseClient.auth.updateUser({ data:{ username, display_name:name||null } }); } catch(e){}
    S.profile = { ...(S.profile||{}), username, display_name:name||null };
    S.user.username = username;
    renderAuthUI(); renderProfilePage();
    setProfileMsg('Sent to press — your profile is updated.', 'success');
  } catch(e){ setProfileMsg(profileErrorText(e), 'error'); }
  finally{ btn.disabled=false; btn.textContent=label; }
}

// Crop the chosen picture to a square, shrink it, and upload it to your
// own folder in the avatars bucket.
function squareImage(file, size=400){
  return new Promise((resolve, reject)=>{
    const url=URL.createObjectURL(file); const img=new Image();
    img.onload=()=>{
      const s=Math.min(img.naturalWidth, img.naturalHeight);
      const c=document.createElement('canvas'); c.width=size; c.height=size;
      const ctx=c.getContext('2d'); ctx.imageSmoothingQuality='high';
      ctx.drawImage(img, (img.naturalWidth-s)/2, (img.naturalHeight-s)/2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      c.toBlob(b=> b ? resolve(b) : reject(new Error('Could not read that picture')), 'image/jpeg', 0.88);
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('That file doesn’t look like a picture')); };
    img.src=url;
  });
}
async function uploadAvatar(file){
  if(!file || !supabaseClient || !S.user) return;
  if(!/^image\//.test(file.type)){ setProfileMsg('Please choose a picture (JPG, PNG or WebP).', 'error'); return; }
  if(file.size > 15*1024*1024){ setProfileMsg('That picture is very large — please choose one under 15 MB.', 'error'); return; }
  const fig=document.getElementById('gz-photo'); fig.classList.add('printing');
  setProfileMsg('Developing your portrait…');
  try{
    const blob=await squareImage(file);
    const path=`${S.user.id}/avatar.jpg`;
    const { error:upErr } = await supabaseClient.storage.from('avatars').upload(path, blob, { upsert:true, contentType:'image/jpeg', cacheControl:'3600' });
    if(upErr) throw upErr;
    const { data:pub } = supabaseClient.storage.from('avatars').getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    const { error } = await supabaseClient.rpc('set_my_avatar', { p_url:url });
    if(error) throw error;
    S.profile = { ...(S.profile||{}), avatar_url:url };
    renderAuthUI(); renderProfilePage();
    setProfileMsg('Your new portrait is on the front page.', 'success');
  } catch(e){ setProfileMsg(profileErrorText(e), 'error'); }
  finally{ fig.classList.remove('printing'); }
}
async function removeAvatar(){
  if(!supabaseClient || !S.user || !S.profile?.avatar_url) return;
  try{
    const { error } = await supabaseClient.rpc('set_my_avatar', { p_url:null });
    if(error) throw error;
    try { await supabaseClient.storage.from('avatars').remove([`${S.user.id}/avatar.jpg`]); } catch(e){}
    S.profile.avatar_url=null;
    renderAuthUI(); renderProfilePage();
    setProfileMsg('Portrait removed.', 'success');
  } catch(e){ setProfileMsg(profileErrorText(e), 'error'); }
}

// ── Auth (Supabase) ──────────────────────────────────────────────────────
// One pop-up, four screens: Log in, Sign up, Forgot password, and Choose a
// new password (where the reset email lands). Also: email sign-in links,
// resending the confirmation email, and Google (shown once it's enabled).
const AUTH_HOME = location.origin + location.pathname;   // where emailed links bring people back
const AUTH_VIEWS = {
  signin: { title:'Welcome back', sub:'Log in to keep your recipes with you, wherever you brew.', submit:'Log in',
            show:['email','password','forgot','alt','magic','foot'], tabs:true },
  signup: { title:'Join the café', sub:'Create an account so your brews follow you between visits.', submit:'Create account',
            show:['username','email','password','strength','confirm','alt','foot'], tabs:true },
  forgot: { title:'Forgot your password?', sub:'Enter your email and we’ll send you a link to choose a new one.', submit:'Send reset link',
            show:['email','foot'], tabs:false },
  reset:  { title:'Choose a new password', sub:'Almost there — pick a new password for your account.', submit:'Save new password',
            show:['password','strength','confirm'], tabs:false },
};
let authProviders = null;      // which sign-in methods the project has switched on
let resendCooldownUntil = 0;

function openAuthModal(view='signin'){
  setAuthTab(view);
  document.getElementById('auth-modal').classList.add('open');
  loadAuthProviders();
  setTimeout(()=>{ const f=document.querySelector('#auth-form .f-row:not([hidden]) input'); if(f) f.focus(); }, 60);
}
function closeAuthModal(e){ if(e.target===document.getElementById('auth-modal') && S.authTab!=='reset') closeAuthModalDirect(); }
function closeAuthModalDirect(){
  document.getElementById('auth-modal').classList.remove('open');
  setAuthMsg('');
}
function setAuthTab(view){
  const v = AUTH_VIEWS[view] ? view : 'signin';
  const cfg = AUTH_VIEWS[v];
  S.authTab = v;
  const on = part => cfg.show.includes(part);
  document.getElementById('auth-tabs').hidden = !cfg.tabs;
  document.getElementById('auth-tab-signin').classList.toggle('active', v==='signin');
  document.getElementById('auth-tab-signup').classList.toggle('active', v==='signup');
  document.getElementById('auth-tab-signin').setAttribute('aria-selected', v==='signin');
  document.getElementById('auth-tab-signup').setAttribute('aria-selected', v==='signup');
  document.getElementById('auth-username-row').hidden = !on('username');
  document.getElementById('auth-email-row').hidden = !on('email');
  document.getElementById('auth-password-row').hidden = !on('password');
  document.getElementById('auth-forgot-link').hidden = !on('forgot');
  document.getElementById('pw-strength-wrap').hidden = !on('strength');
  document.getElementById('auth-confirm-row').hidden = !on('confirm');
  document.getElementById('auth-alt').dataset.allowed = on('alt') ? '1' : '0';
  document.getElementById('auth-magic-btn').hidden = !on('magic');
  syncAuthAlt();
  document.getElementById('auth-password-label').textContent = v==='reset' ? 'New password' : 'Password';
  document.getElementById('auth-password').setAttribute('autocomplete', (v==='signin') ? 'current-password' : 'new-password');
  document.getElementById('auth-title').textContent = cfg.title;
  document.getElementById('auth-sub').textContent = cfg.sub;
  document.getElementById('auth-submit-btn').textContent = cfg.submit;
  document.getElementById('auth-password').value = v==='signin' ? document.getElementById('auth-password').value : '';
  document.getElementById('auth-confirm').value = '';
  updatePasswordStrength();
  renderAuthFoot();
  updateGoogleButton();
  setAuthMsg('');
}
function renderAuthFoot(extra){
  const foot=document.getElementById('auth-foot');
  const v=S.authTab;
  const links={
    signin: `Didn’t get your confirmation email? <button type="button" class="auth-link" onclick="resendConfirmation()">Resend it</button>`,
    signup: `Already a member? <button type="button" class="auth-link" onclick="setAuthTab('signin')">Log in</button>`,
    forgot: `Remembered it? <button type="button" class="auth-link" onclick="setAuthTab('signin')">Back to log in</button>`,
  };
  foot.innerHTML = extra || links[v] || '';
  foot.hidden = !foot.innerHTML;
}
function setAuthMsg(msg, type){
  const el=document.getElementById('auth-msg');
  el.textContent=msg||''; el.className='auth-msg'+(type?(' '+type):'');
}

// Password visibility and strength
const ICON_EYE='<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M1.8 10S4.8 4.6 10 4.6 18.2 10 18.2 10 15.2 15.4 10 15.4 1.8 10 1.8 10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const ICON_EYE_OFF='<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M1.8 10S4.8 4.6 10 4.6 18.2 10 18.2 10 15.2 15.4 10 15.4 1.8 10 1.8 10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 16.5l13-13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
function togglePasswordVisibility(){
  const fields=[document.getElementById('auth-password'), document.getElementById('auth-confirm')];
  const btn=document.getElementById('pw-toggle-btn');
  const willShow = fields[0].type==='password';
  fields.forEach(f=>f.type = willShow ? 'text' : 'password');
  btn.innerHTML = willShow ? ICON_EYE_OFF : ICON_EYE;
  btn.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
}
const MIN_PASSWORD = 8;
function passwordScore(p){
  if(p.length < MIN_PASSWORD) return 0;
  let s=1;
  if(p.length>=12) s++;
  if(/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if(/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  else if(/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) s+=0.5;
  return Math.min(4, Math.floor(s));
}
function updatePasswordStrength(){
  const p=document.getElementById('auth-password').value;
  const score=passwordScore(p);
  const meter=document.getElementById('pw-strength');
  meter.dataset.score = p ? score : '';
  document.getElementById('pw-hint').textContent = !p ? `At least ${MIN_PASSWORD} characters.`
    : ['Too short — at least '+MIN_PASSWORD+' characters', 'Weak — try making it longer', 'Fair — add a capital letter, number or symbol', 'Good', 'Strong'][score];
  const confirm=document.getElementById('auth-confirm');
  if(confirm.value) confirm.classList.toggle('mismatch', confirm.value!==p);
}

// Which sign-in methods the project has turned on (public, read-only).
async function loadAuthProviders(){
  if(authProviders) return;
  try{
    const r=await fetch(`${SUPABASE_URL}/auth/v1/settings`, {headers:{apikey:SUPABASE_ANON_KEY}});
    authProviders = (await r.json()).external || {};
  }catch(e){ authProviders = {}; }
  updateGoogleButton();
}
function updateGoogleButton(){
  const btn=document.getElementById('auth-google-btn');
  const on = !!authProviders?.google && (S.authTab==='signin' || S.authTab==='signup');
  btn.hidden = !on;
  syncAuthAlt();
}
// the "or" divider only shows when there's another way to sign in beneath it
function syncAuthAlt(){
  const alt=document.getElementById('auth-alt'), cfgOn=alt.dataset.allowed!=='0';
  const any=!document.getElementById('auth-magic-btn').hidden || !document.getElementById('auth-google-btn').hidden;
  alt.hidden = !(cfgOn && any);
}

// Turns Supabase's raw auth errors into something a person can act on,
// without changing what actually happened.
function friendlyAuthError(err){
  const msg = (err && err.message) || '';
  if(/invalid login credentials/i.test(msg))
    return "That email and password don't match. Check for typos (tap the eye to see what you typed), or use “Forgot password?”.";
  if(/email not confirmed/i.test(msg)) return 'Please confirm your email first — tap “Resend it” below if the email never arrived.';
  if(/user already registered|already been registered/i.test(msg)) return 'An account with that email already exists — try logging in instead.';
  if(/signups? not allowed for otp|user not found/i.test(msg)) return 'There’s no account with that email yet — sign up first.';
  if(/rate limit|too many/i.test(msg)) return 'Too many emails have been sent recently. Please wait a little while and try again.';
  if(/not authori[sz]ed|email_address_not_authorized/i.test(msg)) return 'We couldn\u2019t send an email to that address right now. Please try again later.';
  if(/error sending|smtp|sending (confirmation|recovery|magic)/i.test(msg)) return 'Our email service had a problem sending that message. Please try again in a few minutes.';
  if(/only request this after|after \d+ seconds/i.test(msg)) return 'Please wait a minute before asking for another email.';
  if(/provider is not enabled|unsupported provider/i.test(msg)) return 'Google sign-in isn’t switched on for this app yet.';
  if(/should be different from the old password/i.test(msg)) return 'Your new password needs to be different from the old one.';
  if(/invalid format|valid email/i.test(msg)) return 'That doesn’t look like an email address.';
  if(/password should be at least|weak password/i.test(msg)) return msg;
  if(/auth session missing|expired|invalid.*(link|token)/i.test(msg)) return 'That link has expired or was already used. Please request a new one.';
  return msg || 'Something went wrong. Please try again.';
}
const looksLikeEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function withAuthButton(btn, busyLabel, fn){
  const label=btn.textContent; btn.disabled=true; btn.textContent=busyLabel;
  try{ return await fn(); }
  catch(err){ console.error('Auth error:', err); setAuthMsg(friendlyAuthError(err), 'error'); }
  finally{ btn.disabled=false; btn.textContent=label; }
}

async function submitAuth(){
  if(!supabaseClient){ setAuthMsg('Sign-in isn’t available right now. Please try again later.', 'error'); return; }
  const v=S.authTab;
  const email=document.getElementById('auth-email').value.trim();
  const password=document.getElementById('auth-password').value;
  const confirm=document.getElementById('auth-confirm').value;
  const username=document.getElementById('auth-username').value.trim();
  const btn=document.getElementById('auth-submit-btn');

  if(v!=='reset'){
    if(!email){ setAuthMsg('Please enter your email.', 'error'); return; }
    if(!looksLikeEmail(email)){ setAuthMsg('That doesn’t look like an email address.', 'error'); return; }
  }
  if(v==='signin' && !password){ setAuthMsg('Please enter your password.', 'error'); return; }
  if(v==='signup' && !username){ setAuthMsg('Please tell us your name.', 'error'); return; }
  if(v==='signup' || v==='reset'){
    if(password.length < MIN_PASSWORD){ setAuthMsg(`Your password needs at least ${MIN_PASSWORD} characters.`, 'error'); return; }
    if(password!==confirm){ setAuthMsg('The two passwords don’t match.', 'error'); return; }
  }

  await withAuthButton(btn, 'Brewing…', async ()=>{
    if(v==='signin'){
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if(error) throw error;
      setAuthMsg('Welcome back!', 'success');
      setTimeout(closeAuthModalDirect, 700);
    }
    else if(v==='signup'){
      const { data, error } = await supabaseClient.auth.signUp({
        email, password, options:{ data:{ username }, emailRedirectTo: AUTH_HOME }
      });
      if(error) throw error;
      // Supabase answers a sign-up for an email that already has an account
      // with a look-alike "success" (no identities) and sends no email.
      if(data.user && Array.isArray(data.user.identities) && data.user.identities.length===0){
        setAuthMsg('There\u2019s already an account with this email. Log in instead, or use \u201cForgot password?\u201d if you can\u2019t remember it.', 'error');
        renderAuthFoot(`Already a member? <button type="button" class="auth-link" onclick="setAuthTab('signin')">Log in</button>`);
        return;
      }
      if(data.user){
        try { await supabaseClient.from('profiles').upsert({ id:data.user.id, username }); }
        catch(profileErr){ console.warn('Profile save failed (non-blocking):', profileErr); }
      }
      if(data.session){
        setAuthMsg('Welcome to the café!', 'success');
        setTimeout(closeAuthModalDirect, 900);
      } else {
        setAuthMsg(`Almost there — we sent a confirmation link to ${email}. Open it to finish joining.`, 'success');
        renderAuthFoot(`No email? Check your spam folder, or <button type="button" class="auth-link" onclick="resendConfirmation()">send it again</button>.`);
      }
    }
    else if(v==='forgot'){
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: AUTH_HOME });
      if(error) throw error;
      // Same message whether or not the account exists, so emails can't be probed.
      setAuthMsg(`If there’s an account for ${email}, a reset link is on its way. It may take a minute to arrive.`, 'success');
    }
    else if(v==='reset'){
      const { error } = await supabaseClient.auth.updateUser({ password });
      if(error) throw error;
      setAuthMsg('Your password has been changed.', 'success');
      setTimeout(()=>{ closeAuthModalDirect(); showToast('Password updated — you’re logged in'); }, 900);
    }
  });
}

// Log in without a password: we email a one-tap link (existing accounts only,
// so every account still has a name from sign-up).
async function sendMagicLink(){
  if(!supabaseClient) return;
  const email=document.getElementById('auth-email').value.trim();
  if(!looksLikeEmail(email)){ setAuthMsg('Enter your email above, then tap “Email me a sign-in link”.', 'error'); document.getElementById('auth-email').focus(); return; }
  await withAuthButton(document.getElementById('auth-magic-btn'), 'Sending…', async ()=>{
    const { error } = await supabaseClient.auth.signInWithOtp({ email, options:{ shouldCreateUser:false, emailRedirectTo: AUTH_HOME } });
    if(error) throw error;
    setAuthMsg(`Check your inbox — we sent a sign-in link to ${email}.`, 'success');
  });
}

// Send the sign-up confirmation email again.
async function resendConfirmation(){
  if(!supabaseClient) return;
  const email=document.getElementById('auth-email').value.trim();
  if(!looksLikeEmail(email)){ setAuthMsg('Enter the email you signed up with, then tap “Resend it”.', 'error'); document.getElementById('auth-email').focus(); return; }
  const wait=Math.ceil((resendCooldownUntil-Date.now())/1000);
  if(wait>0){ setAuthMsg(`Please wait ${wait} seconds before sending another email.`, 'error'); return; }
  try{
    const { error } = await supabaseClient.auth.resend({ type:'signup', email, options:{ emailRedirectTo: AUTH_HOME } });
    if(error) throw error;
    resendCooldownUntil = Date.now() + 60000;
    setAuthMsg(`Sent — a new confirmation link is on its way to ${email}.`, 'success');
  } catch(err){ setAuthMsg(friendlyAuthError(err), 'error'); }
}

async function signInWithGoogle(){
  if(!supabaseClient) return;
  try{
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: AUTH_HOME } });
    if(error) throw error;   // on success the browser leaves for Google
  } catch(err){ setAuthMsg(friendlyAuthError(err), 'error'); }
}

// Coming back from an emailed link: a password reset opens "Choose a new
// password"; an expired or used link explains what happened.
function handleAuthRedirect(){
  if(AUTH_URL_STATE.recovery || AUTH_URL_STATE.recoveryEvent){ openAuthModal('reset'); return; }
  if(AUTH_URL_STATE.error){
    history.replaceState(null, '', location.pathname + location.search);
    openAuthModal('signin');
    setAuthMsg(friendlyAuthError({message:AUTH_URL_STATE.error}), 'error');
  }
}
async function signOutUser(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  showToast('Signed out — come back soon');
  // handleSessionChange (via onAuthStateChange) restores guest recipes and clears S.user
}
function renderAuthUI(){
  const nav=document.getElementById('nav-auth');
  if(S.user){
    const shown=displayNameOf();
    const initial=(shown||'?').trim().charAt(0).toUpperCase();
    const pic=S.profile?.avatar_url;
    nav.innerHTML = navPostHTML() + `
      <button type="button" class="nav-user" onclick="showPage('profile')" title="Your profile">
        <span class="nav-user-avatar">${pic ? `<img src="${esc(pic)}" alt="">` : esc(initial)}</span>
        <span class="nav-user-name">${esc(shown)}</span>
      </button>
      <a class="signout-link" onclick="signOutUser()">Log out</a>`;
    const uField=document.getElementById('field-username');
    if(uField && !uField.value) uField.value=S.user.username||'';
  } else {
    nav.innerHTML = `<a onclick="openAuthModal('signin')" id="nl-signin">Log in</a>`;
  }
  setCoverOwner();
  renderFriendBadges();
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
    if(document.getElementById('page-profile').classList.contains('active')) renderProfilePage();
  } catch(e){
    console.warn('Could not load recipes from Supabase:', e);
  }
}

async function handleSessionChange(session){
  if(session?.user){
    const meta = session.user.user_metadata || {};
    let username = meta.username;
    if(!username){
      const { data: profile } = await supabaseClient.from('profiles').select('username').eq('id', session.user.id).maybeSingle();
      username = profile?.username;
      if(!username){
        username = (meta.full_name || meta.name || (session.user.email||'').split('@')[0] || 'Friend').trim().slice(0,40);
        try { await supabaseClient.from('profiles').upsert({ id:session.user.id, username }); } catch(e){}
      }
    }
    const justSignedIn = !S.user;
    const guestSnapshot = justSignedIn ? [...S.recipes] : null;
    if(justSignedIn) localStorage.setItem('bf_recipes_guest', JSON.stringify(guestSnapshot));
    S.user = { id:session.user.id, email:session.user.email, username, meta };
    await loadMyProfile();
    renderAuthUI();
    loadFriends(); loadMail();
    if(document.getElementById('page-profile').classList.contains('active')) renderProfilePage();
    if(document.getElementById('page-cafe').classList.contains('active')) renderCafeList();
    processPendingInvite(true);
    await loadCloudRecipes(guestSnapshot || []);
  } else {
    if(S.user){
      S.recipes = JSON.parse(localStorage.getItem('bf_recipes_guest')||'[]');
      saveRecipeLists();
      if(document.getElementById('page-recipes').classList.contains('active')) renderRecipes();
    }
    S.user = null; S.profile = null;
    stopFriends();
    renderAuthUI();
    if(document.getElementById('page-profile').classList.contains('active')) renderProfilePage();
    if(S.room){ backToCafeList(); }
    else if(document.getElementById('page-cafe').classList.contains('active')) renderCafeList();
    processPendingInvite(true);
  }
}
async function initAuthState(){
  handleAuthRedirect();
  if(!supabaseClient){ processPendingInvite(true); return; }
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
document.getElementById('sound-toggle').classList.toggle('on',S.soundOn);
applyDrinkPreset(S.drink);
renderHeroCup();
setPlayIcon(false);
renderCupPreview();
renderAuthUI();
initAuthState();

// Browsers only allow sound after the visitor taps, clicks or presses a key —
// and Safari/iPhone only count some of those events — so keep trying on each
// one until the music has actually started.
const UNLOCK_EVENTS=['pointerdown','pointerup','click','touchend','keydown'];
function unlockSound(){
  initAudio(); if(audioCtx?.state==='suspended') audioCtx.resume().catch(()=>{});
  if(!S.soundOn){ UNLOCK_EVENTS.forEach(ev=>document.removeEventListener(ev, unlockSound, true)); return; }
  applyMusic();
  const done=()=>UNLOCK_EVENTS.forEach(ev=>document.removeEventListener(ev, unlockSound, true));
  if(MUSIC_STATIONS[musicPlaying()].gen){ if(audioCtx?.state==='running') done(); else audioCtx?.resume().then(done).catch(()=>{}); }
  else bgMusic.play().then(done).catch(()=>{});
}
UNLOCK_EVENTS.forEach(ev=>document.addEventListener(ev, unlockSound, true));
document.addEventListener('click', e=>{ const cc=document.getElementById('cr-callcard'); if(cc && !cc.hidden && !e.target.closest('#cr-callcard, .cr-sitter')) closeCallCard(); });
document.addEventListener('click', e=>{ const m=document.getElementById('music-menu'); if(m?.classList.contains('open') && !e.target.closest('#music-menu, #sound-toggle')) toggleMusicMenu(false); });
renderMusicMenu();