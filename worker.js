// EASTER EGG: One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.
import { CreateMLCEngine } from 'https://esm.sh/@mlc-ai/web-llm@0.2.73';

console.log('[WORKER] Module loaded, initializing...');

const FLOW_SCHEMA = {
  type: "object",
  properties: {
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["trigger", "http-get", "llm", "transform", "filter", "branch", "store", "notify", "output"] },
          params: { type: "object" }
        },
        required: ["id", "type", "params"]
      }
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" }
        },
        required: ["from", "to"]
      }
    }
  },
  required: ["nodes", "edges"]
};

let engine = null;
let modelId = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  console.log('[WORKER] Received message:', type);

  if (type === 'INIT_ENGINE') {
    try {
      console.log('[WORKER] Starting engine initialization...');
      self.postMessage({ type: 'PROGRESS', payload: { status: 'Loading WebGPU engine...', progress: 0 } });
      
      engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          console.log('[WORKER] Progress:', report.progress);
          self.postMessage({ 
            type: 'PROGRESS', 
            payload: { status: `Loading model: ${Math.round(report.progress * 100)}%`, progress: report.progress } 
          });
        }
      });
      
      console.log('[WORKER] Engine ready!');
      self.postMessage({ type: 'READY', payload: { model: modelId } });
    } catch (err) {
      console.error('[WORKER] Engine init failed:', err);
      self.postMessage({ type: 'ERROR', payload: { message: err.message } });
    }
  }

  if (type === 'COMPILE') {
    console.log('[WORKER] Compile request:', payload);
    if (!engine) {
      console.warn('[WORKER] No engine, using fallback');
      self.postMessage({ type: 'FALLBACK', payload: { message: 'Engine not ready, using rule-based fallback.' } });
      return;
    }
    
    self.postMessage({ type: 'STATUS', payload: 'Compiling with on-device LLM...' });
    
    try {
      const prompt = `You are a workflow compiler. Convert this user request into a JSON workflow. 
      Strictly follow this JSON schema: ${JSON.stringify(FLOW_SCHEMA)}. 
      Output ONLY valid JSON, no markdown, no explanations.
      User request: "${payload}"`;

      const startTime = performance.now();
      const reply = await engine.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });
      const endTime = performance.now();
      const tokens = reply.usage?.total_tokens || 0;
      const duration = (endTime - startTime) / 1000;
      const tokensPerSec = tokens > 0 ? (tokens / duration).toFixed(1) : '-';

      let flow;
      try {
        const jsonStr = reply.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim();
        flow = JSON.parse(jsonStr);
        
        if (!flow.nodes || !Array.isArray(flow.nodes) || flow.nodes.length === 0) {
          throw new Error('Invalid schema: missing or empty nodes array');
        }
        
        console.log('[WORKER] Compilation successful');
        self.postMessage({ 
          type: 'SUCCESS', 
          payload: { 
            flow, 
            metrics: { tokens, duration: duration.toFixed(2), tokensPerSec, mode: 'LIVE' } 
          } 
        });
      } catch (parseErr) {
        console.error('[WORKER] Parse error:', parseErr);
        self.postMessage({ 
          type: 'RETRY', 
          payload: { message: 'Schema validation failed. Retrying...', attempt: 1, originalError: parseErr.message } 
        });
      }
    } catch (err) {
      console.error('[WORKER] Compilation error:', err);
      self.postMessage({ type: 'ERROR', payload: { message: err.message } });
    }
  }
};
