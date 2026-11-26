/* 🔊 2-2😻 앱 소리: 수업 중에는 저절로 음소거 · 위쪽 🔊 버튼으로 '지금 시간'만 바꿔요 (쉬는 시간·다음 교시가 되면 다시 자동)
 *  출석부(보기 화면)가 오늘 수업 시간을 localStorage 'nyangClass'에 적어 두고, 앱과 출석부가 함께 읽어요.
 *  ⏰ 설정해 둔 알람 소리는 음소거와 상관없이 울려요. */
(function(){
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const mins = t => { const m = String(t || '').match(/(\d+):(\d+)/); return m ? +m[1] * 60 + +m[2] : -1; };
  function read(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(e){ return null; } }
  /* 지금 구간: 수업 중이면 'c3' (몇 번째 수업), 아니면 'b' + 다음 수업 번호 */
  function seg(){
    const c = read('nyangClass'), ds = today();
    if (!c || c.ds !== ds || !Array.isArray(c.p)) return { inClass: false, key: ds + ':x' };
    const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < c.p.length; i++){
      const s = mins(c.p[i].s), e = mins(c.p[i].e);
      if (m >= s && m < e) return { inClass: true, key: ds + ':c' + i };
      if (m < s) return { inClass: false, key: ds + ':b' + i };
    }
    return { inClass: false, key: ds + ':end' };
  }
  function state(){
    const g = seg(), ov = read('nyangSndOv');
    const manual = ov && ov.key === g.key;
    return { inClass: g.inClass, muted: manual ? !!ov.muted : g.inClass, manual: manual, key: g.key };
  }
  window.NySnd = {
    state: state,
    muted: () => state().muted,
    toggle(){ const s = state(); try { localStorage.setItem('nyangSndOv', JSON.stringify({ key: s.key, muted: !s.muted })); } catch(e){} return state(); },
    setClass(ds, periods){   // 출석부가 오늘 수업 시간을 알려 줘요
      const v = JSON.stringify({ ds: ds, p: periods });
      try { if (localStorage.getItem('nyangClass') !== v) localStorage.setItem('nyangClass', v); } catch(e){}
    }
  };
})();
