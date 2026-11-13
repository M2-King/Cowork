/* ==========================================================================
   EPOCH — interface sound
   Tiny synthesized UI sounds (no audio files): hover ticks, confirm chirps,
   a whoosh between screens, a reward sparkle and a miss buzz. Audio starts
   only after the first click or key press, and the HUD speaker toggles it.
   ========================================================================== */
(function () {
  'use strict';
  const E = window.Epoch;

  const Sfx = {
    on: E.store.get('sound', true),
    ctx: null, out: null, lastHover: 0, lastEl: null,

    ensure() {
      if (!this.on) return null;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { this.ctx = new AC(); } catch (e) { return null; }
        this.out = this.ctx.createGain(); this.out.gain.value = 0.22;
        const comp = this.ctx.createDynamicsCompressor();
        this.out.connect(comp); comp.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    },
    tone(freq, dur, { type = 'sine', gain = 0.25, slide = 0, delay = 0, attack = 0.004 } = {}) {
      const c = this.ctx; if (!c || !this.on) return;
      const t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, { gain = 0.2, from = 400, to = 2400, delay = 0 } = {}) {
      const c = this.ctx; if (!c || !this.on) return;
      const t = c.currentTime + delay;
      const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.out); src.start(t); src.stop(t + dur);
    },
    hover() { if (!this.ctx) return; const n = performance.now(); if (n - this.lastHover < 45) return; this.lastHover = n; this.tone(2300, 0.035, { type: 'triangle', gain: 0.05 }); },
    click() { this.ensure(); this.tone(740, 0.05, { type: 'square', gain: 0.05 }); this.tone(1480, 0.07, { type: 'triangle', gain: 0.07, delay: 0.025 }); },
    whoosh() { this.ensure(); this.noise(0.32, { gain: 0.12, from: 300, to: 3200 }); },
    confirm() { this.ensure(); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, { type: 'triangle', gain: 0.12, delay: i * 0.06 })); },
    reward() { this.ensure(); [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.25, { type: 'sine', gain: 0.1, delay: i * 0.05 })); this.noise(0.5, { gain: 0.04, from: 4000, to: 9000, delay: 0.1 }); },
    hit() { this.ensure(); this.tone(220, 0.14, { type: 'square', gain: 0.1, slide: -120 }); this.noise(0.18, { gain: 0.16, from: 1800, to: 300 }); },
    miss() { this.ensure(); this.tone(150, 0.22, { type: 'sawtooth', gain: 0.1, slide: -60 }); },
    flip() { this.ensure(); this.noise(0.14, { gain: 0.08, from: 1200, to: 4000 }); },
    set(on) { this.on = on; E.store.set('sound', on); if (on) { this.ensure(); this.confirm(); } },

    wire() {
      const unlock = () => this.ensure();
      addEventListener('pointerdown', unlock, { passive: true });
      addEventListener('keydown', unlock);
      const interactive = 'a[href], button, [role="radio"], label.switch, .opt-row';
      document.addEventListener('pointerover', (e) => {
        const el = e.target.closest(interactive);
        if (el && el !== this.lastEl) { this.lastEl = el; this.hover(); }
        if (!el) this.lastEl = null;
      });
      document.addEventListener('click', (e) => {
        const el = e.target.closest(interactive);
        if (el && !el.closest('[data-sfx="none"]')) this.click();
      }, true);
    },
  };

  E.Sfx = Sfx;
})();
