/* 共用：目前角色、權限規則、選單外框、小工具 */

/* ---------- 小工具 ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const param = (k) => new URLSearchParams(location.search).get(k);
const store = {
  get(k) { try { return localStorage.getItem('mubbc.' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('mubbc.' + k, v); } catch { /* 無痕模式下不記錄 */ } },
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WD = '日一二三四五六';
const toDate = (d) => new Date(d.slice(0, 10) + 'T00:00');
const iso = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
const addDays = (d, n) => { const x = toDate(d); x.setDate(x.getDate() + n); return iso(x); };
const wd = (d) => WD[toDate(d).getDay()];
const isOff = (d) => Boolean(HOLIDAYS[d]) || [0, 6].includes(toDate(d).getDay());
const md = (d) => Number(d.slice(5, 7)) + '/' + Number(d.slice(8, 10));
const mdw = (d) => md(d) + '（' + wd(d) + '）';
const full = (d) => d.slice(0, 10).replaceAll('-', '/') + '（' + wd(d) + '）';
const money = (n) => n.toLocaleString('zh-TW') + ' 元';
const hm = (d) => d.slice(11, 16);
const isWhole = (a) => hm(a.start) === '09:00' && hm(a.end) === '18:00';
const sameDay = (a) => a.start.slice(0, 10) === a.end.slice(0, 10);
const span = (a) => sameDay(a)
  ? mdw(a.start) + ' ' + (a.type === 'leave' && isWhole(a) ? '整天' : hm(a.start) + '–' + hm(a.end))
  : mdw(a.start) + '至 ' + mdw(a.end);
const clock = (a, day) => sameDay(a) && !(a.type === 'leave' && isWhole(a)) ? hm(a.start) + '–' + hm(a.end) : '整天';
const sum = (list, f) => list.reduce((n, x) => n + f(x), 0);

const CHEV = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4"/></svg>';
const ICON = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
};

/* ---------- 目前角色 ---------- */
const role = (() => {
  const q = param('role');
  if (ROLES[q]) { store.set('role', q); return q; }
  const s = store.get('role');
  return ROLES[s] ? s : 'staff';
})();
const person = (id) => PEOPLE.find((p) => p.id === id);
const me = person(PERSONA[role]);
const active = PEOPLE.filter((p) => p.status === '在職');

/* ---------- 權限規則（對照 CONTEXT.md） ---------- */
const reports = (id) => active.filter((p) => p.mgr === id);

/* 誰可以核准這張申請 */
function canApprove(user, a) {
  const who = person(a.who);
  if (who.id === user.id || who.role === 'boss') return false;
  if (['exp', 'punch', 'info'].includes(a.type)) {
    return user.role === 'admin' || (user.role === 'boss' && who.role === 'admin');
  }
  if (!who.mgr) return user.role === 'admin';          // 未指派主管，暫定行政
  return who.mgr === user.id;
}
function approverText(type, who) {
  if (who.role === 'boss') return '不需核准';
  if (['exp', 'punch', 'info'].includes(type)) return who.role === 'admin' ? '另一位行政或老闆' : '行政';
  return who.mgr ? person(who.mgr).name : '行政（尚未指派主管）';
}
const waiting = (a) => a.status === 'pending' || Boolean(a.cancel);
const queue = APPS.filter((a) => waiting(a) && canApprove(me, a));

/* 假別與事由：本人、直屬主管、行政、老闆看得到 */
const seesDetail = (a) => a.who === me.id || ['admin', 'boss'].includes(role) || (role === 'manager' && person(a.who).mgr === me.id);

const isPast = (a) => a.start <= NOW;
const canWithdraw = (a) => a.status === 'pending';
const canAskCancel = (a) => a.status === 'ok' && ['leave', 'out'].includes(a.type) && !isPast(a) && !a.cancel && person(a.who).role !== 'boss';

/* ---------- 時數 ---------- */
const approved = (who, type) => APPS.filter((a) => a.who === who && a.type === type && a.status === 'ok');
const leaveUsed = (who, kind) => sum(approved(who, 'leave').filter((a) => a.kind === kind), (a) => a.hours);
const leaveLeft = (who, kind) => QUOTA[who][kind] - leaveUsed(who, kind);
const otUsed = (who, month = TODAY.slice(0, 7)) => sum(approved(who, 'ot').filter((a) => a.start.startsWith(month)), (a) => a.hours);
const expTotal = (a) => sum(a.items, (i) => i[2]);

/* 某天不在辦公室的人 */
const awayOn = (d, list = APPS) => list.filter((a) => a.status === 'ok' && ['leave', 'out'].includes(a.type) && person(a.who).status === '在職' && a.start.slice(0, 10) <= d && a.end.slice(0, 10) >= d);

/* 今天的打卡：每個角色各自記住，關閉分頁或重新登入後回到未打卡 */
const myPunch = {
  get() { try { return JSON.parse(sessionStorage.getItem('mubbc.punch.' + role)) || { in: '', out: '' }; } catch { return { in: '', out: '' }; } },
  set(v) { try { sessionStorage.setItem('mubbc.punch.' + role, JSON.stringify(v)); } catch { /* 不記錄 */ } },
  clear() { try { Object.keys(ROLES).forEach((r) => sessionStorage.removeItem('mubbc.punch.' + r)); } catch { /* 不記錄 */ } },
};

/* 示範出缺勤：固定算法產生，重新整理結果不變 */
function punchesOf(p, from = '2026-11-02', to = TODAY) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (isOff(d) || d < p.joined) continue;
    const h = [...(p.id + d)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7);
    const row = { d, in: '08:' + String(44 + (h % 16)).padStart(2, '0'), out: '18:' + String(1 + (h % 37)).padStart(2, '0'), note: '' };
    const leave = awayOn(d).find((a) => a.who === p.id && a.type === 'leave');
    if (leave && isWhole(leave)) Object.assign(row, { in: '', out: '', note: '請假' });
    else if (leave) row.note = '請假 ' + clock(leave);
    if (leave && !isWhole(leave) && hm(leave.end) === '18:00') row.out = hm(leave.start).replace(':00', ':04');
    const miss = APPS.find((a) => a.type === 'punch' && a.who === p.id && a.date === d);
    if (miss) { row[miss.card === '上班' ? 'in' : 'out'] = ''; row.miss = miss.card; row.note = '缺' + miss.card + '卡'; }
    const ot = APPS.find((a) => a.type === 'ot' && a.who === p.id && a.status === 'ok' && a.start.startsWith(d));
    if (ot && d < TODAY) row.out = hm(ot.end).replace(':30', ':3' + (h % 10));
    if (d === TODAY && row.note !== '請假') { row.out = row.note ? row.out : ''; }
    if (d === TODAY && p.id === me.id) Object.assign(row, myPunch.get());
    if (row.in && row.out) {
      const m = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
      row.hours = Math.max(0, Math.floor((m(row.out) - m(row.in) - (m(row.out) > 780 ? 60 : 0)) / 30) / 2);
    }
    out.push(row);
  }
  return out.reverse();
}

/* ---------- 共用片段 ---------- */
const stTag = (a) => `<span class="st ${a.status}">${STATUS[a.status]}</span>` + (a.cancel ? '<small class="mute">撤銷待核准</small>' : '');
const summary = (a) => {
  if (a.type === 'leave') return a.kind + '，' + a.hours + ' 小時';
  if (a.type === 'out' || a.type === 'ot') return a.hours + ' 小時';
  if (a.type === 'exp') return a.items.length + ' 筆，' + money(expTotal(a));
  if (a.type === 'punch') return '補' + a.card + '卡';
  return a.changes.map((c) => c[0]).join('、');
};
const when = (a) => (a.start ? span(a) : a.type === 'exp' ? a.items[0][1] + (a.items.length > 1 ? '等' : '') : a.type === 'punch' ? mdw(a.date) + ' ' + a.time : '修改 ' + a.changes.length + ' 項');
const empty = (text, link = '') => `<p class="empty">${text}${link}</p>`;

let toastTimer;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 3600);
}
const demo = (what) => toast('示範版不會儲存：' + what);

function ask({ title, text, yes, danger = true }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'ask';
    d.innerHTML = `<form method="dialog"><h2>${title}</h2><p>${text}</p><div class="acts"><button class="btn line" value="no">返回</button><button class="btn ${danger ? 'no' : ''}" value="yes">${yes}</button></div></form>`;
    document.body.append(d);
    d.addEventListener('close', () => { resolve(d.returnValue === 'yes'); d.remove(); });
    d.showModal();
  });
}

/* 分頁籤：[[key, label, count]] */
const tabs = (list, on) => `<div class="tabs" role="tablist">${list.map(([k, l, n]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === on}">${l}${n ? ` <span class="badge">${n}</span>` : ''}</button>`).join('')}</div>`;
function onTabs(root, draw) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    $$('[data-tab]', b.parentNode).forEach((x) => x.setAttribute('aria-selected', x === b));
    draw(b.dataset.tab);
  });
  root.addEventListener('keydown', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const all = $$('[data-tab]', b.parentNode);
    const n = all[(all.indexOf(b) + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
    n.focus(); n.click();
  });
}

/* ---------- 選單 ---------- */
const MANAGE = [['overview', '總覽', ['boss']], ['employees', '員工管理', ['admin', 'boss']], ['leave-quota', '假別與額度', ['admin', 'boss']], ['overtime-limit', '加班上限', ['admin', 'boss']], ['punches', '打卡明細', ['admin', 'boss']]];
const PAGES = [
  ['home', '首頁'], ['attendance', '出缺勤'], ['applications', '我的申請'], ['records', '我的紀錄'], ['calendar', '行事曆'], ['colleagues', '同事動態'],
  ['approvals', '待我核准', ['manager', 'admin', 'boss']], ['team', '直屬員工', ['manager']], ['roles', '角色指派', ['boss']],
];
const allowed = (roles) => !roles || roles.includes(role);
const PARENT = { application: 'applications', apply: 'applications', employee: 'employees' };

function shell() {
  const page = document.body.dataset.page;
  const cur = PARENT[page] || page;
  const a = ([k, l]) => `<a href="${k}.html"${k === cur ? ' aria-current="page"' : ''}>${l}${k === 'approvals' && queue.length ? ` <span class="badge">${queue.length}<span class="sr"> 件</span></span>` : ''}</a>`;
  const top = PAGES.filter((p) => allowed(p[2]));
  const man = MANAGE.filter((p) => allowed(p[2]));
  const manName = role === 'boss' ? '全公司' : '行政管理';
  const manHtml = man.length ? `<details class="drop"><summary class="${man.some((m) => m[0] === cur) ? 'on' : ''}">${manName}${CHEV}</summary><div class="drop-list">${man.map(a).join('')}</div></details>` : '';
  const last = top.filter((p) => p[0] === 'roles');
  const opts = Object.entries(ROLES).map(([k, v]) => `<option value="${k}"${k === role ? ' selected' : ''}>${v}</option>`).join('');
  const mine = top.filter((p) => !p[2] && !['calendar', 'colleagues'].includes(p[0]));

  document.body.insertAdjacentHTML('afterbegin', `
  <header class="bar"><div class="bar-in">
    <button class="icon-btn menu-btn" type="button" aria-label="開啟選單" id="openMenu">${ICON.menu}</button>
    <a class="logo" href="home.html">MuBBC</a>
    <nav class="nav" aria-label="主選單">${top.filter((p) => p[0] !== 'roles').map(a).join('')}${manHtml}${last.map(a).join('')}</nav>
    ${allowed(['manager', 'admin', 'boss']) ? `<a class="badge-link" href="approvals.html">待我核准 <span class="badge">${queue.length}</span></a>` : ''}
    <div class="who">
      <label>展示角色<select data-role-pick>${opts}</select></label>
      <details class="drop"><summary>${me.name}${CHEV}</summary><div class="drop-list right"><a href="profile.html"${cur === 'profile' ? ' aria-current="page"' : ''}>個人資料</a><a href="../index.html">登出</a></div></details>
    </div>
  </div></header>
  <dialog class="drawer" id="drawer" aria-label="選單">
    <div class="drawer-head">MuBBC<button class="icon-btn" type="button" aria-label="關閉選單" id="closeMenu">${ICON.close}</button></div>
    <nav aria-label="手機選單"><h3>我的</h3>${mine.map(a).join('')}${a(['profile', '個人資料'])}
    <h3>公司</h3>${a(['calendar', '行事曆'])}${a(['colleagues', '同事動態'])}
    ${role === 'staff' ? '' : `<h3>${ROLES[role]}</h3>${top.filter((p) => p[2]).map(a).join('')}${man.map(a).join('')}`}
    <h3>${me.name}，${me.dept}</h3><a href="../index.html">登出</a></nav>
    <label>展示角色<select data-role-pick>${opts}</select></label>
  </dialog>`);
  document.body.insertAdjacentHTML('beforeend', '<footer class="foot">展示用雛形，人名、單據與時數皆為虛構，日期固定為 2026/11/24。</footer><div class="toast" id="toast" role="status"></div>');

  $('#openMenu').onclick = () => $('#drawer').showModal();
  $('#closeMenu').onclick = () => $('#drawer').close();
  $('#drawer').addEventListener('click', (e) => { if (e.target.id === 'drawer') e.target.close(); });
  $$('[data-role-pick]').forEach((s) => s.addEventListener('change', () => {
    store.set('role', s.value);
    const u = new URL(location.href);
    u.search = '';
    if (store.get('role') !== s.value) u.searchParams.set('role', s.value);   // 無法記錄時改用網址帶角色
    location.href = u;
  }));
  document.addEventListener('click', (e) => $$('details.drop[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('details.drop[open]').forEach((d) => { d.open = false; $('summary', d).focus(); }); });
}

/* 沒有權限的頁面 */
const RULES = Object.fromEntries([...PAGES, ...MANAGE].filter((p) => p[2]).map((p) => [p[0], p[2]]));
RULES.employee = RULES.employees;

const RENDER = {};
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page !== 'index') shell();
  const root = $('#app');
  if (RULES[page] && !allowed(RULES[page])) {
    root.innerHTML = `<div class="page"><h1>這一頁不開放給${ROLES[role]}</h1><p class="sec-gap">可以看的角色：${RULES[page].map((r) => ROLES[r]).join('、')}。請切換展示角色，或<a href="home.html">回到首頁</a>。</p></div>`;
    return;
  }
  RENDER[page]?.(root);
});
