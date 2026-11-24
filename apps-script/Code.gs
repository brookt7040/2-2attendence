/**
 * 🐾 냥냥 출석 아일랜드 — 구글 시트 동기화 서버 (v7 · 마을 건물·하나·집 꾸미기·원격 출석·상담)
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
const CLOSING_HEADER = '📋 종례 — A2칸부터 한 줄에 하나씩 적으세요 (종례하기 화면에 자동 반영)';
const API_VERSION = 7;
const COIN_SHEET = '냥코인', COIN_HEADER = ['번호', '시간', '이름', '코인', '내용', '구분', '중복키'];
const REQ_SHEET = '신청', REQ_HEADER = ['번호', '시간', '이름', '종류', '항목', '코인', '상태', '처리 시간', '항목ID'];
const EMOTES = ['👋', '💛', '😂', '😮', '🎉', '😭', '👍', '🐾', '💤', '🎣', '💧', '😺', '📸', '🙋', '✋'];
// 🪑 앉을 수 있는 자리 수 — 마을 화면(index.html의 V_OBJS · HALL_TABLES)과 같아야 해요
const SEAT_CAP = {
  out: { fountain: 4, bench1: 2, bench2: 2, longbench: 4, tower: 3, scratch: 1, hammock: 1, box1: 1, box2: 1, sun: 3, pond: 2, churu: 1, swing: 2, cushions: 3, yarn: 1, photo: 6, slide: 1 },
  hall: { T1: 4, T2: 4, T3: 4, T4: 4, T5: 4, T6: 5 }
};
const HOUSE_ORDER = ['h_box', 'h_tent', 'h_cabin', 'h_cottage', 'h_castle'];
const HANA_LV = [0, 20, 60, 120, 200, 320];
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
  fur5:     { lv: 5,  slot: 'fur',   n: 11 },
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
    if (body.action === 'coins') return out_(teacherCoins_());
    if (body.action === 'free') {
      if (body.set) {
        const f = free_();
        ['chat', 'game'].forEach(function (k) { if (body.set[k] !== undefined) f[k] = Math.max(0, Number(body.set[k]) || 0); });
        props_().setProperty('free', JSON.stringify(f));
      }
      return out_({ ok: true, free: free_(), now: Date.now(), chatCfg: chatCfg_() });
    }
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
  if (p.village) return villageState_();
  if (p.room) return roomState_(String(p.room));
  const v = version_();
  const res = { ok: true, api: API_VERSION, v: v, notices: readNotices_(), closing: readList_(CLOSING_SHEET, CLOSING_HEADER) };
  if (p.since === undefined || Number(p.since) !== v) res.pub = publicState_(readRows_().map);
  res.hanaLook = hanaLook_(); res.mega = megaList_(); res.butler = butlerToday_(); res.banners = todayList_('banners');
  return res;
}

/* ---------------- 교사: 전체 읽기 ---------------- */
function teacherPull_(body, auth) {
  const v = version_();
  const res = { ok: true, api: API_VERSION, v: v, needKey: auth.needKey, notices: readNotices_(), closing: readList_(CLOSING_SHEET, CLOSING_HEADER) };
  if (body.remoteOk) res.remote = claimRemote_();
  res.mega = megaList_(); res.hanaLook = hanaLook_(); res.butler = butlerToday_(); res.banners = todayList_('banners'); res.songs = todayList_('songs');
  if (body.since === undefined || Number(body.since) !== v) {
    const map = readRows_().map;
    const st = { config: map.config || null, days: {}, acks: {} };
    Object.keys(map).forEach(function (k) {
      if (k.indexOf('day:') === 0) st.days[k.slice(4)] = map[k];
      if (k.indexOf('acks:') === 0) st.acks[k.slice(5)] = map[k];
    });
    res.state = st;
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
          cacheDrop_(['v:pub']);
          map.config = o.data || {};
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
        case 'pub': map.pub = o.data || {}; dirty.pub = true; cacheDrop_(['v:pub']); break;
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
        case 'askDone': markRow_(ASK_SHEET, ASK_HEADER, o.id, 9, '확인'); break;
        case 'megaDel': props_().setProperty('mega', JSON.stringify(megaList_().filter(function (m) { return m.ts !== Number(o.ts); }))); break;
        case 'hanaReset': props_().setProperty('hanaLook', '{}'); break;
        case 'songDone': props_().setProperty('songs', JSON.stringify(todayList_('songs').map(function (x) { if (x.id === Number(o.id)) x.done = true; return x; }))); break;
        case 'bannerDel': props_().setProperty('banners', JSON.stringify(todayList_('banners').filter(function (x) { return x.ts !== Number(o.ts); }))); break;
        case 'butlerDel': props_().deleteProperty('butler'); break;
        case 'titleDel': { map.inv = map.inv || {}; if (map.inv[o.name]) { map.inv[o.name].title = ''; dirty.inv = true; } cacheDrop_(['v:inv']); break; }
        case 'coinAdd': addCoin_(String(o.name), Number(o.amt) || 0, String(o.why || ''), String(o.kind || '선생님'), String(o.key || '')); break;
        case 'reqDone': settleReq_(Number(o.id), !!o.ok, map); break;
        case 'housePlace': {            // 선생님이 집 · 소품을 정리해 줄 때
          map.inv = map.inv || {}; map.inv[o.name] = o.inv || {}; dirty.inv = true; cacheDrop_(['v:inv']); break;
        }
        case 'import': {
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
  if (body.op === 'move' || body.op === 'emote') return studentVillage_(name, body);
  if (body.op === 'hana' || body.op === 'hanaDress') return studentHana_(name, body);
  if (['coins', 'buy', 'equipHouse', 'missionReq', 'game', 'buyFurn', 'roomSave'].indexOf(body.op) >= 0) return studentCoins_(name, body);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
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
      map.config.looks[name] = cleanLook_(body.look || {}, lv, old);
      map.lookAt = map.lookAt || {}; map.lookAt[name] = Date.now();
      writeRows_(db, ['config', 'lookAt']);
      cacheDrop_(['v:pub']);
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

/* ---------------- 📱 개인 기기 원격 출석 ---------------- */
function remoteList_() {
  const ds = todayStr_();
  try { return JSON.parse(props_().getProperty('remote') || '[]').filter(function (x) { return x.ds === ds; }); } catch (e) { return []; }
}
// 출석부(교사 화면)가 가져가서 처리해요. 가져간 건 claimed 로 표시해서 두 번 처리하지 않아요.
function claimRemote_() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (e) { return []; }
  try {
    const list = remoteList_(), out = list.filter(function (x) { return !x.claimed; });
    if (out.length) { list.forEach(function (x) { x.claimed = true; }); props_().setProperty('remote', JSON.stringify(list)); }
    return out.map(function (x) { return { n: x.n, ts: x.ts }; });
  } finally { lock.releaseLock(); }
}
function studentCheckin_(name, map) {
  const ds = todayStr_();
  const day = map['day:' + ds] || {}, recs = day.records || {};
  if (recs[name]) return { ok: true, error: 'already' };
  const list = remoteList_();
  if (list.some(function (x) { return x.n === name; })) return { ok: true, error: 'pending' };
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
  if (free_().chat > Date.now()) return true;
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
  if (!to) cachePush_('v:chat', { n: from, text: text, ts: Date.now() }, 30);
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
    else if (to && to.charAt(0) === '#' && myTable_(name) !== to.slice(1)) error = 'group';
    else if (to && to.charAt(0) !== '#' && (!cfg.whisper || names.indexOf(to) < 0 || to === name)) error = 'whisper';
    else {
      const lock = LockService.getScriptLock(); lock.waitLock(20000);
      try { if (!error) { appendChat_(name, to, text); props_().setProperty('chatLast:' + name, String(Date.now())); } }
      finally { lock.releaseLock(); }
    }
  }
  const tb = myTable_(name);
  const msgs = readChat_(Number(body.after || 0), function (m) { return !m.del && (m.to === '' || m.to === name || m.from === name || (tb && m.to === '#' + tb)); });
  return { ok: true, error: error, table: tb, cfg: { on: !!cfg.on || open, open: open, whisper: !!cfg.whisper, start: cfg.start, end: cfg.end }, muted: muted, msgs: msgs };
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
    else if (Date.now() - last < 15000 && body.kind !== '긴급') error = 'slow';
    else {
      const lock = LockService.getScriptLock(); lock.waitLock(20000);
      try {
        const sh = sheet_(ASK_SHEET, ASK_HEADER);
        const id = Number(props_().getProperty('askSeq') || 0) + 1;
        props_().setProperty('askSeq', String(id));
        const kind = ['건의', '상담', '긴급'].indexOf(body.kind) >= 0 ? body.kind : '질문';
        const counsel = kind === '상담' || kind === '긴급';
        sh.appendRow([id, "'" + nowStr_(), name, kind, text, body.anon && !counsel ? '예' : '', '', '', '']);
        if (kind === '긴급') bump_();
        props_().setProperty('askLast:' + name, String(Date.now()));
      } finally { lock.releaseLock(); }
    }
  }
  const mine = readAsks_(function (a) { return a.from === name && !a.del; })
    .map(function (a) { return { id: a.id, t: a.t, kind: a.kind, text: a.text, anon: a.anon, reply: a.reply, rt: a.rt, done: a.done }; });
  return { ok: true, error: error, asks: mine.reverse() };
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
    if (!inv) { inv = {}; const raw = map.inv || {}; Object.keys(raw).forEach(function (n) { inv[n] = { house: raw[n].house || '', decor: (raw[n].decor || []).slice(0, 4), title: raw[n].title || '' }; }); cachePut_('v:inv', inv); }
  }
  const cut = Date.now() - 90000;
  return {
    ok: true, api: API_VERSION, open: chatOpen_(chatCfg_()), title: pubLite.title,
    students: pubLite.students.map(function (s) { return { name: s.name, lv: s.lv, look: s.look }; }),
    pos: cacheGet_('v:pos', {}), inv: inv,
    emo: cacheGet_('v:emo', []).filter(function (x) { return x.ts > cut; }),
    chat: cacheGet_('v:chat', []).filter(function (x) { return x.ts > cut; }),
    hanaLook: hanaLook_(), mega: megaList_(), butler: butlerToday_(), banners: todayList_('banners'),
    now: Date.now()
  };
}
function studentVillage_(name, body) {
  const cfg = chatCfg_();
  if (!chatOpen_(cfg)) return { ok: true, error: 'closed' };
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (body.op === 'move') {
      const x = Math.max(0, Math.min(1600, Math.round(Number(body.x) || 0))), y = Math.max(0, Math.min(1000, Math.round(Number(body.y) || 0)));
      let sc = String(body.sc || 'out');
      if (!/^(out|hall|arcade|hana|house:.{1,20})$/.test(sc)) sc = 'out';
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
      if ((cfg.muted || []).indexOf(name) >= 0) return { ok: true, error: 'muted' };
      const e = String(body.e || '');
      if (EMOTES.indexOf(e) < 0) return { ok: true, error: 'bad' };
      const last = Number(props_().getProperty('emoLast:' + name) || 0);
      if (Date.now() - last < 1500) return { ok: true, error: 'slow' };
      props_().setProperty('emoLast:' + name, String(Date.now()));
      cachePush_('v:emo', { n: name, e: e, ts: Date.now() }, 40);
    }
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ---------------- 🏘️ 마을: 모둠 자리 · 집 · 하나 · 확성기 ---------------- */
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
function megaList_() {
  const cut = Date.now() - 3600000;
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
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const map = readRows_().map, eco = economy_(map), hana = eco.hana || {};
    const st = hanaOf_(name); st.p = st.p || 0; if (st.d !== ds) { st.d = ds; st.c = {}; }
    let error = '', gained = 0, line = '';
    if (body.op === 'hana' && body.act) {
      const a = (hana.acts || []).filter(function (x) { return x.id === body.act; })[0];
      if (!a) error = 'bad';
      else if (hanaLvOf_(st.p) < (a.need || 0) && !T) error = 'locked';
      else if ((st.c[a.id] || 0) >= (a.day || 1) && !T) error = 'limit';
      else {
        if (a.cost && !T) {
          const rows = readCoins_();
          if (balanceOf_(rows, name) < a.cost) error = 'poor';
          else addCoin_(name, -a.cost, '하나: ' + a.name, '하나', '', rows);
        }
        if (!error) {
          st.c[a.id] = (st.c[a.id] || 0) + 1; gained = a.aff || 1; st.p += gained;
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

/* ---------------- 🐾 냥코인 ---------------- */
function economy_(map) { return (map.config && map.config.economy) || { missions: [], shop: [], game: {} }; }
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
function periodKey_(limit) { return limit === 'day' ? todayStr_() : limit === 'week' ? weekKey_() : limit === 'once' ? 'all' : String(Date.now()); }
function settleReq_(id, ok, map) {
  const r = findRow_(REQ_SHEET, REQ_HEADER, id); if (!r) return;
  const row = r.sh.getRange(r.row, 1, 1, 9).getValues()[0];
  if (String(row[6]) !== '대기') return;
  const name = String(row[2]), type = String(row[3]), coins = Number(row[5]) || 0, itemId = String(row[8] || '');
  if (type === '미션' && ok) {
    const m = (economy_(map).missions || []).filter(function (x) { return x.id === itemId; })[0];
    addCoin_(name, coins, '미션: ' + String(row[4]), '미션', 'm:' + itemId + ':' + name + ':' + periodKey_(m ? m.limit : 'none'));
  }
  if (type === '쿠폰' && !ok) addCoin_(name, coins, '쿠폰 취소 환불: ' + String(row[4]), '환불', 'refund:' + id);
  r.sh.getRange(r.row, 7, 1, 2).setValues([[ok ? (type === '쿠폰' ? '지급 완료' : '승인') : (type === '쿠폰' ? '취소(환불)' : '반려'), "'" + nowStr_()]]);
}
function soldCount_(itemId) { return Number(props_().getProperty('sold:' + itemId) || 0); }
function gameOpen_(game) {
  if (game && free_().game > Date.now()) return true;
  if (!game || !game.on) return false;
  const now = new Date(), wd = Number(Utilities.formatDate(now, 'Asia/Seoul', 'u')) % 7;   // 1=월 … 7→0=일
  const h = (game.hours || {})[wd];
  if (!h || !h[0] || !h[1]) return false;
  const t = Utilities.formatDate(now, 'Asia/Seoul', 'HH:mm');
  return t >= h[0] && t < h[1];
}
function teacherCoins_() {
  const rows = readCoins_(), bal = {};
  rows.forEach(function (r) { bal[r.name] = (bal[r.name] || 0) + r.amt; });
  const reqs = readReqs_(function () { return true; }).slice(-300).reverse();
  const map = readRows_().map, sold = {};
  (economy_(map).shop || []).forEach(function (it) { sold[it.id] = soldCount_(it.id); });
  return { ok: true, balances: bal, ledger: rows.slice(-300).reverse(), reqs: reqs, sold: sold, inv: map.inv || {} };
}
function studentCoins_(name, body) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const db = readRows_(), map = db.map, eco = economy_(map), rows = readCoins_();
    map.inv = map.inv || {};
    const inv = map.inv[name] = map.inv[name] || { house: '', houses: [], decor: [] };
    let error = '', result = null;
    const T = isTeacherName_(name);
    const bal = function () { return T ? 1e9 : balanceOf_(rows, name); };
    const ds = todayStr_();
    if (body.op === 'buy') {
      const it = (eco.shop || []).filter(function (x) { return x.id === body.item; })[0];
      if (!it || it.off) error = 'noitem';
      else if (bal() < it.price) error = 'poor';
      else if (!T && it.stock > 0 && soldCount_(it.id) >= it.stock) error = 'soldout';
      else if (it.cat === 'house' && (inv.houses || []).indexOf(it.id) >= 0) error = 'owned';
      else if (it.cat === 'house' && !houseReady_(inv, it.id)) error = 'order';
      else if (['mega', 'song', 'banner', 'title'].indexOf(it.cat) >= 0 && !cleanText_(body.text, chatCfg_())) error = 'empty';
      else if (it.cat === 'butler' && butlerToday_()) error = 'soldout';
      else if (it.cat === 'decor' && (inv.decor || []).length >= 4) error = 'full';
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
        } else if (it.cat === 'house') { inv.houses = (inv.houses || []).concat([it.id]); inv.house = it.id; }
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
    } else if (body.op === 'equipHouse') {
      if (body.house === '' || (inv.houses || []).indexOf(body.house) >= 0) { inv.house = body.house || ''; writeRows_(db, ['inv']); cacheDrop_(['v:inv']); }
      else error = 'noitem';
    } else if (body.op === 'missionReq') {
      const m = (eco.missions || []).filter(function (x) { return x.id === body.mid; })[0];
      const key = m ? 'm:' + m.id + ':' + name + ':' + periodKey_(m.limit) : '';
      const pending = readReqs_(function (r) { return r.name === name && r.itemId === body.mid && r.status === '대기'; }).length;
      if (!m || !m.req) error = 'noitem';
      else if (pending) error = 'pending';
      else if (m.limit !== 'none' && rows.some(function (r) { return r.key === key; })) error = 'done';
      else {
        const sh = sheet_(REQ_SHEET, REQ_HEADER), id = Number(props_().getProperty('reqSeq') || 0) + 1;
        props_().setProperty('reqSeq', String(id));
        sh.appendRow([id, "'" + nowStr_(), name, '미션', m.name, m.coins, '대기', '', m.id]);
        result = m.name;
      }
    } else if (body.op === 'game') {
      const g = eco.game || {}, bet = Math.floor(Number(body.bet) || 0);
      const playsKey = 'plays:' + name + ':' + ds, plays = Number(props_().getProperty(playsKey) || 0);
      if (!gameOpen_(g)) error = 'closed';
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
    const g = eco.game || {};
    const reqs = readReqs_(function (r) { return r.name === name; }).slice(-40).reverse();
    const sold = {}; (eco.shop || []).forEach(function (it) { if (it.stock > 0) sold[it.id] = soldCount_(it.id); });
    return {
      ok: true, error: error, result: result, balance: T ? 0 : bal(), unlimited: T,
      ledger: rows.filter(function (r) { return r.name === name; }).slice(-30).reverse().map(function (r) { return { t: r.t, amt: r.amt, why: r.why }; }),
      inv: inv, reqs: reqs, sold: sold,
      economy: { missions: eco.missions || [], shop: (eco.shop || []).filter(function (x) { return !x.off; }), game: { on: !!g.on, open: gameOpen_(g), maxBet: g.maxBet || 30, daily: g.daily || 5, hours: g.hours || {} },
        furn: eco.furn || [], walls: eco.walls || [], floors: eco.floors || [], hana: eco.hana || {}, meeting: eco.meeting || {} },
      playsLeft: T ? 99 : Math.max(0, (g.daily || 5) - Number(props_().getProperty('plays:' + name + ':' + ds) || 0)),
      claimed: rows.filter(function (r) { return r.name === name && r.key; }).map(function (r) { return r.key; })
    };
  } finally { lock.releaseLock(); }
}
