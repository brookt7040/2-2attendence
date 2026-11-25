/* 🔒 모든 화면 공통: 💤 하나가 자는 화면 · 🔐 입장 코드 화면 · 👑 선생님 통과
 *  출석부 · 알림·종례 · 아지트 · 대화 · 안내가 모두 이 파일 하나로 같은 모습이에요.
 *  👑 선생님 통과 = 마스터 관리자 비밀번호 → 이 기기는 30일 동안 잠자는 시간을 건너뛰고 입장 코드도 자동으로 들어가요 */
(function(){
  const TK = 'nyangTeacher', GK = 'nyangGate', DAY = 86400000;
  const CSS = `
#sleepOv{position:fixed;inset:0;z-index:40000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:linear-gradient(180deg,#1E2340,#3B3466);color:#F4F0FF;text-align:center;padding:24px;font-family:inherit;}
#sleepOv.on{display:flex;}
#sleepOv .nyl-stars{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(2px 2px at 10% 20%,#fff,transparent),radial-gradient(2px 2px at 80% 30%,#fff,transparent),radial-gradient(1.5px 1.5px at 30% 70%,#fff,transparent),radial-gradient(2px 2px at 65% 82%,#fff,transparent),radial-gradient(1.5px 1.5px at 45% 12%,#fff,transparent),radial-gradient(1.5px 1.5px at 90% 65%,#fff,transparent);opacity:.7;}
#sleepOv .nyl-cat{position:relative;width:150px;height:150px;}
#sleepOv .nyl-cat img{width:150px;height:150px;image-rendering:pixelated;display:block;}
#sleepOv .nyl-z{position:absolute;right:-16px;top:-4px;font-size:28px;animation:nylZ 2.4s ease-in-out infinite;}
#sleepOv .nyl-z.b{right:-44px;top:-40px;font-size:20px;animation-delay:1.2s;}
@keyframes nylZ{0%{opacity:0;transform:translateY(10px)}40%{opacity:1}100%{opacity:0;transform:translateY(-16px)}}
#sleepOv h2{margin:6px 0 0;font-size:26px;font-weight:normal;line-height:1.35;}
#sleepOv h2 span,#sleepOv p span{display:inline-block;white-space:nowrap;}
#sleepOv p{margin:0;font-size:17px;opacity:.85;line-height:1.6;}
.nyl-gate{position:fixed;inset:0;z-index:20050;display:none;align-items:center;justify-content:center;background:linear-gradient(160deg,#FFF5D1,#FFE3EE);padding:16px;font-family:inherit;}
.nyl-gate.on{display:flex;}
.nyl-box{background:#FFFDF6;border:3px solid #5B4636;border-radius:22px;box-shadow:0 6px 0 #5B4636;padding:24px 26px 18px;text-align:center;max-width:380px;width:100%;display:flex;flex-direction:column;gap:8px;align-items:center;color:#5B4636;font-family:inherit;}
.nyl-box .nyl-ic{font-size:46px;line-height:1.1;}
.nyl-box h2{margin:2px 0;font-size:22px;font-weight:normal;}
.nyl-box .nyl-hint{font-size:15px;color:#8C7563;word-break:keep-all;}
.nyl-box .nyl-in{font-family:inherit;font-size:30px;text-align:center;letter-spacing:10px;width:220px;max-width:100%;border:3px solid #5B4636;border-radius:14px;padding:6px;background:#fff;color:#5B4636;margin:4px 0 0;}
.nyl-box .nyl-err{min-height:1.3em;color:#D94A6A;font-size:15px;}
.nyl-box .nyl-go{width:100%;font-family:inherit;font-size:19px;padding:10px;border:3px solid #5B4636;border-radius:14px;background:#FFD96A;color:#5B4636;box-shadow:0 4px 0 #5B4636;cursor:pointer;}
.nyl-box .nyl-go:active{transform:translateY(3px);box-shadow:0 1px 0 #5B4636;}
.nyl-tw{margin-top:6px;display:flex;flex-direction:column;align-items:center;gap:6px;}
.nyl-tbtn{font-family:inherit;font-size:13px;background:transparent;border:1px solid currentColor;border-radius:999px;padding:3px 12px;cursor:pointer;opacity:.55;color:inherit;}
.nyl-tbtn:hover{opacity:.9;}
#sleepOv .nyl-tw{margin-top:22px;color:#BDB4E8;}
.nyl-trow{display:none;gap:6px;align-items:center;}
.nyl-tw.open .nyl-trow{display:flex;} .nyl-tw.open .nyl-tbtn{display:none;}
.nyl-trow input{font-family:inherit;font-size:18px;width:130px;text-align:center;letter-spacing:4px;border:2px solid currentColor;border-radius:10px;padding:5px;background:#fff;color:#5B4636;-webkit-text-security:disc;}
.nyl-trow button{font-family:inherit;font-size:15px;border:2px solid currentColor;border-radius:10px;padding:5px 12px;background:#FFD96A;color:#5B4636;cursor:pointer;}
.nyl-tmsg{font-size:13px;min-height:1.2em;}
#nylReload{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:39000;display:none;align-items:center;gap:10px;max-width:calc(100vw - 20px);background:#FFF3C4;color:#5B4636;border:3px solid #5B4636;border-radius:16px;box-shadow:0 5px 0 #5B4636;padding:10px 16px;font-family:inherit;font-size:16px;line-height:1.45;text-align:left;word-break:keep-all;}
#nylReload.on{display:flex;}
#nylReload .rl-ic{font-size:28px;animation:nylSpin 2s linear infinite;}
#nylReload b.rl-left{display:inline-block;min-width:3.2em;color:#C0365C;font-size:18px;}
@keyframes nylSpin{to{transform:rotate(360deg)}}
`;
  function css(){ if (document.getElementById('nylCss')) return; const s = document.createElement('style'); s.id = 'nylCss'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
  const ls = { get(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(e){ return null; } }, set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} } };
  let lastSleep = null, rlTimer = 0;
  const LOADED = Date.now();
  function doReload(){
    try { if (window.top !== window && window.top.location.origin === location.origin){ window.top.location.reload(); return; } } catch(e){}   // 앱 안이면 앱 전체를
    location.reload();
  }

  const NyLock = {
    /* 페이지가 서버 주소를 알려 줘요 (기본: 주소의 ?api=) */
    api(){ try { return new URLSearchParams(location.search).get('api') || ''; } catch(e){ return ''; } },
    isTeacher(){ const t = ls.get(TK); return !!(t && Date.now() < t.until); },
    setTeacher(days){ ls.set(TK, { until: Date.now() + (days || 30) * DAY }); NyLock.refresh(); },
    /* 마스터 관리자 비밀번호 → 선생님 통과 (+ 입장 코드도 30일 저장) */
    async teacherPass(pin){
      const api = NyLock.api(); if (!api) return '서버 주소를 몰라요';
      try {
        const r = await fetch(api, { method:'POST', redirect:'follow', body: JSON.stringify({ action:'tpass', tpin: pin }) }), j = await r.json();
        if (!j || !j.ok) return (j && j.error === 'wrong') ? '❌ 비밀번호가 달라요' : '❌ 안 돼요 (서버 코드 업데이트가 필요할 수 있어요)';
        if (j.code) ls.set(GK, { code: j.code, until: Date.now() + 30 * DAY, ep: Number(j.epoch) || 0 });
        NyLock.setTeacher(30);
        return true;
      } catch(e){ return '연결이 안 돼요'; }
    },
    /* 👑 선생님 버튼 (누르면 비밀번호 칸이 펼쳐져요) */
    teacherUI(host, onOk){
      if (!host || host.dataset.nyl) return; host.dataset.nyl = '1'; host.classList.add('nyl-tw');
      host.innerHTML = `<button type="button" class="nyl-tbtn">👑 선생님</button><div class="nyl-trow"><input type="text" inputmode="numeric" maxlength="12" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore placeholder="관리자 비번"><button type="button">통과</button></div><div class="nyl-tmsg"></div>`;
      const inp = host.querySelector('input'), msg = host.querySelector('.nyl-tmsg');
      host.querySelector('.nyl-tbtn').onclick = () => { host.classList.add('open'); setTimeout(() => inp.focus(), 50); };
      const go = async () => { const v = inp.value.trim(); if (!v) return; msg.textContent = '확인 중…'; const r = await NyLock.teacherPass(v); inp.value = ''; if (r === true){ msg.textContent = '👑 통과! 이 기기는 30일 동안 자유롭게 들어와요'; host.classList.remove('open'); if (onOk) onOk(); } else msg.textContent = r; };
      host.querySelector('.nyl-trow button').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    },
    sleepIn(cfg, d){
      if (!cfg || !cfg.on || !cfg.start || !cfg.end) return false;
      d = d || new Date();
      const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return cfg.start < cfg.end ? (t >= cfg.start && t < cfg.end) : (t >= cfg.start || t < cfg.end);
    },
    /* 💤 잠자는 화면 (선생님 통과한 기기는 안 떠요) */
    sleep(cfg, on){
      lastSleep = { cfg, on };
      let o = document.getElementById('sleepOv');
      if (!on || NyLock.isTeacher()){ if (o) o.classList.remove('on'); return; }
      css();
      if (!o){
        o = document.createElement('div'); o.id = 'sleepOv';
        o.innerHTML = `<div class="nyl-stars"></div><div class="nyl-cat"><img src="icons/hana-sleep.png" alt=""><span class="nyl-z">Z</span><span class="nyl-z b">z</span></div><h2><span>💤 하나는 지금</span> <span>자는 중이에요</span></h2><p id="sleepMsg"></p><div class="nyl-tw-host"></div>`;
        document.body.appendChild(o);
        NyLock.teacherUI(o.querySelector('.nyl-tw-host'), () => { o.classList.remove('on'); if (gateOpen()) location.reload(); });
      }
      const c = cfg || {};
      const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
      o.querySelector('#sleepMsg').innerHTML = c.end ? `<span>${esc(c.end)}에 다시 만나요! 🌙</span> <span>(${esc(c.start)} ~ ${esc(c.end)}에는 쉬어요)</span>` : '<span>조금 뒤에 다시 만나요! 🌙</span>';
      o.classList.add('on');
    },
    refresh(){ if (lastSleep) NyLock.sleep(lastSleep.cfg, lastSleep.on); },
    /* 🔄 모든 기기 새로고침 알림: 서버가 정한 시각(1분 뒤)까지 세다가 새로고침 */
    reload(info){
      clearInterval(rlTimer); rlTimer = 0;
      const box = document.getElementById('nylReload');
      if (!info || !info.at){ if (box) box.classList.remove('on'); return; }
      const target = Date.now() + (Number(info.at) - Number(info.now || Date.now()));
      if (LOADED >= target - 2000){ if (box) box.classList.remove('on'); return; }   // 이미 새 화면이에요
      css(); let b = box;
      if (!b){ b = document.createElement('div'); b.id = 'nylReload'; b.innerHTML = '<span class="rl-ic">🔄</span><span><b>곧 화면이 새로고침돼요!</b><br>쓰고 있는 글이 있으면 복사해 두세요 · 남은 시간 <b class="rl-left"></b></span>'; document.body.appendChild(b); }
      const tick = () => {
        const left = Math.max(0, Math.round((target - Date.now()) / 1000));
        b.querySelector('.rl-left').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
        if (left <= 0){ clearInterval(rlTimer); doReload(); }
      };
      b.classList.add('on'); tick(); rlTimer = setInterval(tick, 1000);
    },
    css
  };
  window.NyLock = NyLock;
  /* 다른 탭(같은 앱 안)에서 선생님 통과하면 여기도 바로 풀려요 */
  function gateOpen(){ return [...document.querySelectorAll('.nyl-gate')].some(g => getComputedStyle(g).display !== 'none'); }
  addEventListener('storage', e => { if (e.key === TK) NyLock.refresh(); if (e.key === GK && NyLock.isTeacher() && gateOpen()) location.reload(); });
  if (document.readyState !== 'loading') css(); else document.addEventListener('DOMContentLoaded', css);
})();
