/* FOCO light field: a slow domain-warped flow of navy, electric blue and ice light,
   with a soft lens of light that follows the pointer. One WebGL context per canvas.
   initShader(canvas, { seed, speed, palette, still, time, lens }) */
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uSeed; uniform float uLens;
uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32+uSeed); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<3;i++){ v+=a*noise(p); p=m*p; a*=.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy; vec2 p = (gl_FragCoord.xy - .5*uRes.xy) / uRes.y;
  float t = uTime*.06;
  vec2 w = p + .55*vec2(fbm(p*.9 + t + uSeed), fbm(p*.9 - t + 4.1 + uSeed));
  w += .25*vec2(fbm(w*1.7 - t*.7), fbm(w*1.7 + t*.5 + 2.));
  float band = sin(w.x*3.2 + w.y*2.1 + fbm(w*1.3)*5. + uSeed*1.7);
  float s = .5 + .5*band;
  float band2 = .5 + .5*sin(w.x*-2.3 + w.y*3.7 + uSeed*3. + t*2.);
  vec3 col = mix(c0, c1, smoothstep(-.2, 1.1, uv.y*.6 + s*.55));
  col = mix(col, c2, pow(s, 3.) * .9);
  col += c2 * pow(band2, 6.) * .35;
  col = mix(col, c3, pow(s, 18.) * .95);
  col += c3 * pow(s*band2, 30.) * .6;
  float f = s;
  vec2 m = (uMouse - .5*uRes.xy) / uRes.y;
  float d = length(p - m);
  col += c3 * uLens * .22 * exp(-d*d*7.);
  col += c2 * uLens * .12 * smoothstep(.36,.34,d) * smoothstep(.30,.34,d);
  col *= 1. - .35*pow(length(uv-.5)*1.3, 2.);
  col += (hash(gl_FragCoord.xy + fract(uTime)) - .5) * .035;
  gl_FragColor = vec4(col, 1.);
}`;
const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }`;
const PALETTES = {
  night: ['#01032a', '#00064e', '#2f4bff', '#bff8ff'],
  deep:  ['#000214', '#020a5c', '#1f6bff', '#7cf2ff'],
  ice:   ['#cfeef3', '#effcfd', '#7fb6ff', '#ffffff'],
  ember: ['#01032a', '#0b1a7a', '#4f7dff', '#e8fbff'],
};
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

export function initShader(canvas, opts = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: !!opts.still, powerPreference: 'low-power' });
  if (!gl) { canvas.classList.add('is-fallback'); return null; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const pal = (PALETTES[opts.palette] || PALETTES.night).map(hex);
  ['c0', 'c1', 'c2', 'c3'].forEach((n, i) => gl.uniform3fv(U(n), pal[i]));
  gl.uniform1f(U('uSeed'), opts.seed ?? 1.0);
  const scale = opts.still ? 1 : Math.min(window.devicePixelRatio || 1, 1.5) * 0.6;
  let w = 0, h = 0, mouse = [0, 0], target = [0, 0], lens = 0, lensTarget = opts.lens ? 1 : 0, raf = 0, visible = true;
  const resize = () => {
    w = Math.max(1, Math.floor(canvas.clientWidth * scale)); h = Math.max(1, Math.floor(canvas.clientHeight * scale));
    canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(U('uRes'), w, h);
    if (!mouse[0]) { mouse = [w * .68, h * .55]; target = [...mouse]; }
  };
  const draw = time => {
    mouse[0] += (target[0] - mouse[0]) * .06; mouse[1] += (target[1] - mouse[1]) * .06; lens += (lensTarget - lens) * .05;
    gl.uniform1f(U('uTime'), time); gl.uniform2f(U('uMouse'), mouse[0], mouse[1]); gl.uniform1f(U('uLens'), lens);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  resize();
  if (opts.still) { draw(opts.time ?? 12); return { canvas }; }
  const speed = opts.speed ?? 1, t0 = performance.now() - (opts.seed ?? 1) * 4000;
  const loop = now => { raf = requestAnimationFrame(loop); if (visible) draw((now - t0) / 1000 * speed); };
  raf = requestAnimationFrame(loop);
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  if (opts.lens) {
    const host = canvas.parentElement;
    host.addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); target = [(e.clientX - b.left) * scale, (b.bottom - e.clientY) * scale]; lensTarget = 1; });
    host.addEventListener('pointerleave', () => { lensTarget = .4; });
  }
  return { destroy() { cancelAnimationFrame(raf); } };
}
