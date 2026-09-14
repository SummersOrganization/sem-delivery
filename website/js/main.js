(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const EASE = 'cubic-bezier(.22,.61,.36,1)';
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const fmt = n => n.toLocaleString('en-US');

  /* ---------- background stack ---------- */

  const scenes = [...document.querySelectorAll('.scene')];
  const layers = scenes.map(s => document.querySelector(`.bg__layer[data-bg="${s.dataset.scene}"]`));
  const st = layers.map((_, i) => ({ o: i ? 0 : 1, to: i ? 0 : 1, s: 1, ts: 1, x: 0, tx: 0, y: 0, ty: 0 }));
  let bounds = [];

  const measure = () => {
    bounds = scenes.map(s => {
      const r = s.getBoundingClientRect();
      return { top: r.top + scrollY, h: r.height };
    });
  };

  const retarget = () => {
    const vh = innerHeight, cy = scrollY + vh / 2;
    scenes.forEach((_, i) => {
      const b = bounds[i], t = st[i];
      if (i > 0) {
        // Cross-fade inside the gap between the two sections' centred copy, so
        // text is never read against a half-resolved photo.
        const prev = bounds[i - 1];
        const start = b.top - prev.h * 0.28;
        const end = b.top + b.h * 0.28;
        const p = clamp((cy - start) / (end - start), 0, 1);
        t.to = p * p * (3 - 2 * p);
      }
      const p = clamp((cy - b.top) / b.h, 0, 1);
      if (layers[i].dataset.motion === 'pan') {
        t.ts = 1.05; t.tx = (0.5 - p) * 90; t.ty = (0.5 - p) * 24;
      } else {
        t.ts = 1 + 0.07 * p; t.tx = 0; t.ty = (0.5 - p) * 56;
      }
    });
  };

  const paint = (t, i) => {
    const el = layers[i];
    el.style.opacity = t.o.toFixed(3);
    el.style.visibility = t.o < 0.004 ? 'hidden' : 'visible';
    el.style.transform = `translate3d(${t.x.toFixed(2)}px,${t.y.toFixed(2)}px,0) scale(${t.s.toFixed(4)})`;
  };

  let bgRaf = 0;
  const bgTick = () => {
    let busy = false;
    st.forEach((t, i) => {
      t.o = lerp(t.o, t.to, 0.09);
      t.s = lerp(t.s, t.ts, 0.1);
      t.x = lerp(t.x, t.tx, 0.1);
      t.y = lerp(t.y, t.ty, 0.1);
      const settled =
        Math.abs(t.o - t.to) < 0.002 && Math.abs(t.s - t.ts) < 0.0004 &&
        Math.abs(t.x - t.tx) < 0.05 && Math.abs(t.y - t.ty) < 0.05;
      if (settled) { t.o = t.to; t.s = t.ts; t.x = t.tx; t.y = t.ty; } else busy = true;
      paint(t, i);
    });
    bgRaf = busy ? requestAnimationFrame(bgTick) : 0;
  };

  const onScroll = () => {
    retarget();
    if (reduced) {
      st.forEach((t, i) => { t.o = t.to; t.s = 1; t.x = 0; t.y = 0; paint(t, i); });
      return;
    }
    if (!bgRaf) bgRaf = requestAnimationFrame(bgTick);
  };
  const onResize = () => { measure(); onScroll(); };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  addEventListener('load', onResize);
  measure();
  retarget();
  st.forEach((t, i) => { t.o = t.to; t.s = t.ts; t.x = t.tx; t.y = t.ty; paint(t, i); });

  /* ---------- reveal on entry ---------- */

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));


  /* ----- Overview card: geometry and behaviour ported from the SEM app's
     owner-overview-card (dashboard-rebuild). Constants, band maths, ring
     cut-out masks, channel hit-test and tooltip placement are its own. ----- */

  const OV = {
    LEFT: 0, RIGHT: 880, BASELINE: 113, MAX_DISTANCE: 52, CENTER_GAP: 18,
    // Cut slightly wider than each ring's nominal opening: browsers snap border
    // widths to device pixels, so a thinner-than-specified border would
    // otherwise leave the series line visible inside the ring.
    LABEL_Y: 204, HIT_SLOP: 2, REST_INNER: 2.2, ACTIVE_INNER: 3.1,
    HEIGHT: 214, IN: '#50e68c', OUT: '#ff463d'
  };
  OV.IN_TOP = OV.BASELINE - OV.MAX_DISTANCE;
  OV.IN_BOTTOM = OV.BASELINE - OV.CENTER_GAP;
  OV.OUT_TOP = OV.BASELINE + OV.CENTER_GAP;
  OV.OUT_BOTTOM = OV.BASELINE + OV.MAX_DISTANCE;

  const OV_MONTHS = [
    { label: 'Jan', in: 50500, out: 12400 }, { label: 'Feb', in: 52500, out: 12000 },
    { label: 'Mar', in: 51800, out: 11700 }, { label: 'Apr', in: 54200, out: 12250 },
    { label: 'May', in: 56000, out: 12650 }, { label: 'Jun', in: 55200, out: 12200 },
    { label: 'Jul', in: 57800, out: 11800 }, { label: 'Aug', in: 59200, out: 12050 },
    { label: 'Sep', in: 58400, out: 12450 }, { label: 'Oct', in: 60800, out: 12200 },
    { label: 'Nov', in: 62200, out: 11878 }, { label: 'Dec', in: 62375, out: 12050 }
  ];

  const ovPoints = (values, top, bottom, invert) => {
    const min = Math.min(...values), max = Math.max(...values);
    const range = Math.max(1, max - min);
    const width = OV.RIGHT - OV.LEFT;
    return values.map((value, i) => {
      const ratio = (value - min) / range;
      return {
        x: OV.LEFT + (width * (i + 0.5)) / values.length,
        y: top + (bottom - top) * (invert ? ratio : 1 - ratio)
      };
    });
  };

  const ovSmooth = pts => pts.slice(1).reduce((path, point, i) => {
    const prev = pts[i];
    const before = pts[Math.max(0, i - 1)];
    const after = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = prev.x + (point.x - before.x) / 5, c1y = prev.y + (point.y - before.y) / 5;
    const c2x = point.x - (after.x - prev.x) / 5, c2y = point.y - (after.y - prev.y) / 5;
    return `${path} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${point.x} ${point.y}`;
  }, `M ${pts[0].x} ${pts[0].y}`);

  const ovTrack = pts => [
    { x: OV.LEFT, y: pts[0].y }, ...pts, { x: OV.RIGHT, y: pts[pts.length - 1].y }
  ];

  const ovArea = (pts, baseline) =>
    `${ovSmooth(pts)} L ${pts[pts.length - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`;

  const ovInterp = (pts, pos) => {
    const lo = Math.floor(pos), hi = Math.min(pts.length - 1, Math.ceil(pos));
    return pts[lo].y + (pts[hi].y - pts[lo].y) * (pos - lo);
  };

  // Shared Tactile Lift Formula, ported from the app's tactile-lift.ts: a 2px
  // rise quantised to the device-pixel grid so it lands crisp at any density.
  const quantizeTactileLift = dpr => {
    const safe = dpr > 0 ? dpr : 1;
    return -Math.round(2 * safe) / safe;
  };

  const buildOverview = frame => {
    const chart = frame.querySelector('.ov__chart');
    const tip = frame.querySelector('.ov__tip');
    const inPts = ovPoints(OV_MONTHS.map(m => m.in), OV.IN_TOP, OV.IN_BOTTOM, false);
    const outPts = ovPoints(OV_MONTHS.map(m => m.out), OV.OUT_TOP, OV.OUT_BOTTOM, true);
    const n = OV_MONTHS.length;
    let active = -1, hovering = false, size = { w: 880, h: 214 };

    const cut = pts => pts.map(p =>
      `<ellipse cx="${p.x}" cy="${p.y}" rx="${(OV.REST_INNER * 880) / size.w}" ry="${(OV.REST_INNER * 214) / size.h}" fill="#000"/>`
    ).join('');

    const glowCut = pts => pts.map(p =>
      `<ellipse cx="${p.x}" cy="${p.y}" rx="${(OV.ACTIVE_INNER * 880) / size.w}" ry="${(OV.ACTIVE_INNER * 214) / size.h}" fill="#000"/>`
    ).join('');

    chart.innerHTML = `
      <svg viewBox="0 0 880 214" preserveAspectRatio="none" role="img" aria-label="Money in and money out by month">
        <defs>
          <linearGradient id="ovInFill" x1="0" x2="0" y1="${OV.IN_TOP}" y2="${OV.BASELINE}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#92f8ba" stop-opacity="0.24"/>
            <stop offset="0.28" stop-color="#50e68c" stop-opacity="0.18"/>
            <stop offset="0.68" stop-color="#2aaf65" stop-opacity="0.08"/>
            <stop offset="1" stop-color="#173523" stop-opacity="0.01"/>
          </linearGradient>
          <linearGradient id="ovOutFill" x1="0" x2="0" y1="${OV.BASELINE}" y2="${OV.OUT_BOTTOM}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#391515" stop-opacity="0.01"/>
            <stop offset="0.36" stop-color="#c92f2f" stop-opacity="0.08"/>
            <stop offset="0.72" stop-color="#ff463d" stop-opacity="0.16"/>
            <stop offset="1" stop-color="#ff8179" stop-opacity="0.22"/>
          </linearGradient>
          <linearGradient id="ovEdgeGrad" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0" stop-color="#000"/><stop offset="0.045" stop-color="#fff"/>
            <stop offset="0.955" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
          </linearGradient>
          <filter id="ovGlowIn" x="-10%" y="-35%" width="120%" height="170%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="5.5"/></filter>
          <filter id="ovGlowOut" x="-10%" y="-35%" width="120%" height="170%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="5.5"/></filter>
          <mask id="ovEdgeFade" maskUnits="userSpaceOnUse"><rect width="880" height="214" fill="url(#ovEdgeGrad)"/></mask>
          <mask id="ovInRings" maskUnits="userSpaceOnUse"><rect width="880" height="214" fill="#fff"/>${cut(inPts)}</mask>
          <mask id="ovOutRings" maskUnits="userSpaceOnUse"><rect width="880" height="214" fill="#fff"/>${cut(outPts)}</mask>
          <mask id="ovInGlowCut" maskUnits="userSpaceOnUse"><rect width="880" height="214" fill="#fff"/>${glowCut(inPts)}</mask>
          <mask id="ovOutGlowCut" maskUnits="userSpaceOnUse"><rect width="880" height="214" fill="#fff"/>${glowCut(outPts)}</mask>
        </defs>
        <line class="ov__baseline" x1="${OV.LEFT}" x2="${OV.RIGHT}" y1="${OV.BASELINE}" y2="${OV.BASELINE}" mask="url(#ovEdgeFade)"/>
        <g mask="url(#ovEdgeFade)">
          <path class="ov__area" d="${ovArea(ovTrack(inPts), OV.BASELINE)}" fill="url(#ovInFill)" mask="url(#ovInRings)"/>
          <path class="ov__area" d="${ovArea(ovTrack(outPts), OV.BASELINE)}" fill="url(#ovOutFill)" mask="url(#ovOutRings)"/>
          <path class="ov__glow" d="${ovSmooth(ovTrack(inPts))}" stroke="${OV.IN}" filter="url(#ovGlowIn)" mask="url(#ovInGlowCut)"/>
          <path class="ov__glow" d="${ovSmooth(ovTrack(outPts))}" stroke="${OV.OUT}" filter="url(#ovGlowOut)" mask="url(#ovOutGlowCut)"/>
          <path class="ov__series ov__series--in" d="${ovSmooth(ovTrack(inPts))}" stroke="${OV.IN}" mask="url(#ovInRings)"/>
          <path class="ov__series ov__series--out" d="${ovSmooth(ovTrack(outPts))}" stroke="${OV.OUT}" mask="url(#ovOutRings)"/>
        </g>
      </svg>
      <div class="ov__months" aria-hidden="true">
        ${OV_MONTHS.map((m, i) => `<span class="ov__month" style="--mx:${(inPts[i].x / 880) * 100}%">${m.label}</span>`).join('')}
      </div>
      <div class="ov__markers" aria-hidden="true">
        ${inPts.map((p, i) => `<span class="ov__marker" data-s="in" data-i="${i}" style="--mx:${(p.x / 880) * 100}%;--my:${(p.y / 214) * 100}%"></span>`).join('')}
        ${outPts.map((p, i) => `<span class="ov__marker ov__marker--out" data-s="out" data-i="${i}" style="--mx:${(p.x / 880) * 100}%;--my:${(p.y / 214) * 100}%"></span>`).join('')}
      </div>`;

    tip.innerHTML = `<strong></strong>
      <span><i style="border-color:${OV.IN};background:${OV.IN}"></i>In <b></b></span>
      <span><i style="border-color:${OV.OUT};background:${OV.OUT}"></i>Out <b></b></span>`;
    const tipMonth = tip.querySelector('strong');
    const tipVals = [...tip.querySelectorAll('b')];
    const markers = [...chart.querySelectorAll('.ov__marker')];
    const labels = [...chart.querySelectorAll('.ov__month')];
    // The cut-outs are created once and only resized. Rebuilding the masks on
    // each month change re-evaluates them and flickers the whole masked curve.
    const cuts = [
      [...chart.querySelectorAll('#ovInRings ellipse')],
      [...chart.querySelectorAll('#ovOutRings ellipse')]
    ];
    const sizeCuts = () => cuts.forEach(set => set.forEach((el, i) => {
      const r = i === active ? OV.ACTIVE_INNER : OV.REST_INNER;
      el.setAttribute('rx', (r * 880) / size.w);
      el.setAttribute('ry', (r * 214) / size.h);
    }));

    const measure = () => {
      const r = chart.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) { size = { w: r.width, h: r.height }; sizeCuts(); }
    };
    measure();
    new ResizeObserver(measure).observe(chart);

    const syncLift = () => frame.style.setProperty('--ov-hover-lift', `${quantizeTactileLift(devicePixelRatio)}px`);
    syncLift();
    addEventListener('resize', syncLift);

    const setActive = i => {
      if (i === active) return;
      active = i;
      markers.forEach(m => m.dataset.on = String(Number(m.dataset.i) === i));
      labels.forEach((l, k) => l.classList.toggle('is-on', k === i));
      sizeCuts();
      if (i < 0) return;
      tipMonth.textContent = OV_MONTHS[i].label;
      tipVals[0].textContent = '$' + fmt(OV_MONTHS[i].in);
      tipVals[1].textContent = '$' + fmt(OV_MONTHS[i].out);
    };

    const clear = () => { hovering = false; tip.dataset.visible = 'false'; setActive(-1); };

    chart.addEventListener('pointermove', e => {
      const b = chart.getBoundingClientRect();
      if (b.width <= 0) return;
      const progress = clamp((e.clientX - b.left) / b.width, 0, 1);
      const pos = clamp(progress * n - 0.5, 0, n - 1);
      const inY = ovInterp(inPts, pos), outY = ovInterp(outPts, pos);
      const pointerY = ((e.clientY - b.top) / b.height) * OV.HEIGHT;
      if (pointerY < Math.min(inY, outY) - OV.HIT_SLOP || pointerY > Math.max(inY, outY) + OV.HIT_SLOP) {
        clear();
        return;
      }
      hovering = true;
      frame.style.setProperty('--ov-tip-x', `${progress * 100}%`);
      frame.style.setProperty('--ov-tip-y', `${(inY / OV.HEIGHT) * 100}%`);
      tip.dataset.visible = 'true';
      setActive(Math.round(pos));
    });
    chart.addEventListener('pointerleave', clear);

    return {
      reveal() {
        chart.querySelectorAll('.ov__series, .ov__glow').forEach(p => {
          const L = p.getTotalLength();
          p.style.strokeDasharray = `${L + 4} ${L + 4}`;
          p.style.strokeDashoffset = `${L + 6}`;
          if (!reduced) p.style.transition = `stroke-dashoffset 1200ms ${EASE}`;
          requestAnimationFrame(() => { p.style.strokeDashoffset = '0'; });
        });
        chart.querySelector('.ov__markers').classList.add('is-in');
        chart.querySelectorAll('.ov__area').forEach(a => a.classList.add('is-in'));
      }
    };
  };

  const overviewFrame = document.querySelector('[data-overview-chart]');
  const overview = overviewFrame ? buildOverview(overviewFrame) : null;

  /* ---------- arcs ---------- */

  document.querySelectorAll('.ring__arc').forEach(a => {
    const C = a.getTotalLength(), A = C * Number(a.dataset.arc);
    a.style.strokeDasharray = `${A} ${C + 12}`;
    a.style.strokeDashoffset = `${A + 6}`;
  });

  document.querySelectorAll('.pill__arc').forEach(a => {
    const L = a.getTotalLength(), seg = L * Number(a.dataset.seg);
    const w = Number(a.getAttribute('width')), rx = Number(a.getAttribute('rx'));
    const start = (w - 2 * rx) / 2 - seg / 2;
    a.style.strokeDasharray = `0 ${L + seg}`;
    a.style.strokeDashoffset = `${-start}`;
    a.dataset.segLen = seg;
    a.dataset.total = L;
  });

  /* ----- This week: the certified Week Wave, ported from the app's
     upcoming-card + kpi/this-week-model. L_i(q) = clamp(3 - |i - q|, 0, 3),
     H_i = 6px + 10px x L_i, T_i = 26px + 10px x L_i, and a critically damped
     spring on the continuous peak q. ----- */

  const WK_DAYS = [
    { id: 'mon', label: 'M', phase: 'past' }, { id: 'tue', label: 'T', phase: 'past' },
    { id: 'wed', label: 'W', phase: 'past' }, { id: 'thu', label: 'T', phase: 'future' },
    { id: 'fri', label: 'F', phase: 'future' }, { id: 'sat', label: 'S', phase: 'future' },
    { id: 'sun', label: 'S', phase: 'future' }
  ];
  const WK = { REST_PEAK: 3, OMEGA_ENGAGED: 18.25, OMEGA_RELEASE: 18.98, DT_MAX: 1 / 30, SETTLE_POS: 0.001, SETTLE_VEL: 0.002, HYSTERESIS: 2, SCALE: 2.4 };
  const wkLevel = (i, q) => clamp(3 - Math.abs(i - q), 0, 3);
  // T = 26px + 10px x level, scaled with the bars so the reachable band still
  // matches their height on this larger card.
  const wkTargetHeight = level => (26 + 10 * level) * WK.SCALE;

  const buildWeek = chart => {
    chart.innerHTML = WK_DAYS.map(d =>
      `<span class="wk__day" data-phase="${d.phase}" style="--lvl:0"><span class="wk__stack"><span class="wk__bar"></span></span><span class="wk__label">${d.label}</span></span>`
    ).join('');
    const cells = [...chart.querySelectorAll('.wk__day')];

    let rect = chart.getBoundingClientRect();
    let slot = rect.width / 7;
    let q = WK.REST_PEAK, v = 0, target = WK.REST_PEAK, engaged = false, frame = 0, prev = 0, live = false;

    const write = () => cells.forEach((c, i) => c.style.setProperty('--lvl', (live ? wkLevel(i, q) : 0).toFixed(4)));
    const refresh = () => { rect = chart.getBoundingClientRect(); slot = rect.width / 7; };

    const step = ts => {
      frame = 0;
      const dt = prev ? Math.min((ts - prev) / 1000, WK.DT_MAX) : 1 / 60;
      prev = ts;
      const omega = engaged ? WK.OMEGA_ENGAGED : WK.OMEGA_RELEASE;
      v += (omega * omega * (target - q) - 2 * omega * v) * dt;
      q += v * dt;
      if (Math.abs(target - q) < WK.SETTLE_POS && Math.abs(v) < WK.SETTLE_VEL) {
        q = target; v = 0; prev = 0; write(); return;
      }
      write();
      frame = requestAnimationFrame(step);
    };
    const kick = () => {
      if (reduced) { q = target; v = 0; write(); return; }
      if (!frame) frame = requestAnimationFrame(step);
    };
    const release = () => { engaged = false; target = WK.REST_PEAK; kick(); };

    const applyPoint = (x, y) => {
      if (!live || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom || !(slot > 0)) { release(); return; }
      const lane = clamp(Math.floor((x - rect.left) / slot), 0, 6);
      const peak = clamp((x - rect.left) / slot - 0.5, 0, 6);
      const fromBottom = rect.bottom - y;
      // Entry uses the lane's instantaneous target; staying engaged uses the
      // height it is rising toward plus 2px, so crossing a day cannot flicker.
      const limit = engaged
        ? wkTargetHeight(wkLevel(lane, peak)) + WK.HYSTERESIS
        : wkTargetHeight(wkLevel(lane, q));
      if (fromBottom >= 0 && fromBottom <= limit) { engaged = true; target = peak; }
      else { engaged = false; target = WK.REST_PEAK; }
      kick();
    };

    chart.addEventListener('pointerenter', e => { refresh(); applyPoint(e.clientX, e.clientY); });
    chart.addEventListener('pointermove', e => {
      const co = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      const last = co.length ? co[co.length - 1] : e;
      applyPoint(last.clientX, last.clientY);
    });
    chart.addEventListener('pointerleave', release);
    chart.addEventListener('pointercancel', release);
    new ResizeObserver(() => { refresh(); write(); }).observe(chart);
    write();

    return { reveal() { live = true; write(); } };
  };

  const weekChart = document.querySelector('[data-week-chart]');
  const week = weekChart ? buildWeek(weekChart) : null;

  /* ----- Leasing: geometry, morph and hover ported from the app's
     leasing-cycle-card. Three four-month tabs share one scale — the busiest
     month of the year — so the same count is the same height on every tab. ----- */

  const LS = { XS: [18, 67.3333, 112.6667, 162], BASELINE: 86, MAX_H: 49, PLOT_BOTTOM: 72, SLOP: 2, MORPH: 930 };
  const LS_MONTHS = [
    { label: 'Jan', count: 4, pending: 1 }, { label: 'Feb', count: 3, pending: 0 },
    { label: 'Mar', count: 2, pending: 1 }, { label: 'Apr', count: 2, pending: 0 },
    { label: 'May', count: 3, pending: 1 }, { label: 'Jun', count: 5, pending: 2 },
    { label: 'Jul', count: 4, pending: 1 }, { label: 'Aug', count: 6, pending: 2 },
    { label: 'Sep', count: 5, pending: 1 }, { label: 'Oct', count: 4, pending: 2 },
    { label: 'Nov', count: 3, pending: 1 }, { label: 'Dec', count: 2, pending: 0 }
  ];
  const LS_SECTIONS = [LS_MONTHS.slice(0, 4), LS_MONTHS.slice(4, 8), LS_MONTHS.slice(8, 12)];
  const easeInOutCubic = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

  const lsCurve = pts => pts.reduce((path, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${path} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const lsPath = ys => {
    const pts = ys.map((y, i) => ({ x: LS.XS[i], y }));
    const curved = lsCurve(pts);
    const head = `M ${pts[0].x} ${pts[0].y}`;
    return { pts, d: `M 4 ${pts[0].y} L ${pts[0].x} ${pts[0].y}${curved.slice(head.length)} L 176 ${pts[pts.length - 1].y}` };
  };

  const lsYAt = (pts, x) => {
    const first = pts[0], last = pts[pts.length - 1];
    if (x <= first.x) return first.y;
    if (x >= last.x) return last.y;
    const ui = pts.findIndex(p => p.x >= x);
    const lo = pts[Math.max(0, ui - 1)], hi = pts[ui];
    const mid = (lo.x + hi.x) / 2;
    let a = 0, b = 1;
    for (let k = 0; k < 12; k++) {
      const t = (a + b) / 2, it = 1 - t;
      const cx = it ** 3 * lo.x + 3 * it ** 2 * t * mid + 3 * it * t ** 2 * mid + t ** 3 * hi.x;
      if (cx < x) a = t; else b = t;
    }
    const t = (a + b) / 2, it = 1 - t;
    return it ** 3 * lo.y + 3 * it ** 2 * t * lo.y + 3 * it * t ** 2 * hi.y + t ** 3 * hi.y;
  };

  const buildLeasing = card => {
    const frame = card.querySelector('[data-leasing-chart]');
    const line = frame.querySelector('.ls__line');
    const svg = frame.querySelector('.ls__chart');
    const pointsWrap = frame.querySelector('.ls__points');
    const monthsWrap = frame.querySelector('.ls__months');
    const tip = frame.querySelector('.ls__tip');
    const tabs = card.querySelector('.ls__periods');
    const expiring = card.querySelector('[data-ls-expiring]');

    const yearMax = Math.max(...LS_MONTHS.map(m => m.count), 1);
    const sectionYs = LS_SECTIONS.map(months => months.map(m => LS.PLOT_BOTTOM - (m.count / yearMax) * LS.MAX_H));

    tabs.innerHTML = LS_SECTIONS.map((_, i) =>
      `<button type="button" role="tab" class="ls__period" aria-selected="${i === 0}">${i + 1}${i === 0 ? '<i class="ls__ind" aria-hidden="true"></i>' : ''}</button>`
    ).join('');
    pointsWrap.innerHTML = LS.XS.map(() => '<span class="ls__point" data-active="false"></span>').join('');
    monthsWrap.innerHTML = LS.XS.map((x, i) => `<a class="ls__month" style="--x:${(x / 180) * 100}%" data-i="${i}"></a>`).join('');
    tip.innerHTML = '<strong></strong><span><i aria-hidden="true"></i>Expiring <b></b></span><span><i aria-hidden="true"></i>Pending <b></b></span>';

    const pointEls = [...pointsWrap.children];
    const monthEls = [...monthsWrap.children];
    const tipMonth = tip.querySelector('strong');
    const tipVals = [...tip.querySelectorAll('b')];

    let active = 0, ys = sectionYs[0].slice(), hovered = -1, morph = 0, live = false;

    const draw = () => {
      const { pts, d } = lsPath(ys);
      line.setAttribute('d', d);
      pts.forEach((p, i) => {
        pointEls[i].style.setProperty('--x', `${(p.x / 180) * 100}%`);
        pointEls[i].style.setProperty('--y', `${(p.y / 96) * 100}%`);
      });
      return pts;
    };

    const label = () => {
      LS_SECTIONS[active].forEach((m, i) => { monthEls[i].textContent = m.label; });
      expiring.textContent = LS_SECTIONS[active].reduce((t, m) => t + m.count, 0);
    };

    const setHover = (i, x, y) => {
      if (i === hovered) return;
      hovered = i;
      pointEls.forEach((el, k) => { el.dataset.active = String(k === i); });
      tip.dataset.visible = i < 0 ? 'false' : 'true';
      if (i < 0) return;
      const m = LS_SECTIONS[active][i];
      tipMonth.textContent = m.label;
      tipVals[0].textContent = m.count;
      tipVals[1].textContent = m.pending;
    };
    const place = (x, y) => {
      frame.style.setProperty('--ls-tip-x', `${(x / 180) * 100}%`);
      frame.style.setProperty('--ls-tip-y', `${(y / 96) * 100}%`);
    };

    const morphTo = index => {
      const from = ys.slice(), to = sectionYs[index].slice();
      if (morph) cancelAnimationFrame(morph);
      if (reduced) { ys = to; draw(); return; }
      let t0;
      const run = now => {
        t0 ??= now;
        const p = Math.min((now - t0) / LS.MORPH, 1);
        const e = easeInOutCubic(p);
        ys = to.map((end, i) => from[i] + (end - from[i]) * e);
        draw();
        if (p < 1) morph = requestAnimationFrame(run); else morph = 0;
      };
      morph = requestAnimationFrame(run);
    };

    tabs.addEventListener('click', e => {
      const btn = e.target.closest('.ls__period');
      if (!btn) return;
      const i = [...tabs.children].indexOf(btn);
      if (i === active) return;
      active = i;
      setHover(-1);
      [...tabs.children].forEach((b, k) => {
        b.setAttribute('aria-selected', String(k === i));
        b.innerHTML = `${k + 1}${k === i ? '<i class="ls__ind" aria-hidden="true"></i>' : ''}`;
      });
      label();
      morphTo(i);
    });

    svg.addEventListener('pointermove', e => {
      if (!live) return;
      const b = svg.getBoundingClientRect();
      if (b.width <= 0 || b.height <= 0) return;
      const x = clamp(((e.clientX - b.left) / b.width) * 180, 0, 180);
      const y = ((e.clientY - b.top) / b.height) * 96;
      const pts = ys.map((yy, i) => ({ x: LS.XS[i], y: yy }));
      let near = 0;
      pts.forEach((p, i) => { if (Math.abs(p.x - x) < Math.abs(pts[near].x - x)) near = i; });
      const lineY = lsYAt(pts, x);
      const inside = y >= lineY - LS.SLOP && y <= LS.BASELINE + LS.SLOP;
      if (inside) place(x, lineY);
      setHover(inside ? near : -1);
    });
    svg.addEventListener('pointerleave', () => setHover(-1));
    monthEls.forEach((el, i) => {
      el.addEventListener('pointerenter', () => {
        if (!live) return;
        const pts = ys.map((yy, k) => ({ x: LS.XS[k], y: yy }));
        place(pts[i].x, pts[i].y);
        setHover(i);
      });
      el.addEventListener('pointerleave', () => setHover(-1));
    });

    label();
    ys = sectionYs[0].map(() => LS.BASELINE);
    draw();

    return {
      reveal() {
        live = true;
        ys = sectionYs[0].map(() => LS.BASELINE);
        morphTo(0);
      }
    };
  };

  const leasingCard = document.querySelector('.card--leasing');
  const leasing = leasingCard ? buildLeasing(leasingCard) : null;

  /* ---------- counters ---------- */

  const counters = (card, fallbackDur) => {
    card.querySelectorAll('[data-count]').forEach(el => {
      const to = Number(el.dataset.count);
      const dur = Number(el.dataset.dur || fallbackDur);
      const pre = el.dataset.prefix || '';
      if (reduced) { el.textContent = pre + fmt(to); return; }
      const t0 = performance.now();
      const step = now => {
        const t = clamp((now - t0) / dur, 0, 1);
        el.textContent = pre + fmt(Math.round(to * easeOutCubic(t)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };

  /* ---------- per-card animations ---------- */

  const after = (ms, fn) => reduced ? fn() : setTimeout(fn, ms);

  const run = {
    overview(card) {
      counters(card, 1200);
      if (overview) overview.reveal();
    },
    portfolio(card) {
      const arc = card.querySelector('.ring__arc');
      if (!reduced) arc.style.transition = `stroke-dashoffset 1300ms ${EASE}`;
      requestAnimationFrame(() => { arc.style.strokeDashoffset = '0'; });
      counters(card, 1300);
      card.classList.add('is-live');
    },
    attention(card) {
      counters(card, 900);
      after(500, () => {
        card.classList.add('is-live');
        const arc = card.querySelector('.pill__arc');
        after(350, () => {
          if (!reduced) arc.style.transition = `stroke-dasharray 900ms ${EASE}, opacity 300ms ${EASE}`;
          arc.style.strokeDasharray = `${arc.dataset.segLen} ${arc.dataset.total}`;
          arc.style.opacity = '1';
        });
      });
    },
    leasing(card) {
      counters(card, 800);
      if (leasing) leasing.reveal();
    },
    week(card) {
      counters(card, 700);
      if (week) week.reveal();
    }
  };

  const cardIo = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      cardIo.unobserve(e.target);
      const fn = run[e.target.dataset.card];
      if (fn) fn(e.target);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-card]').forEach(c => cardIo.observe(c));

  /* ---------- hover: liquid glass ---------- */

  if (finePointer && !reduced) {
    document.querySelectorAll('.card, .chip, .btn--lg').forEach(card => {
      // Chips tilt a touch more; only cards carry the rim highlight. The wide
      // Overview card tilts less — the same angle throws its corners much
      // further than it does on a small card.
      const chip = card.classList.contains('chip');
      const soft = card.classList.contains('card--overview');
      const TILT = chip ? 16 : soft ? 6 : 10;
      const LIFT = chip ? 1.05 : soft ? 1.012 : 1.02;
      if (card.classList.contains('card')) {
        const edge = document.createElement('i');
        edge.className = 'card__edge';
        card.appendChild(edge);
      }

      let tx = 0, ty = 0, ts = 1, x = 0, y = 0, s = 1, raf = 0, on = false;

      const loop = () => {
        const k = on ? 0.2 : 0.1;
        x = lerp(x, tx, k); y = lerp(y, ty, k); s = lerp(s, ts, k);
        card.style.setProperty('--ry', `${x.toFixed(2)}deg`);
        card.style.setProperty('--rx', `${y.toFixed(2)}deg`);
        card.style.setProperty('--s', s.toFixed(4));
        const done = !on && Math.abs(x - tx) < 0.02 && Math.abs(y - ty) < 0.02 && Math.abs(s - ts) < 0.001;
        if (done) {
          card.style.setProperty('--rx', '0deg');
          card.style.setProperty('--ry', '0deg');
          card.style.setProperty('--s', '1');
          raf = 0;
        } else {
          raf = requestAnimationFrame(loop);
        }
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

      card.addEventListener('pointerenter', () => {
        on = true; ts = LIFT;
        card.classList.add('is-hover');
        kick();
      });
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
        tx = (px - 0.5) * TILT;
        ty = (0.5 - py) * TILT;
        kick();
      });
      card.addEventListener('pointerleave', () => {
        on = false; tx = 0; ty = 0; ts = 1;
        card.classList.remove('is-hover');
        kick();
      });
    });
  }
})();
