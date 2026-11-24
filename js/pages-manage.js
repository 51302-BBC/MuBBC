/* 簽核與管理頁面：主管、行政、老闆 */

const depts = [...new Set(PEOPLE.map((p) => p.dept))];
const deptOpts = (on = '') => depts.map((d) => `<option${d === on ? ' selected' : ''}>${d}</option>`).join('');
const mgrName = (p) => p.mgr ? person(p.mgr).name : p.role === 'boss' ? '無' : '<span class="warn">未指派主管</span>';
const readonlyNote = role === 'boss' ? '老闆可以查看，修改由行政負責。' : '';

/* ---------- 待我核准 ---------- */
RENDER.approvals = (root) => {
  const kinds = [...new Set(queue.map((a) => a.type))];
  const scope = { manager: '直屬員工的假單、外出單和加班單。', admin: '全公司的個資修改、補打卡和報帳，以及未指派主管者的假單、外出單和加班單。自己的申請由另一位行政或老闆核准。', boss: '最上層主管的申請，以及行政自己的申請。' }[role];
  root.innerHTML = `<div class="page">${head('待我核准', scope)}${queue.length ? tabs([['all', '全部', queue.length], ...kinds.map((k) => [k, TYPES[k], queue.filter((a) => a.type === k).length])], 'all') : ''}<div id="list"></div></div>`;
  const extra = (a) => {
    const p = person(a.who);
    if (a.type === 'leave') return `${a.kind}剩餘 ${leaveLeft(a.who, a.kind)} 小時，這張 ${a.hours} 小時`;
    if (a.type === 'ot') return `本月已核准 ${otUsed(a.who)} 小時，上限 ${p.otLimit} 小時，這張 ${a.hours} 小時`;
    if (a.type === 'out') return a.hours + ' 小時';
    return '';
  };
  const body = (a) => {
    if (a.cancel) return `<div><b>申請撤銷已核准的${TYPES[a.type]}</b></div><div>${span(a)}，${a.kind || ''} ${a.hours} 小時</div><div class="mute">撤銷原因：${a.cancel.why}</div>`;
    if (a.start) return `<div>${span(a)}</div><div>${a.why}</div><div class="mute">${extra(a)}</div>`;
    if (a.type === 'punch') return `<div>${mdw(a.date)} ${a.time}，補${a.card}卡</div><div class="mute">${a.why}</div>`;
    return detailRows(a);
  };
  const draw = (k) => {
    const list = queue.filter((a) => k === 'all' || a.type === k);
    $('#list').innerHTML = list.length ? `<ul class="queue">${list.map((a) => `<li id="${a.id}"><div><strong>${person(a.who).name}</strong>${TYPES[a.type]}<br><small class="mute">${person(a.who).dept}${person(a.who).mgr ? '' : '，未指派主管'}</small><br><small class="mute">${mdw(a.cancel ? a.cancel.sent : a.sent)} 送出</small></div><div class="detail">${body(a)}</div><div class="acts"><button class="btn" type="button" data-ok>${a.cancel ? '核准撤銷' : '核准'}</button><button class="btn no" type="button" data-no aria-expanded="false">駁回</button></div></li>`).join('')}</ul>` : empty('目前沒有需要你核准的申請。', '<a href="home.html">回到首頁</a>');
  };
  const openReject = (li) => {
    const was = $('.reject', li);
    $$('.reject').forEach((f) => { $('[data-no]', f.closest('li')).setAttribute('aria-expanded', 'false'); f.remove(); });
    if (was) return;
    li.insertAdjacentHTML('beforeend', `<form class="reject"><label class="stack">駁回理由<textarea required placeholder="申請人會看到這段文字"></textarea></label><div class="acts"><button class="btn no">送出駁回</button><button class="btn line" type="button" data-close>取消</button></div></form>`);
    $('[data-no]', li).setAttribute('aria-expanded', 'true');
    $('textarea', li).focus();
  };
  root.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    if (e.target.closest('[data-ok]')) demo('這張申請會變成已核准');
    if (e.target.closest('[data-no]') || e.target.closest('[data-close]')) openReject(li);
  });
  root.addEventListener('submit', (e) => { e.preventDefault(); const li = e.target.closest('li'); openReject(li); demo('申請會變成已駁回，申請人看得到理由'); });
  draw('all');
  onTabs(root, draw);
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) { openReject(target); target.scrollIntoView({ block: 'center' }); }
};

/* ---------- 直屬員工 ---------- */
RENDER.team = (root) => {
  const list = reports(me.id);
  const ids = list.map((p) => p.id);
  const withMe = [me.id, ...ids];
  root.innerHTML = `<div class="page">${head('直屬員工', `${list.length} 位：${list.map((p) => p.name).join('、')}。紀錄包含你自己。`)}
    <div class="filters"><label>員工<select id="who"><option value="">全部</option>${[me, ...list].map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select></label></div>
    ${tabs([['leave', '請假'], ['out', '外出'], ['ot', '加班'], ['punch', '打卡']], 'leave')}<div id="list"></div></div>`;
  let k = 'leave';
  const draw = () => {
    const w = $('#who').value;
    const sel = w ? [w] : withMe;
    if (k === 'punch') $('#list').innerHTML = w ? punchTable(punchesOf(person(w))) : dayPunch(TODAY, sel);
    else $('#list').innerHTML = (k === 'ot' ? `<p class="mute" style="margin-bottom:12px">本月已核准：${sel.map((id) => `${person(id).name} ${otUsed(id)}／${person(id).otLimit} 小時`).join('、')}</p>` : '') + recTable(byDate(APPS.filter((a) => a.type === k && sel.includes(a.who))), k, true);
  };
  onTabs(root, (t) => { k = t; draw(); });
  $('#who').onchange = draw;
  draw();
};

/* 某一天每個人的打卡 */
function dayPunch(d, ids) {
  if (isOff(d)) return empty(full(d) + ' 是休息日，沒有打卡紀錄。');
  const rows = ids.map((id) => [person(id), punchesOf(person(id), d, d)[0]]).filter((x) => x[1]);
  return rows.length ? `<table class="flat"><thead><tr><th>員工</th><th>部門</th><th>日期</th><th>上班</th><th>下班</th><th>工時</th><th>備註</th></tr></thead><tbody>${rows.map(([p, r]) => `<tr><td>${p.name}</td><td data-l="部門">${p.dept}</td><td data-l="日期">${mdw(d)}</td><td data-l="上班">${r.in || (d === TODAY && !r.note ? '尚未打卡' : '')}</td><td data-l="下班">${r.out || (d === TODAY && !r.note ? '尚未打卡' : '')}</td><td data-l="工時">${r.hours != null ? r.hours + ' 小時' : ''}</td><td data-l="備註" class="${r.miss ? 'warn' : ''}">${r.note}</td></tr>`).join('')}</tbody></table>` : empty('這一天沒有打卡紀錄。');
}

/* ---------- 打卡明細 ---------- */
RENDER.punches = (root) => {
  root.innerHTML = `<div class="page">${head('打卡明細', role === 'boss' ? readonlyNote : '審核補打卡時可以在這裡對照。')}
    <div class="filters"><label>日期<input type="date" id="d" value="${TODAY}" min="2026-11-02" max="${TODAY}"></label><label>部門<select id="dep"><option value="">全部部門</option>${deptOpts()}</select></label><label>員工<select id="who"><option value="">全部員工</option>${active.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select></label></div><p class="mute" id="tip" style="margin-bottom:12px"></p><div id="list"></div></div>`;
  const draw = () => {
    const w = $('#who').value;
    $('#d').disabled = $('#dep').disabled = Boolean(w);
    $('#tip').textContent = w ? person(w).name + ' 11 月到目前的打卡' : full($('#d').value || TODAY);
    $('#list').innerHTML = w ? punchTable(punchesOf(person(w))) : dayPunch($('#d').value || TODAY, active.filter((p) => !$('#dep').value || p.dept === $('#dep').value).map((p) => p.id));
  };
  $$('.filters input, .filters select').forEach((x) => x.addEventListener('change', draw));
  draw();
};

/* ---------- 員工管理 ---------- */
RENDER.employees = (root) => {
  const edit = role === 'admin';
  const none = active.filter((p) => !p.mgr && p.role !== 'boss');
  root.innerHTML = `<div class="page">${head('員工管理', readonlyNote, edit ? '<a class="btn" href="employee.html">新增員工</a>' : '')}
    ${none.length ? `<div class="note">${none.map((p) => p.name).join('、')} 還沒有直屬主管，假單、外出單和加班單暫由行政核准。</div>` : ''}
    <div class="filters"><label>搜尋<input id="q" type="search" placeholder="姓名或員工編號"></label><label>部門<select id="dep"><option value="">全部部門</option>${deptOpts()}</select></label><label>狀態<select id="st"><option value="在職">在職</option><option value="停用">停用</option><option value="">全部</option></select></label></div><div id="list"></div></div>`;
  const draw = () => {
    const q = $('#q').value.trim().toLowerCase();
    const list = PEOPLE.filter((p) => (!q || (p.name + p.no).toLowerCase().includes(q)) && (!$('#dep').value || p.dept === $('#dep').value) && (!$('#st').value || p.status === $('#st').value));
    $('#list').innerHTML = list.length ? `<table class="flat"><thead><tr><th>姓名</th><th>編號</th><th>部門</th><th>職稱</th><th>角色</th><th>直屬主管</th><th>到職日</th><th>狀態</th>${edit ? '<th></th>' : ''}</tr></thead><tbody>${list.map((p) => `<tr><td><b>${p.name}</b></td><td data-l="編號">${p.no}</td><td data-l="部門">${p.dept}</td><td data-l="職稱">${p.title}</td><td data-l="角色">${ROLES[p.role]}</td><td data-l="直屬主管">${mgrName(p)}</td><td data-l="到職日" class="nowrap">${p.joined.replaceAll('-', '/')}</td><td data-l="狀態">${p.status === '停用' ? '<span class="mute">停用</span>' : p.status}</td>${edit ? `<td class="r"><a class="btn line" href="employee.html?id=${p.id}" aria-label="修改 ${p.name}">修改</a></td>` : ''}</tr>`).join('')}</tbody></table>` : empty('找不到符合條件的員工。');
  };
  $$('.filters input, .filters select').forEach((x) => x.addEventListener('input', draw));
  draw();
};

RENDER.employee = (root) => {
  if (role !== 'admin') { root.innerHTML = `<div class="page"><h1>只有行政可以修改員工</h1><p class="sec-gap"><a href="employees.html">回到員工清單</a></p></div>`; return; }
  const p = person(param('id'));
  const v = p || { dept: '', status: '在職' };
  const has = p && APPS.some((a) => a.who === p.id);
  const fld = (l, n, x = '') => `<label>${l}<input name="${n}" value="${esc(v[n] || '')}" ${x}></label>`;
  root.innerHTML = `<div class="page">${head(p ? '修改員工：' + p.name : '新增員工', p ? p.no + '，' + ROLES[p.role] : '角色預設為一般員工，由老闆指派其他角色。', '<a class="btn line" href="employees.html">回到清單</a>')}
    <form id="f"><section class="sec"><h2>任職</h2><div class="form">${fld('姓名', 'name', 'required')}<label>部門<select required>${deptOpts(v.dept)}</select></label>${fld('職稱', 'title')}<label>直屬主管<select><option value="">未指派</option>${active.filter((x) => ['manager', 'boss'].includes(x.role) && x.id !== v.id).map((x) => `<option${v.mgr === x.id ? ' selected' : ''}>${x.name}</option>`).join('')}</select></label>${fld('到職日', 'joined', 'type="date" required')}</div></section>
    <section class="sec"><h2>聯絡</h2><div class="form">${fld('電話', 'phone', 'type="tel"')}${fld('緊急聯絡人', 'contact')}<label class="full">地址<input value="${esc(v.address || '')}"></label>${fld('銀行帳號', 'bank')}</div></section>
    <div class="submit"><div class="acts">${p ? (p.status === '在職' ? '<button class="btn no" type="button" id="stop">停用（離職）</button>' : '<button class="btn line" type="button" id="back">恢復在職</button>') : ''}${p && !has ? '<button class="btn no" type="button" id="del">刪除</button>' : ''}</div><button class="btn">${p ? '儲存修改' : '新增員工'}</button></div>
    ${has ? '<p class="hint" style="margin-top:12px">這位員工已有申請紀錄，所以只能停用，不能刪除。</p>' : ''}</form></div>`;
  $('#f').onsubmit = (e) => { e.preventDefault(); demo('員工資料不會變動'); };
  if ($('#stop')) $('#stop').onclick = async () => { if (await ask({ title: '停用 ' + p.name + '？', text: '停用後不能登入，所有紀錄會保留。', yes: '停用' })) demo('員工會變成停用'); };
  if ($('#back')) $('#back').onclick = () => demo('員工會恢復在職');
  if ($('#del')) $('#del').onclick = async () => { if (await ask({ title: '刪除 ' + p.name + '？', text: '這位員工沒有任何申請紀錄，刪除後無法復原。', yes: '刪除' })) demo('員工會被刪除'); };
};

/* ---------- 假別與請假額度 ---------- */
RENDER['leave-quota'] = (root) => {
  const edit = role === 'admin';
  root.innerHTML = `<div class="page">${head('假別與請假額度', readonlyNote || '假別全公司共用，額度逐人設定，單位是小時。')}${tabs([['q', '員工額度'], ['t', '假別清單']], 'q')}<div id="list"></div></div>`;
  const cell = (p, k) => edit ? `<input class="cell" type="number" min="0" step="1" value="${QUOTA[p.id][k]}" aria-label="${p.name} ${k}額度"><small>已請 ${leaveUsed(p.id, k)}</small>` : `${QUOTA[p.id][k] || '未設定'}<small>已請 ${leaveUsed(p.id, k)}</small>`;
  const draw = (t) => {
    $('#list').innerHTML = t === 'q'
      ? `<form data-save="額度不會變動"><div class="scroll"><table class="flat"><thead><tr><th>員工</th>${LEAVE_TYPES.map((k) => `<th>${k}</th>`).join('')}</tr></thead><tbody>${active.map((p) => `<tr><td>${p.name}</td>${LEAVE_TYPES.map((k) => `<td data-l="${k}">${cell(p, k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${edit ? '<div class="submit"><span>空白或 0 代表未設定</span><button class="btn">儲存額度</button></div>' : ''}</form>`
      : `<form data-save="假別不會變動"><ul class="rows">${LEAVE_TYPES.map((k) => `<li class="two"><b>${k}</b><span class="mute">${active.filter((p) => QUOTA[p.id][k]).length} 人有額度</span><span>${edit ? `<button class="btn line" type="button" data-del="${k}">刪除</button>` : ''}</span></li>`).join('')}</ul>${edit ? '<div class="submit"><label class="stack">新增假別<input required placeholder="例如 公假"></label><button class="btn">新增假別</button></div>' : ''}</form>`;
  };
  root.addEventListener('submit', (e) => { e.preventDefault(); demo(e.target.dataset.save); });
  root.addEventListener('click', async (e) => {
    const k = e.target.dataset?.del;
    if (k && await ask({ title: '刪除「' + k + '」？', text: '之後不能再用這個假別申請，過去的紀錄會保留。', yes: '刪除' })) demo('假別不會真的刪除');
  });
  draw('q');
  onTabs(root, draw);
};

/* ---------- 加班上限 ---------- */
RENDER['overtime-limit'] = (root) => {
  const edit = role === 'admin';
  root.innerHTML = `<div class="page">${head('加班上限', readonlyNote || '每月可加班的最高時數，逐人設定。')}
    <form><table class="flat"><thead><tr><th>員工</th><th>部門</th><th>11 月已核准</th><th>每月上限</th><th>還能加班</th></tr></thead><tbody>${active.filter((p) => p.role !== 'boss').map((p) => `<tr><td>${p.name}</td><td data-l="部門">${p.dept}</td><td data-l="11 月已核准">${otUsed(p.id)} 小時</td><td data-l="每月上限">${edit ? `<input class="cell" type="number" min="0" value="${p.otLimit}" aria-label="${p.name} 每月加班上限"> 小時` : p.otLimit + ' 小時'}</td><td data-l="還能加班"><span class="num">${p.otLimit - otUsed(p.id)}</span> 小時</td></tr>`).join('')}</tbody></table>${edit ? '<div class="submit"><span></span><button class="btn">儲存上限</button></div>' : ''}</form></div>`;
  $('form', root).onsubmit = (e) => { e.preventDefault(); demo('上限不會變動'); };
};

/* ---------- 角色指派 ---------- */
RENDER.roles = (root) => {
  const M = [
    ['自己的申請', '新增、撤銷', '同一般員工', '同一般員工', '同一般員工，免核准'],
    ['同事請假與外出', '只看時段', '直屬看完整，其他只看時段', '看完整', '看完整'],
    ['假單、外出單、加班單', '無', '核准直屬員工', '核准未指派主管者（暫定）', '核准最上層主管與行政'],
    ['報帳、補打卡、個資修改', '無', '無', '核准，自己的除外', '核准行政的'],
    ['打卡明細', '自己', '自己與直屬員工', '全員', '全員'],
    ['員工、假別、額度、加班上限', '無', '無', '新增、修改、停用', '查看'],
    ['公司行事曆', '查看', '查看', '編輯', '查看'],
    ['角色', '無', '無', '無', '指派'],
  ];
  root.innerHTML = `<div class="page">${head('角色指派', '每位員工只有一個角色。直屬主管由行政設定。')}${tabs([['a', '指派角色'], ['m', '權限對照表']], 'a')}<div id="list"></div></div>`;
  const draw = (t) => {
    $('#list').innerHTML = t === 'a'
      ? `<form><table class="flat"><thead><tr><th>員工</th><th>部門</th><th>職稱</th><th>直屬主管</th><th style="width:200px">角色</th></tr></thead><tbody>${active.map((p) => `<tr><td>${p.name}</td><td data-l="部門">${p.dept}</td><td data-l="職稱">${p.title}</td><td data-l="直屬主管">${mgrName(p)}</td><td data-l="角色"><select aria-label="${p.name} 的角色" ${p.id === me.id ? 'disabled' : ''}>${Object.entries(ROLES).map(([k, v]) => `<option${k === p.role ? ' selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table><div class="submit"><span>老闆不能改自己的角色</span><button class="btn">儲存角色</button></div></form>`
      : `<div class="scroll"><table class="matrix"><thead><tr><th>資料</th>${Object.values(ROLES).map((r) => `<th>${r}</th>`).join('')}</tr></thead><tbody>${M.map((r) => `<tr>${r.map((c) => `<td>${c === '無' ? '<span class="mute">無</span>' : c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };
  root.addEventListener('submit', async (e) => { e.preventDefault(); if (await ask({ title: '儲存角色？', text: '角色會立刻改變員工看到的選單和能做的事。', yes: '儲存角色', danger: false })) demo('角色不會變動'); });
  draw('a');
  onTabs(root, draw);
};

/* ---------- 全公司總覽 ---------- */
RENDER.overview = (root) => {
  const open = APPS.filter(waiting).sort((a, b) => b.sent.localeCompare(a.sent));
  const away = awayOn(TODAY);
  const K = { all: open, ...Object.fromEntries(Object.keys(TYPES).map((k) => [k, APPS.filter((a) => a.type === k).sort((a, b) => b.sent.localeCompare(a.sent))])) };
  root.innerHTML = `<div class="page">${head('全公司總覽', '在職 ' + active.length + ' 人。')}
    <div class="split"><section><h2 class="sr">申請</h2>${tabs([['all', '待審核', open.length], ...Object.entries(TYPES)], 'all')}<div id="list"></div></section>
    <aside><div class="panel"><h2>今天不在辦公室</h2><div class="pairs">${away.map((a) => `<p><span>${person(a.who).name}</span><span>${a.kind || '外出'}　${clock(a)}</span></p>`).join('')}</div></div>
    <div class="panel"><h2>各部門本月加班</h2><div class="pairs">${depts.filter((d) => d !== '所長室').map((d) => `<p><span>${d}</span><span><span class="num">${sum(active.filter((p) => p.dept === d), (p) => otUsed(p.id))}</span> 小時</span></p>`).join('')}</div><a href="overtime-limit.html">看每個人</a></div></aside></div></div>`;
  const draw = (k) => {
    $('#list').innerHTML = `<table class="flat"><thead><tr><th>員工</th><th>類別</th><th>內容</th><th>核准者</th><th>狀態</th></tr></thead><tbody>${K[k].map((a) => `<tr><td>${person(a.who).name}</td><td data-l="類別"><a href="application.html?id=${a.id}">${TYPES[a.type]}</a></td><td data-l="內容">${summary(a)}<small>${when(a)}</small></td><td data-l="核准者">${a.auto ? '免核准' : a.by ? person(a.by).name : approverText(a.type, person(a.who))}</td><td data-l="狀態">${stTag(a)}</td></tr>`).join('')}</tbody></table>`;
  };
  draw('all');
  onTabs(root, draw);
};
