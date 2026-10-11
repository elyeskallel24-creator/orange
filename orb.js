// EASTER EGG: One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.

// GPU-rendered living orb with WebGL2 fallback
export class LivingOrb {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    this.time = 0;
    this.energy = 0;
    this.particles = [];
    this.showEasterEgg = false;
    
    // Initialize 33 particles for easter egg
    for (let i = 0; i < 33; i++) {
      this.particles.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        targetX: 0,
        targetY: 0,
        speed: 0.02 + Math.random() * 0.03
      });
    }
    
    this.initShaders();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }
  
  initShaders() {
    const vsSource = `
      attribute vec4 position;
      void main() {
        gl_Position = position;
      }
    `;
    
    const fsSource = `
      precision highp float;
      uniform float u_time;
      uniform float u_energy;
      uniform bool u_easterEgg;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / vec2(800.0, 800.0);
        vec2 center = uv - 0.5;
        float dist = length(center);
        
        // Orb core with energy pulse
        float pulse = sin(u_time * 3.0 + u_energy * 10.0) * 0.1 + 0.9;
        float orb = smoothstep(0.3 * pulse, 0.25 * pulse, dist);
        
        // Orange glow
        vec3 orange = vec3(1.0, 0.5, 0.0);
        vec3 glow = orange * orb * (1.0 - dist * 2.0);
        
        // Easter egg mode: form "33"
        if (u_easterEgg) {
          float pattern33 = 0.0;
          // Simple particle-based 33 formation
          pattern33 = smoothstep(0.05, 0.0, abs(dist - 0.3));
          glow = mix(glow, vec3(1.0, 0.6, 0.1), pattern33);
        }
        
        gl_FragColor = vec4(glow, orb);
      }
    `;
    
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);
    
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    
    this.positionLocation = this.gl.getAttribLocation(this.program, 'position');
    this.timeLocation = this.gl.getUniformLocation(this.program, 'u_time');
    this.energyLocation = this.gl.getUniformLocation(this.program, 'u_energy');
    this.easterEggLocation = this.gl.getUniformLocation(this.program, 'u_easterEgg');
    
    // Create buffer for fullscreen quad
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), this.gl.STATIC_DRAW);
  }
  
  compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    return shader;
  }
  
  resize() {
    const size = Math.min(window.innerWidth, window.innerHeight, 800);
    this.canvas.width = size;
    this.canvas.height = size;
    this.gl.viewport(0, 0, size, size);
  }
  
  pulse(amount = 0.3) {
    this.energy = Math.min(this.energy + amount, 1.0);
  }
  
  triggerEasterEgg() {
    this.showEasterEgg = true;
    // Animate particles to form "33"
    this.particles.forEach((p, i) => {
      const angle = (i / 33) * Math.PI * 2;
      const radius = 0.3;
      p.targetX = Math.cos(angle) * radius;
      p.targetY = Math.sin(angle) * radius;
    });
  }
  
  hideEasterEgg() {
    this.showEasterEgg = false;
  }
  
  animate() {
    this.time += 0.016;
    this.energy *= 0.95; // Decay
    
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    this.gl.useProgram(this.program);
    this.gl.uniform1f(this.timeLocation, this.time);
    this.gl.uniform1f(this.energyLocation, this.energy);
    this.gl.uniform1i(this.easterEggLocation, this.showEasterEgg ? 1 : 0);
    
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING));
    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    
    requestAnimationFrame(() => this.animate());
  }
}
