/* 每個人都有的頁面：登入、首頁、出缺勤、申請、紀錄、行事曆、同事動態、個人資料 */

const myApps = () => APPS.filter((a) => a.who === me.id).sort((a, b) => b.sent.localeCompare(a.sent));
const head = (title, text = '', right = '') => `<div class="page-head"><div><h1>${title}</h1>${text ? `<p>${text}</p>` : ''}</div>${right}</div>`;

/* ---------- 登入 ---------- */
RENDER.index = (root) => {
  root.innerHTML = `<div class="login">
    <div class="leaf" aria-hidden="true"><div class="leaf-day num">${Number(TODAY.slice(8))}</div><div class="leaf-wd">${Number(TODAY.slice(5, 7))} 月　星期${wd(TODAY)}</div></div>
    <div class="login-form"><h1 class="logo">MuBBC</h1><p>用公司帳號登入，打卡、送申請、看行事曆。</p>
      <form id="login">
        <label class="stack">員工編號<input name="user" autocomplete="username" placeholder="例如 M006" required></label>
        <label class="stack">密碼<input name="pw" type="password" autocomplete="current-password" required></label>
        <label class="stack">展示角色<select name="role">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}"${k === role ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
        <button class="btn">登入</button>
        <p class="hint">展示用雛形，不會檢查帳號密碼，請勿輸入真實密碼。</p>
      </form></div></div>`;
  $('#login').onsubmit = (e) => {
    e.preventDefault();
    const r = e.target.role.value;
    store.set('role', r);
    myPunch.clear();
    location.href = 'pages/home.html' + (store.get('role') === r ? '' : '?role=' + r);
  };
};

/* ---------- 首頁 ---------- */
RENDER.home = (root) => {
  let day = TODAY;
  let punch = myPunch.get();

  const leaf = () => {
    const off = isOff(day);
    const label = HOLIDAYS[day] || EVENTS[day] || '';
    const away = awayOn(day);
    const body = day === TODAY
      ? `<div class="leaf-note">${me.name}，${me.dept}</div>
         <div class="leaf-punch"><div>上班<b>${punch.in || '未打卡'}</b></div><div>下班<b>${punch.out || '未打卡'}</b></div></div>
         <button class="leaf-btn" type="button" data-punch ${punch.out ? 'disabled' : ''}>${!punch.in ? '打上班卡' : !punch.out ? '打下班卡' : '今天已打完卡'}</button>
         ${punch.out ? '<button class="link" type="button" data-again>重新示範打卡</button>' : ''}`
      : `<div class="leaf-note">${label || (off ? '休息日' : '上班日')}</div>
         ${away.length ? `<ul class="leaf-list">${away.slice(0, 4).map((a) => `<li><span>${person(a.who).name}</span><span>${TYPES[a.type].slice(0, 2) === '假單' ? '請假' : '外出'} ${clock(a)}</span></li>`).join('')}</ul>` : `<div class="leaf-note">${off ? '' : '沒有人請假或外出'}</div>`}
         <button class="leaf-btn" type="button" data-today>回到今天</button>`;
    return `<div class="leaf ${off ? 'holiday' : ''}"><div class="leaf-top"><span>${day.slice(0, 4)} 年</span><span>${Number(day.slice(5, 7))} 月</span></div>
      <div class="leaf-day num">${Number(day.slice(8))}</div><div class="leaf-wd">星期${wd(day)}</div>${body}</div>`;
  };

  const qHtml = queue.slice(0, 3).map((a) => `<li class="act"><div><a class="name" href="approvals.html">${person(a.who).name}</a><small>${TYPES[a.type]}${a.cancel ? '（撤銷）' : ''}</small></div><div>${when(a)}<small>${a.cancel ? a.cancel.why : a.type === 'ot' ? `${a.why}，本月 ${otUsed(a.who)}／${person(a.who).otLimit} 小時` : summary(a)}</small></div><div class="acts"><button class="btn" type="button" data-ok>核准</button><a class="btn no" href="approvals.html#${a.id}">駁回</a></div></li>`).join('');

  const apps = myApps().slice(0, role === 'staff' ? 4 : 3);
  const work = `${role === 'staff' ? '' : `<section class="sec"><div class="sec-head"><h2>待我核准</h2>${queue.length ? `<a href="approvals.html">全部 ${queue.length} 件</a>` : ''}</div>${queue.length ? `<ul class="rows">${qHtml}</ul>` : empty('目前沒有需要你核准的申請。')}</section>`}
    <section class="sec"><div class="sec-head"><h2>我的申請</h2><a href="applications.html">全部</a></div>
      <ul class="rows">${apps.map((a) => `<li><a class="name" href="application.html?id=${a.id}">${TYPES[a.type]}</a><div>${when(a)}<small>${a.status === 'no' ? '理由：' + a.reason : summary(a)}</small></div><div class="r">${stTag(a)}</div></li>`).join('')}</ul></section>
    <section class="sec"><h2>新增申請</h2><div class="quick">${Object.entries(TYPES).map(([k, v]) => `<a class="btn line" href="apply.html?type=${k}">${v}</a>`).join('')}</div></section>`;

  const away = awayOn(TODAY);
  const side = `<section><h2>請假額度（剩餘小時）</h2><div class="pairs">${['特休', '病假', '事假'].map((k) => `<p><span>${k}</span><span class="num">${leaveLeft(me.id, k)}</span></p>`).join('')}</div><a href="records.html?tab=quota">看全部假別</a></section>
    <section><h2>今天不在辦公室</h2><div class="pairs">${away.map((a) => `<p><span>${person(a.who).name}</span><span>${a.type === 'leave' ? '請假' : '外出'}　${clock(a)}</span></p>`).join('') || '<p>大家都在</p>'}</div><a href="colleagues.html">同事動態</a></section>`;

  const strip = Array.from({ length: 14 }, (_, i) => addDays('2026-11-22', i)).map((d) => {
    const n = awayOn(d);
    const l = n.filter((a) => a.type === 'leave').length;
    const o = n.length - l;
    const t = [HOLIDAYS[d] || '', l ? '請假 ' + l : '', o ? '外出 ' + o : '', EVENTS[d] ? '會議' : ''].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
    return `<button type="button" data-day="${d}" class="${d === TODAY ? 't' : isOff(d) ? 'h' : ''}" aria-pressed="${d === TODAY}" aria-label="${full(d)}${d === TODAY ? ' 今天' : ''}"><span class="d">${wd(d)}${d === TODAY ? '　今天' : ''}</span><span class="num">${Number(d.slice(8))}</span>${t}</button>`;
  }).join('');

  root.innerHTML = `<h1 class="sr">首頁</h1><div class="home"><div class="leaf-wrap" aria-live="polite">${leaf()}</div><div class="work">${work}</div><aside class="side">${side}</aside></div><div class="strip" role="group" aria-label="兩週日期">${strip}</div>`;

  const wrap = $('.leaf-wrap');
  const turn = (d) => {
    if (d === day) return;
    const old = $('.leaf', wrap).cloneNode(true);
    old.classList.add('tear');
    old.setAttribute('aria-hidden', 'true');
    old.inert = true;
    day = d;
    wrap.innerHTML = leaf();
    wrap.append(old);
    wrap.classList.add('tearing');
    const done = () => { old.remove(); wrap.classList.remove('tearing'); };
    old.addEventListener('animationend', done);
    setTimeout(done, 600);
    $$('[data-day]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.day === d));
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.day) turn(b.dataset.day);
    else if ('today' in b.dataset) turn(TODAY);
    else if ('ok' in b.dataset) demo('這張申請會變成已核准');
    else if ('again' in b.dataset) { punch = { in: '', out: '' }; myPunch.set(punch); wrap.innerHTML = leaf(); $('[data-punch]').focus(); }
    else if ('punch' in b.dataset) {
      if (!punch.in) punch.in = '08:52'; else punch.out = '18:02';
      myPunch.set(punch);
      wrap.innerHTML = leaf();
      toast(punch.out ? '已打下班卡 18:02' : '已打上班卡 08:52');
      ($('[data-again]') || $('[data-punch]')).focus();
    }
  });
};

/* ---------- 出缺勤 ---------- */
const punchTable = (rows, mine) => `<div class="scroll"><table class="flat"><thead><tr><th>日期</th><th>上班</th><th>下班</th><th>工時</th><th>備註</th>${mine ? '<th></th>' : ''}</tr></thead><tbody>${rows.map((r) => {
  const sent = mine && r.miss && APPS.find((a) => a.type === 'punch' && a.who === me.id && a.date === r.d);
  return `<tr><td>${mdw(r.d)}</td><td data-l="上班">${r.in || (r.d === TODAY && !r.note ? '尚未打卡' : '')}</td><td data-l="下班">${r.out || (r.d === TODAY && !r.note ? '尚未打卡' : '')}</td><td data-l="工時">${r.hours != null ? r.hours + ' 小時' : ''}</td><td data-l="備註" class="${r.miss ? 'warn' : ''}">${r.note}</td>${mine ? `<td class="r">${sent ? `<a href="application.html?id=${sent.id}">補打卡：${STATUS[sent.status]}</a>` : r.miss ? `<a class="btn line" href="apply.html?type=punch">申請補打卡</a>` : ''}</td>` : ''}</tr>`;
}).join('')}</tbody></table></div>`;

RENDER.attendance = (root) => {
  const rows = punchesOf(me);
  root.innerHTML = `<div class="page">${head('出缺勤', '', '<a class="btn" href="apply.html?type=punch">申請補打卡</a>')}
    <div class="split"><div>${punchTable(rows, true)}</div>
    <aside class="panel"><h2>11 月到目前</h2><div class="pairs"><p><span>出勤天數</span><span class="num">${rows.filter((r) => r.in || r.out).length}</span></p><p><span>工作時數</span><span class="num">${sum(rows, (r) => r.hours || 0)}</span></p><p><span>缺卡</span><span class="num">${rows.filter((r) => r.miss).length}</span></p></div></aside></div></div>`;
};

/* ---------- 我的申請 ---------- */
RENDER.applications = (root) => {
  const all = myApps();
  const count = (s) => all.filter((a) => a.status === s).length;
  root.innerHTML = `<div class="page">${head('我的申請', '', '<a class="btn" href="apply.html">新增申請</a>')}
    ${tabs([['all', '全部'], ...Object.entries(STATUS)], 'all')}<div id="list"></div></div>`;
  const draw = (s) => {
    const list = all.filter((a) => s === 'all' || a.status === s);
    $('#list').innerHTML = list.length ? `<table class="flat terse"><thead><tr><th>類別</th><th>內容</th><th>時段或項目</th><th>送出</th><th>狀態</th><th></th></tr></thead><tbody>${list.map((a) => `<tr><td><a href="application.html?id=${a.id}"><b>${TYPES[a.type]}</b></a></td><td data-l="內容">${summary(a)}</td><td data-l="時段或項目">${when(a)}</td><td data-l="送出">${mdw(a.sent)}</td><td data-l="狀態">${stTag(a)}</td><td class="r">${rowAct(a)}</td></tr>`).join('')}</tbody></table>`
      : empty('沒有' + STATUS[s] + '的申請。', '<a href="apply.html">新增申請</a>');
  };
  const rowAct = (a) => canWithdraw(a) ? `<button class="btn line" type="button" data-off="${a.id}">撤銷</button>`
    : canAskCancel(a) ? `<button class="btn line" type="button" data-cancel="${a.id}">申請撤銷</button>`
      : a.status === 'no' ? `<a class="btn line" href="apply.html?from=${a.id}">重新申請</a>` : '';
  draw('all');
  onTabs(root, draw);
  wireCancel(root);
};

function wireCancel(root) {
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-off],[data-cancel]');
    if (!b) return;
    const a = APPS.find((x) => x.id === (b.dataset.off || b.dataset.cancel));
    const name = TYPES[a.type] + '「' + summary(a) + '」';
    if (b.dataset.off) {
      if (await ask({ title: '撤銷這張' + TYPES[a.type] + '？', text: name + '還沒審核，撤銷後會留在清單裡，標示為已撤銷。', yes: '撤銷' })) demo('申請會變成已撤銷');
    } else if (await ask({ title: '申請撤銷這張' + TYPES[a.type] + '？', text: name + '已核准，撤銷需要由' + approverText(a.type, me) + '再核准一次。核准前原申請仍然有效。', yes: '申請撤銷' })) demo('撤銷申請會送給' + approverText(a.type, me));
  });
}

/* ---------- 申請詳情 ---------- */
function detailRows(a) {
  const rows = [];
  if (a.type === 'leave') rows.push(['假別', a.kind]);
  if (a.start) rows.push(['開始', full(a.start) + ' ' + hm(a.start)], ['結束', full(a.end) + ' ' + hm(a.end)], ['時數', a.hours + ' 小時'], ['事由', a.why]);
  if (a.type === 'punch') rows.push(['日期', full(a.date)], ['卡別', a.card], ['時間', a.time], ['原因', a.why]);
  return `<dl class="dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
    + (a.type === 'exp' ? `<table><thead><tr><th>日期</th><th>項目</th><th>收據</th><th class="r">金額</th></tr></thead><tbody>${a.items.map((i) => `<tr><td>${mdw(i[0])}</td><td>${i[1]}</td><td class="mute">示範圖片</td><td class="r nowrap">${money(i[2])}</td></tr>`).join('')}</tbody></table><div class="total"><b>合計</b><span class="num">${expTotal(a).toLocaleString('zh-TW')}</span></div>` : '')
    + (a.type === 'info' ? `<table class="diff"><thead><tr><th>欄位</th><th>修改前</th><th>修改後</th></tr></thead><tbody>${a.changes.map((c) => `<tr><td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td></tr>`).join('')}</tbody></table>` : '');
}

RENDER.application = (root) => {
  const a = APPS.find((x) => x.id === param('id') && (x.who === me.id || role === 'boss'));
  const own = a && a.who === me.id;
  if (!a) {
    root.innerHTML = `<div class="page"><h1>找不到這張申請</h1><p class="sec-gap">它可能屬於其他角色的示範帳號。<a href="applications.html">回到我的申請</a></p></div>`;
    return;
  }
  const by = a.auto ? '免核准' : a.by ? person(a.by).name : approverText(a.type, person(a.who));
  const third = a.status === 'pending' ? ['', '結果', '尚未決定'] : a.status === 'no' ? ['no', '已駁回', mdw(a.at)] : a.status === 'off' ? ['', '已撤銷', mdw(a.at)] : ['done', '已核准', mdw(a.at)];
  const acts = !own ? '' : [
    canWithdraw(a) ? `<button class="btn no" type="button" data-off="${a.id}">撤銷</button>` : '',
    canAskCancel(a) ? `<button class="btn no" type="button" data-cancel="${a.id}">申請撤銷</button>` : '',
    a.status === 'no' ? `<a class="btn" href="apply.html?from=${a.id}">以原內容重新申請</a>` : '',
  ].join('');
  root.innerHTML = `<div class="page">${head(TYPES[a.type], own ? `單號 ${a.id}` : `${person(a.who).name}，${person(a.who).dept}，單號 ${a.id}`, `<div class="acts"><a class="btn line" href="${own ? 'applications' : 'overview'}.html">回到清單</a>${acts}</div>`)}
    <ol class="steps"><li class="done"><b>送出</b>${mdw(a.sent)}</li><li class="${['ok', 'no'].includes(a.status) ? 'done' : ''}"><b>審核</b>${by}</li><li class="${third[0]}"><b>${third[1]}</b>${third[2]}</li></ol>
    ${a.reason ? `<div class="note"><b>駁回理由</b><br>${esc(a.reason)}</div>` : ''}
    ${a.cancel ? `<div class="note blue"><b>撤銷待核准</b><br>${mdw(a.cancel.sent)} 申請撤銷：${esc(a.cancel.why)}。核准前原申請仍然有效。</div>` : ''}
    ${a.status === 'ok' && ['leave', 'out'].includes(a.type) && isPast(a) ? '<p class="mute">已經開始或結束，不能撤銷。</p>' : ''}
    <section class="sec">${detailRows(a)}</section></div>`;
  wireCancel(root);
};

/* ---------- 新增申請 ---------- */
RENDER.apply = (root) => {
  const from = APPS.find((a) => a.id === param('from') && a.who === me.id);
  const type = from ? from.type : TYPES[param('type')] ? param('type') : 'leave';
  const v = from || {};
  const range = (min = '') => `<label>開始<input type="datetime-local" name="start" value="${v.start || '2026-11-30T09:00'}" ${min} required></label><label>結束<input type="datetime-local" name="end" value="${v.end || '2026-11-30T18:00'}" ${min} required></label>
    <p class="full">共 <b id="hours"></b><span class="hint">　扣除 12:00–13:00 午休與休息日</span></p>`;
  const why = (label, ph) => `<label class="full">${label}<textarea name="why" required placeholder="${ph}">${esc(v.why || '')}</textarea></label>`;
  const line = (i = ['', '', '']) => `<div class="line-item"><label class="stack">日期<input type="date" value="${i[0]}" required></label><label class="stack wide">項目<input value="${esc(i[1])}" placeholder="例如 計程車（客戶查核）" required></label><label class="stack">金額<input type="number" min="1" inputmode="numeric" value="${i[2]}" data-amt required></label><label class="stack">收據圖片<input type="file" accept="image/*"></label><button class="icon-btn" type="button" data-del aria-label="刪除這筆明細">${ICON.close}</button></div>`;
  const INFO = [['phone', '電話'], ['address', '地址'], ['contact', '緊急聯絡人'], ['bank', '銀行帳號']];
  const FORM = {
    leave: () => `<label class="full">假別<select name="kind">${LEAVE_TYPES.filter((k) => QUOTA[me.id][k] > 0).map((k) => `<option${v.kind === k ? ' selected' : ''} value="${k}">${k}（剩 ${leaveLeft(me.id, k)} 小時）</option>`).join('')}</select></label>${range()}${why('事由', '同事不會看到假別與事由')}`,
    out: () => range() + why('外出事由', '例如 送件至國稅局'),
    ot: () => `<p class="full note blue">加班要事前申請。本月已核准 ${otUsed(me.id)} 小時，上限 ${me.otLimit} 小時。</p>` + range(`min="${NOW}"`).replace('T09:00"', 'T18:30"').replace('T18:00"', 'T20:30"') + why('加班事由', '例如 年底存貨盤點準備'),
    exp: () => `<div class="full"><div id="lines">${(v.items || [['', '', '']]).map(line).join('')}</div><button class="btn line" type="button" id="add">新增一筆明細</button></div><div class="full total"><b>合計</b><span><span class="num" id="total">0</span> 元</span></div>`,
    punch: () => `<label>日期<input type="date" name="date" max="${TODAY}" value="${v.date || '2026-11-23'}" required></label><label>時間<input type="time" name="time" value="${v.time || '18:00'}" required></label><fieldset class="full"><legend class="label">卡別</legend><div class="choice"><label><input type="radio" name="card" ${v.card === '上班' ? 'checked' : ''}>上班</label><label><input type="radio" name="card" ${v.card === '上班' ? '' : 'checked'}>下班</label></div></fieldset>${why('原因', '例如 下班直接從客戶端離開')}`,
    info: () => `<p class="full mute">只填要修改的欄位。姓名、部門、到職日和直屬主管請聯絡行政。</p>${INFO.map(([k, l]) => `<label class="full">${l}<span class="hint">目前：${me[k]}</span><input data-info placeholder="不修改就留空"></label>`).join('')}`,
  };
  const ap = approverText(type, me);
  root.innerHTML = `<div class="page">${head('新增申請', from ? '已帶入 ' + from.id + ' 的內容，可以修改後重新送出。' : '')}
    ${from ? '' : `<nav class="tabs" aria-label="申請類別">${Object.entries(TYPES).map(([k, l]) => `<a href="apply.html?type=${k}"${k === type ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`}
    ${from ? `<div class="note"><b>上次駁回理由</b><br>${esc(from.reason)}</div>` : ''}
    <form id="f"><div class="form">${FORM[type]()}</div><div class="submit"><span>${ap === '不需核准' ? '你的申請不需核准，送出後直接生效' : `送出後由<b>${ap}</b>核准`}</span><button class="btn">送出${TYPES[type]}</button></div></form></div>`;

  const f = $('#f');
  const calc = () => {
    if ($('#hours')) {
      const { start: s, end: e } = f;
      let h = 0;
      if (s.value && e.value && e.value > s.value) {
        if (s.value.slice(0, 10) === e.value.slice(0, 10)) {
          h = (new Date(e.value) - new Date(s.value)) / 36e5;
          if (type !== 'ot' && hm(s.value) <= '12:00' && hm(e.value) >= '13:00') h -= 1;
        } else for (let d = s.value.slice(0, 10); d <= e.value.slice(0, 10); d = addDays(d, 1)) h += isOff(d) ? 0 : 8;
      }
      e.setCustomValidity(e.value && e.value <= s.value ? '結束時間要晚於開始時間' : '');
      $('#hours').textContent = Math.round(h * 10) / 10 + ' 小時';
    }
    if ($('#total')) $('#total').textContent = sum($$('[data-amt]'), (i) => Number(i.value) || 0).toLocaleString('zh-TW');
    if (type === 'info') $('[data-info]').setCustomValidity($$('[data-info]').some((i) => i.value.trim()) ? '' : '至少填一個要修改的欄位');
  };
  f.addEventListener('input', calc);
  f.addEventListener('click', (e) => {
    if (e.target.closest('#add')) { $('#lines').insertAdjacentHTML('beforeend', line()); $$('#lines input[type=date]').at(-1).focus(); }
    if (e.target.closest('[data-del]')) { if ($$('.line-item').length > 1) e.target.closest('.line-item').remove(); else toast('至少要有一筆明細'); calc(); }
  });
  f.addEventListener('submit', (e) => { e.preventDefault(); demo(TYPES[type] + '不會真的送出'); });
  calc();
};

/* ---------- 我的紀錄 ---------- */
const recTable = (list, kind, withName = false) => list.length ? `<table class="flat"><thead><tr>${withName ? '<th>員工</th>' : ''}<th>日期</th>${kind === 'leave' ? '<th>假別</th>' : ''}<th>時數</th><th>事由</th><th>狀態</th></tr></thead><tbody>${list.map((a) => `<tr>${withName ? `<td>${person(a.who).name}</td>` : ''}<td${withName ? ' data-l="日期"' : ''}>${span(a)}</td>${kind === 'leave' ? `<td data-l="假別">${a.kind}</td>` : ''}<td data-l="時數">${a.hours} 小時</td><td data-l="事由">${a.why}</td><td data-l="狀態">${stTag(a)}</td></tr>`).join('')}</tbody></table>` : empty('沒有紀錄。');
const byDate = (list) => list.slice().sort((a, b) => b.start.localeCompare(a.start));

const quotaTable = (id) => `<table class="flat"><thead><tr><th>假別</th><th>額度</th><th>已核准</th><th>待審核</th><th>剩餘</th></tr></thead><tbody>${LEAVE_TYPES.map((k) => {
  const q = QUOTA[id][k];
  const wait = sum(APPS.filter((a) => a.who === id && a.type === 'leave' && a.kind === k && a.status === 'pending'), (a) => a.hours);
  return `<tr><td>${k}</td>${q ? `<td data-l="額度">${q} 小時</td><td data-l="已核准">${leaveUsed(id, k)} 小時</td><td data-l="待審核">${wait} 小時</td><td data-l="剩餘"><span class="num">${leaveLeft(id, k)}</span> 小時</td>` : '<td colspan="4" class="mute">未設定，需要時請聯絡行政</td>'}</tr>`;
}).join('')}</tbody></table>`;

RENDER.records = (root) => {
  const on = ['leave', 'out', 'ot', 'quota'].includes(param('tab')) ? param('tab') : 'leave';
  root.innerHTML = `<div class="page">${head('我的紀錄')}${tabs([['leave', '請假'], ['out', '外出'], ['ot', '加班'], ['quota', '請假額度']], on)}<div id="list"></div></div>`;
  const draw = (k) => {
    const list = byDate(myApps().filter((a) => a.type === k));
    $('#list').innerHTML = k === 'quota' ? quotaTable(me.id) : (k === 'ot' ? `<p class="mute">本月已核准 ${otUsed(me.id)} 小時${me.otLimit ? '，上限 ' + me.otLimit + ' 小時' : ''}</p>` : '') + recTable(list, k);
  };
  draw(on);
  onTabs(root, draw);
};

/* ---------- 行事曆 ---------- */
RENDER.calendar = (root) => {
  const months = ['2026-10', '2026-11', '2026-12', '2027-01'];
  let i = 1;
  const edit = role === 'admin';
  root.innerHTML = `<div class="page">${head('公司行事曆', edit ? '國定假日與公司活動由行政維護。' : '', `<div class="acts"><div class="month-nav"><button class="icon-btn" type="button" id="prev" aria-label="上個月">${ICON.prev}</button><h2 id="mon" aria-live="polite"></h2><button class="icon-btn" type="button" id="next" aria-label="下個月">${ICON.next}</button></div>${edit ? '<button class="btn" type="button" id="add">新增日期</button>' : ''}</div>`)}
    <form class="form panel" id="ev" hidden style="margin-bottom:24px"><label>日期<input type="date" name="d" value="2026-11-30" required></label><label>類別<select><option>公司活動</option><option>國定假日</option></select></label><label class="full">名稱<input required placeholder="例如 全所會議"></label><div class="full acts"><button class="btn">儲存</button><button class="btn line" type="button" id="cancel">取消</button></div></form>
    <div id="grid"></div></div>`;
  const draw = () => {
    const m = months[i];
    const first = toDate(m + '-01');
    const start = addDays(m + '-01', -first.getDay());
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((first.getDay() + days) / 7);
    $('#mon').textContent = m.slice(0, 4) + ' 年 ' + Number(m.slice(5)) + ' 月';
    $('#prev').disabled = i === 0; $('#next').disabled = i === months.length - 1;
    const cell = (d) => {
      if (!d.startsWith(m)) return '<td class="x"></td>';
      const away = isOff(d) ? [] : awayOn(d);
      return `<td class="${d === TODAY ? 't' : isOff(d) ? 'h' : ''}"><span class="num">${Number(d.slice(8))}</span><ul>${HOLIDAYS[d] ? `<li class="hol">${HOLIDAYS[d]}</li>` : ''}${EVENTS[d] ? `<li class="ev">${EVENTS[d]}</li>` : ''}${away.slice(0, 3).map((a) => `<li title="${person(a.who).name} ${a.type === 'leave' ? '請假' : '外出'} ${clock(a)}">${person(a.who).name} ${a.type === 'leave' ? '請假' : '外出'}</li>`).join('')}${away.length > 3 ? `<li>另 ${away.length - 3} 人</li>` : ''}</ul>${away.length ? `<span class="more">${away.length} 人不在</span>` : ''}</td>`;
    };
    $('#grid').innerHTML = `<table class="month"><thead><tr>${[...WD].map((w, n) => `<th class="${n % 6 ? '' : 'h'}">${w}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: weeks }, (_, w) => `<tr>${Array.from({ length: 7 }, (_, n) => cell(addDays(start, w * 7 + n))).join('')}</tr>`).join('')}</tbody></table>`;
  };
  $('#prev').onclick = () => { i -= 1; draw(); };
  $('#next').onclick = () => { i += 1; draw(); };
  if (edit) {
    $('#add').onclick = () => { $('#ev').hidden = false; $('#ev').d.focus(); };
    $('#cancel').onclick = () => { $('#ev').hidden = true; };
    $('#ev').onsubmit = (e) => { e.preventDefault(); $('#ev').hidden = true; demo('日期不會加入行事曆'); };
  }
  draw();
};

/* ---------- 同事動態 ---------- */
RENDER.colleagues = (root) => {
  const full2 = role !== 'staff';
  const days = Array.from({ length: 12 }, (_, i) => addDays(TODAY, i)).filter((d) => !isOff(d));
  const text = { staff: '可以看到誰在什麼時段請假或外出。', manager: '直屬員工會顯示假別與事由，其他同事只顯示時段。', admin: '行政可以看到假別與事由。', boss: '老闆可以看到假別與事由。' }[role];
  root.innerHTML = `<div class="page">${head('同事動態', text)}
    <div class="filters"><label>類別<select id="k"><option value="">請假與外出</option><option value="leave">請假</option><option value="out">外出</option></select></label><label>部門<select id="d"><option value="">全部部門</option>${[...new Set(active.map((p) => p.dept))].map((x) => `<option>${x}</option>`).join('')}</select></label></div><div id="list"></div></div>`;
  const draw = () => {
    const k = $('#k').value; const dep = $('#d').value;
    const html = days.map((d) => {
      const list = awayOn(d).filter((a) => a.who !== me.id && (!k || a.type === k) && (!dep || person(a.who).dept === dep));
      return list.length ? `<section class="sec"><h2>${mdw(d)}${d === TODAY ? ' 今天' : ''}</h2><table class="flat"><thead><tr><th style="width:130px">員工</th><th style="width:140px">部門</th><th style="width:90px">類別</th><th style="width:160px">時段</th>${full2 ? '<th>內容</th>' : ''}</tr></thead><tbody>${list.map((a) => `<tr><td>${person(a.who).name}</td><td data-l="部門">${person(a.who).dept}</td><td data-l="類別">${a.type === 'leave' ? '請假' : '外出'}</td><td data-l="時段">${clock(a)}</td>${full2 ? `<td data-l="內容">${seesDetail(a) ? (a.kind ? a.kind + '，' : '') + a.why : '<span class="mute">不顯示</span>'}</td>` : ''}</tr>`).join('')}</tbody></table></section>` : '';
    }).join('');
    $('#list').innerHTML = html || empty('這兩週沒有符合條件的請假或外出。');
  };
  $$('.filters select').forEach((s) => s.addEventListener('change', draw));
  draw();
};

/* ---------- 個人資料 ---------- */
RENDER.profile = (root) => {
  const p = me;
  const dl = (rows) => `<dl class="dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const wait = myApps().filter((a) => a.type === 'info' && a.status === 'pending');
  root.innerHTML = `<div class="page">${head('個人資料', '', '<a class="btn" href="apply.html?type=info">申請修改</a>')}
    ${wait.length ? `<div class="note blue">有 ${wait.length} 張個資修改待審核。<a href="application.html?id=${wait[0].id}">查看</a></div>` : ''}
    <section class="sec"><h2>可以申請修改</h2>${dl([['電話', p.phone], ['地址', p.address], ['緊急聯絡人', p.contact], ['銀行帳號', p.bank]])}</section>
    <section class="sec"><h2>由行政維護</h2>${dl([['姓名', p.name], ['員工編號', p.no], ['部門', p.dept], ['職稱', p.title], ['角色', ROLES[p.role]], ['直屬主管', p.mgr ? person(p.mgr).name : p.role === 'boss' ? '無' : '未指派'], ['到職日', full(p.joined)]])}</section></div>`;
};
