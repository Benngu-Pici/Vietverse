/* VIETVERSE — vv-learn.js
 * 1) VV: helper dùng chung (chuẩn hoá tag, level/EXP, gợi ý nội dung liên quan)
 * 2) NpcQuiz: popup hỏi đáp A/B/C/D khi nói chuyện với NPC (dùng trong play.html)
 * Đặt cùng thư mục với create.html / minigame.html / play.html / library.html / explore.html
 */
(function (global) {
  'use strict';

  // ───────────── VV: helper dùng chung ─────────────
  const VV = {};

  // "Hà Nội" -> "ha noi" (so khớp tag không phân biệt dấu/hoa thường)
  VV.norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();

  // Khóa so khớp tỉnh: bỏ dấu + bỏ khoảng trắng ('Hải Phòng' = 'HaiPhong' = 'hai phong')
  VV.key = s => VV.norm(s).replace(/ /g, '');

  // chấp nhận array | "a, b" | object của Firebase
  VV.toArr = v => {
    if (!v) return [];
    if (typeof v === 'string') return v.split(',').map(x => x.trim()).filter(Boolean);
    return Object.values(v).map(String).filter(Boolean);
  };

  // Level: lên level L→L+1 cần 100 + 50*(L-1) EXP  (100, 150, 200, ...)
  VV.levelInfo = function (exp) {
    let e = Math.max(0, Math.floor(exp || 0)), lv = 1, need = 100;
    while (e >= need) { e -= need; lv++; need = 100 + 50 * (lv - 1); }
    return { level: lv, cur: e, need, pct: Math.round((e / need) * 100) };
  };

  // Điểm liên quan giữa 2 đối tượng có {tags, provinces}: trùng tỉnh ×3, trùng tag ×2
  VV.relatedScore = function (a, b) {
    const set = arr => new Set(VV.toArr(arr).map(VV.norm));
    const ta = set(a.tags), tb = set(b.tags);
    const setP = arr => new Set(VV.toArr(arr).map(VV.key)), pa = setP(a.provinces), pb = setP(b.provinces);
    let s = 0;
    ta.forEach(t => { if (tb.has(t)) s += 2; });
    pa.forEach(p => { if (pb.has(p)) s += 3; });
    return s;
  };

  // Chấm điểm 1 mục (sách/địa danh/map) theo truy vấn {tags, provinces}.
  // target: {tags, provinces, text}. Trùng tỉnh +3, trùng tag +2, chỉ xuất hiện trong text +1
  VV.matchScore = function (target, q) {
    const tt = new Set(VV.toArr(target.tags).map(VV.norm));
    const tp = new Set(VV.toArr(target.provinces).map(VV.key));
    const text = ' ' + VV.norm(target.text || '') + ' ';
    let s = 0;
    VV.toArr(q.provinces).forEach(p => { const k = VV.key(p); if (!k) return; if (tp.has(k)) s += 3; else if (text.includes(' ' + VV.norm(p) + ' ')) s += 1; });
    VV.toArr(q.tags).forEach(t => { const k = VV.norm(t); if (!k) return; if (tt.has(k)) s += 2; else if (text.includes(' ' + k + ' ')) s += 1; });
    return s;
  };

  // items: mảng {tags, provinces, ...}. Trả về các mục liên quan nhất (điểm > 0)
  VV.findRelated = function (target, items, limit) {
    return items
      .map(it => ({ item: it, score: VV.relatedScore(target, it) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit || 6)
      .map(x => x.item);
  };

  // Link sang library/explore: library.html?tags=a,b&province=x,y
  VV.learnUrl = function (page, meta) {
    const q = [];
    const tags = VV.toArr(meta && meta.tags), prov = VV.toArr(meta && meta.provinces);
    if (tags.length) q.push('tags=' + encodeURIComponent(tags.join(',')));
    if (prov.length) q.push('province=' + encodeURIComponent(prov.join(',')));
    return page + (q.length ? '?' + q.join('&') : '');
  };

  // Đọc query ở library/explore: {tags:[], provinces:[]}
  VV.readQuery = function () {
    const p = new URLSearchParams(location.search);
    return { tags: VV.toArr(p.get('tags')), provinces: VV.toArr(p.get('province')) };
  };

  global.VV = VV;

  // ───────────── NpcQuiz ─────────────
  const REWARD = { coins: 10, exp: 20 };   // mỗi câu đúng LẦN ĐẦU
  let active = false, root = null, keyHandler = null;

  function injectCss() {
    if (document.getElementById('vv-quiz-css')) return;
    const st = document.createElement('style');
    st.id = 'vv-quiz-css';
    st.textContent = `
#vvq{position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:'Be Vietnam Pro',sans-serif}
#vvq .card{width:520px;max-width:94vw;max-height:92vh;overflow:auto;background:#fff;border-radius:20px;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.35);color:#2b1212}
#vvq .top{display:flex;align-items:center;gap:10px;margin-bottom:10px}
#vvq .npc{font-weight:900;color:#d32f2f;font-size:15px;flex:1}
#vvq .lv{font-size:12px;font-weight:800;background:#fff0ef;color:#d32f2f;border-radius:999px;padding:3px 10px}
#vvq .bar{height:8px;background:#ffe2e2;border-radius:99px;overflow:hidden;margin-bottom:14px}
#vvq .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#FFB300,#d32f2f);transition:width .5s}
#vvq .prog{font-size:12px;color:#8a6a6a;font-weight:700;margin-bottom:6px}
#vvq .q{font-size:17px;font-weight:800;line-height:1.4;margin-bottom:14px}
#vvq .opt{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:11px 14px;margin-bottom:8px;border-radius:12px;border:2px solid rgba(211,47,47,.18);background:#fff;font:600 14px 'Be Vietnam Pro',sans-serif;color:#2b1212;cursor:pointer;transition:.15s}
#vvq .opt:hover:not(:disabled){border-color:#d32f2f;background:#fff5f5}
#vvq .opt b{width:26px;height:26px;border-radius:8px;background:#fff0ef;color:#d32f2f;display:flex;align-items:center;justify-content:center;flex-shrink:0}
#vvq .opt.ok{background:#e8f5e9;border-color:#2e7d32}
#vvq .opt.ok b{background:#2e7d32;color:#fff}
#vvq .opt.bad{background:#ffebee;border-color:#e24b4a}
#vvq .opt.bad b{background:#e24b4a;color:#fff}
#vvq .opt:disabled{cursor:default}
#vvq .fb{margin:6px 0 12px;padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.5;background:#fffbe6;border:1px solid #ffe08a}
#vvq .gain{font-weight:900;color:#2e7d32}
#vvq .row{display:flex;gap:10px;margin-top:8px}
#vvq .btn{flex:1;padding:11px;border:none;border-radius:10px;font:800 14px 'Be Vietnam Pro',sans-serif;cursor:pointer;text-align:center;text-decoration:none}
#vvq .btn.pri{background:linear-gradient(135deg,#FFB300,#c98a00);color:#1a1200}
#vvq .btn.sec{background:#fff0ef;color:#d32f2f}
#vvq .sum{text-align:center}
#vvq .sum h2{font-family:'Baloo 2',cursive;color:#d32f2f;font-size:24px;margin-bottom:4px}
#vvq .lvup{margin:10px 0;padding:10px;border-radius:12px;background:linear-gradient(135deg,#fff3c4,#ffd9d9);font-weight:900;color:#c2410c}`;
    document.head.appendChild(st);
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;   // textContent → chống chèn HTML
    return e;
  }

  const NpcQuiz = {
    REWARD,
    isOpen: () => active,

    /* opts: { db, user, mapId, npc, map }
     *  db   = firebase.database()        user = firebase.auth().currentUser
     *  grantCoins(n) = (tùy chọn) hàm cộng điểm riêng; mặc định cộng vào players/{uid}/coins
     *  npc  = phần tử trong map.npcs (có npc.quiz)
     *  map  = dữ liệu map (dùng map.tags / map.provinces để hiện nút "Học thêm")  */
    async open(opts) {
      const { db, user, mapId, npc, map, grantCoins } = opts || {};
      const quiz = ((npc && npc.quiz) || []).filter(q => q && q.q && Array.isArray(q.options) && q.options.length === 4);
      if (!quiz.length || active) return;
      active = true; injectCss();

      let done = {}, exp = 0;
      try {
        if (db && user) {
          done = (await db.ref(`quizProgress/${user.uid}/${mapId}`).once('value')).val() || {};
          exp = (await db.ref(`players/${user.uid}/exp`).once('value')).val() || 0;
        }
      } catch (e) { console.warn('quiz load', e); }

      const startLevel = VV.levelInfo(exp).level;
      const st = { i: 0, right: 0, coins: 0, exp: 0 };
      root = el('div'); root.id = 'vvq';
      document.body.appendChild(root);

      keyHandler = e => {                       // chặn phím di chuyển khi đang hỏi đáp
        e.stopPropagation();
        if (/^[1-4]$/.test(e.key)) { const b = root.querySelectorAll('.opt')[+e.key - 1]; if (b && !b.disabled) b.click(); }
        else if (e.key === 'Enter') { const n = root.querySelector('[data-next]'); if (n) n.click(); }
        else if (e.key === 'Escape') NpcQuiz.close();
      };
      window.addEventListener('keydown', keyHandler, true);

      const header = card => {
        const li = VV.levelInfo(exp);
        const top = el('div', 'top');
        top.append(el('div', 'npc', '🎓 ' + (npc.name || 'NPC')), el('div', 'lv', `Lv ${li.level} · ${li.cur}/${li.need} EXP`));
        const bar = el('div', 'bar'), fill = el('i');
        bar.appendChild(fill); card.append(top, bar);
        requestAnimationFrame(() => { fill.style.width = li.pct + '%'; });
      };

      const grant = async (coins, gain) => {
        if (!db || !user) return;
        try {
          const pr = db.ref('players/' + user.uid);
          if (typeof grantCoins === 'function') await grantCoins(coins);
          else await pr.child('coins').transaction(v => (v || 0) + coins);
          const res = await pr.child('exp').transaction(v => (v || 0) + gain);
          exp = res.snapshot.val() || exp + gain;
          await pr.child('level').set(VV.levelInfo(exp).level);
        } catch (e) { console.warn('quiz grant', e); exp += gain; }
      };

      const renderQ = () => {
        const q = quiz[st.i];
        root.innerHTML = '';
        const card = el('div', 'card'); root.appendChild(card);
        header(card);
        card.append(el('div', 'prog', `Câu ${st.i + 1}/${quiz.length}`), el('div', 'q', q.q));
        const btns = q.options.map((t, k) => {
          const b = el('button', 'opt'); b.type = 'button';
          b.append(el('b', null, 'ABCD'[k]), el('span', null, t));
          card.appendChild(b); return b;
        });
        btns.forEach((b, k) => b.addEventListener('click', async () => {
          btns.forEach(x => x.disabled = true);
          const ok = k === q.correct;
          btns[q.correct].classList.add('ok');
          if (!ok) b.classList.add('bad');
          const fb = el('div', 'fb');
          if (ok) {
            st.right++;
            if (!done[q.id]) {
              done[q.id] = true; st.coins += REWARD.coins; st.exp += REWARD.exp;
              const g = el('span', 'gain', `✅ Chính xác! +${REWARD.coins} điểm · +${REWARD.exp} EXP`);
              fb.appendChild(g);
              try { if (db && user) await db.ref(`quizProgress/${user.uid}/${mapId}/${q.id}`).set(true); } catch (e) {}
              await grant(REWARD.coins, REWARD.exp);
            } else fb.appendChild(el('span', 'gain', '✅ Chính xác! (câu này bạn đã nhận thưởng rồi)'));
          } else fb.appendChild(el('b', null, `❌ Chưa đúng — đáp án đúng: ${'ABCD'[q.correct]}. ${q.options[q.correct]}`));
          if (q.explain) fb.appendChild(el('div', null, '💡 ' + q.explain));
          card.appendChild(fb);
          const nx = el('button', 'btn pri', st.i + 1 < quiz.length ? 'Câu tiếp ➜' : 'Xem kết quả 🏁');
          nx.type = 'button'; nx.dataset.next = '1';
          nx.addEventListener('click', () => { st.i++; st.i < quiz.length ? renderQ() : renderSum(); });
          card.appendChild(nx);
        }));
      };

      const renderSum = () => {
        root.innerHTML = '';
        const card = el('div', 'card'); root.appendChild(card);
        header(card);
        const s = el('div', 'sum');
        s.append(el('h2', null, 'Hoàn thành! 🎉'), el('div', null, `Đúng ${st.right}/${quiz.length} câu`),
          el('div', 'gain', `+${st.coins} điểm · +${st.exp} EXP`));
        const nowLv = VV.levelInfo(exp).level;
        if (nowLv > startLevel) s.appendChild(el('div', 'lvup', `⬆️ LÊN LEVEL ${nowLv}!`));
        card.appendChild(s);
        const row = el('div', 'row');
        const meta = map || {};
        if (VV.toArr(meta.tags).length || VV.toArr(meta.provinces).length) {
          const a = el('a', 'btn sec', '📚 Học thêm'); a.href = VV.learnUrl('library.html', meta); a.target = '_blank'; a.rel = 'noopener';
          row.appendChild(a);
        }
        const c = el('button', 'btn pri', 'Đóng'); c.type = 'button'; c.addEventListener('click', () => NpcQuiz.close());
        row.appendChild(c); card.appendChild(row);
      };

      renderQ();
    },

    close() {
      if (keyHandler) window.removeEventListener('keydown', keyHandler, true);
      if (root) root.remove();
      root = null; keyHandler = null; active = false;
    }
  };

  global.NpcQuiz = NpcQuiz;
})(window);