// EASTER EGG: One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.
import { compileToFlow, validateFlow, repairFlow } from './compiler.js';
import { DEMO_FLOWS } from './library.js';

console.log('%cORANGE', 'color: orange; font-size: 2rem; font-weight: bold;');
console.log('%cmade with love by Elyes Kallel with the spirit of BXB', 'color: #ccc;');

const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const statusDiv = document.getElementById('status');
const cortexDiv = document.getElementById('cortex');
const cmdInput = document.getElementById('cmd-input');
const compileBtn = document.getElementById('compile-btn');
const cmdBtn = document.getElementById('cmd-btn');
const aboutBtn = document.getElementById('about-btn');
const aboutPanel = document.getElementById('about-panel');
const aboutCloseBtn = document.getElementById('about-close-btn');
const modeChip = document.getElementById('mode-chip');
const emptyState = document.getElementById('empty-state');
const libraryPrompts = document.querySelectorAll('.library-prompt');

// Initialize Orb (render on-demand only)
class LivingOrb {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    this.time = 0; 
    this.energy = 0; 
    this.showEasterEgg = false; 
    this.state = 'idle';
    this.animationId = null;
    if (!this.gl) { 
      console.warn('WebGL not supported'); 
      return; 
    }
    this.initShaders(); 
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // Start animation only when needed
    this.startAnimation();
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
    this.gl.attachShader(this.program, vShader); 
    this.gl.attachShader(this.program, fShader); 
    this.gl.linkProgram(this.program);
    this.posLoc = this.gl.getAttribLocation(this.program, 'position');
    this.timeLoc = this.gl.getUniformLocation(this.program, 'u_time');
    this.energyLoc = this.gl.getUniformLocation(this.program, 'u_energy');
    this.eeLoc = this.gl.getUniformLocation(this.program, 'u_easterEgg');
    const buf = this.gl.createBuffer(); 
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), this.gl.STATIC_DRAW);
  }
  compileShader(type, src) { 
    const s = this.gl.createShader(type); 
    this.gl.shaderSource(s, src); 
    this.gl.compileShader(s); 
    return s; 
  }
  resize() { 
    const s = Math.min(window.innerWidth, window.innerHeight, 800); 
    this.canvas.width = s; 
    this.canvas.height = s; 
    this.gl.viewport(0, 0, s, s); 
  }
  pulse(amt = 0.3) { 
    this.energy = Math.min(this.energy + amt, 1.0); 
    this.state = 'generating';
  }
  setIdle() { 
    this.state = 'idle'; 
    this.energy = 0;
    // Stop animation when idle (render on-demand)
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  startAnimation() {
    if (this.animationId) return; // Already running
    this.animate();
  }
  animate() {
    if (!this.gl) return; 
    if (this.state === 'idle') {
      this.energy *= 0.95;
    }
    this.time += 0.016;
    this.gl.clearColor(0,0,0,0); 
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.program);
    this.gl.uniform1f(this.timeLoc, this.time); 
    this.gl.uniform1f(this.energyLoc, this.energy);
    this.gl.uniform1i(this.eeLoc, this.showEasterEgg ? 1 : 0);
    this.gl.enableVertexAttribArray(this.posLoc);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING));
    this.gl.vertexAttribPointer(this.posLoc, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  triggerEasterEgg() { 
    this.showEasterEgg = true;
    this.startAnimation();
  }
  hideEasterEgg() { 
    this.showEasterEgg = false;
    this.setIdle();
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
let currentFlow = null;

window.addEventListener('message', (e) => {
  if (e.source !== engineFrame.contentWindow) return;
  const { type, payload } = e.data;
  
  if (type === 'PROGRESS') {
    // Update loading screen if visible
    if (!loadingScreen.classList.contains('hidden')) {
      loadingProgress.textContent = payload.status;
    } else {
      statusDiv.textContent = payload.status;
    }
    orb.pulse(0.1);
    orb.startAnimation();
  } else if (type === 'READY') {
    currentMode = payload.mode;
    modeChip.textContent = payload.mode === 'LIVE_WEBGPU' ? 'LIVE WebGPU' : 'LIVE WASM';
    modeChip.setAttribute('data-mode', payload.mode);
    statusDiv.textContent = `${payload.model} ready.`;
    // Hide loading screen
    loadingScreen.classList.add('hidden');
    // Show empty state with library prompts
    emptyState.style.display = 'block';
    orb.setIdle();
  } else if (type === 'STATUS') {
    statusDiv.textContent = payload;
    orb.pulse(0.8);
    orb.startAnimation();
  } else if (type === 'SUCCESS') {
    currentFlow = payload.flow;
    renderCortex(payload.flow, payload.metrics);
    statusDiv.textContent = `Compiled successfully (${payload.metrics.tokensPerSec} tok/s).`;
    orb.setIdle();
    cmdInput.value = '';
    emptyState.style.display = 'none';
    updateShareURL();
  } else if (type === 'RETRY') {
    statusDiv.textContent = payload.message;
    orb.pulse(0.8);
    // Append retry message to cortex using createElement (not innerHTML)
    const retryDiv = document.createElement('div');
    retryDiv.style.cssText = 'color:var(--warning); font-size:0.75rem; margin-bottom:0.5rem; border-left:2px solid var(--warning); padding-left:0.5rem;';
    retryDiv.textContent = `⚠️ ${payload.message} Error: ${payload.originalError}`;
    cortexDiv.appendChild(retryDiv);
  } else if (type === 'FALLBACK' || type === 'ERROR') {
    currentMode = 'FALLBACK';
    modeChip.textContent = 'FALLBACK';
    modeChip.setAttribute('data-mode', 'FALLBACK');
    statusDiv.textContent = type === 'FALLBACK' ? payload.message : 'Using RULE-BASED FALLBACK.';
    currentFlow = compileToFlow(cmdInput.value || 'default fallback flow');
    renderCortex(currentFlow, { mode: 'FALLBACK', tokens: '-', duration: '0.01', tokensPerSec: '-' });
    orb.setIdle();
    cmdInput.value = '';
    emptyState.style.display = 'none';
    updateShareURL();
    loadingScreen.classList.add('hidden');
  }
});

// Compile function
function compile() {
  const prompt = cmdInput.value.trim();
  if (!prompt) {
    statusDiv.textContent = 'Please enter a prompt.';
    cmdInput.focus();
    return;
  }
  orb.pulse(0.5);
  orb.startAnimation();
  // Clear cortex using textContent (not innerHTML)
  cortexDiv.innerHTML = '';
  const pre = document.createElement('pre');
  pre.textContent = 'Compiling...';
  cortexDiv.appendChild(pre);
  engineFrame.contentWindow.postMessage({ type: 'COMPILE', payload: prompt }, '*');
}

// Event Listeners
compileBtn.addEventListener('click', compile);
cmdBtn.addEventListener('click', () => {
  cmdInput.focus();
  orb.pulse(0.5);
});

cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    compile();
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { 
    e.preventDefault(); 
    cmdInput.focus(); 
    orb.pulse(0.5);
  }
  if (e.key === 'Escape') { 
    cmdInput.blur(); 
    hideEasterEgg();
    closeAbout();
  }
});

// Library prompts
libraryPrompts.forEach(btn => {
  btn.addEventListener('click', () => {
    cmdInput.value = btn.textContent;
    compile();
  });
});

// About Panel
function openAbout() {
  aboutPanel.classList.remove('hidden');
  aboutCloseBtn.focus();
}
function closeAbout() {
  aboutPanel.classList.add('hidden');
}
aboutBtn.addEventListener('click', openAbout);
aboutCloseBtn.addEventListener('click', closeAbout);

function renderCortex(flow, metrics) {
  if (!cortexDiv) return;
  // Clear using createElement
  cortexDiv.innerHTML = '';
  
  const modeLabel = document.createElement('div');
  modeLabel.style.marginBottom = '0.5rem';
  
  let labelText = '[RULE-BASED FALLBACK]';
  let labelColor = 'var(--warning)';
  let metricsText = 'Metrics: n/a (no model in this mode)';
  
  if (metrics.mode === 'LIVE_WEBGPU') {
    labelText = '[LIVE WebGPU]';
    labelColor = 'var(--success)';
    const retryText = metrics.retries > 0 ? ` | Retries: ${metrics.retries}` : '';
    metricsText = `Tokens: ${metrics.tokens} | Time: ${metrics.duration}s | Speed: ${metrics.tokensPerSec} tok/s${retryText}`;
  } else if (metrics.mode === 'LIVE_WASM') {
    labelText = '[LIVE WASM]';
    labelColor = '#60a5fa';
    const retryText = metrics.retries > 0 ? ` | Retries: ${metrics.retries}` : '';
    metricsText = `Tokens: ~${metrics.tokens} | Time: ${metrics.duration}s | Speed: ~${metrics.tokensPerSec} tok/s (Est.)${retryText}`;
  }
  
  modeLabel.style.color = labelColor;
  modeLabel.style.fontWeight = 'bold';
  modeLabel.textContent = labelText;
  
  const metricsDiv = document.createElement('div');
  metricsDiv.style.cssText = 'color:var(--text-muted); margin-bottom:0.5rem; font-size:0.75rem;';
  metricsDiv.textContent = metricsText;
  
  const pre = document.createElement('pre');
  pre.style.color = 'var(--text)';
  pre.textContent = JSON.stringify(flow, null, 2);
  
  cortexDiv.appendChild(modeLabel);
  cortexDiv.appendChild(metricsDiv);
  cortexDiv.appendChild(pre);
}

function updateShareURL() {
  if (!currentFlow) return;
  try {
    const jsonStr = JSON.stringify(currentFlow);
    const encoded = btoa(encodeURIComponent(jsonStr));
    const newUrl = `${window.location.origin}${window.location.pathname}#flow=${encoded}`;
    window.history.replaceState({}, '', newUrl);
  } catch (e) {
    console.warn('Failed to encode flow for share URL', e);
  }
}

// Easter Egg Logic
const eeOverlay = document.getElementById('easter-egg-overlay');
const eeText = document.getElementById('easter-egg-text');
let logoClicks = 0, typedChars = '';

function showEasterEgg() {
  orb.triggerEasterEgg();
  eeOverlay.classList.add('active');
  const msg = "One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.";
  eeText.textContent = ''; 
  let i = 0;
  const interval = setInterval(() => { 
    eeText.textContent += msg.charAt(i); 
    i++; 
    if (i >= msg.length) clearInterval(interval); 
  }, 30);
}
function hideEasterEgg() { 
  orb.hideEasterEgg(); 
  eeOverlay.classList.remove('active'); 
}

document.getElementById('logo')?.addEventListener('click', () => {
  logoClicks++; 
  if (logoClicks === 3) { 
    showEasterEgg(); 
    logoClicks = 0; 
  }
  setTimeout(() => { logoClicks = 0; }, 1000);
});
document.getElementById('ee-trigger')?.addEventListener('click', showEasterEgg);
document.getElementById('ee-trigger')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') showEasterEgg();
});
document.addEventListener('keydown', (e) => {
  if (e.key.length === 1) {
    typedChars += e.key.toLowerCase();
    if (typedChars.includes('gg33')) { 
      showEasterEgg(); 
      typedChars = ''; 
    }
    if (typedChars.length > 10) typedChars = typedChars.slice(-10);
  }
});
