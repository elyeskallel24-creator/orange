// EASTER EGG: One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.

export function compileToFlow(naturalLanguage) {
  const text = naturalLanguage.toLowerCase();
  const flow = { nodes: [], edges: [] };
  let nodeId = 0;
  
  flow.nodes.push({ id: `node_${nodeId++}`, type: 'trigger', params: { description: naturalLanguage } });
  
  if (text.includes('fetch') || text.includes('get') || text.includes('api') || text.includes('weather')) {
    const url = text.match(/https?:\/\/[^\s]+/g)?.[0] || 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true';
    flow.nodes.push({ id: `node_${nodeId++}`, type: 'http-get', params: { url } });
    flow.edges.push({ from: 'node_0', to: `node_${flow.nodes.length - 1}` });
  }
  
  if (text.includes('summarize') || text.includes('analyze') || text.includes('extract')) {
    const lastNode = flow.edges.length > 0 ? flow.edges[flow.edges.length - 1].to : 'node_0';
    flow.nodes.push({ id: `node_${nodeId++}`, type: 'llm', params: { task: text.includes('summarize') ? 'summarize' : 'extract', prompt: 'Process the data' } });
    flow.edges.push({ from: lastNode, to: `node_${flow.nodes.length - 1}` });
  }
  
  if (text.includes('transform') || text.includes('convert') || text.includes('format')) {
    const lastNode = flow.edges.length > 0 ? flow.edges[flow.edges.length - 1].to : 'node_0';
    flow.nodes.push({ id: `node_${nodeId++}`, type: 'transform', params: { operation: 'format' } });
    flow.edges.push({ from: lastNode, to: `node_${flow.nodes.length - 1}` });
  }
  
  const lastNode = flow.edges.length > 0 ? flow.edges[flow.edges.length - 1].to : 'node_0';
  flow.nodes.push({ id: `node_${nodeId++}`, type: 'output', params: { format: 'json' } });
  flow.edges.push({ from: lastNode, to: `node_${flow.nodes.length - 1}` });
  
  return flow;
}

export function validateFlow(flow) {
  const errors = [];
  if (!flow.nodes || flow.nodes.length === 0) errors.push('Flow must have at least one node');
  if (!flow.nodes[0] || flow.nodes[0].type !== 'trigger') errors.push('Flow must start with a trigger node');
  return errors;
}

export function repairFlow(flow, errors) {
  if (errors.some(e => e.includes('trigger'))) {
    flow.nodes.unshift({ id: 'node_trigger', type: 'trigger', params: { description: 'Auto-generated trigger' } });
  }
  return flow;
}
