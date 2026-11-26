/**
 * 🐾 냥냥 출석 아일랜드 — 구글 시트 동기화 서버 (v32 · ⚙️ 학생 화면 설정을 시내쌤 관리로 · v31 🏘️ 마을 소식 · v30 ✨📢 마을 공지 켜기/끄기·시간 · v29 🟢 지금 접속 중 · v28 👑 학생용 출석부 비밀 관리자 전환 · v27 🧹 청소 당번 이유별 색 · v26 💤 접속 금지 시간 · v25 🚫 비속어 단계별 제한·애교 말로 바꾸기·선생님 알림 · v24 안내 사이트 버전·업데이트 내역 · 이전: 💡 마을 개선 의견 게시판·입장 코드 모두 다시 입력·로그인 전 선생님께 연락·보기 전용에 말풍선·청소당번·시간표·영어 다시 풀기(연습)·선생님 귓속말 보기 · 📓 관리 수첩(욕설·수업 지각)·출석부 입장 코드·보기 전용·💬 내 상태·빈 명단 덮어쓰기 막기·욕설 거르기 강화·마을 놀이 하루 20번·선생님 냥이 모든 아이템·캐시로 빠르게·잠금 줄이기·선생님 집 꾸미기 무제한·학급회의 칠판·선생님 마법·서버 시계 맞추기·학교 계정으로 이사·속성 캐시·하나 하루 5번·회의 단상·영어 학원)
 *
 * 이 코드를 구글 시트의 [확장 프로그램] → [Apps Script]에 붙여넣고
 * [배포] → [새 배포] (이미 배포했다면 [배포 관리] → ✏️ → 새 버전)
 *   유형: 웹 앱 / 실행: 나 / 액세스: 모든 사용자
 * 나온 웹 앱 주소(…/exec)를 출석부 ⚙️ 설정 → ☁️ 동기화 칸에 붙여넣으면 끝!
 *
 * 시트 구성 (자동으로 만들어져요)
 *  - 중요공지 : A2칸부터 적으면 출석부 '📌 중요 공지' 칸에 떠요. 비우면 내려가요.
 *  - 알림 : A2칸부터 한 줄에 하나씩 적으면 모든 화면의 '오늘의 알림'에 떠요.
 *  - 종례 : A2칸부터 한 줄에 하나씩 적으면 '종례하기' 화면과 학생 페이지에 떠요.
 *  - 학급회의 : A2칸에 회의 주제, B2칸부터 안건을 한 줄에 하나씩 적으면 출석부 '🗳️ 학급회의' 칠판에 떠요.
 *  - 대화 : 학생 페이지 '우리 반 대화'(귓속말 포함) 기록이에요. 선생님은 모두 볼 수 있어요.
 *  - 건의함 : 학생이 보낸 질문·건의와 선생님 답변이에요.
 *  - 냥코인 : 냥코인이 들어오고 나간 모든 기록(통장)이에요. 잔액은 이 기록을 더해서 계산해요.
 *  - 신청 : 학생의 미션 완료 신청 · 쿠폰 사용 신청이에요. 선생님이 확인하면 상태가 바뀌어요.
 *  - data : 출석부 데이터 저장용이에요. 직접 고치지 마세요.
 *
 * 🔐 보안 (v3)
 *  - 교사 열쇠가 있는 기기(교실 TV 등)만 출석·설정·EXP를 바꿀 수 있어요.
 *  - 학생 페이지는 '공개 정보'만 받고, 비밀번호가 맞을 때 본인 고양이 꾸미기와 알림 확인만 할 수 있어요.
 *  - 학생 비밀번호와 교사 열쇠는 암호화(해시)해서 스크립트 속성에 보관해요. 시트에는 저장되지 않아요.
 */
const DATA_SHEET = 'data';
const NOTICE_SHEET = '알림';
const NOTICE_HEADER = '📢 오늘의 알림 — A2칸부터 한 줄에 하나씩 적으세요 (모든 화면에 자동 반영)';
const CLOSING_SHEET = '종례';
const MEETING_SHEET = '학급회의';
const URGENT_SHEET = '중요공지', URGENT_HEADER = '📌 중요 공지 (A2칸부터 한 줄에 하나 · 비우면 내려가요)';
const CLOSING_HEADER = '📋 종례 — A2칸부터 한 줄에 하나씩 적으세요 (종례하기 화면에 자동 반영)';
const API_VERSION = 46;   // ⬆️ 서버 코드를 고칠 때마다 올려요 (출석부가 '업데이트 필요'를 알려 줘요)
const COIN_SHEET = '냥코인', COIN_HEADER = ['번호', '시간', '이름', '코인', '내용', '구분', '중복키'];
const REQ_SHEET = '신청', REQ_HEADER = ['번호', '시간', '이름', '종류', '항목', '코인', '상태', '처리 시간', '항목ID'];
const EMOTES = ['👋', '💛', '😂', '😮', '🎉', '😭', '👍', '🐾', '💤', '🎣', '💧', '😺', '📸', '🙋', '✋'];
// 🪑 앉을 수 있는 자리 수 — 마을 화면(index.html의 V_OBJS · HALL_TABLES)과 같아야 해요
const SEAT_CAP = {
  out: { fountain: 4, bench1: 2, bench2: 2, longbench: 4, tower: 3, scratch: 1, hammock: 1, box1: 1, box2: 1, sun: 3, pond: 2, churu: 1, swing: 2, cushions: 3, yarn: 1, photo: 6, slide: 1 },
  hall: { T1: 4, T2: 4, T3: 4, T4: 4, T5: 4, T6: 5, PRES: 1, VICE: 1 },
  west: { umb1: 2, umb2: 2, umb3: 2, boat: 3, rock: 2, castle: 2, surf: 1 },
  east: { camp: 5, logs: 3, mush: 3, swing2: 1, stump: 1 },
  south: { park: 3, sandbox: 2 },
  eng: { D1: 1, D2: 1, D3: 1, D4: 1, D5: 1, D6: 1, D7: 1, D8: 1, D9: 1, D10: 1, D11: 1, D12: 1 },
  cafe: { C1: 1, C2: 1, C3: 1, C4: 1, C5: 1, C6: 1, C7: 1, C8: 1, C9: 1, C10: 1 }
};
const HOUSE_ORDER = ['h_box', 'h_tent', 'h_cabin', 'h_cottage', 'h_castle'];
const HANA_LV = [0, 20, 60, 120, 200, 320];
const HANA_DAILY = 5;          // 🐱 하나와는 하루에 5번까지 놀 수 있어요
const CHAT_SHEET = '대화', CHAT_HEADER = ['번호', '시간', '보낸 사람', '받는 사람(빈칸=전체)', '내용', '상태'];
const SIG_SHEET = '서명', SIG_HEADER = ['신청번호', '과목', '서명'];
const MAIL_SHEET = '편지함', MAIL_HEADER = ['번호', '시간', '보낸 사람', '받는 사람', '종류', '내용(가림)', '읽음', '확인', '미션', '도착'];
const DIARY_SHEET = '일기장', DIARY_HEADER = ['번호', '날짜', '이름', '내용(가림)', '시간'];
const MENU_SHEET = '급식번역', MENU_HEADER = ['번호', '날짜', '이름', '영어 메뉴', '상태', '시간'];
const STORY_SHEET = '스토리답', STORY_HEADER = ['스토리', '이름', '답', '시간'];
const IDEA_SHEET = '마을의견', IDEA_HEADER = ['번호', '시간', '보낸 사람', '익명', '비밀', '내용', '좋아요', '상태'];
const ASK_SHEET = '건의함', ASK_HEADER = ['번호', '시간', '보낸 사람', '종류', '내용', '익명', '답변', '답변 시간', '상태'];
// 기본 금지어 (선생님이 설정에서 더 넣을 수 있어요) — 걸리면 민망한 애교 말로 바뀌어요
const BASE_BAN = ['시발', '씨발', '씨빨', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '븅신', '개새', '새끼', 'ㅅㄲ', '지랄', 'ㅈㄹ', '좆', '존나', 'ㅈㄴ',
  '닥쳐', '꺼져', '미친놈', '미친년', '엠창', '니애미', '느금', '애미', '애비', '꼴통', '찐따', '장애인새', '죽어'];
const MAX_FAIL = 5, LOCK_MINUTES = 10;
const VILLAGE_ACT_DAILY = 20;   // 🎣 마을 놀이(츄르 뽑기·낚시·마시멜로 등) 하루 횟수

// 학생이 직접 고를 수 있는 꾸미기 (레벨 · 자리 · 색 개수) — 출석부 화면의 ITEMS와 같아야 해요
const ITEM_RULES = {
  eye:      { lv: 1,  slot: 'eye',   n: 7 },
  mouth:    { lv: 1,  slot: 'mouth', n: 5 },
  sprout:   { lv: 2,  slot: 'top',   n: 6 },
  bow:      { lv: 3,  slot: 'earR',  n: 6 },
  scarf:    { lv: 4,  slot: 'neck',  n: 6 },
  fur5:     { lv: 5,  slot: 'fur',   n: 11 },
  flower:   { lv: 5,  slot: 'earL',  n: 5 },
  starclip: { lv: 6,  slot: 'earR',  n: 5 },
  wings:    { lv: 7,  slot: 'back',  n: 5 },
  crown:    { lv: 8,  slot: 'top',   n: 5 },
  wizard:   { lv: 9,  slot: 'top',   n: 5 },
  fur:      { lv: 10, slot: 'fur',   n: 6 },
  tfur:     { lv: 1,  slot: 'fur',   n: 5, teacher: true }     // 👑 선생님 전용 털빛
};
const LOOK_SLOTS = ['eye', 'mouth', 'top', 'earR', 'earL', 'neck', 'back', 'fur'];

/* ---------------- 입구 ---------------- */
function doGet(e) {
  propsW_ = null;
  try {
    const mv = props_().getProperty('movedTo'); if (mv) return out_({ ok: false, error: 'moved', movedTo: mv, api: API_VERSION });
    return out_(publicGet_((e && e.parameter) || {}));
  }
  catch (err) { return out_(busyOut_(err)); }
}

function doPost(e) {
  propsW_ = null;
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const mv = props_().getProperty('movedTo'); if (mv) return out_({ ok: false, error: 'moved', movedTo: mv, api: API_VERSION });
    if (body.action === 'student') return out_(handleStudent_(body));
    if (body.action === 'sos') return out_(sos_(body));
    if (body.action === 'tpass') return out_(tpass_(body));
    if (body.action === 'mealSet') return out_(mealSet_(body));   // 🍱 급식 관리자 (오늘 급식만)
    if (body.action === 'menuTrList' || body.action === 'menuTrOk') { if (!mealAuth_(body.mpin)) return out_({ ok: false, error: 'wrong' }); if (body.action === 'menuTrOk') menuTrSet_(body.id, !!body.ok); return out_({ ok: true, list: menuTrList_() }); }    // 👑 선생님 통과 (마스터 관리자 비밀번호)          // 🚨 로그인 없이 선생님께 긴급 메시지
    let auth;
    if (body.tmode && body.name && isTeacherName_(body.name)) {   // 👑 학생 페이지에 'OO쌤'으로 로그인하면 관리자
      const c = checkStudent_(String(body.name), body.pin);
      auth = c.ok ? { ok: true, needKey: false } : { ok: false };
    } else if (body.apin) auth = apinAuth_(body.apin);
    else auth = teacherAuth_(body.key);
    if (!auth.ok) return out_({ ok: false, error: 'auth', api: API_VERSION });
    if (body.tmode && auth.needKey) return out_({ ok: false, error: 'nokey', api: API_VERSION });   // 학생 페이지 선생님 모드는 열쇠가 꼭 있어야 해요
    if (body.action === 'pull') return out_(teacherPull_(body, auth));
    if (body.action === 'chat') { const reps = wReports_(); return out_({ ok: true, cfg: chatCfg_(), msgs: readChat_(Number(body.after || 0), function (m) { return teacherSees_(m, reps, ''); }).map(function (m) { return markRep_(m, reps); }), reports: reps.slice(-30) }); }   // 🤫 귓속말은 신고된 것만
    if (body.action === 'presence') return out_(presence_());
    if (body.action === 'stuCfg') return out_({ ok: true, cfg: stuCfg_(), strikes: strikes_() });
    if (body.action === 'asks') return out_({ ok: true, asks: readAsks_(function () { return true; }) });
    if (body.action === 'coins') return out_(teacherCoins_());
    if (body.action === 'story') return out_(storyView_('선생님'));
    if (body.action === 'menuTr') return out_({ ok: true, list: menuTrList_() });
    if (body.action === 'sig') { const sh = sheet_(SIG_SHEET, SIG_HEADER), n = sh.getLastRow(), r = n < 2 ? null : sh.getRange(2, 1, n - 1, 3).getValues().filter(function (x) { return Number(x[0]) === Number(body.id); })[0]; return out_({ ok: true, subj: r ? String(r[1]) : '', sig: r ? String(r[2]) : '' }); }   // ✍️ 학습태도 서명 보기
    if (body.action === 'engUpload') return out_(engUpload_(body));
    if (body.action === 'engResults') return out_(engResults_());
    if (body.action === 'backup') return out_(backupAll_());
    if (body.action === 'today') {           // 📱 선생님 모드(학생 페이지): 오늘 출석 현황
      const map = readRows_().map, ds = todayStr_();
      return out_({ ok: true, ds: ds, records: ((map['day:' + ds] || {}).records) || {}, remote: remoteList_().map(function (x) { return x.n; }),
        students: ((map.pub || {}).students || []).map(function (x) { return x.name; }), mega: megaList_(), banners: todayList_('banners'), butler: butlerToday_(), songs: todayList_('songs') });
    }
    if (body.action === 'free') {
      if (body.set) {
        const f = free_();
        ['chat', 'game'].forEach(function (k) { if (body.set[k] !== undefined) f[k] = Math.max(0, Number(body.set[k]) || 0); });
        props_().setProperty('free', JSON.stringify(f));
      }
      return out_({ ok: true, free: free_(), now: Date.now(), chatCfg: chatCfg_() });
    }
    return out_(handlePost_(body, auth));
  } catch (err) { return out_(busyOut_(err)); }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- 공통 도구 ---------------- */
/* 속성 저장소: 읽기는 캐시를 먼저 봐서 구글 하루 한도(속성 읽기·쓰기)를 아껴요 */
const PROPS_NONE_ = '\u0000';
let propsW_ = null;
/* 🔒 잠금: 읽기만 하는 요청은 잠그지 않고, 마을 이동·대화처럼 가벼운 일은 출석부 잠금과 따로 써요 (서로 기다리지 않게) */
const NOLOCK_ = { releaseLock: function () {} };
function lockFor_(need, ms) {
  if (!need) return NOLOCK_;
  const l = LockService.getScriptLock(); l.waitLock(ms); return l;
}
function lightLock_(ms) {
  let l = null; try { l = LockService.getDocumentLock(); } catch (e) {}
  if (!l) l = LockService.getScriptLock();
  l.waitLock(ms); return l;
}
function busyOut_(err) {
  const m = String(err);
  return /잠금|lock|timed out|시간초과/i.test(m) ? { ok: false, error: 'busy', msg: '서버가 잠깐 바빠요' } : { ok: false, error: m };
}
function props_() {
  if (propsW_) return propsW_;
  const P = PropertiesService.getScriptProperties(), C = CacheService.getScriptCache(), memo = {};
  propsW_ = {
    getProperty: function (k) {
      if (k in memo) return memo[k];
      let v = C.get('P:' + k);
      if (v === null) { v = P.getProperty(k); try { C.put('P:' + k, v === null ? PROPS_NONE_ : v, 300); } catch (e) {} }   // 읽어서 채운 값은 5분만 (동시에 바뀌어도 오래 꼬이지 않게)
      v = v === PROPS_NONE_ ? null : v; memo[k] = v; return v;
    },
    setProperty: function (k, v) { v = String(v); P.setProperty(k, v); memo[k] = v; try { C.put('P:' + k, v, 21600); } catch (e) { C.remove('P:' + k); } return propsW_; },
    deleteProperty: function (k) { P.deleteProperty(k); memo[k] = null; try { C.put('P:' + k, PROPS_NONE_, 21600); } catch (e) {} return propsW_; },
    getProperties: function () { return P.getProperties(); },
    setProperties: function (o) { P.setProperties(o); Object.keys(o).forEach(function (k) { memo[k] = String(o[k]); C.remove('P:' + k); }); return propsW_; }
  };
  return propsW_;
}
function version_() { return Number(props_().getProperty('v') || 0); }
function bump_() { const v = version_() + 1; props_().setProperty('v', String(v)); return v; }

function salt_() {
  let s = props_().getProperty('salt');
  if (!s) { s = Utilities.getUuid(); props_().setProperty('salt', s); }
  return s;
}
function hash_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt_() + '|' + String(text));
  return bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function todayStr_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
}

function sheet_(name, header) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, header.length).setValues([header]);
  }
  return sh;
}
function readNotices_() { return readList_(NOTICE_SHEET, NOTICE_HEADER); }
function writeNotices_(list) { writeList_(NOTICE_SHEET, NOTICE_HEADER, list); }
/* ⚡ 시트 목록(알림·종례·중요공지·학급회의)은 20초 동안 기억해 둬요. 시트에서 직접 고쳐도 20초 안에 반영돼요 */
const LIST_TTL_ = 20;
function readList_(name, header) {
  const k = 'L:' + name;
  try { const hit = cache_().get(k); if (hit) return JSON.parse(hit); } catch (e) {}
  const v = readListRaw_(name, header);
  try { cache_().put(k, JSON.stringify(v), LIST_TTL_); } catch (e) {}
  return v;
}
function readListRaw_(name, header) {
  const sh = sheet_(name, [header]);
  const n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 1).getDisplayValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (t) { return t; });
}
function writeList_(name, header, list) {
  try { cache_().put('L:' + name, JSON.stringify(list.map(String).map(function (t) { return t.trim(); }).filter(function (t) { return t; })), LIST_TTL_); } catch (e) {}
  const sh = sheet_(name, [header]);
  const n = sh.getLastRow();
  if (n >= 2) sh.getRange(2, 1, n - 1, 1).clearContent();
  if (list.length) sh.getRange(2, 1, list.length, 1).setValues(list.map(function (t) { return [String(t)]; }));
}

/* 🗳️ 학급회의 칠판: A2 = 회의 주제, B2부터 = 안건 (한 줄에 하나) */
function readMeeting_() {
  try { const hit = cache_().get('L:' + MEETING_SHEET); if (hit) return JSON.parse(hit); } catch (e) {}
  const v = readMeetingRaw_();
  try { cache_().put('L:' + MEETING_SHEET, JSON.stringify(v), LIST_TTL_); } catch (e) {}
  return v;
}
function readMeetingRaw_() {
  const sh = sheet_(MEETING_SHEET, ['🗳️ 회의 주제 (A2)', '📝 안건 (B2부터 한 줄에 하나)']);
  const n = sh.getLastRow();
  if (n < 2) return { title: '', items: [] };
  const v = sh.getRange(2, 1, n - 1, 2).getDisplayValues();
  return { title: String(v[0][0] || '').trim(), items: v.map(function (r) { return String(r[1] || '').trim(); }).filter(function (t) { return t; }) };
}
function writeMeeting_(title, items) {
  try { cache_().put('L:' + MEETING_SHEET, JSON.stringify({ title: String(title || '').slice(0, 60), items: items.map(function (t) { return String(t).slice(0, 80); }).filter(function (t) { return t.trim(); }) }), LIST_TTL_); } catch (e) {}
  const sh = sheet_(MEETING_SHEET, ['🗳️ 회의 주제 (A2)', '📝 안건 (B2부터 한 줄에 하나)']);
  const n = sh.getLastRow();
  if (n >= 2) sh.getRange(2, 1, n - 1, 2).clearContent();
  sh.getRange(2, 1).setValue(String(title || '').slice(0, 60));
  if (items.length) sh.getRange(2, 2, items.length, 1).setValues(items.map(function (t) { return [String(t).slice(0, 80)]; }));
}
/* 🛡️ 아무것도 안 바꾼 처음 상태(명단이 친구1~5뿐)인지 */
function looksDefault_(cfg) {
  const st = (cfg && cfg.students) || [];
  return !cfg || !st.length || st.every(function (n) { return /^친구\d+$/.test(String(n)); });
}
function pubDefault_(pub) {
  const st = (pub && pub.students) || [];
  return !st.length || st.every(function (x) { return /^친구\d+$/.test(String((x && x.name) || x)); });
}
function readRows_() {
  const sh = sheet_(DATA_SHEET, ['key', 'json', 'updated']);
  const n = sh.getLastRow();
  const map = {}, rows = {};
  if (n >= 2) {
    sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r, i) {
      if (!r[0]) return;
      rows[r[0]] = i + 2;
      try { map[r[0]] = JSON.parse(r[1]); } catch (err) {}
    });
  }
  return { sh: sh, map: map, rows: rows };
}
function writeRows_(db, keys) {
  const now = new Date();
  keys.forEach(function (k) {
    const row = [k, JSON.stringify(db.map[k]), now];
    if (db.rows[k]) db.sh.getRange(db.rows[k], 1, 1, 3).setValues([row]);
    else { db.sh.appendRow(row); db.rows[k] = db.sh.getLastRow(); }
  });
}

/* ---------------- 🔐 교사 열쇠 ---------------- */
/* 👑 학생용 출석부 → 관리자 출석부: 관리자 · 부관리자 · 지각 관리자 비밀번호로도 열 수 있어요 (틀리면 10분에 10번까지) */
function apinAuth_(pin) {
  const c = cache_(), f = Number(c.get('apinfail') || 0);
  if (f >= 10) Utilities.sleep(3000);   // 많이 틀리면 느려지기만 해요 (선생님은 맞는 비밀번호로 언제든 들어와요)
  let list = null; try { list = JSON.parse(props_().getProperty('apins') || 'null'); } catch (e) {}
  if (!list) {      // 처음 한 번: 설정에서 비밀번호를 읽어 와요
    const cf = readRows_().map.config || {};
    list = ['adminPin', 'subPin', 'latePin'].map(function (k) { return cf[k] ? hash_('P:' + cf[k]) : ''; }).filter(String);
    try { props_().setProperty('apins', JSON.stringify(list)); } catch (e) {}
  }
  if (pin && list.indexOf(hash_('P:' + String(pin))) >= 0) return { ok: true, needKey: false };
  try { c.put('apinfail', String(f + 1), 600); } catch (e) {}
  return { ok: false };
}
/* 👑 선생님 통과: 마스터 관리자 비밀번호면 이 기기는 잠자는 시간·입장 코드를 건너뛰어요 */
function tpass_(body) {
  const c = cache_(), f = Number(c.get('tpassfail') || 0);
  if (f >= 5) Utilities.sleep(Math.min(8000, 1500 * (f - 4)));
  const cf = readRows_().map.config || {}, pin = String(body.tpin || '');
  if (!cf.adminPin || !pin || pin !== String(cf.adminPin)) { try { c.put('tpassfail', String(f + 1), 1800); } catch (e) {} return { ok: false, error: 'wrong' }; }
  return { ok: true, api: API_VERSION, code: String(cf.accessCode || ''), hours: Number(cf.accessHours) || 3, epoch: Number(cf.accessEpoch) || 0 };
}
function teacherAuth_(key) {
  const stored = props_().getProperty('teacherKey');
  if (!stored) return { ok: true, needKey: true };          // 아직 열쇠를 정하지 않았어요
  return { ok: !!key && hash_('T:' + key) === stored, needKey: false };
}

/* ---------------- 공개 정보 (학생 페이지) ---------------- */
function publicState_(map) {
  const pub = map.pub || {};
  const looks = (map.config && map.config.looks) || {};
  const lookAt = map.lookAt || {};
  return {
    title: pub.title || '',
    ds: pub.ds || '',
    clean: pub.clean || [],
    cleanWhy: pub.cleanWhy || {},
    students: (pub.students || []).map(function (s) {
      return { name: s.name, lv: s.lv, lvName: s.lvName, look: looks[s.name] || s.look || {}, lookAt: lookAt[s.name] || 0, status: ((map.statuses || {})[s.name] || {}).t || '' };
    })
  };
}
/* 💤 접속 금지 시간 (선생님이 설정) */
function sleepCfg_() { try { return JSON.parse(props_().getProperty('sleepCfg') || 'null'); } catch (e) { return null; } }
function sleepNow_() {
  const s = sleepCfg_(); if (!s || !s.on || !s.start || !s.end) return false;
  const t = Utilities.formatDate(new Date(), 'Asia/Seoul', 'HH:mm');
  return s.start < s.end ? (t >= s.start && t < s.end) : (t >= s.start || t < s.end);
}
function publicGet_(p) {
  if (p.village) return villageState_();
  if (p.room) return roomState_(String(p.room));
  if (p.card) return cardOf_(String(p.card));
  if (p.board) { if (p.cid) touchAnon_(p.cid); return boardOf_(String(p.gate || '')); }
  if (p.guide) { const sc = stuCfg_(); return { ok: true, api: API_VERSION, ver: String(sc.guideVer || ''), notes: String(sc.guideNotes || ''), sleep: sleepCfg_(), reload: reloadInfo_(), now: Date.now() }; }   // 📖 안내 사이트 버전·업데이트 내역
  if (p.eng) return engPublic_();
  const v = version_();
  const res = { ok: true, api: API_VERSION, now: Date.now(), v: v, notices: readNotices_(), closing: readList_(CLOSING_SHEET, CLOSING_HEADER), urgent: readList_(URGENT_SHEET, URGENT_HEADER) };
  if (p.since === undefined || Number(p.since) !== v) {
    let pub = cacheGet_('pubv:' + v, null);
    if (!pub) { pub = publicState_(readRows_().map); cachePut_('pubv:' + v, pub); }
    res.pub = pub;
  }
  res.hanaLook = hanaLook_(); res.mega = megaList_(); res.butler = butlerToday_(); res.banners = todayList_('banners');
  res.tickerClear = Number(props_().getProperty('tickerClear') || 0);
  { const sc = stuCfg_(); res.sleep = sleepCfg_(); res.closingAt = sc.closingAt || ''; res.ticker = tickerCfg_(); res.news = newsList_(); res.newsOn = sc.news.on; res.newsKinds = sc.news.kinds; res.askOpen = !!sc.askOpen; }
  res.meal = mealPub_(); res.hw = hwPub_(); res.reload = reloadInfo_(); res.mealEn = menuEnToday_(); res.story = storyPub_();
  return res;
}

/* ---------------- 교사: 전체 읽기 ---------------- */
/* 🍱 급식 · 📚 숙제: 출석부와 공지사항 탭에 같이 보여요 (선생님이 출석부에서 써요) */
/* 🔄 모든 기기 새로고침: 선생님이 누르면 1분 뒤 모든 화면이 새 코드로 바뀌어요 (그 전에 알림) */
function reloadInfo_() { const at = Number(props_().getProperty('reloadAt') || 0); return at && at > Date.now() - 300000 ? { at: at, now: Date.now() } : null; }
function mealData_() { try { return JSON.parse(props_().getProperty('meal') || '{}') || {}; } catch (e) { return {}; } }
function hwData_() { try { return JSON.parse(props_().getProperty('hw') || '[]') || []; } catch (e) { return []; } }
function mealPub_() { const m = mealData_(), t = todayStr_(), out = {}; if (m[t]) out[t] = m[t]; return out; }   // 🍱 오늘 것만 (급식 알리미가 따로 있어요)
function hwPub_() { const t = todayStr_(); return hwData_().filter(function (h) { return !h.due || h.due >= t; }); }
function mealSet_(body) {
  const c = cache_(), f = Number(c.get('mpfail') || 0);
  if (f >= 5) Utilities.sleep(Math.min(8000, 1500 * (f - 4)));
  const cf = readRows_().map.config || {}, pin = String(body.mpin || '');
  if (!pin || !((cf.mealPin && pin === String(cf.mealPin)) || (cf.adminPin && pin === String(cf.adminPin)))) { try { c.put('mpfail', String(f + 1), 1800); } catch (e) {} return { ok: false, error: 'wrong' }; }
  const lock = lightLock_(15000);
  try {
    const m = mealData_(), t = todayStr_(), text = String(body.text || '').slice(0, 400).trim();
    if (text) m[t] = text; else delete m[t];
    props_().setProperty('meal', JSON.stringify(m));
  } finally { lock.releaseLock(); }
  return { ok: true, meal: mealPub_() };
}
function teacherPull_(body, auth) {
  const v = version_();
  const res = { ok: true, api: API_VERSION, now: Date.now(), v: v, needKey: auth.needKey, notices: readNotices_(), closing: readList_(CLOSING_SHEET, CLOSING_HEADER), urgent: readList_(URGENT_SHEET, URGENT_HEADER), meeting: readMeeting_() };
  if (body.remoteOk) { res.remote = claimRemote_(); res.expq = claimExp_(); }
  res.lockdown = props_().getProperty('lockdown') === '1';
  res.meal = mealData_(); res.hw = hwData_(); res.reload = reloadInfo_(); res.mealEn = menuEnToday_(); res.menuTrN = readMenuTr_(function (x) { return x.status === '대기'; }).length; res.story = storyPub_();
  res.mega = megaList_(); res.hanaLook = hanaLook_(); res.butler = butlerToday_(); res.banners = todayList_('banners'); res.songs = todayList_('songs');
  if (body.since === undefined || Number(body.since) !== v) {
    const map = readRows_().map;
    const st = { config: map.config || null, days: {}, acks: {}, statuses: map.statuses || {} };
    Object.keys(map).forEach(function (k) {
      if (k.indexOf('day:') === 0) st.days[k.slice(4)] = map[k];
      if (k.indexOf('acks:') === 0) st.acks[k.slice(5)] = map[k];
    });
    res.state = st;
    res.presence = presence_();
    res.megaMin = stuCfg_().mega.min;
    res.strikes = strikes_(); try { res.strikeFeed = JSON.parse(props_().getProperty('strikeFeed') || '[]'); } catch (e) { res.strikeFeed = []; }
    res.asksOpen = readAsks_(function (a) { return !a.reply && !a.del && !a.done; }).length;
    res.counselUrgent = counselUrgent_();
    res.reqOpen = readReqs_(function (r) { return r.status === '대기'; }).length;
    const all = props_().getProperties(), pinSet = [];
    Object.keys(all).forEach(function (k) { if (k.indexOf('pin:') === 0) pinSet.push(k.slice(4)); });
    res.pinSet = pinSet;
  }
  return res;
}

/* ---------------- 교사: 쓰기 ---------------- */
function handlePost_(body, auth) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const db = readRows_();
    const map = db.map, dirty = {};
    let replaced = false, guarded = false;
    const day = function (ds) {
      const k = 'day:' + ds;
      if (!map[k]) map[k] = { records: {}, bonus: [], cleanDone: {} };
      map[k].records = map[k].records || {};
      map[k].bonus = map[k].bonus || [];
      map[k].cleanDone = map[k].cleanDone || {};
      dirty[k] = true;
      return map[k];
    };
    const result = {};
    (body.ops || []).forEach(function (o) {
      switch (o.op) {
        case 'config': {
          if (looksDefault_(o.data) && !looksDefault_(map.config)) { guarded = true; break; }   // 🛡️ 처음 상태(친구1~5) 출석부가 진짜 명단을 덮지 못하게
          const keepLooks = map.config && map.config.looks;
          cacheDrop_(['v:pub']);
          map.config = o.data || {};
          try { const d0 = o.data || {}; props_().setProperty('apins', JSON.stringify(['adminPin', 'subPin', 'latePin'].map(function (k) { return d0[k] ? hash_('P:' + d0[k]) : ''; }).filter(String))); } catch (e) {}
          if (o.data && o.data.sleep !== undefined) try { props_().setProperty('sleepCfg', JSON.stringify(o.data.sleep || null)); } catch (e) {}
          if (keepLooks) map.config.looks = keepLooks;   // 고양이 모습은 'look'으로만 바뀌어요
          dirty.config = true; break;
        }
        case 'look': {
          map.config = map.config || {};
          map.config.looks = map.config.looks || {};
          if (o.look) map.config.looks[o.name] = o.look; else delete map.config.looks[o.name];
          map.lookAt = map.lookAt || {}; map.lookAt[o.name] = Date.now();
          dirty.config = true; dirty.lookAt = true; cacheDrop_(['v:pub']); break;
        }
        case 'pub': if (pubDefault_(o.data) && !pubDefault_(map.pub)) { guarded = true; break; } map.pub = o.data || {}; dirty.pub = true; cacheDrop_(['v:pub']); break;
        case 'notices': writeNotices_(o.list || []); break;
        case 'closing': writeList_(CLOSING_SHEET, CLOSING_HEADER, o.list || []); break;
        case 'urgent': writeList_(URGENT_SHEET, URGENT_HEADER, (o.list || []).slice(0, 5)); break;
        case 'meeting': writeMeeting_(o.title, (o.items || []).slice(0, 30)); break;
        case 'rec': {
          const d = day(o.ds);
          if (o.rec) d.records[o.name] = o.rec; else delete d.records[o.name];
          break;
        }
        case 'bonusAdd': {
          const d = day(o.ds);
          if (!d.bonus.some(function (b) { return b.id === o.entry.id; })) d.bonus.push(o.entry);
          break;
        }
        case 'bonusDel': {
          const d = day(o.ds);
          d.bonus = d.bonus.filter(function (b) { return b.id !== o.id; });
          break;
        }
        case 'noteAdd': {                        // 📓 우리반 관리 수첩 (욕설 · 수업 지각)
          const d = day(o.ds); d.notes = d.notes || [];
          if (o.entry && !d.notes.some(function (b) { return b.id === o.entry.id; })) d.notes.push(o.entry);
          break;
        }
        case 'noteDel': {
          const d = day(o.ds); d.notes = (d.notes || []).filter(function (b) { return b.id !== o.id; });
          break;
        }
        case 'meal': {                           // 🍱 급식 (날짜별 · 비우면 지워요)
          const m = mealData_(), d0 = String(o.ds || ''), t0 = String(o.text || '').slice(0, 400).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(d0)) { if (t0) m[d0] = t0; else delete m[d0]; }
          const keys = Object.keys(m).sort(); while (keys.length > 40) delete m[keys.shift()];
          props_().setProperty('meal', JSON.stringify(m)); break;
        }
        case 'hw': {                             // 📚 숙제 목록 통째로
          const list = (Array.isArray(o.list) ? o.list : []).slice(0, 40).map(function (h) {
            return { id: Number(h.id) || Date.now(), subj: String(h.subj || '').slice(0, 12), text: String(h.text || '').slice(0, 200), due: /^\d{4}-\d{2}-\d{2}$/.test(String(h.due || '')) ? String(h.due) : '' };
          }).filter(function (h) { return h.text; });
          props_().setProperty('hw', JSON.stringify(list)); break;
        }
        case 'missionUndo': missionUndo_(o.id); break;
        case 'menuTrOk': menuTrSet_(o.id, !!o.ok); break;
        case 'storySet': {                       // 📸 시내T 스토리 올리기 (24시간)
          const type = ['text', 'vote', 'emoji'].indexOf(o.type) >= 0 ? o.type : 'text';
          const opts = type === 'vote' ? (o.opts || []).map(function (x) { return String(x).trim().slice(0, 20); }).filter(String).slice(0, 5) : type === 'emoji' ? ['😍', '😂', '😮', '😢', '👍'] : [];
          const id = Number(props_().getProperty('storySeq') || 0) + 1; props_().setProperty('storySeq', String(id));
          props_().setProperty('story', JSON.stringify({ id: id, q: String(o.q || '').slice(0, 120), type: type, opts: opts, pub: !!o.pub, at: Date.now() }));
          break;
        }
        case 'storyDel': props_().deleteProperty('story'); break;
        case 'reloadAll': props_().setProperty('reloadAt', String(Date.now() + 60000)); break;
        case 'reloadCancel': props_().deleteProperty('reloadAt'); break;
        case 'epoch': {                          // 🔒 모두 다시 입력: 다른 설정은 건드리지 않아요
          map.config = map.config || {}; map.config.accessEpoch = Number(o.v) || Date.now();
          cacheDrop_(['v:pub']); dirty.config = true; break;
        }
        case 'clean': {
          const d = day(o.ds);
          if (o.v) d.cleanDone[o.name] = true; else delete d.cleanDone[o.name];
          break;
        }
        case 'setPins': {
          Object.keys(o.pins || {}).forEach(function (name) {
            const pin = String(o.pins[name] || '');
            if (pin) props_().setProperty('pin:' + name, hash_('S:' + name + ':' + pin));
            else props_().deleteProperty('pin:' + name);
            props_().deleteProperty('fail:' + name);
          });
          break;
        }
        case 'setKey': {
          if (o.newKey) props_().setProperty('teacherKey', hash_('T:' + o.newKey));
          result.keySet = true;
          break;
        }
        case 'chatCfg': props_().setProperty('chatCfg', JSON.stringify(Object.assign(chatCfg_(), o.cfg || {}))); break;
        case 'chatDel': markRow_(CHAT_SHEET, CHAT_HEADER, o.id, 6, '삭제'); chatDelPush_(o.id); break;
        case 'chatSend': appendChat_(String(o.from || '선생님'), String(o.to || ''), String(o.text || '').slice(0, 200)); break;
        case 'askReply': {
          const r = findRow_(ASK_SHEET, ASK_HEADER, o.id);
          if (r) {
            r.sh.getRange(r.row, 7, 1, 2).setValues([[String(o.text || ''), "'" + nowStr_()]]);
            // 📨 로그인 전 연락에 친구 이름을 적었으면 → 답을 그 친구에게 귓속말로도 보내요
            try {
              const row = r.sh.getRange(r.row, 1, 1, 5).getValues()[0], m = String(row[4]).match(/📮 답장: (.+)$/);
              const names = ((map.pub || {}).students || []).map(function (x) { return x.name; });
              if (String(row[3]) === '연락' && m && names.indexOf(m[1].trim()) >= 0 && String(o.text || '').trim()) {
                const tn = names.filter(function (n) { return /(쌤|샘|선생님)$/.test(n); })[0] || '선생님';
                appendChat_(tn, m[1].trim(), '📨 ' + String(row[2]).replace(' (로그인 전)', '') + '에게 전해 줘: ' + String(o.text).trim().slice(0, 150));
              }
            } catch (e) {}
          }
          break;
        }
        case 'askDel': markRow_(ASK_SHEET, ASK_HEADER, o.id, 9, '삭제'); break;
        case 'strikeSet': {                      // 🚫 비속어 제한 풀기 · 횟수 초기화 (선생님)
          const all = strikes_(), s = all[o.name];
          if (s) { if (o.reset) delete all[o.name]; else { s.until = 0; s.perm = false; s.pub = false; } props_().setProperty('strikes', JSON.stringify(all)); }
          break;
        }
        case 'newsSet': stuCfgSet_({ news: Object.assign({}, stuCfg_().news, { on: !!o.on }) }); break;   // 🏘️ 마을 소식 줄 켜기 · 끄기
        case 'stuCfgSet': stuCfgSet_(o.data); break;                // ⚙️ 학생 화면 설정
        case 'askDone': markRow_(ASK_SHEET, ASK_HEADER, o.id, 9, '확인'); break;
        case 'megaDel': props_().setProperty('mega', JSON.stringify(megaList_().filter(function (m) { return m.ts !== Number(o.ts); }))); break;
        case 'hanaReset': props_().setProperty('hanaLook', '{}'); break;
        case 'songDone': props_().setProperty('songs', JSON.stringify(todayList_('songs').map(function (x) { if (x.id === Number(o.id)) x.done = true; return x; }))); break;
        case 'bannerDel': props_().setProperty('banners', JSON.stringify(todayList_('banners').filter(function (x) { return x.ts !== Number(o.ts); }))); break;
        case 'butlerDel': props_().deleteProperty('butler'); break;
        case 'moveTo': if (/^https:\/\/script\.google\.com\/.+\/exec$|^http:\/\/localhost/.test(String(o.url || ''))) props_().setProperty('movedTo', String(o.url)); break;
        case 'tickerClear': props_().setProperty('tickerClear', String(Date.now())); props_().setProperty('mega', '[]'); break;
        case 'chatReset': archiveSheet_(CHAT_SHEET, CHAT_HEADER); cacheDrop_(['v:chat']); break;
        case 'askReset': archiveSheet_(ASK_SHEET, ASK_HEADER); break;
        case 'lockdown': props_().setProperty('lockdown', o.on ? '1' : '0'); if (o.on) props_().setProperty('free', '{}'); break;
        case 'engDel': props_().deleteProperty('eng:' + String(o.ds || todayStr_())); break;
        case 'remoteAck': {                    // 출석부가 원격 출석을 기록했어요
          const ids = (o.ids || []).map(String);
          props_().setProperty('remote', JSON.stringify(remoteList_().map(function (x) { if (ids.indexOf(x.n + ':' + x.ts) >= 0) x.done = true; return x; })));
          break;
        }
        case 'expAck': {
          const ids = (o.ids || []).map(String);
          let q = []; try { q = JSON.parse(props_().getProperty('expq') || '[]'); } catch (e) {}
          props_().setProperty('expq', JSON.stringify(q.filter(function (x) { return ids.indexOf(String(x.id)) < 0; })));
          break;
        }
        case 'remoteAdd': {                    // 선생님이 대신 원격 출석 (교실 출석부가 등급을 계산해요)
          const ds = todayStr_(), list = remoteList_(), recs = ((map['day:' + ds] || {}).records) || {};
          if (!recs[o.name] && !list.some(function (x) { return x.n === o.name && !x.done; })) { list.push({ n: String(o.name), ts: Date.now(), ds: ds }); props_().setProperty('remote', JSON.stringify(list)); }
          break;
        }
        case 'titleDel': { map.inv = map.inv || {}; if (map.inv[o.name]) { map.inv[o.name].title = ''; dirty.inv = true; } cacheDrop_(['v:inv']); break; }
        case 'coinAdd': addCoin_(String(o.name), Number(o.amt) || 0, String(o.why || ''), String(o.kind || '선생님'), String(o.key || '')); break;
        case 'reqDone': settleReq_(Number(o.id), !!o.ok, map); break;
        case 'housePlace': {            // 선생님이 집 · 소품을 정리해 줄 때
          map.inv = map.inv || {}; map.inv[o.name] = o.inv || {}; dirty.inv = true; cacheDrop_(['v:inv']); break;
        }
        case 'import': {
          if (looksDefault_(o.state && o.state.config) && !looksDefault_(map.config)) { guarded = true; break; }
          const keepLooks = map.config && map.config.looks, keepInv = map.inv;
          Object.keys(map).forEach(function (k) { delete map[k]; });
          if (keepInv) map.inv = keepInv;      // 냥코인으로 산 집·소품은 남겨요
          cacheDrop_(['v:pub', 'v:inv']);
          if (o.state.config) map.config = o.state.config;
          if (map.config && !map.config.looks && keepLooks) map.config.looks = keepLooks;
          Object.keys(o.state.days || {}).forEach(function (ds) { map['day:' + ds] = o.state.days[ds]; });
          if (o.notices) writeNotices_(o.notices);
          if (o.closing) writeList_(CLOSING_SHEET, CLOSING_HEADER, o.closing);
          replaced = true;
          break;
        }
      }
    });

    if (replaced) {
      const sh = db.sh, now = new Date();
      const n = sh.getLastRow();
      if (n >= 2) sh.getRange(2, 1, n - 1, 3).clearContent();
      const keys = Object.keys(map).sort();
      if (keys.length) sh.getRange(2, 1, keys.length, 3).setValues(keys.map(function (k) { return [k, JSON.stringify(map[k]), now]; }));
    } else {
      writeRows_(db, Object.keys(dirty));
    }
    result.ok = true; result.v = bump_(); if (guarded) result.guarded = true;
    return result;
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- 학생: 로그인 · 꾸미기 · 알림 확인 ---------------- */
function checkStudent_(name, pin) {
  const p = props_();
  const stored = p.getProperty('pin:' + name);
  if (!stored) return { ok: false, error: 'nopin' };
  const failRaw = p.getProperty('fail:' + name);
  const fail = failRaw ? JSON.parse(failRaw) : { n: 0, until: 0 };
  const tch = isTeacherName_(name);
  if (fail.until && Date.now() < fail.until) { if (!tch) return { ok: false, error: 'locked', until: fail.until }; Utilities.sleep(2000); }   // 👑 선생님 계정은 잠기지 않아요 (느려지기만)
  if (hash_('S:' + name + ':' + String(pin || '')) !== stored) {
    fail.n = (fail.n || 0) + 1;
    if (fail.n >= MAX_FAIL) { fail.until = Date.now() + LOCK_MINUTES * 60000; fail.n = 0; }
    p.setProperty('fail:' + name, JSON.stringify(fail));
    return { ok: false, error: 'wrong', left: fail.until ? 0 : MAX_FAIL - fail.n, until: fail.until || 0 };
  }
  if (failRaw) p.deleteProperty('fail:' + name);
  return { ok: true };
}

function cleanLook_(look, lv, old, name) {
  const out = {};
  LOOK_SLOTS.forEach(function (slot) {
    const v = look && look[slot];
    if (v === '' || v === undefined || v === null) { if (slot !== 'eye' && slot !== 'mouth') out[slot] = ''; return; }
    const parts = String(v).split(':'), rule = ITEM_RULES[parts[0]], ci = Number(parts[1]);
    if (!rule || rule.slot !== slot || !(ci >= 0 && ci < rule.n) || Math.floor(ci) !== ci) return;
    if (rule.lv > lv && !(old && old._free) && !isTeacherName_(name || '')) return;   // 👑 선생님은 모든 아이템
    if (rule.teacher && !isTeacherName_(name || '')) return;
    out[slot] = parts[0] + ':' + ci;
  });
  if ((old && old._free) || isTeacherName_(name || '')) out._free = true;           // '모든 아이템 열기'는 선생님만 바꿀 수 있어요
  return out;
}

/* 🟢 지금 접속 중: 학생이 서버와 주고받을 때마다 '언제 · 어디서'를 잠깐 기억해요 (캐시 · 30분) */
function touchPres_(name, where) {
  try {
    const c = cache_(), m = JSON.parse(c.get('pres') || '{}'), now = Date.now();
    m[name] = { t: now, w: String(where || '').slice(0, 12) };
    Object.keys(m).forEach(function (k) { if (now - m[k].t > 1800000) delete m[k]; });
    c.put('pres', JSON.stringify(m), 21600);
  } catch (e) {}
}
function touchAnon_(cid) {
  try {
    const c = cache_(), m = JSON.parse(c.get('presAnon') || '{}'), now = Date.now();
    m[String(cid).slice(0, 16)] = now;
    Object.keys(m).forEach(function (k) { if (now - m[k] > 600000) delete m[k]; });
    c.put('presAnon', JSON.stringify(m), 21600);
  } catch (e) {}
}
function presence_() {
  const c = cache_(), now = Date.now();
  let list = {}, anon = {}; try { list = JSON.parse(c.get('pres') || '{}'); anon = JSON.parse(c.get('presAnon') || '{}'); } catch (e) {}
  return { ok: true, now: now, list: list, anon: Object.keys(anon).filter(function (k) { return now - anon[k] < 120000; }).length };
}
function handleStudent_(body) {
  const r = handleStudentCore_(body);
  if (r && r.ok !== false && body.name) touchPres_(String(body.name), body.where || body.op);
  if (body.__strike && r && typeof r === 'object') r.strike = body.__strike;
  return r;
}
function handleStudentCore_(body) {
  const name = String(body.name || '');
  const chk = checkStudent_(name, body.pin);
  if (!chk.ok) return chk;
  if (!isTeacherName_(name) && sleepNow_()) return { ok: false, error: 'sleep', sleep: sleepCfg_() };   // 💤 하나가 자는 시간
  { const g = textGuard_(name, body); if (g) return g; }
  // 대화·건의함은 출석부 데이터를 읽지 않아서 가볍게 처리해요
  if (body.op === 'chatPull' || body.op === 'chatUnsend') return studentChat_(name, body, null);
  if (body.op === 'wReport') return whisperReport_(name, body);
  if (body.op === 'msgReport') {                 // 🚨 대화 말풍선 신고 (귓속말이면 앞뒤 대화를 선생님이 볼 수 있게)
    const id = Number(body.id), m = readChat_(id - 1, function (x) { return x.id === id; })[0];
    if (!m || m.from === name) return { ok: true, error: 'bad' };
    if (isWhisper_(m)) return whisperReport_(name, body);
    const lock = lightLock_(15000);
    try {
      const sh = sheet_(ASK_SHEET, ASK_HEADER), aid = Number(props_().getProperty('askSeq') || 0) + 1; props_().setProperty('askSeq', String(aid));
      sh.appendRow([aid, "'" + nowStr_(), name, '신고', '🚨 대화 신고 · ' + m.from + '의 말 (' + String(m.t).slice(11) + '): ' + String(m.text).slice(0, 150), '', '', '', '']); bump_();
    } finally { lock.releaseLock(); }
    return { ok: true };
  }
  if (body.op === 'cmInfo' || body.op === 'cmHi') {   // 🐱 출석부 고양이 메뉴: 일기 읽기 가능? · 👋 냥 인사 (친구마다 하루 한 번)
    const to = String(body.to || ''), map = readRows_().map, kids = kidNames_(map), ds = todayStr_(), hk = 'hi:' + ds + ':' + name + ':' + to;
    if (kids.indexOf(to) < 0 || to === name) return { ok: true, error: 'bad' };
    let hi = !!cache_().get(hk);
    if (body.op === 'cmHi' && !hi) {
      try { cache_().put(hk, '1', 21600); } catch (e) {}
      const lock = lightLock_(15000);
      try { appendChat_('👋 냥 인사', to, '👋 냥냥! ' + name + '의 인사가 도착했어요 💛'); } finally { lock.releaseLock(); }
      return { ok: true, sent: true, hi: true };
    }
    return { ok: true, hi: hi, diary: isTeacherName_(name) || diaryReaders_(to).indexOf(name) >= 0 };
  }
  if (/^mail/.test(String(body.op || ''))) return studentMail_(name, body);
  if (/^diary/.test(String(body.op || ''))) return studentDiary_(name, body);
  if (/^cafe/.test(String(body.op || ''))) return studentCafe_(name, body);
  if (/^locker/.test(String(body.op || ''))) return studentLocker_(name, body);
  if (body.op === 'menuTr') return studentMenu_(name, body);
  if (/^story/.test(String(body.op || ''))) return studentStory_(name, body);
  if (body.op === 'chatSend') return studentChat_(name, body, readRows_().map.pub || {});
  if (body.op === 'askSend' || body.op === 'askList') return studentAsk_(name, body);
  if (/^idea/.test(String(body.op || ''))) return studentIdea_(name, body);
  if (body.op === 'move' || body.op === 'emote' || body.op === 'act') return studentVillage_(name, body);
  if (body.op === 'hallMute') return hallMute_(name, body);
  if (body.op === 'god') return studentGod_(name, body);
  if (body.op === 'vnews') { addNews_(name, String(body.a || '')); return { ok: true }; }
  if (body.op === 'hana' || body.op === 'hanaDress') return studentHana_(name, body);
  if (['coins', 'buy', 'equipHouse', 'missionReq', 'missionPick', 'game', 'buyFurn', 'roomSave', 'relocate'].indexOf(body.op) >= 0) return studentCoins_(name, body);
  if (body.op === 'profile') return studentProfile_(name, body);
  if (body.op === 'engSubmit' || body.op === 'engPass' || body.op === 'engMine') return studentEng_(name, body);
  if (['checkin', 'look', 'ack', 'status'].indexOf(body.op) < 0) {
    const v = version_(), ds0 = todayStr_(), sk = 'me:' + v + ':' + ds0;
    let snap = cacheGet_(sk, null);
    if (!snap) {
      const m0 = readRows_().map;
      snap = { priv: ((m0.pub || {}).priv) || {}, looks: (m0.config && m0.config.looks) || {}, acks: m0['acks:' + ds0] || {}, statuses: m0.statuses || {} };
      cachePut_(sk, snap);
    }
    const mine0 = []; Object.keys(snap.acks).forEach(function (t) { if ((snap.acks[t] || []).indexOf(name) >= 0) mine0.push(t); });
    return { ok: true, name: name, me: snap.priv[name] || null, look: snap.looks[name] || null, acked: mine0, status: ((snap.statuses || {})[name] || {}).t || '', penalty: penaltyOf_(name), mailNew: mailNew_(name) };
  }
  const lock = lockFor_(true, 20000);
  try {
    const db = readRows_(), map = db.map;
    const pub = map.pub || {}, priv = (pub.priv || {})[name] || null;
    const ds = todayStr_();
    if (body.op === 'checkin') return studentCheckin_(name, map);
    if (body.op === 'look') {
      const lv = priv ? priv.lv : 1;
      map.config = map.config || {};
      map.config.looks = map.config.looks || {};
      const old = map.config.looks[name];
      map.config.looks[name] = cleanLook_(body.look || {}, lv, old, name);
      map.lookAt = map.lookAt || {}; map.lookAt[name] = Date.now();
      writeRows_(db, ['config', 'lookAt']);
      cacheDrop_(['v:pub']);
      bump_();
    } else if (body.op === 'status') {            // 💬 내 상태 (출석부 카드에 떠요)
      const t = cleanText_(String(body.text || '').replace(/[<>]/g, ''), chatCfg_()).slice(0, 20);
      map.statuses = map.statuses || {};
      if (t) map.statuses[name] = { t: t, at: Date.now() }; else delete map.statuses[name];
      writeRows_(db, ['statuses']); bump_();
    } else if (body.op === 'ack') {
      const notices = readNotices_(), text = String(body.text || '');
      if (notices.indexOf(text) >= 0) {
        const k = 'acks:' + ds;
        map[k] = map[k] || {};
        map[k][text] = map[k][text] || [];
        if (map[k][text].indexOf(name) < 0) map[k][text].push(name);
        writeRows_(db, [k]);
        bump_();
      }
    }
    const acks = map['acks:' + ds] || {}, mine = [];
    Object.keys(acks).forEach(function (t) { if (acks[t].indexOf(name) >= 0) mine.push(t); });
    return {
      ok: true, name: name, me: priv,
      look: ((map.config && map.config.looks) || {})[name] || null,
      status: ((map.statuses || {})[name] || {}).t || '',
      acked: mine
    };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- 📱 개인 기기 원격 출석 ---------------- */
function remoteList_() {
  const ds = todayStr_();
  try { return JSON.parse(props_().getProperty('remote') || '[]').filter(function (x) { return x.ds === ds; }); } catch (e) { return []; }
}
// 출석부(교사 화면)가 가져가서 기록한 뒤 '받았어요(remoteAck)'를 보내요.
// 응답이 중간에 끊겨도 잃어버리지 않게, 1분 안에 '받았어요'가 안 오면 다시 보내요.
function claimRemote_() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (e) { return []; }
  try {
    const now = Date.now(), list = remoteList_();
    const out = list.filter(function (x) { return !x.done && (!x.lease || now - x.lease > 60000); });
    if (out.length) { out.forEach(function (x) { x.lease = now; }); props_().setProperty('remote', JSON.stringify(list)); }
    return out.map(function (x) { return { n: x.n, ts: x.ts }; });
  } finally { lock.releaseLock(); }
}
function studentCheckin_(name, map) {
  const ds = todayStr_();
  const day = map['day:' + ds] || {}, recs = day.records || {};
  if (recs[name]) return { ok: true, error: 'already' };
  const list = remoteList_();
  if (list.some(function (x) { return x.n === name && !x.done; })) return { ok: true, error: 'pending' };
  list.push({ n: name, ts: Date.now(), ds: ds });
  props_().setProperty('remote', JSON.stringify(list));
  bump_();
  return { ok: true, done: true, at: Utilities.formatDate(new Date(), 'Asia/Seoul', 'HH:mm') };
}

/* ---------------- 💬 우리 반 대화 ---------------- */
function nowStr_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'); }
function chatCfg_() {
  const def = { on: true, whisper: true, start: '07:00', end: '22:00', muted: [], ban: [] };
  try { return Object.assign(def, JSON.parse(props_().getProperty('chatCfg') || '{}')); } catch (e) { return def; }
}
/* ⏰ 쉬는 시간 해제: 선생님이 정한 시각까지 시간 제한 없이 열어요 */
function free_() {
  try { return Object.assign({ chat: 0, game: 0 }, JSON.parse(props_().getProperty('free') || '{}')); } catch (e) { return { chat: 0, game: 0 }; }
}
function chatOpen_(cfg) {
  if (props_().getProperty('lockdown') === '1') return false;    // 🚫 선생님 긴급 잠금
  if (free_().chat > Date.now()) return true;
  if (!cfg.on) return false;
  if (!cfg.start || !cfg.end) return true;
  const t = Utilities.formatDate(new Date(), 'Asia/Seoul', 'HH:mm');
  return cfg.start <= cfg.end ? (t >= cfg.start && t < cfg.end) : (t >= cfg.start || t < cfg.end);
}
/* 🙊 욕설·비속어 거르기: 띄어쓰기·숫자·기호를 끼워 넣어도(시 1 발, ㅅ.ㅂ) 찾아서 애교 말로 바꿔요 */
const BAD_PATTERNS = [
  // 시발 계열
  '[시씨쉬쒸싀쓔][이]?[발빨팔벌뻘]', '[씨쒸]파', '[시씨쉬쒸][바빠](?![견다닥람구나퀴위지르로탕뀌라])', '십[새쌔할알팔]', '씹[새쌔년놈창할]', '씹(?![어었다는고을으])', '[ㅅㅆ][ㅂㅃ]', 'ㅅ발', '시ㅂ', '쌉[가소]', '썅', '쌍[년놈]', '시방새',
  // 병신 계열
  '[병븅빙벼][엉]?[신씬쉰딱]', 'ㅂㅅ', 'ㅄ', '등신',
  // 좆·존나 계열
  '[좆좃졷좇]', '[존졸][나내만]', '졸라', 'ㅈㄴ', 'ㅈ같', '[조좃]까', '좆밥',
  // 새끼 계열
  '[개게][새쌔섀][끼기키히ㄲ]?', '[새쌔섀][끼키ㄲ]', '세[끼키]야', '[색섹쌕][기끼히]', 'ㅅㄲ', '개[같색쉐씹뼈소년놈빡]', '개쓰레기',
  // 지랄·미친
  '[지쥐][랄럴롤]', 'ㅈㄹ', '미[친쳤칀틴]', 'ㅁㅊ', '[또똘][라롸]이', '똘아이', '돌아이', 'ㄸㄹㅇ',
  // 꺼져·닥쳐·죽어
  '닥[쳐치처]', 'ㄷㅊ', '꺼[져저](?![있서요버었])', 'ㄲㅈ', '뒈[져지진질]', '뒤질래', '뒤진다', '디질래', '디져', '죽[어을여](?![도서요야가])', '죽일', '자살', '엿[먹머]',
  // 엄마·아빠 욕
  '[니느][애에]?[미비]', '느[금그]', 'ㄴㄱㅁ', '[엠앰엄]창', '[애에][미비](?![나])', '니엄마', 'ㄴㅇㅁ',
  // 성적인 말
  '섹[스쓰]', '보지(?![마말않못도요])', '자지(?![마말않못도요])', '야동', '창[녀년]', '걸레', '화냥', '빠구리', '딸[딸치]', '자위',
  // 비하
  '찐따', 'ㅉㄸ', '꼴통', '애자', '한남충', '김치녀', '틀딱', '맘충', '급식충', '일베', '운지', 'ㅗㅗ',
  // 영어·한글 자판
  'f+u*c+k', 'fxck', 'shit', 'bitch', 'sibal', 'ssibal', 'tlqkf', 'qudtls', 'whssk', 'wlfkf', 'dick', 'pussy'
];
let BAD_RE_ = null;
function badRe_() { if (!BAD_RE_) BAD_RE_ = new RegExp(BAD_PATTERNS.join('|'), 'gi'); return BAD_RE_; }
const LETTER_RE_ = /[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]/;
// 🙈 욕은 민망한 애교 말로 바뀌어요 (한 덩어리마다 무작위 하나)
const AEGYO_ = ['아잉', '뿌잉뿌잉', '우쭈쭈', '꺄르륵', '힝구리퐁퐁', '앙대영', '냥냥펀치', '쪼아쪼아', '뀨잉', '몰랑몰랑', '히잉', '데헷', '오구오구', '부끄부끄', '깜찍깜찍', '꾸잉꾸잉', '하트뿅뿅', '사랑해용', '귀요미', '꼬물꼬물', '헤헤헷', '잉잉잉', '냐앙', '쀼잉'];
function maskBad_(t, extra) {
  // 띄어쓰기·숫자·기호를 빼고 글자만 모아서 찾아요 (시 1 발 · ㅅ.ㅂ 도 잡아요)
  const idx = [], keep = [];
  for (let i = 0; i < t.length; i++) { const ch = t.charAt(i); if (LETTER_RE_.test(ch)) { keep.push(ch); idx.push(i); } }
  const norm = keep.join(''), hit = new Array(t.length).fill(false);
  const mark = function (re) {
    re.lastIndex = 0; let m;
    while ((m = re.exec(norm))) {
      if (!m[0]) { re.lastIndex++; continue; }
      const a = idx[m.index], b = idx[m.index + m[0].length - 1];
      // '다시 발표'처럼 단어 중간에서 시작해서 띄어쓰기를 건너뛴 건 욕이 아니에요
      if (/\s/.test(t.slice(a, b + 1)) && a > 0 && LETTER_RE_.test(t.charAt(a - 1))) { re.lastIndex = m.index + 1; continue; }
      for (let k = a; k <= b; k++) hit[k] = true;
    }
  };
  mark(badRe_());
  (extra || []).forEach(function (w) { w = String(w || '').replace(/\s+/g, ''); if (w) mark(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')); });
  const r18 = /(개\s*)?1\s*8\s*(놈|년|새|련)|개\s*1\s*8/g; let m2;     // 숫자 욕 (18놈 · 개18)
  while ((m2 = r18.exec(t))) for (let k = m2.index; k < m2.index + m2[0].length; k++) hit[k] = true;
  let out = '', run = 0;
  for (let i = 0; i < t.length; i++) {
    if (hit[i]) { if (run === 0) out += AEGYO_[Math.floor(Math.random() * AEGYO_.length)]; run++; } else { out += t.charAt(i); run = 0; }
  }
  return out;
}
/* 🚫 비속어 단계별 제한: 1회 경고 · 2회 1분 · 3회 10분(공개) · 4회 1시간(공개) · 5회 10일 · 6회부터 영구(공개)
 *  글을 쓰는 모든 곳(대화·상태·질문·의견·카드·상점 글)에서 잡아요. 선생님(출석부)께 바로 알림이 가요 */
const STRIKE_RULES_ = [null, { s: 0 }, { s: 60 }, { s: 600, pub: 1 }, { s: 3600, pub: 1 }, { s: 864000 }, { perm: 1, pub: 1 }];
const TEXT_OPS_ = { chatSend: 1, askSend: 1, ideaSend: 1, status: 1, profile: 1, buy: 1, mailSend: 1, diarySave: 1 };
function strikes_() { try { return JSON.parse(props_().getProperty('strikes') || '{}') || {}; } catch (e) { return {}; } }
function penaltyOf_(name, all) {
  const s = (all || strikes_())[name]; if (!s) return null;
  const active = !!s.perm || Number(s.until || 0) > Date.now();
  return { n: s.n || 0, until: Number(s.until || 0), perm: !!s.perm, pub: !!s.pub, active: active };
}
function addStrike_(name, op, text) {
  const lock = lightLock_(10000);
  try {
    const all = strikes_(), s = all[name] || { n: 0 };
    s.n = (s.n || 0) + 1;
    const r = STRIKE_RULES_[Math.min(s.n, 6)];
    s.perm = !!r.perm; s.pub = !!r.pub; s.until = r.perm ? 0 : (r.s ? Date.now() + r.s * 1000 : 0); s.at = Date.now();
    all[name] = s;
    const feed = JSON.parse(props_().getProperty('strikeFeed') || '[]');
    feed.push({ ts: Date.now(), n: name, k: s.n, op: op, text: String(text || '').slice(0, 60) });
    props_().setProperty('strikeFeed', JSON.stringify(feed.slice(-30)));
    props_().setProperty('strikes', JSON.stringify(all));
    try { sheet_('비속어', ['시간', '이름', '횟수', '어디서', '쓴 글']).appendRow(["'" + nowStr_(), name, s.n, op, String(text || '').slice(0, 200)]); } catch (e) {}
    bump_();
    return penaltyOf_(name, all);
  } finally { lock.releaseLock(); }
}
function publicPunish_() {
  const all = strikes_(), out = {};
  Object.keys(all).forEach(function (n) { const p = penaltyOf_(n, all); if (p && p.active && p.pub) out[n] = { until: p.until, perm: p.perm, n: p.n }; });
  return out;
}
/* 글쓰기 전에 확인: 제한 중이면 막고, 비속어면 횟수를 올려요 */
function textGuard_(name, body) {
  if (!TEXT_OPS_[body.op] || isTeacherName_(name)) return null;
  const pen = penaltyOf_(name);
  if (pen && pen.active) return { ok: true, error: 'penalty', penalty: pen };
  const ban = chatCfg_().ban || [];
  const texts = body.op === 'profile' ? Object.keys(body.data || {}).map(function (k) { return body.data[k]; }) : [body.text];
  const bad = texts.filter(function (t) { t = String(t || ''); return t && maskBad_(t, ban) !== t; })[0];
  if (bad) body.__strike = addStrike_(name, body.op, bad);   // 글은 애교 말로 바뀌어서 올라가고, 횟수만 올라가요
  return null;
}
function hasBad_(text) { const t = String(text || ''); return maskBad_(t, []) !== t; }
function cleanText_(text, cfg) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  return maskBad_(t, (cfg && cfg.ban) || []);   // BASE_BAN의 말은 모두 BAD_PATTERNS가 잡아요 (+ 선생님이 추가한 금지어)
}
function appendChat_(from, to, text) {
  const sh = sheet_(CHAT_SHEET, CHAT_HEADER);
  const id = Number(props_().getProperty('chatSeq') || 0) + 1;
  props_().setProperty('chatSeq', String(id));
  sh.appendRow([id, "'" + nowStr_(), from, to, text, '']);
  if (!to) cachePush_('v:chat', { n: from, text: text, ts: Date.now() }, 30);
  return id;
}
/* 🤫 귓속말은 두 사람만 봐요. 받은 사람이 🚨 신고하면 선생님은 그 두 사람의 앞뒤 10분 대화만 볼 수 있어요 */
function wReports_() { try { return JSON.parse(props_().getProperty('wreports') || '[]') || []; } catch (e) { return []; } }
function isWhisper_(m) { return !!m.to && m.to.charAt(0) !== '#'; }
function tMin_(t) { const x = String(t || '').match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/); return x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5]) / 60000 : 0; }
function repHit_(m, reps) { const tm = tMin_(m.t); return reps.some(function (r) { return ((m.from === r.a && m.to === r.b) || (m.from === r.b && m.to === r.a)) && Math.abs(tm - r.m) <= 10; }); }
function teacherSees_(m, reps, me) { if (!isWhisper_(m)) return true; if (me && (m.from === me || m.to === me)) return true; return repHit_(m, reps); }
function markRep_(m, reps) { if (isWhisper_(m) && repHit_(m, reps)) m.rep = true; return m; }
function whisperReport_(name, body) {
  const id = Number(body.id), m = readChat_(id - 1, function (x) { return x.id === id; })[0];
  if (!m || !isWhisper_(m) || (m.to !== name && m.from !== name)) return { ok: true, error: 'bad' };
  const other = m.from === name ? m.to : m.from, reps = wReports_();
  if (reps.some(function (r) { return r.id === id; })) return { ok: true, already: true };
  const lock = lightLock_(15000);
  try {
    reps.push({ id: id, a: name, b: other, m: tMin_(m.t), at: nowStr_() });
    props_().setProperty('wreports', JSON.stringify(reps.slice(-100)));
    const sh = sheet_(ASK_SHEET, ASK_HEADER), aid = Number(props_().getProperty('askSeq') || 0) + 1;
    props_().setProperty('askSeq', String(aid));
    sh.appendRow([aid, "'" + nowStr_(), name, '신고', '🚨 귓속말 신고 · ' + name + ' ↔ ' + other + ' (' + String(m.t).slice(11) + ' 무렵) · 💬 대화 관리에서 그 앞뒤 대화를 볼 수 있어요', '', '', '', '']);
    bump_();
  } finally { lock.releaseLock(); }
  return { ok: true };
}
function readChat_(after, keep) {
  const sh = sheet_(CHAT_SHEET, CHAT_HEADER), n = sh.getLastRow();
  if (n < 2) return [];
  const start = Math.max(2, n - 299);
  return sh.getRange(start, 1, n - start + 1, 6).getValues()
    .map(function (r) { return { id: Number(r[0]), t: String(r[1]), from: String(r[2]), to: String(r[3]), text: String(r[4]), del: String(r[5]) === '삭제' }; })
    .filter(function (m) { return m.id > after && keep(m); });
}
function findRow_(name, header, id) {
  const sh = sheet_(name, header), n = sh.getLastRow();
  if (n < 2) return null;
  const ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) if (Number(ids[i][0]) === Number(id)) return { sh: sh, row: i + 2 };
  return null;
}
function markRow_(name, header, id, col, value) {
  const r = findRow_(name, header, id);
  if (r) r.sh.getRange(r.row, col).setValue(value);
}
/* 👀 읽음: 학생마다 '어디까지 봤는지'를 따로 적어 둬요 (all = 전체 방에서 다 봄, t = 모둠 방별, w = 귓속말 친구별) */
function chatSeenAll_() {
  const all = props_().getProperties(), out = {}, pos = cacheGet_('v:pos', {});
  Object.defineProperty(out, '__tb', { value: function (n) { const p = pos[n]; return (p && p.sc === 'hall' && p.s && Date.now() - p.ts < 600000) ? p.s : ''; } });
  Object.keys(all).forEach(function (k) { if (k.indexOf('cs:') === 0) try { out[k.slice(3)] = JSON.parse(all[k]); } catch (e) {} });
  return out;
}
function chatSeenMark_(name, view, maxId) {
  const P = props_(), k = 'cs:' + name; let s = {}; try { s = JSON.parse(P.getProperty(k) || '{}') || {}; } catch (e) {}
  const before = JSON.stringify(s);
  if (view === '') s.all = Math.max(Number(s.all) || 0, maxId);
  else if (view === '👑') s.k = Math.max(Number(s.k) || 0, maxId);   // 👑 시내T 방 (선생님 말만)
  else if (view.charAt(0) === '#') { s.t = s.t || {}; s.t[view] = Math.max(Number(s.t[view]) || 0, maxId); }
  else { s.w = s.w || {}; s.w[view] = Math.max(Number(s.w[view]) || 0, maxId); }
  if (JSON.stringify(s) !== before) P.setProperty(k, JSON.stringify(s));
}
/* 이 말을 읽은 사람 수 (보낸 사람 빼고): 대화방을 본 기록 + 그 뒤에 같은 방에서 말한 친구(답했으면 읽은 거예요 · 예전 대화도) */
function chatReaders_(m, seen, recent) {
  const id = m.id, who = {};
  Object.keys(seen).forEach(function (w) {
    if (w === m.from) return; const s = seen[w] || {}, all = Number(s.all) || 0;
    if (isTeacherName_(m.from) && (Number(s.k) || 0) >= id && (!m.to || m.to === w || (m.to.charAt(0) === '#' && seen.__tb(w) === m.to.slice(1)))) { who[w] = 1; return; }
    if (!m.to) { if (all >= id) who[w] = 1; }
    else if (m.to.charAt(0) === '#') { if ((Number((s.t || {})[m.to]) || 0) >= id || (all >= id && seen.__tb(w) === m.to.slice(1))) who[w] = 1; }
    else if (w === m.to && (Number(((s.w || {})[m.from])) || 0) >= id) who[w] = 1;   // 🤫 귓속말은 그 방을 열어 봐야 읽음
  });
  (recent || []).forEach(function (x) {
    if (x.id <= id || x.from === m.from || x.from === '📮 우체부' || x.from === '👋 냥 인사' || x.from === '🎯 미션') return;
    if (!m.to ? !x.to : m.to.charAt(0) === '#' ? x.to === m.to : (x.from === m.to && x.to === m.from)) who[x.from] = 1;
  });
  return Object.keys(who).length;
}
/* 읽음 기록은 이 번호부터 시작 (그 전 대화는 🗑 지우기 금지) */
function chatReadStart_() {
  const P = props_(); let v = P.getProperty('chatReadStart');
  if (v === null) { v = String(Number(P.getProperty('chatSeq') || 0) + 1); P.setProperty('chatReadStart', v); }
  return Number(v);
}
function chatDels_() { try { return JSON.parse(props_().getProperty('chatDels') || '[]') || []; } catch (e) { return []; } }
function chatDelPush_(id) { const d = chatDels_(); d.push(Number(id)); props_().setProperty('chatDels', JSON.stringify(d.slice(-100))); }
function studentChat_(name, body, pub) {
  const T = isTeacherName_(name);   // 👑 선생님은 쉬는 시간·잠금·속도 제한 없이
  const cfg = chatCfg_(), muted = !T && (cfg.muted || []).indexOf(name) >= 0, open = T || chatOpen_(cfg);
  const names = ((pub && pub.students) || []).map(function (s) { return s.name; });
  let error = '';
  if (body.op === 'chatSend') {
    const to = String(body.to || ''), text = cleanText_(body.text, cfg);
    const last = Number(props_().getProperty('chatLast:' + name) || 0);
    if (!open) error = 'closed';
    else if (muted) error = 'muted';
    else if (!T && hallMuted_(name)) error = 'hallmute';
    else if (!text) error = 'empty';
    else if (!T && Date.now() - last < 3000) error = 'slow';
    else if (!T && to && to.charAt(0) === '#' && myTable_(name) !== to.slice(1)) error = 'group';
    else if (to && to.charAt(0) !== '#' && ((!cfg.whisper && !T) || names.indexOf(to) < 0 || to === name)) error = 'whisper';
    else {
      const lock = lightLock_(15000);
      try { if (!error) { appendChat_(name, to, text); props_().setProperty('chatLast:' + name, String(Date.now())); } }
      finally { lock.releaseLock(); }
    }
  }
  if (body.op === 'chatUnsend') {                 // 🗑 아무도 안 읽었을 때만 지울 수 있어요 (선생님은 언제나)
    const id = Number(body.id), m = readChat_(id - 1, function (x) { return x.id === id; })[0];
    if (!m || m.from !== name || m.del) error = 'bad';
    else if (!T && (id < chatReadStart_() || chatReaders_(m, chatSeenAll_(), readChat_(id, function (x) { return !x.del; })) > 0)) error = 'read';
    else { const lock = lightLock_(15000); try { markRow_(CHAT_SHEET, CHAT_HEADER, id, 6, '삭제'); chatDelPush_(id); } finally { lock.releaseLock(); } }
  }
  const tb = myTable_(name), isT = /(쌤|샘|선생님)$/.test(name), reps = isT ? wReports_() : [];   // 👑 선생님은 모둠 대화는 모두, 🤫 귓속말은 신고된 것만 봐요
  const msgs = readChat_(Number(body.after || 0), function (m) { return !m.del && (isT ? teacherSees_(m, reps, name) : (m.to === '' || m.to === name || m.from === name || (tb && m.to === '#' + tb))); }).map(function (m) { return isT ? markRep_(m, reps) : m; });
  const recent = readChat_(0, function (m) { return !m.del; });
  if (typeof body.view === 'string' && recent.length) chatSeenMark_(name, body.view, recent[recent.length - 1].id);   // 지금 대화방을 보고 있으면 '읽음'
  const seen = chatSeenAll_(), reads = {}, rs = chatReadStart_();
  recent.forEach(function (m) { if (m.from === name) { const n = chatReaders_(m, seen, recent); reads[m.id] = n || (m.id < rs && !T ? -1 : 0); } });   // -1 = 예전 대화 (지우기 금지)
  return { ok: true, error: error, sent: body.op === 'chatSend' ? cleanText_(body.text, cfg) : undefined, table: tb, cfg: { on: !!cfg.on || open, open: open, whisper: !!cfg.whisper || T, start: cfg.start, end: cfg.end }, muted: muted, msgs: msgs, reads: reads, dels: chatDels_() };
}

/* ---------------- 📮 질문 · 건의함 ---------------- */
function readAsks_(keep) {
  const sh = sheet_(ASK_SHEET, ASK_HEADER), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 9).getValues()
    .map(function (r) { return { id: Number(r[0]), t: String(r[1]), from: String(r[2]), kind: String(r[3]), text: String(r[4]), anon: String(r[5]) === '예', reply: String(r[6] || ''), rt: String(r[7] || ''), del: String(r[8]) === '삭제', done: String(r[8]) === '확인' }; })
    .filter(keep);
}
// 🚨 아직 선생님이 확인하지 않은 긴급 상담 수
function counselUrgent_() {
  try { return readAsks_(function (a) { return a.kind === '긴급' && !a.reply && !a.del && !a.done; }).length; } catch (e) { return 0; }
}
function studentAsk_(name, body) {
  let error = '';
  if (body.op === 'askSend') {
    const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const last = Number(props_().getProperty('askLast:' + name) || 0);
    if (!text) error = 'empty';
    else if (body.kind !== '신고' && !isTeacherName_(name) && !stuCfg_().askOpen) error = 'askoff';     // 💌 지금은 신고만 받아요
    else if (Date.now() - last < 15000 && body.kind !== '긴급' && !isTeacherName_(name)) error = 'slow';
    else {
      const lock = lightLock_(15000);
      try {
        const sh = sheet_(ASK_SHEET, ASK_HEADER);
        const id = Number(props_().getProperty('askSeq') || 0) + 1;
        props_().setProperty('askSeq', String(id));
        const kind = ['건의', '상담', '긴급', '신고'].indexOf(body.kind) >= 0 ? body.kind : '질문';
        const counsel = kind === '상담' || kind === '긴급' || kind === '신고';
        sh.appendRow([id, "'" + nowStr_(), name, kind, text, body.anon && !counsel ? '예' : '', '', '', '']);
        if (kind === '긴급' || kind === '신고') bump_();
        props_().setProperty('askLast:' + name, String(Date.now()));
      } finally { lock.releaseLock(); }
    }
  }
  const mine = readAsks_(function (a) { return a.from === name && !a.del; })
    .map(function (a) { return { id: a.id, t: a.t, kind: a.kind, text: a.text, anon: a.anon, reply: a.reply, rt: a.rt, done: a.done }; });
  return { ok: true, error: error, asks: mine.reverse() };
}

/* 💡 마을 개선 의견 게시판: 이름 · 익명 · 🔒 비밀 제보(선생님만) · ❤️ 좋아요
 *  선생님(OO쌤)은 비밀 제보도 보고, 익명을 눌러 누가 썼는지 볼 수 있어요. 시트 '마을의견' 탭에 모두 남아요 */
function readIdeas_() {
  const sh = sheet_(IDEA_SHEET, IDEA_HEADER), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 8).getValues().map(function (r, i) {
    let likes = []; try { likes = JSON.parse(String(r[6] || '[]')) || []; } catch (e) {}
    return { row: i + 2, id: Number(r[0]), t: String(r[1]), from: String(r[2]), anon: String(r[3]) === '예', secret: String(r[4]) === '예', text: String(r[5]), likes: likes, del: String(r[7]) === '삭제' };
  }).filter(function (x) { return x.id && !x.del; });
}
function studentIdea_(name, body) {
  const isT = isTeacherName_(name);
  let error = '';
  if (body.op === 'ideaSend') {
    const text = maskBad_(String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, 300), (chatCfg_().ban) || []);
    const last = Number(props_().getProperty('ideaLast:' + name) || 0);
    if (!text) error = 'empty';
    else if (Date.now() - last < 15000 && !isT) error = 'slow';
    else {
      const lock = lightLock_(15000);
      try {
        const id = Number(props_().getProperty('ideaSeq') || 0) + 1; props_().setProperty('ideaSeq', String(id));
        sheet_(IDEA_SHEET, IDEA_HEADER).appendRow([id, "'" + nowStr_(), name, body.anon ? '예' : '', body.secret ? '예' : '', text, '[]', '']);
        if (!body.anon && !body.secret) addNews_(name, 'idea');
        props_().setProperty('ideaLast:' + name, String(Date.now()));
      } finally { lock.releaseLock(); }
    }
  } else if (body.op === 'ideaLike' || body.op === 'ideaDel') {
    const lock = lightLock_(15000);
    try {
      const it = readIdeas_().filter(function (x) { return x.id === Number(body.id); })[0], sh = sheet_(IDEA_SHEET, IDEA_HEADER);
      if (!it) error = 'none';
      else if (body.op === 'ideaDel') { if (isT || it.from === name) sh.getRange(it.row, 8).setValue('삭제'); else error = 'auth'; }
      else if (!(it.secret && !isT && it.from !== name)) {
        const k = it.likes.indexOf(name); if (k >= 0) it.likes.splice(k, 1); else it.likes.push(name);
        sh.getRange(it.row, 7).setValue(JSON.stringify(it.likes));
      }
    } finally { lock.releaseLock(); }
  }
  const list = readIdeas_().filter(function (x) { return !x.secret || isT || x.from === name; }).map(function (x) {
    const mine = x.from === name;
    return { id: x.id, t: x.t, text: x.text, anon: x.anon, secret: x.secret, mine: mine, from: x.anon && !mine ? '' : x.from,
      real: isT ? x.from : undefined, n: x.likes.length, liked: x.likes.indexOf(name) >= 0 };
  }).reverse();
  return { ok: true, error: error, ideas: list, teacher: isT };
}

/* 📨 로그인 못 하는 학생의 연락 (비밀번호 분실 등) → 건의함에 '연락'으로 */
const SOS_REASONS = ['🔑 비밀번호를 잊어버렸어요', '🚫 로그인이 안 돼요', '📋 출석이 잘못 기록됐어요', '📱 출석 버튼이 안 눌려요', '🐛 화면이 이상하거나 오류가 나요', '✏️ 기타'];
function sos_(body) {
  const who = String(body.who || '').replace(/[^가-힣a-zA-Z0-9 ]/g, '').trim().slice(0, 10);
  const reason = SOS_REASONS.indexOf(String(body.reason || '')) >= 0 ? String(body.reason) : '✏️ 기타';
  const reply = String(body.reply || '').replace(/[^가-힣a-zA-Z0-9 @._+-]/g, '').trim().slice(0, 40);
  const detail = maskBad_(String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, 200), (chatCfg_().ban) || []);
  if (!who) return { ok: true, error: 'who' };
  if (!reply) return { ok: true, error: 'reply' };
  if (reason === '✏️ 기타' && !detail) return { ok: true, error: 'empty' };
  const c = cache_(), dk = 'sosN:' + todayStr_(), n = Number(c.get(dk) || 0);
  if (c.get('sosLast')) return { ok: true, error: 'slow' };
  if (n >= 30) return { ok: true, error: 'full' };
  const text = reason + (detail ? ' · ' + detail : '') + (reply ? ' · 📮 답장: ' + reply : '');
  const lock = lightLock_(15000);
  try {
    const sh = sheet_(ASK_SHEET, ASK_HEADER), id = Number(props_().getProperty('askSeq') || 0) + 1;
    props_().setProperty('askSeq', String(id));
    sh.appendRow([id, "'" + nowStr_(), who + ' (로그인 전)', '연락', text, '', '', '', '']);
    bump_();
    try { c.put('sosLast', '1', 20); c.put(dk, String(n + 1), 21600); } catch (e) {}
  } finally { lock.releaseLock(); }
  return { ok: true };
}

/* ---------------- ⚡ 빠른 저장소 (마을용) ---------------- */
function cache_() { return CacheService.getScriptCache(); }
function cacheGet_(k, def) { try { const v = cache_().get(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function cachePut_(k, v) { try { cache_().put(k, JSON.stringify(v), 21600); } catch (e) {} }
function cacheDrop_(keys) { try { keys.forEach(function (k) { cache_().remove(k); }); } catch (e) {} }
function cachePush_(k, item, max) {
  const list = cacheGet_(k, []); list.push(item);
  const cut = Date.now() - 120000;
  cachePut_(k, list.filter(function (x) { return x.ts > cut; }).slice(-max));
}

/* ---------------- 🏘️ 마을 ---------------- */
function villageState_() {
  let pubLite = cacheGet_('v:pub', null), inv = cacheGet_('v:inv', null);
  if (!pubLite || !inv) {
    const map = readRows_().map;
    if (!pubLite) { pubLite = publicState_(map); cachePut_('v:pub', pubLite); }
    if (!inv) { inv = {}; const raw = map.inv || {}; Object.keys(raw).forEach(function (n) { inv[n] = { house: raw[n].house || '', decor: (raw[n].decor || []).slice(0, 4), title: raw[n].title || '', plot: raw[n].plot || null }; }); cachePut_('v:inv', inv); }
  }
  const cut = Date.now() - 90000;
  return {
    ok: true, api: API_VERSION, open: chatOpen_(chatCfg_()), title: pubLite.title,
    students: pubLite.students.map(function (s) { return { name: s.name, lv: s.lv, look: s.look }; }),
    pos: cacheGet_('v:pos', {}), inv: inv,
    emo: cacheGet_('v:emo', []).filter(function (x) { return x.ts > cut; }),
    chat: cacheGet_('v:chat', []).filter(function (x) { return x.ts > cut; }),
    hanaLook: hanaLook_(), mega: megaList_(), butler: butlerToday_(), banners: todayList_('banners'), hallMute: Object.keys(hallMuteList_()),
    now: Date.now()
  };
}
function studentVillage_(name, body) {
  const cfg = chatCfg_(), T = isTeacherName_(name);
  if (!T && !chatOpen_(cfg)) return { ok: true, error: 'closed' };
  const lock = lightLock_(10000);
  try {
    if (body.op === 'act') {                     // 🎣 츄르 뽑기·낚시·마시멜로 같은 마을 놀이는 하루 20번
      if (isTeacherName_(name)) return { ok: true, left: 999 };
      const k = 'act:' + name + ':' + todayStr_(), n = Number(props_().getProperty(k) || 0);
      if (n >= VILLAGE_ACT_DAILY) return { ok: true, error: 'actlimit', left: 0 };
      props_().setProperty(k, String(n + 1));
      return { ok: true, left: VILLAGE_ACT_DAILY - n - 1 };
    }
    if (body.op === 'move') {
      const x = Math.max(0, Math.min(1600, Math.round(Number(body.x) || 0))), y = Math.max(0, Math.min(1000, Math.round(Number(body.y) || 0)));
      let sc = String(body.sc || 'out');
      if (!/^(out|west|east|south|hall|arcade|hana|eng|cafe|house:.{1,20})$/.test(sc)) sc = 'out';
      const pos = cacheGet_('v:pos', {}), now = Date.now();
      const p = { x: x, y: y, sc: sc, ts: now };
      const sit = String(body.s || ''), seat = Math.floor(Number(body.t));
      if (sit) {
        const cap = (SEAT_CAP[sc] || {})[sit];
        if (!cap || !(seat >= 0 && seat < cap)) return { ok: true, error: 'bad' };
        const taken = Object.keys(pos).some(function (n) { const q = pos[n]; return n !== name && q && q.sc === sc && q.s === sit && q.t === seat && now - q.ts < 600000; });
        if (taken) return { ok: true, error: 'full' };
        p.s = sit; p.t = seat;
        if (body.a) p.a = String(body.a).slice(0, 12);
      }
      Object.keys(pos).forEach(function (n) { if (now - pos[n].ts > 3600000 || !pos[n].sc) delete pos[n]; });   // 오래된 자리 정리
      pos[name] = p; cachePut_('v:pos', pos);
    } else {
      if (!T && (cfg.muted || []).indexOf(name) >= 0) return { ok: true, error: 'muted' };
      if (!T && hallMuted_(name)) return { ok: true, error: 'hallmute' };
      const e = String(body.e || '');
      if (EMOTES.indexOf(e) < 0) return { ok: true, error: 'bad' };
      const last = Number(props_().getProperty('emoLast:' + name) || 0);
      if (!T && Date.now() - last < 1500) return { ok: true, error: 'slow' };
      props_().setProperty('emoLast:' + name, String(Date.now()));
      cachePush_('v:emo', { n: name, e: e, ts: Date.now() }, 40);
    }
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ---------------- 🏘️ 마을: 모둠 자리 · 집 · 하나 · 확성기 ---------------- */
/* 🎤 학급회의 진행자(회장석·부회장석)는 회의실 친구의 말을 잠깐 막을 수 있어요 (30분 · 회의실 안에서만) */
function chairOf_(name) {
  const p = cacheGet_('v:pos', {})[name];
  return !!(p && p.sc === 'hall' && (p.s === 'PRES' || p.s === 'VICE') && Date.now() - p.ts < 600000);
}
function hallMuteList_() { const now = Date.now(), m = cacheGet_('hall:mute', {}); Object.keys(m).forEach(function (k) { if (m[k] < now) delete m[k]; }); return m; }
function hallMuted_(name) {
  const m = hallMuteList_(); if (!m[name]) return false;
  const p = cacheGet_('v:pos', {})[name];
  return !!(p && p.sc === 'hall' && Date.now() - p.ts < 600000);
}
function hallMute_(name, body) {
  if (!chairOf_(name) && !isTeacherName_(name)) return { ok: true, error: 'notchair' };
  const m = hallMuteList_(), who = String(body.who || '');
  if (who && who !== name) { if (body.on) m[who] = Date.now() + 1800000; else delete m[who]; }
  cachePut_('hall:mute', m);
  return { ok: true, muted: Object.keys(m) };
}
function myTable_(name) {
  const p = cacheGet_('v:pos', {})[name];
  return (p && p.sc === 'hall' && p.s && Date.now() - p.ts < 600000) ? p.s : '';
}
function todayList_(key) {
  const ds = todayStr_();
  try { return JSON.parse(props_().getProperty(key) || '[]').filter(function (x) { return x.ds === ds; }); } catch (e) { return []; }
}
function butlerToday_() {
  try { const b = JSON.parse(props_().getProperty('butler') || 'null'); return b && b.ds === todayStr_() ? b.n : ''; } catch (e) { return ''; }
}
/* ✨📢 마을 공지 설정 (선생님): 새로 꾸몄어요 · 확성기 켜기/끄기와 떠 있는 시간(분) */
/* ⚙️ 학생 화면 설정 (학생 화면 👑 관리 → 학생 화면 설정에서 시내쌤이 바꿔요 · 출석부 설정과 따로 저장) */
const NEWS_GROUPS_ = { look: [], play: ['drink', 'fish', 'churu', 'camp', 'swing', 'slide', 'nap', 'boat', 'surf', 'climb', 'yarn', 'scratch', 'sunbath', 'build', 'hide', 'photo'], eng: ['eng'], hana: ['hana'], house: ['house'], idea: ['idea'] };
function stuCfg_() {
  const P = props_(); let s = null;
  try { s = JSON.parse(P.getProperty('stuCfg') || 'null'); } catch (e) {}
  if (!s) {      // 처음 한 번: 예전 설정(출석부 설정에 있던 값)을 옮겨 와요
    let t = {}; try { t = JSON.parse(P.getProperty('tickerCfg') || '{}') || {}; } catch (e) {}
    let cf = {}; try { cf = readRows_().map.config || {}; } catch (e) {}
    s = { news: { on: P.getProperty('newsOn') !== '0', min: Number(t.lookMin) || 60, kinds: { look: t.look !== false, play: true, eng: true, hana: true, house: true, idea: true } },
      mega: { on: t.mega !== false, min: Number(t.megaMin) || 60 },
      closingAt: P.getProperty('closingAt') !== null ? String(P.getProperty('closingAt')) : String(cf.closingAt === undefined ? '15:00' : (cf.closingAt || '')),
      guideVer: String(cf.guideVer || ''), guideNotes: String(cf.guideNotes || '') };
    try { P.setProperty('stuCfg', JSON.stringify(s)); } catch (e) {}
  }
  s.news = Object.assign({ on: true, min: 60 }, s.news || {}); s.news.kinds = Object.assign({ look: true, play: true, eng: true, hana: true, house: true, idea: true }, s.news.kinds || {});
  s.mega = Object.assign({ on: true, min: 60 }, s.mega || {});
  s.askOpen = !!s.askOpen;   // 💌 to. 시내T 질문·건의·상담 (기본: 잠금 · 신고만)
  return s;
}
function stuCfgSet_(d) {
  const s = stuCfg_(), n = d || {}, num = function (v, def) { v = Math.round(Number(v)); return v >= 1 && v <= 1440 ? v : def; };
  if (n.news) { s.news.on = !!n.news.on; s.news.min = num(n.news.min, s.news.min); Object.keys(s.news.kinds).forEach(function (k) { if (n.news.kinds && k in n.news.kinds) s.news.kinds[k] = !!n.news.kinds[k]; }); }
  if (n.mega) { s.mega.on = !!n.mega.on; s.mega.min = num(n.mega.min, s.mega.min); }
  if (typeof n.closingAt === 'string') s.closingAt = /^\d\d:\d\d$/.test(n.closingAt) ? n.closingAt : '';
  if (typeof n.guideVer === 'string') s.guideVer = n.guideVer.slice(0, 12);
  if (typeof n.guideNotes === 'string') s.guideNotes = n.guideNotes.slice(0, 1500);
  if ('askOpen' in n) s.askOpen = !!n.askOpen;
  props_().setProperty('stuCfg', JSON.stringify(s)); bump_();
  return s;
}
function tickerCfg_() { const s = stuCfg_(); return { look: s.news.on && s.news.kinds.look, lookMin: s.news.min, mega: s.mega.on, megaMin: s.mega.min }; }
/* 🏘️ 마을 소식: 물 마시기 · 시험 통과 같은 소소한 일 (캐시 · 3시간) */
const NEWS_KINDS_ = ['drink', 'fish', 'churu', 'camp', 'swing', 'slide', 'nap', 'boat', 'surf', 'climb', 'yarn', 'scratch', 'sunbath', 'build', 'hide', 'photo', 'eng', 'hana', 'house', 'idea'];
function addNews_(name, k) {
  if (NEWS_KINDS_.indexOf(k) < 0 || isTeacherName_(name)) return;
  try {
    const c = cache_(), now = Date.now(); let list = JSON.parse(c.get('news') || '[]');
    if (list.some(function (x) { return x.n === name && x.k === k && now - x.ts < 600000; })) return;   // 같은 일은 10분에 한 번만
    list.push({ ts: now, n: name, k: k }); list = list.filter(function (x) { return now - x.ts < 10800000; }).slice(-40);
    c.put('news', JSON.stringify(list), 21600);
  } catch (e) {}
}
function newsList_() { try { return JSON.parse(cache_().get('news') || '[]'); } catch (e) { return []; } }
function megaList_() {
  const cut = Date.now() - (Number(stuCfg_().mega.min) || 60) * 60000;
  try { return JSON.parse(props_().getProperty('mega') || '[]').filter(function (m) { return m.ts > cut; }); } catch (e) { return []; }
}
function houseReady_(inv, id) {
  const i = HOUSE_ORDER.indexOf(id);
  if (i <= 0) return true;
  return i === 1 || (inv.houses || []).indexOf(HOUSE_ORDER[i - 1]) >= 0;
}
function findFurn_(eco, id) {
  const lists = [['furn', eco.furn || []], ['wall', eco.walls || []], ['floor', eco.floors || []]];
  for (let i = 0; i < lists.length; i++) {
    const f = lists[i][1].filter(function (x) { return x.id === id; })[0];
    if (f) return Object.assign({ kind: lists[i][0] }, f);
  }
  return null;
}
const ROOM_SIZE = { h_box: [6, 4], h_tent: [7, 4], h_cabin: [8, 5], h_cottage: [9, 6], h_castle: [11, 7] };
function roomSizeOf_(inv) {
  let best = 'h_box';
  (inv.houses || []).forEach(function (h) { if (HOUSE_ORDER.indexOf(h) > HOUSE_ORDER.indexOf(best)) best = h; });
  return ROOM_SIZE[best];
}
function cleanRoom_(room, eco, inv, lv) {
  const size = roomSizeOf_(inv), out = { wall: '', floor: '', items: [] }, used = {};
  const okSkin = function (id, list) {
    if (!id) return true;
    const f = (list || []).filter(function (x) { return x.id === id; })[0];
    if (!f) return false;
    if (lv >= 99) return true;                       // 👑 선생님은 모든 벽지·바닥
    return f.price > 0 ? (inv.skins || []).indexOf(id) >= 0 : (f.lv || 1) <= lv;
  };
  if (!okSkin(room.wall, eco.walls)) return { error: 'locked' };
  if (!okSkin(room.floor, eco.floors)) return { error: 'locked' };
  out.wall = String(room.wall || ''); out.floor = String(room.floor || '');
  const items = Array.isArray(room.items) ? room.items.slice(0, 30) : [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i], f = (eco.furn || []).filter(function (x) { return x.id === String(it[0]); })[0];
    const x = Math.floor(Number(it[1])), y = Math.floor(Number(it[2]));
    if (!f || !(x >= 0 && x < size[0] && y >= 0 && y < size[1])) return { error: 'bad' };
    if (f.price > 0) { used[f.id] = (used[f.id] || 0) + 1; if (used[f.id] > ((inv.furn || {})[f.id] || 0) && lv < 99) return { error: 'locked' }; }
    else if ((f.lv || 1) > lv) return { error: 'locked' };
    out.items.push([f.id, x, y, it[3] ? 1 : 0]);
  }
  return { room: out };
}
function roomState_(owner) {
  const hit = cacheGet_('room:' + owner, null);
  if (hit) return hit;
  const map = readRows_().map, inv = (map.inv || {})[owner] || {};
  const st = { ok: true, owner: owner, house: inv.house || 'h_box', houses: inv.houses || [], size: roomSizeOf_(inv), room: inv.room || null };
  cachePut_('room:' + owner, st);
  return st;
}
function hanaLook_() { try { return JSON.parse(props_().getProperty('hanaLook') || '{}'); } catch (e) { return {}; } }
function hanaOf_(name) { try { return JSON.parse(props_().getProperty('hana:' + name) || '{}'); } catch (e) { return {}; } }
function hanaRank_() {
  const all = props_().getProperties(), out = [];
  Object.keys(all).forEach(function (k) { if (k.indexOf('hana:') === 0) { try { out.push({ n: k.slice(5), p: JSON.parse(all[k]).p || 0 }); } catch (e) {} } });
  return out.sort(function (a, b) { return b.p - a.p; }).slice(0, 5);
}
function hanaLvOf_(p) { let lv = 0; HANA_LV.forEach(function (t, i) { if (p >= t) lv = i; }); return lv; }
// 🐱 하나와 놀기 · 하나 꾸미기 (Lv.5 이상)
function studentHana_(name, body) {
  const T = isTeacherName_(name), ds = todayStr_();
  const lock = lightLock_(10000);   // 하나는 출석부 데이터를 쓰지 않아요 (코인은 시트 줄 추가)
  try {
    const map = readRows_().map, eco = economy_(map), hana = eco.hana || {};
    const st = hanaOf_(name); st.p = st.p || 0; if (st.d !== ds) { st.d = ds; st.c = {}; }
    let error = '', gained = 0, line = '';
    if (body.op === 'hana' && body.act) {
      const a = (hana.acts || []).filter(function (x) { return x.id === body.act; })[0];
      if (!a) error = 'bad';
      else if (hanaLvOf_(st.p) < (a.need || 0) && !T) error = 'locked';
      else if ((st.c[a.id] || 0) >= (a.day || 1) && !T) error = 'limit';
      else if (!T && Object.keys(st.c).reduce(function (n, k) { return n + (st.c[k] || 0); }, 0) >= HANA_DAILY) error = 'daylimit';
      else {
        if (a.cost && !T) {
          const rows = readCoins_();
          if (balanceOf_(rows, name) < a.cost) error = 'poor';
          else addCoin_(name, -a.cost, '하나: ' + a.name, '하나', '', rows);
        }
        if (!error) {
          st.c[a.id] = (st.c[a.id] || 0) + 1; gained = a.aff || 1; st.p += gained; addNews_(name, 'hana');
          props_().setProperty('hana:' + name, JSON.stringify(st));
          cachePush_('v:emo', { n: '하나', e: '💛', ts: Date.now() }, 40);
        }
      }
    } else if (body.op === 'hanaDress') {
      const lv = (((map.pub || {}).priv || {})[name] || {}).lv || 1;
      const slot = String(body.slot || ''), item = String(body.item || '');
      const it = (hana.items || []).filter(function (x) { return x.id === item; })[0];
      const last = Number(props_().getProperty('hanaDressLast:' + name) || 0);
      const bt = butlerToday_();
      if (bt && bt !== name && !T) error = 'butler';
      else if (!bt && lv < 5 && !T) error = 'lv';
      else if (['head', 'face', 'mouth', 'body'].indexOf(slot) < 0 || (item && (!it || it.slot !== slot))) error = 'bad';
      else if (Date.now() - last < 20000 && !T) error = 'slow';
      else {
        const look = hanaLook_(); look[slot] = item; look.by = name; look.at = Date.now();
        props_().setProperty('hanaLook', JSON.stringify(look)); props_().setProperty('hanaDressLast:' + name, String(Date.now()));
        bump_();
      }
    }
    return { ok: true, error: error, gained: gained, aff: st.p, lv: hanaLvOf_(st.p), counts: st.c || {}, rank: hanaRank_(), look: hanaLook_() };
  } finally { lock.releaseLock(); }
}

/* ---------------- 🪪 프로필 (ID 카드) ---------------- */
const PROFILE_FIELDS = { nick: 12, bday: 10, mbti: 4, food: 20, hobby: 20, subject: 12, dream: 20, motto: 40, song: 30 };
function studentProfile_(name, body) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const db = readRows_(), map = db.map, cfg = chatCfg_(), out = {};
    Object.keys(PROFILE_FIELDS).forEach(function (k) { const v = cleanText_((body.data || {})[k], cfg).slice(0, PROFILE_FIELDS[k]); if (v) out[k] = v; });
    map.profiles = map.profiles || {}; map.profiles[name] = out;
    writeRows_(db, ['profiles']); cacheDrop_(['card:' + name]);
    return { ok: true, profile: out };
  } finally { lock.releaseLock(); }
}
/* 👑 선생님 마법 (마을에서 'OO쌤'만): 아무 친구의 집·하나 친밀도·칭호·꾸밈·이사·코인을 바로 바꿔요 */
function studentGod_(name, body) {
  if (!isTeacherName_(name)) return { ok: true, error: 'notteacher' };
  const who = String(body.who || '').trim(); if (!who) return { ok: true, error: 'bad' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const db = readRows_(), map = db.map; map.inv = map.inv || {};
    const inv = map.inv[who] = map.inv[who] || { house: '', houses: [], decor: [] };
    let invDirty = false;
    if (body.house != null) {
      const i = HOUSE_ORDER.indexOf(String(body.house));
      if (i < 0) return { ok: true, error: 'bad' };
      inv.houses = HOUSE_ORDER.slice(1, i + 1); inv.house = i === 0 ? '' : HOUSE_ORDER[i]; invDirty = true;
    }
    if (body.title != null) { inv.title = String(body.title).replace(/[<>]/g, '').trim().slice(0, 8); invDirty = true; }
    if (body.decorClear) { inv.decor = []; invDirty = true; }
    if (body.decorAdd) { const d = String(body.decorAdd); if (/^d_[a-z]+$/.test(d)) { inv.decor = (inv.decor || []).concat([d]).slice(-6); invDirty = true; } }
    if (body.plot !== undefined) {
      const plot = String(body.plot || '');
      if (plot && !/^P([1-9]|1[0-2])$/.test(plot)) return { ok: true, error: 'bad' };
      if (plot && Object.keys(map.inv).some(function (n) { return n !== who && map.inv[n] && map.inv[n].plot && map.inv[n].plot.id === plot; })) return { ok: true, error: 'taken' };
      inv.plot = plot ? { id: plot, ready: todayStr_() } : null; invDirty = true;
    }
    if (invDirty) { writeRows_(db, ['inv']); cacheDrop_(['v:inv', 'room:' + who, 'card:' + who]); }
    let aff = null;
    if (body.aff != null || body.affAdd != null || body.hanaReset) {
      const st = hanaOf_(who); st.p = st.p || 0;
      if (body.aff != null) st.p = Math.max(0, Math.min(9999, Math.round(Number(body.aff) || 0)));
      if (body.affAdd != null) st.p = Math.max(0, Math.min(9999, st.p + Math.round(Number(body.affAdd) || 0)));
      if (body.hanaReset) st.c = {};
      props_().setProperty('hana:' + who, JSON.stringify(st)); cacheDrop_(['card:' + who]); aff = st.p;
    }
    if (body.coins) {
      const amt = Math.round(Number(body.coins) || 0);
      if (amt) addCoin_(who, amt, '👑 선생님 마법' + (body.why ? ': ' + String(body.why).slice(0, 20) : ''), '선생님', '', readCoins_());
    }
    bump_();
    const h = hanaOf_(who);
    return { ok: true, error: '', inv: inv, aff: aff != null ? aff : (h.p || 0), hanaLv: hanaLvOf_(aff != null ? aff : (h.p || 0)), coins: balanceOf_(readCoins_(), who) };
  } finally { lock.releaseLock(); }
}
/* 👀 출석부 보기 전용 (학생 페이지 → 출석부 보러가기). 선생님이 정한 입장 코드가 맞아야 보여줘요 */
function boardOf_(code) {
  const v = version_();
  let b = cacheGet_('board:' + v, null);
  if (!b) {
    const map = readRows_().map, pub = map.pub || {}, priv = pub.priv || {}, cfg = map.config || {}, st = map.statuses || {};
    b = { code: String(cfg.accessCode || ''), hours: Number(cfg.accessHours) || 3, data: {
      ok: true, api: API_VERSION, now: Date.now(), title: pub.title || cfg.mainTitle || '', ds: pub.ds || '', late: cfg.lateTimeSetting || '', tiers: cfg.expTiers || null,
      students: (pub.students || []).map(function (s) { const pv = priv[s.name] || {}; return { name: s.name, lv: s.lv, exp: pv.exp || 0, look: ((cfg.looks || {})[s.name]) || s.look || {}, status: (st[s.name] || {}).t || '' }; }),
      epoch: Number(cfg.accessEpoch) || 0, cleanWhy: pub.cleanWhy || {}, clean: pub.ds && pub.ds === todayStr_() ? (pub.clean || []) : [], bubble: cfg.bubbleCfg || null, timetable: cfg.timetable || null,
      board: (function () { const o = {}; Object.keys(priv).forEach(function (n) { if (priv[n] && priv[n].today) o[n] = priv[n].today; }); return o; })()
    } };
    cachePut_('board:' + v, b);
  }
  if (b.code && code !== b.code) {
    const f = Number(cache_().get('gatefail') || 0) + 1; try { cache_().put('gatefail', String(f), 60); } catch (e) {}
    return { ok: false, error: f > 30 ? 'slow' : 'gate', api: API_VERSION };
  }
  const out = b.data; out.sleep = sleepCfg_(); out.punish = publicPunish_(); out.hours = b.hours; out.notices = readNotices_(); out.closing = readList_(CLOSING_SHEET, CLOSING_HEADER); out.urgent = readList_(URGENT_SHEET, URGENT_HEADER); out.meal = mealPub_(); out.hw = hwPub_(); out.reload = reloadInfo_(); out.mealEn = menuEnToday_(); out.menuPick = menuPickers_();
  return out;
}
function cardOf_(name) {
  const hit = cacheGet_('card:' + name, null); if (hit) return hit;
  const map = readRows_().map, pub = publicState_(map), s = (pub.students || []).filter(function (x) { return x.name === name; })[0];
  if (!s) return { ok: false, error: 'none' };
  const inv = (map.inv || {})[name] || {}, hana = hanaOf_(name);
  const card = { ok: true, name: name, lv: s.lv, lvName: s.lvName, look: s.look, profile: (map.profiles || {})[name] || {}, title: inv.title || '',
    house: inv.house || 'h_box', hana: hana.p || 0, status: ((map.statuses || {})[name] || {}).t || '' };
  try { cache_().put('card:' + name, JSON.stringify(card), 120); } catch (e) {}
  return card;
}

/* ---------------- 📚 영어 학원 ---------------- */
// ▶ 처음 한 번: Apps Script 위쪽 함수 목록에서 '드라이브권한확인'을 고르고 실행 → 권한 허용 → 새 버전으로 배포
/* 🚚 서버 이사 (일반 계정 → 학교 계정)
 * 1) 지금(옛) 시트에서 이사준비 실행 → '_이사' 시트에 설정(학생 비밀번호 등)을 옮겨 적어요
 * 2) 새 계정에서 시트 '사본 만들기' → 사본의 Apps Script에서 이사마무리 실행
 * 3) 사본에서 새 배포 → 새 주소를 출석부 ⚙️ 설정 → 🚚 서버 이사 칸에 넣기 */
function 이사준비() {
  const all = PropertiesService.getScriptProperties().getProperties(), ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('_이사'); if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet('_이사');
  const rows = Object.keys(all).filter(function (k) { return k !== 'movedTo'; }).map(function (k) { return [k, all[k]]; });
  sh.getRange(1, 1, 1, 2).setValues([['이사용 설정 (이사마무리 후 자동으로 지워져요)', '']]);
  if (rows.length) sh.getRange(2, 1, rows.length, 2).setNumberFormat('@').setValues(rows);
  Logger.log('✅ 이사 준비 끝: 설정 ' + rows.length + '개를 _이사 시트에 적었어요. 이제 새 계정에서 이 시트의 사본을 만들어 주세요.');
}
function 이사마무리() {
  const ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName('_이사');
  if (!sh) { Logger.log('❌ _이사 시트가 없어요. 옛 시트에서 이사준비를 먼저 실행하고 사본을 다시 만들어 주세요.'); return; }
  const vals = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues() : [], o = {};
  vals.forEach(function (r) { if (r[0]) o[String(r[0])] = String(r[1]); });
  PropertiesService.getScriptProperties().setProperties(o, false);
  Object.keys(o).forEach(function (k) { CacheService.getScriptCache().remove('P:' + k); });
  PropertiesService.getScriptProperties().deleteProperty('movedTo'); CacheService.getScriptCache().remove('P:movedTo');
  ss.deleteSheet(sh);
  const it = DriveApp.getFoldersByName('냥냥 영어 문제'); if (!it.hasNext()) DriveApp.createFolder('냥냥 영어 문제');
  Logger.log('✅ 이사 마무리 끝: 설정 ' + Object.keys(o).length + '개를 옮겼어요. 이제 [배포] → [새 배포] (웹 앱 · 실행: 나 · 액세스: 모든 사용자)를 해 주세요.');
}
function 이사취소() {
  PropertiesService.getScriptProperties().deleteProperty('movedTo'); CacheService.getScriptCache().remove('P:movedTo');
  Logger.log('✅ 이사 표시를 지웠어요. 이 서버를 다시 써요.');
}

function 드라이브권한확인() {
  const it = DriveApp.getFoldersByName('냥냥 영어 문제'), folder = it.hasNext() ? it.next() : DriveApp.createFolder('냥냥 영어 문제');
  Logger.log('✅ 드라이브 권한 OK · 폴더: ' + folder.getName());
}
function engKey_(ds) { return 'eng:' + (ds || todayStr_()); }
function engSet_(ds) { try { return JSON.parse(props_().getProperty(engKey_(ds)) || 'null'); } catch (e) { return null; } }
function normAns_(v) {
  return String(v == null ? '' : v).toLowerCase().replace(/[①-⑩]/g, function (c) { return String('①②③④⑤⑥⑦⑧⑨⑩'.indexOf(c) + 1); })
    .replace(/[\s.,!?'"`~()\[\]{}·]/g, '');
}
function engUpload_(body) {
  const images = (body.images || []).slice(0, 12), answers = (body.answers || []).slice(0, 10).map(function (a) { return String(a || '').trim(); });
  if (!images.length) return { ok: false, error: 'noimg' };
  const it = DriveApp.getFoldersByName('냥냥 영어 문제'), folder = it.hasNext() ? it.next() : DriveApp.createFolder('냥냥 영어 문제');
  const ds = String(body.ds || todayStr_()), urls = [];
  images.forEach(function (d, i) {
    const m = String(d).match(/^data:(image\/\w+);base64,(.+)$/); if (!m) return;
    const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], ds + '_' + (i + 1) + '.' + m[1].split('/')[1]);
    const f = folder.createFile(blob);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    urls.push('https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w2000');
  });
  const set = { ds: ds, title: String(body.title || '오늘의 영어').slice(0, 40), urls: urls, answers: answers, n: 10, at: Date.now() };
  props_().setProperty(engKey_(ds), JSON.stringify(set)); bump_();
  return { ok: true, set: engPublicOf_(set) };
}
function engPublicOf_(set) {
  if (!set) return { ok: true, none: true };
  const subj = []; for (let i = 0; i < 10; i++) subj.push(!(set.answers || [])[i]);
  return { ok: true, ds: set.ds, title: set.title, urls: set.urls, n: set.n || 10, subj: subj };
}
function engPublic_() { return engPublicOf_(engSet_()); }
function engResultKey_(name) { return 'engr:' + todayStr_() + ':' + name; }
function engReward_(name, map) {
  const eco = economy_(map), r = eco.engReward || { coins: 25, exp: 25 };
  if (addCoin_(name, r.coins, '영어 학원 통과', '영어', 'eng:' + todayStr_() + ':' + name)) expQueue_(name, r.exp, '📚 영어 학원 통과');
}
function studentEng_(name, body) {
  const lock = body.op === 'engMine' ? NOLOCK_ : lightLock_(10000);
  try {
    const set = engSet_(), k = engResultKey_(name);
    let res = null; try { res = JSON.parse(props_().getProperty(k) || 'null'); } catch (e) {}
    if (body.op === 'engMine') return { ok: true, result: res, set: engPublicOf_(set) };
    if (!set) return { ok: true, error: 'none' };
    if (body.op === 'engSubmit') {
      const practice = !!(res && res.pass);       // 통과한 뒤 다시 풀기 = 연습 (저장·보상 없음)
      if (practice && !body.practice) return { ok: true, result: res };
      const ans = (body.answers || []).slice(0, 10).map(function (a) { return String(a || '').slice(0, 60); });
      const marks = [];
      for (let i = 0; i < 10; i++) {
        const key = (set.answers || [])[i];
        if (!key) { marks.push(null); continue; }              // 주관식 → 선생님 확인
        const keys = String(key).split('/').map(normAns_);   // 정답이 여러 개면 / 로 나눠요
        marks.push(keys.indexOf(normAns_(ans[i])) >= 0 ? 1 : 0);
      }
      const score = marks.reduce(function (s, m) { return s + (m === 1 ? 10 : 0); }, 0);
      if (practice) return { ok: true, result: { ans: ans, marks: marks, score: score, pass: score >= 80, practice: true } };
      res = { ans: ans, marks: marks, score: score, pass: score >= 80, tries: ((res && res.tries) || 0) + 1, at: Date.now() };
      props_().setProperty(k, JSON.stringify(res));
      if (res.pass) { const m1 = readRows_().map; engReward_(name, m1); addNews_(name, 'eng'); try { autoSettle_(name, economy_(m1), readCoins_(), m1); } catch (e) {} }
      return { ok: true, result: res };
    }
    if (body.op === 'engPass') {                // 👩‍🏫 선생님 통과 (관리자 비밀번호)
      const map = readRows_().map, pin = String(((map.config || {}).adminPin) || '');
      if (!res) return { ok: true, error: 'nores' };
      if (!pin || String(body.pin || '') !== pin) return { ok: true, error: 'pin' };
      res.pass = true; res.byTeacher = true; props_().setProperty(k, JSON.stringify(res));
      engReward_(name, map);
      return { ok: true, result: res };
    }
    return { ok: true, result: res };
  } finally { lock.releaseLock(); }
}
function engResults_() {
  const all = props_().getProperties(), pre = 'engr:' + todayStr_() + ':', out = [];
  Object.keys(all).forEach(function (k) { if (k.indexOf(pre) === 0) { try { const r = JSON.parse(all[k]); out.push({ n: k.slice(pre.length), score: r.score, pass: r.pass, byTeacher: !!r.byTeacher, tries: r.tries, ans: r.ans, marks: r.marks }); } catch (e) {} } });
  return { ok: true, set: engPublicOf_(engSet_()), answers: (engSet_() || {}).answers || [], results: out };
}

/* ---------------- 🛟 안전: 보관(백업) 후 비우기 · 전체 백업 ---------------- */
function archiveSheet_(name, header) {
  const ss = SpreadsheetApp.getActive(), sh = sheet_(name, header), n = sh.getLastRow();
  if (n < 2) return;
  const vals = sh.getRange(1, 1, n, header.length).getValues();
  const bk = ss.insertSheet(name + '_보관_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmm'));
  bk.getRange(1, 1, vals.length, header.length).setValues(vals);
  sh.getRange(2, 1, n - 1, header.length).clearContent();
}
function backupAll_() {
  const map = readRows_().map, props = props_().getProperties(), safe = {};
  Object.keys(props).forEach(function (k) { if (k.indexOf('pin:') !== 0 && k !== 'teacherKey' && k.indexOf('fail:') !== 0) safe[k] = props[k]; });
  return { ok: true, at: nowStr_(), data: map, props: safe,
    chat: readChat_(0, function () { return true; }), asks: readAsks_(function () { return true; }), coins: readCoins_(), reqs: readReqs_(function () { return true; }) };
}

/* ---------------- 🐾 냥코인 ---------------- */
function economy_(map) {
  const e = (map.config && map.config.economy) || { missions: [], shop: [], game: {} };
  (e.missions || []).forEach(function (m) { const f = MISSION_FLOW_[m.id]; if (f) { if (m.flow === undefined) m.flow = f.flow; if (m.cap === undefined && f.cap) m.cap = f.cap; } if (m.flow === 'menu') delete m.cap; });   // 🇺🇸 급식 번역은 인원 제한 없이
  return e;
}
/* 🎯 미션 종류: 고른 뒤 어떻게 끝나는지 (sign 서명 · praise 칭찬편지 · appon 출석 1등 · eng 영어 80점 · allon 반 전체 제시간 · allon3 주 3일 · good 바른 한 주 · diary 일기장 5일 · cafe 스터디카페 3일 · locker 사물함 가위바위보 · teacher 선생님이 줌) */
const MISSION_FLOW_ = {
  d_attitude: { flow: 'sign', cap: 5 }, d_praise: { flow: 'praise', cap: 10 }, d_board: { flow: 'appon', cap: 2 }, d_word: { flow: 'eng' }, d_story: { flow: 'story' }, w_menu: { flow: 'menu' },
  a_allon: { flow: 'allon' }, w_allon3: { flow: 'allon3' }, w_good: { flow: 'good' }, w_daily: { flow: 'diary' }, w_study: { flow: 'cafe' },
  w_locker: { flow: 'locker' }, w_best: { flow: 'teacher' }
};
const AUTO_FLOWS_ = { appon: 1, eng: 1, allon: 1, allon3: 1, good: 1, diary: 1, cafe: 1, praise: 1, story: 1, menu: 1 };
const NOPICK_FLOWS_ = { allon: 1, allon3: 1, good: 1, teacher: 1, locker: 1 };   // 🏫 반 단위 · 선생님이 주는 미션은 안 골라도 돼요
function readCoins_() {
  const sh = sheet_(COIN_SHEET, COIN_HEADER), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 7).getValues().map(function (r) {
    return { id: Number(r[0]), t: String(r[1]), name: String(r[2]), amt: Number(r[3]) || 0, why: String(r[4]), kind: String(r[5]), key: String(r[6] || '') };
  });
}
// 'OO쌤'처럼 선생님 이름이면 냥코인 무제한이에요 (잔액·게임 횟수 제한 없음, 기록도 안 남겨요)
function isTeacherName_(name) { return /(쌤|샘|선생님|교감|교장)$/.test(String(name).trim()); }
function balanceOf_(rows, name) { return rows.reduce(function (s, r) { return r.name === name ? s + r.amt : s; }, 0); }
function addCoin_(name, amt, why, kind, key, rows) {
  if (!amt) return false;
  rows = rows || readCoins_();
  if (key && rows.some(function (r) { return r.key === key; })) return false;     // 같은 보상은 한 번만
  const sh = sheet_(COIN_SHEET, COIN_HEADER);
  const id = Number(props_().getProperty('coinSeq') || 0) + 1;
  props_().setProperty('coinSeq', String(id));
  sh.appendRow([id, "'" + nowStr_(), name, amt, why, kind, key]);
  rows.push({ id: id, t: nowStr_(), name: name, amt: amt, why: why, kind: kind, key: key });
  return true;
}
function readReqs_(keep) {
  const sh = sheet_(REQ_SHEET, REQ_HEADER), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 9).getValues().map(function (r) {
    return { id: Number(r[0]), t: String(r[1]), name: String(r[2]), type: String(r[3]), item: String(r[4]), coins: Number(r[5]) || 0, status: String(r[6]), done: String(r[7] || ''), itemId: String(r[8] || '') };
  }).filter(keep);
}
function weekKey_() {
  const d = new Date(Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'00:00:00"));
  const wd = d.getDay() === 0 ? 7 : d.getDay(); d.setDate(d.getDate() - wd + 1);
  return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd');
}
// 미션은 매일 아침 7시, 매주 월요일 아침 7시에 새로 시작해요
function missionDay_() { return Utilities.formatDate(new Date(Date.now() - 7 * 3600000), 'Asia/Seoul', 'yyyy-MM-dd'); }
function missionWeek_() {
  const d0 = new Date(Date.now() - 7 * 3600000), u = Number(Utilities.formatDate(d0, 'Asia/Seoul', 'u'));
  return Utilities.formatDate(new Date(d0.getTime() - (u - 1) * 86400000), 'Asia/Seoul', 'yyyy-MM-dd');
}
function periodKey_(limit) { return limit === 'day' ? missionDay_() : limit === 'week' ? missionWeek_() : limit === 'once' ? 'all' : String(Date.now()); }
/* ✨ 서버에서 생긴 EXP(미션·영어 등)는 교실 출석부가 가져가서 기록해요 */
function expQueue_(name, exp, why) {
  if (!exp) return;
  let q = []; try { q = JSON.parse(props_().getProperty('expq') || '[]'); } catch (e) {}
  q.push({ id: Date.now() + Math.random(), n: name, exp: exp, why: why, ts: Date.now() });
  props_().setProperty('expq', JSON.stringify(q.slice(-300))); bump_();
}
function claimExp_() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (e) { return []; }
  try {
    let q = []; try { q = JSON.parse(props_().getProperty('expq') || '[]'); } catch (e) {}
    const now = Date.now(), out = q.filter(function (x) { return !x.lease || now - x.lease > 60000; });
    if (out.length) { out.forEach(function (x) { x.lease = now; }); props_().setProperty('expq', JSON.stringify(q)); }
    return out;
  } finally { lock.releaseLock(); }
}
function picksOf_(name) {
  let p = {}; try { p = JSON.parse(props_().getProperty('pick:' + name) || '{}'); } catch (e) {}
  const d = missionDay_(), w = missionWeek_();
  if (!p.d || p.d.k !== d) p.d = { k: d, ids: [] };
  if (!p.w || p.w.k !== w) p.w = { k: w, ids: [] };
  return p;
}
function settleReq_(id, ok, map) {
  const r = findRow_(REQ_SHEET, REQ_HEADER, id); if (!r) return;
  const row = r.sh.getRange(r.row, 1, 1, 9).getValues()[0];
  if (String(row[6]) !== '대기') return;
  const name = String(row[2]), type = String(row[3]), coins = Number(row[5]) || 0, itemId = String(row[8] || '');
  if (type === '미션' && ok) {
    const m = (economy_(map).missions || []).filter(function (x) { return x.id === itemId; })[0];
    const mk = 'm:' + itemId + ':' + name + ':' + periodKey_(m ? m.limit : 'none');
    if (m && m.cap) missionPay_(name, m, '', '미션', mk);   // 🏁 선착 성공
    else if (addCoin_(name, coins, '미션: ' + String(row[4]), '미션', mk))
      expQueue_(name, m && m.exp != null ? Number(m.exp) : Math.round(coins / 2), '미션: ' + String(row[4]));
  }
  if (type === '쿠폰' && !ok) addCoin_(name, coins, '쿠폰 취소 환불: ' + String(row[4]), '환불', 'refund:' + id);
  r.sh.getRange(r.row, 7, 1, 2).setValues([[ok ? (type === '쿠폰' ? '지급 완료' : '승인') : (type === '쿠폰' ? '취소(환불)' : '반려'), "'" + nowStr_()]]);
}
function soldCount_(itemId) { return Number(props_().getProperty('sold:' + itemId) || 0); }
function gameOpen_(game) {
  if (props_().getProperty('lockdown') === '1') return false;
  if (game && free_().game > Date.now()) return true;
  if (!game || !game.on) return false;
  const now = new Date(), wd = Number(Utilities.formatDate(now, 'Asia/Seoul', 'u')) % 7;   // 1=월 … 7→0=일
  const h = (game.hours || {})[wd];
  if (!h || !h[0] || !h[1]) return false;
  const t = Utilities.formatDate(now, 'Asia/Seoul', 'HH:mm');
  return t >= h[0] && t < h[1];
}
/* ---------------- 🎯 미션 도우미 ---------------- */
function kidNames_(map) { return (((map.pub || {}).students) || []).map(function (s) { return s.name; }).filter(function (n) { return !isTeacherName_(n); }); }
function pickCount_(mid, slot, k, except) {
  const all = props_().getProperties(); let n = 0;
  Object.keys(all).forEach(function (key) { if (key.indexOf('pick:') !== 0 || key.slice(5) === except) return; try { const p = JSON.parse(all[key]); if (p[slot] && p[slot].k === k && (p[slot].ids || []).indexOf(mid) >= 0) n++; } catch (e) {} });
  return n;
}
/* 🏁 선착 성공: 인원(cap)이 있는 미션은 누구나 고를 수 있고, 먼저 성공한 N명만 냥코인 · 늦게 성공하면 ✨5 EXP + 미션 고르기가 풀려요 */
const LATE_EXP_ = 5;
function missionPay_(name, m, why, kind, key, rows) {
  const per = periodKey_(m.limit), ck = 'msucc:' + m.id + ':' + per;
  if (!m.cap || isTeacherName_(name) || Number(props_().getProperty(ck) || 0) < Number(m.cap)) {
    if (!addCoin_(name, m.coins, '미션: ' + m.name + (why ? ' ' + why : ''), kind, key, rows)) return false;
    if (m.cap && !isTeacherName_(name)) props_().setProperty(ck, String(Number(props_().getProperty(ck) || 0) + 1));
    expQueue_(name, m.exp != null ? Number(m.exp) : Math.round(m.coins / 2), '미션: ' + m.name);
    return 'coin';
  }
  const lk = 'mlate:' + key; if (props_().getProperty(lk)) return false;
  props_().setProperty(lk, '1');
  expQueue_(name, LATE_EXP_, '미션(늦은 성공): ' + m.name);
  try {   // 🎯 고르기 풀어 주기 → 다른 미션을 골라도 돼요
    const pk = picksOf_(name), sl = m.cat === 'weekly' ? 'w' : 'd', i = pk[sl].ids.indexOf(m.id);
    if (i >= 0) { pk[sl].ids.splice(i, 1); if (pk[sl].at) delete pk[sl].at[m.id]; props_().setProperty('pick:' + name, JSON.stringify(pk)); }
    appendChat_('🎯 미션', name, '🏁 "' + m.name + '" 성공! 아쉽게 선착 ' + m.cap + '명이 먼저 채워져서 냥코인 대신 ✨' + LATE_EXP_ + ' EXP를 받았어요. 미션 고르기가 풀렸으니 다른 미션을 골라도 돼요!');
  } catch (e) {}
  return 'late';
}
function capUsed_(eco) {
  const out = {}, d = missionDay_(), w = missionWeek_(), all = props_().getProperties();
  (eco.missions || []).forEach(function (m) { if (m.cap) out[m.id] = Number(all['msucc:' + m.id + ':' + periodKey_(m.limit)] || 0); });   // 🏁 지금까지 성공한 인원
  return out;
}
function kstHM_(ts) { return Utilities.formatDate(new Date(ts || Date.now()), 'Asia/Seoul', 'HH:mm'); }
function kstDs_(ts) { return Utilities.formatDate(new Date(ts || Date.now()), 'Asia/Seoul', 'yyyy-MM-dd'); }
function weekDates_(wk) { const out = [], b = new Date(wk + 'T12:00:00+09:00'); for (let i = 0; i < 7; i++) out.push(kstDs_(b.getTime() + i * 86400000)); return out; }
function dayAllOnTime_(map, ds, kids) {
  const recs = ((map['day:' + ds] || {}).records) || {};
  if (!kids.length || !kids.every(function (n) { return recs[n]; })) return false;
  const pres = kids.filter(function (n) { return recs[n].status !== 'dungeon'; });
  return pres.length > 0 && pres.every(function (n) { return recs[n].status === 'present'; });
}
/* 🎯 고른 자동 미션을 확인해서 냥코인 주기 (같은 보상은 한 번만) */
function autoSettle_(name, eco, rows, map) {
  const pk = picksOf_(name), paid = [], today = todayStr_(), kids = kidNames_(map);
  const pay = function (m, why) {
    const key = 'm:' + m.id + ':' + name + ':' + periodKey_(m.limit), c = cache_();
    if (c.get('pk:' + key)) return; try { c.put('pk:' + key, '1', 900); } catch (e) {}      // 동시에 두 번 정산되지 않게
    const r = missionPay_(name, m, why, '자동', key, rows); if (r === 'coin') paid.push({ name: m.name, coins: m.coins }); else if (r === 'late') paid.push({ name: m.name + ' (늦은 성공 ✨' + LATE_EXP_ + ')', coins: 0 });
  };
  [['d', pk.d], ['w', pk.w]].forEach(function (pair) {
    const sl = pair[1]; (sl.ids || []).forEach(function (id) {
      const m = (eco.missions || []).filter(function (x) { return x.id === id; })[0]; if (!m || !AUTO_FLOWS_[m.flow] || m.flow === 'praise' || NOPICK_FLOWS_[m.flow]) return;
      const at = (sl.at || {})[id] || 0, atDs = at ? kstDs_(at) : '0000';
      try {
        if (m.flow === 'appon') { const r = (((map['day:' + today] || {}).records) || {})[name]; if (r && Number(r.rank) === 1 && (!at || kstHM_(at) <= String(r.time || '99:99'))) pay(m); }
        else if (m.flow === 'eng') { const r = JSON.parse(props_().getProperty(engResultKey_(name)) || 'null'); if (r && r.pass && (!at || !r.at || r.at >= at - 60000)) pay(m); }
        else if (m.flow === 'story') { const st = storyNow_(); if (st && storyAnsOf_(st.id, name) && (!at || st.at >= at - 86400000)) pay(m); }
        else if (m.flow === 'menu') { const days = weekDates_(sl.k), n = menuDays_(name).filter(function (d) { return days.indexOf(d) >= 0 && d >= atDs; }).length; if (n >= 2) pay(m, '(' + n + '일)'); }
        else if (m.flow === 'diary' || m.flow === 'cafe') {
          const days = weekDates_(sl.k), upto = days.filter(function (d) { return d <= today; });
          if (m.flow === 'diary') { const n = diaryDays_(name).filter(function (d) { return days.indexOf(d) >= 0 && d >= atDs; }).length; if (n >= 5) pay(m, '(' + n + '일)'); }
          else if (m.flow === 'cafe') { const c = cafeOf_(name), n = Object.keys(c.days || {}).filter(function (d) { return days.indexOf(d) >= 0 && d >= atDs && c.days[d] >= 60; }).length; if (n >= 3) pay(m, '(' + n + '일)'); }
        }
      } catch (e) {}
    });
  });
  // 🏫 반 단위 미션: 고르지 않아도 조건을 채우면 모두에게
  const wk = missionWeek_(), days = weekDates_(wk), upto = days.filter(function (d) { return d <= today; });
  (eco.missions || []).forEach(function (m) {
    try {
      if (m.flow === 'allon') { const r = (((map['day:' + today] || {}).records) || {})[name]; if (r && r.status === 'present' && dayAllOnTime_(map, today, kids)) pay(m); }
      else if (m.flow === 'allon3') { if (upto.slice(0, 5).filter(function (d) { return dayAllOnTime_(map, d, kids); }).length >= 3) pay(m); }
      else if (m.flow === 'good') {
        const wd = Number(Utilities.formatDate(new Date(), 'Asia/Seoul', 'u'));
        if (!(wd >= 6 || (wd === 5 && kstHM_() >= '15:00'))) return;      // 금요일 오후 3시부터 확인해요
        if (!days.slice(0, 5).some(function (d) { return (((map['day:' + d] || {}).records) || {})[name]; })) return;   // 이번 주 출석이 있어야
        const bad = days.slice(0, 5).some(function (d) {
          const day = map['day:' + d] || {}, r = (day.records || {})[name];
          return (r && r.status === 'late') || (day.notes || []).some(function (n) { return n.who === name && ['swear', 'classlate', 'attitude'].indexOf(n.kind) >= 0; });
        });
        const st = strikes_()[name], wk0 = new Date(wk + 'T07:00:00+09:00').getTime();
        if (!bad && !(st && st.at && st.at >= wk0)) pay(m);
      }
    } catch (e) {}
  });
  return paid;
}
/* ↩ 선생님이 미션 성공 취소: 코인을 되돌리고 EXP도 빼요 (같은 기간엔 다시 받을 수 없어요) */
function missionUndo_(id) {
  const rows = readCoins_(), r = rows.filter(function (x) { return x.id === Number(id); })[0];
  if (!r || !/^m:/.test(r.key) || r.amt <= 0) return false;
  if (!addCoin_(r.name, -r.amt, '↩ 미션 취소: ' + String(r.why).replace(/^미션:\s*/, ''), '취소', 'undo:' + r.id, rows)) return false;
  const mid = r.key.split(':')[1], m = (economy_(readRows_().map).missions || []).filter(function (x) { return x.id === mid; })[0];
  expQueue_(r.name, -(m && m.exp != null ? Number(m.exp) : Math.round(r.amt / 2)), '↩ 미션 취소');
  return true;
}
function missionResults_(rows) {
  const undone = {}; rows.forEach(function (r) { if (/^undo:/.test(r.key)) undone[r.key.slice(5)] = 1; });
  return rows.filter(function (r) { return /^m:/.test(r.key) && r.amt > 0; }).slice(-80).reverse().map(function (r) { return { id: r.id, t: r.t, name: r.name, why: r.why, amt: r.amt, kind: r.kind, undone: !!undone[r.id] }; });
}

/* ---------------- 🍱 급식 메뉴 영어 번역 (급식 관리자가 승인) ---------------- */
function readMenuTr_(keep) {
  const sh = sheet_(MENU_SHEET, MENU_HEADER), n = sh.getLastRow(); if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 6).getValues().map(function (r, i) { return { row: i + 2, id: Number(r[0]), ds: String(r[1]).replace(/^'/, ''), name: String(r[2]), text: String(r[3]), status: String(r[4]), t: String(r[5]) }; }).filter(keep);
}
function menuPickers_() {   // 🇺🇸 이번 주 '급식 영어 번역' 미션을 고른 학생
  try {
    const m = (economy_(readRows_().map).missions || []).filter(function (x) { return x.flow === 'menu'; })[0]; if (!m) return [];
    const w = missionWeek_(), all = props_().getProperties(), out = [];
    Object.keys(all).forEach(function (k) { if (k.indexOf('pick:') !== 0) return; try { const p = JSON.parse(all[k]); if (p.w && p.w.k === w && (p.w.ids || []).indexOf(m.id) >= 0) out.push(k.slice(5)); } catch (e) {} });
    return out;
  } catch (e) { return []; }
}
function menuDays_(name) { return readMenuTr_(function (x) { return x.name === name && x.status === '승인'; }).map(function (x) { return x.ds; }); }
function menuEnToday_() { const t = todayStr_(), a = readMenuTr_(function (x) { return x.ds === t && x.status === '승인'; }); return a.length ? { name: a[a.length - 1].name, text: a[a.length - 1].text } : null; }
function menuTrList_() { const t = todayStr_(); return readMenuTr_(function (x) { return x.status === '대기' || x.ds === t; }).slice(-40).reverse().map(function (x) { return { id: x.id, ds: x.ds, name: x.name, text: x.text, status: x.status }; }); }
/* 🇺🇸 채택 안 된 친구: 이번 주 승인이 하나도 없으면 '급식 번역' 미션 고르기를 풀어서 다른 미션을 고를 수 있게 */
function menuUnpick_(name) {
  try {
    const m = (economy_(readRows_().map).missions || []).filter(function (x) { return x.flow === 'menu'; })[0]; if (!m) return;
    const pk = picksOf_(name), i = pk.w.ids.indexOf(m.id); if (i < 0) return;
    const days = weekDates_(pk.w.k); if (menuDays_(name).some(function (d) { return days.indexOf(d) >= 0; })) return;   // 이번 주에 이미 승인받았으면 그대로 (이어서 도전)
    pk.w.ids.splice(i, 1); if (pk.w.at) delete pk.w.at[m.id];
    props_().setProperty('pick:' + name, JSON.stringify(pk));
    appendChat_('🎯 미션', name, '🇺🇸 오늘 급식 번역은 다른 친구가 채택됐어요. 미션 고르기가 풀렸으니 냥코인에서 다른 주간 미션을 골라도 돼요!');
  } catch (e) {}
}
function menuTrSet_(id, ok) {
  const it = readMenuTr_(function (x) { return x.id === Number(id); })[0]; if (!it) return;
  if (ok && readMenuTr_(function (x) { return x.ds === it.ds && x.status === '승인' && x.id !== it.id; }).length) return;   // 🇺🇸 하루에 하나만 승인
  const sh = sheet_(MENU_SHEET, MENU_HEADER); sh.getRange(it.row, 5).setValue(ok ? '승인' : '반려');
  if (ok) readMenuTr_(function (x) { return x.ds === it.ds && x.status === '대기'; }).forEach(function (x) { sh.getRange(x.row, 5).setValue('마감'); menuUnpick_(x.name); });   // 나머지 대기는 마감 · 미션 고르기 풀어 주기
  if (ok) { try { const map = readRows_().map; autoSettle_(it.name, economy_(map), readCoins_(), map); } catch (e) {} }
  bump_();
}
function studentMenu_(name, body) {
  const text = maskBad_(String(body.text || '').trim().slice(0, 400), (chatCfg_().ban) || []);
  if (!isTeacherName_(name) && menuPickers_().indexOf(name) < 0) return { ok: true, error: 'nopick' };   // 미션을 고른 학생만
  { const en = menuEnToday_(); if (en) return { ok: true, error: en.name === name ? 'done' : 'closed' }; }   // 🇺🇸 오늘 번역이 승인되면 마감
  if (!mealData_()[todayStr_()]) return { ok: true, error: 'nomenu' };   // 급식 관리자가 오늘 메뉴를 올린 뒤에만
  if (text.replace(/\s/g, '').length < 5) return { ok: true, error: 'short' };
  const lock = lightLock_(15000);
  try {
    const t = todayStr_(), sh = sheet_(MENU_SHEET, MENU_HEADER), it = readMenuTr_(function (x) { return x.name === name && x.ds === t; })[0];
    if (it && it.status === '승인') return { ok: true, error: 'done' };
    if (it) sh.getRange(it.row, 4, 1, 3).setValues([[text, '대기', "'" + nowStr_()]]);
    else { const id = Number(props_().getProperty('menuSeq') || 0) + 1; props_().setProperty('menuSeq', String(id)); sh.appendRow([id, "'" + t, name, text, '대기', "'" + nowStr_()]); }
    bump_();
  } finally { lock.releaseLock(); }
  return { ok: true };
}
function mealAuth_(pin) {
  const c = cache_(), f = Number(c.get('mpfail') || 0);
  if (f >= 5) Utilities.sleep(Math.min(8000, 1500 * (f - 4)));
  const cf = readRows_().map.config || {}; pin = String(pin || '');
  const ok = !!pin && ((cf.mealPin && pin === String(cf.mealPin)) || (cf.adminPin && pin === String(cf.adminPin)));
  if (!ok) try { c.put('mpfail', String(f + 1), 1800); } catch (e) {}
  return ok;
}

/* ---------------- 📸 시내T 스토리 (마을 게시판 · 24시간) ---------------- */
function storyNow_() { try { const s = JSON.parse(props_().getProperty('story') || 'null'); return s && Date.now() - s.at < 86400000 ? s : null; } catch (e) { return null; } }
function storyAnswers_(sid) { const sh = sheet_(STORY_SHEET, STORY_HEADER), n = sh.getLastRow(); if (n < 2) return []; return sh.getRange(2, 1, n - 1, 4).getValues().map(function (r, i) { return { row: i + 2, sid: Number(r[0]), name: String(r[1]), ans: String(r[2]), t: String(r[3]) }; }).filter(function (x) { return x.sid === Number(sid); }); }
function storyAnsOf_(sid, name) { return storyAnswers_(sid).filter(function (x) { return x.name === name; })[0] || null; }
function storyPub_() { const s = storyNow_(); return s ? { id: s.id, q: s.q, type: s.type, opts: s.opts || [], pub: !!s.pub, at: s.at } : null; }
function storyView_(name) {
  const s = storyNow_(); if (!s) return { ok: true, story: null };
  const all = storyAnswers_(s.id), mine = all.filter(function (x) { return x.name === name; })[0], T = isTeacherName_(name);
  const out = { ok: true, story: storyPub_(), mine: mine ? mine.ans : '' };
  if (s.type === 'vote') { const cnt = {}; all.forEach(function (x) { cnt[x.ans] = (cnt[x.ans] || 0) + 1; }); if (mine || T) out.votes = cnt; }
  if (T || (s.pub && mine)) out.answers = all.map(function (x) { return { name: x.name, ans: x.ans, t: x.t }; });
  out.count = all.length;
  return out;
}
function studentStory_(name, body) {
  let error = '';
  if (body.op === 'storyAns') {
    const s = storyNow_(); let ans = maskBad_(String(body.ans || '').trim().slice(0, 100), (chatCfg_().ban) || []);
    if (!s) error = 'none';
    else if (!ans) error = 'empty';
    else if (s.type === 'vote' && (s.opts || []).indexOf(ans) < 0) error = 'bad';
    else {
      const lock = lightLock_(15000);
      try {
        const sh = sheet_(STORY_SHEET, STORY_HEADER), it = storyAnsOf_(s.id, name);
        if (it) sh.getRange(it.row, 3, 1, 2).setValues([[ans, "'" + nowStr_()]]); else sh.appendRow([s.id, name, ans, "'" + nowStr_()]);
      } finally { lock.releaseLock(); }
      try { const map = readRows_().map; autoSettle_(name, economy_(map), readCoins_(), map); } catch (e) {}
    }
  }
  const v = storyView_(name); v.error = error; return v;
}

/* ---------------- 💌 편지함 (마을 집 안) · 칭찬편지 미션 ---------------- */
const enc_ = function (t) { return Utilities.base64Encode(String(t || ''), Utilities.Charset.UTF_8); };
const dec_ = function (t) { try { return Utilities.newBlob(Utilities.base64Decode(String(t || ''), Utilities.Charset.UTF_8)).getDataAsString('UTF-8'); } catch (e) { return ''; } };
function readMail_(keep) {
  const sh = sheet_(MAIL_SHEET, MAIL_HEADER), n = sh.getLastRow(); if (n < 2) return [];
  const now = nowStr_();
  return sh.getRange(2, 1, n - 1, 10).getValues().map(function (r, i) { const at = String(r[9] || '').replace(/^'/, ''); return { row: i + 2, id: Number(r[0]), t: String(r[1]).replace(/^'/, ''), from: String(r[2]), to: String(r[3]), kind: String(r[4]), text: r[5], read: String(r[6]) === 'y', ok: String(r[7]) === 'y', mission: String(r[8]), at: at, came: !at || at <= now }; }).filter(keep);
}
/* 📮 편지는 오후 1시에 한꺼번에 도착: 1시 전에 쓰면 오늘 1시, 1시 이후면 내일 1시 (선생님 편지는 바로) */
function mailArrive_() {
  const d = new Date(), hm = Utilities.formatDate(d, 'Asia/Seoul', 'HH:mm');
  if (hm >= '13:00') d.setTime(d.getTime() + 86400000);
  return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd') + ' 13:00';
}
/* 새 편지 수: 도착 시간이 지난 대기 편지를 '새 편지'로 옮겨요 */
function mailNew_(name) {
  const P = props_(); let n = Number(P.getProperty('mailN:' + name) || 0);
  let wait = []; try { wait = JSON.parse(P.getProperty('mailP:' + name) || '[]'); } catch (e) {}
  if (wait.length) {
    const now = nowStr_(), due = wait.filter(function (a) { return a <= now; });
    if (due.length) { n += due.length; P.setProperty('mailN:' + name, String(n)); P.setProperty('mailP:' + name, JSON.stringify(wait.filter(function (a) { return a > now; }))); }
  }
  return n;
}
function studentMail_(name, body) {
  const map = readRows_().map, kids = kidNames_(map).concat((((map.pub || {}).students) || []).map(function (s) { return s.name; }).filter(isTeacherName_));
  let error = '', paid = null;
  if (body.op === 'mailSend') {
    const to = String(body.to || ''), praise = body.kind === 'praise', text = maskBad_(String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, 300), (chatCfg_().ban) || []);
    if (kids.indexOf(to) < 0 || to === name) error = 'to';
    else if (text.length < (praise ? 20 : 5)) error = 'short';
    else if (Date.now() - Number(props_().getProperty('mailLast:' + name) || 0) < 20000 && !isTeacherName_(name)) error = 'slow';
    else {
      const lock = lightLock_(15000);
      try {
        let mission = '';
        if (praise) {
          const eco = economy_(map), m = (eco.missions || []).filter(function (x) { return x.flow === 'praise'; })[0], pk = picksOf_(name);
          if (m && pk.d.ids.indexOf(m.id) >= 0 && !readMail_(function (x) { return x.from === name && x.mission && x.mission.indexOf(pk.d.k) === 0; }).length) mission = pk.d.k + ':' + m.id;   // 미션 편지는 하루 1통
        }
        const id = Number(props_().getProperty('mailSeq') || 0) + 1; props_().setProperty('mailSeq', String(id));
        const at = isTeacherName_(name) ? '' : mailArrive_();
        sheet_(MAIL_SHEET, MAIL_HEADER).appendRow([id, "'" + nowStr_(), name, to, praise ? '칭찬' : '편지', enc_(text), '', '', mission, at ? "'" + at : '']);
        if (at) { let w = []; try { w = JSON.parse(props_().getProperty('mailP:' + to) || '[]'); } catch (e) {} w.push(at); props_().setProperty('mailP:' + to, JSON.stringify(w)); }
        else { props_().setProperty('mailN:' + to, String(Number(props_().getProperty('mailN:' + to) || 0) + 1)); appendChat_('📮 우체부', to, '📮 새 편지가 도착했어요! 마을 → 우리 집 → 📮 편지함에서 확인해요'); }
        props_().setProperty('mailLast:' + name, String(Date.now()));
        bump_();
        paid = { mission: !!mission, at: at };
      } finally { lock.releaseLock(); }
    }
  } else if (body.op === 'mailOk') {             // 💛 받은 사람이 '덜 친한 친구 · 칭찬 쪽지' 둘 다 맞다고 하면 보낸 친구에게 지급
    const it = readMail_(function (x) { return x.id === Number(body.id) && x.to === name && x.came; })[0];
    if (!it || it.kind !== '칭찬') error = 'bad';
    else if (!it.ok && body.a && body.b) {
      const sh = sheet_(MAIL_SHEET, MAIL_HEADER); sh.getRange(it.row, 7, 1, 2).setValues([['y', 'y']]);
      if (it.mission) {
        const parts = it.mission.split(':'), eco = economy_(map), m = (eco.missions || []).filter(function (x) { return x.id === parts[1]; })[0];
        if (m) missionPay_(it.from, m, '→ ' + name, '자동', 'm:' + m.id + ':' + it.from + ':' + parts[0]);   // 🏁 선착 성공
      }
    }
  } else if (body.op === 'mailRead') {
    const it = readMail_(function (x) { return x.id === Number(body.id) && x.to === name && x.came; })[0];
    if (it && !it.read) sheet_(MAIL_SHEET, MAIL_HEADER).getRange(it.row, 7).setValue('y');
  }
  if (body.op === 'mailList' || body.op === 'mailOk' || body.op === 'mailRead') { mailNew_(name); props_().setProperty('mailN:' + name, '0'); }
  const box = readMail_(function (x) { return x.to === name && x.came; }).slice(-40).reverse().map(function (x) { return { id: x.id, t: x.at || x.t, from: x.from, kind: x.kind, text: dec_(x.text), read: x.read, ok: x.ok }; });
  const sent = readMail_(function (x) { return x.from === name; }).slice(-20).reverse().map(function (x) { return { id: x.id, t: x.t, to: x.to, kind: x.kind, ok: x.ok, mission: !!x.mission, at: x.came ? '' : x.at }; });
  return { ok: true, error: error, inbox: box, sent: sent, sentInfo: paid, kids: kids };
}
/* 선생님: 칭찬편지 결과만 (내용 없이) */
function praiseResults_() { return readMail_(function (x) { return x.kind === '칭찬'; }).slice(-60).reverse().map(function (x) { return { t: x.t, from: x.from, to: x.to, ok: x.ok, mission: !!x.mission }; }); }

/* ---------------- 📔 집 안 일기장 (주인만 쓰고, 선생님과 주인이 고른 친구만 읽어요) ---------------- */
const DIARY_MIN = 50;
function readDiary_(keep) {
  const sh = sheet_(DIARY_SHEET, DIARY_HEADER), n = sh.getLastRow(); if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 5).getValues().map(function (r, i) { return { row: i + 2, id: Number(r[0]), ds: String(r[1]).replace(/^'/, ''), name: String(r[2]), text: r[3], t: String(r[4]) }; }).filter(keep);
}
function diaryDays_(name) { return readDiary_(function (x) { return x.name === name; }).map(function (x) { return x.ds; }); }
function diaryReaders_(name) { try { return JSON.parse(props_().getProperty('diaryR:' + name) || '[]') || []; } catch (e) { return []; } }
function studentDiary_(name, body) {
  let error = '';
  const ds = todayStr_();
  if (body.op === 'diarySave') {
    const text = maskBad_(String(body.text || '').trim().slice(0, 1000), (chatCfg_().ban) || []);
    if (text.replace(/\s/g, '').length < DIARY_MIN) error = 'short';
    else {
      const lock = lightLock_(15000);
      try {
        const sh = sheet_(DIARY_SHEET, DIARY_HEADER), it = readDiary_(function (x) { return x.name === name && x.ds === ds; })[0];
        if (it) sh.getRange(it.row, 4, 1, 2).setValues([[enc_(text), "'" + nowStr_()]]);
        else { const id = Number(props_().getProperty('diarySeq') || 0) + 1; props_().setProperty('diarySeq', String(id)); sh.appendRow([id, "'" + ds, name, enc_(text), "'" + nowStr_()]); }
      } finally { lock.releaseLock(); }
    }
  } else if (body.op === 'diaryReaders') {
    props_().setProperty('diaryR:' + name, JSON.stringify((Array.isArray(body.list) ? body.list : []).map(String).slice(0, 30)));
  }
  const owner = String(body.owner || name), can = owner === name || isTeacherName_(name) || diaryReaders_(owner).indexOf(name) >= 0;
  if (!can) return { ok: true, error: error, owner: owner, locked: true };
  const list = readDiary_(function (x) { return x.name === owner; }).slice(-30).reverse().map(function (x) { return { ds: x.ds, text: dec_(x.text), t: x.t }; });
  return { ok: true, error: error, owner: owner, mine: owner === name, entries: list, readers: owner === name ? diaryReaders_(name) : undefined, min: DIARY_MIN };
}

/* ---------------- ☕ 스터디카페: 1시간 집중 (앱을 나가면 탈락) ---------------- */
function cafeOf_(name) { try { return JSON.parse(props_().getProperty('cafe:' + name) || '{}') || {}; } catch (e) { return {}; } }
function studentCafe_(name, body) {
  const c = cafeOf_(name), now = Date.now(); let error = '', done = false;
  c.days = c.days || {};
  if (body.op === 'cafeStart') { c.s = { start: now, last: now }; }
  else if (body.op === 'cafeBeat' || body.op === 'cafeDone') {
    if (!c.s) error = 'none';
    else if (now - c.s.last > 150000) { error = 'gap'; c.s = null; }                  // 2분 넘게 소식이 없으면 탈락
    else {
      c.s.last = now;
      if (body.op === 'cafeDone') {
        if (now - c.s.start >= 59.5 * 60000) { const d = kstDs_(c.s.start); c.days[d] = Math.max(c.days[d] || 0, 60); done = true; c.s = null; }
        else error = 'early';
      }
    }
  } else if (body.op === 'cafeQuit') { c.s = null; }
  Object.keys(c.days).sort().slice(0, -14).forEach(function (d) { delete c.days[d]; });
  props_().setProperty('cafe:' + name, JSON.stringify(c));
  const wk = weekDates_(missionWeek_());
  return { ok: true, error: error, done: done, session: c.s || null, week: Object.keys(c.days).filter(function (d) { return wk.indexOf(d) >= 0 && c.days[d] >= 60; }).length, now: now };
}

/* ---------------- 🗄 사물함 구역: 월요일 8:45까지 신청 → 신청자끼리 가위바위보 ---------------- */
function lockerKeyNow_() {   // 지금 신청할 수 있는 주 (주말 · 월요일 8:45 전)
  const wd = Number(Utilities.formatDate(new Date(), 'Asia/Seoul', 'u')), hm = kstHM_();
  if (wd === 1 && hm < '08:45') return weekKey_();
  if (wd === 6 || wd === 7) return kstDs_(Date.now() + (8 - wd) * 86400000);
  return '';
}
function lockerOf_(k) { try { return JSON.parse(props_().getProperty('locker:' + k) || 'null') || { apps: [] }; } catch (e) { return { apps: [] }; } }
function lockerResolve_(k, L) {
  const wd = Number(Utilities.formatDate(new Date(), 'Asia/Seoul', 'u')), started = k < kstDs_() || (k === kstDs_() && kstHM_() >= '08:45');
  if (!started || L.winner || L.none) return false;
  const now = Date.now();
  if (!L.game) {
    if (!L.apps.length) { L.none = true; return true; }
    if (L.apps.length === 1) { L.winner = L.apps[0]; return true; }
    L.game = { round: 1, alive: L.apps.slice(), hands: {}, start: now, hist: [] }; return true;
  }
  const G = L.game, sub = Object.keys(G.hands).filter(function (n) { return G.alive.indexOf(n) >= 0; });
  const timeout = now - G.start > 180000;
  if (sub.length < G.alive.length && !(timeout && sub.length)) { if (timeout && !sub.length) G.start = now; return timeout; }
  const kinds = {}; sub.forEach(function (n) { kinds[G.hands[n]] = 1; });
  const ks = Object.keys(kinds), beats = { '✊': '✌️', '✌️': '✋', '✋': '✊' };
  let next = sub;
  if (ks.length === 2) { const win = beats[ks[0]] === ks[1] ? ks[0] : ks[1]; next = sub.filter(function (n) { return G.hands[n] === win; }); }
  G.hist.push({ round: G.round, hands: G.hands, out: G.alive.filter(function (n) { return next.indexOf(n) < 0; }) });
  G.hist = G.hist.slice(-6);
  if (next.length === 1) { L.winner = next[0]; return true; }
  G.alive = next; G.hands = {}; G.round++; G.start = now; return true;
}
function lockerView_(name) {
  const applyK = lockerKeyNow_(), curK = weekKey_();
  const A = applyK ? lockerOf_(applyK) : null, L = lockerOf_(curK);
  try { if (lockerResolve_(curK, L)) { props_().setProperty('locker:' + curK, JSON.stringify(L)); lockerReq_(curK, L); } } catch (e) {}
  return { applyK: applyK, applied: A ? A.apps.indexOf(name) >= 0 : false, apps: A ? A.apps.length : 0,
    cur: { k: curK, apps: L.apps, winner: L.winner || '', none: !!L.none, game: L.game ? { round: L.game.round, alive: L.game.alive, mine: L.game.hands[name] || '', left: Math.max(0, 180 - Math.round((Date.now() - L.game.start) / 1000)), hist: L.game.hist } : null } };
}
function lockerReq_(k, L) {   // 🏆 우승하면 선생님께 지급 신청이 저절로
  if (!L.winner || L.reqMade) return;
  const map = readRows_().map, m = (economy_(map).missions || []).filter(function (x) { return x.flow === 'locker'; })[0];
  const sh = sheet_(REQ_SHEET, REQ_HEADER), id = Number(props_().getProperty('reqSeq') || 0) + 1;
  props_().setProperty('reqSeq', String(id));
  sh.appendRow([id, "'" + nowStr_(), L.winner, '미션', (m ? m.name : '🗄 사물함 구역') + ' · 🏆 가위바위보 우승', m ? m.coins : 50, '대기', '', m ? m.id : 'w_locker']);
  L.reqMade = true; props_().setProperty('locker:' + k, JSON.stringify(L)); bump_();
}
function studentLocker_(name, body) {
  let error = '';
  const lock = lightLock_(10000);
  try {
    if (body.op === 'lockerApply') {
      const k = lockerKeyNow_(); if (!k) error = 'closed';
      else { const A = lockerOf_(k); if (A.apps.indexOf(name) < 0) A.apps.push(name); props_().setProperty('locker:' + k, JSON.stringify(A)); }
    } else if (body.op === 'lockerHand') {
      const k = weekKey_(), L = lockerOf_(k), h = String(body.h || '');
      if (!L.game || L.winner || L.game.alive.indexOf(name) < 0 || ['✊', '✌️', '✋'].indexOf(h) < 0) error = 'bad';
      else if (L.game.hands[name]) error = 'done';
      else { L.game.hands[name] = h; lockerResolve_(k, L); props_().setProperty('locker:' + k, JSON.stringify(L)); lockerReq_(k, L); }
    }
  } finally { lock.releaseLock(); }
  return { ok: true, error: error, locker: lockerView_(name) };
}
function teacherCoins_() {
  try { const m0 = readRows_().map, e0 = economy_(m0), r0 = readCoins_(); kidNames_(m0).forEach(function (n) { autoSettle_(n, e0, r0, m0); }); } catch (e) {}   // 🎯 자동 미션 정산
  const rows = readCoins_(), bal = {};
  rows.forEach(function (r) { bal[r.name] = (bal[r.name] || 0) + r.amt; });
  const reqs = readReqs_(function () { return true; }).slice(-300).reverse();
  const map = readRows_().map, sold = {};
  (economy_(map).shop || []).forEach(function (it) { sold[it.id] = soldCount_(it.id); });
  return { ok: true, results: missionResults_(rows), balances: bal, ledger: rows.slice(-300).reverse(), reqs: reqs, sold: sold, inv: map.inv || {}, missions: economy_(map).missions || [], praise: praiseResults_(), sigs: sheet_(SIG_SHEET, SIG_HEADER).getLastRow() > 1 ? sheet_(SIG_SHEET, SIG_HEADER).getRange(2, 1, sheet_(SIG_SHEET, SIG_HEADER).getLastRow() - 1, 1).getValues().map(function (r) { return Number(r[0]); }) : [] };
}
function studentCoins_(name, body) {
  const lock = lockFor_(body.op !== 'coins', 20000);
  try {
    const db = readRows_(), map = db.map, eco = economy_(map), rows = readCoins_();
    map.inv = map.inv || {};
    const inv = map.inv[name] = map.inv[name] || { house: '', houses: [], decor: [] };
    let error = '', result = null;
    const T = isTeacherName_(name);
    const bal = function () { return T ? 1e9 : balanceOf_(rows, name); };
    const LK = eco.locked || {};                    // 🔒 선생님이 잠가 둔 기능 (코인 모으기는 계속 돼요)
    const lockedOp = !T && ((LK.shop && ['buy', 'buyFurn'].indexOf(body.op) >= 0) || (LK.missions && ['missionPick', 'missionReq'].indexOf(body.op) >= 0));
    const ds = todayStr_();
    if (lockedOp) error = 'locked';
    else if (body.op === 'buy') {
      const it = (eco.shop || []).filter(function (x) { return x.id === body.item; })[0];
      if (!it || it.off) error = 'noitem';
      else if (bal() < it.price) error = 'poor';
      else if (!T && it.stock > 0 && soldCount_(it.id) >= it.stock) error = 'soldout';
      else if (it.cat === 'house' && (inv.houses || []).indexOf(it.id) >= 0) error = 'owned';
      else if (it.cat === 'house' && !T && !houseReady_(inv, it.id)) error = 'order';
      else if (it.cat === 'mega' && !stuCfg_().mega.on) error = 'off';
      else if (['mega', 'song', 'banner', 'title'].indexOf(it.cat) >= 0 && !cleanText_(body.text, chatCfg_())) error = 'empty';
      else if (it.cat === 'butler' && butlerToday_() && !T) error = 'soldout';
      else if (it.cat === 'decor' && !T && (inv.decor || []).length >= 4) error = 'full';
      else {
        if (!T) {
          addCoin_(name, -it.price, '구매: ' + it.name, '구매', '', rows);
          props_().setProperty('sold:' + it.id, String(soldCount_(it.id) + 1));
        }
        if (it.cat === 'coupon') {
          const sh = sheet_(REQ_SHEET, REQ_HEADER), id = Number(props_().getProperty('reqSeq') || 0) + 1;
          props_().setProperty('reqSeq', String(id));
          sh.appendRow([id, "'" + nowStr_(), name, '쿠폰', it.name, it.price, '대기', '', it.id]);
        } else if (it.cat === 'song') {          // 🎵 아침 신청곡 (교실 화면에서 유튜브 뮤직으로 틀어요)
          const list = todayList_('songs'), id = Date.now();
          list.push({ id: id, n: name, q: cleanText_(body.text, chatCfg_()).slice(0, 100), ts: id, ds: todayStr_() });
          props_().setProperty('songs', JSON.stringify(list.slice(-20))); bump_();
        } else if (it.cat === 'banner') {        // 🎊 축하 배너 (오늘 하루 교실 화면에)
          const st = ['birthday', 'congrats', 'cheer', 'praise', 'love'].indexOf(body.style) >= 0 ? body.style : 'congrats';
          const list = todayList_('banners');
          list.push({ n: name, text: cleanText_(body.text, chatCfg_()).slice(0, 40), style: st, ts: Date.now(), ds: todayStr_() });
          props_().setProperty('banners', JSON.stringify(list.slice(-10))); bump_();
        } else if (it.cat === 'title') {         // 🏷️ 칭호 (마을 이름표 옆)
          inv.title = cleanText_(body.text, chatCfg_()).slice(0, 8);
        } else if (it.cat === 'butler') {        // 🐱 하나 하루 집사
          props_().setProperty('butler', JSON.stringify({ ds: todayStr_(), n: name })); bump_();
        } else if (it.cat === 'mega') {
          const list = megaList_(); list.push({ n: name, text: cleanText_(body.text, chatCfg_()).slice(0, 60), ts: Date.now() });
          props_().setProperty('mega', JSON.stringify(list.slice(-5))); bump_();
        } else if (it.cat === 'house') { inv.houses = (inv.houses || []).concat([it.id]); inv.house = it.id; addNews_(name, 'house'); }
        else if (it.cat === 'decor') { inv.decor = (inv.decor || []).concat([it.id]); }
        if (['house', 'decor', 'title'].indexOf(it.cat) >= 0) { writeRows_(db, ['inv']); cacheDrop_(['v:inv', 'room:' + name]); }
        result = it.name;
      }
    } else if (body.op === 'buyFurn') {
      const f = findFurn_(eco, String(body.item || ''));
      if (!f || !(f.price > 0)) error = 'noitem';
      else if (bal() < f.price) error = 'poor';
      else if (f.kind !== 'furn' && (inv.skins || []).indexOf(f.id) >= 0) error = 'owned';
      else {
        if (!T) addCoin_(name, -f.price, '구매: ' + f.name, '구매', '', rows);
        if (f.kind === 'furn') { inv.furn = inv.furn || {}; inv.furn[f.id] = (inv.furn[f.id] || 0) + 1; }
        else inv.skins = (inv.skins || []).concat([f.id]);
        writeRows_(db, ['inv']); result = f.name;
      }
    } else if (body.op === 'roomSave') {
      const lv = (((map.pub || {}).priv || {})[name] || {}).lv || 1;
      const r = cleanRoom_(body.room || {}, eco, inv, T ? 99 : lv);
      if (r.error) error = r.error; else { inv.room = r.room; writeRows_(db, ['inv']); cacheDrop_(['room:' + name]); result = 'ok'; }
    } else if (body.op === 'relocate') {         // 🏗️ Lv.7부터 집 옮기기 (다음 날 완공)
      const lv = (((map.pub || {}).priv || {})[name] || {}).lv || 1, plot = String(body.plot || '');
      if (lv < 7 && !T) error = 'lv';
      else if (plot && !/^P([1-9]|1[0-2])$/.test(plot)) error = 'bad';
      else if (plot && Object.keys(map.inv).some(function (n) { return n !== name && map.inv[n] && map.inv[n].plot && map.inv[n].plot.id === plot; })) error = 'taken';
      else {
        const tmr = Utilities.formatDate(new Date(Date.now() + 86400000), 'Asia/Seoul', 'yyyy-MM-dd');
        inv.plot = plot ? { id: plot, ready: T ? todayStr_() : tmr } : null;
        writeRows_(db, ['inv']); cacheDrop_(['v:inv']); result = inv.plot;
      }
    } else if (body.op === 'equipHouse') {
      if (body.house === '' || (inv.houses || []).indexOf(body.house) >= 0) { inv.house = body.house || ''; writeRows_(db, ['inv']); cacheDrop_(['v:inv']); }
      else error = 'noitem';
    } else if (body.op === 'missionPick') {      // 🎯 오늘(이번 주) 할 미션 고르기 — 고르면 바꿀 수 없어요
      const m = (eco.missions || []).filter(function (x) { return x.id === body.mid; })[0];
      const pk = picksOf_(name), lim = eco.pickLimit || { daily: 2, weekly: 3 };
      const slot = m && m.cat === 'daily' ? 'd' : m && m.cat === 'weekly' ? 'w' : '';
      const pickable = m && slot && !NOPICK_FLOWS_[m.flow] && (m.flow || m.auto || m.req);   // 🎯 반 단위 미션 빼고는 모두 골라요
      if (!pickable) error = 'noitem';
      else if (pk[slot].ids.indexOf(m.id) >= 0) error = 'owned';
      else if (!T && pk[slot].ids.length >= (slot === 'd' ? lim.daily : lim.weekly)) error = 'pickfull';
      else if (m.flow === 'sign' && !String(body.subj || '').trim()) error = 'subj';
      else {
        pk[slot].ids.push(m.id); pk[slot].at = pk[slot].at || {}; pk[slot].at[m.id] = Date.now();
        if (m.flow === 'sign') { pk[slot].meta = pk[slot].meta || {}; pk[slot].meta[m.id] = { subj: String(body.subj).slice(0, 20) }; }
        props_().setProperty('pick:' + name, JSON.stringify(pk)); result = m.name;
      }
    } else if (body.op === 'missionReq') {
      const m = (eco.missions || []).filter(function (x) { return x.id === body.mid; })[0];
      const pk0 = picksOf_(name);
      const key = m ? 'm:' + m.id + ':' + name + ':' + periodKey_(m.limit) : '';
      const pending = readReqs_(function (r) { return r.name === name && r.itemId === body.mid && r.status === '대기'; }).length;
      const sig = String(body.sig || ''), subj = m && m.flow === 'sign' ? String((((pk0.d.meta || {})[m.id]) || {}).subj || body.subj || '').slice(0, 20) : '';
      if (!m || (!m.req && m.flow !== 'sign') || AUTO_FLOWS_[m.flow]) error = m && AUTO_FLOWS_[m.flow] ? 'auto' : 'noitem';
      else if (!T && pk0.d.ids.indexOf(m.id) < 0 && pk0.w.ids.indexOf(m.id) < 0) error = 'nopick';
      else if (pending && !T) error = 'pending';
      else if (!T && m.limit !== 'none' && rows.some(function (r) { return r.key === key; })) error = 'done';
      else if (m.flow === 'sign' && (!/^data:image\/png;base64,/.test(sig) || sig.length > 48000 || !body.sure)) error = 'sig';
      else {
        const sh = sheet_(REQ_SHEET, REQ_HEADER), id = Number(props_().getProperty('reqSeq') || 0) + 1;
        props_().setProperty('reqSeq', String(id));
        sh.appendRow([id, "'" + nowStr_(), name, '미션', m.name + (subj ? ' · ' + subj : ''), m.coins, '대기', '', m.id]);
        if (m.flow === 'sign') sheet_(SIG_SHEET, SIG_HEADER).appendRow([id, subj, sig]);   // ✍️ 서명은 따로 보관
        result = m.name;
      }
    } else if (body.op === 'game') {
      const g = eco.game || {}, bet = Math.floor(Number(body.bet) || 0);
      const playsKey = 'plays:' + name + ':' + ds, plays = Number(props_().getProperty(playsKey) || 0);
      if (!T && !gameOpen_(g)) error = 'closed';
      else if (!T && plays >= (g.daily || 5)) error = 'limit';
      else if (!(bet >= 1 && bet <= (T ? 1000 : (g.maxBet || 30)))) error = 'bet';
      else if (bal() < bet) error = 'poor';
      else {
        let net = 0, detail = {};
        if (body.g === 'rps') {
          const hands = ['✊', '✌️', '✋'], me = hands.indexOf(body.pick);
          if (me < 0) error = 'bad';
          else {
            const ai = Math.floor(Math.random() * 3), diff = (me - ai + 3) % 3;   // 0 비김, 1 짐, 2 이김
            net = diff === 0 ? 0 : diff === 2 ? bet : -bet;
            detail = { me: hands[me], hana: hands[ai], res: diff === 0 ? 'draw' : diff === 2 ? 'win' : 'lose' };
          }
        } else if (body.g === 'cups') {
          const pick = Number(body.pick), ans = Math.floor(Math.random() * 3);
          if (!(pick >= 0 && pick <= 2)) error = 'bad';
          else { const win = pick === ans; net = win ? Math.round(bet * 1.5) : -bet; detail = { pick: pick, ans: ans, res: win ? 'win' : 'lose' }; }
        } else if (body.g === 'slot') {          // 🎰 같은 그림 3개 +4배 (🐾 3개 +9배) · 2개 +0.5배 · 아니면 -1배
          const sym = ['🐟', '🧶', '🐭', '🍡', '🐾'], reel = [0, 1, 2].map(function () { return sym[Math.floor(Math.random() * 5)]; });
          const same = reel[0] === reel[1] && reel[1] === reel[2], pair = !same && (reel[0] === reel[1] || reel[1] === reel[2] || reel[0] === reel[2]);
          net = same ? bet * (reel[0] === '🐾' ? 9 : 4) : pair ? Math.ceil(bet / 2) : -bet;
          detail = { reel: reel, res: same ? 'jackpot' : pair ? 'win' : 'lose' };
        } else if (body.g === 'coin') {          // 🪙 앞/뒤 맞히기 (반반) · 맞히면 +1배
          const pick = body.pick === 'tail' ? 'tail' : 'head', ans = Math.random() < 0.5 ? 'head' : 'tail';
          net = pick === ans ? bet : -bet; detail = { pick: pick, ans: ans, res: pick === ans ? 'win' : 'lose' };
        } else if (body.g === 'dice') {          // 🎲 숫자 맞히기 (1/6) · 맞히면 +4배
          const pick = Math.floor(Number(body.pick)), ans = 1 + Math.floor(Math.random() * 6);
          if (!(pick >= 1 && pick <= 6)) error = 'bad';
          else { net = pick === ans ? bet * 4 : -bet; detail = { pick: pick, ans: ans, res: pick === ans ? 'win' : 'lose' }; }
        } else error = 'bad';
        if (!error) {
          props_().setProperty(playsKey, String(plays + 1));
          const GN = { rps: '하나랑 가위바위보', cups: '츄르 컵 찾기', slot: '냥냥 슬롯', coin: '동전 앞뒤', dice: '주사위 맞히기' };
          if (net && !T) addCoin_(name, net, '게임: ' + GN[body.g], '게임', '', rows);
          result = detail; result.net = net;
        }
      }
    }
    const paid = body.op === 'coins' && !T ? autoSettle_(name, eco, rows, map) : [];
    const g = eco.game || {};
    const reqs = readReqs_(function (r) { return r.name === name; }).slice(-40).reverse();
    const sold = {}; (eco.shop || []).forEach(function (it) { if (it.stock > 0) sold[it.id] = soldCount_(it.id); });
    return {
      ok: true, error: error, result: result, balance: T ? 0 : bal(), unlimited: T,
      ledger: rows.filter(function (r) { return r.name === name; }).slice(-30).reverse().map(function (r) { return { t: r.t, amt: r.amt, why: r.why }; }),
      inv: inv, reqs: reqs, sold: sold,
      economy: { missions: eco.missions || [], shop: (eco.shop || []).filter(function (x) { return !x.off; }), game: { on: !!g.on || T, open: T || gameOpen_(g), maxBet: g.maxBet || 30, daily: g.daily || 5, hours: g.hours || {} },
        furn: eco.furn || [], walls: eco.walls || [], floors: eco.floors || [], hana: eco.hana || {}, meeting: eco.meeting || {}, locked: eco.locked || {} },
      playsLeft: T ? 99 : Math.max(0, (g.daily || 5) - Number(props_().getProperty('plays:' + name + ':' + ds) || 0)),
      claimed: rows.filter(function (r) { return r.name === name && r.key; }).map(function (r) { return r.key; }),
      undone: (function () { const u = {}; rows.forEach(function (r) { if (r.name === name && /^undo:/.test(r.key)) u[r.key.slice(5)] = 1; }); return rows.filter(function (r) { return u[r.id]; }).map(function (r) { return r.key; }); })(),
      picks: picksOf_(name), periods: { day: missionDay_(), week: missionWeek_() }, paid: paid,
      capUsed: capUsed_(eco), locker: lockerView_(name), tt: (map.config && map.config.timetable) || null, kids: kidNames_(map)
    };
  } finally { lock.releaseLock(); }
}
