/* ==========================================================================
   EPOCH — the world
   A live, ray-marched 3-D loss landscape behind the whole UI. Height is the
   loss; valleys are minima. Contour lines glow along equal-loss heights, fog
   rolls in with distance, and an objective beacon hovers over the deepest
   valley — the minimum you are descending toward. The camera drifts and
   follows the pointer; each realm tints the world in its own colour.
   ========================================================================== */
(function () {
  'use strict';
  const E = window.Epoch;

  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FRAG = `
    #extension GL_OES_standard_derivatives : enable
    precision highp float;
    uniform vec2 uRes; uniform float uT; uniform vec3 uTint; uniform vec2 uMouse; uniform float uScroll;

    float loss(vec2 q, float t){
      vec2 c1 = vec2(-0.62 + 0.16*sin(t*0.071), -0.12 + 0.14*cos(t*0.053));
      vec2 c2 = vec2( 0.58 + 0.14*cos(t*0.061),  0.26 + 0.12*sin(t*0.083));
      vec2 c3 = vec2( 0.04 + 0.20*sin(t*0.041),  0.34*cos(t*0.031));
      float v = 0.16*(0.55*q.x*q.x + q.y*q.y);
      v -= 1.00*exp(-dot(q-c1,q-c1)*2.4);
      v -= 0.78*exp(-dot(q-c2,q-c2)*3.1);
      v += 0.75*exp(-dot(q-c3,q-c3)*4.2);
      v += 0.06*sin(2.3*q.x + 0.2*t)*cos(2.9*q.y - 0.15*t);
      return v;
    }
    const float S = 0.62;   // world → loss coordinates
    const float HS = 0.55;  // loss → height
    float H(vec2 xz){ return loss(xz*S, uT)*HS; }

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    vec3 sky(vec3 rd){
      float hz = pow(1.0 - clamp(rd.y, 0.0, 1.0), 7.0);
      vec3 c = mix(vec3(0.008, 0.012, 0.03), vec3(0.03, 0.045, 0.1) + uTint*0.22, hz);
      // stars
      vec2 g = rd.xz / max(rd.y, 0.05) * 22.0;
      vec2 id = floor(g); float h = hash(id);
      float star = step(0.985, h) * smoothstep(0.5, 0.0, length(fract(g) - 0.5)) * smoothstep(0.02, 0.25, rd.y);
      c += vec3(0.75, 0.82, 1.0) * star * (0.5 + 0.5*sin(uT*2.0 + h*40.0));
      return c;
    }

    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
      float t = uT;
      vec3 ro = vec3(0.35*sin(t*0.045) + uMouse.x*0.45, 1.3 + uMouse.y*0.15 + uScroll*0.6, -4.4 + 0.25*sin(t*0.03));
      vec3 ta = vec3(0.0 + uMouse.x*0.2, 0.32 - uScroll*0.9, 0.8);
      vec3 ww = normalize(ta - ro), uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0))), vv = cross(uu, ww);
      vec3 rd = normalize(uv.x*uu + uv.y*vv + 1.55*ww);

      float d = 0.2; bool hit = false; vec3 p;
      for (int i = 0; i < 110; i++){
        p = ro + rd*d;
        float h = p.y - H(p.xz);
        if (h < 0.002*d){ hit = true; break; }
        d += clamp(h*0.42, 0.012, 0.3);
        if (d > 14.0) break;
      }

      vec3 col = sky(rd);
      if (hit){
        float h = H(p.xz);
        float e = 0.012;
        vec3 n = normalize(vec3(H(p.xz - vec2(e, 0.0)) - H(p.xz + vec2(e, 0.0)), 2.0*e, H(p.xz - vec2(0.0, e)) - H(p.xz + vec2(0.0, e))));
        vec3 L = normalize(vec3(-0.5, 0.55, 0.65));
        float dif = clamp(dot(n, L), 0.0, 1.0);
        float rim = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
        vec3 base = vec3(0.012, 0.018, 0.04);
        col = base + vec3(0.05, 0.07, 0.13)*dif + uTint*0.10*rim;
        // valleys glow like they are holding light
        col += uTint * smoothstep(-0.12, -0.5, h) * 0.32;
        // equal-loss contours
        float k = h * 15.0;
        float cl = abs(fract(k + 0.5) - 0.5) / max(fwidth(k), 1e-4);
        float line = 1.0 - smoothstep(0.2, 1.4, cl);
        float km = h * 3.0;
        float cm = abs(fract(km + 0.5) - 0.5) / max(fwidth(km), 1e-4);
        float major = 1.0 - smoothstep(0.3, 1.6, cm);
        vec3 lc = mix(uTint, vec3(0.7, 0.8, 1.0), 0.35);
        col += lc * line * 0.42 + lc * major * 0.55;
        // faint survey grid
        vec2 gg = abs(fract(p.xz * 1.5) - 0.5) / max(fwidth(p.xz * 1.5), 1e-4);
        col += vec3(0.25, 0.4, 0.9) * (1.0 - smoothstep(0.0, 1.0, min(gg.x, gg.y))) * 0.05;
        // fog
        float fog = 1.0 - exp(-d*0.2);
        col = mix(col, sky(rd) + uTint*0.05, fog);
      }

      // objective beacon above the deepest well
      vec2 c1 = vec2(-0.62 + 0.16*sin(t*0.071), -0.12 + 0.14*cos(t*0.053)) / S;
      vec3 bp = vec3(c1.x, H(c1) + 0.16 + 0.03*sin(t*2.2), c1.y);
      float tb = dot(bp - ro, rd);
      if (tb > 0.0 && (!hit || d > tb - 0.05)){
        float db = length(ro + rd*tb - bp);
        vec3 ember = vec3(1.0, 0.71, 0.28);
        col += ember * (0.0016 / (db*db + 0.0009)) * 0.6;
        col += ember * exp(-db*30.0) * 0.6;
      }
      // light shaft rising from the beacon
      vec2 rxz = normalize(rd.xz + 1e-5);
      vec2 rel = bp.xz - ro.xz;
      float along = dot(rel, rxz);
      if (along > 0.0){
        float side = abs(rel.x*rxz.y - rel.y*rxz.x);
        float ty = ro.y + rd.y * (along / max(length(rd.xz), 1e-4));
        float up = smoothstep(bp.y, bp.y + 0.1, ty) * exp(-(ty - bp.y)*0.35);
        if (!hit || d > along) col += vec3(1.0, 0.72, 0.32) * exp(-side*90.0) * up * 0.35;
      }

      // gentle filmic curve
      col = col / (1.0 + col*0.6);
      col = pow(col, vec3(0.92));
      gl_FragColor = vec4(col, 1.0);
    }`;

  function hexToRGB(c) {
    const m = E.alpha(c, 1).match(/[\d.]+/g).map(Number);
    return [m[0] / 255, m[1] / 255, m[2] / 255];
  }

  const World = {
    tint: [0.36, 0.55, 1.0],
    target: [0.36, 0.55, 1.0],
    base: null,
    init() {
      const canvas = document.getElementById('world');
      if (!canvas) return;
      const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
      if (!gl || !gl.getExtension('OES_standard_derivatives')) { canvas.style.background = 'radial-gradient(80% 60% at 50% 30%, #13204a, #03050a)'; return; }
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; } return s; };
      const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return;
      const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = {}; ['uRes', 'uT', 'uTint', 'uMouse', 'uScroll'].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

      this.base = hexToRGB(E.Theme.colors().accent);
      this.tint = this.base.slice(); this.target = this.base.slice();

      let scale = innerWidth < 700 ? 0.42 : 0.55;
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(2, Math.round(innerWidth * dpr * scale));
        canvas.height = Math.max(2, Math.round(innerHeight * dpr * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      resize(); addEventListener('resize', resize);

      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * -2; }, { passive: true });
      let scroll = 0;

      const draw = (t) => {
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uT, t);
        gl.uniform3fv(U.uTint, this.tint);
        gl.uniform2f(U.uMouse, mouse.x, mouse.y);
        gl.uniform1f(U.uScroll, scroll);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };

      if (E.reducedMotion()) { draw(24); E.Theme.onChange(() => draw(24)); this._redraw = () => draw(24); return; }

      // adaptive quality: drop resolution if frames are slow
      let t0 = performance.now(), last = t0, running = true, id = 0, slow = 0, acc = 0;
      const frame = (now) => {
        if (!running) return;
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        acc += dt;
        if (acc >= 1 / 40) { // ~40 fps is plenty for an ambient scene
          const k = Math.min(1, acc * 3);
          mouse.x += (mouse.tx - mouse.x) * k * 0.6; mouse.y += (mouse.ty - mouse.y) * k * 0.6;
          const st = Math.min(1, scrollY / (innerHeight * 1.2));
          scroll += (st - scroll) * Math.min(1, acc * 4);
          for (let i = 0; i < 3; i++) this.tint[i] += (this.target[i] - this.tint[i]) * Math.min(1, acc * 2.2);
          draw((now - t0) / 1000 + 24);
          if (acc > 0.06) { if (++slow > 20 && scale > 0.3) { scale -= 0.08; resize(); slow = 0; } } else slow = Math.max(0, slow - 1);
          acc = 0;
        }
        id = requestAnimationFrame(frame);
      };
      id = requestAnimationFrame(frame);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { running = false; cancelAnimationFrame(id); }
        else if (!running) { running = true; last = performance.now(); id = requestAnimationFrame(frame); }
      });
    },
    /* Tint the world toward a realm colour (null restores the default) */
    focus(color) {
      this.target = color ? hexToRGB(color) : (this.base || this.target).slice();
      if (this._redraw) { this.tint = this.target.slice(); this._redraw(); }
    },
  };

  E.Ambient = World;
  E.World = World;
})();
