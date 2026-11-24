/**
 * 🐾 냥냥 출석 아일랜드 — 구글 시트 동기화 서버
 *
 * 이 코드를 구글 시트의 [확장 프로그램] → [Apps Script]에 붙여넣고
 * [배포] → [새 배포] → 유형: 웹 앱 / 실행: 나 / 액세스: 모든 사용자 로 배포하세요.
 * 나온 웹 앱 주소(…/exec)를 출석부 ⚙️ 설정 → ☁️ 동기화 칸에 붙여넣으면 끝!
 *
 * 시트 구성 (자동으로 만들어져요)
 *  - 알림 : A2칸부터 한 줄에 하나씩 적으면 모든 화면의 '오늘의 알림'에 떠요.
 *  - 종례 : A2칸부터 한 줄에 하나씩 적으면 '종례하기' 화면에 떠요.
 *  - data : 출석부 데이터 저장용이에요. 직접 고치지 마세요.
 */
const DATA_SHEET = 'data';
const NOTICE_SHEET = '알림';
const NOTICE_HEADER = '📢 오늘의 알림 — A2칸부터 한 줄에 하나씩 적으세요 (모든 화면에 자동 반영)';
const CLOSING_SHEET = '종례';
const CLOSING_HEADER = '📋 종례 — A2칸부터 한 줄에 하나씩 적으세요 (종례하기 화면에 자동 반영)';
const API_VERSION = 2;

function doGet(e) {
  try { return out_(handleGet_((e && e.parameter) || {})); }
  catch (err) { return out_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return out_(handlePost_(body));
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function version_() { return Number(PropertiesService.getScriptProperties().getProperty('v') || 0); }
function bump_() {
  const v = version_() + 1;
  PropertiesService.getScriptProperties().setProperty('v', String(v));
  return v;
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

function stateFrom_(map) {
  const st = { config: map.config || null, days: {} };
  Object.keys(map).forEach(function (k) { if (k.indexOf('day:') === 0) st.days[k.slice(4)] = map[k]; });
  return st;
}

function handleGet_(p) {
  const v = version_();
  const res = { ok: true, api: API_VERSION, v: v, notices: readNotices_(), closing: readList_(CLOSING_SHEET, CLOSING_HEADER) };
  if (p.since === undefined || Number(p.since) !== v) res.state = stateFrom_(readRows_().map);
  return res;
}

function handlePost_(body) {
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
    (body.ops || []).forEach(function (o) {
      switch (o.op) {
        case 'config': map.config = o.data; dirty.config = true; break;
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
        case 'import': {
          Object.keys(map).forEach(function (k) { delete map[k]; });
          if (o.state.config) map.config = o.state.config;
          Object.keys(o.state.days || {}).forEach(function (ds) { map['day:' + ds] = o.state.days[ds]; });
          if (o.notices) writeNotices_(o.notices);
          if (o.closing) writeList_(CLOSING_SHEET, CLOSING_HEADER, o.closing);
          replaced = true;
          break;
        }
      }
    });

    const now = new Date();
    const sh = db.sh;
    if (replaced) {
      const n = sh.getLastRow();
      if (n >= 2) sh.getRange(2, 1, n - 1, 3).clearContent();
      const keys = Object.keys(map).sort();
      if (keys.length) sh.getRange(2, 1, keys.length, 3).setValues(keys.map(function (k) { return [k, JSON.stringify(map[k]), now]; }));
    } else {
      Object.keys(dirty).forEach(function (k) {
        const row = [k, JSON.stringify(map[k]), now];
        if (db.rows[k]) sh.getRange(db.rows[k], 1, 1, 3).setValues([row]);
        else { sh.appendRow(row); db.rows[k] = sh.getLastRow(); }
      });
    }
    return { ok: true, v: bump_() };
  } finally {
    lock.releaseLock();
  }
}
