// EASTER EGG: One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.

// Closed node set - interprets data, never executes model-written code
const SUPPORTED_NODES = ['trigger', 'http-get', 'transform', 'filter', 'output'];

// Keyless CORS-enabled APIs only
const API_ENDPOINTS = {
  'open-meteo': 'https://api.open-meteo.com/v1/forecast',
  'hacker-news': 'https://hacker-news.firebaseio.com/v0',
  'frankfurter': 'https://api.frankfurter.app/latest',
  'wikipedia': 'https://en.wikipedia.org/w/api.php'
};

export async function runFlow(flow) {
  if (!flow || !flow.nodes) {
    throw new Error('Invalid flow: missing nodes');
  }

  const results = {
    nodes: [],
    edges: [],
    totalLatency: 0,
    errors: []
  };

  let context = {}; // Data passed between nodes

  for (let i = 0; i < flow.nodes.length; i++) {
    const node = flow.nodes[i];
    const startTime = performance.now();

    if (!SUPPORTED_NODES.includes(node.type)) {
      results.nodes.push({
        id: node.id,
        type: node.type,
        status: 'NOT_IMPLEMENTED',
        latency: 0,
        data: null
      });
      results.errors.push(`Node ${node.id} (${node.type}) is not implemented`);
      continue;
    }

    try {
      let nodeResult;
      switch (node.type) {
        case 'trigger':
          nodeResult = { status: 'ok', data: node.params };
          break;

        case 'http-get':
          nodeResult = await executeHttpGet(node.params);
          break;

        case 'transform':
          nodeResult = executeTransform(node.params, context);
          break;

        case 'filter':
          nodeResult = executeFilter(node.params, context);
          break;

        case 'output':
          nodeResult = { status: 'ok', data: context };
          break;

        default:
          nodeResult = { status: 'error', error: 'Unknown node type' };
      }

      const latency = performance.now() - startTime;
      results.nodes.push({
        id: node.id,
        type: node.type,
        status: nodeResult.status,
        latency: Math.round(latency),
        data: nodeResult.data,
        error: nodeResult.error
      });

      if (nodeResult.data) {
        context[node.id] = nodeResult.data;
      }

      if (nodeResult.error) {
        results.errors.push(`Node ${node.id}: ${nodeResult.error}`);
      }
    } catch (err) {
      const latency = performance.now() - startTime;
      results.nodes.push({
        id: node.id,
        type: node.type,
        status: 'error',
        latency: Math.round(latency),
        error: err.message
      });
      results.errors.push(`Node ${node.id}: ${err.message}`);
    }
  }

  results.totalLatency = results.nodes.reduce((sum, n) => sum + n.latency, 0);
  return results;
}

async function executeHttpGet(params) {
  if (!params.url) {
    return { status: 'error', error: 'Missing URL parameter' };
  }

  // Verify URL is a keyless public API
  const isAllowed = Object.values(API_ENDPOINTS).some(endpoint => 
    params.url.startsWith(endpoint)
  );

  if (!isAllowed) {
    return { 
      status: 'error', 
      error: 'URL not in allowed keyless API list. Use Open-Meteo, Hacker News, Frankfurter, or Wikipedia.' 
    };
  }

  try {
    const response = await fetch(params.url);
    const data = await response.json();
    return { 
      status: response.ok ? 'ok' : 'error', 
      data,
      statusCode: response.status
    };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

function executeTransform(params, context) {
  if (!params.operation) {
    return { status: 'error', error: 'Missing operation parameter' };
  }
  // Transform operations would go here (slice, map, etc.)
  return { status: 'ok', data: context };
}

function executeFilter(params, context) {
  if (!params.condition) {
    return { status: 'error', error: 'Missing condition parameter' };
  }
  // Filter operations would go here
  return { status: 'ok', data: context };
}
