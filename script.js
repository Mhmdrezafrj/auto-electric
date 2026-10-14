/* ============================================================
   استاد برق خودرو — script.js (v27، ماژولار)
   کل منطق ۵۷ مرحله + سازگاری با کارگاه عملی (دیتابیس مشترک v6)
   ============================================================ */
'use strict';

const $ = id => document.getElementById(id);
const fa = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY = 86400000;
function hideSplash(){ $('splash').classList.add('hide'); }
setTimeout(hideSplash, 1200);
function toast(t){
  const e = $('toast');
  e.textContent = t; e.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = 'none', 2400);
}
function debounce(fn, ms){ let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ==================== تنظیمات ==================== */
let SET = {hb:false, fs:15, mlUse:true, voiceReply:false, beginner:false, mapApi:{url:'',key:'',model:''}};
try { SET = Object.assign(SET, JSON.parse(localStorage.getItem('aem-set')||'{}')); } catch {}
if (!SET.mapApi) SET.mapApi = {url:'',key:'',model:''};
function applySet(){
  document.body.classList.toggle('hb', !!SET.hb);
  const fs = SET.fs + (SET.hb ? 1 : 0);
  document.documentElement.style.setProperty('--fs-body', fs + 'px');
  document.documentElement.style.setProperty('--fs-body-sm', (fs-1.5) + 'px');
  $('hbState').textContent = SET.hb ? 'روشن' : 'خاموش';
  $('hbState2').textContent = SET.hb ? 'روشن' : 'خاموش';
  $('hbTog').classList.toggle('on', !!SET.hb);
  $('fsR').value = SET.fs;
  $('begState').textContent = SET.beginner ? 'روشن' : 'خاموش';
  $('heroSub').textContent = SET.beginner
    ? 'قدم‌به‌قدم و ساده — مخصوص شروع کار.'
    : 'حرف کارگاهی‌ات را می‌فهمم و با شواهد جلو می‌رویم.';
  $('voiceTog').textContent = SET.voiceReply ? '🔊 صوتی: روشن' : '🔊 صوتی: خاموش';
  $('voiceTog').classList.toggle('on', !!SET.voiceReply);
  $('voiceState2').textContent = SET.voiceReply ? 'روشن' : 'خاموش';
}
function saveSet(){ localStorage.setItem('aem-set', JSON.stringify(SET)); applySet(); }
function toggleHB(){ SET.hb = !SET.hb; saveSet(); toast(SET.hb ? 'روشن شد' : 'خاموش شد'); }
function toggleBeg(){ SET.beginner = !SET.beginner; saveSet(); toast(SET.beginner ? 'حالت مبتدی روشن شد 🌱' : 'حالت مبتدی خاموش شد'); }
function toggleVoice(){ SET.voiceReply = !SET.voiceReply; saveSet();
  if (!SET.voiceReply && 'speechSynthesis' in window) speechSynthesis.cancel();
  toast(SET.voiceReply ? 'پاسخ صوتی روشن شد' : 'پاسخ صوتی خاموش شد'); }
$('fsR').addEventListener('input', e => { SET.fs = +e.target.value; saveSet(); });
applySet();

document.querySelectorAll('.settab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.settab').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.setpane').forEach(x=>x.classList.remove('on'));
  t.classList.add('on');
  $('pane-' + t.dataset.st).classList.add('on');
  window.scrollTo(0,0);
}));

function loadMapApiFields(){
  $('map-url').value = SET.mapApi.url || '';
  $('map-key').value = SET.mapApi.key || '';
  $('map-model').value = SET.mapApi.model || '';
}
function saveMapApi(){
  SET.mapApi = {url:$('map-url').value.trim(), key:$('map-key').value.trim(), model:$('map-model').value.trim()};
  saveSet(); loadMapApiFields();
  toast(SET.mapApi.url && SET.mapApi.key ? 'ذخیره شد ✓' : 'آدرس و کلید را کامل کن');
}
loadMapApiFields();

/* ==================== گاراژ ==================== */
let CARS = [];
async function loadCars(){
  if (!db) return;
  CARS = (await req(st('cars','readonly').getAll())).sort((a,b)=>b.created-a.created);
}
function activeCarId(){ return localStorage.getItem('aem-active-car') || ''; }
function activeCar(){ return CARS.find(c => String(c.id) === String(activeCarId())) || null; }
function carNameById(id){
  const c = CARS.find(c => String(c.id) === String(id));
  return c ? (c.name + (c.year ? ' ' + c.year : '')) : '';
}
function setActiveCar(id){
  if (id) localStorage.setItem('aem-active-car', String(id));
  else localStorage.removeItem('aem-active-car');
  renderGarageNames(); renderDiag(); renderList(); refreshCounts(); renderGarageSet();
  const c = activeCar();
  toast(c ? 'خودروی فعال: ' + c.name : 'همه‌ی خودروها');
}
function applyCar(u){
  const c = activeCar();
  if (c && !u.carId){ u.carId = c.id; u.car = c.name; }
  return u;
}
async function openGarage(){
  await loadCars();
  const rows = CARS.map(c => {
    const act = String(c.id) === String(activeCarId());
    return `<div class="row">
      <span style="flex:1;min-width:0"><b style="color:${act?'#7FCB8F':'var(--text-primary)'}">${esc(c.name)}</b>
      ${c.model?' · '+esc(c.model):''}${c.year?' · '+esc(c.year):''}</span>
      <button class="btn sm ${act?'':'ghost'}" onclick="setActiveCar('${c.id}')">${act?'✓ فعال':'فعال کن'}</button>
      <button class="btn danger sm" onclick="delCar(${c.id})">حذف</button>
    </div>`;
  }).join('');
  openSheet(`<h2>🚗 گاراژ</h2>
    <p class="note">خودروی فعال را انتخاب کن؛ نکات جدید و جلسات عیب‌یابی به همین خودرو ثبت می‌شوند. نکات «عمومی» همیشه دیده می‌شوند. پرونده‌ی کامل و آزمایش‌ها در کارگاه عملی است.</p>
    ${rows || '<div class="note">هنوز خودرویی نداری — اولی را اضافه کن.</div>'}
    <hr style="border-color:#242424;margin:12px 0">
    <label>نام خودرو *</label><input class="fld" id="gc-name" placeholder="مثلاً: پژو پارس">
    <label>مدل / تیپ</label><input class="fld" id="gc-model" placeholder="مثلاً: TU5">
    <label>سال</label><input class="fld" id="gc-year" inputmode="numeric" placeholder="۱۳۹۴">
    <div class="btns"><button class="btn" onclick="addCar()">افزودن خودرو</button>
    <button class="btn ghost" onclick="closeSheet()">بستن</button></div>`);
}
async function addCar(){
  const name = $('gc-name').value.trim();
  if (!name) return toast('نام خودرو لازم است');
  const c = {name, model:$('gc-model').value.trim(), year:$('gc-year').value.trim(), created:Date.now()};
  c.id = await req(st('cars','readwrite').add(c));
  await loadCars();
  setActiveCar(c.id);
  openGarage();
  toast('خودرو اضافه و فعال شد 🚗');
}
async function delCar(id){
  if (!confirm('این خودرو حذف شود؟ نکاتش حذف نمی‌شوند؛ فقط عمومی می‌مانند.')) return;
  await req(st('cars','readwrite').delete(id));
  if (String(id) === String(activeCarId())) localStorage.removeItem('aem-active-car');
  await loadCars();
  openGarage(); renderGarageNames(); renderGarageSet(); renderList(); renderDiag();
}
function renderGarageNames(){
  const c = activeCar();
  const t = c ? '🚗 ' + esc(c.name + (c.year?' '+c.year:'')) : '🚗 همه‌ی خودروها';
  const a = $('garageName'); if (a){ a.innerHTML = t; a.className = 'gcar ' + (c?'has':'all'); }
  const b = $('kbGarageName'); if (b){ b.innerHTML = t; b.className = 'gcar ' + (c?'has':'all'); }
}
async function renderGarageSet(){
  if (!db){ $('garageSet').innerHTML = '<div class="note">در حال بارگذاری…</div>'; return; }
  await loadCars();
  const c = activeCar();
  $('garageSet').innerHTML = CARS.length
    ? `<div class="row"><span>خودروی فعال</span><b>${c ? esc(c.name) : 'همه‌ی خودروها'}</b></div>
       <div class="row"><span>تعداد خودروها</span><b>${fa(CARS.length)}</b></div>`
    : '<div class="note">هنوز خودرویی اضافه نکرده‌ای.</div>';
}

/* ==================== مسیر سریع ==================== */
const WIZ_TREES = [
  {id:'nostart', icon:'🔑', label:'استارت نمی‌زند', sys:'استارت',
   steps:[
    {q:'با باز کردن کلید، نور چراغ‌ها و صفحه‌ی آمپر روشن است؟',
     opts:[{t:'خاموش یا خیلی کم‌نور', go:1},{t:'بله، روشن است', go:2}]},
    {q:'قطب‌های باتری را باز کن، تمیز کن و محکم ببند. دوباره استارت بزن. حل شد؟',
     opts:[{t:'بله، حل شد', end:'قطب باتری کثیف یا شل بود.', learn:'قطب‌های باتری را هر چند ماه تمیز و سفت کن؛ شایع‌ترین علت «استارت نمی‌زند» همین است و پولی نمی‌خواهد.'},
           {t:'نه، هنوز استارت نمی‌زند', go:2}]},
    {q:'وقتی کلید را می‌چرخانی، صدای «تِقِ» کوچکی از موتور می‌آید؟',
     opts:[{t:'بله، تق‌تق می‌کند', end:'مدار استارتر یا خود استارتر/سولنوئید مشکوک است.'},
           {t:'نه، هیچ صدایی نیست', end:'مدار سوئیچ استارت یا رله‌ی استارت مشکوک است.'}]}
   ]},
  {id:'batlight', icon:'🔋', label:'چراغ باتری روشن است', sys:'شارژ',
   steps:[
    {q:'با موتور روشن، ولتاژ دو سر باتری را بگیر. بالای ۱۳٫۵ ولت است؟ (راهنما: حالت ولت DC، پروب مشکی بدنه، قرمز قطب مثبت)',
     opts:[{t:'بله، بالای ۱۳٫۵', go:1},{t:'نه یا نمی‌دانم', go:2}]},
    {q:'شارژ سالم است، پس مدار خود چراغ مشکوک است. سیم چراغ باتری کوتاه به بدنه نخورده؟',
     opts:[{t:'سیم سالم است', end:'شارژ درست است و چراغ مدارش ایراد دارد — نگران شارژ نباش.'},
           {t:'سیم خراب بود', end:'مدار چراغ باتری ایراد داشت و تعمیر شد.'}]},
    {q:'با موتور خاموش، تسمه‌ی آلترناتور را نگاه کن. لق، لیز یا پاره است؟',
     opts:[{t:'بله، مشکل دارد', end:'تسمه‌ی آلترناتور شل یا پاره است.'},
           {t:'نه، تسمه سالم است', end:'آلترناتور، ریگولاتور یا کانکتورهای مدار شارژ مشکوک است.'}]}
   ]},
  {id:'nopower', icon:'⚫', label:'برق کل ماشین قطع است', sys:'سیم‌کشی و کانکتور',
   steps:[
    {q:'قطب‌های باتری شل یا کثیف (سبز/سفید) هستند؟',
     opts:[{t:'بله', go:1},{t:'نه، تمیز و سفت‌اند', go:2}]},
    {q:'قطب‌ها را تمیز و سفت کن. برق برگشت؟',
     opts:[{t:'بله، برق آمد', end:'قطب باتری اتصال نداشت.', learn:'اتصال قطب باتری = ۸۰٪ «برق کل ماشین قطع»ها. اول این، بعد هر چیز دیگر.'},
           {t:'نه', go:2}]},
    {q:'فیوز اصلی کنار باتری (بالای ۶۰ آمپر) را چک کن. سوخته؟',
     opts:[{t:'بله، سوخته', end:'فیوز اصلی سوخته — قبل از تعویض، علتش (اتصال کوتاه) را پیدا کن.'},
           {t:'سالم است', end:'کابل اصلی باتری یا خود باتری مشکوک است.'}]}
   ]},
  {id:'cranksno', icon:'🌀', label:'استارت می‌خورد ولی روشن نمی‌شود', sys:'انژکتور و سوخت',
   steps:[
    {q:'با باز کردن کلید (بدون استارت)، صدای کوتاهی مثل «ووو» از عقب ماشین می‌آید؟ (پمپ بنزین)',
     opts:[{t:'نه، صدایی نیست', end:'مدار پمپ بنزین (فیوز، رله یا خود پمپ) مشکوک است.'},
           {t:'بله، صدا دارد', go:1}]},
    {q:'یک شمع را باز کن و نگاهش کن. تر، دوده‌ای یا خیس از بنزین است؟',
     opts:[{t:'بله', end:'سوخت می‌رسد ولی جرقه یا احتراق مشکل دارد — شمع، کویل یا سنسور کرانک.'},
           {t:'نه، شمع خشک و سالم است', end:'سوخت نمی‌رسد — فشار سوخت، انژکتورها یا فیلتر.'}]}
   ]},
  {id:'shake', icon:'📉', label:'لرزش یا پاس در گاز', sys:'جرقه و احتراق',
   steps:[
    {q:'لرزش در دور آرام هم هست یا فقط موقع گاز دادن؟',
     opts:[{t:'در دور آرام هم می‌لرزد', end:'شمع یا وایر شمع مشکوک است — اول ارزان‌ترین و پرتکرارترین علت.'},
           {t:'فقط با گاز', go:1}]},
    {q:'با گاز ناگهانی، ماشین پاس می‌دهد (لگد می‌زند)؟',
     opts:[{t:'بله، پاس می‌دهد', end:'کویل یا مدار جرقه (و گاهی فیلتر سوخت) مشکوک است.'},
           {t:'نه، فقط ضعیف است', end:'فیلتر سوخت، فشار بنزین یا سنسورها را بررسی کن.'}]}
   ]},
  {id:'fuse', icon:'💥', label:'فیوز مدام می‌سوزد', sys:'سیم‌کشی و کانکتور',
   steps:[
    {q:'از وقتی قطعه یا لوازم جدیدی نصب کردی، این اتفاق افتاده؟',
     opts:[{t:'بله', end:'همان قطعه/نصب مقصر است — بردارش و دوباره امتحان کن. هرگز فیوز ضخیم‌تر نگذار!', learn:'قانون طلایی: فیوز را همیشه با همان آمپر جایگزین کن. فیوز بزرگ‌تر یعنی سیم‌کشی بی‌حافظ.'},
           {t:'نه', go:1}]},
    {q:'فیوز سالم بگذار و بارهای مدار (چراغ‌ها، کولر و...) را یکی‌یکی خاموش کن. با خاموش کردن کدام، فیوز دیگر نمی‌سوزد؟',
     opts:[{t:'پیدا شد', end:'آن مدار اتصال کوتاه دارد — سیم‌کشی همان بار را بررسی کن.'},
           {t:'نمی‌دانم / پیدا نشد', end:'اتصال کوتاه مخفی است؛ مسیر دقیق سیم‌کشی لازم است.'}]}
   ]}
];
let W = null;
function openQuickPath(){
  const grid = WIZ_TREES.map(t =>
    `<button class="wizbtn" onclick="wizStart('${t.id}')"><span class="em">${t.icon}</span><span class="lb">${esc(t.label)}</span></button>`).join('');
  openSheet(`<h2>⚡ مسیر سریع</h2>
    <p class="note">علامت را انتخاب کن؛ چند سؤال ساده می‌پرسم و می‌رویم سر عیب‌یابی دقیق همان سیستم.</p>
    <div class="wizgrid" style="margin-top:var(--sp-2)">${grid}</div>
    <div class="btns"><button class="btn ghost full" onclick="closeSheet()">بستن</button></div>`);
}
function wizStart(treeId){
  const tree = WIZ_TREES.find(t=>t.id===treeId);
  if (!tree) return;
  W = {tree, idx:0, trail:[]};
  closeSheet();
  renderDiag();
  window.scrollTo(0,0);
}
function renderWizard(box){
  const t = W.tree, s = t.steps[W.idx];
  const dots = t.steps.map((_,i)=>`<i class="${i<=W.idx?'on':''}"></i>`).join('');
  box.innerHTML = `<div class="wiz">
    <div class="whead"><b>${t.icon} ${esc(t.label)}</b><span class="wdots">${dots}</span></div>
    <div class="wq">${esc(s.q)}</div>
    ${s.opts.map((o,i)=>`<button class="wopt" onclick="wizPick(${i})">${esc(o.t)}</button>`).join('')}
    <div class="btns">
      ${W.trail.length ? '<button class="btn ghost sm" onclick="wizBack()">بازگشت</button>' : ''}
      <button class="btn muted sm" onclick="W=null;renderDiag()">انصراف</button>
    </div></div>`;
}
function wizPick(i){
  const s = W.tree.steps[W.idx], o = s.opts[i];
  W.trail.push({q:s.q, a:o.t});
  if (o.end !== undefined){
    W.result = o.end; W.learn = o.learn || '';
    renderDiag();
    return;
  }
  W.idx = o.go;
  renderDiag();
}
function wizBack(){
  W.trail.pop();
  W.idx = Math.max(0, W.idx - 1);
  renderDiag();
}
function renderWizardEnd(box){
  const t = W.tree, res = W.result;
  const sys = t.sys || 'سایر';
  const car = activeCar();
  box.innerHTML = `<div class="wiz wend">
    <div class="whead"><b>✅ نتیجه‌ی مسیر سریع</b></div>
    <div class="wres">${esc(res)}</div>
    ${W.learn ? `<div class="wlearn">💡 نکته‌ی یادگیری: ${esc(W.learn)}</div>` : ''}
    <div class="note">سیستم: ${esc(sys)}${car ? ' · خودرو: ' + esc(car.name) : ''}</div>
    <div class="btns">
      <button class="btn" onclick="wizToDiag()">شروع عیب‌یابی دقیق ⚡</button>
      <button class="btn ghost" onclick="W=null;openQuickPath()">علامت دیگر</button>
    </div></div>`;
}
async function wizToDiag(){
  const t = W.tree;
  const sym = t.label + ' — ' + (W.result || '');
  const sys = t.sys || 'سایر';
  const car = activeCar();
  W = null;
  await startDiagFrom(car ? car.name : '', sys, sym, '', car ? car.id : '');
}

/* ==================== لغتنامه ==================== */
const GLOSSARY = {
  'آلترناتور':'دینام. برق ماشین را با چرخش موتور تولید می‌کند و باتری را شارژ می‌کند. اگر خراب شود، چراغ باتری روشن می‌شود و باتری خالی می‌ماند.',
  'ریگولاتور':'تنظیم‌کننده‌ی ولتاژ آلترناتور. جلوی بالا رفتن ولتاژ از حد مجاز را می‌گیرد تا باتری و قطعات نسوزند.',
  'استارتر':'موتور استارت. با برق باتری، موتور ماشین را می‌چرخاند تا روشن شود.',
  'سولنوئید':'کلید مغناطیسی سر استارتر. دو کار می‌کند: چرخ‌دنده‌ی استارتر را به فلایویل می‌چسباند و جریان قوی را وصل می‌کند.',
  'کویل':'ترانس جرقه. ولتاژ باتری (۱۲ ولت) را به هزاران ولت می‌رساند تا بین شمع جرقه بزند.',
  'شمع':'قطعه‌ای که جرقه را داخل سیلندر می‌زند تا مخلوط بنزین و هوا منفجر شود.',
  'وایر شمع':'سیم‌های پرفشار وصل‌کننده‌ی کویل به شمع. خرابی‌شان باعث پاس و لرزش می‌شود.',
  'انژکتور':'قطعه‌ای که بنزین را به‌صورت پودر ریز داخل موتور می‌پاشد. مثل اسپری بنزین.',
  'پمپ بنزین':'بنزین را از باک به سمت انژکتورها می‌فرستد. روشن شدن کلید، صدای کوتاهش را می‌شنوی.',
  'سنسور':'چشم و گوش ECU. اطلاعات (دما، دور موتور، هوا و...) را می‌گیرد و به کامپیوتر ماشین می‌فرستد.',
  'کرانک':'سنسور دور موتور. می‌گوید میل‌لنگ کجاست. اگر پالس ندهد، ECU جرقه و بنزین نمی‌دهد و ماشین روشن نمی‌شود.',
  'کم‌شافت':'سنسور میل‌سوپاپ. موقعیت سوپاپ‌ها را به ECU می‌گوید.',
  'اتصال بدنه':'گراند. مسیر برگشت جریان به منفی باتری. اگر شل یا زنگ‌زده باشد، قطعه برق نمی‌گیرد یا ضعیف کار می‌کند.',
  'اتصال کوتاه':'شورت. وقتی سیم برق‌دار مستقیم به بدنه یا سیم دیگر بخورد؛ معمولاً فیوز را می‌سوزاند.',
  'فیوز':'محافظ مدار. اگر جریان زیاد شود می‌سوزد تا سیم‌کشی نسوزد. همیشه با فیوز هم‌آمپر جایگزین کن.',
  'رله':'کلید برقی کوچک. با جریان کم، مدار جریان قوی را وصل/قطع می‌کند (مثل مدار پمپ بنزین و استارت).',
  'مولتی‌متر':'دستگاه اندازه‌گیری. سه حالت اصلی: ولت (V)، اهم (Ω - مقاومت)، آمپر (A - جریان).',
  'پروب':'سیم‌های تست مولتی‌متر. قرمز = مثبت، مشکی = منفی/بدنه.',
  'دیاگ':'دستگاه عیب‌یابی که به سوکت OBD وصل می‌شود و کد خطاها و داده‌های زنده‌ی ECU را نشان می‌دهد.',
  'ECU':'کامپیوتر ماشین. اطلاعات سنسورها را می‌خواند و جرقه، بنزین و ... را کنترل می‌کند.',
  'دور ریگ':'نامنظم چرخیدن موتور در دور آرام؛ بالا پایین پریدن عقربه‌ی دور موتور.',
  'پاس':'لگد زدن موتور موقع گاز دادن؛ معمولاً از مدار جرقه یا سوخت است.',
  'دلکو':'توزیع‌کننده‌ی جرقه در موتورهای قدیمی. جرقه را بین شمع‌ها پخش می‌کند.',
  'تسمه':'نوار لاستیکی که آلترناتور و سایر متعلقات را به موتور وصل و می‌چرخاند.',
  'کانکتور':'سوکت/فیش وصل سیم‌ها. اکسید شدن یا شل بودنش شایع‌ترین علت خرابی‌های برقی است.',
  'لامبدا':'سنسور اکسیژن دود. می‌گوید مخلوط سوخت چرب است یا لاغر تا ECU تنظیمش کند.',
  'بلوور':'فن کولر کابین. هوای گرم/سرد را داخل ماشین می‌فرستد.',
  'شیشه بالابر':'موتور برقی بالا-پایین کردن شیشه. اگر برق می‌گیرد ولی نمی‌چرخد، موتور یا ریلش مشکل دارد.'
};
const GLOSS_KEYS = Object.keys(GLOSSARY).sort((a,b)=>b.length-a.length);
function openGlossary(term){
  if (term && GLOSSARY[term]){
    return openSheet(`<h2>${esc(term)}</h2>
      <div class="det-body">${esc(GLOSSARY[term])}</div>
      <div class="btns"><button class="btn ghost full" onclick="openGlossary()">همه‌ی واژه‌ها</button>
      <button class="btn" onclick="closeSheet()">فهمیدم</button></div>`);
  }
  const items = Object.entries(GLOSSARY).map(([t,d]) =>
    `<div class="card" style="margin-bottom:var(--sp-2)"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('');
  openSheet(`<h2>📖 لغتنامه‌ی فنی</h2><p class="note">هر اصطلاح نقطه‌چین‌شده در قدم‌های عیب‌یابی را لمس کن.</p>
    <input class="fld" id="glos-q" type="search" placeholder="جستجوی واژه..." style="margin-top:var(--sp-2)" oninput="glosFilter(this.value)">
    <div id="glos-list" style="margin-top:var(--sp-2)">${items}</div>
    <div class="btns"><button class="btn ghost full" onclick="closeSheet()">بستن</button></div>`);
}
function glosFilter(q){
  q = (q||'').trim().toLowerCase();
  document.querySelectorAll('#glos-list .card').forEach(c => {
    c.style.display = !q || c.textContent.toLowerCase().includes(q) ? 'block' : 'none';
  });
}
function glossify(html){
  let out = html;
  for (const k of GLOSS_KEYS){
    if (out.includes(k)){
      out = out.replace(new RegExp(k, 'g'), `<span class="gterm" data-g="${esc(k)}">${k}</span>`);
    }
  }
  return out;
}
function bindGloss(root){
  root.querySelectorAll('.gterm').forEach(el => {
    el.onclick = e => { e.stopPropagation(); openGlossary(el.dataset.g); };
  });
}

/* ==================== تور ==================== */
const TOUR = [
  {em:'⚡', t:'سلام! من استاد برق خودروی خودت هستم', p:'هرچه یاد بگیری و منبع اضافه کنی، همین گوشی دانش‌نامه‌ی شخصی خودت می‌شود — آفلاین هم کار می‌کند.'},
  {em:'🔍', t:'عیب‌یابی قدم‌به‌قدم', p:'علامت را با کلمات خودت بنویس یا از «مسیر سریع» شروع کن. من شواهد می‌خواهم، اندازه‌گیری را با مرجع مقایسه می‌کنم و حدس نمی‌زنم.'},
  {em:'🔧', t:'کارگاه عملی', p:'درس‌های عملی با ابزار، استادکار راهنما، ثبت تمرین‌ها و سنجش تسلط — تب «کارگاه» پایین صفحه.'},
  {em:'🚗', t:'گاراژ — ماشین‌های تو', p:'خودروها را اضافه کن؛ نکات و جلسات به همان خودرو وصل می‌شوند تا عدد مرجع اشتباه نگیری.'},
  {em:'🧠', t:'مرور فاصله‌دار — یاد نرو', p:'از نکات تأییدشده فلش‌کارت می‌سازم: ۱، ۳، ۷ و ۲۱ روز بعد دوباره می‌پرسم تا در ذهنت حک شود.'}
];
function openTour(){
  let i = 0;
  openSheet(`<div class="tour" style="position:static;background:none;padding:0">
    <div class="tour-card" style="background:var(--bg-input)">
      <div class="em" id="tourEm"></div><h3 id="tourT"></h3><p id="tourP"></p>
      <div class="tour-dots">${TOUR.map((_,d)=>`<i class="${d===0?'on':''}"></i>`).join('')}</div>
      <div class="btns">
        <button class="btn ghost" id="tourPrev" style="display:none">قبلی</button>
        <button class="btn" id="tourNext">بعدی</button>
        <button class="btn ghost" onclick="closeSheet()">رد کردن</button>
      </div>
    </div></div>`);
  const draw = () => {
    $('tourEm').textContent = TOUR[i].em;
    $('tourT').textContent = TOUR[i].t;
    $('tourP').textContent = TOUR[i].p;
    document.querySelectorAll('.tour-dots i').forEach((d,k)=>d.classList.toggle('on',k===i));
    $('tourPrev').style.display = i ? 'block' : 'none';
    $('tourNext').textContent = i === TOUR.length-1 ? 'شروع کنیم ⚡' : 'بعدی';
  };
  draw();
  $('tourNext').onclick = () => {
    if (i === TOUR.length-1){ closeSheet(); localStorage.setItem('aem-tour','1'); }
    else { i++; draw(); }
  };
  $('tourPrev').onclick = () => { i = Math.max(0,i-1); draw(); };
}

/* ==================== راهنمای ابزار ==================== */
function openToolGuide(){
  openSheet(`<h2>🔧 راهنمای مولتی‌متر</h2>
    <p class="note">مبتدی هستی؟ این پنج قانون را حفظ کن:</p>
    <div class="help"><b>۱) انتخاب حالت:</b> ولتاژ DC (علامت V با خط پیوسته) برای باتری و مدار ماشین. اهم (Ω) فقط با مدار کاملاً خاموش. آمپر (A) فقط سری — اول یاد بگیری، بعد بزن.</div>
    <div class="help"><b>۲) اتصال پروب‌ها:</b> مشکی همیشه به بدنه یا منفی. قرمز به نقطه‌ای که می‌خواهی اندازه بگیری. اتصال بدنه‌ی تمیز = عدد واقعی.</div>
    <div class="help"><b>۳) خواندن ولتاژ باتری:</b> موتور خاموش: حدود ۱۲٫۵ ولت. موتور روشن: ۱۳٫۸ تا ۱۴٫۴ ولت (شارژ). کمتر = مشکل شارژ، خیلی بیشتر = ریگولاتور.</div>
    <div class="help"><b>۴) تست اتصال بدنه:</b> حالت اهم، بین نقطه‌ی شک‌برانگیز و بدنه: عدد نزدیک صفر = مسیر سالم. عدد بالا یا بی‌نهایت = اتصال بدنه‌ی ضعیف.</div>
    <div class="help"><b>۵) قبل از هر اندازه‌گیری:</b> گستره‌ی دستگاه را بالاتر از مقدار مورد انتظار بگذار. شک داری، اول منفی را جدا کن.</div>
    <div class="ocrwarn">🔒 هرگز مدار ایربگ و ولتاژ بالای هیبرید را با مولتی‌متر اندازه نگیر.</div>
    <div class="btns"><button class="btn ghost full" onclick="closeSheet()">فهمیدم</button></div>`);
}

/* ==================== پروفایل مهارتی اپ ==================== */
let skill = {ev:[]};
try { skill = JSON.parse(localStorage.getItem('aem-skill')||'{"ev":[]}'); } catch {}
function skLog(type, ref){
  skill.ev.push({t:Date.now(), type, ref:ref||''});
  skill.ev = skill.ev.slice(-300);
  localStorage.setItem('aem-skill', JSON.stringify(skill));
}
function skCount(type){ return skill.ev.filter(e=>e.type===type).length; }
function renderSkill(){
  const a = skCount('solved_alone'), h = skCount('solved_with_hint'), t = skCount('answer_taken'),
        sk = skCount('skip'), rp = skCount('repeat'), ex = skCount('exercise_ok'), exb = skCount('exercise_bad'),
        sc = skCount('scenario_ok'), scb = skCount('scenario_bad'),
        rok = skCount('srs_ok'), rbad = skCount('srs_bad');
  const strengths = [], weak = [];
  if (a >= 3) strengths.push('حل قدم‌ها بدون کمک (' + fa(a) + ' بار)');
  if (ex >= 2) strengths.push('پاسخ درست به تمرین عددی (' + fa(ex) + ' بار)');
  if (sc >= 2) strengths.push('تشخیص درست فرضیه در سناریو (' + fa(sc) + ' بار)');
  if (rok >= 3) strengths.push('مرور فاصله‌دار (' + fa(rok) + ' پاسخ درست)');
  if (sk >= 3) weak.push('رد کردن زیاد قدم‌ها (' + fa(sk) + ' بار)');
  if (t >= 2) weak.push('نیاز به راهنمایی کامل (' + fa(t) + ' بار)');
  if (rp >= 2) weak.push('تکرار یک سؤال (' + fa(rp) + ' بار)');
  if (exb >= 2) weak.push('خطا در تمرین عددی (' + fa(exb) + ' بار)');
  if (scb >= 2) weak.push('خطا در سناریو (' + fa(scb) + ' بار)');
  if (rbad >= 3) weak.push('فراموشی زیاد در مرور (' + fa(rbad) + ' بار)');
  $('skillBox').innerHTML = skill.ev.length
    ? `<div class="row"><span>بدون کمک</span><b>${fa(a)}</b></div>
       <div class="row"><span>با راهنمایی</span><b>${fa(h)}</b></div>
       <div class="row"><span>جواب را گرفتم</span><b>${fa(t)}</b></div>
       <div class="row"><span>مرور فاصله‌دار</span><b>${fa(rok)}✓${rbad?' · '+fa(rbad)+'✗':''}</b></div>
       <div class="row"><span>تمرین عددی / سناریو</span><b>${fa(ex)}✓${exb?' · '+fa(exb)+'✗':''} | ${fa(sc)}✓${scb?' · '+fa(scb)+'✗':''}</b></div>
       <div class="line"><b>قوت:</b> ${strengths.length ? esc(strengths.join('، ')) : 'هنوز داده نیست'}</div>
       <div class="line"><b>ضعف:</b> ${weak.length ? esc(weak.join('، ')) : 'موردی ثبت نشده'}</div>`
    : '<div class="note">هنوز چیزی ثبت نشده.</div>';
}
function delSkill(){
  if (!confirm('پروفایل مهارتی پاک شود؟')) return;
  skill = {ev:[]}; localStorage.setItem('aem-skill', JSON.stringify(skill)); renderSkill(); toast('پاک شد');
}

/* ==================== تمرین ==================== */
async function openExercise(){
  if (Math.random() < .5){
    const c = CAUSAL[Math.floor(Math.random()*CAUSAL.length)];
    return scenarioExercise(c);
  }
  const all = (await getLiveUnits()).filter(u=>findRef(u.body) && u.srcType!=='inference');
  if (!all.length){
    const c = CAUSAL[Math.floor(Math.random()*CAUSAL.length)];
    return scenarioExercise(c);
  }
  const u = all[Math.floor(Math.random()*all.length)], r = findRef(u.body);
  const inside = Math.random() < .5, span = r.hi - r.lo || 1;
  const v = inside ? +(r.lo + span*Math.random()).toFixed(1) : +(r.hi + span*(.3+Math.random())).toFixed(1);
  const right = v >= r.lo && v <= r.hi;
  window._ex = {right, uid:u.id};
  openSheet(`<h2>تمرین عددی</h2>
    <p>طبق نکته‌ی «${esc(u.title)}»، اگر اندازه‌گیری شد <span class="val">${fa(v)} ${UFA[r.unit]}</span>، در محدوده‌ی مرجع است؟</p>
    <div class="meta">منبع: ${esc(u.srcName)} · ${esc(u.page)}</div>
    <div class="btns"><button class="btn" onclick="exAns(true)">در محدوده است</button>
    <button class="btn ghost" onclick="exAns(false)">خارج از محدوده است</button></div>
    <div id="exRes"></div>`);
}
function exAns(a){
  const ok = a === window._ex.right;
  skLog(ok ? 'exercise_ok' : 'exercise_bad', window._ex.uid);
  $('exRes').innerHTML = `<div class="help">${ok ? 'درسته ✓' : 'نه.'} مقایسه را همیشه با مقدار مرجع منبع انجام بده.</div>
    <div class="btns"><button class="btn ghost" onclick="closeSheet();renderSkill()">بستن</button></div>`;
}
function scenarioExercise(c){
  const correct = c.causes[0];
  const pool = [];
  for (const o of CAUSAL) if (o.sys !== c.sys) pool.push(...o.causes.slice(0,2).map(x=>x.c));
  const wrongs = [];
  while (wrongs.length < 2 && pool.length){
    const p = pool.splice(Math.floor(Math.random()*pool.length),1)[0];
    if (!wrongs.includes(p)) wrongs.push(p);
  }
  const opts = [correct.c, ...wrongs].sort(()=>Math.random()-.5);
  window._sc = {correct: correct.c, sys: c.sys, test: correct.t, opts};
  openSheet(`<h2>تمرین سناریویی</h2>
    <p>علامت: <b>«${esc(c.kws[0])}»</b> در سیستم <b>${esc(c.sys)}</b>.<br>به‌عنوان اولین مسیر بررسی، روی کدام فرضیه متمرکز می‌شوی؟</p>
    ${opts.map((o,i)=>`<div class="btns" style="margin-top:6px"><button class="btn ghost full" onclick="scAns(${i})">${fa(i+1)}) ${esc(o)}</button></div>`).join('')}
    <div id="scRes"></div>`);
}
function scAns(i){
  const {correct, sys, test, opts} = window._sc;
  const ok = opts[i] === correct;
  skLog(ok ? 'scenario_ok' : 'scenario_bad', sys);
  $('scRes').innerHTML = `<div class="help">${ok ? 'دقیقاً ✓ ' : 'نه. '}<b>مسیر درست اول:</b> ${esc(correct)}<br><span style="color:var(--text-secondary)">تست تفکیک‌کننده: ${esc(test)}</span></div>
    <div class="btns"><button class="btn ghost" onclick="closeSheet();renderSkill()">بستن</button></div>`;
}

/* ==================== نصب اپ ==================== */
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
function doInstall(){
  if (deferredInstall){ deferredInstall.prompt(); deferredInstall = null; return; }
  $('installTxt').textContent = 'الان از منوی Chrome نصب کن.';
}

/* ==================== ناوبری ==================== */
function go(name){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('s-' + name).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.t === name));
  window.scrollTo(0, 0);
  if (name === 'kb'){ renderGarageNames(); renderList(); }
  if (name === 'chat'){ renderChat(); renderQChips(); scrollChat(); }
  if (name === 'set'){ renderGaps(); renderSkill(); renderJobs(); renderRoute(); renderML(); renderHealth(); renderPerf(); renderMapSources(); renderCleanBox(); renderStats(); renderHistory(); renderGarageSet(); renderSRSSetBox(); renderBackupCard(); }
  if (name === 'home'){ renderLearnCard(); renderSRSCard(); renderBackupCard(); }
  if (name === 'diag'){ renderGarageNames(); renderDiag(); }
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => go(t.dataset.t)));

(function(){
  const h = new Date().getHours();
  let g = 'شب بخیر! امشب سراغ کدوم مدار بریم؟ ⚡';
  if (h >= 5 && h < 12) g = 'صبح بخیر! امروز کدوم عیب رو شکار کنیم؟ ⚡';
  else if (h >= 12 && h < 17) g = 'ظهر بخیر! کارگاه چه خبره؟ ⚡';
  else if (h >= 17 && h < 21) g = 'عصر بخیر! بریم سراغ مدار بعدی ⚡';
  $('greet').textContent = g;
})();

/* ==================== اتصال و حافظه ==================== */
let BATT = null;
if (navigator.getBattery){
  navigator.getBattery().then(b => {
    BATT = b;
    const show = () => { $('battery').textContent = 'باتری: ' + fa(Math.round(b.level*100)) + '٪' + (b.charging ? ' ⚡' : ''); updateNet(); };
    show(); b.addEventListener('levelchange', show); b.addEventListener('chargingchange', show);
  });
} else $('battery').style.display = 'none';

function routeState(){
  const on = navigator.onLine;
  if (on && ML.ready && SET.mlUse) return {key:'online_ml', label:'آنلاین + مدل محلی', note:'جواب‌ها با مدل روی همین گوشی از دانش‌نامه ساخته می‌شوند.'};
  if (on) return {key:'online', label:'آنلاین (جستجوی دانش‌نامه)', note:'مدل محلی نصب نشده؛ جستجوی مستقیم.'};
  if (ML.ready && SET.mlUse) return {key:'offline_ml', label:'آفلاین + مدل محلی', note:'آفلاینیم؛ از دانش و مدل روی همین گوشی استفاده می‌کنم.'};
  return {key:'offline', label:'آفلاین (جستجوی دانش‌نامه)', note:'آفلاینیم و مدل نصب نیست؛ سؤال‌های بی‌جواب ثبت می‌شوند.'};
}
function updateNet(){
  const r = routeState();
  const on = navigator.onLine;
  $('modePill').classList.toggle('off', !on);
  $('modeText').textContent = on ? 'آنلاین' : 'آفلاین';
  $('setMode').textContent = on ? 'آنلاین' : 'آفلاین';
  $('routeMode').textContent = r.label;
  $('routeNote').textContent = r.note;
}
addEventListener('online', updateNet); addEventListener('offline', updateNet);

const mb = n => fa((n/1048576).toFixed(1)) + ' مگابایت';
async function updateStorage(){
  if (!navigator.storage || !navigator.storage.estimate) return;
  const {usage=0, quota=0} = await navigator.storage.estimate();
  const pct = quota ? Math.min(100, usage/quota*100) : 0;
  $('storBar').style.width = pct + '%';
  $('storText').textContent = 'حافظه ' + fa(pct.toFixed(1)) + '٪';
  $('setUsed').textContent = mb(usage);
  $('setQuota').textContent = fa((quota/1073741824).toFixed(1)) + ' گیگابایت';
  if (navigator.storage.persisted){
    const p = await navigator.storage.persisted();
    $('setPersist').textContent = p ? 'فعال ✓' : 'غیرفعال';
  }
}
async function askPersist(){
  if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  updateStorage();
}
updateStorage();

/* ==================== دیتابیس v6 (مشترک با کارگاه) ==================== */
let db;
function openDB(){
  return new Promise((res, rej) => {
    const r = indexedDB.open('aem-db', 6);
    r.onupgradeneeded = () => {
      const d = r.result;
      ['units','gaps','sessions','jobs','cars','lessons','skills','wlog','vehicles','research','guide'].forEach(n => {
        if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, {keyPath:'id', autoIncrement:true});
      });
    };
    r.onsuccess = () => { db = r.result; res(); };
    r.onerror = () => rej(r.error);
  });
}
const st = (n,m) => db.transaction(n, m).objectStore(n);
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const getAllRaw = () => req(st('units','readonly').getAll());
const getAll = async () => (await getAllRaw()).filter(u => u.review !== 'pending' && u.review !== 'rejected');
const getOne = id => req(st('units','readonly').get(id));
const putUnit = u => req(st('units','readwrite').put(u));

/* کش واحد‌های زنده */
let LIVE_CACHE = null, LIVE_AT = 0;
function invalidateCaches(){ LIVE_CACHE = null; DUP_IDX = null; }
async function getLiveUnits(){
  if (LIVE_CACHE) return LIVE_CACHE;
  LIVE_CACHE = (await getAllRaw()).filter(u => !u.hidden && u.review !== 'pending' && u.review !== 'rejected');
  LIVE_AT = Date.now();
  return LIVE_CACHE;
}
async function saveU(u){ invalidateCaches(); return putUnit(u); }

let DUP_IDX = null;
async function ensureDupIndex(){
  if (!DUP_IDX) DUP_IDX = {fps:new Set(), bodies:new Set(), ready:false};
  if (!DUP_IDX.ready){
    const raw = await getAllRaw();
    for (const u of raw){
      if (u.hidden || u.review === 'rejected') continue;
      if (u.fp) DUP_IDX.fps.add(u.fp);
      DUP_IDX.bodies.add(norm(u.body).replace(/\s/g,''));
    }
    DUP_IDX.ready = true;
  }
  return DUP_IDX;
}
async function isDuplicate(body){
  const idx = await ensureDupIndex();
  const f = fp(body), bare = norm(body).replace(/\s/g,'');
  return idx.fps.has(f) || idx.bodies.has(bare);
}
const getGaps = () => req(st('gaps','readonly').getAll());
const addGap = g => req(st('gaps','readwrite').put(g));
const getSessions = () => req(st('sessions','readonly').getAll());
const putSession = s => req(st('sessions','readwrite').put(s));
const getJobs = () => req(st('jobs','readonly').getAll());
const putJob = j => req(st('jobs','readwrite').put(j));
const delJob = id => req(st('jobs','readwrite').delete(id));
const clearStore = n => req(st(n,'readwrite').clear());

const SYSTEMS = ['شارژ','استارت','جرقه و احتراق','انژکتور و سوخت','سنسورها','ECU','روشنایی','سیم‌کشی و کانکتور','کولر و برقی‌ها','ایربگ (SRS)','سایر'];
const SRC = {official:'رسمی', training:'آموزشی', practitioner:'تجربی', user:'کاربر', inference:'استنباطی'};
let fSystem = '', fText = '', fQuick = '';

/* ==================== موتور جستجو ==================== */
const norm = s => String(s||'').toLowerCase()
  .replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200f]/g,' ')
  .replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const STOP = new Set('و در به از که را این آن با برای چی چیه چرا چطور چگونه چقدر چند است هست باید می شود میشه میشود کنم کنیم کرد کن بگو بده یه یک من ما تو اگه اگر هم یا اما ولی بعد قبل وقتی خیلی چیست کدام کجا کی چه'.split(' '));
function tokens(s){
  return norm(s).split(/\s+/).filter(t => t.length>=2 && !STOP.has(t))
    .map(t => t.replace(/(ها|های)$/,'')).filter(t=>t.length>=2);
}
function score(u, toks){
  const T = norm(u.title), B = norm(u.body), M = norm([u.car,u.system,u.srcName].join(' '));
  let s = 0, hit = 0;
  for (const t of toks){
    let h = 0;
    if (T.includes(t)) h += 3;
    if (B.includes(t)) h += 1.5;
    if (M.includes(t)) h += 1;
    if (h) hit++;
    s += h;
  }
  return {s: s + hit*1.5, hit};
}
const DANGER = [
  {k:['ایربگ','airbag','srs','کیسه هوا'], t:'مدار ایربگ (SRS) را هرگز با مولتی‌متر یا لامپ تست اندازه‌گیری نکن. فقط توسط تعمیرکار مجاز و با دستگاه دیاگ.'},
  {k:['ولتاژ بالا','نارنجی','هیبرید','برقی کامل','hv'], t:'سیستم‌های ولتاژ بالا (کابل نارنجی) خطر جانی دارند. بازکردن یا اندازه‌گیری‌شان فقط برای تعمیرکار دارای گواهی است.'}
];
function safetyFor(q){
  const n = norm(q);
  return DANGER.filter(d => d.k.some(k => n.includes(norm(k))));
}
function hl(s){
  return esc(s).replace(/([\d۰-۹]+(?:[٫.][\d۰-۹]+)?(?:\s*(?:تا|-|–)\s*[\d۰-۹]+(?:[٫.][\d۰-۹]+)?)?\s*(?:ولت|اهم|آمپر|هرتز|میلی‌آمپر|میلی‌ولت|V|Ω|A|Hz))/g,'<span class="val">$1</span>');
}

/* ==================== تصحیح املایی بزرگ ==================== */
function lev(a, b){
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({length:n+1}, (_,i)=>i), cur = new Array(n+1);
  for (let i=1;i<=m;i++){
    cur[0]=i;
    for (let j=1;j<=n;j++){
      cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1] + (a[i-1]===b[j-1]?0:1));
    }
    [prev,cur] = [cur,prev];
  }
  return prev[n];
}
const DOMAIN_KW = ['ولت','ولتاژ','اهم','مقاومت','آمپر','جریان','فیوز','رله','باتری','دینام','آلترناتور',
  'استارتر','کویل','شمع','انژکتور','پمپ بنزین','سنسور','مولتی‌متر','مدار','سیم','کانکتور','اتصال',
  'خودرو','موتور','برق','پروب','دیاگ','ECU','اتصال بدنه','شارژ','استارت','جرقه','دور موتور',
  'تسمه','سوئیچ','هارنس','سوکت','پین','تست','اندازه','ریگولاتور','سولنوئید','کرانک','کمپرسور','لامبدا','هرتز','میلی‌آمپر'];
const DOMAIN_KW_N = DOMAIN_KW.map(k => norm(k));
const TYPOS = {
  'الترناتور':'آلترناتور','اترناتور':'آلترناتور','الترنیتر':'آلترناتور','اترنیتر':'آلترناتور',
  'آلترنیتر':'آلترناتور','دینام شارژ':'آلترناتور','دینام ماشین':'دینام',
  'ریگلاتور':'ریگولاتور','رگولاتور':'ریگولاتور','ریگولیتور':'ریگولاتور',
  'باتری ماشین':'باتری','بتری':'باتری',
  'فوز':'فیوز','فییوز':'فیوز','ریله':'رله',
  'سویچ':'سوئیچ','سویچ استارت':'سوئیچ استارت',
  'ستارتر':'استارتر','استارتور':'استارتر','استارتر ماشین':'استارتر',
  'سولونوئید':'سولنوئید','سولنویید':'سولنوئید','سلنوئید':'سولنوئید',
  'کوئل':'کویل','کویل ماشین':'کویل','شمع ماشین':'شمع','شمعها':'شمع‌ها',
  'دیلکو':'دلکو','دلکو ماشین':'دلکو',
  'انجکتور':'انژکتور','انژكتور':'انژکتور','انژکتور ماشین':'انژکتور',
  'پمپ بنز':'پمپ بنزین','بنز پمپ':'پمپ بنزین','فیلتر بنز':'فیلتر بنزین',
  'سنسر':'سنسور','سنسور ماشین':'سنسور',
  'کرانک شفت':'کرانک','کرانک شافت':'کرانک','کم شفت':'کم‌شافت',
  'اکسیجن':'اکسیژن','کنکتور':'کانکتور','کانكتور':'کانکتور',
  'مولتی متر':'مولتی‌متر','مولتیمتر':'مولتی‌متر','مالتی متر':'مولتی‌متر',
  'سیم کشی':'سیم‌کشی','سیمکشی':'سیم‌کشی','هارنس سیم':'هارنس',
  'ای سی یو':'ECU','ایسیو':'ECU','ای‌سیو':'ECU','کامپیوتر ماشین':'ECU',
  'دیآگ':'دیاگ','پروب ها':'پروب‌ها',
  'گراند':'اتصال بدنه','گرند':'اتصال بدنه','گراند بدنه':'اتصال بدنه','زمین مدار':'اتصال بدنه',
  'شورت':'اتصال کوتاه','شورت شده':'اتصال کوتاه شده','ااتصال':'اتصال','اتصال کوتاهی':'اتصال کوتاه',
  'امپر':'آمپر','اوم':'اهم','میلی امپر':'میلی‌آمپر','کیلو اهم':'کیلواهم','ولتمتر':'ولت‌متر',
  'شارژ نمیکنه':'شارژ نمی‌کند','شارژ نمیشه':'شارژ نمی‌شود','شارژ نمیده':'شارژ نمی‌دهد',
  'استارت نمیخوره':'استارت نمی‌خورد','استارت نمی‌خوره':'استارت نمی‌خورد','استارت نمیزنه':'استارت نمی‌خورد',
  'روشن نمیشه':'روشن نمی‌شود','روشن نمیزنه':'روشن نمی‌شود','کار نمیکنه':'کار نمی‌کند','کار نمی‌کنه':'کار نمی‌کند',
  'میچرخه':'می‌چرخد','نمیچرخه':'نمی‌چرخد','می‌چرخه':'می‌چرخد','نمی‌چرخه':'نمی‌چرخد',
  'می‌سوزه':'می‌سوزد','میسوزه':'می‌سوزد','نمی‌سوزه':'نمی‌سوزد',
  'می‌پره':'می‌پرد','میپره':'می‌پرد','پریده':'سوخته',
  'می‌رسه':'می‌رسد','نمی‌رسه':'نمی‌رسد','میرسه':'می‌رسد','نمیرسه':'نمی‌رسد',
  'میاد':'می‌آید','نمیاد':'نمی‌آید','می‌یاد':'می‌آید',
  'نمیزنه':'نمی‌زند','می‌زنه':'می‌زند','میزنه':'می‌زند',
  'قطع وصلی':'قطع و وصل','قطع و وصلی':'قطع و وصل',
  'بالا نمیاد':'بالا نمی‌آید','نمیکنه':'نمی‌کند','نمیشه':'نمی‌شود','نمیده':'نمی‌دهد'
};
function correctTypos(text){
  let t = String(text||'');
  for (const [a,b] of Object.entries(TYPOS)){
    t = t.replace(new RegExp('(^|[\\s،.؛:؟!()«»])' + a + '($|[\\s،.؛:؟!()«»])', 'g'), '$1' + b + '$2');
  }
  t = t.replace(/\s+([،.؛:؟!])/g, '$1');
  const words = t.split(/(\s+)/);
  const fixed = words.map(w => {
    if (/^\s+$/.test(w)) return w;
    if (/\d/.test(w)) return w;
    const nw = norm(w).replace(/(ها|های)$/,'');
    if (nw.length < 4) return w;
    if (DOMAIN_KW_N.includes(nw) || STOP.has(nw)) return w;
    let best = null, bestD = 99;
    for (const k of DOMAIN_KW_N){
      if (k.length < 4) continue;
      const d = lev(nw, k);
      if (d > 0 && d <= (nw.length >= 7 ? 2 : 1) && d < bestD){ best = k; bestD = d; }
    }
    return best ? w.replace(new RegExp(nw.split('').join('.?').replace(/[\\^$*+?()[\]{}|]/g,'\\$&'),'i'), best) || best : w;
  });
  return fixed.join('');
}

/* ==================== هم‌معنی‌ها ==================== */
const ALIAS = {
  'نمی‌زنه':'روشن نمی‌شود','نمی زنه':'روشن نمی‌شود',
  'استارت نمی‌زنه':'استارت نمی‌خورد','استارت نمی زنه':'استارت نمی‌خورد',
  'برق نداره':'قطع برق','برق ندارد':'قطع برق','برقش قطعه':'قطع برق','برقش قطع است':'قطع برق',
  'برق قطع':'قطع برق','برق نمیاد':'قطع برق','برق نمی‌آید':'قطع برق',
  'می‌خاموشه':'خاموش می‌شود','خاموش میشه':'خاموش می‌شود','خاموش می‌کنه':'خاموش می‌شود',
  'ریپ می‌زنه':'لرزش دارد','ریپ می‌زند':'لرزش دارد','شورون می‌کنه':'لرزش دارد','شورونه':'لرزش دارد',
  'پاس می‌ده':'پاس می‌کند','پاس میده':'پاس می‌کند',
  'دور ریگه':'دور ریگ','دور ریگ داره':'دور ریگ',
  'گیر می‌کنه':'گیر می‌کند',
  'کپ می‌کنه':'خفه می‌شود','کپ می‌کند':'خفه می‌شود',
  'بنزین نمی‌رسه':'سوخت نمی‌رسد','بنز نمی‌رسه':'سوخت نمی‌رسد','بنزین نمی‌رسد':'سوخت نمی‌رسد',
  'شمارژ':'شارژ','شارژ نمی‌گیره':'شارژ نمی‌شود','دینام نمی‌ده':'آلترناتور شارژ نمی‌کند',
  'باتری خالی میشه':'باتری تخلیه می‌شود','باتری خالی می‌کنه':'باتری تخلیه می‌شود',
  'فیوزش می‌پره':'فیوز می‌سوزد','فیوز می‌پره':'فیوز می‌سوزد','فیوز پریده':'فیوز سوخته',
  'بوق نمی‌زنه':'بوق نمی‌زند',
  'شیشه بالا نمیاد':'شیشه بالابر کار نمی‌کند','شیشه بالا نمی‌یاد':'شیشه بالابر کار نمی‌کند',
  'چراغ روشن نمیشه':'چراغ روشن نمی‌شود','لایت نمی‌سوزه':'لایت نمی‌سوزد',
  'کولر سرد نمی‌کنه':'کولر سرد نمی‌کند','کولر نمی‌زنه':'کولر کار نمی‌کند',
  'روغن سوزی':'مصرف روغن','جوش میاره':'جوش می‌آورد',
  'صدا می‌ده':'صدا دارد','صدا میده':'صدا دارد','ویز می‌زنه':'صدای ویز دارد','جیغ می‌زنه':'صدای جیغ دارد'
};
function applyAlias(t){
  let s = String(t||'');
  for (const [a,b] of Object.entries(ALIAS)){
    s = s.replace(new RegExp('(^|[\\s،.؛:؟!])'+a.replace(/\s+/g,'\\s+')+'($|[\\s،.؛:؟!])','g'), '$1'+b+'$2');
  }
  return s;
}
function symptomNormalize(t){
  let s = correctTypos(String(t||''));
  s = applyAlias(s);
  s = cleanColloq(s);
  return s;
}
const SYN = {
  'دینام':['آلترناتور'],'آلترناتور':['دینام'],
  'سوخت':['بنزین'],'بنزین':['سوخت'],
  'گراند':['اتصال','بدنه'],'زمین':['اتصال','بدنه'],'بدنه':['اتصال'],
  'روشنایی':['چراغ','لایت'],'چراغ':['روشنایی','لایت'],'لایت':['چراغ'],
  'جرقه':['شمع'],'شمع':['جرقه'],
  'کولر':['کمپرسور'],'کمپرسور':['کولر'],
  'ولتاژ':['ولت'],'ولت':['ولتاژ'],'آمپر':['جریان'],'جریان':['آمپر'],
  'استارت':['استارتر'],'استارتر':['استارت'],
  'شارژ':['باتری','دینام'],'باتری':['شارژ'],
  'سنسور':['سنجر'],'فیوز':['رله'],
  'قطع':['قطعی'],'قطعی':['قطع']
};
function expandToks(toks){
  const out = new Set(toks);
  for (const t of toks) for (const s of (SYN[t]||[])) out.add(s);
  return [...out];
}

/* ==================== عدد گفتاری ==================== */
const NUM_WORDS = {'صفر':0,'یک':1,'دو':2,'سه':3,'چهار':4,'پنج':5,'شش':6,'هفت':7,'هشت':8,'نه':9,'ده':10,
  'یازده':11,'دوازده':12,'سیزده':13,'چهارده':14,'پانزده':15,'پونزده':15,'شانزده':16,'شونزده':16,
  'هفده':17,'هجده':18,'هیجده':18,'نوزده':19,'بیست':20,'سی':30,'چهل':40,'پنجاه':50,'شصت':60,
  'هفتاد':70,'هشتاد':80,'نود':90,'صد':100};
function parseFaNum(s){
  const parts = String(s).split(/و/).map(x=>x.trim()).filter(Boolean);
  let total = 0;
  for (const p of parts){
    const v = NUM_WORDS[p];
    if (v === undefined) return null;
    total += v;
  }
  return total;
}
function spokenNumber(text){
  const t = String(text||'').replace(/[۰-۹]/g, d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  if (/\d/.test(t)){
    const m = t.match(/\d+(?:[٫.]\d+)?/);
    return m ? m[0].replace('٫','.') : null;
  }
  const dec = t.match(/([\p{L}\s]+?)\s*(?:ممیز|و)\s*([\p{L}\s]+?)\s*(دهم|صدم|هزارم)\b/u);
  if (dec){
    const ip = parseFaNum(dec[1].trim());
    const fpp = parseFaNum(dec[2].trim());
    if (ip != null && fpp != null){
      const div = dec[3]==='دهم' ? 10 : dec[3]==='صدم' ? 100 : 1000;
      return String(parseFloat((ip + fpp/div).toFixed(3)));
    }
  }
  const whole = t.match(/(?:^|\s)((?:[\p{L}]+\s*(?:و\s*)?)+)\s*(?:ولت|اهم|آمپر|بار|هرتز|\.|$)/u);
  if (whole){
    const v = parseFaNum(whole[1].trim());
    if (v != null && v > 0) return String(v);
  }
  return null;
}

/* ==================== پالایش محتوا ==================== */
const COLLOQ = [
  ['میشه','می‌شود'],['نمیشه','نمی‌شود'],['میشود','می‌شود'],['می‌کنه','می‌کند'],['میکنه','می‌کند'],
  ['نمی‌کنه','نمی‌کند'],['نمیکنه','نمی‌کند'],['می‌دن','می‌دهند'],['میدن','می‌دهند'],['می‌ده','می‌دهد'],
  ['میده','می‌دهد'],['می‌دم','می‌دهم'],['میدم','می‌دهم'],['هستن','هستند'],['نیستن','نیستند'],
  ['می‌خواد','می‌خواهد'],['میخواد','می‌خواهد'],['می‌خوایم','می‌خواهیم'],['می‌خوام','می‌خواهم'],
  ['اگه','اگر'],['اینا','این‌ها'],['واسه','برای'],['دیگه','دیگر'],['بذار','بگذار'],
  ['چیه','چیست'],['چطوره','چگونه است'],['چقدره','چقدر است'],
  ['روشنه','روشن است'],['خاموشه','خاموش است'],['سالمه','سالم است'],['خرابه','خراب است'],
  ['پایینه','پایین است'],['کمه','کم است'],['زیاده','زیاد است'],['خوبه','خوب است'],
  ['نکنه','نکند'],['بره','برود'],['بیاد','بیاید'],['بشه','بشود'],['نشه','نشود'],
  ['چک کن','بررسی کن'],['چک کنی','بررسی کنی'],['چک کنید','بررسی کنید']
];
function cleanColloq(text){
  let t = String(text||'');
  for (const [a,b] of COLLOQ){
    t = t.replace(new RegExp('(^|[\\s،.؛:()«»])' + a + '($|[\\s،.؛:()«»])', 'g'), '$1' + b + '$2');
  }
  return t;
}
const FILLER_RE = /(سلام[^،.]{0,30}(دوستان|همراهان|بچ‌ها|بچه‌ها)|علیکم|خوبید|چطورید|خب دوستان|دوستان عزیز|همراهان عزیز|کانال ما|کانال رو|کانال را|سابسکرایب|لایک( کنید| بزنید| کنین)|کامنت|نظر(اتون| تون| بدهید| بدید| بده)|دنبال کنید|به ما سر بزنید|آدرس کانال|تلگرام ما|اینستاگرام|ویدئوی (قبلی|بعدی|قبل|بعد)|ویدیوی (قبلی|بعدی)|ویدئو رو ببینید|در ویدئو(های)? (قبلی|بعدی|دیگه|دیگر)|آخر این ویدئو|اول ویدئو|مثل همیشه|تا ویدئوی بعد|خدانگهدار|در پناه|امیدوارم( که)? (مفید|به درد)|خوشحال می‌شوم نظر|اشتراک‌گذاری|شیر کنید)/i;
function isFillerSentence(s){ return FILLER_RE.test(s) || String(s).trim().length < 15; }
function stripFillers(text){
  const sentences = String(text||'').split(/(?<=[.؟!])\s+/);
  const kept = sentences.filter(s => !isFillerSentence(s));
  return kept.join(' ').replace(/\s+/g,' ').trim();
}
function normalizeUnits(t){
  return String(t||'')
    .replace(/(\d)\s*V\b/g,'$1 ولت').replace(/(\d)\s*Ω/g,'$1 اهم').replace(/(\d)\s*A\b/g,'$1 آمپر').replace(/(\d)\s*Hz/g,'$1 هرتز')
    .replace(/(\d)\s*امپر/g,'$1 آمپر').replace(/(\d)\s*اوم/g,'$1 اهم')
    .replace(/(\d)\s*میلی امپر/g,'$1 میلی‌آمپر');
}
function relevanceScore(text){
  const n = norm(text);
  let hits = 0;
  for (const k of DOMAIN_KW_N) if (n.includes(k)) hits++;
  if (findRef(text)) hits += 2;
  if (/\d/.test(text) && /(ولت|اهم|آمپر|بار|psi)/i.test(text)) hits += 1;
  return hits;
}
function refineText(raw){
  let t = cleanColloq(String(raw||''));
  t = stripFillers(t);
  t = normalizeUnits(t);
  t = t.replace(/\s+/g,' ').trim();
  if (t.length < 25) return null;
  return t;
}

/* ==================== پارسر رونویسی ==================== */
function parseTranscript(raw){
  const lines = String(raw||'').split(/\r?\n/);
  const out = [];
  for (let line of lines){
    line = line.trim();
    if (!line) continue;
    const tm = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—]?\s*/);
    let stamp = '';
    if (tm){ stamp = tm[1]; line = line.slice(tm[0].length); }
    line = line.replace(/^(مدرس|استاد|گوینده|مربی|اسپیکر\s*\d*|speaker\s*\d*)\s*[:：-]\s*/i, '');
    line = line.trim();
    if (!line || line.length < 3) continue;
    if (out.length && out[out.length-1].text === line){
      if (stamp) out[out.length-1].lastStamp = stamp;
      continue;
    }
    out.push({text:line, stamp, lastStamp:stamp});
  }
  const paras = [];
  let cur = '', curStamp = '';
  for (const o of out){
    if (!cur) curStamp = o.stamp;
    cur += (cur ? ' ' : '') + o.text;
    if (cur.length > 450 || /[.؟!]$/.test(o.text)){
      paras.push({text:cur, stamp:curStamp});
      cur = '';
    }
  }
  if (cur) paras.push({text:cur, stamp:curStamp});
  return paras;
}
function looksLikeTranscript(text){
  const lines = String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if (lines.length < 8) return false;
  const stamps = lines.filter(l=>/^\[?\d{1,2}:\d{2}/.test(l)).length;
  const avgLen = lines.reduce((a,l)=>a+l.length,0)/lines.length;
  return stamps > 5 || (stamps > 0 && avgLen < 70) || avgLen < 45;
}
function transcriptPages(paras, fallback){
  return paras.map(p => p.stamp ? 'دقیقه ' + fa(p.stamp) : (fallback || 'نامشخص در منبع'));
}

/* ==================== علت‌ومعلولی ==================== */
const CAUSAL = [
  {sys:'شارژ', kws:['چراغ باتری','شارژ نمی','باتری خالی','باتری تخلیه','دینام','آلترناتور','برق ضعیف'],
   causes:[
     {c:'تسمه‌ی آلترناتور شل، لیز یا پاره', t:'با موتور خاموش تسمه را ببین؛ لقی زیاد یا صدای جیغ اول استارت نشانه‌ی لقی است.'},
     {c:'آلترناتور یا ریگولاتور خراب', t:'با موتور روشن ولتاژ دو سر باتری را بگیر؛ اگر به مرجع دانش‌نامه نرسید، مدار شارژ کار نمی‌کند.'},
     {c:'کانکتور یا سیم‌کشی مدار شارژ (اتصال بدنه)', t:'کانکتورهای پشت آلترناتور و مسیر کابل خروجی تا باتری را برای گرمای زیاد و اکسیداسیون بررسی کن.'},
     {c:'خود باتری ضعیف/سولفاته', t:'اگر ولتاژ شارژ درست است ولی باتری باز هم تخلیه می‌شود، باتری را با تست بار بررسی کن.'}
   ]},
  {sys:'استارت', kws:['استارت نمی','هیچ صدایی','کلیک می‌کند','استارت ضعیف'],
   causes:[
     {c:'باتری ضعیف یا قطب‌های کثیف', t:'ولتاژ باتری در حالت استارت را بگیر؛ افت شدید یعنی باتری یا اتصالات.'},
     {c:'مدار سوئیچ استارت / رله استارت', t:'رله می‌چسبد ولی استارتر نمی‌چرخد؟ مدار قدرت استارتر را بگیر.'},
     {c:'استارتر یا سولنوئید خراب', t:'اگر ولتاژ سر استارتر می‌رسد و زمین سالم است ولی نمی‌چرخد، استارتر زیر بار است.'},
     {c:'اتصال بدنه در کابل منفی', t:'کابل منفی از بدنه و موتور را برای مقاومت اضافی بررسی کن.'}
   ]},
  {sys:'جرقه و احتراق', kws:['روشن نمی','گیر می‌کند','خفه','پاس می‌کند','دور ریگ','لرزش'],
   causes:[
     {c:'شمع یا وایر شمع معیوب', t:'شمع‌ها را بکش؛ رنگ، فاصله و تر بودن را بررسی کن.'},
     {c:'کویل یا مدار اولیه‌ی جرقه', t:'جرقه‌ی تست بگیر (مطابق روش منبع و با احتیاط).'},
     {c:'سنسور دور موتور (کرانک)', t:'نبود پالس کرانک یعنی ECU جرقه نمی‌دهد — با دیاگ ببین.'},
     {c:'پرش زمان تسمه/زنجیر', t:'اگر برق همه درست است و نمی‌زند، زمان‌بندی مکانیکی را بررسی کن.'}
   ]},
  {sys:'انژکتور و سوخت', kws:['سوخت نمی','بنزین','پمپ بنزین','انژکتور','فشار سوخت'],
   causes:[
     {c:'فیوز یا رله‌ی پمپ بنزین', t:'صدای پمپ را موقع باز کردن کلید گوش کن؛ نبود صدا یعنی مدار تغذیه‌ی پمپ.'},
     {c:'فشار کم سوخت (پمپ یا رگولاتور)', t:'فشار خط سوخت را با گیج بگیر و با مرجع دانش‌نامه مقایسه کن.'},
     {c:'انژکتورهای مسدود', t:'جریان کشی انژکتورها را مقایسه‌ای بررسی کن.'},
     {c:'فیلتر بنزین مسدود', t:'فشار زیر مرجع؟ اول فیلتر را سرویس کن.'}
   ]},
  {sys:'سیم‌کشی و کانکتور', kws:['فیوز می‌سوزد','قطع برق','اتصال بدنه','قطع و وصل'],
   causes:[
     {c:'اتصال کوتاه در بار مدار', t:'فیوز را با آمپرمتر سری کن و بارها را یکی‌یکی جدا کن.'},
     {c:'اتصال بدنه (Ground) ضعیف', t:'نقطه‌های اتصال بدنه‌ی اصلی را باز و تمیز کن.'},
     {c:'کانکتور اکسیدشده', t:'کانکتورهای مشکوک را باز کن؛ سبز شدن پین‌ها = مقاومت تماسی.'}
   ]}
];
function causalFor(q){
  const n = norm(q);
  return CAUSAL.filter(c => c.kws.some(k => n.includes(norm(k))) || c.sys === q);
}
function causalHtml(list, note){
  return list.map(c => `<div class="causal"><b>🔍 ${esc(c.sys)} — فرضیه‌ها به ترتیب احتمال:</b>
    <ol style="padding-right:18px;margin:6px 0 0">${c.causes.map(x=>`<li>${esc(x.c)}<br><span style="color:var(--text-secondary)">${esc(x.t)}</span></li>`).join('')}</ol>
    ${note ? `<div class="note">${esc(note)}</div>` : ''}</div>`).join('');
}

/* ==================== استخراج ==================== */
const SYS_KW = {
  'شارژ':['آلترناتور','دینام','ولتاژ شارژ','ریگولاتور','چراغ باتری','شارژ باتری','alternator'],
  'استارت':['استارتر','دلکو','استارت','سوئیچ استارت','solenoid','starter'],
  'جرقه و احتراق':['شمع','کویل','وایر شمع','پلاتین','جرقه','زمان احتراق','spark','coil'],
  'انژکتور و سوخت':['انژکتور','پمپ بنزین','فشار سوخت','ریل سوخت','injector','fuel pump'],
  'سنسورها':['سنسور','سنجر','crankshaft','camshaft','map','maf','اکسیژن','لامبدا','مپ‌سنسور'],
  'ECU':['ecu','ای‌سی‌یو','کامپیوتر خودرو'],
  'روشنایی':['چراغ جلو','چراغ عقب','لایت','راهنما','برف‌پاک‌کن','فلاشر','بوق'],
  'سیم‌کشی و کانکتور':['فیوز','رله','کانکتور','سیم‌کشی','مسیر سیم','اتصال بدنه','هارنس','fusible'],
  'کولر و برقی‌ها':['کمپرسور کولر','بلوور','کندانسور','کولر','شیشه بالابر','صندلی برقی','موتور فن'],
  'ایربگ (SRS)':['ایربگ','کمربند','airbag','srs']
};
function detectSystem(text){
  const n = norm(text);
  let best = 'سایر', bestScore = 0;
  for (const [sys, kws] of Object.entries(SYS_KW)){
    let sc = 0;
    for (const k of kws) if (n.includes(norm(k))) sc += 2;
    if (sc > bestScore){ bestScore = sc; best = sys; }
  }
  return bestScore >= 2 ? best : null;
}
function smartTitle(body){
  const clean = String(body).replace(/\s+/g,' ').trim();
  const m = clean.match(/^(.{15,90}?)[.؟!،:]/);
  if (m && m[1].length >= 15) return m[1].trim();
  return clean.slice(0, 60) + (clean.length > 60 ? '…' : '');
}
const VAL_RE = /([\d۰-۹]+(?:[٫.][\d۰-۹]+)?)\s*(?:تا\s*([\d۰-۹]+(?:[٫.][\d۰-۹]+)?))?\s*(ولت|اهم|کیلواهم|آمپر|میلی‌آمپر|هرتز|کیلوهرتز|بار|psi|کیلومتر)/g;
function extractValues(body){
  const out = [], seen = new Set();
  let m;
  VAL_RE.lastIndex = 0;
  while ((m = VAL_RE.exec(String(body)))){
    const v = m[2] ? fa(m[1]) + '–' + fa(m[2]) : fa(m[1]);
    const key = v + m[3];
    if (!seen.has(key)){ seen.add(key); out.push(key + ' ' + m[3]); }
    if (out.length >= 5) break;
  }
  return out;
}
function testCond(body){
  const m = String(body).match(/(موتور روشن|موتور خاموش|کلید در (باز|استارت|روشن)|با دور [۱۲۰-۹]+|دور آرام|بار کامل)/);
  return m ? m[1] : 'نامشخص';
}
function qualityScore(body){
  let s = 0;
  if (/\d/.test(body)) s += 3;
  if (findRef(body)) s += 2;
  if (/(ولت|اهم|آمپر|هرتز|V|Ω|A)/i.test(body)) s += 1;
  if (/(موتور روشن|موتور خاموش|کلید در|شرایط تست|با دور)/.test(body)) s += 2;
  if (body.length >= 60) s += 1;
  if (body.length < 40) s -= 2;
  return s;
}
function aiLine(u){
  const parts = [u.title];
  if (u.car) parts.push('خودرو: ' + u.car);
  parts.push('سیستم: ' + u.system);
  if (u.values && u.values.length) parts.push('مقادیر: ' + u.values.join('، '));
  parts.push('شرایط تست: ' + testCond(u.body));
  parts.push('اعتبار: ' + (u.confidence === 'verified' ? 'تأییدشده' : u.srcType === 'inference' ? 'استنباطی' : 'استخراج‌شده'));
  return parts.join(' | ');
}
function buildHeaderFooterFilter(pageLines){
  const freq = new Map();
  for (const lines of pageLines){
    const seen = new Set();
    for (const l of lines){
      const key = l.replace(/\d+/g,'#').trim();
      if (key.length < 4 || key.length > 80 || seen.has(key)) continue;
      seen.add(key);
      freq.set(key, (freq.get(key)||0)+1);
    }
  }
  const total = pageLines.length || 1;
  const junk = new Set();
  for (const [k, c] of freq) if (c / total > 0.3) junk.add(k);
  return lines => lines.filter(l => !junk.has(l.replace(/\d+/g,'#').trim()));
}
function splitChunksV2(text){
  const raw = String(text||'').replace(/([.؟!])\s+/g, '$1\n').split('\n').map(x=>x.trim()).filter(Boolean);
  const merged = [];
  for (const s of raw){
    if (/^[^.:؛]{3,50}:$/.test(s)) merged.push(s);
    else if (merged.length && /^[^.:؛]{3,50}:$/.test(merged[merged.length-1])) merged[merged.length-1] += ' ' + s;
    else merged.push(s);
  }
  const chunks = [];
  let cur = '';
  for (const s of merged){
    if (findRef(s) && findRef(cur) && (cur + ' ' + s).length > 250){
      if (cur.length >= 25) chunks.push(cur);
      cur = s;
      continue;
    }
    if ((cur + ' ' + s).trim().length <= 600) cur = (cur ? cur + ' ' : '') + s;
    else {
      if (cur.length >= 50) chunks.push(cur);
      else if (cur && chunks.length) chunks[chunks.length-1] += ' ' + cur;
      else if (cur.length >= 25) chunks.push(cur);
      cur = s;
    }
  }
  if (cur.length >= 25) chunks.push(cur);
  else if (cur && chunks.length) chunks[chunks.length-1] += ' ' + cur;
  return chunks.filter(c => c.length >= 25 && c.length <= 900);
}
function fp(text){
  const n = norm(text).replace(/\s/g,'');
  let h = 0;
  for (let i=0; i<n.length; i++){ h = ((h*31) + n.charCodeAt(i)) | 0; }
  return 'h' + (h>>>0).toString(36) + ':' + n.length;
}

/* ==================== OPFS ==================== */
async function opfsSave(file){
  const dir = await navigator.storage.getDirectory();
  const id = 'f' + Date.now() + '-' + Math.floor(Math.random()*1e6);
  const fh = await dir.getFileHandle(id, {create:true});
  try {
    const w = await fh.createWritable(); await w.write(file); await w.close();
  } catch(e){
    if (e.name === 'QuotaExceededError') throw new Error('حافظه‌ی گوشی پر است');
    throw e;
  }
  return id;
}
async function opfsGet(id){
  const dir = await navigator.storage.getDirectory();
  return (await dir.getFileHandle(id)).getFile();
}

/* ==================== صف استخراج ==================== */
const CHUNK_PER_PAUSE = 10;
let EXTRACTING = false;

$('fileIn').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  e.target.value = '';
  const car = activeCar();
  openSheet(`<h2>افزودن فایل</h2>
    <p class="line">فایل: <b>${esc(f.name)}</b> (${fa((f.size/1048576).toFixed(1))} مگابایت)</p>
    ${car ? `<p class="note">🚗 به خودروی فعال «${esc(car.name)}» ثبت می‌شود.</p>` : ''}
    <label>سیستم خودرو</label>
    <select class="fld" id="fx-sys"><option value="">خودکار</option>${SYSTEMS.map(s=>`<option>${s}</option>`).join('')}</select>
    <label>نوع منبع</label>
    <select class="fld" id="fx-type">${Object.entries(SRC).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>
    <label>خودرو (اختیاری — خالی = خودروی فعال)</label><input class="fld" id="fx-car" value="${car?esc(car.name):''}">
    <div class="btns"><button class="btn" onclick="queueFile('${esc(f.name)}','${f.type||'application/octet-stream'}')">بفرست به صف</button>
    <button class="btn ghost" onclick="closeSheet()">انصراف</button></div>`);
  window._pendingFile = f;
});

async function queueFile(name, type){
  const f = window._pendingFile; window._pendingFile = null;
  if (!f) return closeSheet();
  let fileId = '';
  try { fileId = await opfsSave(f); }
  catch(e){ toast(e.message || 'ذخیره‌ی فایل ممکن نشد'); return; }
  const job = {
    name, fileId, type,
    system:$('fx-sys').value, srcType:$('fx-type').value, car:$('fx-car').value.trim(),
    carId: activeCar() ? activeCar().id : '',
    status:'running', total:0, done:0, junk:0, dup:0, off:0, created:Date.now()
  };
  job.id = await putJob(job);
  closeSheet(); toast('به صف اضافه شد ⏳');
  renderJobs(); renderMapSources(); go('set');
  runQueue();
}

async function queueMapJob(fileId, pageNum){
  if (!SET.mapApi.url || !SET.mapApi.key || !SET.mapApi.model)
    return toast('اول تنظیمات API مدل بینایی را ذخیره کن');
  if (!navigator.onLine) return toast('به اینترنت نیاز دارد');
  const job = {type:'map', name:'تحلیل نقشه · صفحه ' + fa(pageNum), fileId, pageNum,
    status:'running', total:1, done:0, created:Date.now()};
  job.id = await putJob(job);
  toast('صفحه به صف تحلیل رفت 🗺️');
  go('set'); renderJobs();
  runQueue();
}
async function batchMap(){
  const fileId = $('mapFile').value;
  if (!fileId) return toast('اول فایل منبع انتخاب کن');
  if (!SET.mapApi.url || !SET.mapApi.key || !SET.mapApi.model)
    return toast('اول تنظیمات API را ذخیره کن');
  if (!navigator.onLine) return toast('به اینترنت نیاز دارد');
  const from = Math.max(1, parseInt($('mapFrom').value,10)||1);
  const to = Math.min(from+19, parseInt($('mapTo').value,10)||from);
  if (to < from) return toast('بازه درست نیست');
  const name = $('mapFile').selectedOptions[0].textContent;
  for (let p=from; p<=to; p++){
    const job = {type:'map', name:'دسته‌نقشه «'+name+'» · ص '+fa(p), fileId, pageNum:p,
      status:'running', total:1, done:0, created:Date.now()};
    job.id = await putJob(job);
  }
  toast(fa(to-from+1) + ' صفحه به صف تحلیل رفت 🗺️');
  renderJobs(); runQueue();
}
async function renderMapSources(){
  if (!db) return;
  const raw = await getAllRaw();
  const files = {};
  for (const u of raw) if (u.fileId) files[u.fileId] = u.srcName || 'فایل';
  const cur = $('mapFile').value;
  $('mapFile').innerHTML = Object.keys(files).length
    ? '<option value="">— انتخاب کن —</option>' + Object.entries(files).map(([id,n]) =>
        `<option value="${esc(id)}" ${cur===id?'selected':''}>${esc(n)}</option>`).join('')
    : '<option value="">— فایلی نیست —</option>';
}

async function renderJobs(){
  if (!db) return;
  const jobs = (await getJobs()).sort((a,b)=>b.created-a.created).slice(0,20);
  $('jobList').innerHTML = jobs.length ? jobs.map(j => {
    const pct = j.total ? Math.round(j.done/j.total*100) : 0;
    const stTxt = {running:'در حال اجرا', paused:'متوقف', done:'تمام شد', failed:'ناموفق'}[j.status] || j.status;
    const info = j.status==='running'
      ? (j.ocrNow ? 'در حال OCR…' : j.type==='map' ? 'در حال تحلیل نقشه…' : stTxt)
      : stTxt + (j.err ? ' — ' + esc(j.err) : '')
        + (j.junk ? ' · '+fa(j.junk)+' بی‌ارزش' : '') + (j.dup ? ' · '+fa(j.dup)+' تکراری' : '')
        + (j.off ? ' · '+fa(j.off)+' خارج از حوزه' : '');
    return `<div class="row" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(j.name)}</span>
        <b>${j.total ? fa(j.done)+'/'+fa(j.total) : stTxt}</b>
      </div>
      <div class="jobprog"><i style="width:${pct}%;${j.status==='failed'?'background:var(--danger)':''}"></i></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${j.status!=='done' && j.status!=='failed' ? (j.status==='running'
          ? `<button class="btn ghost sm" onclick="pauseJob(${j.id})">توقف</button>`
          : `<button class="btn sm" onclick="resumeJob(${j.id})">ادامه</button>`) : ''}
        ${j.status==='failed' ? `<button class="btn sm" onclick="resumeJob(${j.id})">تلاش دوباره</button>` : ''}
        <button class="btn danger sm" onclick="removeJob(${j.id})">حذف</button>
        <span class="note" style="margin:0;align-self:center">${info}</span>
      </div></div>`;
  }).join('') : '<div class="note">صف خالی است.</div>';
}
async function pauseJob(id){ const js = await getJobs(); const j = js.find(x=>x.id===id); if (!j) return; j.status='paused'; await putJob(j); renderJobs(); toast('توقف شد'); }
async function resumeJob(id){ const js = await getJobs(); const j = js.find(x=>x.id===id); if (!j) return; j.status='running'; delete j.err; await putJob(j); renderJobs(); runQueue(); }
async function removeJob(id){
  const js = await getJobs(); const j = js.find(x=>x.id===id); if (!j) return;
  if (!confirm('حذف شود؟')) return;
  await delJob(id); renderJobs(); toast('حذف شد');
}

async function runQueue(){
  if (EXTRACTING) return;
  EXTRACTING = true;
  try {
    while (true){
      const jobs = (await getJobs()).filter(j=>j.status==='running');
      if (!jobs.length) break;
      const j = jobs[0];
      try { await processJob(j); }
      catch(e){
        console.error(e);
        j.status = 'failed'; j.err = e && e.message ? e.message : 'خطای ناشناخته';
        await putJob(j); renderJobs();
        toast('یک کار ناموفق شد — جزئیات در تنظیمات');
      }
    }
  } catch(e){ console.error(e); }
  EXTRACTING = false;
  refreshCounts(); renderJobs();
}

async function processJob(job){
  if (BATT && !BATT.charging && BATT.level < .3 && job.type !== 'map'){
    job.status = 'paused'; await putJob(job);
    toast('باتری کم است؛ متوقف شد 🔋');
    renderJobs(); return;
  }
  if (job.type === 'map'){
    await processMapJob(job);
  } else if (job.type === 'application/pdf' || /\.pdf$/i.test(job.name)){
    await processPdfJob(job);
  } else {
    await processTxtJob(job);
  }
  if (job.status === 'running' && job.done >= job.total && job.total > 0){
    job.status = 'done'; await putJob(job);
  }
  await putJob(job); renderJobs();
}

const OCR_MIN_TEXT = 40;
async function getPageText(page, job){
  const tx = await page.getTextContent();
  const text = tx.items.map(i=>i.str).join(' ').replace(/\s+/g,' ').trim();
  if (text.replace(/\s/g,'').length >= OCR_MIN_TEXT) return {text, ocr:false, conf:100};
  job.ocrNow = true; await putJob(job); renderJobs();
  const vp = page.getViewport({scale: 2.2});
  const canvas = document.createElement('canvas');
  canvas.width = vp.width; canvas.height = vp.height;
  await page.render({canvasContext: canvas.getContext('2d'), viewport: vp}).promise;
  let ocrText = '', conf = 0;
  try {
    const ret = await Tesseract.recognize(canvas, 'fas+eng');
    ocrText = (ret.data.text || '').replace(/\s+/g, ' ').trim();
    conf = Math.round(ret.data.confidence || 0);
  } catch(e){ console.error('OCR failed', e); }
  job.ocrNow = false; await putJob(job);
  return {text: ocrText, ocr:true, conf};
}

async function openPdf(job){
  const file = await opfsGet(job.fileId);
  const buf = await file.arrayBuffer();
  try {
    return await pdfjsLib.getDocument({data:buf}).promise;
  } catch(e){
    if (e && (e.name === 'PasswordException' || /password/i.test(e.message||'')))
      throw new Error('PDF رمزدار است؛ اول رمز را بردار');
    throw new Error('فایل خراب یا ناخواناست');
  }
}

async function processPdfJob(job){
  const pdf = await openPdf(job);
  if (!job.total){
    const pageTexts = [];
    for (let p=1; p<=pdf.numPages; p++){
      const r = await getPageText(await pdf.getPage(p), job);
      pageTexts.push(r.text);
      if (job.status !== 'running') return;
    }
    const pageLines = pageTexts.map(t => t.split(/(?<=[.؟!])\s+|\n/).map(x=>x.trim()).filter(Boolean));
    const strip = buildHeaderFooterFilter(pageLines);
    const cleaned = pageLines.map(lines => strip(lines).join(' '));
    let total = 0;
    for (const t of cleaned){
      total += splitChunksV2(t).length;
      if (total > 400){ total = 401; break; }
    }
    job.total = Math.min(total, 400); await putJob(job);
    job._cleaned = cleaned;
  }
  const made = (await getAllRaw()).filter(u=>u.fileId===job.fileId).length;
  let cleaned = job._cleaned;
  if (!cleaned){
    cleaned = [];
    const pagesRaw = [];
    for (let p=1; p<=pdf.numPages; p++){
      const r = await getPageText(await pdf.getPage(p), job);
      pagesRaw.push(r.text);
      if (job.status !== 'running') return;
    }
    const strip = buildHeaderFooterFilter(pagesRaw.map(t => t.split(/(?<=[.؟!])\s+|\n/).map(x=>x.trim()).filter(Boolean)));
    cleaned = pagesRaw.map(t => strip(t.split(/(?<=[.؟!])\s+|\n/).map(x=>x.trim()).filter(Boolean)).join(' '));
  }
  let allChunks = [];
  for (let i=0; i<cleaned.length; i++){
    for (const c of splitChunksV2(cleaned[i])) allChunks.push({c, page:i+1});
  }
  allChunks = allChunks.slice(0, 400);
  let madeNow = 0, sincePause = 0;
  for (let i=made; i<allChunks.length; i++){
    if (job.status !== 'running') return;
    if (madeNow + made >= job.total) break;
    const {c, page} = allChunks[i];
    await makeChunkUnit(c, String(fa(page)), job, false, 100);
    madeNow++; sincePause++; job.done = made + madeNow;
    if (sincePause % CHUNK_PER_PAUSE === 0){
      await putJob(job); renderJobs();
      await new Promise(r=>setTimeout(r, 1500));
    }
  }
}

async function processTxtJob(job){
  const file = await opfsGet(job.fileId);
  const text = await file.text();
  let chunks, pages;
  if (looksLikeTranscript(text)){
    const paras = parseTranscript(text);
    chunks = paras.map(p=>p.text).slice(0, 400);
    pages = transcriptPages(paras.slice(0,400), 'نامشخص در منبع');
  } else {
    chunks = splitChunksV2(text).slice(0, 400);
    pages = null;
  }
  if (!job.total){ job.total = chunks.length; await putJob(job); }
  const made = (await getAllRaw()).filter(u=>u.fileId===job.fileId).length;
  let madeNow = 0, sincePause = 0;
  for (let i=made; i<chunks.length; i++){
    if (job.status !== 'running') return;
    await makeChunkUnit(chunks[i], pages ? pages[i] : 'نامشخص در منبع', job, false, 100);
    madeNow++; sincePause++; job.done = made + madeNow;
    if (sincePause % CHUNK_PER_PAUSE === 0){
      await putJob(job); renderJobs();
      await new Promise(r=>setTimeout(r, 1500));
    }
  }
}

async function makeChunkUnit(rawChunk, page, job, ocr, conf){
  const refined = refineText(rawChunk);
  if (!refined){ job.off = (job.off||0)+1; return; }
  const rel = relevanceScore(refined);
  const q = qualityScore(refined);
  if (await isDuplicate(refined)){ job.dup = (job.dup||0)+1; return; }
  const autoSys = job.system ? null : detectSystem(refined);
  const title = smartTitle(refined);
  const values = extractValues(refined);
  const u = {
    title, body:refined, fp:fp(refined),
    system: job.system || autoSys || 'سایر',
    srcType:job.srcType,
    srcName:job.name, page, car:job.car, carId:job.carId || '', fileId:job.fileId,
    ocr:!!ocr, ocrConf: conf, quality: q, values,
    offdomain: rel < 2,
    lowq: q <= -1 && !findRef(refined),
    confidence:'extracted', review:'pending', hidden:false, created:Date.now(),
    versions:[{at:Date.now(), title, body:refined}]
  };
  u.aiLine = aiLine(u);
  if (u.offdomain || u.lowq) job.off = (job.off||0)+1;
  await saveU(u);
}

/* ==================== پاکسازی ==================== */
async function renderCleanBox(){
  if (!db){ $('cleanBox').innerHTML = '<div class="note">در حال بارگذاری…</div>'; return; }
  const live = (await getAllRaw()).filter(u=>!u.hidden && u.review!=='rejected');
  let dirty = 0, offdomain = 0;
  for (const u of live){
    if (cleanColloq(u.body) !== u.body || FILLER_RE.test(u.body)) dirty++;
    if (relevanceScore(u.body) < 2) offdomain++;
  }
  $('cleanBox').innerHTML = live.length
    ? `<div class="row"><span>نکات با متن محاوره‌ای/لوده</span><b>${fa(dirty)}</b></div>
       <div class="row"><span>نکات کم‌ارتباط با حوزه</span><b>${fa(offdomain)}</b></div>`
    : '<div class="note">دانش‌نامه خالی است.</div>';
}
async function bulkClean(){
  if (!db) return;
  if (!confirm('پاکسازی کل دانش‌نامه؟ متن نکات رسمی می‌شود (نسخه‌ی قبلی در تاریخچه می‌ماند).')) return;
  const live = (await getAllRaw()).filter(u=>!u.hidden && u.review!=='rejected');
  let fixed = 0;
  for (const u of live){
    const refined = refineText(u.body);
    if (refined && refined !== u.body){
      u.versions = u.versions || [];
      u.versions.push({at:Date.now(), title:u.title, body:u.body, edited:true, note:'پیش از پاکسازی'});
      u.body = refined;
      u.title = smartTitle(refined);
      u.values = extractValues(refined); u.quality = qualityScore(refined);
      u.fp = fp(refined); u.aiLine = aiLine(u);
      await saveU(u); fixed++;
    }
  }
  renderCleanBox(); renderList(); refreshCounts();
  toast(fa(fixed) + ' نکته پاکسازی شد ✓');
}

/* ==================== تحلیل نقشه ==================== */
const MAP_PROMPT = `تو متخصص نقشه‌های سیم‌کشی خودرو هستی. این تصویر را تحلیل کن و پاسخ را دقیقاً با این چهار بخش ساختارمند به فارسی بده:

**۱) قطعات:** فهرست همه‌ی قطعات و برچسب‌ها با کد/شماره‌شان.
**۲) اتصالات:** برای هر مسیر مهم: «قطعه X (پین …) → قطعه Y (پین …) | رنگ سیم: …».
**۳) مقادیر و کدها:** همه‌ی اعداد فنی، آمپر فیوزها، رنگ‌های سیم، شماره‌های سوکت — دقیقاً همان‌طور که در تصویر است.
**۴) نکته‌ی تست:** اگر از روی نقشه نقطه‌ی تست مناسب معلوم است بگو؛ در غیر این صورت بنویس «از روی نقشه قابل تعیین نیست».

قواعد سخت: هیچ عدد یا شماره‌ای از خودت نساز. ناخواناها دقیقاً «ناخوانا». اگر تصویر نقشه نیست و متن است، خلاصه‌ی فنی دقیق بده.`;

async function processMapJob(job){
  const file = await opfsGet(job.fileId);
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data:buf}).promise;
  if (job.pageNum < 1 || job.pageNum > pdf.numPages) throw new Error('شماره‌ی صفحه نامعتبر است');
  const page = await pdf.getPage(job.pageNum);
  const vp = page.getViewport({scale: 1.6});
  const canvas = document.createElement('canvas');
  canvas.width = vp.width; canvas.height = vp.height;
  await page.render({canvasContext: canvas.getContext('2d'), viewport: vp}).promise;
  const img = canvas.toDataURL('image/jpeg', 0.85);
  const res = await fetch(SET.mapApi.url, {
    method:'POST',
    headers:{'Content-Type':'application/json', 'Authorization':'Bearer ' + SET.mapApi.key},
    body: JSON.stringify({
      model: SET.mapApi.model,
      messages: [{role:'user', content: [
        {type:'text', text: MAP_PROMPT},
        {type:'image_url', image_url:{url: img}}
      ]}],
      max_tokens: 1500
    })
  });
  if (!res.ok) throw new Error('سرویس نقشه خطا داد (کد ' + res.status + ')');
  const j = await res.json();
  const txt = j.choices?.[0]?.message?.content || '';
  if (!txt) throw new Error('پاسخ خالی از سرویس');
  const title = 'تحلیل نقشه · صفحه ' + fa(job.pageNum);
  const u = applyCar({
    title, body:txt, fp:fp(txt),
    system:'سیم‌کشی و کانکتور', srcType:'inference',
    srcName:'تحلیل بینایی · ' + SET.mapApi.model, page:String(fa(job.pageNum)),
    fileId:job.fileId, mapAnalysis:true,
    quality:qualityScore(txt), values:extractValues(txt),
    confidence:'inferred', review:'pending', hidden:false, created:Date.now(),
    versions:[{at:Date.now(), title, body:txt}]
  });
  u.aiLine = aiLine(u);
  await saveU(u);
  job.done = 1;
}

/* ==================== دوربین ==================== */
$('camIn').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  e.target.value = '';
  window._camFile = f;
  openSheet(`<h2>عکس صفحه</h2>
    <div class="camprev"><img src="${URL.createObjectURL(f)}"></div>
    <p class="note">عکس فقط روی همین گوشی پردازش می‌شود.</p>
    <div class="btns"><button class="btn" onclick="camOCR()">📖 خواندن با OCR (آفلاین)</button></div>
    <div class="btns"><button class="btn ghost" onclick="camVision()">🗺️ تحلیل با مدل بینایی (آنلاین)</button>
    <button class="btn ghost" onclick="closeSheet()">انصراف</button></div>`);
});
async function camToCanvas(){
  const img = new Image();
  img.src = URL.createObjectURL(window._camFile);
  await img.decode();
  const max = 1600, sc = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = img.width * sc; c.height = img.height * sc;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}
async function camOCR(){
  if (!window._camFile) return;
  closeSheet(); toast('در حال خواندن عکس… ⏳');
  try {
    const canvas = await camToCanvas();
    const ret = await Tesseract.recognize(canvas, 'fas+eng');
    const text = (ret.data.text||'').replace(/\s+/g,' ').trim();
    const conf = Math.round(ret.data.confidence||0);
    const refined = refineText(text);
    if (!refined) return toast('از این عکس متن قابل‌استفاده درنیامد — عکس واضح‌تر بگیر');
    const title = smartTitle(refined);
    const u = applyCar({
      title, body:refined, fp:fp(refined),
      system:detectSystem(refined) || 'سایر', srcType:'user',
      srcName:'عکس دوربین', page:'نامشخص در منبع', car:'',
      ocr:true, ocrConf:conf, quality:qualityScore(refined), values:extractValues(refined),
      offdomain: relevanceScore(refined) < 2,
      confidence:'extracted', review:'pending', hidden:false, created:Date.now(),
      versions:[{at:Date.now(), title, body:refined}]
    });
    u.aiLine = aiLine(u);
    await saveU(u);
    toast('خوانده شد (اطمینان '+fa(conf)+'٪) — به صف بازبینی رفت ✓');
    refreshCounts();
  } catch(e){ console.error(e); toast('خواندن عکس ناموفق بود'); }
}
async function camVision(){
  if (!SET.mapApi.url || !SET.mapApi.key || !SET.mapApi.model)
    return toast('اول در تنظیمات، API مدل بینایی را ذخیره کن');
  if (!navigator.onLine) return toast('به اینترنت نیاز دارد');
  closeSheet(); toast('در حال تحلیل عکس… 🗺️');
  try {
    const canvas = await camToCanvas();
    const img = canvas.toDataURL('image/jpeg', 0.85);
    const res = await fetch(SET.mapApi.url, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+SET.mapApi.key},
      body: JSON.stringify({
        model: SET.mapApi.model,
        messages:[{role:'user', content:[
          {type:'text', text: MAP_PROMPT},
          {type:'image_url', image_url:{url: img}}
        ]}],
        max_tokens: 1500
      })
    });
    if (!res.ok) throw new Error('کد '+res.status);
    const j = await res.json();
    const txt = j.choices?.[0]?.message?.content || '';
    if (!txt) throw 0;
    const title = 'تحلیل عکس دوربین';
    const u = applyCar({
      title, body:txt, fp:fp(txt),
      system:'سیم‌کشی و کانکتور', srcType:'inference',
      srcName:'تحلیل بینایی عکس · '+SET.mapApi.model, page:'نامشخص در منبع',
      mapAnalysis:true, quality:qualityScore(txt), values:extractValues(txt),
      confidence:'inferred', review:'pending', hidden:false, created:Date.now(),
      versions:[{at:Date.now(), title, body:txt}]
    });
    u.aiLine = aiLine(u);
    await saveU(u);
    toast('تحلیل انجام شد — به صف بازبینی رفت ✓');
    refreshCounts();
  } catch(e){ console.error(e); toast('تحلیل ناموفق بود — تنظیمات API را بررسی کن'); }
}

/* ==================== سلامت دانش ==================== */
async function renderHealth(){
  if (!db){ $('healthBox').innerHTML = '<div class="note">در حال بارگذاری…</div>'; return; }
  const raw = await getAllRaw();
  const live = raw.filter(u=>!u.hidden && u.review!=='rejected');
  const ocr = live.filter(u=>u.ocr);
  const ocrLow = ocr.filter(u=>(u.ocrConf||100)<70);
  const ocrRate = ocr.length ? Math.round(ocrLow.length/ocr.length*100) : 0;
  const approved = live.filter(u=>u.confidence==='verified').length;
  const rejected = raw.filter(u=>u.review==='rejected').length;
  const agree = (approved+rejected) ? Math.round(approved/(approved+rejected)*100) : 100;
  const conflicts = Math.floor(live.filter(u=>u.conflictWith).length/2);
  const offPend = raw.filter(u=>u.review==='pending' && (u.offdomain||u.lowq)).length;
  const gaps = SYSTEMS.map(s => ({s, n: live.filter(u=>u.system===s && !u.offdomain).length})).filter(x=>x.n<10);
  const gate = ok => ok ? 'ok' : 'bad';
  const gi = (ok, a, b) => ok ? a : b;
  let h = `
    <div class="gate ${gate(ocrRate<5)}"><div class="gi"><span>نرخ OCR کم‌اطمینان</span><span class="st">${gi(ocrRate<5,'✓','✗')} ${fa(ocrRate)}٪</span></div>
      <div class="gbar"><i style="width:${Math.min(100,ocrRate*10)}%;background:${ocrRate<5?'var(--safe)':'var(--danger)'}"></i></div></div>
    <div class="gate ${gate(agree>=90)}"><div class="gi"><span>توافق بازبینی</span><span class="st">${gi(agree>=90,'✓','✗')} ${fa(agree)}٪</span></div>
      <div class="gbar"><i style="width:${agree}%;background:${agree>=90?'var(--safe)':'var(--danger)'}"></i></div></div>
    <div class="gate ${gate(conflicts===0)}"><div class="gi"><span>تعارض‌های باز</span><span class="st">${conflicts ? '✗' : '✓'} ${fa(conflicts)}</span></div></div>
    <div class="gate ${gate(offPend===0)}"><div class="gi"><span>در انتظار چک دستی</span><span class="st">${offPend ? '•' : '✓'} ${fa(offPend)}</span></div>
      ${offPend ? '<div class="note">در صف بازبینی بررسی‌شان کن — تأیید یا رد.</div>' : ''}</div>
    <div class="gate ${gate(gaps.length===0)}"><div class="gi"><span>پوشش سیستم‌ها</span><span class="st">${gaps.length ? '✗' : '✓'} ${fa(SYSTEMS.length-gaps.length)}/${fa(SYSTEMS.length)}</span></div>
      <div class="gbar"><i style="width:${(SYSTEMS.length-gaps.length)/SYSTEMS.length*100}%;background:${gaps.length?'var(--warn)':'var(--safe)'}"></i></div>
      ${gaps.length ? '<div class="note">'+esc(gaps.map(g=>g.s+' ('+fa(g.n)+')').join('، '))+'</div>' : ''}</div>`;
  if (live.length < 30) h += '<div class="ocrwarn">نمونه‌ها هنوز کم است ('+fa(live.length)+' نکته).</div>';
  $('healthBox').innerHTML = h;
}

/* ==================== عملکرد و پایداری ==================== */
async function renderPerf(){
  if (!db){ $('perfBox').innerHTML = '<div class="note">در حال بارگذاری…</div>'; return; }
  const raw = await getAllRaw();
  const live = raw.filter(u=>!u.hidden && u.review!=='rejected');
  const pinned = live.filter(u=>u.pin).length;
  const inSrs = live.filter(u=>u.srs).length;
  const conflicts = Math.floor(live.filter(u=>u.conflictWith).length/2);
  const last = lastBackupAt();
  const days = last ? Math.floor((Date.now()-last)/DAY) : null;
  const cacheAge = LIVE_CACHE ? Math.round((Date.now()-LIVE_AT)/1000) : null;
  let st2 = 'خالی';
  try {
    if (navigator.storage && navigator.storage.estimate){
      const {usage=0} = await navigator.storage.estimate();
      st2 = mb(usage);
    }
  } catch{}
  $('perfBox').innerHTML = `
    <div class="row"><span>نکات فعال</span><b>${fa(live.length)}</b></div>
    <div class="row"><span>نشان‌دار ⭐</span><b>${fa(pinned)}</b></div>
    <div class="row"><span>در چرخه‌ی مرور</span><b>${fa(inSrs)}</b></div>
    <div class="row"><span>تعارض باز</span><b>${conflicts ? fa(conflicts) + ' ⚠' : 'ندارد ✓'}</b></div>
    <div class="row"><span>صف بازبینی</span><b>${fa(raw.filter(u=>u.review==='pending').length)}</b></div>
    <div class="row"><span>کش جستجو</span><b>${cacheAge != null ? 'فعال ✓ (' + fa(cacheAge) + ' ثانیه)' : 'غیرفعال'}</b></div>
    <div class="row"><span>حجم داده</span><b>${st2}</b></div>
    <div class="row"><span>آخرین پشتیبان</span><b>${days != null ? fa(days) + ' روز پیش' + (days > 7 ? ' ⚠' : ' ✓') : 'هرگز ⚠'}</b></div>`;
}
async function optimizeNow(){
  invalidateCaches();
  await ensureDupIndex();
  await getLiveUnits();
  renderPerf(); renderHealth();
  toast('کش‌ها نوسازی شد ✓');
}

/* ==================== یادآور پشتیبان ==================== */
function lastBackupAt(){ return +(localStorage.getItem('aem-last-backup')||0); }
function markBackup(){ localStorage.setItem('aem-last-backup', String(Date.now())); }
async function renderBackupCard(){
  const card = $('backupCard'); if (!card || !db) return;
  const n = (await getLiveUnits()).length;
  const last = lastBackupAt();
  const days = last ? Math.floor((Date.now()-last)/DAY) : null;
  const lb = $('setLastBak');
  if (lb) lb.textContent = last ? new Date(last).toLocaleDateString('fa-IR') : 'هرگز';
  if (n >= 10 && (!last || days > 7)){
    card.style.display = 'block';
    card.innerHTML = `<b>💾 پشتیبان می‌خواهیم!</b>
      <span>${last ? fa(days) + ' روز از آخرین پشتیبان گذشته.' : 'هنوز پشتیبان نگرفتی و ' + fa(n) + ' نکته داری.'} با یک کلیک فایل پشتیبان بگیر.</span>`;
  } else {
    card.style.display = 'none';
  }
}

/* ==================== آمار پروژه ==================== */
async function renderStats(){
  if (!db){ $('statsBox').innerHTML = '<div class="note">در حال بارگذاری…</div>'; return; }
  const raw = await getAllRaw();
  const live = raw.filter(u=>!u.hidden && u.review!=='rejected' && !u.offdomain);
  const ver = live.filter(u=>u.confidence==='verified').length;
  const verPct = live.length ? Math.round(ver/live.length*100) : 0;
  const sessions = (await getSessions());
  const doneS = sessions.filter(s=>s.done);
  const exOk = skCount('exercise_ok'), exBad = skCount('exercise_bad'),
        scOk = skCount('scenario_ok'), scBad = skCount('scenario_bad'),
        rok = skCount('srs_ok'), rbad = skCount('srs_bad');
  const sources = new Set(live.map(u=>u.srcName)).size;
  const perSys = SYSTEMS.map(s=>({s, n: live.filter(u=>u.system===s).length}))
    .sort((a,b)=>b.n-a.n).slice(0,5);
  const maxN = Math.max(1, ...perSys.map(p=>p.n));
  const srsStats = await srsCounts();
  const pins = live.filter(u=>u.pin).length;
  $('statsBox').innerHTML = `
    <div class="row"><span>خودروها در گاراژ</span><b>${fa(CARS.length)}</b></div>
    <div class="row"><span>کارت‌های مرور</span><b>${fa(srsStats.total)} (${fa(srsStats.due)} سرسید · ${fa(srsStats.mature)} تثبیت‌شده)</b></div>
    <div class="row"><span>نشان‌دار ⭐</span><b>${fa(pins)}</b></div>
    <div class="row"><span>تأییدشده</span><b>${fa(verPct)}٪ (${fa(ver)} از ${fa(live.length)})</b></div>
    <div class="row"><span>منابع مختلف</span><b>${fa(sources)}</b></div>
    <div class="row"><span>جلسات عیب‌یابی تمام‌شده</span><b>${fa(doneS.length)}</b></div>
    <div class="row"><span>مرور / تمرین / سناریو</span><b>${fa(rok)}✓${rbad?' · '+fa(rbad)+'✗':''} | ${fa(exOk)}✓${exBad?' · '+fa(exBad)+'✗':''} | ${fa(scOk)}✓${scBad?' · '+fa(scBad)+'✗':''}</b></div>
    <div style="margin-top:8px"><b style="font-size:12px;color:var(--text-secondary)">پرشمارترین سیستم‌ها:</b></div>
    ${perSys.filter(p=>p.n).map(p=>`
      <div class="statbar"><div class="sb-t"><span>${esc(p.s)}</span><span>${fa(p.n)}</span></div>
      <div class="gbar"><i style="width:${Math.round(p.n/maxN*100)}%"></i></div></div>`).join('')}`;
}

/* ==================== مرور فاصله‌دار ==================== */
const SRS_INTERVALS = [1, 3, 7, 21];
function srsState(u){ return u.srs || null; }
async function srsCounts(){
  const all = (await getLiveUnits()).filter(u=>u.confidence==='verified' && !u.offdomain);
  const now = Date.now();
  return {
    total: all.filter(u=>u.srs).length,
    due: all.filter(u=>u.srs && u.srs.due <= now).length,
    mature: all.filter(u=>u.srs && u.srs.lvl >= SRS_INTERVALS.length).length,
    fresh: all.filter(u=>!u.srs).length
  };
}
function srsBuildCard(u){
  const r = findRef(u.body);
  let q, a, aHtml;
  if (r){
    q = 'مقدار مرجع برای «' + u.title + '» چقدر است؟';
    a = 'از ' + r.lo + ' تا ' + r.hi + ' ' + UFA[r.unit];
    aHtml = '<span class="val">' + fa(r.lo) + ' تا ' + fa(r.hi) + ' ' + UFA[r.unit] + '</span>';
  } else {
    q = u.title;
    a = u.body.length > 260 ? u.body.slice(0,260) + '…' : u.body;
    aHtml = hl(a);
  }
  return {u, r, q, a, aHtml};
}
async function srsQueue(limit){
  const all = (await getLiveUnits()).filter(u=>u.confidence==='verified' && !u.offdomain);
  const now = Date.now();
  const due = all.filter(u => u.srs && u.srs.due <= now);
  const fresh = all.filter(u => !u.srs);
  due.sort((a,b)=>a.srs.due - b.srs.due);
  fresh.sort((a,b)=>(b.quality||0)-(a.quality||0));
  return [...due, ...fresh].slice(0, limit || 15);
}
async function srsMark(u, ok){
  const cur = srsState(u) || {lvl:0, due:0, ok:0, bad:0};
  if (ok){
    cur.lvl = Math.min(SRS_INTERVALS.length, cur.lvl + 1);
    cur.ok = (cur.ok||0) + 1;
    cur.due = Date.now() + (cur.lvl >= SRS_INTERVALS.length ? 30 : SRS_INTERVALS[cur.lvl]) * DAY;
  } else {
    cur.lvl = 0;
    cur.bad = (cur.bad||0) + 1;
    cur.due = Date.now() + DAY;
  }
  cur.last = Date.now();
  u.srs = cur;
  await saveU(u);
  skLog(ok ? 'srs_ok' : 'srs_bad', u.id);
  return cur;
}
let SRSQ = null, SRSI = 0, SRSSHOWN = false, SRSSTATS = {ok:0, bad:0};
async function openSRS(){
  SRSQ = await srsQueue();
  SRSI = 0; SRSSHOWN = false; SRSSTATS = {ok:0, bad:0};
  if (!SRSQ.length){
    const c = await srsCounts();
    openSheet(`<h2>🧠 مرور امروز</h2>
      <div class="fdone"><div class="em">🎉</div><b>کارت سرسید نداری!</b>
      <p class="note" style="margin-top:8px">${c.total ? 'همه‌ی ' + fa(c.total) + ' کارتت برای روزهای بعد برنامه‌ریزی شده‌اند. آفرین!' : 'بعد از تأیید اولین نکته‌ها در بازبینی، کارت‌ها اینجا ساخته می‌شوند.'}</p></div>
      <div class="btns"><button class="btn ghost full" onclick="closeSheet()">بستن</button></div>`);
    return;
  }
  srsDrawCard();
}
function srsDrawCard(){
  if (SRSI >= SRSQ.length) return srsFinish();
  const card = srsBuildCard(SRSQ[SRSI]);
  const u = card.u;
  SRSSHOWN = false;
  openSheet(`<h2>🧠 مرور (${fa(SRSI+1)} از ${fa(SRSQ.length)})</h2>
    <div class="fcard" id="fcard">
      <div class="fhead"><b>کارت مرور</b><span class="flvl">سطح ${fa(srsState(u)?.lvl||0)}</span></div>
      <div class="fq">${esc(card.q)}</div>
      <div id="fanswer"></div>
      <div class="fmeta">منبع: ${esc(u.srcName)} · ${esc(u.page)}${u.car ? ' · 🚗 '+esc(u.car) : ''}</div>
    </div>
    <div class="btns"><button class="btn ghost" onclick="srsSpeak(${u.id})">🔊 بخوان</button></div>
    <div class="btns" id="factions">
      <button class="btn full" onclick="srsShow()">نمایش جواب</button>
    </div>
    <div class="btns"><button class="btn muted sm" onclick="srsPostpone()">بعداً</button>
    <button class="btn ghost sm" onclick="closeSheet()">بستن</button></div>`);
}
function srsShow(){
  if (SRSSHOWN) return;
  SRSSHOWN = true;
  const card = srsBuildCard(SRSQ[SRSI]);
  $('fanswer').innerHTML = `<div class="fa"><b>جواب:</b><br>${card.aHtml}
    <div class="note" style="margin-top:4px">شرایط تست: ${esc(testCond(card.u.body))}</div></div>`;
  $('factions').innerHTML = `
    <button class="btn fbad" onclick="srsJudge(false)">✗ نمی‌دونستم</button>
    <button class="btn fok" onclick="srsJudge(true)">✓ بلد بودم</button>`;
}
async function srsJudge(ok){
  const u = SRSQ[SRSI];
  const st2 = await srsMark(u, ok);
  SRSSTATS[ok ? 'ok' : 'bad']++;
  if (navigator.vibrate) navigator.vibrate(ok ? 20 : [30,50,30]);
  const nextIn = st2.lvl >= SRS_INTERVALS.length ? '۳۰ روز' : fa(SRS_INTERVALS[st2.lvl]) + ' روز';
  toast(ok ? 'آفرین! بار بعد: ' + nextIn : 'فردا دوباره می‌پرسم');
  SRSI++; SRSSHOWN = false;
  srsDrawCard();
}
function srsPostpone(){ SRSI++; srsDrawCard(); }
function srsSpeak(id){
  const u = SRSQ[SRSI]; if (!u) return;
  const card = srsBuildCard(u);
  let t = card.q + '. ';
  if (SRSSHOWN) t += 'جواب: ' + card.a + '.';
  speak(t);
}
function srsFinish(){
  const total = SRSSTATS.ok + SRSSTATS.bad;
  const pct = total ? Math.round(SRSSTATS.ok/total*100) : 0;
  const c = skCount('srs_ok'), b = skCount('srs_bad');
  openSheet(`<h2>🧠 مرور تمام شد</h2>
    <div class="fdone"><div class="em">${pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📚'}</div>
    <b>${fa(SRSSTATS.ok)} از ${fa(total)} درست</b>
    <p class="note" style="margin-top:8px">دقت: ${fa(pct)}٪ · کل رکورد مرور: ${fa(c)}✓ ${b? '· '+fa(b)+'✗' : ''}<br>
    کارت‌های درست برای روزهای بعد برنامه‌ریزی شدند؛ کارت‌های غلط فردا برمی‌گردند.</p></div>
    <div class="btns">
      <button class="btn" onclick="closeSheet();renderSRSCard()">عالیه، بستن</button>
      <button class="btn ghost" onclick="openSRS()">دور دیگر</button>
    </div>`);
  refreshCounts();
  renderSRSCard();
}
async function renderSRSCard(){
  const card = $('srsCard'); if (!card || !db) return;
  const c = await srsCounts();
  if (c.due > 0){
    card.style.display = 'block';
    card.innerHTML = `<b>🧠 مرور امروز — ${fa(c.due)} کارت سرسید</b>
      <span>بذار محک بزنیم که چیزی فراموش نشده! (${c.fresh ? fa(c.fresh)+' کارت تازه هم هست.' : ''})</span>`;
  } else if (c.total === 0 && c.fresh > 0){
    card.style.display = 'block';
    card.innerHTML = `<b>🧠 کارت‌های مرور آماده‌اند</b><span>${fa(Math.min(c.fresh, 15))} نکته‌ی تأییدشده منتظر اولین مرورند.</span>`;
  } else {
    card.style.display = 'none';
  }
}
async function renderSRSSetBox(){
  if (!db){ $('srsSetBox').innerHTML = '<div class="note">در حال بارگذاری…</div>'; return; }
  const c = await srsCounts();
  $('srsSetBox').innerHTML = `
    <div class="row"><span>کارت‌های ساخته‌شده</span><b>${fa(c.total)}</b></div>
    <div class="row"><span>سرسید امروز</span><b>${fa(c.due)}</b></div>
    <div class="row"><span>تثبیت‌شده (۲۱+ روز)</span><b>${fa(c.mature)}</b></div>
    <div class="row"><span>در انتظار ورود به چرخه</span><b>${fa(c.fresh)}</b></div>`;
}
async function openSRSStats(){
  if (!db) return;
  const all = (await getLiveUnits()).filter(u=>u.confidence==='verified' && u.srs);
  const lv = [0,0,0,0,0];
  for (const u of all) lv[Math.min(4, u.srs.lvl||0)]++;
  const labels = ['تازه (فردا)','۱→۳ روز','۳→۷ روز','۷→۲۱ روز','تثبیت‌شده'];
  const maxN = Math.max(1, ...lv);
  openSheet(`<h2>آمار مرور فاصله‌دار</h2>
    <p class="note">${fa(all.length)} کارت فعال · دقت کلی: ${fa(skCount('srs_ok'))}✓ / ${fa(skCount('srs_bad'))}✗</p>
    ${lv.map((n,i)=>`
      <div class="statbar"><div class="sb-t"><span>${labels[i]}</span><span>${fa(n)}</span></div>
      <div class="gbar"><i style="width:${Math.round(n/maxN*100)}%;background:#C8A2FF"></i></div></div>`).join('')}
    <div class="btns"><button class="btn ghost full" onclick="closeSheet()">بستن</button></div>`);
}

/* ==================== گزارش جلسه ==================== */
function sessionReport(s){
  const L = [];
  L.push('🔧 گزارش عیب‌یابی برق خودرو');
  L.push('────────────────────');
  L.push('📅 تاریخ: ' + (s.finished ? new Date(s.finished).toLocaleDateString('fa-IR') : new Date().toLocaleDateString('fa-IR')));
  if (s.carName) L.push('🚗 خودرو: ' + s.carName);
  L.push('⚙️ سیستم: ' + s.sys);
  L.push('❗ علامت: ' + (s.symptom || '—'));
  if (s.dtc) L.push('📟 کد خطا: ' + s.dtc);
  L.push('');
  const steps = (s.steps||[]);
  const units = steps.filter(x=>x.type==='unit');
  if (units.length){
    L.push('📋 اندازه‌گیری‌ها:');
    for (const x of units){
      let ln = '• ' + x.title;
      if (x.value != null){
        ln += ' → ' + fa(x.value) + ' ' + (UFA[x.unit]||'');
        if (x.ref) ln += ' (مرجع: ' + fa(x.ref.lo) + ' تا ' + fa(x.ref.hi) + ' ' + UFA[x.ref.unit] + ')';
        if (x.result === 'out') ln += ' ⚠ خارج از مرجع';
        if (x.result === 'ok') ln += ' ✓ سالم';
      } else if (x.status === 'skip'){
        ln += ' — (انجام نشد)';
      } else {
        ln += ' — (بدون عدد)';
      }
      ln += ' [منبع: ' + x.srcName + (x.page ? ' · ' + x.page : '') + ']';
      L.push(ln);
    }
    L.push('');
  }
  const outs = units.filter(x=>x.result==='out');
  const oks = units.filter(x=>x.result==='ok');
  L.push('🧭 نتیجه:');
  if (outs.length){
    L.push('این مدارها خارج از مشخصه‌ی مرجع اندازه‌گیری شدند (شواهد مستقیم عیب):');
    for (const x of outs) L.push('  ← ' + x.title + ' (' + fa(x.value) + ' ' + UFA[x.unit] + ' در برابر مرجع ' + fa(x.ref.lo) + ' تا ' + fa(x.ref.hi) + ')');
  } else if (oks.length){
    L.push('همه‌ی مدارهای بررسی‌شده در محدوده‌ی مرجع بودند؛ عیب احتمالاً در مدار دیگری است.');
  } else {
    L.push('نتیجه‌ی عددی مستندی ثبت نشد.');
  }
  const cs = causalFor(s.fixedSym || s.symptom).filter(c=>c.sys===s.sys);
  if (cs.length){
    L.push('');
    L.push('🔍 فرضیه‌های باز (به ترتیب احتمال):');
    cs[0].causes.forEach((x,i)=>L.push((i+1) + ') ' + x.c));
  }
  L.push('');
  L.push('ـ ساخته‌شده با «استاد برق خودرو» — بر پایه‌ی اندازه‌گیری‌ها و دانش‌نامه‌ی شخصی، نه تشخیص قطعی.');
  return L.join('\n');
}
async function openSessionReport(id){
  const s = (await getSessions()).find(x=>x.id===id); if (!s) return;
  const txt = sessionReport(s);
  openSheet(`<h2>📄 گزارش جلسه</h2>
    <p class="note">این متن را کپی کن و برای استادت یا مشتری بفرست — شواهد، اعداد و منابع همه داخلش هست.</p>
    <textarea class="fld report" id="rep-txt">${esc(txt)}</textarea>
    <div class="btns">
      <button class="btn" onclick="copyReport()">کپی گزارش 📋</button>
      <button class="btn ghost" onclick="shareReport()">اشتراک‌گذاری</button>
    </div>
    <div class="btns"><button class="btn ghost full" onclick="closeSheet()">بستن</button></div>`);
}
function copyReport(){
  const ta = $('rep-txt');
  ta.select();
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(ta.value).then(()=>toast('کپی شد ✓')).catch(()=>{ document.execCommand('copy'); toast('کپی شد ✓'); });
  } else {
    document.execCommand('copy'); toast('کپی شد ✓');
  }
}
async function shareReport(){
  const txt = $('rep-txt').value;
  if (navigator.share){
    try { await navigator.share({text: txt, title:'گزارش عیب‌یابی برق خودرو'}); }
    catch{}
  } else {
    copyReport();
  }
}
async function openLastReport(){
  const done = (await getSessions()).filter(s=>s.done).sort((a,b)=>(b.finished||0)-(a.finished||0));
  if (!done.length) return toast('هنوز جلسه‌ای تمام نشده');
  openSessionReport(done[0].id);
}

/* ==================== بازبینی ==================== */
async function renderOrigin(u){
  if (!u.fileId) return '';
  try {
    const file = await opfsGet(u.fileId);
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data:buf}).promise;
    const pageNum = parseInt(String(u.page).replace(/[۰-۹]/g, d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)), 10);
    if (!pageNum || pageNum < 1 || pageNum > pdf.numPages) return '';
    const page = await pdf.getPage(pageNum);
    const vp = page.getViewport({scale: 2});
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({canvasContext: canvas.getContext('2d'), viewport: vp}).promise;
    setTimeout(() => {
      const holder = document.getElementById('origin-holder');
      if (holder){ holder.innerHTML = ''; holder.appendChild(canvas); }
    }, 0);
    return `<div class="sbs" id="origin-holder"><div class="note" style="padding:10px">در حال بارگذاری صفحه…</div></div>
      <div class="meta">بالا صفحه‌ی اصلی، پایین متن استخراج‌شده</div>`;
  } catch { return ''; }
}

async function openReview(){
  const pend = (await getAllRaw()).filter(u => u.review === 'pending')
    .sort((a,b)=>(((b.offdomain||b.lowq)?0:1)-((a.offdomain||a.lowq)?0:1)) || ((b.quality||0)-(a.quality||0)) || ((a.skippedAt||0)-(b.skippedAt||0)) || (a.id-b.id));
  if (!pend.length){ closeSheet(); return toast('صف بازبینی خالی است ✓'); }
  const u = pend[0];
  const vals = (u.values||[]).length ? `<div class="vals">${u.values.map(v=>`<span>${esc(v)}</span>`).join('')}</div>` : '';
  const ocrBad = u.ocr && (u.ocrConf||100) < 70;
  const mapBtn = (u.fileId && !u.mapAnalysis) ?
    `<div class="btns"><button class="btn ghost" onclick="queueMapJob('${esc(u.fileId)}',${parseInt(String(u.page).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)),10)||0})">🗺️ تحلیل نقشه‌ی این صفحه</button></div>` : '';
  openSheet(`
    <h2>بازبینی (${fa(pend.length)} مانده)</h2>
    <span class="b ${esc(u.srcType)}">${SRC[u.srcType]||''}</span><span class="b user">${esc(u.system)}</span>
    ${u.carId && carNameById(u.carId) ? `<span class="b car">🚗 ${esc(carNameById(u.carId))}</span>` : ''}
    ${u.mapAnalysis ? '<span class="b map">🗺️ تحلیل نقشه</span>' : ''}
    ${u.offdomain ? '<span class="b offdomain">خارج از حوزه</span>' : ''}
    ${u.lowq ? '<span class="b lowq">کیفیت پایین</span>' : ''}
    ${(u.offdomain||u.lowq) ? '<div class="offwarn">⚠ این تکه در پالایش خودکار علامت خورد. اگر نکته‌ی فنی مفیدی دارد، ویرایش و تأییدش کن؛ وگرنه ردش کن.</div>' : ''}
    ${u.ocr ? `<div class="ocrwarn">⚠ متن OCR${u.ocrConf ? ' (اطمینان: '+fa(u.ocrConf)+'٪)' : ''}${ocrBad ? ' — اطمینان پایین' : '.'}</div>` : ''}
    <div id="origin-wrap">${await renderOrigin(u)}</div>
    <label>عنوان</label><input class="fld" id="r-title" value="${esc(u.title)}">
    <label>متن</label>
    <textarea class="fld" id="r-body" style="min-height:150px">${esc(u.body)}</textarea>
    ${vals}
    <div class="meta">منبع: ${esc(u.srcName)} · ${esc(u.page)}${u.car ? ' · 🚗 '+esc(u.car) : ''}</div>
    <p class="note">✓ تأیید = این نکته وارد چرخه‌ی مرور فاصله‌دار هم می‌شود.</p>
    <div class="btns">
      <button class="btn" onclick="reviewAct(${u.id},'approve')">تأیید ✓</button>
      <button class="btn danger" onclick="reviewAct(${u.id},'reject')">رد ✕</button>
    </div>
    <div class="btns"><button class="btn ghost" onclick="reviewAct(${u.id},'skip')">بعداً</button>
    <button class="btn ghost" onclick="closeSheet();refreshCounts()">بستن</button></div>
    ${mapBtn}`);
}

async function reviewAct(id, act){
  const u = await getOne(id); if (!u) return;
  const now = Date.now();
  if (act === 'skip'){
    u.skippedAt = now; await saveU(u);
  } else if (act === 'approve'){
    const t = $('r-title').value.trim(), b = $('r-body').value.trim();
    if (!t || !b) return toast('عنوان و متن لازم است');
    if (t !== u.title || b !== u.body) u.versions.push({at:now, title:t, body:b, edited:true});
    u.title = t; u.body = b; u.values = extractValues(b);
    u.review = 'approved'; u.confidence = 'verified';
    u.offdomain = false; u.lowq = false;
    u.aiLine = aiLine(u);
    await saveU(u);
    const c = await flagConflict(u);
    toast(c ? '⚠ تأیید شد، ولی تعارض دارد' : '✓ ثبت شد — به چرخه‌ی مرور هم رفت');
  } else {
    u.review = 'rejected'; u.rejectedAt = now;
    await saveU(u); toast('رد شد');
  }
  renderList(); renderQChips(); refreshCounts(); renderSRSCard();
  openReview();
}

/* ==================== دانش‌نامه ==================== */
const kbCollapsed = {};
const kbExpanded = {};
const GRP_PAGE = 25;
let LAST_GROUPS = {};
const QUICK = [
  {k:'verified', l:'فقط تأییدشده'},
  {k:'ocr', l:'فقط OCR'},
  {k:'map', l:'تحلیل نقشه'},
  {k:'offdomain', l:'خارج از حوزه'},
  {k:'conflict', l:'تعارض‌دارها'},
  {k:'lowq', l:'کیفیت پایین'}
];
function searchMatch(u, q){
  if (!q) return true;
  const qf = symptomNormalize(q);
  const hay = [u.title,u.body,u.car,u.srcName].join(' ');
  if (hay.toLowerCase().includes(qf.toLowerCase())) return true;
  const toks = expandToks(tokens(qf));
  if (!toks.length) return false;
  const nh = norm(hay);
  return toks.some(t => nh.includes(t));
}
function unitBtnHtml(u){
  return `<button class="unit ${u.conflictWith?'conf':''}" data-id="${u.id}">
    <h3>${u.pin ? '<span class="pin">⭐ </span>' : ''}${esc(u.title)}</h3>
    <p>${esc(u.body)}</p>
    <span class="b ${esc(u.srcType)}">${SRC[u.srcType]||''}</span>
    ${u.carId && carNameById(u.carId) ? `<span class="b car">🚗 ${esc(carNameById(u.carId))}</span>` : ''}
    ${u.pin ? '<span class="b star">⭐ نشان</span>' : ''}
    ${u.srs ? '<span class="b srs">🧠 مرور</span>' : ''}
    ${u.mapAnalysis ? '<span class="b map">🗺️ نقشه</span>' : ''}
    ${u.ocr ? '<span class="b ocr">OCR</span>' : ''}
    ${u.offdomain ? '<span class="b offdomain">خارج از حوزه</span>' : ''}
    ${u.lowq && !u.offdomain ? '<span class="b lowq">کیفیت پایین</span>' : ''}
    ${u.conflictWith ? '<span class="b conflict">⚠ تعارض</span>' : ''}
  </button>`;
}
function grpBodyHtml(items, sys){
  const expanded = kbExpanded[sys];
  const shown = expanded ? items : items.slice(0, GRP_PAGE);
  let h = shown.map(unitBtnHtml).join('');
  if (!expanded && items.length > GRP_PAGE){
    h += `<button class="morebtn" onclick="kbExpand('${esc(sys)}')">نمایش ${fa(items.length - GRP_PAGE)} نکته‌ی دیگر ↓</button>`;
  }
  return h;
}
function kbExpand(sys){
  kbExpanded[sys] = true;
  const g = document.querySelector('.grp[data-sys="' + CSS.escape(sys) + '"] .grp-b');
  if (!g || !LAST_GROUPS[sys]) return;
  g.innerHTML = grpBodyHtml(LAST_GROUPS[sys], sys);
  bindUnitClicks(g);
}
function bindUnitClicks(root){
  root.querySelectorAll('.unit').forEach(b => b.onclick = () => openDetail(+b.dataset.id));
}
async function renderList(){
  const all = await getLiveUnits();
  const ac = activeCar();
  const q = fText.trim();
  const filtered = all.filter(u =>
    (!ac || !u.carId || String(u.carId) === String(ac.id)) &&
    (!fSystem || u.system === fSystem) &&
    (!fQuick ||
      (fQuick==='verified' && u.confidence==='verified') ||
      (fQuick==='ocr' && u.ocr) ||
      (fQuick==='map' && u.mapAnalysis) ||
      (fQuick==='offdomain' && (u.offdomain||u.lowq)) ||
      (fQuick==='conflict' && u.conflictWith) ||
      (fQuick==='lowq' && u.lowq)) &&
    searchMatch(u, q)
  );
  const nVer = all.filter(u=>u.confidence==='verified').length;
  const nOcr = all.filter(u=>u.ocr).length;
  const nOff = all.filter(u=>u.offdomain||u.lowq).length;
  const nPin = all.filter(u=>u.pin).length;
  $('kbSum').innerHTML = `
    <div><b>${fa(all.length)}</b>کل</div>
    <div><b>${fa(nVer)}</b>تأییدشده</div>
    <div><b>${fa(nOcr)}</b>OCR</div>
    <div><b>${fa(nPin)}</b>⭐ نشان</div>`;
  const sysCounts = {};
  for (const u of all) if (!u.offdomain) sysCounts[u.system] = (sysCounts[u.system]||0)+1;
  $('chips').innerHTML = ['همه', ...SYSTEMS].filter(s => s==='همه' || sysCounts[s]).map(s =>
    `<button class="chip ${(s==='همه'&&!fSystem)||s===fSystem?'on':''}" data-s="${esc(s)}">${esc(s)}${s!=='همه' ? ' · '+fa(sysCounts[s]) : ''}</button>`).join('');
  $('chips').querySelectorAll('.chip').forEach(c => c.onclick = () => {
    fSystem = c.dataset.s === 'همه' ? '' : c.dataset.s; renderList();
  });
  $('qchips2').innerHTML = QUICK.map(x =>
    `<button class="chip ${fQuick===x.k?'on':''}" data-qk="${x.k}">${x.l}</button>`).join('');
  $('qchips2').querySelectorAll('.chip').forEach(c => c.onclick = () => {
    fQuick = fQuick === c.dataset.qk ? '' : c.dataset.qk; renderList();
  });
  const list = $('list');
  if (!all.length){
    list.innerHTML = `<div class="empty"><svg viewBox="0 0 96 96" fill="none"><path d="M12 60 H34 L40 40 L54 76 L62 56 H84" stroke="#3D3D3D" stroke-width="3"/><circle cx="40" cy="40" r="5" fill="#FF9F1C"/></svg><h3>دانش‌نامه هنوز خالیه</h3><p>اولین منبع را اضافه کن 🔧</p></div>`;
    updateCount(all); updateRevCount(); return;
  }
  const groups = {};
  for (const u of filtered) (groups[u.system] = groups[u.system] || []).push(u);
  LAST_GROUPS = groups;
  const order = SYSTEMS.filter(s => groups[s]).concat(Object.keys(groups).filter(s => !SYSTEMS.includes(s)));
  if (!filtered.length){
    list.innerHTML = `<div class="empty"><p>چیزی با این فیلترها پیدا نشد.</p></div>`;
  } else {
    list.innerHTML = order.map(sys => {
      const items = groups[sys].sort((a,b)=>((b.pin?1:0)-(a.pin?1:0)) || (b.quality||0)-(a.quality||0) || b.created-a.created);
      const open = kbCollapsed[sys] !== false;
      return `<div class="grp ${open?'open':''}" data-sys="${esc(sys)}" data-g="${esc(sys)}">
        <button class="grp-h"><span class="arr">◂</span> ${esc(sys)} <span class="cnt">${fa(items.length)}</span></button>
        <div class="grp-b">${grpBodyHtml(items, sys)}</div>
      </div>`;
    }).join('');
    list.querySelectorAll('.grp-h').forEach(b => b.onclick = () => {
      const g = b.parentElement;
      g.classList.toggle('open');
      kbCollapsed[g.dataset.g] = g.classList.contains('open');
    });
    bindUnitClicks(list);
  }
  updateCount(all);
  updateRevCount();
}

function updateCount(all){
  $('kbCount').textContent = fa(all.filter(u=>!u.offdomain && !u.lowq).length);
  const last = all.reduce((m,u) => Math.max(m,u.created), 0);
  $('lastAdd').textContent = last ? new Date(last).toLocaleDateString('fa-IR') : '—';
}
async function updateRevCount(){
  if (!db) return 0;
  const n = (await getAllRaw()).filter(u => u.review === 'pending').length;
  $('revBtn').textContent = '🔍 بازبینی (' + fa(n) + ')';
  $('pendCount').textContent = fa(n);
  return n;
}
async function refreshCounts(){
  updateCount(await getLiveUnits());
  await updateRevCount();
  const open = (await getSessions()).some(s => !s.done);
  $('contCard').style.display = open ? 'block' : 'none';
}

function openSheet(html){ $('sheetBody').innerHTML = html; $('sheet').classList.add('open'); bindGloss($('sheetBody')); return $('sheetBody'); }
function closeSheet(){ $('sheet').classList.remove('open'); }

function openAdd(){
  const car = activeCar();
  openSheet(`
    <h2>نکته‌ی جدید</h2>
    <label>عنوان *</label><input class="fld" id="f-title" placeholder="مثلاً: ولتاژ شارژ آلترناتور">
    <label>متن نکته * (محاوره خودکار رسمی می‌شود)</label>
    <textarea class="fld" id="f-body" placeholder="مثلاً: با موتور روشن، ولتاژ باتری باید ۱۳٫۸ تا ۱۴٫۴ ولت باشد."></textarea>
    <label>سیستم</label>
    <select class="fld" id="f-sys">${SYSTEMS.map(s=>`<option>${s}</option>`).join('')}</select>
    <label>نوع منبع</label>
    <select class="fld" id="f-type">${Object.entries(SRC).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>
    <label>نام منبع</label><input class="fld" id="f-src" placeholder="مثلاً: دفترچه پژو پارس">
    <label>صفحه یا زمان</label><input class="fld" id="f-page" placeholder="مثلاً: ۴۵ یا دقیقه ۱۲:۳۰">
    <label>خودرو (خالی = خودروی فعال ${car ? '«'+esc(car.name)+'»' : ''})</label><input class="fld" id="f-car" value="${car?esc(car.name):''}">
    <div class="btns"><button class="btn" onclick="saveUnit()">ذخیره</button><button class="btn ghost" onclick="closeSheet()">انصراف</button></div>`);
}

async function flagConflict(u){
  const raw = await getAllRaw();
  const tn = norm(u.title);
  const other = raw.find(o => o.id !== u.id && !o.hidden && o.review !== 'rejected' &&
    o.system === u.system && norm(o.title) === tn && norm(o.body) !== norm(u.body));
  if (!other) return false;
  u.conflictWith = other.id; await saveU(u);
  other.conflictWith = u.id; await saveU(other);
  return true;
}

async function saveUnit(){
  const g = id => $(id).value.trim();
  let title = g('f-title'), body = g('f-body');
  if (!title || !body) return toast('عنوان و متن لازم است');
  body = cleanColloq(body); body = stripFillers(body); body = normalizeUnits(body);
  if (!body || body.length < 25) return toast('متن بعد از پالایش خیلی کوتاه شد');
  title = cleanColloq(title);
  if (await isDuplicate(body)) return toast('⚠ این نکته قبلاً ثبت شده (تکراری)');
  const now = Date.now();
  const u = {
    title, body, fp:fp(body), system:g('f-sys'), srcType:g('f-type'),
    srcName:g('f-src') || 'نامشخص در منبع', page:g('f-page') || 'نامشخص در منبع',
    car:g('f-car'), carId: g('f-car') ? (activeCar() ? activeCar().id : '') : '',
    confidence:'extracted', hidden:false, created:now,
    offdomain:false, lowq:false,
    quality:qualityScore(body), values:extractValues(body),
    versions:[{at:now, title, body}]
  };
  u.aiLine = aiLine(u);
  u.id = await saveU(u);
  const c = await flagConflict(u);
  closeSheet(); toast(c ? '⚠ ثبت شد، ولی تعارض دارد' : 'ثبت شد ✓');
  renderList(); renderQChips(); refreshCounts();
}

/* ==================== نشان‌گذاری ⭐ ==================== */
async function togglePin(id){
  const u = await getOne(id); if (!u) return;
  u.pin = !u.pin;
  await saveU(u);
  toast(u.pin ? '⭐ نشان زده شد — در چت و جستجو سرِ دست است' : 'نشان برداشته شد');
  openDetail(id);
  renderList(); renderQChips();
}

async function openDetail(id){
  const u = await getOne(id); if (!u) return;
  const conf = u.confidence === 'verified' ? 'تأییدشده' :
    u.confidence === 'inferred' ? 'استنباط مدل' : 'استخراج‌شده';
  let cbox = '';
  if (u.conflictWith){
    const o = await getOne(u.conflictWith);
    if (o) cbox = `<div class="confbox"><b>⚠ تعارض ثبت‌شده</b><br>نسخه‌ی این نکته:<br>${esc(u.body)}<br><span class="meta">منبع: ${esc(u.srcName)} · ${esc(u.page)}</span><hr style="border-color:#333;margin:6px 0">نسخه‌ی دیگر:<br>${esc(o.body)}<br><span class="meta">منبع: ${esc(o.srcName)} · ${esc(o.page)}</span>
      <div class="btns"><button class="btn ghost sm" onclick="resolveConf(${u.id})">بررسی کردم، برطرف شد</button></div></div>`;
  }
  const vals = (u.values||[]).length ? `<div class="vals">${u.values.map(v=>`<span>${esc(v)}</span>`).join('')}</div>` : '';
  const origin = await renderOrigin(u);
  const mapBtn = (u.fileId && !u.mapAnalysis) ?
    `<div class="btns"><button class="btn ghost" onclick="queueMapJob('${esc(u.fileId)}',${parseInt(String(u.page).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)),10)||0})">🗺️ تحلیل نقشه‌ی این صفحه</button></div>` : '';
  const srsLine = u.srs
    ? `<div class="note">🧠 مرور: سطح ${fa(u.srs.lvl||0)} · درست: ${fa(u.srs.ok||0)} · غلط: ${fa(u.srs.bad||0)} · بعدی: ${u.srs.due <= Date.now() ? 'حالا' : new Date(u.srs.due).toLocaleDateString('fa-IR')}</div>`
    : (u.confidence === 'verified' ? '<div class="note">🧠 این نکته در چرخه‌ی مرور نیست — در «مرور امروز» اولین بار می‌آید.</div>' : '');
  openSheet(`
    <h2>${u.pin ? '⭐ ' : ''}${esc(u.title)}</h2>
    <span class="b ${esc(u.srcType)}">${SRC[u.srcType]||''}</span>
    <span class="b user">${esc(u.system)}</span>
    ${u.carId && carNameById(u.carId) ? `<span class="b car">🚗 ${esc(carNameById(u.carId))}</span>` : ''}
    ${u.pin ? '<span class="b star">⭐ نشان‌دار</span>' : ''}
    ${u.mapAnalysis ? '<span class="b map">🗺️ تحلیل نقشه</span>' : ''}
    ${u.offdomain ? '<span class="b offdomain">خارج از حوزه</span>' : ''}
    ${cbox}
    ${origin}
    <div class="det-body">${esc(u.body)}</div>
    ${vals}
    <div class="meta">منبع: ${esc(u.srcName)} · ${esc(u.page)}</div>
    ${u.car ? `<div class="note">خودرو: ${esc(u.car)}</div>` : ''}
    ${u.ocr ? `<div class="ocrwarn">⚠ متن OCR${u.ocrConf ? ' (اطمینان: '+fa(u.ocrConf)+'٪)' : ''}؛ اعداد را مقایسه کن.</div>` : ''}
    ${u.confidence==='inferred' ? '<div class="ocrwarn">⚠ خروجی مدل بینایی؛ تطبیق بده.</div>' : ''}
    <div class="note">اعتبار: ${conf} · شرایط تست: ${esc(testCond(u.body))} · کیفیت: ${fa(u.quality||0)}</div>
    ${srsLine}
    <div class="btns">
      <button class="btn ghost" onclick="openEdit(${u.id})">ویرایش</button>
      <button class="btn ghost" onclick="togglePin(${u.id})">${u.pin ? '☆ حذف نشان' : '⭐ نشان بزن'}</button>
      <button class="btn ghost" onclick="closeSheet()">بستن</button>
      <button class="btn danger" onclick="hideUnit(${u.id})">پنهان</button>
    </div>
    ${mapBtn}`);
}

async function resolveConf(id){
  const u = await getOne(id); if (!u) return;
  const o = u.conflictWith ? await getOne(u.conflictWith) : null;
  delete u.conflictWith; await saveU(u);
  if (o){ delete o.conflictWith; await saveU(o); }
  closeSheet(); toast('ثبت شد ✓'); renderList();
}

async function openEdit(id){
  const u = await getOne(id); if (!u) return;
  openSheet(`<h2>ویرایش</h2>
    <label>عنوان</label><input class="fld" id="e-title" value="${esc(u.title)}">
    <label>متن</label><textarea class="fld" id="e-body">${esc(u.body)}</textarea>
    <label>منبع</label><input class="fld" id="e-src" value="${esc(u.srcName)}">
    <label>صفحه یا زمان</label><input class="fld" id="e-page" value="${esc(u.page)}">
    <label>خودرو</label><input class="fld" id="e-car" value="${esc(u.car||'')}">
    <div class="btns"><button class="btn" onclick="saveEdit(${u.id})">ذخیره</button><button class="btn ghost" onclick="openDetail(${u.id})">انصراف</button></div>`);
}
async function saveEdit(id){
  const u = await getOne(id); if (!u) return;
  const t = cleanColloq($('e-title').value.trim());
  const b = cleanColloq($('e-body').value.trim());
  if (!t || !b) return toast('عنوان و متن لازم است');
  u.versions = u.versions || [];
  u.versions.push({at:Date.now(), title:u.title, body:u.body, edited:true});
  u.title = t; u.body = b; u.fp = fp(b);
  u.values = extractValues(b); u.quality = qualityScore(b);
  u.srcName = $('e-src').value.trim() || 'نامشخص در منبع';
  u.page = $('e-page').value.trim() || 'نامشخص در منبع';
  u.car = $('e-car').value.trim();
  u.aiLine = aiLine(u);
  await saveU(u);
  const c = await flagConflict(u);
  toast(c ? '⚠ ذخیره شد، ولی تعارض دارد' : 'ثبت شد ✓');
  renderList(); renderQChips(); openDetail(id);
}

async function hideUnit(id){
  if (!confirm('این نکته پنهان شود؟')) return;
  const u = await getOne(id); u.hidden = true; u.hiddenAt = Date.now();
  await saveU(u); closeSheet(); toast('پنهان شد'); renderList(); refreshCounts();
}

/* ==================== پشتیبان ==================== */
async function backupPayload(){
  return {
    app:'auto-electric-master', v:3,
    exported:new Date().toISOString(),
    units: await getAllRaw(),
    cars: CARS.length ? CARS : (await req(st('cars','readonly').getAll())),
    gaps: await getGaps(),
    sessions: await getSessions(),
    jobs: await getJobs(),
    settings: SET,
    skill: skill,
    chat: chat
  };
}
async function exportAll(){
  const data = await backupPayload();
  const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'auto-electric-full-backup-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  markBackup();
  renderBackupCard(); renderPerf();
  toast('پشتیبان کامل ساخته شد 💾 — هفته‌ی بعد دوباره یادآوری می‌کنم');
}
function toCode(obj){ return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
function fromCode(s){ return JSON.parse(decodeURIComponent(escape(atob(s.replace(/\s+/g,''))))); }
async function applyBackup(data){
  const isFull = (data.v === 2 || data.v === 3) && data.settings;
  if (isFull){
    const replace = confirm('این یک پشتیبان کامل است.\n\n«تأیید» = جایگزینی کامل (همه‌چیز پاک و بازسازی می‌شود)\n«لغو» = فقط نکات اضافه می‌شوند');
    if (replace){
      await clearStore('units'); await clearStore('gaps');
      await clearStore('sessions'); await clearStore('jobs'); await clearStore('cars');
      for (const u of data.units){ delete u.id; await saveU(u); }
      for (const c of (data.cars||[])){ delete c.id; await req(st('cars','readwrite').add(c)); }
      for (const g of (data.gaps||[])){ delete g.id; await addGap(g); }
      for (const s of (data.sessions||[])){ delete s.id; await putSession(s); }
      for (const j of (data.jobs||[])){ delete j.id; await putJob(j); }
      if (data.settings){ SET = Object.assign(SET, data.settings); saveSet(); }
      if (data.skill){ skill = data.skill; localStorage.setItem('aem-skill', JSON.stringify(skill)); }
      if (data.chat){ chat = data.chat; localStorage.setItem('aem-chat', JSON.stringify(chat)); }
      markBackup();
      toast('بازیابی کامل شد ✓ نوسازی صفحه…');
      setTimeout(()=>location.reload(), 1200);
      return true;
    }
  }
  let n = 0;
  for (const u of data.units){ delete u.id; if (!u.aiLine) u.aiLine = aiLine(u); await saveU(u); n++; }
  if (Array.isArray(data.cars) && data.cars.length){
    const have = new Set(CARS.map(c=>c.name));
    for (const c of data.cars){ delete c.id; if (!have.has(c.name)) await req(st('cars','readwrite').add(c)); }
    await loadCars();
  }
  toast(fa(n) + ' نکته اضافه شد ✓');
  renderList(); refreshCounts(); renderGarageNames(); renderSRSCard();
  return false;
}
$('imp').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try{
    const data = JSON.parse(await f.text());
    if (!data || !Array.isArray(data.units)) throw 0;
    await applyBackup(data);
  } catch { toast('فایل پشتیبان معتبر نیست'); }
  e.target.value = '';
});
async function openTransferOut(){
  const data = await backupPayload();
  const code = toCode(data);
  openSheet(`<h2>کد انتقال</h2>
    <p class="note">این کد را کپی کن و در هر پیام‌رسان به خودت بفرست. در دستگاه دیگر، «ورود با کد» را بزن و بچسبان. طول کد: ${fa(code.length)} حرف.</p>
    ${code.length > 300000 ? '<div class="ocrwarn">⚠ دانش‌نامه بزرگ است؛ برای انتقال مطمئن‌تر از فایل پشتیبان استفاده کن.</div>' : ''}
    <textarea class="fld code" id="tr-code" readonly>${esc(code)}</textarea>
    <div class="btns"><button class="btn" onclick="copyTransfer()">کپی کد 📋</button>
    <button class="btn ghost" onclick="closeSheet()">بستن</button></div>`);
}
function copyTransfer(){
  const ta = $('tr-code');
  ta.select();
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(ta.value).then(()=>toast('کپی شد ✓')).catch(()=>{ document.execCommand('copy'); toast('کپی شد ✓'); });
  } else {
    document.execCommand('copy'); toast('کپی شد ✓');
  }
}
function openTransferIn(){
  openSheet(`<h2>ورود با کد</h2>
    <p class="note">کد انتقال را اینجا بچسبان.</p>
    <textarea class="fld code" id="tr-in" placeholder="کد را اینجا بچسبان..."></textarea>
    <div class="btns"><button class="btn" onclick="importFromCode()">بازیابی</button>
    <button class="btn ghost" onclick="closeSheet()">انصراف</button></div>`);
}
async function importFromCode(){
  const raw = $('tr-in').value.trim();
  if (!raw) return toast('کد خالی است');
  try {
    const data = fromCode(raw);
    if (!data || !Array.isArray(data.units)) throw 0;
    closeSheet();
    await applyBackup(data);
  } catch { toast('کد معتبر نیست'); }
}
$('q').addEventListener('input', debounce(() => { fText = $('q').value; renderList(); }, 200));

async function renderGaps(){
  const gaps = (await getGaps()).filter(g=>!g.done).sort((a,b)=>b.at-a.at);
  $('gapList').innerHTML = gaps.length
    ? gaps.slice(0,12).map(g=>`<div class="row"><span>${esc(g.q)}</span><button class="btn ghost sm" onclick="gapDone(${g.id})">انجام شد</button></div>`).join('')
    : '<div class="note">فعلاً چیزی ثبت نشده.</div>';
}
async function gapDone(id){
  const gs = await getGaps(); const g = gs.find(x=>x.id===id); if (!g) return;
  g.done = true; await addGap(g); renderGaps();
}

/* ==================== تاریخچه ==================== */
async function renderHistory(){
  if (!db){ $('histBox').innerHTML = '<div class="note">در حال بارگذاری…</div>'; return; }
  const done = (await getSessions()).filter(s=>s.done).sort((a,b)=>(b.finished||0)-(a.finished||0)).slice(0,10);
  $('histBox').innerHTML = done.length
    ? done.map(s => {
        const outs = (s.steps||[]).filter(x=>x.type==='unit' && x.result==='out').length;
        const d = s.finished ? new Date(s.finished).toLocaleDateString('fa-IR') : '—';
        return `<div class="row"><span style="flex:1;min-width:0"><b style="color:var(--text-primary)">${esc(s.sys)}</b>${s.carName?' · 🚗 '+esc(s.carName):''}<br><span style="font-size:11px;color:var(--text-muted)">${d} · ${esc((s.symptom||'').slice(0,50))}</span></span>
          ${outs?'<span style="color:var(--danger);font-size:11px;white-space:nowrap">'+fa(outs)+' خارج از مرجع</span>':'<span style="color:var(--safe);font-size:11px;white-space:nowrap">بدون مغایرت</span>'}
          <button class="btn ghost sm" onclick="openHistory(${s.id})">مرور</button>
          <button class="btn ghost sm" onclick="openSessionReport(${s.id})">📄 گزارش</button></div>`;
      }).join('')
    : '<div class="note">هنوز جلسه‌ای تمام نشده.</div>';
}
async function openHistory(id){
  const s = (await getSessions()).find(x=>x.id===id); if (!s) return;
  let h = `<h2>مرور جلسه</h2>
    <div class="card" style="margin-bottom:8px"><h3>${esc(s.sys)}${s.carName?' · 🚗 '+esc(s.carName):''}</h3>
    <p>${esc(s.symptom)}</p>
    ${s.dtc?`<p dir="ltr" style="text-align:right">کد ${esc(s.dtc)}</p>`:''}
    ${s.fixedSym?`<div class="fixednote">✎ برداشت: «${esc(s.fixedSym)}»</div>`:''}</div>`;
  h += '<div style="margin:8px 0"><b style="font-size:13px">قدم‌ها:</b></div>';
  for (const step of (s.steps||[])){
    if (step.type==='safety'){ h += `<div class="tl"><span class="ic">🔒</span><span>ایمنی</span></div>`; continue; }
    const ic = step.result==='out' ? '⚠' : step.result==='ok' ? '✓' : step.status==='skip' ? '—' : '•';
    const cl = step.result==='out' ? 'out' : step.result==='ok' ? 'ok' : '';
    h += `<div class="tl ${cl}"><span class="ic">${ic}</span><span style="flex:1;min-width:0">${esc(step.title)}
      ${step.value!=null ? ' — <span class="val">'+fa(step.value)+' '+(UFA[step.unit]||'')+'</span>'+(step.ref?' (مرجع: '+fa(step.ref.lo)+' تا '+fa(step.ref.hi)+')':'') : ''}
      ${step.result==='none' ? ' <span style="font-size:10.5px;color:var(--text-muted)">(بدون عدد)</span>' : ''}</span></div>`;
  }
  h += `<div class="btns"><button class="btn" onclick="openSessionReport(${s.id})">📄 ساخت گزارش</button>
    <button class="btn ghost" onclick="closeSheet()">بستن</button></div>`;
  openSheet(h);
}

/* ==================== ورود متن ==================== */
function openImport(){
  const car = activeCar();
  openSheet(`
    <h2>وارد کردن متن</h2>
    <p class="note">پالایش خودکار: محوکاویه، حذف سلام/تبلیغ، نرمال‌سازی واحد، پارسر رونویسی (دقیقه‌ی مرجع). حداکثر ۴۰ تکه.</p>
    <label>متن *</label><textarea class="fld" id="i-text" style="min-height:180px"></textarea>
    <label>سیستم</label>
    <select class="fld" id="i-sys"><option value="">خودکار</option>${SYSTEMS.map(s=>`<option>${s}</option>`).join('')}</select>
    <label>نوع منبع</label>
    <select class="fld" id="i-type">${Object.entries(SRC).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>
    <label>نام منبع</label><input class="fld" id="i-src" placeholder="مثلاً: دوره‌ی برق خودرو">
    <label>صفحه یا دقیقه پیش‌فرض (اختیاری)</label><input class="fld" id="i-page">
    <label>خودرو (خالی = خودروی فعال ${car ? '«'+esc(car.name)+'»' : ''})</label><input class="fld" id="i-car" value="${car?esc(car.name):''}">
    <div class="btns"><button class="btn" onclick="doImport()">بفرست به بازبینی</button><button class="btn ghost" onclick="closeSheet()">انصراف</button></div>`);
}

async function doImport(){
  const g = id => $(id).value.trim();
  const raw = g('i-text');
  if (!raw) return toast('متن لازم است');
  const sys = g('i-sys'), src = g('i-src'), pg = g('i-page'), car = g('i-car'), tp = g('i-type');
  const carId = car ? (activeCar() ? activeCar().id : '') : '';
  const now = Date.now();
  let dup = 0, off = 0, ok = 0;
  let chunks, pages;
  if (looksLikeTranscript(raw)){
    const paras = parseTranscript(raw);
    chunks = paras.map(p=>p.text).slice(0,40);
    pages = transcriptPages(paras.slice(0,40), pg);
  } else {
    chunks = splitChunksV2(raw).slice(0,40);
    pages = null;
  }
  if (!chunks.length) return toast('متن کافی نیست');
  for (let i=0; i<chunks.length; i++){
    const c = chunks[i];
    const refined = refineText(c);
    if (!refined){ off++; continue; }
    if (await isDuplicate(refined)){ dup++; continue; }
    const autoSys = sys ? null : detectSystem(refined);
    const title = smartTitle(refined);
    const rel = relevanceScore(refined), q = qualityScore(refined);
    const u = {
      title, body:refined, fp:fp(refined),
      system: sys || autoSys || 'سایر', srcType:tp,
      srcName: src || 'نامشخص در منبع',
      page: pages ? pages[i] : (pg || 'نامشخص در منبع'),
      car, carId,
      confidence:'extracted', review:'pending', hidden:false, created:now,
      offdomain: rel < 2, lowq: q <= -1 && !findRef(refined),
      quality:q, values:extractValues(refined),
      versions:[{at:now, title, body:refined}]
    };
    u.aiLine = aiLine(u);
    await saveU(u);
    if (u.offdomain || u.lowq) off++; else ok++;
  }
  closeSheet();
  let msg = fa(ok) + ' تکه آماده‌ی بازبینیه';
  if (off) msg += ' · ' + fa(off) + ' تکه مشکل‌دار برای چک دستی ماند';
  if (dup) msg += ' · ' + fa(dup) + ' تکراری حذف شد';
  toast(msg); refreshCounts();
}

/* ==================== مدل محلی ==================== */
const ML = {engine:null, ready:false, loading:false, progress:0};
const ML_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

async function mlHasCache(){
  try {
    if (!window.caches) return false;
    const keys = await caches.keys();
    return keys.some(k => k.includes('webllm') || k.includes('mlc'));
  } catch { return false; }
}

async function renderML(){
  const cached = await mlHasCache();
  const stat = $('mlStat');
  if (ML.loading){
    stat.textContent = 'در حال دانلود… ' + fa(Math.round(ML.progress*100)) + '٪';
    $('mlProgWrap').style.display = 'block';
    $('mlProg').style.width = (ML.progress*100) + '%';
    $('mlDown').style.display = 'none'; $('mlDel').style.display = 'none';
  } else if (ML.ready){
    stat.textContent = 'آماده است ✓ ' + (SET.mlUse ? '(فعال در چت)' : '(غیرفعال)');
    $('mlProgWrap').style.display = 'none';
    $('mlDown').style.display = 'none';
    $('mlToggle').style.display = 'inline-block';
    $('mlToggle').textContent = SET.mlUse ? 'خاموش کردن در چت' : 'فعال کردن در چت';
    $('mlDel').style.display = 'inline-block';
  } else if (cached){
    stat.textContent = 'قبلاً دانلود شده — یک بار لودش کن.';
    $('mlProgWrap').style.display = 'none';
    $('mlDown').style.display = 'inline-block'; $('mlDown').textContent = 'لود مدل';
    $('mlDel').style.display = 'inline-block';
  } else {
    stat.textContent = 'نصب نشده';
    $('mlProgWrap').style.display = 'none';
    $('mlDown').style.display = 'inline-block'; $('mlDown').textContent = 'دانلود مدل';
    $('mlDel').style.display = 'none';
  }
}

async function mlDownload(){
  if (ML.loading) return;
  if (!navigator.onLine){ toast('اینترنت لازم است'); return; }
  ML.loading = true; ML.progress = 0; renderML();
  try {
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');
    ML.engine = await webllm.CreateMLCEngine(ML_MODEL, {
      initProgressCallback: p => {
        ML.progress = p.progress || 0;
        $('mlStat').textContent = 'در حال آماده‌سازی… ' + fa(Math.round(ML.progress*100)) + '٪';
        $('mlProg').style.width = (ML.progress*100) + '%';
      }
    });
    ML.ready = true; ML.loading = false;
    toast('مدل محلی آماده شد ✓');
  } catch(e){
    console.error(e);
    ML.loading = false;
    toast('دانلود یا لود مدل نشد — دوباره امتحان کن');
  }
  renderML(); updateNet();
}
function mlToggleUse(){ SET.mlUse = !SET.mlUse; saveSet(); renderML(); updateNet(); }
async function mlDelete(){
  if (!confirm('مدل حذف شود؟')) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.includes('webllm') || k.includes('mlc')).map(k => caches.delete(k)));
  } catch {}
  ML.engine = null; ML.ready = false;
  toast('مدل حذف شد');
  renderML(); updateNet(); updateStorage();
}

async function buildKbIndex(){
  const all = (await getLiveUnits()).filter(u=>!u.offdomain);
  return all.sort((a,b)=>(b.quality||0)-(a.quality||0)).slice(0, 40)
    .map(u => ({id:u.id, line:u.aiLine || aiLine(u)}));
}

const ML_SYSTEM = `تو «استاد برق خودرو» هستی؛ استادکار باتجربه که فقط بر اساس نکته‌های داده‌شده جواب می‌دهی.
قواعد سخت:
- هیچ عدد فنی از خودت نساز. فقط اعداد موجود در نکته‌ها.
- اگر جواب در نکته‌ها نبود، صادقانه بگو «در دانش‌نامه ثبت نشده».
- ساختار جواب: ۱) شواهد ۲) فرضیه‌های محتمل با دلیل ۳) تست تفکیک‌کننده ۴) منابع [۱] [۲].
- تعارض بین نکته‌ها را اعلام کن.
- جواب کوتاه، رسمی-گرم و فارسی. از محاوره‌ی سنگین پرهیز کن.`;

async function mlAnswer(q, units, index){
  if (!ML.ready || !SET.mlUse) return null;
  try {
    const ctx = units.map((u,i) => `[${i+1}] ${u.aiLine || aiLine(u)}\nمتن: ${u.body}`).join('\n\n');
    const idx = (index||[]).map(x=>'• ' + x.line).join('\n');
    const reply = await ML.engine.chat.completions.create({
      messages: [
        {role:'system', content: ML_SYSTEM},
        {role:'user', content:`ایندکس دانش‌نامه:\n${idx || '(خالی)'}\n\nنکته‌های مرتبط:\n${ctx}\n\nسؤال: ${q}`}
      ],
      temperature: 0.3, max_tokens: 600
    });
    return reply.choices[0]?.message?.content || null;
  } catch(e){ console.error(e); return null; }
}

/* ==================== خلاصه ==================== */
async function kbSummaryFor(q){
  const all = (await getLiveUnits()).filter(u=>!u.offdomain);
  if (!all.length) return '';
  const cs = causalFor(q);
  const sys = cs.length ? cs[0].sys : (detectSystem(q) || null);
  if (!sys) return '';
  const pool = all.filter(u=>u.system===sys);
  if (!pool.length) return '';
  const vals = [];
  for (const u of pool.sort((a,b)=>(b.quality||0)-(a.quality||0)))
    for (const v of (u.values||[])) if (!vals.includes(v)) vals.push(v);
  const verified = pool.filter(u=>u.confidence==='verified').length;
  let s = `📊 جمع‌بندی دانش: ${fa(pool.length)} نکته درباره‌ی «${esc(sys)}»${verified ? ' ('+fa(verified)+' تأییدشده)' : ''}`;
  if (vals.length) s += ` — مقادیر ثبت‌شده: ${vals.slice(0,4).map(v=>'<span class="val">'+esc(v)+'</span>').join('، ')}`;
  return `<div class="causal">${s}</div>`;
}

/* ==================== صوت ==================== */
function speak(text){
  if (!('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fa-IR'; u.rate = 1;
  speechSynthesis.speak(u);
}
function micTo(btn, onResult){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast('تشخیص گفتار اینجا کار نمی‌کند — Chrome اندروید لازم است');
  const r = new SR();
  r.lang = 'fa-IR'; r.interimResults = false; r.maxAlternatives = 3;
  if (btn) btn.classList.add('rec');
  r.onresult = ev => onResult(ev.results[0][0].transcript.trim());
  r.onerror = () => toast('صدای واضحی نشنیدم — دوباره بگو');
  r.onend = () => { if (btn) btn.classList.remove('rec'); };
  r.start();
}
function chatMic(btn){
  micTo(btn, text => {
    $('chatIn').value = text;
    ask(text, true);
  });
}
function micMeasure(btn){
  micTo(btn, t => {
    const en = String(t).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    let v = (en.match(/\d+(?:[٫.]\d+)?/)||[])[0];
    if (!v) v = spokenNumber(en);
    if (v){
      $('mv').value = fa(String(v).replace('.','٫'));
      liveHint();
    } else {
      toast('عدد را نشنیدم — دوباره بگو، مثلاً «سیزده و هشت دهم»');
    }
  });
}

/* ==================== چت ==================== */
let chat = [];
try { chat = JSON.parse(localStorage.getItem('aem-chat')||'[]'); } catch { chat = []; }
const saveChat = () => localStorage.setItem('aem-chat', JSON.stringify(chat.slice(-60)));
const scrollChat = () => setTimeout(()=>window.scrollTo(0, document.body.scrollHeight), 50);
const WELCOME = {r:'m', html:'خب، من آماده‌ام. سؤال رو تایپ کن یا با 🎤 بگو — حتی با غلط املایی یا حرف کارگاهی، منظورت رو می‌فهمم. 🔧'};
const WELCOME_BEG = {r:'m', html:'سلام! من استاد برق خودرو هستم 🌱<br>هر سؤالی داری بپرس — حتی ساده. علامت خرابی رو با کلمات خودت بگو، من قدم‌به‌قدم راهنماییت می‌کنم.'};

function renderChat(){
  const box = $('msgs');
  const list = chat.length ? chat : (SET.beginner ? [WELCOME_BEG] : [WELCOME]);
  box.innerHTML = list.map(m => m.r==='u'
    ? `<div class="msg u">${esc(m.text)}${m.fixed ? '<div class="fixednote">✎ برداشت من: «'+esc(m.fixed)+'»</div>' : ''}</div>`
    : (m.safety||'') + `<div class="msg m">${m.html}</div>`).join('');
  box.querySelectorAll('[data-open]').forEach(c => c.onclick = () => openDetail(+c.dataset.open));
}

async function renderQChips(){
  if (!db) return;
  let all = await getLiveUnits();
  const ac = activeCar();
  all = all.filter(u => (!u.offdomain) && (!ac || !u.carId || String(u.carId) === String(ac.id)));
  all.sort((a,b)=>((b.pin?1:0)-(a.pin?1:0)) || (b.quality||0)-(a.quality||0));
  const el = $('qchips');
  el.innerHTML = all.slice(0,5).map(u=>`<button class="chip" data-q="${esc(u.title)}">${u.pin ? '⭐ ' : ''}${esc(u.title)}</button>`).join('');
  el.querySelectorAll('.chip').forEach(c => c.onclick = () => { ask(c.dataset.q.replace(/^⭐ /,'')); });
}

async function answer(q){
  const baseToks = tokens(q);
  const toks = expandToks(baseToks);
  const safety = safetyFor(q).map(d=>`<div class="safety"><b>🔒 هشدار ایمنی</b>${esc(d.t)}</div>`).join('');
  const ac = activeCar();
  const all = (await getLiveUnits()).filter(u=>!u.offdomain);

  if (!all.length){
    const cs = causalFor(q);
    return {safety, speech:'دانش‌نامه هنوز خالیه، ولی الگوی عمومی عیب‌یابی را می‌گویم.',
      html:'دانش‌نامه هنوز خالیه، ولی برای این علامت، الگوی عیب‌یابی عمومی کارگاهی دارم:' + causalHtml(cs, 'این‌ها روش عمومی است نه مستند؛ عدد مرجع دقیق را با افزودن منبع کامل کن.')};
  }
  const ranked = all.map(u=>({u, ...score(u,toks)}))
    .filter(x=>x.s>0)
    .map(x => ({...x, s: x.s + (ac && String(x.u.carId)===String(ac.id) ? 4 : 0) + (x.u.pin ? 3 : 0)}))
    .sort((a,b)=>(b.s + ((b.u.quality||0)*0.2)) - (a.s + ((a.u.quality||0)*0.2))).slice(0,4);
  const need = Math.max(1, Math.ceil(baseToks.length/2));
  const good = ranked.filter(x => x.hit >= Math.min(need, baseToks.length));

  if (good.length && ML.ready && SET.mlUse){
    const index = await buildKbIndex();
    const txt = await mlAnswer(q, good.map(x=>x.u), index);
    if (txt){
      const cites = good.map((x,i) =>
        `<br><span class="cite" data-open="${x.u.id}">[${fa(i+1)}] منبع: ${esc(x.u.srcName)} · ${esc(x.u.page)}</span>`).join('');
      const degraded = navigator.onLine ? '' :
        '<div class="note">آفلاینیم؛ از دانش و مدل روی همین گوشی استفاده کردم.</div>';
      return {safety, speech:txt, html: esc(txt).replace(/\[(\d)\]/g,'[$۱]') + cites + degraded};
    }
  }

  if (!baseToks.length || !good.length){
    await addGap({q, at:Date.now(), done:false});
    refreshCounts();
    const cs = causalFor(q);
    let html = 'در دانش‌نامه جواب مستقیمی برای این سؤال نیافتم و حدس نمی‌زنم؛ سؤالت ثبت شد. ';
    let speech = 'در دانش‌نامه جواب مستقیمی نیافتم و ثبتش کردم. ';
    const summ = await kbSummaryFor(q);
    if (summ) html += summ;
    html += 'بر اساس الگوی عمومی کارگاهی، این علامت معمولاً این مسیرها را دارد:';
    if (cs.length){ html += causalHtml(cs, 'این مسیرها عمومی است؛ برای عدد مرجع دقیق، نکته‌ی مرتبط را به دانش‌نامه اضافه کن.'); speech += 'اما طبق الگوی عمومی: ' + cs[0].causes.map(x=>x.c).join('، ') + '.'; }
    else { html += '<div class="causal"><b>🔍 مسیر امن عمومی:</b><br>۱) ولتاژ باتری را در حالت استارت و روشن بگیر. ۲) مدار و سیستم مرتبط را مشخص کن. ۳) اول اندازه‌گیری، بعد تعویض قطعه.</div>'; speech += 'اول ولتاژ باتری را بگیر، بعد مدار را مشخص کن.'; }
    if (ranked.length) html += '<br>شاید این‌ها نزدیک باشه:' + ranked.map(x=>`<br><span class="cite" data-open="${x.u.id}">${esc(x.u.title)}</span>`).join('');
    return {safety, speech, html};
  }
  const hook = good.length===1 ? 'این را در دانش‌نامه‌ات یافتم:' : 'این چند مورد را یافتم:';
  let speechText = good.length===1 ? 'این را یافتم: ' : 'این چند مورد را یافتم: ';
  const facts = good.map(x=>{
    const u = x.u;
    let body = u.body.length>240 ? u.body.slice(0,240)+'…' : u.body;
    speechText += u.title + '. ' + u.body.slice(0,150) + '. ';
    const unsure = u.srcType==='inference' ? '<div class="note">⚠ استنباطی است، نه مستند.</div>' : '';
    const cf = u.conflictWith ? '<div class="note" style="color:var(--danger)">⚠ این نکته تعارض دارد.</div>' : '';
    const carB = (u.carId && carNameById(u.carId)) ? `<span class="b car">🚗 ${esc(carNameById(u.carId))}</span>` : '';
    const vals = (u.values||[]).length ? `<div class="vals">${u.values.map(v=>`<span>${esc(v)}</span>`).join('')}</div>` : '';
    return `<div class="fact"><b class="ft">${esc(u.title)}</b><div class="tx">${hl(body)}</div>${vals}${unsure}${cf}
      <span class="cite" data-open="${u.id}">منبع: ${esc(u.srcName)} · ${esc(u.page)}</span>
      <span class="b ${esc(u.srcType)}" style="margin-top:4px">${SRC[u.srcType]||''}</span> ${carB}</div>`;
  }).join('');
  const cs = causalFor(q).filter(c => good.some(x=>x.u.system===c.sys));
  let cHtml = '';
  if (cs.length) cHtml = '<br><b style="color:var(--info)">نکته‌ی علت‌ومعلولی:</b> اگر اندازه‌گیری‌های بالا خارج از محدوده بود، فرضیه‌های محتمل:' + causalHtml(cs);
  return {safety, speech:speechText, html: hook + facts + cHtml};
}

async function ask(q, fromMic){
  q = (q||'').trim(); if (!q) return;
  const corrected = symptomNormalize(q);
  const wasFixed = norm(corrected) !== norm(q) ? corrected : '';
  if (chat.some(m => m.r==='u' && norm(m.text)===norm(q))) skLog('repeat', q);
  const inp = $('chatIn');
  inp.value = ''; $('sendBtn').disabled = true;
  chat.push({r:'u', text:q, fixed: wasFixed}); renderChat(); scrollChat();
  const av = $('avatar'); av.classList.add('think');
  const a = await answer(corrected);
  await new Promise(r=>setTimeout(r,300));
  av.classList.remove('think');
  chat.push({r:'m', html:a.html, safety:a.safety}); saveChat();
  renderChat(); scrollChat();
  if (fromMic || SET.voiceReply) speak(a.speech || '');
}
function clearChat(){
  if (!confirm('گفتگو پاک شود؟')) return;
  chat = []; saveChat(); renderChat();
}
const chatIn = $('chatIn');
chatIn.addEventListener('input', ()=>$('sendBtn').disabled = !chatIn.value.trim());
chatIn.addEventListener('keydown', e=>{ if(e.key==='Enter') ask(chatIn.value); });
$('sendBtn').addEventListener('click', ()=>ask(chatIn.value));

/* ==================== عیب‌یابی ==================== */
let S = null;
let formDraft = {};
const UMAP = {'ولت':'V','اهم':'Ω','آمپر':'A','هرتز':'Hz','V':'V','Ω':'Ω','A':'A','Hz':'Hz'};
const UFA = {V:'ولت', 'Ω':'اهم', A:'آمپر', Hz:'هرتز'};
const toNum = s => parseFloat(String(s).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫','.').replace('،','.'));

function findRef(body){
  const re = /([\d۰-۹]+(?:[٫.][\d۰-۹]+)?)\s*(?:تا|-|–)\s*([\d۰-۹]+(?:[٫.][\d۰-۹]+)?)\s*(ولت|اهم|آمپر|هرتز|V|Ω|A|Hz)/;
  const m = String(body).match(re);
  if (!m) return null;
  const lo = toNum(m[1]), hi = toNum(m[2]);
  if (isNaN(lo) || isNaN(hi)) return null;
  return {lo:Math.min(lo,hi), hi:Math.max(lo,hi), unit:UMAP[m[3]], text:m[0]};
}

const SAFE_STEP = {
  type:'safety', title:'ایمنی قبل از شروع',
  items:['استارت یا کلید را خاموش کن.','انگشتر و فلزات آویزان را در بیار.','مولتی‌متر را روی گستره‌ی درست بگذار.','دو قطب باتری را با ابزار فلزی اتصال کوتاه نکن.','اگر موتور روشن می‌شود، از تسمه و فن دور بمان.']
};

function whyText(s, sys){
  const U = s.ref ? s.ref.unit : 'V';
  const base = {
    V:'اندازه‌گیری ولتاژ نشان می‌دهد برق واقعاً به قطعه می‌رسد یا نه؛ اکثر خرابی‌های «ظاهراً قطعه» در واقع اتصال یا سیم‌کشی هستند.',
    'Ω':'تست مقاومت مدار را با برق خاموش انجام می‌دهیم تا سیم قطع، سوکت کثیف یا مقاومت اضافی پیدا شود.',
    A:'اندازه‌گیری جریان نشان می‌دهد قطعه واقعاً چقدر مصرف دارد؛ مصرف بالا یعنی قطعه در حال خرابی، مصرف صفر یعنی مسیر قطع.',
    Hz:'پالس یعنی سیگنال دیجیتال بین سنسور و ECU در حال رد و بدل شدن است؛ نبود پالس یعنی مسیر سیگنال قطع است.'
  }[U];
  return (SET.beginner ? 'چرا این قدم؟ ' : '') + base + ' عیب‌یابی یعنی پیدا کردن شواهد، نه تعویض قطعات به امید درست شدن.';
}

function speakStep(){
  const s = S && S.steps[S.idx];
  if (!s) return;
  let t = s.title + '. ' + s.body.replace(/\s+/g,' ');
  if (s.ref) t += ' مقدار مرجع: از ' + s.ref.lo + ' تا ' + s.ref.hi + ' ' + UFA[s.ref.unit] + '.';
  speak(t);
}

async function renderDiag(){
  if (!S && !W){
    const all = await getSessions();
    S = all.filter(s => !s.done).sort((a,b)=>b.created-a.created)[0] || null;
  }
  const box = $('diagBox');
  if (W){
    if (W.result !== undefined && W.result !== null) renderWizardEnd(box);
    else renderWizard(box);
    return;
  }
  if (!S) return renderForm(box);
  renderSession(box);
}

function renderForm(box){
  const d = formDraft;
  const ac = activeCar();
  box.innerHTML = `
    <div class="card"><p>${SET.beginner
      ? '🌱 نگران نباش؛ فقط بنویس چی می‌بینی. یا «مسیر سریع» را بزن تا سؤال‌به‌سؤال جلو برویم.'
      : 'علامت را با کلمات خودت بنویس — یا از «⚡ مسیر سریع» شروع کن. در جمع‌بندی، تحلیل علت‌ومعلولی هم می‌گیری.'}</p></div>
    <label>خودرو (خالی = ${ac ? 'فعال: '+esc(ac.name) : 'همه‌ی خودروها'})</label><input class="fld" id="d-car" value="${esc(d.car !== undefined ? d.car : (ac?ac.name:''))}" placeholder="مثلاً: پژو پارس ۱۳۹۴">
    <label>سیستم مشکوک</label>
    <select class="fld" id="d-sys">${SYSTEMS.map(s=>`<option ${d.sys===s?'selected':''}>${s}</option>`).join('')}</select>
    <label>علامت یا مشکل</label><textarea class="fld" id="d-sym" style="min-height:90px" placeholder="مثلاً: استارت نمی‌زنه و چراغ باتری روشنه">${esc(d.sym||'')}</textarea>
    <label>کد خطا (اگر داری)</label><input class="fld" id="d-dtc" dir="ltr" value="${esc(d.dtc||'')}" placeholder="P0562">
    ${SET.beginner ? '<div class="help">💡 اولین بار است؟ «⚡ مسیر سریع» را بزن — چند سؤال ساده می‌پرسم و می‌رویم سراغ عیب‌یابی دقیق. یا «🔧 راهنمای مولتی‌متر» را ببین.</div>' : ''}
    <div class="btns"><button class="btn full" onclick="startDiag()">شروع عیب‌یابی ⚡</button></div>`;
}

async function startDiag(){
  const g = id => $(id).value.trim();
  const car = g('d-car');
  const ac = activeCar();
  const carId = car && ac && car === ac.name ? ac.id : (car ? (ac ? ac.id : '') : '');
  await startDiagFrom(car, g('d-sys'), g('d-sym'), g('d-dtc'), carId);
}

async function startDiagFrom(carName, sys, sym, dtc, carId){
  formDraft = {car:carName, sys, sym, dtc};
  if (!sym) { toast('علامت مشکل را بنویس'); renderForm($('diagBox')); return; }
  const hits = safetyFor(sym + ' ' + sys + ' ' + dtc);
  if (sys === 'ایربگ (SRS)' && !hits.some(h=>h.k.includes('srs'))) hits.push(DANGER[0]);
  if (hits.length){
    $('diagBox').innerHTML = `<div class="sbanner"><b>🔒 این مدار خطرناک است</b><ul>${hits.map(h=>`<li>${esc(h.t)}</li>`).join('')}</ul>
      <p style="margin-top:6px;font-size:13.5px">راه امن: خودرو را به تعمیرکار مجاز ببر. من قدم اندازه‌گیری برای این مدار نمی‌سازم.</p>
      <div class="btns"><button class="btn" onclick="formDraft={};renderDiag()">متوجه شدم</button></div></div>`;
    if (navigator.vibrate) navigator.vibrate([40,60,40]);
    return;
  }
  const symFixed = symptomNormalize(sym);
  const baseToks = tokens(symFixed + ' ' + symptomNormalize(carName) + ' ' + dtc);
  const toks = expandToks(baseToks);
  const all = (await getLiveUnits()).filter(u=>!u.offdomain);
  const ranked = all.map(u=>{
    const r = score(u,toks);
    const carBoost = carId && String(u.carId) === String(carId) ? 6 : 0;
    return {u, hit:r.hit, s:r.s + (u.system===sys ? 5 : 0) + carBoost + (u.pin ? 3 : 0) + ((u.quality||0)*0.3)};
  })
    .filter(x => x.u.system===sys || x.hit>0)
    .sort((a,b)=>b.s-a.s).slice(0,6);
  const steps = [SAFE_STEP, ...ranked.map(x => {
    const u = x.u;
    return {type:'unit', uid:u.id, title:u.title, body:u.body, srcType:u.srcType, srcName:u.srcName, page:u.page,
            conflict:!!u.conflictWith, ref:findRef(u.body), status:'', value:null, unit:null, result:'', help:0};
  })];
  if (!ranked.length) await addGap({q:'عیب‌یابی: ' + sym, at:Date.now(), done:false});
  S = {car:carName, carId:carId||'', carName:carName, sys, symptom:sym, dtc,
       created:Date.now(), idx:0, steps, done:false, noKB: !ranked.length,
       fixedSym: norm(symFixed)!==norm(sym) ? symFixed : ''};
  S.id = await putSession(S);
  formDraft = {};
  refreshCounts(); renderDiag();
}

const saveS = () => putSession(S);

function renderSession(box){
  let h = `<div class="card"><h3>${esc(S.sys)}${S.carName ? ' · 🚗 '+esc(S.carName) : ''}</h3><p>${esc(S.symptom)}</p>
    ${S.dtc ? `<p dir="ltr" style="text-align:right">کد ${esc(S.dtc)}</p>` : ''}
    ${S.fixedSym ? `<div class="fixednote">✎ برداشت من از علامت: «${esc(S.fixedSym)}»</div>` : ''}</div>`;
  const cs0 = causalFor(S.fixedSym || S.symptom).filter(c=>c.sys===S.sys);
  if (cs0.length) h += `<div class="causal"><b>🎯 فرضیه‌های اولیه (روش کارگاهی):</b>
    <ol style="padding-right:18px;margin:6px 0 0">${cs0[0].causes.map(x=>`<li>${esc(x.c)}</li>`).join('')}</ol>
    <div class="note">تست‌های دانش‌نامه‌ای این فرضیه‌ها را یکی‌یکی جدا می‌کنند.</div></div>`;
  if (S.noKB) h += `<div class="card"><p>در دانش‌نامه برای این سیستم چیزی نیافتم و حدس نمی‌زنم. ثبت شد؛ از فرضیه‌های بالا استفاده کن.</p></div>`;
  S.steps.forEach((s,i) => {
    if (i < S.idx){
      const ic = s.type==='safety' ? '🔒' : s.result==='out' ? '⚠' : s.result==='ok' ? '✓' : s.status==='skip' ? '—' : '•';
      const cl = s.result==='out' ? 'out' : s.result==='ok' ? 'ok' : '';
      h += `<div class="tl ${cl}"><span class="ic">${ic}</span><span>${esc(s.title)}${s.value!=null ? ' — '+fa(s.value)+' '+UFA[s.unit] : ''}</span></div>`;
    }
  });
  if (S.idx < S.steps.length){
    const s = S.steps[S.idx], n = S.idx + 1;
    if (s.type === 'safety'){
      h += `<div class="sbanner"><b>🔒 ${esc(s.title)}</b><ul>${s.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
        <div class="btns"><button class="btn" onclick="ackSafety()">متوجه شدم، ادامه بده</button></div></div>`;
    } else {
      const ref = s.ref;
      const unit = ref ? ref.unit : 'V';
      h += `<div class="step"><span class="num">${fa(n)}</span><h3>${esc(s.title)}</h3>
        <div class="tx">${glossify(hl(s.body))}</div>
        ${s.conflict ? '<div class="note" style="color:var(--danger)">⚠ این نکته تعارض دارد. قبل از قضاوت منبع‌ها را مقایسه کن.</div>' : ''}
        <span class="cite" data-open="${s.uid}">منبع: ${esc(s.srcName)} · ${esc(s.page)}</span>
        <span class="b ${esc(s.srcType)}">${SRC[s.srcType]||''}</span>
        ${s.srcType==='inference' ? '<div class="note">⚠ استنباطی است، نه مستند.</div>' : ''}
        ${SET.beginner ? `<div class="help why"><b>💡 چرا این قدم؟</b> ${esc(whyText(s, S.sys))}</div>` : ''}
        <div class="meas">
          <input id="mv" type="text" inputmode="decimal" placeholder="۰٫۰" oninput="liveHint()">
          <div class="seg" id="seg">${['V','Ω','A','Hz'].map(u=>`<button data-u="${u}" class="${u===unit?'on':''}">${UFA[u]}</button>`).join('')}</div>
        </div>
        <div class="hint" id="hint">${ref ? 'مقدار مرجع: '+fa(ref.lo)+' تا '+fa(ref.hi)+' '+UFA[ref.unit] : 'مقدار مرجع: نامشخص در منبع'}</div>
        <div id="helpBox">${helpHtml(s)}</div>
        <div class="btns" style="flex-wrap:nowrap">
          <button class="btn" style="flex:3" onclick="doneStep()">انجام دادم</button>
          <button class="micbtn" title="عدد را بگو: «سیزده و هشت دهم»" onclick="micMeasure(this)">🎤</button>
          <button class="ttsbtn" title="بخوان" onclick="speakStep()">🔊 بخوان</button>
        </div>
        <div class="btns"><button class="btn ghost" onclick="moreHelp()">راهنمایی بیشتر</button>
        <button class="btn muted" onclick="skipStep()">نمی‌تونم</button></div></div>`;
    }
  } else {
    h += summaryHtml();
  }
  box.innerHTML = h;
  bindGloss(box);
  box.querySelectorAll('[data-open]').forEach(c => c.onclick = () => openDetail(+c.dataset.open));
  const seg = $('seg');
  if (seg) seg.querySelectorAll('button').forEach(b => b.onclick = () => {
    seg.querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); liveHint();
  });
}

function curUnit(){ const b = document.querySelector('#seg .on'); return b ? b.dataset.u : 'V'; }
function judge(s, v, u){
  if (!s.ref || isNaN(v) || u !== s.ref.unit) return '';
  return (v >= s.ref.lo && v <= s.ref.hi) ? 'ok' : 'out';
}
function liveHint(){
  const s = S.steps[S.idx], v = toNum($('mv').value), h = $('hint');
  const r = judge(s, v, curUnit());
  h.className = 'hint ' + r;
  if (r === 'ok') h.textContent = 'توی محدوده‌ست ✓';
  else if (r === 'out') h.textContent = 'خارج از محدوده‌ی مرجع است ⚠';
  else h.textContent = s.ref ? 'مقدار مرجع: ' + fa(s.ref.lo) + ' تا ' + fa(s.ref.hi) + ' ' + UFA[s.ref.unit] : 'مقدار مرجع: نامشخص در منبع';
}
function helpHtml(s){
  if (!s.help) return '';
  const U = s.ref ? s.ref.unit : 'V';
  const method = {
    V:'مولتی‌متر روی ولت DC؛ پروب مشکی به بدنه، قرمز به نقطه‌ی مورد نظر. اندازه‌گیری موازی است.',
    'Ω':'قبل از اهم‌سنجی مدار را از برق جدا کن. اهم‌سنجی روی مدار برقدار مقدار غلط می‌دهد.',
    A:'آمپرمتر باید سری شود، نه موازی. گستره را بالا بگذار.',
    Hz:'گستره‌ی فرکانس را انتخاب کن و با back-probe بگیر. هرگز مستقیم به پین ECU ولت ۱۲ نده.'
  }[U];
  let t = '<div class="help"><b>راهنمایی ۱:</b> شرایط تست را از متن بالا بخوان. اگر نوشته نشده، «نامشخص در منبع» است.</div>';
  if (s.help >= 2) t += `<div class="help"><b>راهنمایی ۲ (روش):</b> ${esc(method)}</div>`;
  if (s.help >= 3) t += `<div class="help"><b>راهنمایی ۳ (روند کامل):</b> ۱) ایمنی. ۲) گستره و پروب. ۳) اندازه‌گیری و ثبت. ۴) مقایسه با مرجع. ${s.ref ? 'مرجع: '+fa(s.ref.text) : ''} ۵) خارج از محدوده؟ اول اتصالات، نه تعویض قطعه.</div>`;
  return t;
}
function moreHelp(){
  const s = S.steps[S.idx];
  s.help = Math.min(3, (s.help||0)+1);
  saveS(); $('helpBox').innerHTML = helpHtml(s);
}
async function ackSafety(){
  if (navigator.vibrate) navigator.vibrate([40,60,40]);
  S.steps[S.idx].status = 'ack'; S.idx++; await saveS(); renderDiag();
}
async function doneStep(){
  const s = S.steps[S.idx], raw = $('mv').value.trim();
  if (raw){
    const v = toNum(raw);
    if (isNaN(v)) return toast('عدد را درست بنویس');
    s.value = v; s.unit = curUnit(); s.result = judge(s, v, s.unit) || 'rec';
  } else {
    s.result = 'none';
  }
  s.status = 'done';
  skLog(s.help>=3 ? 'answer_taken' : s.help>0 ? 'solved_with_hint' : 'solved_alone', S.sys);
  S.idx++; await saveS(); renderDiag(); window.scrollTo(0,0);
}
async function skipStep(){
  const s = S.steps[S.idx]; s.status = 'skip'; s.result = 'skip';
  skLog('skip', S.sys);
  S.idx++; await saveS(); renderDiag();
}

function summaryHtml(){
  const units = S.steps.filter(s=>s.type==='unit');
  const outs = units.filter(s=>s.result==='out');
  const oks = units.filter(s=>s.result==='ok');
  const skipped = units.filter(s=>s.status==='skip');
  let t = '<div class="diag"><div class="chk">✓</div><h3>جمع‌بندی عیب‌یابی</h3>';
  if (!units.length){
    t += '<p>قدمی از دانش‌نامه نداشتیم، پس نتیجه‌ای نمی‌دهم.</p>';
  } else if (outs.length){
    t += '<p>این اندازه‌گیری‌ها خارج از مقدار مرجع بودند:</p>' + outs.map(s =>
      `<div class="tl out"><span class="ic">⚠</span><span>${esc(s.title)} — <span class="val">${fa(s.value)} ${UFA[s.unit]}</span> (مرجع: ${fa(s.ref.lo)} تا ${fa(s.ref.hi)})<br><span style="font-size:11.5px">منبع: ${esc(s.srcName)} · ${esc(s.page)}</span></span></div>`).join('');
    t += '<p style="margin-top:10px"><b>استدلال:</b> این مدارها واقعاً خارج از مشخصه‌اند — شواهد مستقیم عیب، نه حدس.</p>';
  } else if (oks.length){
    t += '<p>همه‌ی مقدارها در محدوده‌ی مرجع بودند. <b>استدلال:</b> این مدارها سالم‌اند؛ عیب احتمالاً در مدار دیگری است.</p>';
  } else {
    t += '<p>مقدار عددی ثبت نشد، پس نتیجه‌ی مبتنی بر اندازه‌گیری ندارم.</p>';
  }
  const cs = causalFor(S.fixedSym || S.symptom).filter(c=>c.sys===S.sys);
  if (cs.length){
    t += `<div class="causal" style="margin-top:10px"><b>🔍 ردگیری فرضیه‌ها (روش کارگاهی):</b>
      <ol style="padding-right:18px;margin:6px 0 0">${cs[0].causes.map(x=>`<li>${esc(x.c)}<br><span style="color:var(--text-secondary)">${esc(x.t)}</span></li>`).join('')}</ol></div>`;
  }
  t += `<div class="note">اطمینان: نامشخص. این جمع‌بندی بر پایه‌ی اندازه‌گیری‌های تو و دانش‌نامه‌ی خودت است، نه تشخیص قطعی.${skipped.length ? ' '+fa(skipped.length)+' قدم رد شد.' : ''}</div>
    <div class="btns"><button class="btn" onclick="finishDiag()">پایان و شروع جدید</button>
    <button class="btn ghost" onclick="finishDiag();setTimeout(()=>openLastReport(),400)">📄 ساخت گزارش</button>
    <button class="btn ghost" onclick="openExercise()">تمرین کوتاه</button></div></div>`;
  return t;
}
async function finishDiag(){
  S.done = true; S.finished = Date.now(); await saveS();
  S = null; refreshCounts(); renderDiag();
  toast('ثبت شد ✓');
}

/* ==================== مسیر یادگیری ==================== */
async function renderLearnCard(){
  const card = $('learnCard'); if (!card) return;
  const badRefs = skill.ev.filter(e=>e.type==='exercise_bad'||e.type==='scenario_bad').map(e=>e.ref);
  if (badRefs.length){
    card.innerHTML = `<b>🎯 قدم بعدی یادگیری</b><span>در ${fa(badRefs.length)} تمرین/سناریو خطا داشتی. یک مرور می‌خوای تا محک بخوری؟</span>`;
    card.dataset.mode = 'review';
    return;
  }
  const live = (await getLiveUnits()).filter(u=>!u.offdomain);
  const counts = {};
  for (const u of live) counts[u.system]=(counts[u.system]||0)+1;
  const weak = SYSTEMS.find(s => (counts[s]||0) < 10 && s !== 'ایربگ (SRS)');
  if (weak){
    card.innerHTML = `<b>🎯 قدم بعدی یادگیری</b><span>پوشش «${esc(weak)}» کم است (${fa(counts[weak]||0)} نکته). یک منبع برای این سیستم اضافه کن.</span>`;
    card.dataset.mode = 'source';
    return;
  }
  const exCount = skCount('exercise_ok') + skCount('scenario_ok');
  card.innerHTML = `<b>🎯 قدم بعدی یادگیری</b><span>${exCount ? 'رکورد تمرین‌ها: '+fa(exCount)+' پاسخ درست. ' : ''}یک تمرین (عددی یا سناریویی) آماده‌ست.</span>`;
  card.dataset.mode = 'exercise';
}
async function doSuggested(){
  const mode = $('learnCard')?.dataset.mode;
  if (mode === 'source'){
    go('kb');
    toast('برای پوشش بیشتر، از دکمه‌ی «فایل» یا «عکس» یک منبع اضافه کن');
  } else {
    await openExercise();
  }
}

/* ==================== جستجوی سراسری ==================== */
async function openGlobalSearch(){
  openSheet(`<h2>🔎 جستجوی سراسری</h2>
    <p class="note">هم‌زمان در نکات دانش‌نامه، لغتنامه و تاریخچه‌ی جلسات. نکات نشان‌دار ⭐ همیشه اول می‌آیند. غلط املایی و حرف کارگاهی اوکیه.</p>
    <input class="fld" id="gs-q" type="search" placeholder="جستجو در همه‌جا..." style="margin-top:var(--sp-2)" autocomplete="off">
    <div id="gs-res" style="margin-top:var(--sp-2)"></div>
    <div class="btns"><button class="btn ghost full" onclick="closeSheet()">بستن</button></div>`);
  const inp = $('gs-q');
  inp.focus();
  const run = debounce(async () => {
    const q = inp.value.trim();
    const res = $('gs-res');
    if (!q){
      const live = await getLiveUnits();
      const pins = live.filter(u=>u.pin).slice(0,6);
      const done = (await getSessions()).filter(s=>s.done).sort((a,b)=>(b.finished||0)-(a.finished||0)).slice(0,4);
      res.innerHTML =
        `<div class="gsgrp"><b>⭐ نشان‌دارها</b>${pins.length
          ? pins.map(u=>gsUnitHtml(u)).join('') : '<div class="note">هنوز نکته‌ای نشان نزده‌ای — در جزئیات نکته دکمه‌ی ⭐ هست.</div>'}</div>
         <div class="gsgrp"><b>🗂️ آخرین جلسات</b>${done.length
          ? done.map(gsSessHtml).join('') : '<div class="note">هنوز جلسه‌ای تمام نشده.</div>'}</div>`;
      bindGsClicks(res);
      return;
    }
    res.innerHTML = '<div class="note">در حال جستجو…</div>';
    const qf = symptomNormalize(q);
    const toks = expandToks(tokens(qf));
    const nh = norm(qf);
    const hits = t => t.toLowerCase().includes(nh) || toks.some(k => norm(t).includes(k));
    const live = await getLiveUnits();
    const ac = activeCar();
    const uScored = live
      .map(u => ({u, s: (score(u, toks.length ? toks : tokens(qf)).s + (u.pin ? 50 : 0) + (ac && String(u.carId)===String(ac.id) ? 6 : 0))}))
      .filter(x => x.s > 0 && (hits(x.u.title) || hits(x.u.body) || x.u.pin))
      .sort((a,b)=>b.s-a.s).slice(0, 8);
    const glos = Object.entries(GLOSSARY).filter(([t,d]) => hits(t) || hits(d)).slice(0, 4);
    const sess = (await getSessions())
      .filter(s => hits(s.sys + ' ' + (s.symptom||'') + ' ' + (s.carName||'') + ' ' + (s.dtc||'')))
      .sort((a,b)=>(b.finished||b.created)-(a.finished||a.created)).slice(0, 5);
    let h = '';
    h += `<div class="gsgrp"><b>📚 نکات (${fa(uScored.length)})</b>${uScored.length
      ? uScored.map(x=>gsUnitHtml(x.u)).join('') : '<div class="note">چیزی پیدا نشد.</div>'}</div>`;
    h += `<div class="gsgrp"><b>📖 لغتنامه (${fa(glos.length)})</b>${glos.length
      ? glos.map(([t,d])=>`<button class="gsitem" data-glos="${esc(t)}"><b>${esc(t)}</b><span class="gss">${esc(d.slice(0,90))}…</span></button>`).join('')
      : '<div class="note">—</div>'}</div>`;
    h += `<div class="gsgrp"><b>🗂️ جلسات (${fa(sess.length)})</b>${sess.length
      ? sess.map(gsSessHtml).join('') : '<div class="note">—</div>'}</div>`;
    res.innerHTML = h;
    bindGsClicks(res);
  }, 250);
  inp.addEventListener('input', run);
  run();
}
function gsUnitHtml(u){
  return `<button class="gsitem" data-unit="${u.id}">${u.pin ? '<span class="pin">⭐ </span>' : ''}<b>${esc(u.title)}</b>
    <span class="gss">${esc(u.system)} · ${esc(u.srcName)}${u.car ? ' · 🚗 '+esc(u.car) : ''}</span></button>`;
}
function gsSessHtml(s){
  const d = s.finished ? new Date(s.finished).toLocaleDateString('fa-IR') : '—';
  return `<button class="gsitem" data-sess="${s.id}"><b>${esc(s.sys)}${s.carName ? ' · 🚗 '+esc(s.carName) : ''}</b>
    <span class="gss">${d} · ${esc((s.symptom||'').slice(0,60))}</span></button>`;
}
function bindGsClicks(root){
  root.querySelectorAll('[data-unit]').forEach(b => b.onclick = () => openDetail(+b.dataset.unit));
  root.querySelectorAll('[data-glos]').forEach(b => b.onclick = () => openGlossary(b.dataset.glos));
  root.querySelectorAll('[data-sess]').forEach(b => b.onclick = () => openHistory(+b.dataset.sess));
}

/* ==================== راه‌اندازی ==================== */
openDB().then(async () => {
  await loadCars();
  renderGarageNames();
  renderList(); refreshCounts(); renderChat(); renderQChips(); renderJobs(); renderMapSources();
  const jobs = await getJobs();
  for (const j of jobs) if (j.status === 'running'){ j.status = 'paused'; await putJob(j); }
  renderJobs();
  updateNet(); renderML(); renderLearnCard(); renderGarageSet(); renderSRSCard(); renderBackupCard();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  mlHasCache().then(c => { if (c && SET.mlUse) mlDownload(); });
  if (!localStorage.getItem('aem-tour')) setTimeout(openTour, 800);
}).catch(() => toast('دیتابیس باز نشد'));

if (typeof pdfjsLib === 'undefined') window.pdfjsLib = { GlobalWorkerOptions:{}, getDocument(){ throw new Error('کتابخانه‌ی PDF بارگذاری نشد — یک بار با اینترنت اپ را باز کن'); } };
if (pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';