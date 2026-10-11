// EASTER EGG: One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.
import { compileToFlow, validateFlow, repairFlow } from './compiler.js';

console.log('%cORANGE', 'color: orange; font-size: 2rem; font-weight: bold;');
console.log('%cmade with love by Elyes Kallel with the spirit of BXB', 'color: #ccc;');

const statusDiv = document.getElementById('status');
const cortexDiv = document.getElementById('cortex');

// Initialize Orb
class LivingOrb {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    this.time = 0; this.energy = 0; this.showEasterEgg = false; this.state = 'idle';
    if (!this.gl) { console.warn('WebGL not supported'); return; }
    this.initShaders(); this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }
  initShaders() {
    const vs = `attribute vec4 position; void main() { gl_Position = position; }`;
    const fs = `precision highp float; uniform float u_time; uniform float u_energy; uniform bool u_easterEgg;
      void main() {
        vec2 uv = gl_FragCoord.xy / vec2(800.0, 800.0); vec2 center = uv - 0.5; float dist = length(center);
        float pulse = sin(u_time * 3.0 + u_energy * 10.0) * 0.1 + 0.9;
        float orb = smoothstep(0.3 * pulse, 0.25 * pulse, dist);
        vec3 glow = vec3(1.0, 0.5, 0.0) * orb * (1.0 - dist * 2.0);
        if (u_easterEgg) glow = mix(glow, vec3(1.0, 0.6, 0.1), smoothstep(0.05, 0.0, abs(dist - 0.3)));
        gl_FragColor = vec4(glow, orb);
      }`;
    const vShader = this.compileShader(this.gl.VERTEX_SHADER, vs);
    const fShader = this.compileShader(this.gl.FRAGMENT_SHADER, fs);
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vShader); this.gl.attachShader(this.program, fShader); this.gl.linkProgram(this.program);
    this.posLoc = this.gl.getAttribLocation(this.program, 'position');
    this.timeLoc = this.gl.getUniformLocation(this.program, 'u_time');
    this.energyLoc = this.gl.getUniformLocation(this.program, 'u_energy');
    this.eeLoc = this.gl.getUniformLocation(this.program, 'u_easterEgg');
    const buf = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), this.gl.STATIC_DRAW);
  }
  compileShader(type, src) { const s = this.gl.createShader(type); this.gl.shaderSource(s, src); this.gl.compileShader(s); return s; }
  resize() { const s = Math.min(window.innerWidth, window.innerHeight, 800); this.canvas.width = s; this.canvas.height = s; this.gl.viewport(0, 0, s, s); }
  pulse(amt = 0.3) { this.energy = Math.min(this.energy + amt, 1.0); this.state = 'generating'; }
  setIdle() { this.state = 'idle'; this.energy = 0; }
  triggerEasterEgg() { this.showEasterEgg = true; }
  hideEasterEgg() { this.showEasterEgg = false; }
  animate() {
    if (!this.gl) return; 
    if (this.state === 'idle') this.energy *= 0.95;
    this.time += 0.016;
    this.gl.clearColor(0,0,0,0); this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.program);
    this.gl.uniform1f(this.timeLoc, this.time); this.gl.uniform1f(this.energyLoc, this.energy);
    this.gl.uniform1i(this.eeLoc, this.showEasterEgg ? 1 : 0);
    this.gl.enableVertexAttribArray(this.posLoc);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING));
    this.gl.vertexAttribPointer(this.posLoc, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    requestAnimationFrame(() => this.animate());
  }
}

const canvas = document.getElementById('orb');
const orb = new LivingOrb(canvas);

// Web Worker Setup
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
let currentMode = 'FALLBACK'; // Default to fallback until worker confirms LIVE

worker.onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === 'PROGRESS') {
    statusDiv.textContent = payload.status;
    orb.pulse(0.1);
  } else if (type === 'READY') {
    currentMode = 'LIVE';
    statusDiv.textContent = `LIVE: ${payload.model} ready. Press Ctrl+K.`;
    orb.setIdle();
  } else if (type === 'STATUS') {
    statusDiv.textContent = payload;
    orb.pulse(0.8);
  } else if (type === 'SUCCESS') {
    renderCortex(payload.flow, payload.metrics);
    statusDiv.textContent = `Compiled successfully (${payload.metrics.tokensPerSec} tok/s).`;
    orb.setIdle();
    cmdPalette.classList.remove('active');
    cmdInput.value = '';
  } else if (type === 'FALLBACK' || type === 'ERROR') {
    currentMode = 'FALLBACK';
    statusDiv.textContent = 'Using RULE-BASED FALLBACK.';
    const flow = compileToFlow(cmdInput.value);
    renderCortex(flow, { mode: 'FALLBACK', tokens: '-', duration: '0.01', tokensPerSec: '-' });
    orb.setIdle();
    cmdPalette.classList.remove('active');
    cmdInput.value = '';
  }
};

// Start worker initialization
worker.postMessage({ type: 'INIT_ENGINE' });

// Command Palette Logic
const cmdPalette = document.getElementById('cmd-palette');
const cmdInput = document.getElementById('cmd-input');

function toggleCmd() {
  cmdPalette.classList.toggle('active');
  if (cmdPalette.classList.contains('active')) { cmdInput.focus(); orb.pulse(0.5); }
}
document.getElementById('open-cmd').addEventListener('click', toggleCmd);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); toggleCmd(); }
  if (e.key === 'Escape') { cmdPalette.classList.remove('active'); hideEasterEgg(); }
});

// Compiler Integration
cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && cmdInput.value.trim() !== '') {
    e.preventDefault();
    worker.postMessage({ type: 'COMPILE', payload: cmdInput.value });
  }
});

function renderCortex(flow, metrics) {
  if (!cortexDiv) return;
  const modeLabel = metrics.mode === 'LIVE' 
    ? '<span style="color:#4ade80">[LIVE]</span>' 
    : '<span style="color:#fbbf24">[RULE-BASED FALLBACK]</span>';
  
  const metricsHtml = metrics.mode === 'LIVE' 
    ? `<div style="font-size:0.7rem; opacity:0.7; margin-bottom:0.5rem;">Tokens: ${metrics.tokens} | Time: ${metrics.duration}s | Speed: ${metrics.tokensPerSec} tok/s</div>`
    : `<div style="font-size:0.7rem; opacity:0.7; margin-bottom:0.5rem;">Metrics: Simulated (Fallback Mode)</div>`;

  cortexDiv.innerHTML = `${modeLabel}${metricsHtml}<pre style="text-align:left; font-size:0.8rem; color:var(--fg); margin:0;">${JSON.stringify(flow, null, 2)}</pre>`;
  cortexDiv.style.display = 'block';
}

// Easter Egg Logic
const eeOverlay = document.getElementById('easter-egg-overlay');
const eeText = document.getElementById('easter-egg-text');
let logoClicks = 0, typedChars = '';

function showEasterEgg() {
  orb.triggerEasterEgg(); eeOverlay.classList.add('active');
  const msg = "One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.";
  eeText.textContent = ''; let i = 0;
  const interval = setInterval(() => { eeText.textContent += msg.charAt(i); i++; if (i >= msg.length) clearInterval(interval); }, 30);
}
function hideEasterEgg() { orb.hideEasterEgg(); eeOverlay.classList.remove('active'); }

document.getElementById('logo').addEventListener('click', () => {
  logoClicks++; if (logoClicks === 3) { showEasterEgg(); logoClicks = 0; }
  setTimeout(() => { logoClicks = 0; }, 1000);
});
document.getElementById('ee-trigger').addEventListener('click', showEasterEgg);
document.addEventListener('keydown', (e) => {
  if (e.key.length === 1) {
    typedChars += e.key.toLowerCase();
    if (typedChars.includes('gg33')) { showEasterEgg(); typedChars = ''; }
    if (typedChars.length > 10) typedChars = typedChars.slice(-10);
  }
});
