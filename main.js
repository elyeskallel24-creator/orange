// EASTER EGG: One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.
import { compileToFlow } from './compiler.js';
import { DEMO_FLOWS } from './library.js';
import { runFlow } from './runtime.js';

console.log('%cORANGE', 'color: orange; font-size: 2rem; font-weight: bold;');
console.log('%cmade with love by Elyes Kallel with the spirit of BXB', 'color: #ccc;');

const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const statusDiv = document.getElementById('status');
const cmdInput = document.getElementById('cmd-input');
const compileBtn = document.getElementById('compile-btn');
const cmdBtn = document.getElementById('cmd-btn');
const aboutBtn = document.getElementById('about-btn');
const aboutPanel = document.getElementById('about-panel');
const aboutCloseBtn = document.getElementById('about-close-btn');
const modeChip = document.getElementById('mode-chip');
const exampleFlow = document.getElementById('example-flow');
const libraryChips = document.querySelectorAll('.chip');

// Rail readouts
const railModel = document.getElementById('rail-model');
const railGen = document.getElementById('rail-gen');
const railVal = document.getElementById('rail-val');
const railRun = document.getElementById('rail-run');

// V2: Node Pipeline
const stageContent = document.getElementById('stage-content');
const flowOrderedList = document.getElementById('flow-ordered-list');

// V3: Run Engine
const runBtn = document.getElementById('run-btn');
const resultsTray = document.getElementById('results-tray');
const resultsContent = document.getElementById('results-content');
const resultsClose = document.getElementById('results-close');
const inspectorDrawer = document.getElementById('inspector-drawer');

// V4: Command Palette & Token Tape
const cmdPaletteOverlay = document.getElementById('cmd-palette-overlay');
const cmdPaletteInput = document.getElementById('cmd-palette-input');
const cmdPaletteList = document.getElementById('cmd-palette-list');
const tokenTape = document.getElementById('token-tape');

let isRunning = false;
let runResults = null;
let isCmdPaletteOpen = false;

const NODE_GLYPHS = {
  trigger: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'http-get': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  output: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  transform: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  branch: '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  llm: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>',
  store: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  notify: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'
};

// Initialize Lens Orb (40px, render on-demand)
class LivingOrb {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    this.time = 0; 
    this.energy = 0; 
    this.progress = 0;
    this.state = 0; // 0=idle, 1=loading, 2=generating, 3=error
    this.showEasterEgg = false; 
    this.animationId = null;
    if (!this.gl) { 
      console.warn('WebGL not supported'); 
      return; 
    }
    this.initShaders(); 
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startAnimation();
  }
  initShaders() {
    const vs = `attribute vec4 position; void main() { gl_Position = position; }`;
    const fs = `precision highp float; 
      uniform float u_time; 
      uniform float u_energy; 
      uniform float u_progress;
      uniform int u_state;
      uniform bool u_easterEgg;
      void main() {
        vec2 uv = gl_FragCoord.xy / vec2(40.0, 40.0); 
        vec2 center = uv - 0.5; 
        float dist = length(center);
        float angle = atan(center.y, center.x);
        float normalizedAngle = (angle + 3.14159) / (2.0 * 3.14159);
        float ring = 0.0;
        
        if (u_state == 0) { // idle
          ring = smoothstep(0.45, 0.4, dist) - smoothstep(0.4, 0.35, dist);
        } else if (u_state == 1) { // loading
          float arc = step(normalizedAngle, u_progress);
          ring = (smoothstep(0.45, 0.4, dist) - smoothstep(0.4, 0.35, dist)) * arc;
        } else if (u_state == 2) { // generating
          float pulse = sin(u_time * (3.0 + u_energy * 10.0)) * 0.1 + 0.9;
          ring = smoothstep(0.45 * pulse, 0.4 * pulse, dist) - smoothstep(0.4 * pulse, 0.35 * pulse, dist);
        } else if (u_state == 3) { // error
          float gap = step(0.4, abs(normalizedAngle - 0.75));
          ring = (smoothstep(0.45, 0.4, dist) - smoothstep(0.4, 0.35, dist)) * gap;
        }
        
        vec3 glow = vec3(1.0, 0.5, 0.0) * ring;
        if (u_easterEgg) glow = mix(glow, vec3(1.0, 0.6, 0.1), smoothstep(0.05, 0.0, abs(dist - 0.3)));
        gl_FragColor = vec4(glow, ring);
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
    this.progressLoc = this.gl.getUniformLocation(this.program, 'u_progress');
    this.stateLoc = this.gl.getUniformLocation(this.program, 'u_state');
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
    this.canvas.width = 40; 
    this.canvas.height = 40; 
    this.gl.viewport(0, 0, 40, 40); 
  }
  setState(state, value = 0) {
    this.state = state;
    this.progress = value;
    this.startAnimation();
  }
  pulse(amt = 0.3) { 
    this.energy = Math.min(this.energy + amt, 1.0); 
    this.state = 2; // generating
  }
  setIdle() { 
    this.state = 0; 
    this.energy = 0;
    this.progress = 0;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  startAnimation() {
    if (this.animationId) return;
    this.animate();
  }
  animate() {
    if (!this.gl) return; 
    if (this.state === 0) this.energy *= 0.95;
    this.time += 0.016;
    this.gl.clearColor(0,0,0,0); 
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.program);
    this.gl.uniform1f(this.timeLoc, this.time); 
    this.gl.uniform1f(this.energyLoc, this.energy);
    this.gl.uniform1f(this.progressLoc, this.progress);
    this.gl.uniform1i(this.stateLoc, this.state);
    this.gl.uniform1i(this.eeLoc, this.showEasterEgg ? 1 : 0);
    this.gl.enableVertexAttribArray(this.posLoc);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING));
    this.gl.vertexAttribPointer(this.posLoc, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  triggerEasterEgg() { this.showEasterEgg = true; this.startAnimation(); }
  hideEasterEgg() { this.showEasterEgg = false; this.setIdle(); }
}

const lensCanvas = document.getElementById('lens-canvas');
const orb = new LivingOrb(lensCanvas);

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
    if (!loadingScreen.classList.contains('hidden')) {
      loadingProgress.textContent = payload.status;
      const match = payload.status.match(/(\d+)%/);
      if (match) orb.setState(1, parseInt(match[1]) / 100);
    } else {
      statusDiv.textContent = payload.status;
    }
    orb.pulse(0.1);
  } else if (type === 'READY') {
    currentMode = payload.mode;
    modeChip.textContent = payload.mode === 'LIVE_WEBGPU' ? 'LIVE WebGPU' : 'LIVE WASM';
    modeChip.setAttribute('data-mode', payload.mode);
    railModel.textContent = payload.model;
    railModel.classList.remove('empty');
    statusDiv.textContent = 'Ready.';
    loadingScreen.classList.add('hidden');
    orb.setIdle();
  } else if (type === 'STATUS') {
    statusDiv.textContent = payload;
    orb.pulse(0.8);
  } else if (type === 'SUCCESS') {
    currentFlow = payload.flow;
    updateRailMetrics(payload.metrics, 'success');
    statusDiv.textContent = `Compiled (${payload.metrics.tokensPerSec} tok/s).`;
    orb.setIdle();
    cmdInput.value = '';
    renderFlow(payload.flow);
    showValidationOk();
    runBtn.style.display = 'inline-flex';
    updateShareURL();
  } else if (type === 'RETRY') {
    statusDiv.textContent = payload.message;
    railVal.textContent = `Retry ${payload.attempt}/2: ${payload.originalError}`;
    railVal.classList.remove('empty');
    showValidationFail(payload.originalError, payload.attempt);
    orb.setState(3);
  } else if (type === 'FALLBACK' || type === 'ERROR') {
    currentMode = 'FALLBACK';
    modeChip.textContent = 'FALLBACK';
    modeChip.setAttribute('data-mode', 'FALLBACK');
    statusDiv.textContent = type === 'FALLBACK' ? payload.message : 'Error.';
    currentFlow = compileToFlow(cmdInput.value || 'default fallback flow');
    updateRailMetrics({ mode: 'FALLBACK', tokens: '-', duration: '0.01', tokensPerSec: '-' }, 'fallback');
    renderFlow(currentFlow);
    showValidationFail('rule-based fallback', 0);
    orb.setState(3);
    cmdInput.value = '';
    updateShareURL();
    loadingScreen.classList.add('hidden');
  }
});

function updateRailMetrics(metrics, state) {
  if (state === 'success') {
    railGen.textContent = `${metrics.tokens} tok | ${metrics.duration}s | ${metrics.tokensPerSec} tok/s`;
    railGen.classList.remove('empty');
    railVal.textContent = 'schema-valid ✓';
    railVal.classList.remove('empty');
  } else {
    railGen.textContent = 'not measured';
    railGen.classList.add('empty');
    railVal.textContent = 'rule-based fallback';
    railVal.classList.remove('empty');
  }
}

function clearStage() {
  const nodes = stageContent.querySelectorAll('.node, .edge-svg, .validation-msg');
  nodes.forEach(n => n.remove());
  flowOrderedList.innerHTML = '';
}

function renderFlow(flow) {
  if (!flow || !flow.nodes) return;
  clearStage();
  exampleFlow.style.display = 'none';

  flow.nodes.forEach((node, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${node.type}: ${node.id}`;
    flowOrderedList.appendChild(li);
  });

  flow.nodes.forEach((node, i) => {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'node node--undeveloped';
    nodeEl.dataset.nodeId = node.id;
    nodeEl.setAttribute('role', 'listitem');
    nodeEl.setAttribute('aria-label', `${node.type} node: ${node.id}`);

    const glyphSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    glyphSVG.setAttribute('class', 'node-glyph');
    glyphSVG.setAttribute('viewBox', '0 0 24 24');
    glyphSVG.setAttribute('fill', 'none');
    glyphSVG.setAttribute('stroke', 'currentColor');
    glyphSVG.setAttribute('stroke-width', '1.5');
    glyphSVG.setAttribute('stroke-linecap', 'round');
    glyphSVG.setAttribute('stroke-linejoin', 'round');
    const glyphPath = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    glyphPath.innerHTML = NODE_GLYPHS[node.type] || NODE_GLYPHS.trigger;
    glyphSVG.appendChild(glyphPath);

    const nameEl = document.createElement('span');
    nameEl.className = 'node-name';
    nameEl.textContent = node.id;

    const typeEl = document.createElement('span');
    typeEl.className = 'node-type';
    typeEl.textContent = node.type.toUpperCase();

    const statusEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    statusEl.setAttribute('class', 'node-status');
    statusEl.setAttribute('viewBox', '0 0 24 24');
    statusEl.setAttribute('fill', 'none');
    statusEl.setAttribute('stroke', 'currentColor');
    statusEl.setAttribute('stroke-width', '2');

    nodeEl.appendChild(glyphSVG);
    nodeEl.appendChild(nameEl);
    nodeEl.appendChild(typeEl);
    nodeEl.appendChild(statusEl);
    stageContent.appendChild(nodeEl);
  });

  if (flow.edges) {
    flow.edges.forEach(edge => {
      const edgeSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      edgeSVG.setAttribute('class', 'edge-svg');
      edgeSVG.style.cssText = 'position:static;width:80px;height:2px;align-self:center;';
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'edge-line');
      line.setAttribute('x1', '0');
      line.setAttribute('y1', '1');
      line.setAttribute('x2', '80');
      line.setAttribute('y2', '1');
      edgeSVG.appendChild(line);
      stageContent.appendChild(edgeSVG);
    });
  }

  requestAnimationFrame(() => {
    developNodes(flow);
  });
}

function developNodes(flow) {
  const nodes = stageContent.querySelectorAll('.node');
  nodes.forEach((nodeEl, i) => {
    setTimeout(() => {
      nodeEl.classList.remove('node--undeveloped');
      nodeEl.classList.add('node--developing');
      setTimeout(() => {
        nodeEl.classList.remove('node--developing');
        nodeEl.classList.add('node--developed');
        const edges = stageContent.querySelectorAll('.edge-line');
        if (edges[i]) edges[i].classList.add('edge-line--drawn');
      }, 220);
    }, i * 120);
  });
}

function showValidationFail(message, retryCount) {
  const nodes = stageContent.querySelectorAll('.node');
  nodes.forEach(n => {
    n.classList.remove('node--developing', 'node--developed');
    n.classList.add('node--failed');
  });
  const existing = stageContent.querySelector('.validation-msg');
  if (existing) existing.remove();
  const msg = document.createElement('div');
  msg.className = 'validation-msg';
  msg.textContent = `✗ ${message} (retry ${retryCount}/2)`;
  stageContent.appendChild(msg);
}

function showValidationOk() {
  const msg = stageContent.querySelector('.validation-msg');
  if (msg) {
    msg.textContent = '✓ schema-valid';
    msg.classList.add('validation-msg--ok');
  }
}

// === V3: Run Engine ===
runBtn.addEventListener('click', executeFlow);
resultsClose.addEventListener('click', () => {
  resultsTray.classList.remove('results-tray--visible');
});

async function executeFlow() {
  if (!currentFlow || isRunning) return;
  isRunning = true;
  runBtn.disabled = true;
  runBtn.textContent = 'Running...';
  railRun.textContent = 'executing...';
  railRun.classList.remove('empty');

  const nodes = stageContent.querySelectorAll('.node');
  const latencyTimers = [];
  nodes.forEach((nodeEl, i) => {
    const timer = document.createElement('div');
    timer.className = 'node-latency node-latency--running';
    timer.textContent = '0ms';
    nodeEl.appendChild(timer);
    latencyTimers.push({ el: timer, start: performance.now() });
  });

  const timerInterval = setInterval(() => {
    latencyTimers.forEach(({ el, start }) => {
      el.textContent = `${Math.round(performance.now() - start)}ms`;
    });
  }, 50);

  try {
    runResults = await runFlow(currentFlow);
    clearInterval(timerInterval);
    
    latencyTimers.forEach(({ el }, i) => {
      if (runResults.nodes[i]) {
        el.textContent = `${runResults.nodes[i].latency}ms`;
        el.classList.remove('node-latency--running');
      }
    });

    renderResults(runResults);
    resultsTray.classList.add('results-tray--visible');
    
    railRun.textContent = `${runResults.totalLatency}ms total`;
    railRun.classList.remove('empty');

    animateEdgeDots();
  } catch (err) {
    clearInterval(timerInterval);
    railRun.textContent = `error: ${err.message}`;
  } finally {
    isRunning = false;
    runBtn.disabled = false;
    runBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run';
  }
}

function renderResults(results) {
  resultsContent.innerHTML = '';
  results.nodes.forEach(node => {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'results-node';
    
    const header = document.createElement('div');
    header.className = 'results-node-header';
    
    const id = document.createElement('div');
    id.className = 'results-node-id';
    id.textContent = node.id;
    
    const latency = document.createElement('div');
    latency.className = 'results-node-latency';
    latency.textContent = `${node.latency}ms`;
    
    const status = document.createElement('div');
    status.className = `results-node-status results-node-status--${node.status}`;
    status.textContent = node.status;
    
    header.appendChild(id);
    header.appendChild(latency);
    header.appendChild(status);
    nodeDiv.appendChild(header);

    if (node.data) {
      const data = document.createElement('div');
      data.className = 'results-node-data';
      data.textContent = typeof node.data === 'object' 
        ? JSON.stringify(node.data, null, 2) 
        : node.data;
      nodeDiv.appendChild(data);
    }

    if (node.error) {
      const error = document.createElement('div');
      error.className = 'results-node-data';
      error.style.color = 'var(--error)';
      error.textContent = node.error;
      nodeDiv.appendChild(error);
    }

    resultsContent.appendChild(nodeDiv);
  });
}

function animateEdgeDots() {
  const edges = stageContent.querySelectorAll('.edge-svg');
  edges.forEach(edge => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', 'edge-dot edge-dot--active');
    dot.setAttribute('cx', '0');
    dot.setAttribute('cy', '1');
    edge.appendChild(dot);
    setTimeout(() => { dot.remove(); }, 1000);
  });
}

// Node click for Inspector
stageContent.addEventListener('click', (e) => {
  const nodeEl = e.target.closest('.node');
  if (!nodeEl || !runResults) return;
  
  const nodeId = nodeEl.dataset.nodeId;
  const nodeResult = runResults.nodes.find(n => n.id === nodeId);
  if (!nodeResult) return;

  document.getElementById('inspector-node-id').textContent = nodeResult.id;
  document.getElementById('inspector-node-type').textContent = nodeResult.type;
  document.getElementById('inspector-prompt-phrase').textContent = 'N/A (not tracked yet)';
  document.getElementById('inspector-validator-status').textContent = 'schema-valid ✓';
  document.getElementById('inspector-source-url').textContent = nodeResult.data?.url || 'N/A';
  document.getElementById('inspector-timestamp').textContent = new Date().toISOString();
  document.getElementById('inspector-latency').textContent = `${nodeResult.latency}ms`;

  inspectorDrawer.classList.add('inspector-drawer--visible');
});

document.addEventListener('click', (e) => {
  if (!inspectorDrawer.contains(e.target) && !e.target.closest('.node')) {
    inspectorDrawer.classList.remove('inspector-drawer--visible');
  }
});

// === V4: Command Palette & Token Tape ===
const cmdActions = [
  { label: 'Compile current prompt', shortcut: 'Enter', action: () => { closeCmdPalette(); compile(); } },
  { label: 'Run current flow', shortcut: '', action: () => { closeCmdPalette(); executeFlow(); } },
  { label: 'Load: Fetch weather', shortcut: '', action: () => { closeCmdPalette(); cmdInput.value = 'Fetch current weather'; compile(); } },
  { label: 'Load: HN top stories', shortcut: '', action: () => { closeCmdPalette(); cmdInput.value = 'Get top Hacker News stories'; compile(); } },
  { label: 'Load: EUR/USD rate', shortcut: '', action: () => { closeCmdPalette(); cmdInput.value = 'Get EUR to USD exchange rate'; compile(); } },
  { label: 'Export Run Record', shortcut: '', action: () => { closeCmdPalette(); exportRunRecord(); } },
  { label: 'Open About', shortcut: '', action: () => { closeCmdPalette(); openAbout(); } }
];

function openCmdPalette() {
  isCmdPaletteOpen = true;
  cmdPaletteOverlay.classList.add('cmd-palette-overlay--visible');
  cmdPaletteInput.value = '';
  cmdPaletteInput.focus();
  renderCmdPaletteList('');
}

function closeCmdPalette() {
  isCmdPaletteOpen = false;
  cmdPaletteOverlay.classList.remove('cmd-palette-overlay--visible');
}

function renderCmdPaletteList(filter) {
  cmdPaletteList.innerHTML = '';
  const filtered = cmdActions.filter(a => a.label.toLowerCase().includes(filter.toLowerCase()));
  filtered.forEach((action, index) => {
    const li = document.createElement('li');
    li.className = 'cmd-palette-item' + (index === 0 ? ' cmd-palette-item--active' : '');
    li.setAttribute('role', 'option');
    li.innerHTML = `<span>${action.label}</span>${action.shortcut ? `<span class="cmd-palette-shortcut">${action.shortcut}</span>` : ''}`;
    li.addEventListener('click', action.action);
    cmdPaletteList.appendChild(li);
  });
}

cmdPaletteInput.addEventListener('input', (e) => {
  renderCmdPaletteList(e.target.value);
});

cmdPaletteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCmdPalette();
  } else if (e.key === 'Enter') {
    const active = cmdPaletteList.querySelector('.cmd-palette-item--active');
    if (active) active.click();
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const items = Array.from(cmdPaletteList.querySelectorAll('.cmd-palette-item'));
    const current = items.findIndex(i => i.classList.contains('cmd-palette-item--active'));
    let next = current;
    if (e.key === 'ArrowDown') next = (current + 1) % items.length;
    else next = (current - 1 + items.length) % items.length;
    items.forEach(i => i.classList.remove('cmd-palette-item--active'));
    items[next].classList.add('cmd-palette-item--active');
  }
});

function exportRunRecord() {
  if (!runResults) {
    statusDiv.textContent = 'No run record to export.';
    return;
  }
  const record = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mode: currentMode,
    flow: currentFlow,
    results: runResults
  };
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orange-run-record-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  statusDiv.textContent = 'Run Record exported.';
}

let tapeInterval;
function startTokenTape(text) {
  tokenTape.classList.add('token-tape--visible');
  tokenTape.innerHTML = '<span class="token-tape-cursor"></span>';
  let i = 0;
  tapeInterval = setInterval(() => {
    if (i < text.length) {
      tokenTape.innerHTML = text.substring(0, i + 1) + '<span class="token-tape-cursor"></span>';
      tokenTape.scrollTop = tokenTape.scrollHeight;
      i++;
    } else {
      clearInterval(tapeInterval);
      tokenTape.innerHTML = text;
    }
  }, 10);
}

function stopTokenTape() {
  clearInterval(tapeInterval);
  tokenTape.classList.remove('token-tape--visible');
  tokenTape.innerHTML = '';
}

function compile() {
  const prompt = cmdInput.value.trim();
  if (!prompt) {
    statusDiv.textContent = 'Enter a prompt.';
    cmdInput.focus();
    return;
  }
  orb.setState(2);
  railGen.textContent = 'compiling...';
  railGen.classList.remove('empty');
  
  startTokenTape('{"nodes": [{"id": "node_0", "type": "trigger"... compiling...}');
  
  engineFrame.contentWindow.postMessage({ type: 'COMPILE', payload: prompt }, '*');
}

compileBtn.addEventListener('click', compile);
cmdBtn.addEventListener('click', openCmdPalette);
cmdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') compile(); });

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { 
    e.preventDefault(); 
    if (isCmdPaletteOpen) closeCmdPalette();
    else openCmdPalette();
  }
  if (e.key === 'Escape') { 
    cmdInput.blur(); 
    closeCmdPalette();
    hideEasterEgg(); 
    closeAbout(); 
  }
});

libraryChips.forEach(chip => {
  chip.addEventListener('click', () => {
    cmdInput.value = chip.dataset.prompt;
    compile();
  });
});

exampleFlow.addEventListener('click', () => {
  const weatherFlow = DEMO_FLOWS.find(f => f.id === 'demo-weather');
  if (weatherFlow) {
    currentFlow = weatherFlow.flow;
    cmdInput.value = weatherFlow.description;
    updateRailMetrics({ mode: 'REPLAY', tokens: '-', duration: '-', tokensPerSec: '-' }, 'fallback');
    railModel.textContent = 'Library Example';
    exampleFlow.style.display = 'none';
    renderFlow(currentFlow);
    updateShareURL();
  }
});
exampleFlow.addEventListener('keypress', (e) => { if (e.key === 'Enter') exampleFlow.click(); });

function openAbout() { aboutPanel.classList.remove('hidden'); aboutCloseBtn.focus(); }
function closeAbout() { aboutPanel.classList.add('hidden'); }
aboutBtn.addEventListener('click', openAbout);
aboutCloseBtn.addEventListener('click', closeAbout);

function updateShareURL() {
  if (!currentFlow) return;
  try {
    const jsonStr = JSON.stringify(currentFlow);
    const encoded = btoa(encodeURIComponent(jsonStr));
    window.history.replaceState({}, '', `${window.location.origin}${window.location.pathname}#flow=${encoded}`);
  } catch (e) { console.warn('Share URL encode failed', e); }
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
function hideEasterEgg() { orb.hideEasterEgg(); eeOverlay.classList.remove('active'); }

document.getElementById('logo').addEventListener('click', () => {
  logoClicks++; 
  if (logoClicks === 3) { showEasterEgg(); logoClicks = 0; }
  setTimeout(() => { logoClicks = 0; }, 1000);
});
document.getElementById('ee-trigger').addEventListener('click', showEasterEgg);
document.getElementById('ee-trigger').addEventListener('keypress', (e) => { if (e.key === 'Enter') showEasterEgg(); });
document.addEventListener('keydown', (e) => {
  if (e.key.length === 1) {
    typedChars += e.key.toLowerCase();
    if (typedChars.includes('gg33')) { showEasterEgg(); typedChars = ''; }
    if (typedChars.length > 10) typedChars = typedChars.slice(-10);
  }
});

// === V4: Global Function Exports ===
window.openCmdPalette = openCmdPalette;
window.closeCmdPalette = closeCmdPalette;
window.startTokenTape = startTokenTape;
window.stopTokenTape = stopTokenTape;
window.exportRunRecord = exportRunRecord;
window.orb = orb;
window.runResults = runResults;
window.currentFlow = currentFlow;
window.currentMode = currentMode;
