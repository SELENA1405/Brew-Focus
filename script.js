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
function finishSession(){
  clearInterval(S.timerIv); S.timerRunning=false;
  S.focusActive=false;
  document.querySelector('.nav').classList.remove('focus-locked');
  document.getElementById('page-study').classList.remove('focus-mode');
  setPlayIcon(false);
  const elapsed=S.timerTotal-S.timerSecs;
  const mins=Math.round(elapsed/60)||1;
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
  if(S.user && S.profile) byId[S.user.id] = {...(byId[S.user.id]||{}), display_name:S.profile.display_name, avatar_url:S.profile.avatar_url, username:S.profile.username};
  members.forEach(m=>{
    const p=byId[m.user_id || m.from_user]; if(!p) return;
    m.name = p.display_name || null;
    m.avatar = p.avatar_url || null;
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

// ── The café list (Study Café page) ──
let selectedVibe = 'midnight';
let unsubInvites = null;

function renderVibePicker(){
  const el=document.getElementById('vibe-picker');
  if(!el) return;
  el.innerHTML = VIBE_KEYS.map(k=>{
    const v=CAFE_VIBES[k];
    return `<button type="button" class="vibe-tile ${k===selectedVibe?'sel':''}" onclick="pickVibe('${k}')" aria-pressed="${k===selectedVibe}">
      <span class="vibe-swatch vibe-${k}" aria-hidden="true"></span>
      <span class="vibe-name">${v.label}</span>
      <span class="vibe-tag">${v.tagline}</span>
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
        <span class="vibe-swatch vibe-${esc(inv.cafes?.vibe)}" aria-hidden="true"></span>
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
  const cups=c.members.map(m=>`
    <div class="member-slot">
      ${m.drink ? buildCupSVG({size:64,fillFraction:1,steam:false,cup:m.drink.cup||'mug',base:m.drink.base||'coffee',drink:m.drink.drink,addons:m.drink.addons||[]})
                : `<div class="seat-empty-mini" aria-hidden="true"></div>`}
      <span class="member-name">${esc(personName(m))}</span>
    </div>`).join('');
  return `<div class="room-card">
    <div class="room-card-vibe"><span class="vibe-swatch vibe-${esc(c.vibe)}" aria-hidden="true"></span>${v.label}</div>
    <div class="room-card-name">${esc(c.name)}</div>
    <div class="room-card-meta"><span>${c.members.length} seated</span><i></i><span>${c.owner_id===S.user.id?'you host':'guest'}</span></div>
    <div class="room-card-date">${v.tagline}</div>
    <div class="room-table"><div class="room-cups">${cups}</div></div>
    <button class="room-join-btn vbtn" onclick="enterCafe('${esc(c.id)}')">${vicon('door')}Enter café</button>
  </div>`;
}
function cafeErrorText(e){
  const m=String(e?.message||e);
  if(/schema cache|does not exist|Could not find the (table|function)/i.test(m))
    return 'The café tables aren’t set up in Supabase yet — run supabase/cafes.sql in the Supabase SQL editor.';
  return m;
}

async function createCafe(){
  const nameEl=document.getElementById('room-name');
  const name=nameEl.value.trim();
  if(!name){ showToast('Give your café a name'); nameEl.focus(); return; }
  try{
    const cafe = await CafeDB.create(name, selectedVibe);
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
      setAuthMsg('Sign in (or join) to take your seat at your friend’s café.', '');
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
    try{ setAmbience(vibe.ambience); document.getElementById('field-ambience').value=vibe.ambience; }catch(e){}
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

function seatAngles(n){ return Array.from({length:n}, (_,i)=> Math.PI/2 + i*2*Math.PI/n); }
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

// Someone sitting at the table: their portrait (or initial) above a pair
// of shoulders in a coat, placed on their chair or floor cushion.
const COATS = ['#7a2e3a', '#2f5a4a', '#34405a', '#8a5a2a', '#5a3a5a', '#4a5a3a', '#6a3a24', '#2e4a5a'];
function coatFor(id){ let h=2166136261; for(const ch of String(id)){ h^=ch.charCodeAt(0); h=Math.imul(h, 16777619)>>>0; } return COATS[(h ^ (h>>>13)) % COATS.length]; }
function sitterHTML(m, spot, here){
  const name=personName(m);
  const face = m.avatar
    ? `<img src="${esc(m.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:${esc(JSON.stringify((name[0]||'?').toUpperCase()))}}))">`
    : `<span>${esc((name[0]||'?').toUpperCase())}</span>`;
  return `<div class="cr-sitter ${here?'here':'away'} ${spot.kneel?'kneel':''}" style="left:${(spot.x/TABLE.w*100).toFixed(2)}%; top:${(spot.y/TABLE.h*100).toFixed(2)}%; --s:${spot.s.toFixed(3)}; --coat:${coatFor(m.user_id)}; z-index:${Math.round(spot.y)};" title="${esc(name)}${here?'':' (away)'}">
    <div class="sitter-head">${face}</div>
    <svg class="sitter-body" viewBox="0 0 60 34" aria-hidden="true"><path d="M2,34 C2,18 8,10 20,8 Q30,13 40,8 C52,10 58,18 58,34 Z" fill="var(--coat)"/><path d="M20,8 Q30,13 40,8 L36,8 Q30,11 24,8 Z" fill="#f2e6cf"/><path d="M30,12 L27,24 L30,30 L33,24 Z" fill="rgba(0,0,0,0.22)"/><path d="M6,30 C8,20 12,15 18,13" stroke="rgba(255,255,255,0.15)" stroke-width="2" fill="none"/></svg>
  </div>`;
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
  // your own chair (the first seat, at the front) is left out, as if you're
  // sitting in it looking across the table
  const chairs = angles.slice(1).map(a=>{ const p=seatPoint(a, TABLE.chairRx, TABLE.chairRy); return {...p, near: Math.sin(a) > 0.05}; });
  // the tea house sits on floor cushions round a low table instead
  const tatami = vibe==='kyoto';
  const seatArt = (c)=> tatami ? zabutonSVG(c.x, c.y + (c.near ? 40 : 22), depthScale(c.y)*1.5, c.i) : chairSVG(c.x, c.y, depthScale(c.y), c.near);
  chairs.forEach((c,i)=>{ c.i=i+1; });
  // on the floor your own cushion shows too, just in front of the table
  if(tatami){ const p=seatPoint(angles[0], TABLE.chairRx, TABLE.chairRy); chairs.push({...p, near:true, i:0}); }
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
  const key=Math.round(frac*50);
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
  // You take the front chair; friends fill the chairs nearest you and at the
  // sides first, and the far side of the table only once it gets busy.
  const fillOrder=angles.slice(1).map((a,i)=>({a, i:i+1})).sort((p,q)=>Math.sin(q.a)-Math.sin(p.a)).map(p=>p.i);
  const who=new Array(seatCount).fill(null);
  if(me) who[0]=me;
  others.forEach((m,k)=>{ if(fillOrder[k]!=null) who[fillOrder[k]]=m; });
  const html = angles.map((a,i)=>{
    const m=who[i];
    const p=seatPoint(a, TABLE.cupRx, TABLE.cupRy + (Math.sin(a)<0 ? 12 : 0));
    const s=depthScale(seatPoint(a, TABLE.chairRx, TABLE.chairRy).y);
    const pos=`left:${(p.x/TABLE.w*100).toFixed(2)}%; top:${(p.y/TABLE.h*100).toFixed(2)}%; --s:${s.toFixed(3)}; z-index:${Math.round(p.y)};`;
    if(!m) return `<div class="cr-seat open" style="${pos}" title="${c.vibe==='kyoto'?'An empty cushion':'An empty chair'} — invite a friend"></div>`;
    const here=S.room.presence.has(m.user_id);
    const mine=m.user_id===S.user.id;
    const cupArt = m.drink
      ? buildCupSVG({size:104, fillFraction:frac, steam: frac>0.08, cup:m.drink.cup||'mug', base:m.drink.base||'coffee', drink:m.drink.drink, addons:m.drink.addons||[]})
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
  // friends sitting in their chairs (you're in the front seat, looking on)
  document.getElementById('cr-sitters').innerHTML = angles.map((a,i)=>{
    const m=who[i]; if(!m || i===0) return '';
    return sitterHTML(m, sitterSpot(a, vibe), S.room.presence.has(m.user_id));
  }).join('');
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
  renderSeats(false);
  document.getElementById('cr-time').textContent = fmtClock(remaining);
  document.getElementById('cr-steep').style.width = ((1-remaining/(c.timer_duration_secs||1))*100)+'%';
  if(running && remaining<=0) finishCafeSession();
}
// When the shared timer runs out, everyone with a drink gets the session in
// their recipe book (once), and the host's browser resets the clock.
function finishCafeSession(){
  const c=S.room.cafe;
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
function openInviteModal(){
  const c=S.room?.cafe; if(!c) return;
  document.getElementById('invite-cafe-name').textContent = c.name;
  document.getElementById('invite-link').value = inviteLinkFor(c.invite_code);
  document.getElementById('invite-code').textContent = c.invite_code;
  document.getElementById('invite-username').value='';
  setInviteMsg('');
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
    return `<div class="recipe-card ${r.favorite?'favorite-page':''}" onclick="changeRecipePage(${per===1||i===1?1:-1})">
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
  } catch(e){ S.profile = null; console.warn('Profile not loaded:', e.message||e); }
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
  // Brewoscope and quote of the day (change daily)
  const dayIndex=Math.floor(Date.now()/86400000);
  document.getElementById('gz-horoscope').textContent = GZ_SIGNS[(dayIndex + gzHash(S.user?.id||'')) % GZ_SIGNS.length];
  const moon=moonPhase();
  const lucky = st.sessions ? (DRINKS[all[(dayIndex) % all.length].drink]?.label || 'Cappuccino') : ['Cappuccino','Honey Tea','Matcha Latte','Mocha'][dayIndex%4];
  document.getElementById('gz-almanac').innerHTML = `
    <div><span>Lucky drink</span><b>${esc(lucky)}</b></div>
    <div><span>Lucky number</span><b>${(dayIndex*7 + gzHash(S.user?.id||'')) % 31 + 1}</b></div>
    <div><span>Moon</span><b><i class="gz-moon" style="--lit:${Math.round((1-Math.cos(moon.f*2*Math.PI))/2*100)}%;${moon.f>0.5?'transform:scaleX(-1)':''}"></i>${moon.name}</b></div>`;
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
  document.getElementById('auth-alt').hidden = !on('alt');
  document.getElementById('auth-magic-btn').hidden = !on('magic');
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
    nav.innerHTML = `
      <button type="button" class="nav-user" onclick="showPage('profile')" title="Your profile">
        <span class="nav-user-avatar">${pic ? `<img src="${esc(pic)}" alt="">` : esc(initial)}</span>
        <span class="nav-user-name">${esc(shown)}</span>
      </button>
      <a class="signout-link" onclick="signOutUser()">Sign Out</a>`;
    const uField=document.getElementById('field-username');
    if(uField && !uField.value) uField.value=S.user.username||'';
  } else {
    nav.innerHTML = `<a onclick="openAuthModal('signin')" id="nl-signin">Sign In</a>`;
  }
  setCoverOwner();
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
document.getElementById('field-ambience').value=S.ambience;
document.getElementById('sound-toggle').classList.toggle('on',S.soundOn);
document.addEventListener('pointerdown',()=>{ initAudio(); if(audioCtx && audioCtx.state==='suspended') audioCtx.resume(); },{once:true});
try { initAudio(); } catch(e) {}
applyDrinkPreset(S.drink);
renderHeroCup();
setPlayIcon(false);
renderCupPreview();
renderAuthUI();
initAuthState();

document.addEventListener('click', startMusic, { once: true });

function startMusic() {
  bgMusic.play().catch(err => console.log(err));
}