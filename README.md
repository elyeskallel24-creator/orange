<!-- EASTER EGG: One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything. -->

# ORANGE
> Describe it. Orange compiles it. Watch it think.

ORANGE is a local-first AI automation studio that lives entirely in a browser tab. No backend, no API keys, no accounts, no bill. 

## Why it's $0
- **No Server**: 100% client-side execution. Hosted freely on GitHub Pages.
- **No API Keys**: Uses on-device LLMs via WebGPU (WebLLM) or WASM fallback (Transformers.js).
- **No Data Exfiltration**: Your prompts and workflow data never leave your machine.

## Safety by Design
ORANGE is an interpreter, not a code executor. 
1. The LLM only outputs a typed JSON DAG (Flow).
2. The Flow is validated against a strict JSON schema.
3. A deterministic runtime executes the Flow using a **closed set** of node types (`trigger`, `http-get`, `llm`, `transform`, `filter`, `branch`, `store`, `notify`, `output`).
4. The engine **NEVER** executes model-written code. Untrusted API data is rendered safely and isolated from execution contexts.

## What This Proves
Production-grade, local-first AI automation is viable today. By combining schema-constrained decoding with on-device inference, we eliminate the latency, cost, and privacy risks of cloud-hosted LLM APIs, proving that complex workflows can be compiled and verified entirely on the user's laptop.

## Architecture
```mermaid
graph TD
    A[User: Natural Language] -->|Ctrl+K| B(Command Palette)
    B -->|postMessage| C[Isolated Engine Frame]
    C -->|WebGPU / WASM| D{WebLLM / Transformers.js}
    D -->|Schema-Constrained JSON| E[Validator + Self-Repair Loop]
    E -->|Valid Flow DAG| F[Deterministic Runtime]
    F -->|Safe Fetch| G[(Untrusted Public APIs)]
    G -->|textContent only| F
    F --> H[Cortex: Live Metrics & DAG]
    
    style C fill:#1a1a1f,stroke:#f97316,stroke-width:2px
    style D fill:#1a1a1f,stroke:#f97316
    style E fill:#1a1a1f,stroke:#f97316
