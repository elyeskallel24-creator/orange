// EASTER EGG: One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.
import { compileToFlow, validateFlow, repairFlow } from './compiler.js';

console.log('%cORANGE', 'color: orange; font-size: 2rem; font-weight: bold;');
console.log('%cmade with love by Elyes Kallel with the spirit of BXB', 'color: #ccc;');

const statusDiv = document.getElementById('status');
const cortexDiv = document.getElementById('cortex');
const cmdInput = document.getElementById('cmd-input');

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

// Isolated Engine Frame
const engineFrame = document.createElement('iframe');
engineFrame.src = './engine.html';
engineFrame.style.display = 'none';
document.body.appendChild(engineFrame);

const sendInit = () => {
  if (engineFrame.contentWindow) {
    engineFrame.contentWindow.postMessage({ type: 'INIT_ENGINE' }, '*');
  }
};
engineFrame.onload = sendInit;
setTimeout(sendInit, 500);

let currentMode = 'FALLBACK';

window.addEventListener('message', (e) => {
  if (e.source !== engineFrame.contentWindow) return;
  const { type, payload } = e.data;
  
  if (type === 'PROGRESS') {
    statusDiv.textContent = payload.status;
    orb.pulse(0.1);
  } else if (type === 'READY') {
    currentMode = payload.mode;
    statusDiv.textContent = `LIVE: ${payload.model} ready.`;
    orb.setIdle();
  } else if (type === 'STATUS') {
    statusDiv.textContent = payload;
    orb.pulse(0.8);
  } else if (type === 'SUCCESS') {
    renderCortex(payload.flow, payload.metrics);
    statusDiv.textContent = `Compiled successfully (${payload.metrics.tokensPerSec} tok/s).`;
    orb.setIdle();
    cmdInput.value = '';
  } else if (type === 'RETRY') {
    statusDiv.textContent = payload.message;
    orb.pulse(0.8);
    if (cortexDiv) {
      const retryDiv = document.createElement('div');
      retryDiv.style.cssText = 'color:var(--warning); font-size:0.75rem; margin-bottom:0.5rem; border-left:2px solid var(--warning); padding-left:0.5rem;';
      retryDiv.textContent = `⚠️ ${payload.message} Error: ${payload.originalError}`;
      cortexDiv.appendChild(retryDiv);
    }
  } else if (type === 'FALLBACK' || type === 'ERROR') {
    currentMode = 'FALLBACK';
    statusDiv.textContent = type === 'FALLBACK' ? payload.message : 'Using RULE-BASED FALLBACK.';
    const flow = compileToFlow(cmdInput.value || 'default fallback flow');
    renderCortex(flow, { mode: 'FALLBACK', tokens: '-', duration: '0.01', tokensPerSec: '-' });
    orb.setIdle();
    cmdInput.value = '';
  }
});

// Compiler Integration
cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && cmdInput.value.trim() !== '') {
    e.preventDefault();
    orb.pulse(0.5);
    // Clear previous cortex state on new compile
    if (cortexDiv) cortexDiv.innerHTML = '';
    engineFrame.contentWindow.postMessage({ type: 'COMPILE', payload: cmdInput.value }, '*');
  }
});

// Ctrl+K focuses the inline input
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { 
    e.preventDefault(); 
    cmdInput.focus(); 
    orb.pulse(0.5);
  }
  if (e.key === 'Escape') { 
    cmdInput.blur(); 
    hideEasterEgg(); 
  }
});

function renderCortex(flow, metrics) {
  if (!cortexDiv) return;
  let modeLabel = '<span style="color:var(--warning)">[RULE-BASED FALLBACK]</span>';
  let metricsHtml = `<div style="color:var(--fg-muted); margin-bottom:0.5rem;">Metrics: n/a (no model in this mode)</div>`;
  
  if (metrics.mode === 'LIVE_WEBGPU') {
    modeLabel = '<span style="color:var(--success)">[LIVE WebGPU]</span>';
    const retryText = metrics.retries > 0 ? ` | Retries: ${metrics.retries}` : '';
    metricsHtml = `<div style="color:var(--fg-muted); margin-bottom:0.5rem;">Tokens: ${metrics.tokens} | Time: ${metrics.duration}s | Speed: ${metrics.tokensPerSec} tok/s${retryText}</div>`;
  } else if (metrics.mode === 'LIVE_WASM') {
    modeLabel = '<span style="color:#60a5fa">[LIVE WASM]</span>';
    const retryText = metrics.retries > 0 ? ` | Retries: ${metrics.retries}` : '';
    metricsHtml = `<div style="color:var(--fg-muted); margin-bottom:0.5rem;">Tokens: ~${metrics.tokens} | Time: ${metrics.duration}s | Speed: ~${metrics.tokensPerSec} tok/s (Est.)${retryText}</div>`;
  }

  cortexDiv.innerHTML = `${modeLabel}${metricsHtml}<pre style="color:var(--fg-primary);">${JSON.stringify(flow, null, 2)}</pre>`;
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
