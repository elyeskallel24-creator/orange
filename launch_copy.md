# Launch Copy

## LinkedIn (Engineering/Professional Focus)
I’ve been building ORANGE: a local-first AI automation studio that runs 100% in your browser tab. 

No backend. No API keys. No data leaves the device. 

You describe an automation in plain language, and an on-device LLM (via WebGPU) compiles it into a typed, verifiable JSON DAG. A deterministic runtime then executes it safely. 

Why? Because cloud-hosted LLM APIs introduce latency, cost, and privacy risks for simple workflows. ORANGE proves that production-grade, local-first AI compilation is viable today. 

Check out the live demo and the architecture breakdown in the repo. 
🔗 [Link to GitHub Pages]
🔗 [Link to GitHub Repo]

#LocalFirst #WebGPU #AI #OpenSource #Privacy

---

## X / Twitter (Punchy, Thread)
I built an AI automation studio that runs 100% on your laptop. 
$0 server cost. 0 API keys. 0 data exfiltration.

Meet ORANGE:
1. Type a prompt (e.g., "fetch weather and summarize")
2. On-device WebGPU LLM compiles it into a JSON DAG
3. Deterministic runtime executes it safely

No model-written code execution. Ever. Safety by design.

Watch it compile in real-time with live token metrics. 
Try it here: [Link]
Repo: [Link]

---

## Hacker News (Show HN)
**Show HN: ORANGE – Local-first AI automation studio (WebGPU, 0 API keys)**

I built ORANGE because I was tired of the latency, cost, and privacy trade-offs of cloud-hosted LLM wrappers for simple automations. 

ORANGE lives entirely in a browser tab. You describe an automation, and an on-device LLM (WebLLM via WebGPU, with WASM fallback) compiles it into a typed, verifiable JSON DAG. A deterministic runtime then executes it.

Key principles:
- **$0 forever**: No backend, no paid APIs. Hosted on GitHub Pages.
- **Safety by design**: The engine interprets a closed set of node types. It NEVER executes model-written code.
- **Honest metrics**: The "Cortex" view shows real tokens/sec, latency, and retry attempts. No fake loading bars.
- **Degrades gracefully**: WebGPU -> WASM -> Rule-based fallback.

I'd love feedback from the HN community on the architecture, the schema-constrained decoding approach, and the UI/UX. 

Live Demo: [Link]
Source Code: [Link]
