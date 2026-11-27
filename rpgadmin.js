/* 🐾 RPG 관리 (학생 앱 👑 관리 → 🐾 RPG): 기능 스위치 · 냥코인 신청·지급·잔액 · 미션·상점 편집 · 학생 EXP
 * 출석부(TV)는 출석 규칙만, 게임(RPG)은 여기서 해요. student.html 안에서 돌아가요: tCall · tKids · toast · esc · $ */
(function(){
const RA = window.RA = { data: {}, pick: new Set(), xpName: '' };
const FEATS = [
  ['🐾 냥코인', [['coin', '🐾 냥코인 전체', '미션 · 상점 · 게임 모두'], ['missions', '📋 미션', '고르기 · 완료 신청'], ['shop', '🛍️ 상점', '상점가 · 가구 · 이사'], ['game', '🎮 게임', '게임 광장'], ['mega', '📢 확성기', '사기 · 띄우기']]],
  ['🏘️ 마을', [['village', '🏘️ 마을 전체', '걷기 · 놀이 · 집'], ['hana', '🐱 하나', '놀기 · 꾸미기'], ['cafe', '☕ 스터디카페', ''], ['eng', '📚 냥글리시', '영어 학원'], ['mail', '💌 편지함', ''], ['diary', '📓 집 일기장', '']]],
  ['💬 소통', [['chat', '💬 대화', '보내기'], ['plaza', '🎪 우리 반 광장', '자유 게시판 · 의견함'], ['story', '📸 시내T 스토리', '답하기'], ['menuTr', '🍱 급식 영어', '번역 내기']]],
  ['🧸 나', [['pad', '📔 내 수첩', '']]]
];
const CAT_T = { daily:'매일', weekly:'매주', all:'특별' }, CAT_I = { daily:'☀️ 매일', weekly:'📅 매주', all:'⭐ 특별' };
const FL = { story:'스토리 자동', menu:'번역 승인 자동', sign:'서명', praise:'칭찬편지 자동', appon:'첫 터치 출석 자동', eng:'영어 자동', allon:'자동', allon3:'자동', good:'자동', diary:'일기장 자동', cafe:'스터디카페 자동', locker:'가위바위보', teacher:'선생님이 줌' };
const slug = (p, s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return p + h.toString(36); };
const howDef = m => (typeof MISSION_HOW !== 'undefined' && (MISSION_HOW[m.id] || MISSION_HOW[m.flow])) || '미션을 다 하면 냥코인 탭에서 \'완료했어요!\'를 눌러 알려 줘요.';
const sgn = v => (v > 0 ? '+' : '') + v;
const ops = async (list, msg) => { const j = await tCall({ ops: list }); if (!j || j.ok === false){ toast('저장하지 못했어요'); return null; } if (msg) toast(msg); return j; };

RA.TABS = [['feat', '🎛️ 기능 스위치'], ['limit', '⏱ 횟수 제한'], ['creq', '✅ 신청 · 미션'], ['cgive', '🎁 지급'], ['cbal', '💰 잔액 · 기록'], ['eco', '✏️ 미션 · 상점'], ['xp', '✨ 학생 EXP']];
RA.load = async function(tab){
  const D = RA.data;
  if (tab === 'feat' || tab === 'eco' || tab === 'cgive'){ const j = await tCall({ action:'ecoGet' }); D.eco = j.economy || null; D.feat = j.feat || {}; D.ecoOk = j.ok !== false && 'economy' in j; }
  if (tab === 'creq' || tab === 'cgive' || tab === 'cbal') D.coins = await tCall({ action:'coins' });
  if (tab === 'xp' || tab === 'cgive') D.xp = await tCall({ action:'expInfo' });
  if (tab === 'limit') D.lim = await tCall({ action:'limits' });
};
/* ⏱ 횟수 제한: 0 = 무제한 · 빈칸 = 기본값 · 학생별 막기/한도 · 오늘 하루 이벤트(전부 무제한) */
const LIM_ROWS = [
  ['gather', '🎣 채집 (낚시 · 열매 · 별 · 동전 · 쓰레기통)', '하루 횟수'], ['gatherExp', '✨ 채집 EXP', '하루 상한'], ['gatherGap', '⏱ 채집 간격', '초 (기본 30)'],
  ['gatherRun', '😪 한 자리 연속 채집 → 지침', '번 (기본 20 · 0 = 안 지침)'], ['gatherRest', '💤 지친 뒤 쉬는 시간', '분 (기본 3)'],
  ['sell', '🏪 시장에 팔기', '하루 횟수'], ['find', '🍀 동전 줍기 · 보물상자', '하루 횟수'],
  ['hana', '🐱 하나랑 놀기', '하루 횟수'], ['act', '🎠 마을 놀이 (츄르 · 마시멜로 등)', '하루 횟수'], ['vexp', '🏘️ 마을 활동 EXP', '하루 상한'],
  ['game', '🎮 오락실 게임', '하루 판 수'], ['bet', '🎲 오락실 최대 베팅', '코인']
];
const LIM_BLOCK = [['gather', '채집'], ['sell', '팔기'], ['hana', '하나'], ['game', '게임'], ['act', '놀이'], ['find', '줍기']];
function limHtml(){
  const d = RA.data.lim || {}; if (!d.ok || !d.def) return '<div class="empty">서버 코드를 최신(v58)으로 배포하면 보여요</div>';
  const L = d.limits || {}, def = d.def || {}, g = d.game || {}, ev = L.event === d.today, per = L.per || {};
  const dv = k => k === 'game' ? (g.daily || 5) : k === 'bet' ? (g.maxBet || 30) : def[k];
  const st = {}; (d.stats || []).forEach(x => st[x.name] = x);
  const pr = (d.periods || []).map(p => `${String(Math.floor(p[0] / 60)).padStart(2, '0')}:${String(p[0] % 60).padStart(2, '0')}~${String(Math.floor(p[1] / 60)).padStart(2, '0')}:${String(p[1] % 60).padStart(2, '0')}`).join(' · ');
  const banned = (d.stats || []).filter(x => x.ban);
  return `<div class="box ra"><div class="box-head">🚨 수업 시간 압수</div>
      <div class="hint">수업 시간(${pr || '오늘은 수업 없음'})에 채집 · 낚시 · 팔기 · 줍기 · 소원을 하면 경고 없이 가방 전부 압수 + 오늘 수업 시간에 얻은 코인 · EXP 되돌리기 + 오늘 채집 금지. 시간은 출석부 시간표를 따라요.</div>
      ${banned.length ? banned.map(x => `<div class="ra-row"><span>🚫 <b>${esc(x.name)}</b> <small>${esc(((d.banlog || []).filter(l => l.n === x.name).slice(-1)[0] || {}).at || '')} 압수 · ${(() => { const l = (d.banlog || []).filter(l => l.n === x.name).slice(-1)[0] || {}; return `코인 -${l.coins || 0} · EXP -${l.exp || 0} · 아이템 ${l.items || 0}개`; })()}</small></span><button type="button" class="np-btn" data-unban="${esc(x.name)}">🔓 풀기</button></div>`).join('') : '<div class="empty">오늘 압수된 친구가 없어요</div>'}
      <div style="text-align:right;margin-top:8px;"><button type="button" class="np-btn no" id="limSweep">🔍 오늘 수업 시간 기록 찾아서 압수</button></div></div>
    <div class="box ra"><div class="box-head">🎉 오늘 하루 이벤트</div>
      <label class="ra-pause"><input type="checkbox" id="limEvent" ${ev ? 'checked' : ''}> <span><b>오늘은 전부 무제한!</b><br><small>${esc(d.today || '')} 하루만 · 내일 아침이면 저절로 원래대로 (막아 둔 학생은 계속 막혀요)</small></span></label></div>
    <div class="box ra"><div class="box-head">⏱ 반 전체 한도 <small>0 = 무제한 · 빈칸 = 기본값</small></div>
      ${LIM_ROWS.map(([k, n, u]) => `<div class="ra-row"><span>${n}</span><span><input type="number" min="0" data-lim="${k}" value="${L[k] != null && L[k] !== '' ? esc(String(L[k])) : ''}" placeholder="${dv(k) === 0 ? '무제한' : dv(k)}" style="width:80px;"> <small>${u}</small> <button type="button" class="np-btn" data-limun="${k}">무제한</button></span></div>`).join('')}
      <div style="text-align:right;margin-top:8px;"><button type="button" class="np-btn ok" id="limSave">💾 저장</button></div></div>
    <div class="box ra"><div class="box-head">👥 학생별 <small>오늘 기록 · 막기 · 채집 한도</small></div>
      <table class="ra-t"><tr><th>이름</th><th>오늘</th><th>막기</th><th>채집 한도</th></tr>${tKids().map(n => { const s0 = st[n] || {}, p = per[n] || {}, bl = p.block || [];
        return `<tr><td>${esc(n)}</td><td><small>채집 ${s0.gc || 0}번 · +${s0.ge || 0}✨<br>팔기 ${s0.sc || 0} · 줍기 ${s0.fc || 0} · 도감 ${s0.dex || 0} · 은행 ${s0.bank || 0}🐾</small></td>
          <td>${LIM_BLOCK.map(([k, nm]) => `<label style="white-space:nowrap;margin-right:6px;"><input type="checkbox" data-limblk="${esc(n)}" data-k="${k}" ${bl.includes(k) ? 'checked' : ''}>${nm}</label>`).join(' ')}</td>
          <td><input type="number" min="0" data-limper="${esc(n)}" value="${p.gather != null ? esc(String(p.gather)) : ''}" placeholder="반 전체" style="width:70px;"></td></tr>`; }).join('')}</table>
      <div style="text-align:right;margin-top:8px;"><button type="button" class="np-btn ok" id="limSave2">💾 저장</button></div>
      <div class="hint">막으면 그 학생만 그 활동을 못 해요. 채집 한도에 숫자를 적으면 그 학생만 하루 그만큼(0 = 무제한).</div></div>`;
}
function limCollect(){
  const d = RA.data.lim || {}, L = Object.assign({}, d.limits || {}), per = {};
  document.querySelectorAll('.ra [data-lim]').forEach(i => { const v = i.value.trim(); if (v === '') delete L[i.dataset.lim]; else L[i.dataset.lim] = Math.max(0, Math.floor(Number(v) || 0)); });
  document.querySelectorAll('.ra [data-limblk]').forEach(c => { if (!c.checked) return; const n = c.dataset.limblk; (per[n] = per[n] || {}).block = ((per[n] || {}).block || []).concat([c.dataset.k]); });
  document.querySelectorAll('.ra [data-limper]').forEach(i => { const v = i.value.trim(); if (v === '') return; (per[i.dataset.limper] = per[i.dataset.limper] || {}).gather = Math.max(0, Math.floor(Number(v) || 0)); });
  L.per = per; const ev = document.getElementById('limEvent'); L.event = ev && ev.checked ? d.today : '';
  return L;
}
async function limSave(msg){ const L = limCollect(); if (await ops([{ op:'limitSet', limits: L }], msg || '⏱ 저장했어요')) rer('limit', true); }
RA.html = function(tab){
  const D = RA.data, kids = tKids();
  if (tab === 'limit') return limHtml();
  if (tab === 'feat'){
    if (!D.ecoOk) return old();
    const f = D.feat || {};
    return `<div class="box ra"><div class="box-head">🎛️ 기능 스위치</div>
      <label class="ra-pause"><input type="checkbox" data-feat="pause" ${f.pause ? 'checked' : ''}> <span>⏸ <b>전체 멈춤</b><br><small>출석 · 공지 · 로그인만 남기고 학생 앱 기능을 한 번에 꺼요</small></span></label>
      ${FEATS.map(([g, list]) => `<div class="ra-g">${g}</div><div class="ra-grid">${list.map(([k, n, d]) => `<label class="ra-ft ${f[k] === false || f.pause ? 'off' : ''}"><input type="checkbox" data-feat="${k}" ${f[k] !== false ? 'checked' : ''}><span>${n}${d ? `<small>${d}</small>` : ''}</span></label>`).join('')}</div>`).join('')}
      <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:10px;"><small id="featDirty" class="hint" style="color:#C0365C;display:none;">저장 안 한 변경이 있어요</small><button type="button" class="np-btn ok" id="featSave">💾 저장</button></div>
      <div class="hint" style="margin-top:6px;">끄면 학생 화면에 "지금은 쉬는 중이에요"가 떠요. 선생님 계정은 다 쓸 수 있어요. 바꾼 뒤 <b>저장</b>을 눌러야 적용돼요.</div></div>`;
  }
  if (tab === 'creq'){
    const d = D.coins || {}; if (!d.reqs) return old();
    const pend = d.reqs.filter(r => r.status === '대기'), done = d.reqs.filter(r => r.status !== '대기').slice(0, 30);
    const mName = id => { const m = (d.missions || []).find(x => x.id === id); return m ? m.name : id; }, pk = d.picks || {};
    const pickBox = `<div class="box ra"><div class="box-head">🎯 학생들이 고른 미션 <small>오늘 · 이번 주</small></div>${d.picks ? (tKids().filter(n => pk[n]).map(n => `<div class="ra-row"><span><b>${esc(n)}</b></span><span style="text-align:right;">${(pk[n].d || []).map(id => `<span class="ra-chip">${esc(mName(id))}</span>`).join(' ')}${(pk[n].w || []).length ? ` <small>주간</small> ${pk[n].w.map(id => `<span class="ra-chip">${esc(mName(id))}</span>`).join(' ')}` : ''}</span></div>`).join('') || '<div class="empty">아직 고른 친구가 없어요</div>') + `<div class="hint">안 고른 친구: ${tKids().filter(n => !pk[n]).map(esc).join(', ') || '없음'}</div>` : '<div class="empty">서버 코드를 최신으로 배포하면 보여요</div>'}</div>`;
    return pickBox + `<div class="box ra"><div class="box-head">⏳ 확인 대기 (${pend.length})</div>${pend.length ? pend.map(r => `<div class="ra-row"><span>${r.type === '미션' ? '✅ 미션' : '🎟 쿠폰'} · <b>${esc(r.name)}</b> · ${esc(r.item)} · ${r.type === '미션' ? '+' : ''}${r.coins}🐾 <small>${esc(r.t)}</small></span>
        <span>${(d.sigs || []).includes(r.id) ? `<button type="button" class="np-btn" data-rsig="${r.id}">✍️ 서명</button>` : ''}<button type="button" class="np-btn ok" data-rq="${r.id}" data-ok="1">${r.type === '미션' ? '승인' : '지급 완료'}</button><button type="button" class="np-btn no" data-rq="${r.id}" data-ok="0">${r.type === '미션' ? '반려' : '취소·환불'}</button></span></div>`).join('') : '<div class="empty">확인할 게 없어요 </div>'}</div>
      <div class="box ra"><div class="box-head">🎯 미션 성공 보고 <small>(잘못 준 건 ↩ 취소 · 코인과 EXP가 빠져요)</small></div>${(d.results || []).length ? d.results.slice(0, 30).map(x => `<div class="ra-row"><span>${x.undone ? '<s>' : ''}<b>${esc(x.name)}</b> · ${esc(String(x.why || '').replace(/^미션:\s*/, ''))} · +${x.amt}🐾 <small>${esc(x.kind || '')} ${esc(String(x.t || '').slice(5))}</small>${x.undone ? '</s>' : ''}</span>${x.undone ? '<small>취소됨</small>' : `<button type="button" class="np-btn no" data-mundo="${x.id}">↩ 취소</button>`}</div>`).join('') : '<div class="empty">아직 없어요</div>'}</div>
      <div class="box ra"><div class="box-head">💌 칭찬편지 결과 <small>(내용은 안 보여요)</small></div>${(d.praise || []).length ? d.praise.slice(0, 20).map(x => `<div class="ra-row"><span><b>${esc(x.from)}</b> → ${esc(x.to)} ${x.mission ? '🎯' : ''}</span><small>${x.ok ? '✔ 확인' : '⏳'}</small></div>`).join('') : '<div class="empty">아직 없어요</div>'}</div>
      <div class="box ra"><div class="box-head">📜 최근 처리</div>${done.map(r => `<div class="ra-row"><span>${esc(r.type)} · ${esc(r.name)} · ${esc(r.item)} · ${esc(r.status)}</span><small>${esc(r.done || '')}</small></div>`).join('') || '<div class="empty">-</div>'}</div>`;
  }
  if (tab === 'cgive'){
    const eco = D.eco || { missions: [] };
    return `<div class="box ra"><div class="box-head">👥 1. 받을 친구 고르기</div>
      <div class="ra-pick">${kids.map(n => `<button type="button" data-rpick="${esc(n)}" class="${RA.pick.has(n) ? 'on' : ''}">${esc(n)}</button>`).join('')}</div>
      <div style="text-align:center;margin-top:6px;"><button type="button" class="np-btn" data-rall="1">전체 선택</button> <button type="button" class="np-btn" data-rall="0">전체 해제</button> <small class="hint">${RA.pick.size}명 골랐어요</small></div></div>
    <div class="box ra"><div class="box-head">🐾 2-1. 냥코인 주기 · 빼기</div><div class="ra-line"><input type="number" id="raAmt" placeholder="예: 50 · -20"><input type="text" id="raWhy" maxlength="40" placeholder="이유 (예: 체육대회 우승)"><button type="button" class="btn btn-y" id="raCoinGo">🐾 주기</button></div></div>
    <div class="box ra"><div class="box-head">✨ 2-2. 경험치 주기 · 빼기</div><div class="ra-line"><input type="number" id="raExp" placeholder="예: 10 · -5"><input type="text" id="raExpWhy" maxlength="40" placeholder="이유 (예: 학급회의 참여)"><button type="button" class="btn btn-y" id="raExpGo">✨ 주기</button></div>
      <div class="hint">출석부(TV)가 켜져 있으면 1분 안에 레벨에 더해지고, 레벨이 오르면 교실 화면에서 축하해요.</div></div>
    <div class="box ra"><div class="box-head">🎯 2-3. 미션 성공 주기</div><div class="ra-line"><select id="raMis">${(eco.missions || []).map(m => `<option value="${esc(m.id)}">${CAT_I[m.cat] || ''} · ${esc(m.name)} (+${m.coins}🐾 · +${m.exp != null ? m.exp : Math.round(m.coins / 2)}✨)</option>`).join('')}</select><button type="button" class="btn btn-y" id="raMisGo">🎯 주기</button></div>
      <div class="hint">코인과 EXP를 같이 줘요. 같은 미션은 정해진 기간(하루 · 한 주)에 한 번만 들어가요.</div></div>`;
  }
  if (tab === 'cbal'){
    const d = D.coins || {}; if (!d.balances) return old();
    return `<div class="box ra"><div class="box-head">💰 잔액</div>
      <div style="text-align:right;margin-bottom:6px;"><button type="button" class="np-btn" id="raPurge">🧪 시험 기록 지우기</button> <button type="button" class="np-btn no" id="raReset">🧹 냥코인 전체 초기화</button></div>
      <table class="ra-t"><tr><th>이름</th><th>냥코인</th><th>더하기 · 빼기</th></tr>${kids.map(n => `<tr><td>${esc(n)}</td><td><b>${d.balances[n] || 0}</b> 🐾</td><td><input type="number" data-radj="${esc(n)}" placeholder="+/-" style="width:80px;"> <button type="button" class="np-btn" data-radjgo="${esc(n)}">적용</button></td></tr>`).join('')}</table></div>
    <div class="box ra"><div class="box-head">📜 최근 기록 <small>(시트 '냥코인' 탭에 전부 남아요)</small></div>${(d.ledger || []).slice(0, 60).map(r => `<div class="ra-row"><span>${esc(String(r.t).slice(5))} · <b>${esc(r.name)}</b> · ${esc(r.why)}</span><b style="color:${r.amt >= 0 ? '#1F8A5F' : '#D6456E'}">${sgn(r.amt)}</b></div>`).join('') || '<div class="empty">-</div>'}</div>`;
  }
  if (tab === 'eco'){
    const eco = D.eco; if (!D.ecoOk) return old(); if (!eco) return '<div class="empty">출석부(TV)를 한 번 켜서 서버와 연결해 주세요</div>';
    const g = eco.game || {}, days = ['', '월', '화', '수', '목', '금'], mt = eco.meeting || {};
    const ml = (eco.missions || []).map(m => `${CAT_T[m.cat] || '매일'}, ${m.name}, ${m.coins}, ${m.exp != null ? m.exp : Math.round(m.coins / 2)}, ${m.req ? 'O' : 'X'}${m.cap ? `, ${m.cap}명` : ''}`).join('\n');
    const cl = (eco.shop || []).filter(x => x.cat === 'coupon').map(x => `${x.name}, ${x.price}, ${x.stock || ''}${x.real ? ', 실물' : ''}`.replace(/, $/, '').replace(/, ,/, ',,')).join('\n');
    return `<div class="box ra"><div class="box-head">📋 미션</div>
        <div class="hint">한 줄에 하나: <b>분류(매일/매주/특별), 이름, 코인, EXP, 학생 신청 O/X, 선착 'N명'</b>· 줄 순서는 그대로 두고 이름 · 숫자만 바꿔요</div>
        <textarea id="raMissions" class="ra-ta" rows="12">${esc(ml)}</textarea>
        <div class="hint">학생이 먼저 골라요 (반 전체 등교 · 바른 한 주 · 좋았다 · 사물함은 안 골라도 돼요). 선착 인원을 넘겨서 늦게 성공하면 5 EXP를 받아요.</div></div>
      <div class="box ra"><div class="box-head">📖 미션 안내 <small>(학생이 🎯 고르기를 누르면 보여요 · 비우면 기본 글)</small></div>
        ${(eco.missions || []).map(m => `<div class="ra-mh"><b>${esc(m.name)}</b> <small>${m.flow === 'teacher' ? '👑 선생님이 줘요' : m.req || m.flow === 'sign' ? '✋ 수동 지급' : FL[m.flow] ? '⚡ ' + FL[m.flow] : ''}</small><textarea data-rmhow="${esc(m.id)}" rows="2" class="ra-ta" placeholder="${esc(howDef(m))}">${esc(m.how || '')}</textarea></div>`).join('')}</div>
      <div class="box ra"><div class="box-head">🎯 고를 수 있는 개수</div><div class="ra-line"><span>오늘의 미션 하루 <input type="number" id="raPickD" min="1" max="10" value="${(eco.pickLimit || {}).daily || 3}" style="width:70px;"> 개</span><span>이번 주 미션 한 주 <input type="number" id="raPickW" min="1" max="10" value="${(eco.pickLimit || {}).weekly || 3}" style="width:70px;"> 개</span></div></div>
      <div class="box ra"><div class="box-head">🎟 쿠폰 · 🎁 실물</div>
        <div class="hint">한 줄에 하나: <b>이름, 가격, 수량, 실물</b>· 수량을 비우면 무제한 · 끝에 '실물'을 쓰면 문구점에 나와요</div>
        <textarea id="raCoupons" class="ra-ta" rows="10">${esc(cl)}</textarea></div>
      <div class="box ra"><div class="box-head">🛍️ 상점가 물건 가격</div><div class="ra-items">${(eco.shop || []).filter(x => x.cat !== 'coupon').map(x => `<label class="ra-it"><span>${esc(x.name)}</span><input type="number" min="0" data-rprice="${esc(x.id)}" value="${x.price}"><small><input type="checkbox" data-roff="${esc(x.id)}" ${x.off ? '' : 'checked'}> 판매</small></label>`).join('')}</div></div>
      <div class="box ra"><div class="box-head">🎮 게임 광장</div>
        <div class="ra-line"><span>한 번에 최대 <input type="number" id="raMaxBet" value="${g.maxBet || 30}" style="width:70px;"> 🐾</span><span>하루 <input type="number" id="raDaily" value="${g.daily || 5}" style="width:60px;"> 판</span></div>
        <div class="ra-line" style="flex-wrap:wrap;">${[1, 2, 3, 4, 5].map(i => `<span>${days[i]} <input type="time" data-rgh0="${i}" value="${((g.hours || {})[i] || [])[0] || ''}"> ~ <input type="time" data-rgh1="${i}" value="${((g.hours || {})[i] || [])[1] || ''}"></span>`).join('')}</div>
        <div class="hint">주말에는 닫혀요. 시간을 비우면 그 요일은 닫혀요. 켜고 끄기는 기능 스위치에서 해요.</div></div>
      <div class="box ra"><div class="box-head">🏛️ 학급회의 (마을 시청)</div>
        <div class="ra-line"><span>👑 회장 <select id="raPres"><option value="">(없음)</option>${kids.map(n => `<option ${mt.pres === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></span><span>🎖 부회장 <select id="raVice"><option value="">(없음)</option>${kids.map(n => `<option ${mt.vice === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></span></div>
        <div class="ra-line"><input type="text" id="raAgenda" maxlength="60" value="${esc(mt.agenda || '')}" placeholder="📝 오늘의 안건 (회의실 칠판에 떠요)"></div></div>
      <div style="text-align:right;margin:10px 0 30px;"><button type="button" class="btn btn-y" id="raEcoSave">💾 미션 · 상점 저장</button></div>`;
  }
  if (tab === 'xp'){
    const x = D.xp || {}; if (!x.priv) return old();
    const th = x.th || [], lvN = x.names || [], P = x.priv;
    if (!RA.xpName || !kids.includes(RA.xpName)) RA.xpName = kids[0] || '';
    const n = RA.xpName, me = P[n] || {}, adj = (x.bonus || []).filter(b => b.who === n).slice(0, 40);
    return `<div class="box ra"><div class="box-head">✨ 학생 EXP · 레벨</div>
      <div class="ra-pick">${kids.map(k => `<button type="button" data-rxp="${esc(k)}" class="${k === n ? 'on' : ''}">${esc(k)} <small>Lv.${(P[k] || {}).lv || 1}</small></button>`).join('')}</div></div>
    ${n ? `<div class="box ra"><div class="box-head">🐱 ${esc(n)}</div>
      <div style="font-size:1.1rem;margin-bottom:6px;">Lv.<b>${me.lv || 1}</b> ${esc(me.lvName || lvN[(me.lv || 1) - 1] || '')} · 시즌 EXP <b>${me.exp || 0}</b>${me.next ? ` · 다음 레벨까지 ${me.need}` : ' · MAX'}</div>
      <div class="ra-btns">${[-100, -50, -10].map(v => `<button type="button" class="np-btn no" data-rxadd="${v}">${v}</button>`).join('')}${[10, 50, 100, 200].map(v => `<button type="button" class="np-btn ok" data-rxadd="${v}">+${v}</button>`).join('')}</div>
      <div class="ra-line"><input type="number" id="raXv" placeholder="직접 (예: -30)"><input type="text" id="raXwhy" maxlength="40" placeholder="이유 (선택)"><button type="button" class="btn btn-y" id="raXgo">주기</button></div>
      <div class="ra-g">🏆 레벨 바로 맞추기</div><div class="ra-btns">${th.map((t, i) => `<button type="button" class="np-btn ${me.lv === i + 1 ? 'ok' : ''}" data-rxlv="${i + 1}">Lv.${i + 1}</button>`).join('')}</div>
      <div class="hint">EXP는 출석부(TV)가 받아서 더해요 (TV가 켜져 있으면 1분 안). 레벨을 맞추면 그 레벨 시작 EXP가 되도록 더하거나 빼요.</div>
      <div class="ra-g">📜 이번 시즌 보너스 내역</div>${adj.length ? adj.map(b => `<div class="ra-row"><span>${esc(b.ds.slice(5).replace('-', '/'))} ${esc(b.t)} · ${esc(b.item || '')}</span><b style="color:${b.exp >= 0 ? '#1F8A5F' : '#D6456E'}">${sgn(Number(b.exp) || 0)}</b></div>`).join('') : '<div class="empty">아직 없어요</div>'}
      <div class="hint">꾸미기 · 집 · 하나 친밀도는 마을에서 친구 카드 → 마법으로 바꿔요.</div></div>` : ''}${xpToday(x)}`;
  }
  return '';
};
/* 📜 오늘 반 전체 EXP: 학생별 · 이유별로 묶어서 (교실 화면 알림 대신 여기서 봐요) */
function xpToday(x){
  const now = new Date(), ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const list = (x.bonus || []).filter(b => b.ds === ds), by = {};
  list.forEach(b => { const why = String(b.item || '기타').replace(/:.*$/, '').trim() || '기타'; const k = b.who; (by[k] = by[k] || { sum: 0, w: {} }); by[k].sum += Number(b.exp) || 0; const w = by[k].w[why] = by[k].w[why] || { n: 0, e: 0 }; w.n++; w.e += Number(b.exp) || 0; });
  const rows = Object.entries(by).sort((a, b) => b[1].sum - a[1].sum);
  return `<div class="box ra"><div class="box-head">📜 오늘 반 전체 EXP <small>학생별 · 이유별</small></div>${rows.length ? rows.map(([n, v]) => `<div class="ra-row"><span><b>${esc(n)}</b> <small>${Object.entries(v.w).map(([w, o]) => `${esc(w)} ${o.n > 1 ? `×${o.n} ` : ''}${sgn(o.e)}`).join(' · ')}</small></span><b style="color:${v.sum >= 0 ? '#1F8A5F' : '#D6456E'}">${sgn(v.sum)}</b></div>`).join('') : '<div class="empty">오늘 받은 EXP가 아직 없어요</div>'}
    <div class="hint">출석부(TV)가 받아서 더한 것까지 보여요. 새로 받은 EXP는 TV가 켜져 있으면 1분 안에 들어와요.</div></div>`;
}
function old(){ return '<div class="empty">서버 코드를 최신(v54)으로 배포하면 보여요</div>'; }
const rer = async (tab, reload) => { if (reload) { try { await RA.load(tab); } catch(e){} } const b = $('tBox'); if (b) b.innerHTML = RA.html(tab); };
RA.isTab = k => RA.TABS.some(x => x[0] === k);

/* 👆 누르기 */
/* 🎛️ 기능 스위치: 바꾸고 💾 저장을 눌러야 서버에 저장돼요 (저장 뒤 서버에서 다시 읽어 확인) */
document.addEventListener('change', e => {
  const i = e.target; if (!i.dataset || !i.dataset.feat || !i.closest('.ra')) return;
  const lb = i.closest('.ra-ft'); if (lb) lb.classList.toggle('off', !i.checked);
  const d = document.getElementById('featDirty'); if (d) d.style.display = '';
});
async function featSave(){
  const f = {}; document.querySelectorAll('.ra [data-feat]').forEach(c => { if (c.dataset.feat === 'pause'){ if (c.checked) f.pause = true; } else if (!c.checked) f[c.dataset.feat] = false; });
  const b = document.getElementById('featSave'); if (b){ b.disabled = true; b.textContent = '저장하는 중…'; }
  const ok = await ops([{ op:'featSet', features: f }], f.pause ? '⏸ 학생 앱을 전체 멈췄어요' : '🎛️ 저장했어요');
  if (!ok){ if (b){ b.disabled = false; b.textContent = '💾 저장'; } alert('저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'); return; }
  rer('feat', true);
}
document.addEventListener('change', e => { if (e.target && e.target.id === 'limEvent') limSave(e.target.checked ? '🎉 오늘은 전부 무제한!' : '이벤트를 껐어요'); });
document.addEventListener('click', async e => {
  if (e.target.closest('#limSave, #limSave2')){ limSave(); return; }
  if (e.target.closest('#featSave')){ featSave(); return; }
  if (e.target.closest('#limSweep')){
    const dry = await tCall({ action:'classSweep', dry: true }); if (!dry || !dry.ok){ alert('서버 코드를 최신(v61)으로 배포해야 해요'); return; }
    if (!dry.list.length){ alert('오늘 수업 시간에 채집 · 팔기를 한 친구가 없어요'); return; }
    if (!confirm('오늘 수업 시간에 채집 · 팔기를 한 친구예요. 압수할까요?\n\n' + dry.list.map(x => `${x.name}: 코인 -${x.coins} · EXP -${(x.exp || 0) + (x.expq || 0)} · 가방 아이템 ${x.items}개 압수 · 오늘 채집 금지`).join('\n'))) return;
    const r = await tCall({ action:'classSweep' }); if (r && r.ok){ toast(`🚨 ${r.list.length}명 압수했어요`); rer('limit', true); } return;
  }
  { const ub = e.target.closest('[data-unban]'); if (ub){ const code = prompt(`${ub.dataset.unban} 압수를 풀려면 관리자 또는 부관리자 비밀번호를 넣어 주세요`); if (!code) return; const r = await tCall({ action:'unban', name: ub.dataset.unban, code }); if (r && r.ok && !r.error){ toast('🔓 풀었어요'); rer('limit', true); } else alert(r && r.error === 'wrong' ? '비밀번호가 맞지 않아요' : '풀지 못했어요'); return; } }
  { const u = e.target.closest('[data-limun]'); if (u){ const i = document.querySelector(`.ra [data-lim="${u.dataset.limun}"]`); if (i) i.value = '0'; return; } }
  const t = e.target; if (!t.closest || !t.closest('#tBox')) return;
  const tab = typeof tTab !== 'undefined' ? tTab : '', kids = tKids();
  const rq = t.closest('[data-rq]'); if (rq){ await ops([{ op:'reqDone', id: Number(rq.dataset.rq), ok: rq.dataset.ok === '1' }], '처리했어요'); rer(tab, true); return; }
  const mu = t.closest('[data-mundo]'); if (mu){ if (!confirm('이 미션 성공을 취소할까요?\n받은 냥코인과 EXP가 빠지고, 같은 기간에는 다시 받을 수 없어요.')) return; await ops([{ op:'missionUndo', id: Number(mu.dataset.mundo) }], '↩ 취소했어요'); rer(tab, true); return; }
  const sg = t.closest('[data-rsig]'); if (sg){ try { const j = await tCall({ action:'sig', id: Number(sg.dataset.rsig) }); const img = j && j.sig; if (img) bOpen('msOv', `<h2>✍️ 서명</h2><img src="${esc(img)}" style="max-width:100%;background:#fff;border:2px solid var(--ink);border-radius:12px;">${j.subj ? `<p>${esc(j.subj)}</p>` : ''}`); else toast('서명이 없어요'); } catch(err){ toast('서명을 불러오지 못했어요'); } return; }
  const pk = t.closest('[data-rpick]'); if (pk){ const n = pk.dataset.rpick; RA.pick.has(n) ? RA.pick.delete(n) : RA.pick.add(n); rer(tab); return; }
  const al = t.closest('[data-rall]'); if (al){ RA.pick = al.dataset.rall === '1' ? new Set(kids) : new Set(); rer(tab); return; }
  const who = [...RA.pick].filter(n => kids.includes(n));
  if (t.closest('#raCoinGo')){
    const v = parseInt($('raAmt').value, 10), why = ($('raWhy').value || '').trim() || '선생님 지급';
    if (!v){ toast('줄 냥코인을 적어 주세요 (빼려면 -20처럼)'); return; } if (!who.length){ toast('받을 친구를 골라 주세요'); return; }
    if (!confirm(`${who.length}명에게 ${sgn(v)}🐾 (${why}) 줄까요?`)) return;
    const tag = Date.now().toString(36);
    if (await ops(who.map(n => ({ op:'coinAdd', name: n, amt: v, why, kind:'선생님', key:`bulk:${tag}:${n}` })), `🐾 ${who.length}명 ${sgn(v)} · ${why}`)) $('raAmt').value = '';
    return;
  }
  if (t.closest('#raExpGo')){
    const v = parseInt($('raExp').value, 10), why = ($('raExpWhy').value || '').trim() || '선생님 지급';
    if (!v){ toast('줄 경험치를 적어 주세요 (빼려면 -5처럼)'); return; } if (!who.length){ toast('받을 친구를 골라 주세요'); return; }
    if (!confirm(`${who.length}명에게 ${sgn(v)} EXP (${why}) 줄까요?`)) return;
    if (await ops([{ op:'expGive', names: who, exp: v, why: '✨ ' + why }], `✨ ${who.length}명 ${sgn(v)} EXP`)) $('raExp').value = '';
    return;
  }
  if (t.closest('#raMisGo')){
    const mid = $('raMis').value, m = ((RA.data.eco || {}).missions || []).find(x => x.id === mid);
    if (!m || !who.length){ toast('미션과 받을 친구를 골라 주세요'); return; }
    if (!confirm(`${who.length}명에게 "${m.name}" 성공을 줄까요?`)) return;
    await ops([{ op:'missionGive', mid, names: who }], `🎯 ${who.length}명 · ${m.name}`); return;
  }
  const aj = t.closest('[data-radjgo]'); if (aj){
    const n = aj.dataset.radjgo, v = parseInt(document.querySelector(`[data-radj="${CSS.escape(n)}"]`).value, 10);
    if (!v){ toast('더하거나 뺄 코인을 적어 주세요 (예: -20)'); return; }
    await ops([{ op:'coinAdd', name: n, amt: v, why:'선생님 조정', kind:'선생님', key:'' }], `🐾 ${n} ${sgn(v)}`); rer(tab, true); return;
  }
  if (t.closest('#raReset')){
    const bal = (RA.data.coins || {}).balances || {}, list = kids.filter(n => Number(bal[n]) || 0);
    if (!list.length){ toast('이미 모두 0이에요'); return; }
    if ((prompt(`⚠️ 학생 ${list.length}명의 냥코인을 모두 0으로 만들어요. (되돌릴 수 없어요)\n시트 기록은 남고 '전체 초기화' 줄이 더해져요.\n\n계속하려면 '초기화'라고 적어 주세요.`) || '').trim() !== '초기화') return;
    const tag = Date.now().toString(36);
    await ops(list.map(n => ({ op:'coinAdd', name: n, amt: -Number(bal[n]), why:'🧹 냥코인 전체 초기화', kind:'초기화', key:`reset:${tag}:${n}` })), `🧹 ${list.length}명을 0으로`); rer(tab, true); return;
  }
  if (t.closest('#raPurge')){
    const before = (prompt('언제 전의 기록을 지울까요? (YYYY-MM-DD HH:MM)\n이 시각 전의 냥코인 기록과 보너스 EXP(미션 · 선생님 조정)가 지워져요.\n출석해서 받은 EXP는 그대로 남아요.', '2026-11-25 08:00') || '').trim();
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(before)){ if (before) toast('2026-11-25 08:00 처럼 적어 주세요'); return; }
    let dry, xp; try { dry = await tCall({ action:'coinPurge', before, dry: true }); xp = await tCall({ action:'expInfo' }); } catch(err){ dry = null; }
    if (!dry || !dry.ok){ toast('서버 코드를 최신으로 배포해 주세요'); return; }
    const [bd, bt] = before.split(' '), ex = ((xp && xp.bonus) || []).filter(b => b.ds < bd || (b.ds === bd && String(b.t || '00:00') < bt));
    const expSum = {}; ex.forEach(b => { expSum[b.who] = (expSum[b.who] || 0) + (Number(b.exp) || 0); });
    const ct = Object.entries(dry.sum || {}).map(([n, v]) => `${n} ${sgn(v)}🐾`).join(', ') || '없음', et = Object.entries(expSum).map(([n, v]) => `${n} ${sgn(v)}`).join(', ') || '없음';
    if ((prompt(`🧪 ${before} 전의 기록을 지워요. (되돌릴 수 없어요)\n\n🐾 냥코인 기록 ${dry.n}줄: ${ct}\n✨ 보너스 EXP ${ex.length}개: ${et}\n\n계속하려면 '지우기'라고 적어 주세요.`) || '').trim() !== '지우기') return;
    const r = await tCall({ action:'coinPurge', before });
    if (ex.length) await ops(ex.map(b => ({ op:'bonusDel', ds: b.ds, id: b.id })));
    toast(`냥코인 ${r && r.ok ? r.n : 0}줄 · EXP ${ex.length}개를 지웠어요`); rer(tab, true); return;
  }
  if (t.closest('#raEcoSave')){ ecoSave(); return; }
  const xn = t.closest('[data-rxp]'); if (xn){ RA.xpName = xn.dataset.rxp; rer(tab); return; }
  const xa = t.closest('[data-rxadd]'); if (xa){ xpGive(+xa.dataset.rxadd, '👑 선생님 조정'); return; }
  if (t.closest('#raXgo')){ const v = parseInt($('raXv').value, 10); if (!v){ toast('EXP를 적어 주세요'); return; } xpGive(v, ($('raXwhy').value || '').trim() || '👑 선생님 조정'); return; }
  const xl = t.closest('[data-rxlv]'); if (xl){
    const x = RA.data.xp || {}, me = (x.priv || {})[RA.xpName] || {}, target = (x.th || [])[+xl.dataset.rxlv - 1];
    if (target == null) return; const d = target - (Number(me.exp) || 0); if (!d){ toast('이미 그 레벨 시작이에요'); return; }
    xpGive(d, `👑 레벨 ${xl.dataset.rxlv}로 맞추기`); return;
  }
});
async function xpGive(v, why){
  const n = RA.xpName; if (!n) return;
  if (!confirm(`${n}에게 ${sgn(v)} EXP (${why}) 줄까요?`)) return;
  if (await ops([{ op:'expGive', names: [n], exp: v, why }], `✨ ${n} ${sgn(v)} EXP · 출석부가 곧 더해요`)){
    const P = (RA.data.xp || {}).priv || {}; if (P[n]) P[n].exp = (Number(P[n].exp) || 0) + v; rer('xp');
  }
}
async function ecoSave(){
  const old = RA.data.eco; if (!old) return;
  const catMap = { '매일':'daily', '매주':'weekly', '특별':'all' }, limMap = { daily:'day', weekly:'week', all:'once' }, missions = [];
  let bad = 0;
  $('raMissions').value.split('\n').forEach((line, li) => {
    if (!line.trim()) return;
    const p = line.split(',').map(x => x.trim()); if (p.length < 3 || !p[1]){ bad++; return; }
    const cat = catMap[p[0]] || 'daily', coins = parseInt(p[2], 10); if (isNaN(coins)){ bad++; return; }
    const om = old.missions || [], byIdx = om[li] && om[li].cat === cat && !missions.some(m => m.id === om[li].id) ? om[li] : null;
    const o = om.find(m => m.name === p[1]) || byIdx;
    const exp = parseInt(p[3], 10), rest = p.slice(isNaN(exp) ? 3 : 4), capM = rest.join(' ').match(/(\d+)\s*명/);
    const m = Object.assign({}, o || {}, { id: o ? o.id : slug('m', p[1]), cat, name: p[1], coins, req: (rest[0] || '').toUpperCase() === 'O', limit: o ? o.limit : limMap[cat] });
    if (!isNaN(exp)) m.exp = exp;
    if (capM) m.cap = Number(capM[1]); else delete m.cap;
    const hw = document.querySelector(`[data-rmhow="${CSS.escape(m.id)}"]`), hv = hw ? hw.value.trim() : (m.how || '');
    if (hv) m.how = hv.slice(0, 300); else delete m.how;
    missions.push(m);
  });
  const coupons = [];
  $('raCoupons').value.split('\n').forEach(line => {
    const p = line.split(',').map(x => x.trim()); if (p.length < 2 || !p[0]) return;
    const price = parseInt(p[1], 10); if (isNaN(price)){ bad++; return; }
    const o = (old.shop || []).find(x => x.cat === 'coupon' && x.name === p[0]);
    const it = Object.assign({}, o || {}, { id: o ? o.id : slug('c', p[0]), cat:'coupon', name: p[0], price }); delete it.stock; delete it.real;
    const stv = parseInt(p[2], 10); if (stv > 0) it.stock = stv; if (p.slice(2).some(x => /^(실물|o|O|아이템)$/.test(x))) it.real = true;
    coupons.push(it);
  });
  const village = (old.shop || []).filter(x => x.cat !== 'coupon').map(x => {
    const el = document.querySelector(`[data-rprice="${CSS.escape(x.id)}"]`), pr = el ? parseInt(el.value, 10) : NaN, on = document.querySelector(`[data-roff="${CSS.escape(x.id)}"]`);
    const it = Object.assign({}, x, { price: isNaN(pr) ? x.price : pr }); if (on && !on.checked) it.off = true; else delete it.off; return it;
  });
  const hours = {}; [1, 2, 3, 4, 5].forEach(i => { const a = document.querySelector(`[data-rgh0="${i}"]`).value, b = document.querySelector(`[data-rgh1="${i}"]`).value; if (a && b) hours[i] = [a, b]; });
  if (!missions.length){ toast('미션이 하나도 없어요. 적은 걸 확인해 주세요'); return; }
  if (bad && !confirm(`형식이 맞지 않는 줄 ${bad}개는 빠져요. 저장할까요?`)) return;
  const eco = Object.assign({}, old, { missions, shop: coupons.concat(village),
    pickLimit: { daily: Math.max(1, parseInt($('raPickD').value, 10) || 3), weekly: Math.max(1, parseInt($('raPickW').value, 10) || 3) },
    meeting: { pres: $('raPres').value, vice: $('raVice').value, agenda: $('raAgenda').value.trim() },
    game: Object.assign({}, old.game || {}, { maxBet: Math.max(1, parseInt($('raMaxBet').value, 10) || 30), daily: Math.max(1, parseInt($('raDaily').value, 10) || 5), hours }) });
  const j = await ops([{ op:'ecoSet', economy: eco }], '💾 미션 · 상점을 저장했어요');
  if (j){ RA.data.eco = Object.assign(eco, { rev: j.ecoRev || ((old.rev || 0) + 1) }); rer('eco'); }
}

const css = document.createElement('style');
css.textContent = `
.ra .ra-row{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1.5px dashed #EFE3D3;padding:6px 2px;flex-wrap:wrap;}
.ra .np-btn.ok{background:#C9F0DC;} .ra .np-btn.no{background:#FFD9E0;}
.ra-pause{display:flex;align-items:center;gap:10px;background:#FFE3E8;border:3px solid var(--ink);border-radius:16px;padding:10px 14px;margin:4px 0 10px;font-size:1.05rem;} .ra-pause input{width:22px;height:22px;}
.ra-g{margin:12px 0 6px;color:var(--ink-soft);}
.ra-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;}
.ra-ft{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:14px;background:#fff;padding:7px 10px;cursor:pointer;} .ra-ft small{display:block;color:var(--ink-soft);font-size:.76rem;} .ra-ft.off{background:#EFE8DE;color:#A8978A;} .ra-ft input{width:19px;height:19px;}
.ra-pick{display:flex;flex-wrap:wrap;gap:6px;} .ra-pick button{font-family:inherit;border:2px solid var(--ink);border-radius:999px;background:#fff;padding:3px 11px;cursor:pointer;color:var(--ink);} .ra-pick button.on{background:#FFE58A;}
.ra-line{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0;} .ra-line input[type=text]{flex:1;min-width:150px;} .ra-line input,.ra-line select,.ra-it input,.ra-t input{font-family:inherit;font-size:1rem;border:2px solid #D9C9B6;border-radius:10px;padding:5px 8px;}
.ra-line input[type=number]{width:130px;} .ra-line select{max-width:100%;}
.ra-btns{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.ra-ta{width:100%;box-sizing:border-box;font-family:inherit;font-size:.95rem;border:2px solid #D9C9B6;border-radius:12px;padding:8px;line-height:1.6;}
.ra-mh{margin:8px 0;} .ra-mh small{color:var(--ink-soft);}
.ra-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;} .ra-it{display:flex;flex-direction:column;gap:3px;border:1.5px solid #E6D9CA;border-radius:12px;padding:6px 8px;background:#fff;font-size:.9rem;} .ra-it input[type=number]{width:90px;}
.ra-t{width:100%;border-collapse:collapse;} .ra-t td,.ra-t th{border-bottom:1.5px dashed #EFE3D3;padding:5px 4px;text-align:left;} .ra-t th{color:var(--ink-soft);font-weight:normal;}
`;
document.head.appendChild(css);
})();
