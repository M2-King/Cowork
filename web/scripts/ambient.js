/* ==========================================================================
   Epoch — ambient loss landscape
   The app's backdrop is a slowly breathing loss surface drawn as contour
   lines (WebGL), with a few "optimizer" particles running momentum gradient
   descent across it and leaving fading trails (2D canvas). Your pointer
   presses a small well into the surface, so contours bend toward it.
   ========================================================================== */
(function () {
  'use strict';
  const E = window.Epoch;

  const SCALE = 2.3; // world units per viewport height
  const W = { pointer: [9, 9], pStrength: 0 };

  // Same function on the CPU (particles) and GPU (contours).
  function f(x, y, t) {
    const c1x = -0.62 + 0.16 * Math.sin(t * 0.071), c1y = -0.12 + 0.14 * Math.cos(t * 0.053);
    const c2x = 0.58 + 0.14 * Math.cos(t * 0.061), c2y = 0.26 + 0.12 * Math.sin(t * 0.083);
    const c3x = 0.04 + 0.2 * Math.sin(t * 0.041), c3y = 0.34 * Math.cos(t * 0.031);
    const d1 = (x - c1x) ** 2 + (y - c1y) ** 2, d2 = (x - c2x) ** 2 + (y - c2y) ** 2, d3 = (x - c3x) ** 2 + (y - c3y) ** 2;
    const dp = (x - W.pointer[0]) ** 2 + (y - W.pointer[1]) ** 2;
    return 0.16 * (0.55 * x * x + y * y)
      - 1.0 * Math.exp(-d1 * 2.4) - 0.78 * Math.exp(-d2 * 3.1) + 0.55 * Math.exp(-d3 * 4.2)
      + 0.05 * Math.sin(2.3 * x + 0.2 * t) * Math.cos(2.9 * y - 0.15 * t)
      - W.pStrength * 0.42 * Math.exp(-dp * 26);
  }

  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const FRAG = `
    #extension GL_OES_standard_derivatives : enable
    precision highp float;
    uniform vec2 uRes; uniform float uT; uniform float uScale;
    uniform vec4 uLine; uniform vec4 uMajor; uniform vec4 uGlow;
    uniform vec3 uPtr;
    float f(vec2 q, float t){
      vec2 c1 = vec2(-0.62 + 0.16*sin(t*0.071), -0.12 + 0.14*cos(t*0.053));
      vec2 c2 = vec2( 0.58 + 0.14*cos(t*0.061),  0.26 + 0.12*sin(t*0.083));
      vec2 c3 = vec2( 0.04 + 0.20*sin(t*0.041),  0.34*cos(t*0.031));
      float v = 0.16*(0.55*q.x*q.x + q.y*q.y);
      v -= 1.00*exp(-dot(q-c1,q-c1)*2.4);
      v -= 0.78*exp(-dot(q-c2,q-c2)*3.1);
      v += 0.55*exp(-dot(q-c3,q-c3)*4.2);
      v += 0.05*sin(2.3*q.x + 0.2*t)*cos(2.9*q.y - 0.15*t);
      v -= uPtr.z*0.42*exp(-dot(q-uPtr.xy,q-uPtr.xy)*26.0);
      return v;
    }
    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
      vec2 q = uv * uScale;
      float v = f(q, uT);
      float k = v * 11.0;
      float d = abs(fract(k + 0.5) - 0.5) / max(fwidth(k), 1e-4);
      float a = (1.0 - smoothstep(0.35, 1.25, d)) * uLine.a;
      float km = k / 5.0;
      float dm = abs(fract(km + 0.5) - 0.5) / max(fwidth(km), 1e-4);
      float am = (1.0 - smoothstep(0.5, 1.6, dm)) * uMajor.a;
      float g = smoothstep(-0.05, -0.85, v) * uGlow.a;
      // premultiplied "over" compositing: glow, then minor lines, then major lines
      vec4 acc = vec4(uGlow.rgb * g, g);
      acc = vec4(uLine.rgb * a, a) + acc * (1.0 - a);
      acc = vec4(uMajor.rgb * am, am) + acc * (1.0 - am);
      // fade toward the edges so the field feels like it's under glass
      float vig = smoothstep(1.25, 0.25, length(uv*vec2(0.85,1.0)));
      gl_FragColor = acc * mix(0.55, 1.0, vig);
    }`;

  function parseRGBA(c) {
    const s = E.alpha(c, 1); // normalise to rgba()
    const m = s.match(/[\d.]+/g).map(Number);
    return [m[0] / 255, m[1] / 255, m[2] / 255, m[3]];
  }

  const Ambient = {
    focusColor: null,
    init() {
      const gl_c = document.getElementById('ambient');
      const tr_c = document.getElementById('ambient-trails');
      if (!gl_c || !tr_c) return;
      const gl = gl_c.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
      const ext = gl && gl.getExtension('OES_standard_derivatives');
      const ctx = tr_c.getContext('2d');
      let prog = null, uni = {};
      if (gl && ext) {
        const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
        const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
        if (vs && fs) {
          prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
          if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) prog = null;
        }
        if (prog) {
          gl.useProgram(prog);
          const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
          const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
          ['uRes', 'uT', 'uScale', 'uLine', 'uMajor', 'uGlow', 'uPtr'].forEach((n) => (uni[n] = gl.getUniformLocation(prog, n)));
        }
      }

      let vw = 0, vh = 0;
      const resize = () => {
        vw = innerWidth; vh = innerHeight;
        const dprGL = Math.min(window.devicePixelRatio || 1, vw < 700 ? 1.25 : 1.5);
        const dpr2 = Math.min(window.devicePixelRatio || 1, 2);
        gl_c.width = Math.round(vw * dprGL); gl_c.height = Math.round(vh * dprGL);
        tr_c.width = Math.round(vw * dpr2); tr_c.height = Math.round(vh * dpr2);
        ctx.setTransform(dpr2, 0, 0, dpr2, 0, 0);
        if (prog) gl.viewport(0, 0, gl_c.width, gl_c.height);
      };
      resize();
      addEventListener('resize', resize);

      let colors = {};
      const readColors = () => {
        const c = E.Theme.colors();
        colors = {
          line: parseRGBA(c.contour), major: parseRGBA(c.contourMajor),
          glow: parseRGBA(c.accent),
          particles: [c.cLa, c.cCalc, c.cReg, c.cMl, c.cNn, c.cDl],
          dark: c.dark,
        };
        colors.glow[3] = c.dark ? 0.06 : 0.035;
      };
      readColors();
      E.Theme.onChange(() => { readColors(); if (still) draw(performance.now() / 1000); });

      // world <-> screen
      const toScreen = (x, y) => [(x / SCALE) * vh + vw / 2, vh / 2 - (y / SCALE) * vh];
      const toWorld = (sx, sy) => [((sx - vw / 2) / vh) * SCALE, ((vh / 2 - sy) / vh) * SCALE];

      // Pointer well (fine pointers only)
      const ptr = { x: 9, y: 9, tx: 9, ty: 9, s: 0, ts: 0, last: 0 };
      if (E.finePointer()) {
        addEventListener('pointermove', (e) => {
          const [x, y] = toWorld(e.clientX, e.clientY);
          if (ptr.s < 0.01) { ptr.x = x; ptr.y = y; }
          ptr.tx = x; ptr.ty = y; ptr.ts = 1; ptr.last = performance.now();
        }, { passive: true });
        document.addEventListener('pointerleave', () => (ptr.ts = 0));
      }

      // Optimizer particles
      const rand = E.rng(7);
      let colorIdx = 0;
      const N = vw < 700 ? 5 : 8;
      const parts = [];
      function spawn(p, t) {
        const [x0, y0] = toWorld(rand() * vw, rand() * vh);
        p.x = x0; p.y = y0; p.vx = 0; p.vy = 0; p.trail = []; p.age = 0; p.still = 0; p.fade = 0; p.dead = false;
        p.color = Ambient.focusColor || colors.particles[colorIdx++ % colors.particles.length];
        p.life = 9 + rand() * 9;
        return p;
      }
      for (let i = 0; i < N; i++) { const p = spawn({}, 0); p.age = rand() * 6; parts.push(p); }

      const still = E.reducedMotion();

      function stepParticles(t, dt) {
        const k = dt * 60;
        const h = 0.002;
        for (const p of parts) {
          const gx = (f(p.x + h, p.y, t) - f(p.x - h, p.y, t)) / (2 * h);
          const gy = (f(p.x, p.y + h, t) - f(p.x, p.y - h, t)) / (2 * h);
          const mu = Math.pow(0.93, k), lr = 0.0016 * k;
          p.vx = p.vx * mu - lr * gx; p.vy = p.vy * mu - lr * gy;
          const sp = Math.hypot(p.vx, p.vy), max = 0.014 * k;
          if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
          p.x += p.vx; p.y += p.vy; p.age += dt;
          const [sx, sy] = toScreen(p.x, p.y);
          p.trail.push(sx, sy);
          if (p.trail.length > 160) p.trail.splice(0, 2);
          p.still = sp < 0.0009 * k ? p.still + dt : 0;
          if (p.age > p.life || p.still > 1.5 || sx < -60 || sx > vw + 60 || sy < -60 || sy > vh + 60) p.fade += dt * 0.8;
          if (p.fade >= 1) spawn(p, t);
        }
      }

      function drawParticles() {
        ctx.clearRect(0, 0, vw, vh);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const baseA = colors.dark ? 0.55 : 0.42;
        for (const p of parts) {
          const tr = p.trail, n = tr.length / 2;
          if (n < 2) continue;
          const life = Math.min(1, p.age * 1.5) * (1 - p.fade);
          const chunks = 10, per = Math.ceil(n / chunks);
          for (let c = 0; c < chunks; c++) {
            const s = c * per, e = Math.min(n - 1, (c + 1) * per);
            if (e <= s) continue;
            ctx.beginPath(); ctx.moveTo(tr[s * 2], tr[s * 2 + 1]);
            for (let i = s + 1; i <= e; i++) ctx.lineTo(tr[i * 2], tr[i * 2 + 1]);
            ctx.strokeStyle = E.alpha(p.color, baseA * life * Math.pow((c + 1) / chunks, 1.6));
            ctx.lineWidth = 1.6; ctx.stroke();
          }
          const hx = tr[tr.length - 2], hy = tr[tr.length - 1];
          const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 12);
          g.addColorStop(0, E.alpha(p.color, 0.35 * life)); g.addColorStop(1, E.alpha(p.color, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = E.alpha(p.color, 0.9 * life); ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, Math.PI * 2); ctx.fill();
        }
      }

      function draw(t) {
        if (!prog) return;
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(uni.uRes, gl_c.width, gl_c.height);
        gl.uniform1f(uni.uT, t);
        gl.uniform1f(uni.uScale, SCALE);
        gl.uniform4fv(uni.uLine, colors.line);
        gl.uniform4fv(uni.uMajor, colors.major);
        gl.uniform4fv(uni.uGlow, colors.glow);
        gl.uniform3f(uni.uPtr, W.pointer[0], W.pointer[1], W.pStrength);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      if (still) { draw(20); return; }

      let t0 = performance.now(), last = t0, running = true, id = 0;
      const T_OFFSET = 20; // start mid-drift so the first frame is already interesting
      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        const t = (now - t0) / 1000 + T_OFFSET;
        // ease pointer well
        if (now - ptr.last > 1400) ptr.ts = 0;
        ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 6); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 6);
        ptr.s += (ptr.ts - ptr.s) * Math.min(1, dt * (ptr.ts > ptr.s ? 3 : 1.2));
        W.pointer = [ptr.x, ptr.y]; W.pStrength = ptr.s;
        draw(t);
        stepParticles(t, dt);
        drawParticles();
        id = requestAnimationFrame(frame);
      }
      id = requestAnimationFrame(frame);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { running = false; cancelAnimationFrame(id); }
        else if (!running) { running = true; last = performance.now(); id = requestAnimationFrame(frame); }
      });
    },
    focus(color) {
      this.focusColor = color || null;
    },
  };

  E.Ambient = Ambient;
})();
