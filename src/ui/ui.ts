import type { App } from '../main';
import { MODES, type Mode } from '../modes';
import { ASSEMBLY, ENERGY_PATH, INFO, STATUS_HINT, STATUS_LABEL, type Stage } from '../data/components';
import { BALANCE_HZ, BEATS_PER_SEC, RESERVE_HOURS, VPH } from '../sim/simulation';
import collageUrl from '../../references/personal-watch-reference-collage.png';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Missing ${sel}`);
  return el;
};

const MODE_LABEL: Record<Mode, string> = {
  WATCH: 'Watch', CASE: 'Case', MOVEMENT: 'Movement', EXPLODED: 'Exploded', ASSEMBLY: 'Assembly', SIMULATION: 'Simulation',
};

const MODE_INTRO: Record<Mode, string> = {
  WATCH: 'The complete Seiko 6309-8060. Drag to orbit, scroll to zoom, click any part to inspect it.',
  CASE: 'Exterior components. Open the caseback to reveal the automatic movement inside.',
  MOVEMENT: 'Calibre 6309, seen from the caseback side. Hide bridges or the rotor to see the train. Drag the rotor to wind.',
  EXPLODED: 'Components separated along the axis of the watch, in their real stacking order.',
  ASSEMBLY: 'Rebuild the watch step by step. Each part flies back to its place.',
  SIMULATION: 'Energy path in motion: rotor → magic lever → mainspring → train → escapement → balance.',
};

const EXTERIOR_LIST = ['case', 'bezel', 'crystal', 'dial', 'markers', 'dayDateWindow', 'hourHand', 'minuteHand', 'secondHand', 'crown', 'caseback', 'bracelet'];
const MOVEMENT_GROUPS: [string, string[]][] = [
  ['Winding', ['rotor', 'firstReduction', 'magicLever', 'secondReduction', 'ratchetWheel']],
  ['Power', ['mainspring', 'barrel']],
  ['Going train', ['centerWheel', 'thirdWheel', 'fourthWheel']],
  ['Escapement', ['escapeWheel', 'palletFork', 'balance', 'hairspring']],
  ['Structure', ['mainPlate', 'trainBridge', 'barrelBridge', 'palletBridge', 'balanceBridge', 'autoBridge', 'jewels', 'screws', 'stem']],
  ['Dial side', ['cannonPinion', 'minuteWheel', 'hourWheel', 'dateDriver', 'dateDial', 'dayDisc']],
];

const SPEEDS = [0.05, 0.25, 1, 60, 600];

/** Slider 0..100 ↔ speed 0.02×..600× (logarithmic). */
const sliderToSpeed = (v: number) => 0.02 * Math.pow(30000, v / 100);
const speedToSlider = (s: number) => (Math.log(s / 0.02) / Math.log(30000)) * 100;
const fmtSpeed = (s: number) => (s >= 10 ? `${Math.round(s)}×` : s >= 1 ? `${s.toFixed(1)}×` : `${s.toFixed(2)}×`);

function fmtClock(sec: number): string {
  const t = ((sec % 86400) + 86400) % 86400;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function fmtHours(h: number): string {
  const total = Math.max(0, Math.floor(h * 3600));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${hh} h ${String(mm).padStart(2, '0')} m ${String(ss).padStart(2, '0')} s`;
}

const btn = (label: string, act: string, arg = '', cls = '') =>
  `<button class="btn ${cls}" data-act="${act}" data-arg="${arg}">${label}</button>`;
const tgl = (label: string, key: string, on: boolean) =>
  `<button class="btn toggle ${on ? 'on' : ''}" data-act="toggle" data-arg="${key}" aria-pressed="${on}"><span class="dot"></span>${label}</button>`;
const chip = (id: string, sel: string | null) =>
  `<button class="chip ${sel === id ? 'sel' : ''}" data-select="${id}">${INFO[id]?.name ?? id}</button>`;

export class UI {
  private readonly left = $('#panel-left');
  private readonly info = $('#panel-info');
  private readonly energy = $('#energy');
  private readonly refs = $('#refs');
  private lastTick = 0;

  constructor(private readonly app: App) {
    $('#tabs').innerHTML = MODES.map(
      (m, i) => `<button class="tab" data-mode="${m}" title="Shortcut ${i + 1}">${MODE_LABEL[m]}</button>`,
    ).join('');
    this.energy.innerHTML = ENERGY_PATH.map(
      (s, i) => `${i ? '<span class="arrow">→</span>' : ''}<div class="stage" data-stage="${s}"><i></i>${s}</div>`,
    ).join('');
    this.renderRefs();

    document.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-mode],[data-select],[data-refs]');
      if (!t) return;
      if (t.dataset.mode) app.setMode(t.dataset.mode as Mode);
      else if (t.dataset.select) app.select(t.dataset.select);
      else if (t.dataset.refs !== undefined) this.refs.classList.toggle('open', t.dataset.refs === 'open');
      else if (t.dataset.act) app.action(t.dataset.act, t.dataset.arg);
    });
    document.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      const v = Number(t.value);
      if (t.dataset.input === 'explode') {
        app.st.explode = v / 100;
        this.setText('explodeVal', `${Math.round(v)}%`);
      } else if (t.dataset.input === 'speed') {
        app.sim.speed = sliderToSpeed(v);
        this.setText('speedVal', fmtSpeed(app.sim.speed));
      }
    });
    const hold = (on: boolean) => (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-hold]');
      if (on && t) {
        app.sim.swing = true;
        t.classList.add('on');
      } else if (!on) {
        app.sim.swing = false;
        document.querySelectorAll('[data-hold]').forEach((el) => el.classList.remove('on'));
      }
    };
    document.addEventListener('pointerdown', hold(true));
    document.addEventListener('pointerup', hold(false));
    document.addEventListener('pointercancel', hold(false));

    document.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const n = Number(e.key);
      if (n >= 1 && n <= MODES.length) app.setMode(MODES[n - 1]);
      else if (e.key === 'Escape') {
        if (this.refs.classList.contains('open')) this.refs.classList.remove('open');
        else app.select(null);
      } else if (e.key === ' ' && app.mode === 'SIMULATION') {
        e.preventDefault();
        app.action('run');
      } else if (e.key.toLowerCase() === 'r') app.preset('reset');
      else if (e.key.toLowerCase() === 'f') app.focusSelected();
    });
  }

  private setText(live: string, text: string): void {
    document.querySelectorAll<HTMLElement>(`[data-live="${live}"]`).forEach((el) => (el.textContent = text));
  }

  private calendarBlock(): string {
    return `<section><h3>Day / date</h3>
      <div class="readout big"><span data-live="day"></span> <span data-live="date"></span></div>
      <div class="row">${btn('Advance date', 'advanceDate')}${btn('Advance day', 'advanceDay')}${btn('Set to now', 'setNow')}</div>
      <p class="fine">The 6309 has no quick-set; owners advance the calendar by turning the hands through midnight. These buttons are a simplified shortcut.</p></section>`;
  }

  renderMode(): void {
    const a = this.app;
    const st = a.st;
    const sim = a.sim;
    document.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === a.mode));
    document.body.dataset.mode = a.mode;
    let h = `<h2>${MODE_LABEL[a.mode]}</h2><p class="intro">${MODE_INTRO[a.mode]}</p>`;

    switch (a.mode) {
      case 'WATCH':
        h += `<section><h3>Display</h3><div class="row">${tgl('Bracelet', 'bracelet', st.bracelet)}${tgl('Crystal', 'crystal', st.crystal)}${tgl('Turntable', 'autoRotate', st.autoRotate)}</div></section>`;
        h += this.calendarBlock();
        break;
      case 'CASE':
        h += `<section><h3>Caseback</h3><div class="row">${tgl(st.casebackOpen ? 'Caseback open' : 'Open caseback', 'casebackOpen', st.casebackOpen)}${tgl('Crystal', 'crystal', st.crystal)}${tgl('Bracelet', 'bracelet', st.bracelet)}</div>${st.casebackOpen ? '<p class="fine">Bracelet is hidden while the back is open, so the movement is visible.</p>' : ''}</section>`;
        h += `<section><h3>Components</h3><div class="chips">${EXTERIOR_LIST.map((id) => chip(id, a.selected)).join('')}</div></section>`;
        h += this.calendarBlock();
        break;
      case 'MOVEMENT':
        h += `<section><h3>Layers</h3><div class="row">${tgl('Bridges & auto works', 'bridges', st.bridges)}${tgl('Rotor', 'rotor', st.rotor)}</div></section>`;
        h += MOVEMENT_GROUPS.map(([title, ids]) => `<section><h3>${title}</h3><div class="chips">${ids.map((id) => chip(id, a.selected)).join('')}</div></section>`).join('');
        break;
      case 'EXPLODED':
        h += `<section><h3>Separation <span class="val" data-live="explodeVal">${Math.round(st.explode * 100)}%</span></h3>
          <input type="range" min="0" max="100" step="1" value="${Math.round(st.explode * 100)}" data-input="explode" aria-label="Exploded view amount">
          <div class="row">${btn('0%', 'explodeTo', '0')}${btn('50%', 'explodeTo', '0.5')}${btn('100%', 'explodeTo', '1')}</div></section>
          <section><h3>Stacking order</h3><p class="fine">Front → back: crystal, bezel, hands, dial, day disc, date dial, calendar & motion works, main plate, going train, escapement, balance, bridges, automatic train, magic lever, rotor, caseback.</p></section>`;
        break;
      case 'ASSEMBLY': {
        const s = ASSEMBLY[a.assemblyStep];
        h += `<section class="step-card"><div class="step-n">Step ${a.assemblyStep + 1} / ${ASSEMBLY.length}</div>
          <h3 class="step-title">${s.title}</h3><p>${s.text}</p>
          <div class="chips">${s.parts.map((id) => chip(id, a.selected)).join('')}</div>
          <div class="row">${btn('◀ Prev', 'stepPrev')}${btn(a.assemblyPlaying ? 'Pause' : 'Play', 'stepPlay', '', 'primary')}${btn('Next ▶', 'stepNext')}</div></section>
          <section><h3>All steps</h3><ol class="steps">${ASSEMBLY.map((x, i) => `<li class="${i === a.assemblyStep ? 'cur' : i < a.assemblyStep ? 'done' : ''}" data-act="stepGo" data-arg="${i}">${x.title}</li>`).join('')}</ol></section>`;
        break;
      }
      case 'SIMULATION':
        h += `<section><h3>Run</h3><div class="row">${btn(sim.running ? 'Pause' : 'Start', 'run', '', 'primary')}${btn('Reset', 'simReset')}</div></section>
          <section><h3>Speed <span class="val" data-live="speedVal">${fmtSpeed(sim.speed)}</span></h3>
          <input type="range" min="0" max="100" step="0.5" value="${speedToSlider(sim.speed).toFixed(1)}" data-input="speed" aria-label="Simulation speed">
          <div class="row">${SPEEDS.map((v) => btn(v === 0.05 ? 'Slow-mo' : fmtSpeed(v), 'speed', String(v))).join('')}</div>
          <p class="fine">Below 1× you can follow each escape-wheel step. Above 1× is a time-lapse: hands and reserve are exact, the balance is aliased.</p></section>
          <section><h3>Power reserve</h3>
          <div class="meter"><div class="fill" data-live-fill="reserve"></div></div>
          <div class="readout"><span data-live="reserve"></span> <span class="muted">of ~${RESERVE_HOURS} h</span></div>
          <div class="row"><button class="btn primary" data-hold="1">Hold: swing wrist</button>${tgl('Auto wrist motion', 'autoWristT', sim.autoWrist).replace('data-act="toggle" data-arg="autoWristT"', 'data-act="autoWrist"')}</div>
          <p class="fine">Or drag the rotor in the 3D view. Both rotor directions wind (magic lever). Winding rate and reserve curve are simplified.</p></section>
          <section><h3>Movement</h3><div class="row">${tgl('Bridges & auto works', 'bridges', st.bridges)}${tgl('Rotor', 'rotor', st.rotor)}${btn('Dial side', 'preset', 'front')}${btn('Movement side', 'preset', 'rear')}</div>
          <dl class="stats">
            <dt>Beat rate</dt><dd>${VPH.toLocaleString('en')} vph · ${BEATS_PER_SEC}/s · ${BALANCE_HZ} Hz</dd>
            <dt>Balance amplitude</dt><dd data-live="amp"></dd>
            <dt>Vibrations</dt><dd data-live="beats"></dd>
            <dt>Escape wheel</dt><dd>12° per vibration · 1 turn / 5 s</dd>
            <dt>State</dt><dd data-live="state"></dd>
          </dl></section>`;
        h += this.calendarBlock();
        break;
    }
    this.left.innerHTML = h;
    this.renderInfo();
    this.lastTick = 0;
    this.tick();
  }

  renderInfo(): void {
    const id = this.app.selected;
    const inf = id ? INFO[id] : null;
    document.querySelectorAll<HTMLElement>('[data-select]').forEach((b) => b.classList.toggle('sel', b.dataset.select === id));
    if (!inf || !id) {
      this.info.innerHTML = `<h2>Inspect</h2><p class="intro">Click a component in the 3D view, or pick one from the list.</p>
        <dl class="stats">
          <dt>Model</dt><dd>Seiko 5 Automatic 6309-8060</dd>
          <dt>Calibre</dt><dd>6309 / 6309A, automatic</dd>
          <dt>Frequency</dt><dd>21,600 vph (6 beats/s)</dd>
          <dt>Jewels</dt><dd>17 (6309A)</dd>
          <dt>Winding</dt><dd>Bidirectional, magic lever. No hand-winding, no hacking.</dd>
          <dt>Complications</dt><dd>Day-date at 3 o'clock</dd>
        </dl>
        <p class="fine">Calibre figures are widely documented for the 6309, but they were not checked against a Seiko service manual: none was included in the reference pack. See <button class="link" data-refs="open">References</button>.</p>`;
      this.markStage(null);
      return;
    }
    const onPath = ENERGY_PATH.includes(inf.stage);
    this.info.innerHTML = `<div class="stage-tag">${inf.stage}</div><h2>${inf.name}</h2>
      <div class="badges">${inf.status.map((s) => `<span class="badge ${s}" title="${STATUS_HINT[s]}">${STATUS_LABEL[s]}</span>`).join('')}</div>
      <p>${inf.role}</p>
      ${inf.note ? `<p class="note">${inf.note}</p>` : ''}
      <h3>Interacts with</h3><div class="chips">${inf.interacts.map((x) => chip(x, null)).join('')}</div>
      <h3>Energy path</h3>
      ${onPath
        ? `<div class="mini-path">${ENERGY_PATH.map((s) => `<span class="${s === inf.stage ? 'cur' : ''}">${s}</span>`).join('<i>›</i>')}</div>`
        : `<p class="fine">Not on the power path. Belongs to <b>${inf.stage.toLowerCase()}</b>.</p>`}
      <div class="row">${btn('Close-up', 'focus', '', 'primary')}${btn('Clear', 'deselect')}</div>`;
    this.markStage(inf.stage);
  }

  private markStage(stage: Stage | null): void {
    this.energy.querySelectorAll<HTMLElement>('.stage').forEach((el) => el.classList.toggle('sel', el.dataset.stage === stage));
  }

  tick(): void {
    const now = performance.now();
    if (now - this.lastTick < 100) return;
    this.lastTick = now;
    const sim = this.app.sim;
    this.setText('time', fmtClock(sim.displaySeconds));
    this.setText('day', sim.dayLabel);
    this.setText('date', String(sim.dateLabel));
    this.setText('reserve', fmtHours(sim.reserveHours));
    this.setText('amp', sim.ticking ? `${Math.round(sim.amplitude)}° (simplified)` : `${Math.round(sim.amplitude)}°, stopped`);
    this.setText('beats', Math.floor(sim.beat).toLocaleString('en'));
    this.setText('state', !sim.running ? 'Paused' : sim.ticking ? `Running at ${fmtSpeed(sim.speed)}` : 'Stopped: mainspring let down. Wind it!');
    document.querySelectorAll<HTMLElement>('[data-live-fill="reserve"]').forEach((el) => (el.style.width = `${(sim.reserve * 100).toFixed(2)}%`));

    const winding = sim.windActivity > 0.04;
    const flowing = sim.ticking;
    const active: Record<string, boolean> = {
      ROTOR: winding, WINDING: winding, MAINSPRING: winding || flowing, 'GEAR TRAIN': flowing, ESCAPEMENT: flowing, BALANCE: flowing,
    };
    this.energy.querySelectorAll<HTMLElement>('.stage').forEach((el) => {
      el.classList.toggle('on', !!active[el.dataset.stage ?? '']);
      if (el.dataset.stage === 'MAINSPRING') el.style.setProperty('--fill', `${(sim.reserve * 100).toFixed(1)}%`);
    });
    const runBtn = this.left.querySelector<HTMLElement>('[data-act="run"]');
    if (runBtn) runBtn.textContent = sim.running ? 'Pause' : 'Start';
  }

  private renderRefs(): void {
    this.refs.innerHTML = `<div class="refs-card" role="dialog" aria-label="Reference analysis">
      <button class="close" data-refs="close" aria-label="Close">×</button>
      <h2>Reference analysis</h2>
      <div class="refs-grid">
        <figure><img src="${collageUrl}" alt="Owner's photo collage of the Seiko 6309-8060"><figcaption>Exterior reference: owner's photo collage (6 photos, 427×583 px total).</figcaption></figure>
        <div>
          <h3>Exterior: from your photos</h3>
          <ul>
            <li>Rounded steel case with broad integrated lugs; polished bezel and flanks, brushed lug tops.</li>
            <li>Warm ivory / champagne dial with a fine sunburst. SEIKO / AUTOMATIC under 12, Seiko 5 emblem above 6.</li>
            <li>Applied rectangular markers with dark inlay, doubled at 12; day-date window at 3.</li>
            <li>Polished baton hands with dark inlay; thin seconds hand.</li>
            <li>Crown at 3. Multi-row bracelet with fold-over clasp. Round engraved caseback with a central medallion.</li>
          </ul>
          <h3>Uncertain (not legible in the collage)</h3>
          <ul>
            <li>Small print at 6 ("17 JEWELS" assumed), caseback text, serial number (not invented).</li>
            <li>Crystal material; exact case dimensions (estimated ≈37 mm × 42 mm); day disc language.</li>
          </ul>
          <h3>Interior: Calibre 6309 family</h3>
          <ul>
            <li>No movement photos, parts catalogue or service manual were in the pack.</li>
            <li>Used as documented facts: 21,600 vph, 17 jewels (6309A), magic-lever bidirectional winding, Diashock, day-date, no hand-winding, no hacking.</li>
            <li>Part names follow Seiko terminology. Positions, shapes and tooth counts are <b>schematic</b>, and every part says so in the inspector.</li>
            <li>To make the interior exact, add 6309A movement photos and the parts catalogue, then replace the layout table in <code>src/watch/movement.ts</code>.</li>
          </ul>
        </div>
      </div></div>`;
  }
}
