/* 📔 내 수첩: 위젯 (수첩 비밀번호로 잠가서 서버에 저장 · 마스터 열쇠는 선생님 관리 화면)
 * student.html 안에서 돌아가요: me · studentCall · toast · esc · $ · bOpen · bClose · todayStr · coin 을 써요 */
(function(){
const NP = window.NP = { st: 'idle', data: null, ver: 0, key: null, salt: null, edit: false, saveTm: 0, busy: false, cal: null, timer: null, show: {} };
const TE = new TextEncoder(), TD = new TextDecoder();
const D = (d = new Date()) => todayStr(d);
const addDays = (ds, n) => { const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n); return D(d); };
const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
const md = ds => `${+ds.slice(5, 7)}/${+ds.slice(8, 10)}`;
const pwKey = () => 'nyangPadPw:' + (me && me.name);

/* 🔐 잠그기 · 풀기 (PBKDF2 → AES-GCM · 가능하면 압축) */
function b64(u8){ let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s){ const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
async function pipe(u8, T){ return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new T('deflate-raw'))).arrayBuffer()); }
async function deriveKey(pw, salt){
  const base = await crypto.subtle.importKey('raw', TE.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
/* v2: 내용은 무작위 열쇠(DEK)로 잠그고, 그 열쇠를 수첩 비밀번호로 한 번 더 잠가요 (비밀번호를 바꿔도 내용은 그대로) */
const importDek = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
async function newDek(){ NP.dekRaw = crypto.getRandomValues(new Uint8Array(32)); NP.dek = await importDek(NP.dekRaw); NP.mw = null; }
async function wrapPw(pw){   // 수첩 비밀번호로 DEK 잠그기
  NP.salt = crypto.getRandomValues(new Uint8Array(16)); NP.key = await deriveKey(pw, NP.salt);
  NP.wiv = crypto.getRandomValues(new Uint8Array(12)); NP.wpw = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: NP.wiv }, NP.key, NP.dekRaw));
}
async function wrapM(){
  if (!NP.mpub) return '-';
  if (NP.mw && NP.mwFor === NP.mpub) return NP.mw;
  try { const k = await crypto.subtle.importKey('spki', unb64(NP.mpub), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    NP.mw = b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, k, NP.dekRaw))); NP.mwFor = NP.mpub; return NP.mw; } catch(e){ return '-'; }
}
async function lockData(obj){
  let raw = TE.encode(JSON.stringify(obj)), z = 'n';
  if (window.CompressionStream){ try { raw = await pipe(raw, CompressionStream); z = 'z'; } catch(e){} }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, NP.dek, raw));
  return `v2.${z}.${b64(NP.salt)}.${b64(NP.wiv)}.${b64(NP.wpw)}.${await wrapM()}.${b64(iv)}.${b64(ct)}`;
}
async function openCt(z, iv, ct, dek){
  let raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, dek, unb64(ct)));
  if (z === 'z') raw = await pipe(raw, DecompressionStream);
  return JSON.parse(TD.decode(raw));
}
async function unlockBlob(blob, pw){
  const P = blob.split('.');
  if (P[0] === 'v1'){   // 예전 수첩: 비밀번호 열쇠로 바로 잠겨 있어요 → 열면 v2로 바꿔 저장해요
    const salt = unb64(P[2]), key = await deriveKey(pw, salt), data = await openCt(P[1], P[3], P[4], key);
    await newDek(); await wrapPw(pw); NP.migrate = true; return { data };
  }
  if (P[0] !== 'v2') throw new Error('ver');
  const salt = unb64(P[2]), key = await deriveKey(pw, salt);
  const dekRaw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(P[3]) }, key, unb64(P[4])));
  const dek = await importDek(dekRaw), data = await openCt(P[1], P[6], P[7], dek);
  Object.assign(NP, { salt, key, wiv: unb64(P[3]), wpw: unb64(P[4]), dekRaw, dek, mw: P[5] !== '-' ? P[5] : null, mwFor: P[5] !== '-' ? NP.mpub : null });
  return { data };
}

/* 🧩 위젯 18개 */
const COLORS = ['#FFF2A8', '#FFD6E2', '#D6F0FF', '#D9F5E3', '#EADFFF', '#FFE3C7'];
const MOODS = [['😄', '#7ED6A0'], ['🙂', '#BFE8A6'], ['😐', '#FFE08A'], ['😢', '#A9CBF5'], ['😡', '#F5A3A3']];
const add = (w, fields, btn = '➕') => `<div class="np-add" data-w="${w}">${fields}<button type="button" class="np-btn" data-np="add" data-w="${w}">${btn}</button></div>`;
const inp = (f, ph, type = 'text', extra = '') => `<input type="${type}" data-f="${f}" placeholder="${esc(ph)}" ${extra}>`;
const del = (w, k) => `<button type="button" class="np-x" data-np="del" data-w="${w}" data-k="${k}" title="지우기">✕</button>`;
const nothing = t => `<div class="np-empty">${t}</div>`;
function tomorrowSubjects(){
  const tt = coin && coin.tt; if (!tt) return [];
  const d = new Date(); d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd === 0 || wd === 6) return [];
  const subj = (tt.subj || {})[wd] || [], chg = ((tt.chg || {})[D(d)]) || {};
  return subj.map((x, i) => chg[i] || x).filter(Boolean);
}
const W = {
  dday: { i: '⏳', n: '디데이', sz: 's', d: '시험 · 방학 · 생일까지 며칠?',
    r(x){ const t = D(), L = (x.dday || []).map((o, k) => Object.assign({ k, left: diffDays(t, o.d) }, o)).sort((a, b) => (a.left < 0) - (b.left < 0) || Math.abs(a.left) - Math.abs(b.left));
      return (L.length ? L.slice(0, 5).map(o => `<div class="np-row"><span class="np-dd ${o.left === 0 ? 'hot' : o.left < 0 ? 'past' : ''}">${o.left === 0 ? 'D-DAY' : o.left > 0 ? 'D-' + o.left : 'D+' + (-o.left)}</span><span class="np-grow">${esc(o.n)}</span>${del('dday', o.k)}</div>`).join('') : nothing('기다리는 날을 넣어요'))
        + add('dday', inp('n', '무슨 날?', 'text', 'maxlength="20"') + inp('d', '', 'date')); },
    add(x, f){ if (!f.n || !f.d) return '이름과 날짜를 넣어요'; (x.dday = x.dday || []).push({ n: f.n, d: f.d }); } },
  todo: { i: '✅', n: '오늘 할 일', sz: 'b', d: '체크하면 줄 긋기 · 못 한 건 내일로',
    prep(x){ const t = D(), o = x.todo || (x.todo = { d: t, items: [] }); if (o.d !== t){ o.items = o.items.filter(it => !it.on).map(it => Object.assign(it, { c: 1 })); o.d = t; return true; } },
    r(x){ const it = x.todo.items, done = it.filter(o => o.on).length;
      return `<div class="np-sub">${it.length ? (done === it.length ? '🎉 다 했어요! 고양이가 칭찬해요' : `${it.length}개 중 ${done}개 완료`) : ''}</div>`
        + (it.length ? it.map((o, k) => `<div class="np-row"><button type="button" class="np-ck ${o.on ? 'on' : ''}" data-np="tog" data-w="todo" data-k="${k}">${o.on ? '✔' : ''}</button><span class="np-grow ${o.on ? 'np-done' : ''}">${o.c ? '↪ ' : ''}${esc(o.t)}</span>${del('todo', k)}</div>`).join('') : nothing('오늘 할 일을 적어요'))
        + add('todo', inp('t', '할 일', 'text', 'maxlength="40"')); },
    add(x, f){ if (!f.t) return '할 일을 적어요'; x.todo.items.push({ t: f.t, on: false }); },
    tog(x, k){ const o = x.todo.items[k]; if (o) o.on = !o.on; },
    del(x, k){ x.todo.items.splice(k, 1); } },
  memo: { i: '📝', n: '포스트잇 메모', sz: 'b', d: '색깔 메모지에 적어 붙여요',
    r(x){ const L = x.memo || []; return (L.length ? `<div class="np-notes">${L.map((o, k) => `<div class="np-note" style="background:${COLORS[o.c % COLORS.length]}">${esc(o.t)}${del('memo', k)}</div>`).join('')}</div>` : nothing('잊으면 안 되는 걸 붙여 둬요'))
        + add('memo', inp('t', '메모', 'text', 'maxlength="80"')); },
    add(x, f){ if (!f.t) return '메모를 적어요'; const L = x.memo = x.memo || []; if (L.length >= 40) return '메모는 40장까지'; L.unshift({ t: f.t, c: Math.floor(Math.random() * COLORS.length) }); } },
  cal: { i: '📅', n: '내 일정 달력', sz: 'b', d: '수행평가 · 학원 시험 · 약속',
    r(x){ const ev = x.cal = x.cal || {}, t = D(), m = NP.cal || t.slice(0, 7), first = new Date(m + '-01T00:00:00'), n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      let cells = '<span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>' + '<i></i>'.repeat(first.getDay());
      for (let d = 1; d <= n; d++){ const ds = `${m}-${String(d).padStart(2, '0')}`; cells += `<button type="button" class="np-day ${ds === t ? 'today' : ''} ${ev[ds] ? 'ev' : ''}" data-np="calday" data-w="cal" data-k="${ds}" title="${esc(ev[ds] || '')}">${d}</button>`; }
      const up = Object.keys(ev).filter(k => k >= t).sort().slice(0, 4);
      return `<div class="np-calh"><button type="button" class="np-btn" data-np="calmv" data-w="cal" data-k="-1">◀</button><b>${+m.slice(0, 4)}년 ${+m.slice(5)}월</b><button type="button" class="np-btn" data-np="calmv" data-w="cal" data-k="1">▶</button></div><div class="np-cal">${cells}</div>
        <div class="np-sub">날짜를 누르면 일정을 적어요</div>${up.map(k => `<div class="np-row"><span class="np-dd">${md(k)}</span><span class="np-grow">${esc(ev[k])}</span></div>`).join('')}`; } },
  mood: { i: '🌈', n: '오늘 기분', sz: 'b', d: '하루 한 번 · 한 달이 색깔 달력',
    r(x){ const M = x.mood = x.mood || {}, t = D(), o = M[t] || {}, m = t.slice(0, 7), n = new Date(+m.slice(0, 4), +m.slice(5), 0).getDate();
      let cells = ''; for (let d = 1; d <= n; d++){ const v = M[`${m}-${String(d).padStart(2, '0')}`]; cells += `<span class="np-mc" style="background:${v && v.m != null ? MOODS[v.m][1] : '#EFE6D8'}" title="${d}일${v && v.t ? ' · ' + esc(v.t) : ''}"></span>`; }
      return `<div class="np-moods">${MOODS.map(([e], k) => `<button type="button" class="${o.m === k ? 'on' : ''}" data-np="mood" data-w="mood" data-k="${k}">${e}</button>`).join('')}</div>
        <input type="text" class="np-line" data-npc="moodt" maxlength="60" placeholder="오늘 한 줄" value="${esc(o.t || '')}">
        <div class="np-sub">${+m.slice(5)}월의 기분</div><div class="np-mgrid">${cells}</div>`; } },
  habit: { i: '🌱', n: '습관 잔디', sz: 'b', d: '매일 하는 습관 · 연속 🔥',
    r(x){ const h = x.habit = x.habit || { list: [], log: {} }, t = D(), days = [...Array(7)].map((_, i) => addDays(t, i - 6));
      const streak = k => { let n = 0, d = t; if (!(h.log[d] || []).includes(k)) d = addDays(d, -1); while ((h.log[d] || []).includes(k)){ n++; d = addDays(d, -1); } return n; };
      return (h.list.length ? h.list.map((nm, k) => `<div class="np-row"><span class="np-grow">${esc(nm)}${streak(k) >= 2 ? ` <small>🔥${streak(k)}</small>` : ''}</span>${days.map(d => `<button type="button" class="np-cell ${(h.log[d] || []).includes(k) ? 'on' : ''} ${d === t ? 'today' : ''}" data-np="habit" data-w="habit" data-k="${k}" data-d="${d}" title="${md(d)}"></button>`).join('')}${del('habit', k)}</div>`).join('') : nothing('물 마시기 · 책 10분 · 스트레칭…'))
        + add('habit', inp('n', '새 습관', 'text', 'maxlength="16"')); },
    add(x, f){ if (!f.n) return '습관 이름을 적어요'; if (x.habit.list.length >= 8) return '습관은 8개까지'; x.habit.list.push(f.n); },
    del(x, k){ const h = x.habit; h.list.splice(k, 1); Object.keys(h.log).forEach(d => { h.log[d] = h.log[d].filter(v => v !== k).map(v => v > k ? v - 1 : v); }); } },
  goal: { i: '🎯', n: '이번 달 목표', sz: 'b', d: '숫자 목표 · 진행 막대',
    r(x){ const L = x.goal = x.goal || [];
      return (L.length ? L.map((o, k) => { const p = Math.min(100, Math.round(o.cur / o.tg * 100)); return `<div class="np-goal"><div class="np-row"><span class="np-grow">${esc(o.n)} ${p >= 100 ? '🏅' : ''}</span><button type="button" class="np-btn" data-np="gm" data-w="goal" data-k="${k}">−</button><b>${o.cur}/${o.tg}</b><button type="button" class="np-btn" data-np="gp" data-w="goal" data-k="${k}">＋</button>${del('goal', k)}</div><div class="np-bar"><b style="width:${p}%"></b></div></div>`; }).join('') : nothing('책 3권 · 줄넘기 500개…'))
        + add('goal', inp('n', '목표', 'text', 'maxlength="20"') + inp('tg', '몇?', 'number', 'min="1" max="9999" style="width:70px;"')); },
    add(x, f){ const tg = Math.round(+f.tg); if (!f.n || !(tg > 0)) return '목표와 숫자를 넣어요'; x.goal.push({ n: f.n, tg, cur: 0 }); } },
  timer: { i: '⏱️', n: '집중 타이머', sz: 's', d: '고양이랑 같이 공부해요',
    r(x){ const T = NP.timer, tot = ((x.timer = x.timer || { log: {} }).log[D()] || 0);
      return T ? `<div class="np-big" id="npTime">${fmtT(T)}</div><div style="text-align:center;"><button type="button" class="np-btn" data-np="tstop" data-w="timer">⏹ 그만</button></div><div class="np-sub" style="text-align:center;">🐱 같이 집중 중…</div>`
        : `<div class="np-big">⏱️</div><div class="np-tbtn">${[10, 25, 50].map(m => `<button type="button" class="np-btn" data-np="tgo" data-w="timer" data-k="${m}">${m}분</button>`).join('')}</div><div class="np-sub" style="text-align:center;">오늘 ${tot}분 집중</div>`; } },
  thanks: { i: '🙏', n: '감사 3줄', sz: 'b', d: '오늘 고마운 일 세 가지',
    r(x){ const G = x.thanks = x.thanks || {}, a = G[D()] || ['', '', ''], past = Object.keys(G).filter(d => d < D() && G[d].some(Boolean));
      const pick = NP.show.thanks;
      return [0, 1, 2].map(i => `<input type="text" class="np-line" data-npc="thanks" data-k="${i}" maxlength="50" placeholder="${i + 1}." value="${esc(a[i] || '')}">`).join('')
        + `<div class="np-row" style="margin-top:6px;"><span class="np-sub np-grow">지금까지 ${past.length + (a.some(Boolean) ? 1 : 0)}일</span>${past.length ? '<button type="button" class="np-btn" data-np="thx" data-w="thanks">🎲 지난 감사 보기</button>' : ''}</div>`
        + (pick && G[pick] ? `<div class="np-quote">${md(pick)} · ${G[pick].filter(Boolean).map(esc).join(' · ')}</div>` : ''); } },
  prep: { i: '🎒', n: '내일 준비물', sz: 'b', d: '내일 시간표 보고 챙기기',
    prep(x){ const tm = addDays(D(), 1), o = x.prep || (x.prep = { d: tm, items: [] }); if (o.d !== tm){ o.d = tm; o.items = []; return true; } },
    r(x){ const s = tomorrowSubjects();
      return `<div class="np-sub">${s.length ? '내일: ' + s.map(esc).join(' · ') : '내일 시간표가 아직 없어요'}</div>`
        + (x.prep.items.length ? x.prep.items.map((o, k) => `<div class="np-row"><button type="button" class="np-ck ${o.on ? 'on' : ''}" data-np="tog" data-w="prep" data-k="${k}">${o.on ? '✔' : ''}</button><span class="np-grow ${o.on ? 'np-done' : ''}">${esc(o.t)}</span>${del('prep', k)}</div>`).join('') : nothing('체육복 · 리코더 · 수행평가 자료…'))
        + add('prep', inp('t', '챙길 것', 'text', 'maxlength="30"')); },
    add(x, f){ if (!f.t) return '챙길 것을 적어요'; x.prep.items.push({ t: f.t, on: false }); },
    tog(x, k){ const o = x.prep.items[k]; if (o) o.on = !o.on; },
    del(x, k){ x.prep.items.splice(k, 1); } },
  future: { i: '💌', n: '미래의 나에게', sz: 'b', d: '타임캡슐 편지 · 그날까지 못 열어요',
    r(x){ const L = x.future = x.future || [], t = D();
      return (L.length ? L.map((o, k) => o.open > t ? `<div class="np-row np-cap"><span class="np-grow">🔒 ${o.open.replace(/-/g, '.')}에 열려요 <small>(D-${diffDays(t, o.open)} · ${md(o.made)}에 씀)</small></span></div>`
          : `<div class="np-quote">💌 ${md(o.made)}의 내가 보낸 편지<br>${esc(o.t)}${del('future', k)}</div>`).join('') : nothing('몇 달 뒤의 나에게 편지를 써요'))
        + add('future', `<textarea data-f="t" rows="2" maxlength="400" placeholder="미래의 나에게…"></textarea>` + inp('d', '', 'date'), '📮'); },
    add(x, f){ if (!f.t || !f.d) return '편지와 열 날짜를 넣어요'; if (f.d <= D()) return '열 날짜는 내일 이후로'; x.future.push({ t: f.t, open: f.d, made: D() }); toast('📮 타임캡슐에 넣었어요. 그날까지 못 열어요!'); } },
  books: { i: '📚', n: '내 책장', sz: 'b', d: '읽은 책 · 별점 · 한 줄',
    r(x){ const L = x.books = x.books || [];
      return (L.length ? `<div class="np-shelf">${L.slice(0, 24).map((o, k) => `<span style="background:${COLORS[k % COLORS.length]};height:${24 + (o.n.length * 3) % 18}px" title="${esc(o.n)}"></span>`).join('')}</div>` + L.slice(0, 5).map((o, k) => `<div class="np-row"><span class="np-grow">${esc(o.n)} <small>${'★'.repeat(o.s)}${o.m ? ' · ' + esc(o.m) : ''}</small></span>${del('books', k)}</div>`).join('') + `<div class="np-sub">모두 ${L.length}권</div>` : nothing('다 읽은 책을 꽂아요'))
        + add('books', inp('n', '책 제목', 'text', 'maxlength="30"') + `<select data-f="s">${[5, 4, 3, 2, 1].map(v => `<option value="${v}">${'★'.repeat(v)}</option>`).join('')}</select>` + inp('m', '한 줄 느낌', 'text', 'maxlength="40"')); },
    add(x, f){ if (!f.n) return '책 제목을 적어요'; x.books.unshift({ n: f.n, s: +f.s || 5, m: f.m || '' }); } },
  diary: { i: '🔐', n: '비밀 일기', sz: 'b', d: '평소엔 가려져 있는 일기',
    r(x){ const G = x.diary = x.diary || {}, t = D(), past = Object.keys(G).filter(d => d !== t && G[d]).sort().reverse();
      if (!NP.show.diary) return `<button type="button" class="np-veil" data-np="veil" data-w="diary">🙈 가려 뒀어요 · 눌러서 열기<br><small>지금까지 ${past.length + (G[t] ? 1 : 0)}일 썼어요</small></button>`;
      const v = NP.show.diaryDay;
      return `<textarea class="np-line" data-npc="diary" rows="4" maxlength="1000" placeholder="오늘 있었던 일, 속마음…">${esc(G[t] || '')}</textarea>
        <div class="np-chips">${past.slice(0, 10).map(d => `<button type="button" class="${v === d ? 'on' : ''}" data-np="dday2" data-w="diary" data-k="${d}">${md(d)}</button>`).join('')}</div>
        ${v && G[v] ? `<div class="np-quote">${md(v)}<br>${esc(G[v])}</div>` : ''}<div style="text-align:right;"><button type="button" class="np-btn" data-np="veil" data-w="diary">🙈 다시 가리기</button></div>`; } },
  money: { i: '💰', n: '용돈 기록', sz: 'b', d: '들어온 돈 · 쓴 돈 · 남은 돈',
    r(x){ const L = x.money = x.money || [], bal = L.reduce((s, o) => s + o.a, 0), m = D().slice(0, 7), out = -L.filter(o => o.d.startsWith(m) && o.a < 0).reduce((s, o) => s + o.a, 0);
      return `<div class="np-row"><span class="np-grow">남은 돈 <b class="np-won">${bal.toLocaleString()}원</b></span><small>이번 달 쓴 돈 ${out.toLocaleString()}원</small></div>`
        + L.slice(0, 5).map((o, k) => `<div class="np-row"><span class="np-dd">${md(o.d)}</span><span class="np-grow">${esc(o.m || '')}</span><b style="color:${o.a < 0 ? '#D6456E' : '#1F8A5F'}">${o.a > 0 ? '+' : ''}${o.a.toLocaleString()}</b>${del('money', k)}</div>`).join('')
        + `<div class="np-add" data-w="money">${inp('a', '얼마?', 'number', 'min="1" style="width:90px;"')}${inp('m', '어디에?', 'text', 'maxlength="20"')}<button type="button" class="np-btn" data-np="add" data-w="money" data-k="in">➕ 들어옴</button><button type="button" class="np-btn" data-np="add" data-w="money" data-k="out">➖ 씀</button></div>`; },
    add(x, f, k){ const a = Math.round(+f.a); if (!(a > 0)) return '금액을 넣어요'; x.money.unshift({ d: D(), a: k === 'out' ? -a : a, m: f.m || '' }); if (x.money.length > 300) x.money.length = 300; } },
  sleep: { i: '🌙', n: '수면 기록', sz: 'b', d: '잔 시각 · 일어난 시각 · 몇 시간?',
    r(x){ const G = x.sleep = x.sleep || {}, t = D(), o = G[t] || {}, hrs = r => { if (!r || !r.b || !r.w) return 0; let a = (+r.w.slice(0, 2) * 60 + +r.w.slice(3)) - (+r.b.slice(0, 2) * 60 + +r.b.slice(3)); if (a <= 0) a += 1440; return Math.round(a / 6) / 10; };
      const days = [...Array(7)].map((_, i) => addDays(t, i - 6)), hs = days.map(d => hrs(G[d])), got = hs.filter(Boolean), avg = got.length ? Math.round(got.reduce((s, v) => s + v, 0) / got.length * 10) / 10 : 0;
      return `<div class="np-row">어젯밤 잔 시각 <input type="time" data-npc="sleepb" value="${o.b || ''}"> 일어난 시각 <input type="time" data-npc="sleepw" value="${o.w || ''}"></div>
        <div class="np-sleep">${days.map((d, i) => `<div><span style="height:${Math.min(100, hs[i] / 11 * 100)}%;background:${hs[i] >= 8 ? '#7ED6A0' : hs[i] >= 7 ? '#FFE08A' : '#F5A3A3'}"></span><small>${hs[i] || ''}</small><small>${md(d)}</small></div>`).join('')}</div>
        <div class="np-sub">${got.length ? `일주일 평균 ${avg}시간 ${avg >= 8 ? '😴 아주 좋아요' : avg >= 7 ? '🙂 괜찮아요' : '🥱 조금 더 자요'}` : '중학생은 8~10시간이 좋아요'}</div>`; } },
  music: { i: '🎵', n: '내 플레이리스트', sz: 'b', d: '좋아하는 노래 메모',
    r(x){ const L = x.music = x.music || [];
      return (L.length ? L.map((o, k) => `<div class="np-row"><span class="np-grow">🎵 ${esc(o.n)}${o.a ? ` <small>· ${esc(o.a)}</small>` : ''}</span>${del('music', k)}</div>`).join('') : nothing('좋아하는 노래를 모아요'))
        + add('music', inp('n', '노래 제목', 'text', 'maxlength="30"') + inp('a', '가수', 'text', 'maxlength="20"')); },
    add(x, f){ if (!f.n) return '노래 제목을 적어요'; if (x.music.length >= 100) return '100곡까지'; x.music.unshift({ n: f.n, a: f.a || '' }); } },
  wrong: { i: '❌', n: '틀린 문제 노트', sz: 'b', d: '틀린 문제 · 정답 · 다시 풀었나?',
    r(x){ const L = x.wrong = x.wrong || [], left = L.filter(o => !o.on).length;
      return `<div class="np-sub">${L.length ? `다시 풀 문제 ${left}개 · 해결 ${L.length - left}개` : ''}</div>`
        + (L.length ? L.slice(0, 8).map((o, k) => `<div class="np-wq ${o.on ? 'np-done' : ''}"><div class="np-row"><span class="np-tag">${esc(o.s || '기타')}</span><span class="np-grow">${esc(o.q)}</span>${del('wrong', k)}</div>
          <div class="np-row"><button type="button" class="np-btn" data-np="ans" data-w="wrong" data-k="${k}">${NP.show['w' + k] ? '🙈 정답 가리기' : '👀 정답 보기'}</button><button type="button" class="np-btn" data-np="tog" data-w="wrong" data-k="${k}">${o.on ? '↩ 다시' : '✔ 다시 풀었어요'}</button></div>${NP.show['w' + k] ? `<div class="np-quote">💡 ${esc(o.a || '(정답 없음)')}</div>` : ''}</div>`).join('') : nothing('틀린 문제를 적어 두고 다시 풀어요'))
        + add('wrong', inp('s', '과목', 'text', 'maxlength="6" style="width:64px;"') + inp('q', '문제', 'text', 'maxlength="80"') + inp('a', '정답 · 풀이', 'text', 'maxlength="120"')); },
    add(x, f){ if (!f.q) return '문제를 적어요'; x.wrong.unshift({ s: f.s || '', q: f.q, a: f.a || '', on: false }); },
    tog(x, k){ const o = x.wrong[k]; if (o) o.on = !o.on; } },
  proud: { i: '🏆', n: '잘한 일 모음', sz: 's', d: '자존감 통 · 힘들 때 꺼내 봐요',
    r(x){ const L = x.proud = x.proud || [], p = NP.show.proud;
      return `<div class="np-big">🏆 <small>${L.length}개</small></div>${L.length ? '<div style="text-align:center;"><button type="button" class="np-btn" data-np="prd" data-w="proud">🎁 하나 꺼내기</button></div>' : ''}
        ${p != null && L[p] ? `<div class="np-quote">${md(L[p].d)} · ${esc(L[p].t)}</div>` : ''}` + add('proud', inp('t', '오늘 잘한 일', 'text', 'maxlength="50"')); },
    add(x, f){ if (!f.t) return '잘한 일을 적어요'; x.proud.push({ d: D(), t: f.t }); NP.show.proud = x.proud.length - 1; toast('🏆 잘했어! 통에 넣었어요'); } }
};
const ORDER = ['dday', 'todo', 'memo', 'cal', 'mood', 'habit', 'goal', 'timer', 'thanks', 'prep', 'future', 'books', 'diary', 'money', 'sleep', 'music', 'wrong', 'proud'];
function fmtT(T){ const s = Math.max(0, Math.ceil((T.end - Date.now()) / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

/* 🖼️ 그리기 */
function box(){ return $('padBox'); }
function render(){
  const b = box(); if (!b) return;
  if (!me){ b.innerHTML = '<div class="box" style="text-align:center;"><div class="box-head">📔 내 수첩</div><p>🔑 로그인하면 내 수첩을 쓸 수 있어요</p><button type="button" class="btn btn-y" data-guest-login>🔑 로그인</button></div>'; return; }
  if (!window.crypto || !crypto.subtle){ b.innerHTML = '<div class="box"><div class="box-head">📔 내 수첩</div><div class="empty">이 브라우저에서는 수첩을 잠글 수 없어요. 다른 브라우저(크롬 · 사파리)로 열어 주세요.</div></div>'; return; }
  if (NP.st === 'loading' || NP.st === 'idle'){ b.innerHTML = '<div class="box"><div class="box-head">📔 내 수첩</div><div class="empty">🔐 여는 중…</div></div>'; return; }
  if (NP.st === 'error'){ b.innerHTML = '<div class="box"><div class="box-head">📔 내 수첩</div><div class="empty">연결이 안 돼요. 잠시 뒤 다시 눌러 주세요.</div><button type="button" class="btn btn-y" data-np="retry">🔄 다시</button></div>'; return; }
  if (NP.st === 'setup' || NP.st === 'locked'){
    const S = NP.st === 'setup';
    b.innerHTML = `<div class="box np-lock"><div class="box-head">📔 내 수첩</div>
      <div class="np-lockic">🔐</div>
      <p>${S ? '<b>내 수첩</b>이에요. 친구들은 못 봐요.<br>수첩을 잠글 <b>수첩 비밀번호</b>를 만들어요.' : '수첩 비밀번호를 넣어요'}</p>
      <input type="password" id="npPw" maxlength="30" placeholder="${S ? '수첩 비밀번호 (4자 이상)' : '수첩 비밀번호'}" autocomplete="off">
      ${S ? '<input type="password" id="npPw2" maxlength="30" placeholder="한 번 더" autocomplete="off">' : ''}
      <label class="np-rem"><input type="checkbox" id="npRem" checked> 이 기기에서 기억하기 <small>(학교 TV · 친구 폰에서는 끄기)</small></label>
      <div class="np-err" id="npErr"></div>
      <button type="button" class="btn btn-y" data-np="${S ? 'create' : 'unlock'}" style="width:100%;">${S ? '📔 수첩 만들기' : '🔓 열기'}</button>
      <div class="hint" style="margin-top:10px;">⚠️ 수첩 비밀번호를 잊어버리면 수첩을 처음부터 다시 써야 해요. 로그인 비밀번호와 다르게 만들어요.</div>
      ${S ? '' : '<div style="text-align:center;margin-top:8px;"><button type="button" class="np-link" data-np="forgot">비밀번호를 잊었어요 (수첩 새로 시작)</button></div>'}</div>`;
    return;
  }
  const x = NP.data, ws = x.w.filter(id => W[id]);
  const html = ws.map((id, k) => { const w = W[id];
    return `<div class="np-w ${w.sz === 's' ? 's' : ''}" data-wid="${id}"><div class="np-wh"><span>${w.i} ${w.n}</span>${NP.edit ? `<span class="np-ed"><button type="button" data-np="up" data-k="${k}" title="위로">▲</button><button type="button" data-np="down" data-k="${k}" title="아래로">▼</button><button type="button" data-np="rm" data-k="${k}" title="빼기">🗑</button></span>` : ''}</div><div class="np-wb">${NP.edit ? `<div class="np-sub">${w.d}</div>` : w.r(x)}</div></div>`; }).join('');
  b.innerHTML = `<div class="np-top"><b>📔 내 수첩</b><span class="np-sec">🔐 잠금</span><span style="flex:1"></span>
      <button type="button" class="np-btn" data-np="edit">${NP.edit ? '✔ 다 했어요' : '✏️ 편집'}</button><button type="button" class="np-btn" data-np="pwchg" title="수첩 비밀번호 바꾸기">🔑</button><button type="button" class="np-btn" data-np="lock" title="잠그기">🔒</button></div>
    <div class="np-grid">${html || '<div class="np-empty" style="grid-column:1/-1;text-align:center;">위젯을 추가해 봐요 👇</div>'}</div>
    <button type="button" class="btn btn-y np-plus" data-np="addw">➕ 위젯 추가</button>
    ${NP.edit ? '<div style="text-align:center;margin-top:14px;"><button type="button" class="np-link" data-np="wipe">🗑 내 수첩 초기화 (모두 지우고 새로 시작)</button></div>' : ''}
    <div class="np-saved" id="npSaved">${NP.saveTm ? '저장 중…' : ''}</div>`;
}
function openAddSheet(){
  const x = NP.data, rest = ORDER.filter(id => !x.w.includes(id));
  bOpen('msOv', `<h2>➕ 위젯 추가</h2>${rest.length ? `<div class="np-pick">${rest.map(id => `<button type="button" data-np="addone" data-k="${id}"><span>${W[id].i}</span><b>${W[id].n}</b><small>${W[id].d}</small></button>`).join('')}</div>` : '<div class="empty" style="text-align:center;">위젯을 다 넣었어요! 🎉</div>'}`);
}

/* 💾 저장 · 불러오기 */
function changed(){ clearTimeout(NP.saveTm); NP.saveTm = setTimeout(save, 1500); const s = $('npSaved'); if (s) s.textContent = '저장 중…'; }
async function save(){
  clearTimeout(NP.saveTm); NP.saveTm = 0; if (NP.st !== 'open' || !NP.dek) return;
  crisisScan();
  if (NP.busy){ NP.saveTm = setTimeout(save, 800); return; }
  NP.busy = true;
  try {
    const blob = await lockData(NP.data);
    if (blob.length > 440000){ toast('📔 수첩이 꽉 찼어요. 오래된 기록을 조금 지워 주세요'); return; }
    const j = await studentCall('padSet', { blob, base: NP.ver });
    if (j && j.error === 'conflict'){
      try { const r = await unlockBlobKey(j.blob); NP.data = norm(r); NP.ver = j.ver; toast('📔 다른 기기에서 바뀐 수첩을 불러왔어요. 방금 고친 건 다시 해 주세요'); render(); } catch(e){ NP.st = 'locked'; NP.key = null; render(); }
      return;
    }
    if (!j || j.ok === false){ toast('📔 저장이 안 됐어요. 잠시 뒤 다시 저장할게요'); NP.saveTm = setTimeout(save, 5000); return; }
    NP.ver = j.ver; const s = $('npSaved'); if (s) s.textContent = '✔ 저장했어요';
  } catch(e){ toast('📔 저장이 안 됐어요'); }
  finally { NP.busy = false; }
}
async function unlockBlobKey(blob){
  const P = blob.split('.'); if (P[0] !== 'v2') throw new Error('ver');
  return openCt(P[1], P[6], P[7], NP.dek);
}
function norm(x){ x = x && typeof x === 'object' ? x : {}; if (!Array.isArray(x.w)) x.w = ['dday', 'todo', 'memo']; let ch = false; Object.values(W).forEach(w => { if (w.prep && w.prep(x)) ch = true; }); if (ch) setTimeout(changed, 0); return x; }
NP.open = async function(){
  if (!me){ render(); return; }
  if (NP.owner !== me.name){ Object.assign(NP, { st: 'idle', data: null, key: null, salt: null, ver: 0, owner: me.name, show: {}, edit: false }); }
  if (NP.st === 'open'){ norm(NP.data); render(); return; }
  NP.st = 'loading'; render();
  let j; try { j = await studentCall('padGet'); } catch(e){ j = null; }
  if (!j || j.ok === false){ NP.st = 'error'; render(); return; }
  NP.ver = j.ver || 0; NP.blob = j.blob || ''; NP.mpub = j.mpub || '';
  if (!NP.blob){ NP.st = 'setup'; render(); return; }
  let pw = ''; try { pw = localStorage.getItem(pwKey()) || ''; } catch(e){}
  if (pw){ try { await unlockWith(pw, false); return; } catch(e){ try { localStorage.removeItem(pwKey()); } catch(e2){} } }
  NP.st = 'locked'; render();
};
async function unlockWith(pw, remember){
  const r = await unlockBlob(NP.blob, pw);
  NP.data = norm(r.data); NP.st = 'open';
  if (remember){ try { localStorage.setItem(pwKey(), pw); } catch(e){} }
  if (NP.migrate || (NP.mpub && !NP.mw)){ NP.migrate = false; changed(); }   // 새 방식으로 다시 저장
  render();
}
function lockNow(){ save(); try { localStorage.removeItem(pwKey()); } catch(e){} NP.key = null; NP.dek = null; NP.dekRaw = null; NP.data = null; NP.st = 'idle'; if (NP.timer){ clearInterval(NP.timer.iv); NP.timer = null; } NP.open(); toast('🔒 수첩을 잠갔어요'); }

/* 👆 누르기 */
function formOf(el){ const f = {}; el.querySelectorAll('[data-f]').forEach(i => { f[i.dataset.f] = i.value.trim(); }); return f; }
async function onClick(e){
  const t = e.target.closest('[data-np]'); if (!t) return;
  const a = t.dataset.np, wid = t.dataset.w, k = t.dataset.k, x = NP.data;
  if (/^m[A-Z]/.test(a)){ mClick(a, k, t); return; }
  if (a === 'careSelf'){ try { await studentCall('padAlert', { self: true, snip: '' }); } catch(e2){} bClose('msOv'); crisisCare(); return; }
  if (!box() || !(box().contains(t) || $('msOv').contains(t))) return;
  if (a === 'retry'){ NP.st = 'idle'; NP.open(); return; }
  if (a === 'create' || a === 'unlock'){
    const pw = $('npPw').value, rem = $('npRem').checked, err = $('npErr');
    if (a === 'create'){
      if (pw.length < 4){ err.textContent = '4자 이상으로 만들어요'; return; }
      if (pw !== $('npPw2').value){ err.textContent = '두 번 넣은 비밀번호가 달라요'; return; }
      t.disabled = true; await newDek(); await wrapPw(pw);
      NP.data = norm({ w: ['dday', 'todo', 'memo', 'mood'] }); NP.st = 'open'; if (rem){ try { localStorage.setItem(pwKey(), pw); } catch(e2){} }
      render(); await save(); toast('📔 내 수첩을 만들었어요!'); return;
    }
    t.disabled = true; err.textContent = '🔐 여는 중…';
    try { await unlockWith(pw, rem); } catch(e2){ err.textContent = '❌ 비밀번호가 달라요'; t.disabled = false; }
    return;
  }
  if (a === 'forgot'){
    if (!confirm('수첩을 새로 시작할까요?\n지금까지 쓴 수첩은 모두 지워지고 되돌릴 수 없어요.')) return;
    if (prompt('정말 지우려면 "새로 시작"이라고 적어요') !== '새로 시작') return;
    const j = await studentCall('padReset'); if (j && j.ok){ NP.blob = ''; NP.ver = j.ver; NP.st = 'setup'; render(); toast('📔 새 수첩을 만들어요'); }
    return;
  }
  if (NP.st !== 'open') return;
  if (a === 'edit'){ NP.edit = !NP.edit; render(); return; }
  if (a === 'wipe'){
    if (!confirm('내 수첩을 초기화할까요?\n위젯과 쓴 내용이 모두 지워지고 되돌릴 수 없어요.')) return;
    if ((prompt('정말 지우려면 "초기화"라고 적어요') || '').trim() !== '초기화') return;
    clearTimeout(NP.saveTm); NP.saveTm = 0;
    const j = await studentCall('padReset');
    if (!j || !j.ok){ toast('초기화하지 못했어요. 다시 해 봐요'); return; }
    try { localStorage.removeItem(pwKey()); } catch(e2){}
    Object.assign(NP, { st: 'setup', data: null, key: null, dek: null, dekRaw: null, blob: '', ver: j.ver, edit: false, show: {} });
    render(); toast('🗑 수첩을 초기화했어요. 새 수첩을 만들어요'); return;
  }
  if (a === 'lock'){ lockNow(); return; }
  if (a === 'pwchg'){ bOpen('msOv', `<h2>🔑 수첩 비밀번호 바꾸기</h2><p class="hint">내용은 그대로예요. 새 비밀번호로만 열려요.</p>
      <input type="password" id="npOld" class="pc-in" maxlength="30" placeholder="지금 수첩 비밀번호" autocomplete="off"><input type="password" id="npN1" class="pc-in" maxlength="30" placeholder="새 수첩 비밀번호 (4자 이상)" autocomplete="off"><input type="password" id="npN2" class="pc-in" maxlength="30" placeholder="한 번 더" autocomplete="off">
      <div class="np-err" id="npPcErr"></div><button type="button" class="btn btn-y" data-np="pwchgGo" style="width:100%;">🔑 바꾸기</button>`); return; }
  if (a === 'pwchgGo'){
    const o = $('npOld').value, n1 = $('npN1').value, err = $('npPcErr');
    try { const k = await deriveKey(o, NP.salt); await crypto.subtle.decrypt({ name: 'AES-GCM', iv: NP.wiv }, k, NP.wpw); } catch(e2){ err.textContent = '지금 비밀번호가 달라요'; return; }
    if (n1.length < 4){ err.textContent = '4자 이상으로 만들어요'; return; }
    if (n1 !== $('npN2').value){ err.textContent = '새 비밀번호 두 개가 달라요'; return; }
    await wrapPw(n1); try { if (localStorage.getItem(pwKey())) localStorage.setItem(pwKey(), n1); } catch(e2){}
    await save(); bClose('msOv'); toast('🔑 수첩 비밀번호를 바꿨어요'); return;
  }
  if (a === 'addw'){ openAddSheet(); return; }
  if (a === 'addone'){ if (!x.w.includes(k)){ x.w.push(k); norm(x); changed(); } bClose('msOv'); render(); setTimeout(() => { const el = document.querySelector(`[data-wid="${k}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); return; }
  if (a === 'up' || a === 'down'){ const i = +k, j2 = a === 'up' ? i - 1 : i + 1; if (j2 < 0 || j2 >= x.w.length) return; [x.w[i], x.w[j2]] = [x.w[j2], x.w[i]]; changed(); render(); return; }
  if (a === 'rm'){ const id = x.w[+k]; if (!confirm(`${W[id].i} ${W[id].n} 위젯을 뺄까요?\n(쓴 내용은 남아 있어서 다시 넣으면 그대로 보여요)`)) return; x.w.splice(+k, 1); changed(); render(); return; }
  const w = W[wid]; if (!w) return;
  if (a === 'add'){ const f = formOf(t.closest('.np-add')), msg = w.add(x, f, k); if (msg){ toast(msg); return; } changed(); render(); return; }
  if (a === 'del'){ if (!confirm('지울까요?')) return; if (w.del) w.del(x, +k); else { const arr = Array.isArray(x[wid]) ? x[wid] : null; if (arr) arr.splice(+k, 1); } changed(); render(); return; }
  if (a === 'tog'){ w.tog(x, +k); changed(); render(); return; }
  if (a === 'calmv'){ const m = NP.cal || D().slice(0, 7), d = new Date(m + '-01T00:00:00'); d.setMonth(d.getMonth() + +k); NP.cal = D(d).slice(0, 7); render(); return; }
  if (a === 'calday'){ const v = prompt(`${md(k)} 일정 (비우면 지워져요)`, x.cal[k] || ''); if (v === null) return; if (v.trim()) x.cal[k] = v.trim().slice(0, 40); else delete x.cal[k]; changed(); render(); return; }
  if (a === 'mood'){ const t0 = D(); x.mood[t0] = Object.assign(x.mood[t0] || {}, { m: +k }); changed(); render(); return; }
  if (a === 'habit'){ const L = x.habit.log[t.dataset.d] = x.habit.log[t.dataset.d] || [], i = L.indexOf(+k); if (i >= 0) L.splice(i, 1); else L.push(+k); changed(); render(); return; }
  if (a === 'gp' || a === 'gm'){ const o = x.goal[+k]; o.cur = Math.max(0, o.cur + (a === 'gp' ? 1 : -1)); if (a === 'gp' && o.cur === o.tg) toast('🏅 목표 달성! 대단해요'); changed(); render(); return; }
  if (a === 'tgo'){ const m = +k; NP.timer = { min: m, start: Date.now(), end: Date.now() + m * 60000 }; NP.timer.iv = setInterval(tick, 1000); render(); return; }
  if (a === 'tstop'){ stopTimer(false); return; }
  if (a === 'thx'){ const G = x.thanks, past = Object.keys(G).filter(d => d < D() && G[d].some(Boolean)); NP.show.thanks = past[Math.floor(Math.random() * past.length)]; render(); return; }
  if (a === 'veil'){ NP.show.diary = !NP.show.diary; NP.show.diaryDay = null; render(); return; }
  if (a === 'dday2'){ NP.show.diaryDay = NP.show.diaryDay === k ? null : k; render(); return; }
  if (a === 'ans'){ NP.show['w' + k] = !NP.show['w' + k]; render(); return; }
  if (a === 'prd'){ const L = x.proud; let p; do { p = Math.floor(Math.random() * L.length); } while (L.length > 1 && p === NP.show.proud); NP.show.proud = p; render(); return; }
}
function tick(){ const T = NP.timer; if (!T) return; const el = $('npTime'); if (el) el.textContent = fmtT(T); if (Date.now() >= T.end) stopTimer(true); }
function stopTimer(done){
  const T = NP.timer; if (!T) return; clearInterval(T.iv); NP.timer = null;
  const mins = done ? T.min : Math.floor((Date.now() - T.start) / 60000);
  if (mins > 0 && NP.data){ const L = NP.data.timer = NP.data.timer || { log: {} }; L.log[D()] = (L.log[D()] || 0) + mins; changed(); }
  toast(done ? `⏱️ ${T.min}분 집중 끝! 고양이가 박수 쳐요 👏` : mins > 0 ? `⏱️ ${mins}분 집중했어요` : '⏱️ 멈췄어요');
  try { if (done && window.NySnd && NySnd.play) NySnd.play('ding'); } catch(e){}
  render();
}
function onInput(e){
  const t = e.target; if (!t.dataset || !t.dataset.npc || NP.st !== 'open') return;
  const x = NP.data, d = D(), c = t.dataset.npc;
  if (c === 'moodt'){ x.mood[d] = Object.assign(x.mood[d] || {}, { t: t.value.slice(0, 60) }); }
  else if (c === 'thanks'){ const a = x.thanks[d] = x.thanks[d] || ['', '', '']; a[+t.dataset.k] = t.value.slice(0, 50); if (!a.some(Boolean)) delete x.thanks[d]; }
  else if (c === 'diary'){ if (t.value.trim()) x.diary[d] = t.value.slice(0, 1000); else delete x.diary[d]; }
  else if (c === 'sleepb' || c === 'sleepw'){ const o = x.sleep[d] = x.sleep[d] || {}; o[c === 'sleepb' ? 'b' : 'w'] = t.value; if (e.type === 'change') setTimeout(render, 0); }
  changed();
}
document.addEventListener('click', onClick);
document.addEventListener('input', onInput);
document.addEventListener('change', e => { if (e.target.dataset && /^sleep/.test(e.target.dataset.npc || '')) onInput(e); });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && e.target.closest && e.target.closest('.np-add') && e.target.tagName === 'INPUT'){ const b = e.target.closest('.np-add').querySelector('[data-np="add"]'); if (b){ e.preventDefault(); b.click(); } } if (e.key === 'Enter' && !e.isComposing && e.target.id && /^npPw2?$/.test(e.target.id)){ const b = box().querySelector('[data-np="create"],[data-np="unlock"]'); if (b) b.click(); } });
setInterval(() => { if (NP.data && (!me || me.name !== NP.owner)){ Object.assign(NP, { st: 'idle', data: null, key: null, owner: '' }); const b = box(); if (b) b.innerHTML = ''; } }, 1500);
document.addEventListener('visibilitychange', () => { if (document.hidden && NP.saveTm) save(); });
addEventListener('pagehide', () => { if (NP.saveTm) save(); });


/* 🆘 걱정되는 말 살피기: 처음엔 학생에게 묻고, 또 나오면 선생님께 알려요 (같은 글은 한 번만) */
const CRISIS_RE = /자살|자해|죽고싶|죽고시퍼|죽고싶|죽을래|죽어버리|죽어버릴|죽어야겠|뒤지고싶|뒤져버리|살기싫|살고싶지않|사라지고싶|없어지고싶|태어나지말|뛰어내리|투신|목매|목을매|손목을?긋|칼로긋|긋고싶|그어버리|유서|극단적선택|수면제.{0,6}(많이|한꺼번|다먹|모아)|약을?다먹|죽는게낫|자1살|자ㅅ살|ㅈ살/;
function crisisTexts(o, out = []){ if (typeof o === 'string') out.push(o); else if (o && typeof o === 'object') for (const k in o) if (k !== '_crisis') crisisTexts(o[k], out); return out; }
function hashStr(s){ let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
let crisisBusy = false;
async function crisisScan(){
  const x = NP.data; if (!x || crisisBusy) return; const seen = x._crisis = x._crisis || [];
  const hits = crisisTexts(x).filter(t => CRISIS_RE.test(t.replace(/[\s.,!?~…·\-_'"^ㅋㅎㅠㅜ]/g, ''))).filter(t => !seen.includes(hashStr(t)));
  if (!hits.length) return;
  crisisBusy = true; hits.forEach(t => seen.push(hashStr(t)));
  try {
    const j = await studentCall('padAlert', { snip: hits[0].slice(0, 200) });
    if (j && j.warn) crisisWarn(); else if (j && j.reported) crisisCare();
  } catch(e){} finally { crisisBusy = false; }
}
function crisisWarn(){
  bOpen('msOv', `<div class="np-care"><div style="font-size:2.4rem;">💛</div><h2>혹시 많이 힘든가요?</h2>
    <p>수첩에 걱정되는 말이 보여서 물어봐요.</p>
    <p>장난으로 썼다면 지워 주세요. <b>다음에 또 쓰면 선생님께 바로 알려져요.</b></p>
    <p>정말 힘들다면 혼자 참지 말고 꼭 이야기해요.</p>
    <div class="np-help">📞 자살예방 상담전화 <b>109</b> (24시간)<br>📞 청소년 상담 <b>1388</b> · 문자 <b>#1388</b></div>
    <button type="button" class="btn btn-pink" data-np="careSelf" style="width:100%;margin-top:10px;">🙋 선생님과 이야기하고 싶어요</button>
    <button type="button" class="btn btn-gray" data-bclose="msOv" style="width:100%;margin-top:8px;">장난이었어요. 지울게요</button></div>`);
}
function crisisCare(){
  bOpen('msOv', `<div class="np-care"><div style="font-size:2.4rem;">💛</div><h2>선생님께 알렸어요</h2>
    <p>혼자 힘들어하지 않아도 돼요. 선생님이 곧 이야기해 줄 거예요.</p>
    <div class="np-help">📞 자살예방 상담전화 <b>109</b> (24시간)<br>📞 청소년 상담 <b>1388</b> · 문자 <b>#1388</b></div>
    <button type="button" class="btn btn-y" data-bclose="msOv" style="width:100%;margin-top:10px;">알겠어요</button></div>`);
}

/* 👑 선생님: 마스터 관리자 비밀번호로 학생 수첩 보기 (관리 탭 전용) */
const M = { pin: '', priv: null, list: [], view: null, msg: '' };
async function mUnwrapPriv(wpriv, pin){
  const [s, iv, ct] = wpriv.split('.'), k = await deriveKey(pin, unb64(s));
  const raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, k, unb64(ct)));
  return crypto.subtle.importKey('pkcs8', raw, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
}
async function mWrapPriv(rawPriv, pin){
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), k = await deriveKey(pin, salt);
  return `${b64(salt)}.${b64(iv)}.${b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, rawPriv)))}`;
}
const mCall = body => fetch(API, { method: 'POST', body: JSON.stringify(Object.assign({ action: 'padMaster', mpin: M.pin }, body)) }).then(r => r.json());
NP.masterHTML = function(){
  if (!M.priv) return `<div class="box"><div class="box-head">📔 학생 수첩</div><p class="hint">마스터 관리자 비밀번호로 열어요. (처음 한 번은 열쇠를 만들어요)</p>
    <input type="password" id="npmPin" class="pc-in" placeholder="마스터 관리자 비밀번호" autocomplete="off"><div class="np-err" id="npmErr">${esc(M.msg)}</div>
    <button type="button" class="btn btn-y" data-np="mOpen" style="width:100%;">🔓 열기</button></div>`;
  const V = M.view;
  return `<div class="box"><div class="box-head">📔 학생 수첩</div><div class="np-chips">${M.list.length ? M.list.map(o => `<button type="button" class="${V && V.name === o.name ? 'on' : ''}" data-np="mGet" data-k="${esc(o.name)}">${esc(o.name)}</button>`).join('') : '<span class="np-empty">아직 수첩을 만든 학생이 없어요</span>'}</div>
    <div class="hint" style="margin-top:6px;">학생이 수첩을 한 번 열어야(저장돼야) 볼 수 있게 돼요. 보기만 하고 고칠 수는 없어요.</div>
    ${V ? `<div class="np-mview"><div class="np-sub">${esc(V.name)} · 마지막 저장 ${esc(V.t || '')}</div>${V.err ? `<div class="empty">${V.err}</div>` : mRender(V.data)}</div>` : ''}
    <div style="text-align:right;margin-top:8px;"><button type="button" class="np-btn" data-np="mClose">🔒 닫기</button></div></div>`;
};
function mRender(x){
  x = JSON.parse(JSON.stringify(x || {})); x.todo = x.todo || { items: [] }; x.prep = x.prep || { items: [] };
  const keep = NP.show, keepCal = NP.cal; NP.show = { diary: true }; NP.cal = null;
  const has = id => { const v = x[id]; return v && (Array.isArray(v) ? v.length : typeof v === 'object' ? Object.keys(v).length && JSON.stringify(v) !== '{"list":[],"log":{}}' && JSON.stringify(v) !== '{"log":{}}' : 0); };
  const ids = ORDER.filter(id => id === 'todo' ? x.todo.items.length : id === 'prep' ? x.prep.items.length : has(id));
  let html = ids.map(id => { let body = ''; try { body = W[id].r(x); } catch(e){ body = '<div class="np-empty">—</div>'; }
    if (id === 'future') body += (x.future || []).map(o => `<div class="np-quote">📮 ${esc(o.open)} 열림 · ${esc(o.t)}</div>`).join('');
    if (id === 'diary') body += Object.keys(x.diary || {}).sort().reverse().map(d => `<div class="np-quote">${md(d)} · ${esc(x.diary[d])}</div>`).join('');
    return `<div class="np-w"><div class="np-wh"><span>${W[id].i} ${W[id].n}</span></div><div class="np-wb">${body}</div></div>`; }).join('');
  NP.show = keep; NP.cal = keepCal;
  return `<div class="np-grid np-ro">${html || '<div class="np-empty">비어 있어요</div>'}</div>`;
}
async function mClick(a, k, t){
  const box2 = t.closest('.box'), rer = () => { const host = $('tBody') || box2.parentNode; box2.outerHTML = NP.masterHTML(); };
  if (a === 'mClose'){ Object.assign(M, { pin: '', priv: null, list: [], view: null, msg: '' }); rer(); return; }
  if (a === 'mOpen'){
    M.pin = $('npmPin').value; M.msg = '🔐 여는 중…'; $('npmErr').textContent = M.msg;
    let j; try { j = await mCall({ op: 'info' }); } catch(e){ j = null; }
    if (!j || !j.ok){ M.msg = j && j.error === 'wrong' ? '❌ 비밀번호가 달라요' : '연결이 안 돼요 (서버 코드 v52 이상)'; M.pin = ''; rer(); return; }
    try {
      if (!j.pub){   // 처음: 열쇠 만들기
        const kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
        const pub = b64(new Uint8Array(await crypto.subtle.exportKey('spki', kp.publicKey))), rawPriv = new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey));
        const r = await mCall({ op: 'set', pub, wpriv: await mWrapPriv(rawPriv, M.pin) }); if (!r.ok) throw new Error('set');
        j = await mCall({ op: 'info' }); toast('🔑 수첩 열쇠를 만들었어요. 이제부터 저장되는 수첩을 볼 수 있어요');
      }
      try { M.priv = await mUnwrapPriv(j.wpriv, M.pin); }
      catch(e){   // 마스터 비밀번호가 바뀐 경우: 예전 비밀번호로 풀어서 새 비밀번호로 다시 잠가요
        const old = prompt('마스터 비밀번호가 바뀌었나 봐요. 열쇠를 만들 때의 예전 마스터 비밀번호를 넣어 주세요'); if (!old) throw e;
        const pk = await mUnwrapPriv(j.wpriv, old); M.priv = pk;
        toast('예전 비밀번호로 열었어요');
      }
      M.list = j.list || []; M.msg = '';
    } catch(e){ M.priv = null; M.msg = '열지 못했어요'; }
    rer(); return;
  }
  if (a === 'mGet'){
    const j = await mCall({ op: 'get', name: k }); M.view = { name: k, t: j && j.t };
    try { const P = String(j.blob || '').split('.');
      if (P[0] !== 'v2' || P[5] === '-') M.view.err = '아직 열 수 없어요. 학생이 다음에 수첩을 열면 볼 수 있게 돼요.';
      else { const dekRaw = new Uint8Array(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, M.priv, unb64(P[5]))); M.view.data = await openCt(P[1], P[6], P[7], await importDek(dekRaw)); }
    } catch(e){ M.view.err = '열지 못했어요 (열쇠가 바뀌기 전에 저장된 수첩일 수 있어요)'; }
    rer(); return;
  }
}

/* 🎨 모양 */
const css = document.createElement('style');
css.textContent = `
#p-pad{padding-top:6px;}
.np-top{display:flex;align-items:center;gap:6px;margin:4px 0 10px;font-size:1.2rem;}
.np-sec{font-size:.8rem;background:#E4F7EA;border:1.5px solid #8CCBA2;border-radius:999px;padding:1px 8px;color:#2F6B47;}
.np-btn{font-family:inherit;border:2px solid var(--ink);border-radius:10px;background:#fff;padding:3px 9px;cursor:pointer;color:var(--ink);font-size:.92rem;box-shadow:0 2px 0 var(--ink);}
.np-btn:active{transform:translateY(2px);box-shadow:none;}
.np-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;grid-auto-flow:row dense;}
.np-w{grid-column:1/-1;background:#FFFDF6;border:3px solid var(--ink);border-radius:18px;box-shadow:0 4px 0 var(--ink);padding:10px 12px;min-width:0;}
.np-w.s{grid-column:auto;}
.np-wh{display:flex;align-items:center;justify-content:space-between;font-size:1.08rem;margin-bottom:6px;}
.np-ed{display:flex;gap:4px;} .np-ed button{font-family:inherit;border:2px solid var(--ink);border-radius:8px;background:#FFF3C4;cursor:pointer;padding:1px 7px;}
.np-row{display:flex;align-items:center;gap:6px;margin:4px 0;flex-wrap:wrap;} .np-grow{flex:1;min-width:0;word-break:keep-all;overflow-wrap:anywhere;}
.np-sub{font-size:.85rem;color:var(--ink-soft);margin:2px 0;}
.np-empty{color:var(--ink-soft);font-size:.92rem;padding:4px 0;}
.np-x{border:none;background:none;color:#C9B8A6;cursor:pointer;font-size:.9rem;padding:0 2px;}
.np-add{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center;}
.np-add input,.np-add select,.np-add textarea,.np-line,.np-row input[type=time]{font-family:inherit;font-size:1rem;border:2px solid #D9C9B6;border-radius:10px;padding:5px 8px;background:#fff;color:var(--ink);min-width:0;box-sizing:border-box;}
.np-add input[type=text],.np-add textarea{flex:1;min-width:110px;} .np-add textarea{width:100%;flex-basis:100%;}
.np-line{width:100%;margin:3px 0;} textarea.np-line{resize:vertical;}
.np-dd{display:inline-block;min-width:46px;text-align:center;background:#FFF3C4;border:1.5px solid #E8C35A;border-radius:999px;padding:0 6px;font-size:.85rem;}
.np-dd.hot{background:#FFC2D4;border-color:#FF7FA6;} .np-dd.past{opacity:.55;}
.np-ck{width:24px;height:24px;border:2px solid var(--ink);border-radius:7px;background:#fff;cursor:pointer;font-size:.9rem;padding:0;flex:none;} .np-ck.on{background:#C4F0DD;}
.np-done{text-decoration:line-through;color:#B8A898;}
.np-notes{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;}
.np-note{position:relative;border-radius:6px 6px 14px 6px;padding:10px 18px 10px 10px;min-height:54px;box-shadow:0 2px 0 rgba(91,70,54,.25);word-break:keep-all;overflow-wrap:anywhere;transform:rotate(-1deg);} .np-note:nth-child(2n){transform:rotate(1.2deg);}
.np-note .np-x{position:absolute;top:2px;right:2px;}
.np-calh{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
.np-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center;font-size:.85rem;} .np-cal>span{color:var(--ink-soft);}
.np-day{font-family:inherit;border:1.5px solid #EFE3D3;border-radius:8px;background:#fff;padding:4px 0;cursor:pointer;color:var(--ink);position:relative;}
.np-day.today{border-color:var(--ink);background:#FFF3C4;} .np-day.ev::after{content:'';position:absolute;bottom:2px;left:50%;margin-left:-3px;width:6px;height:6px;border-radius:50%;background:#FF7FA6;}
.np-moods{display:flex;justify-content:space-between;gap:4px;} .np-moods button{flex:1;font-size:1.6rem;border:2px solid #EFE3D3;border-radius:12px;background:#fff;cursor:pointer;padding:2px 0;} .np-moods button.on{border-color:var(--ink);background:#FFF3C4;}
.np-mgrid{display:grid;grid-template-columns:repeat(16,1fr);gap:3px;} .np-mc{aspect-ratio:1;border-radius:4px;}
.np-cell{width:20px;height:20px;border-radius:5px;border:1.5px solid #E6D9CA;background:#F7F0E6;cursor:pointer;padding:0;flex:none;} .np-cell.on{background:#7ED6A0;border-color:#4FA672;} .np-cell.today{border-color:var(--ink);}
.np-bar{height:10px;border:2px solid var(--ink);border-radius:999px;background:#fff;overflow:hidden;} .np-bar b{display:block;height:100%;background:#7ED6A0;}
.np-goal{margin-bottom:8px;}
.np-big{text-align:center;font-size:2rem;margin:4px 0;} .np-big small{font-size:1rem;}
.np-tbtn{display:flex;gap:4px;justify-content:center;flex-wrap:wrap;}
.np-quote{position:relative;background:#F1ECFF;border:2px solid #B9A6E8;border-radius:12px;padding:6px 22px 6px 10px;margin-top:6px;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere;white-space:pre-wrap;} .np-quote .np-x{position:absolute;top:4px;right:4px;}
.np-cap{background:#FFF8E1;border:2px dashed #E8C66A;border-radius:12px;padding:6px 10px;}
.np-shelf{display:flex;align-items:flex-end;gap:3px;height:44px;border-bottom:4px solid #C9A27A;padding:0 4px;margin-bottom:6px;overflow:hidden;} .np-shelf span{width:12px;border:1.5px solid var(--ink);border-radius:2px 2px 0 0;flex:none;}
.np-veil{width:100%;font-family:inherit;border:2px dashed #B9A6E8;border-radius:14px;background:#F6F2FF;padding:16px;cursor:pointer;color:var(--ink);font-size:1rem;line-height:1.6;}
.np-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;} .np-chips button{font-family:inherit;border:1.5px solid var(--ink);border-radius:999px;background:#fff;padding:1px 8px;cursor:pointer;font-size:.82rem;} .np-chips button.on{background:#E2D8FF;}
.np-won{font-size:1.15rem;}
.np-sleep{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;height:90px;align-items:end;margin-top:6px;} .np-sleep div{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:.72rem;color:var(--ink-soft);} .np-sleep span{width:70%;border-radius:5px 5px 0 0;min-height:2px;}
.np-wq{border-bottom:1.5px dashed #EFE3D3;padding:4px 0;} .np-tag{background:#E2D8FF;border-radius:999px;padding:0 7px;font-size:.8rem;}
.np-plus{width:100%;margin-top:16px;}
.np-saved{text-align:center;font-size:.8rem;color:var(--ink-soft);margin-top:6px;min-height:1em;}
.np-lock{text-align:center;} .np-lock p{line-height:1.7;} .np-lockic{font-size:2.4rem;}
.np-lock input[type=password]{display:block;width:100%;box-sizing:border-box;font-family:inherit;font-size:1.1rem;border:3px solid var(--ink);border-radius:12px;padding:8px 10px;margin:6px 0;}
.np-rem{display:block;margin:6px 0;font-size:.92rem;} .np-err{color:#D6456E;min-height:1.2em;margin:4px 0;}
.np-link{font-family:inherit;border:none;background:none;color:var(--ink-soft);text-decoration:underline;cursor:pointer;}
.np-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;} .np-pick button{font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:2px;border:2px solid var(--ink);border-radius:14px;background:#FFFDF6;padding:10px 6px;cursor:pointer;color:var(--ink);box-shadow:0 3px 0 var(--ink);}
.np-care{text-align:center;line-height:1.7;} .np-care p{margin:6px 0;} .np-help{background:#FFF3C4;border:2px solid #E8C35A;border-radius:14px;padding:8px;margin-top:8px;}
.np-ro button,.np-ro input,.np-ro textarea,.np-ro select,.np-ro .np-add,.np-ro .np-x{pointer-events:none;} .np-ro .np-add,.np-ro .np-x{display:none !important;}
.np-mview{margin-top:10px;border-top:2px dashed #EFE3D3;padding-top:8px;}
.np-pick span{font-size:1.6rem;} .np-pick small{color:var(--ink-soft);font-size:.78rem;line-height:1.4;}
@media (max-width:420px){ .np-cell{width:17px;height:17px;} .np-mgrid{grid-template-columns:repeat(11,1fr);} }
`;
document.head.appendChild(css);
})();
