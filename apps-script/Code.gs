/**
 * 🐾 냥냥 출석 아일랜드 — 구글 시트 동기화 서버 (v3)
 *
 * 이 코드를 구글 시트의 [확장 프로그램] → [Apps Script]에 붙여넣고
 * [배포] → [새 배포] (이미 배포했다면 [배포 관리] → ✏️ → 새 버전)
 *   유형: 웹 앱 / 실행: 나 / 액세스: 모든 사용자
 * 나온 웹 앱 주소(…/exec)를 출석부 ⚙️ 설정 → ☁️ 동기화 칸에 붙여넣으면 끝!
 *
 * 시트 구성 (자동으로 만들어져요)
 *  - 알림 : A2칸부터 한 줄에 하나씩 적으면 모든 화면의 '오늘의 알림'에 떠요.
 *  - 종례 : A2칸부터 한 줄에 하나씩 적으면 '종례하기' 화면과 학생 페이지에 떠요.
 *  - 대화 : 학생 페이지 '우리 반 대화'(귓속말 포함) 기록이에요. 선생님은 모두 볼 수 있어요.
 *  - 건의함 : 학생이 보낸 질문·건의와 선생님 답변이에요.
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
const CLOSING_HEADER = '📋 종례 — A2칸부터 한 줄에 하나씩 적으세요 (종례하기 화면에 자동 반영)';
const API_VERSION = 4;
const CHAT_SHEET = '대화', CHAT_HEADER = ['번호', '시간', '보낸 사람', '받는 사람(빈칸=전체)', '내용', '상태'];
const ASK_SHEET = '건의함', ASK_HEADER = ['번호', '시간', '보낸 사람', '종류', '내용', '익명', '답변', '답변 시간', '상태'];
// 기본 금지어 (선생님이 설정에서 더 넣을 수 있어요) — 걸리면 ♡로 바뀌어요
const BASE_BAN = ['시발', '씨발', '씨빨', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '븅신', '개새', '새끼', 'ㅅㄲ', '지랄', 'ㅈㄹ', '좆', '존나', 'ㅈㄴ',
  '닥쳐', '꺼져', '미친놈', '미친년', '엠창', '니애미', '느금', '애미', '애비', '꼴통', '찐따', '장애인새', '죽어'];
const MAX_FAIL = 5, LOCK_MINUTES = 10;

// 학생이 직접 고를 수 있는 꾸미기 (레벨 · 자리 · 색 개수) — 출석부 화면의 ITEMS와 같아야 해요
const ITEM_RULES = {
  eye:      { lv: 1,  slot: 'eye',   n: 7 },
  mouth:    { lv: 1,  slot: 'mouth', n: 5 },
  sprout:   { lv: 2,  slot: 'top',   n: 6 },
  bow:      { lv: 3,  slot: 'earR',  n: 6 },
  scarf:    { lv: 4,  slot: 'neck',  n: 6 },
  flower:   { lv: 5,  slot: 'earL',  n: 5 },
  starclip: { lv: 6,  slot: 'earR',  n: 5 },
  wings:    { lv: 7,  slot: 'back',  n: 5 },
  crown:    { lv: 8,  slot: 'top',   n: 5 },
  wizard:   { lv: 9,  slot: 'top',   n: 5 },
  fur:      { lv: 10, slot: 'fur',   n: 6 }
};
const LOOK_SLOTS = ['eye', 'mouth', 'top', 'earR', 'earL', 'neck', 'back', 'fur'];

/* ---------------- 입구 ---------------- */
function doGet(e) {
  try { return out_(publicGet_((e && e.parameter) || {})); }
  catch (err) { return out_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'student') return out_(handleStudent_(body));
    const auth = teacherAuth_(body.key);
    if (!auth.ok) return out_({ ok: false, error: 'auth', api: API_VERSION });
    if (body.action === 'pull') return out_(teacherPull_(body, auth));
    if (body.action === 'chat') return out_({ ok: true, cfg: chatCfg_(), msgs: readChat_(Number(body.after || 0), function () { return true; }) });
    if (body.action === 'asks') return out_({ ok: true, asks: readAsks_(function () { return true; }) });
    return out_(handlePost_(body, auth));
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- 공통 도구 ---------------- */
function props_() { return PropertiesService.getScriptProperties(); }
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
function readList_(name, header) {
  const sh = sheet_(name, [header]);
  const n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 1).getDisplayValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (t) { return t; });
}
function writeList_(name, header, list) {
  const sh = sheet_(name, [header]);
  const n = sh.getLastRow();
  if (n >= 2) sh.getRange(2, 1, n - 1, 1).clearContent();
  if (list.length) sh.getRange(2, 1, list.length, 1).setValues(list.map(function (t) { return [String(t)]; }));
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
    students: (pub.students || []).map(function (s) {
      return { name: s.name, lv: s.lv, lvName: s.lvName, look: looks[s.name] || s.look || {}, lookAt: lookAt[s.name] || 0 };
    })
  };
}
function publicGet_(p) {
  const v = version_();
  const res = { ok: true, api: API_VERSION, v: v, notices: readNotices_(), closing: readList_(CLOSING_SHEET, CLOSING_HEADER) };
  if (p.since === undefined || Number(p.since) !== v) res.pub = publicState_(readRows_().map);
  return res;
}

/* ---------------- 교사: 전체 읽기 ---------------- */
function teacherPull_(body, auth) {
  const v = version_();
  const res = { ok: true, api: API_VERSION, v: v, needKey: auth.needKey, notices: readNotices_(), closing: readList_(CLOSING_SHEET, CLOSING_HEADER) };
  if (body.since === undefined || Number(body.since) !== v) {
    const map = readRows_().map;
    const st = { config: map.config || null, days: {}, acks: {} };
    Object.keys(map).forEach(function (k) {
      if (k.indexOf('day:') === 0) st.days[k.slice(4)] = map[k];
      if (k.indexOf('acks:') === 0) st.acks[k.slice(5)] = map[k];
    });
    res.state = st;
    res.asksOpen = readAsks_(function (a) { return !a.reply && !a.del; }).length;
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
    let replaced = false;
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
          const keepLooks = map.config && map.config.looks;
          map.config = o.data || {};
          if (keepLooks) map.config.looks = keepLooks;   // 고양이 모습은 'look'으로만 바뀌어요
          dirty.config = true; break;
        }
        case 'look': {
          map.config = map.config || {};
          map.config.looks = map.config.looks || {};
          if (o.look) map.config.looks[o.name] = o.look; else delete map.config.looks[o.name];
          map.lookAt = map.lookAt || {}; map.lookAt[o.name] = Date.now();
          dirty.config = true; dirty.lookAt = true; break;
        }
        case 'pub': map.pub = o.data || {}; dirty.pub = true; break;
        case 'notices': writeNotices_(o.list || []); break;
        case 'closing': writeList_(CLOSING_SHEET, CLOSING_HEADER, o.list || []); break;
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
        case 'chatDel': markRow_(CHAT_SHEET, CHAT_HEADER, o.id, 6, '삭제'); break;
        case 'chatSend': appendChat_(String(o.from || '선생님'), String(o.to || ''), String(o.text || '').slice(0, 200)); break;
        case 'askReply': {
          const r = findRow_(ASK_SHEET, ASK_HEADER, o.id);
          if (r) r.sh.getRange(r.row, 7, 1, 2).setValues([[String(o.text || ''), "'" + nowStr_()]]);
          break;
        }
        case 'askDel': markRow_(ASK_SHEET, ASK_HEADER, o.id, 9, '삭제'); break;
        case 'import': {
          const keepLooks = map.config && map.config.looks;
          Object.keys(map).forEach(function (k) { delete map[k]; });
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
    result.ok = true; result.v = bump_();
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
  if (fail.until && Date.now() < fail.until) return { ok: false, error: 'locked', until: fail.until };
  if (hash_('S:' + name + ':' + String(pin || '')) !== stored) {
    fail.n = (fail.n || 0) + 1;
    if (fail.n >= MAX_FAIL) { fail.until = Date.now() + LOCK_MINUTES * 60000; fail.n = 0; }
    p.setProperty('fail:' + name, JSON.stringify(fail));
    return { ok: false, error: 'wrong', left: fail.until ? 0 : MAX_FAIL - fail.n, until: fail.until || 0 };
  }
  if (failRaw) p.deleteProperty('fail:' + name);
  return { ok: true };
}

function cleanLook_(look, lv, old) {
  const out = {};
  LOOK_SLOTS.forEach(function (slot) {
    const v = look && look[slot];
    if (v === '' || v === undefined || v === null) { if (slot !== 'eye' && slot !== 'mouth') out[slot] = ''; return; }
    const parts = String(v).split(':'), rule = ITEM_RULES[parts[0]], ci = Number(parts[1]);
    if (!rule || rule.slot !== slot || !(ci >= 0 && ci < rule.n) || Math.floor(ci) !== ci) return;
    if (rule.lv > lv && !(old && old._free)) return;
    out[slot] = parts[0] + ':' + ci;
  });
  if (old && old._free) out._free = true;           // '모든 아이템 열기'는 선생님만 바꿀 수 있어요
  return out;
}

function handleStudent_(body) {
  const name = String(body.name || '');
  const chk = checkStudent_(name, body.pin);
  if (!chk.ok) return chk;
  // 대화·건의함은 출석부 데이터를 읽지 않아서 가볍게 처리해요
  if (body.op === 'chatPull') return studentChat_(name, body, null);
  if (body.op === 'chatSend') return studentChat_(name, body, readRows_().map.pub || {});
  if (body.op === 'askSend' || body.op === 'askList') return studentAsk_(name, body);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const db = readRows_(), map = db.map;
    const pub = map.pub || {}, priv = (pub.priv || {})[name] || null;
    const ds = todayStr_();
    if (body.op === 'look') {
      const lv = priv ? priv.lv : 1;
      map.config = map.config || {};
      map.config.looks = map.config.looks || {};
      const old = map.config.looks[name];
      map.config.looks[name] = cleanLook_(body.look || {}, lv, old);
      map.lookAt = map.lookAt || {}; map.lookAt[name] = Date.now();
      writeRows_(db, ['config', 'lookAt']);
      bump_();
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
      acked: mine
    };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- 💬 우리 반 대화 ---------------- */
function nowStr_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'); }
function chatCfg_() {
  const def = { on: true, whisper: true, start: '07:00', end: '22:00', muted: [], ban: [] };
  try { return Object.assign(def, JSON.parse(props_().getProperty('chatCfg') || '{}')); } catch (e) { return def; }
}
function chatOpen_(cfg) {
  if (!cfg.on) return false;
  if (!cfg.start || !cfg.end) return true;
  const t = Utilities.formatDate(new Date(), 'Asia/Seoul', 'HH:mm');
  return cfg.start <= cfg.end ? (t >= cfg.start && t < cfg.end) : (t >= cfg.start || t < cfg.end);
}
function cleanText_(text, cfg) {
  let t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  BASE_BAN.concat(cfg.ban || []).forEach(function (w) {
    w = String(w || '').trim(); if (!w) return;
    t = t.split(w).join('♡'.repeat(Math.min(w.length, 3)));
  });
  return t;
}
function appendChat_(from, to, text) {
  const sh = sheet_(CHAT_SHEET, CHAT_HEADER);
  const id = Number(props_().getProperty('chatSeq') || 0) + 1;
  props_().setProperty('chatSeq', String(id));
  sh.appendRow([id, "'" + nowStr_(), from, to, text, '']);
  return id;
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
function studentChat_(name, body, pub) {
  const cfg = chatCfg_(), muted = (cfg.muted || []).indexOf(name) >= 0, open = chatOpen_(cfg);
  const names = ((pub && pub.students) || []).map(function (s) { return s.name; });
  let error = '';
  if (body.op === 'chatSend') {
    const to = String(body.to || ''), text = cleanText_(body.text, cfg);
    const last = Number(props_().getProperty('chatLast:' + name) || 0);
    if (!open) error = 'closed';
    else if (muted) error = 'muted';
    else if (!text) error = 'empty';
    else if (Date.now() - last < 3000) error = 'slow';
    else if (to && (!cfg.whisper || names.indexOf(to) < 0 || to === name)) error = 'whisper';
    else {
      const lock = LockService.getScriptLock(); lock.waitLock(20000);
      try { appendChat_(name, to, text); props_().setProperty('chatLast:' + name, String(Date.now())); }
      finally { lock.releaseLock(); }
    }
  }
  const msgs = readChat_(Number(body.after || 0), function (m) { return !m.del && (m.to === '' || m.to === name || m.from === name); });
  return { ok: true, error: error, cfg: { on: !!cfg.on, open: open, whisper: !!cfg.whisper, start: cfg.start, end: cfg.end }, muted: muted, msgs: msgs };
}

/* ---------------- 📮 질문 · 건의함 ---------------- */
function readAsks_(keep) {
  const sh = sheet_(ASK_SHEET, ASK_HEADER), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 9).getValues()
    .map(function (r) { return { id: Number(r[0]), t: String(r[1]), from: String(r[2]), kind: String(r[3]), text: String(r[4]), anon: String(r[5]) === '예', reply: String(r[6] || ''), rt: String(r[7] || ''), del: String(r[8]) === '삭제' }; })
    .filter(keep);
}
function studentAsk_(name, body) {
  let error = '';
  if (body.op === 'askSend') {
    const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const last = Number(props_().getProperty('askLast:' + name) || 0);
    if (!text) error = 'empty';
    else if (Date.now() - last < 15000) error = 'slow';
    else {
      const lock = LockService.getScriptLock(); lock.waitLock(20000);
      try {
        const sh = sheet_(ASK_SHEET, ASK_HEADER);
        const id = Number(props_().getProperty('askSeq') || 0) + 1;
        props_().setProperty('askSeq', String(id));
        sh.appendRow([id, "'" + nowStr_(), name, body.kind === '건의' ? '건의' : '질문', text, body.anon ? '예' : '', '', '', '']);
        props_().setProperty('askLast:' + name, String(Date.now()));
      } finally { lock.releaseLock(); }
    }
  }
  const mine = readAsks_(function (a) { return a.from === name && !a.del; })
    .map(function (a) { return { id: a.id, t: a.t, kind: a.kind, text: a.text, anon: a.anon, reply: a.reply, rt: a.rt }; });
  return { ok: true, error: error, asks: mine.reverse() };
}
