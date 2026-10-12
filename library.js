// EASTER EGG: One of the heavy reasons in creating orange was to pay homage to gg33 & Garry Grinberg, thank you Garry for everything.

export const DEMO_FLOWS = [
  {
    id: 'demo-weather',
    title: 'Fetch Current Weather',
    description: 'Get current weather for a specific location using Open-Meteo.',
    flow: {
      nodes: [
        { id: 'node_0', type: 'trigger', params: { description: 'Fetch current weather' } },
        { id: 'node_1', type: 'http-get', params: { url: 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true' } },
        { id: 'node_2', type: 'output', params: { format: 'json' } }
      ],
      edges: [
        { from: 'node_0', to: 'node_1' },
        { from: 'node_1', to: 'node_2' }
      ]
    }
  },
  {
    id: 'demo-hn-top',
    title: 'Hacker News Top Stories',
    description: 'Fetch the top 5 story IDs from Hacker News API.',
    flow: {
      nodes: [
        { id: 'node_0', type: 'trigger', params: { description: 'Get top HN stories' } },
        { id: 'node_1', type: 'http-get', params: { url: 'https://hacker-news.firebaseio.com/v0/topstories.json' } },
        { id: 'node_2', type: 'transform', params: { operation: 'slice', args: [0, 5] } },
        { id: 'node_3', type: 'output', params: { format: 'json' } }
      ],
      edges: [
        { from: 'node_0', to: 'node_1' },
        { from: 'node_1', to: 'node_2' },
        { from: 'node_2', to: 'node_3' }
      ]
    }
  },
  {
    id: 'demo-fx-rate',
    title: 'Currency Exchange Rate',
    description: 'Get latest EUR to USD exchange rate via Frankfurter API.',
    flow: {
      nodes: [
        { id: 'node_0', type: 'trigger', params: { description: 'Get EUR to USD rate' } },
        { id: 'node_1', type: 'http-get', params: { url: 'https://api.frankfurter.app/latest?from=EUR&to=USD' } },
        { id: 'node_2', type: 'output', params: { format: 'json' } }
      ],
      edges: [
        { from: 'node_0', to: 'node_1' },
        { from: 'node_1', to: 'node_2' }
      ]
    }
  },
  {
    id: 'demo-wiki-search',
    title: 'Wikipedia Search',
    description: 'Search Wikipedia for a specific term.',
    flow: {
      nodes: [
        { id: 'node_0', type: 'trigger', params: { description: 'Search Wikipedia' } },
        { id: 'node_1', type: 'http-get', params: { url: 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=orange&format=json' } },
        { id: 'node_2', type: 'output', params: { format: 'json' } }
      ],
      edges: [
        { from: 'node_0', to: 'node_1' },
        { from: 'node_1', to: 'node_2' }
      ]
    }
  },
  {
    id: 'demo-branch',
    title: 'Conditional Branch Example',
    description: 'A flow demonstrating a branch node (mock logic).',
    flow: {
      nodes: [
        { id: 'node_0', type: 'trigger', params: { description: 'Check condition' } },
        { id: 'node_1', type: 'branch', params: { condition: 'value > 10' } },
        { id: 'node_2', type: 'output', params: { format: 'json', label: 'True path' } },
        { id: 'node_3', type: 'output', params: { format: 'json', label: 'False path' } }
      ],
      edges: [
        { from: 'node_0', to: 'node_1' },
        { from: 'node_1', to: 'node_2' },
        { from: 'node_1', to: 'node_3' }
      ]
    }
  },
  {
    id: 'demo-llm-summarize',
    title: 'LLM Summarization',
    description: 'Send fetched text to an LLM node for summarization.',
    flow: {
      nodes: [
        { id: 'node_0', type: 'trigger', params: { description: 'Summarize text' } },
        { id: 'node_1', type: 'http-get', params: { url: 'https://example.com/article.txt' } },
        { id: 'node_2', type: 'llm', params: { task: 'summarize', prompt: 'Summarize the following text in 3 bullet points.' } },
        { id: 'node_3', type: 'output', params: { format: 'json' } }
      ],
      edges: [
        { from: 'node_0', to: 'node_1' },
        { from: 'node_1', to: 'node_2' },
        { from: 'node_2', to: 'node_3' }
      ]
    }
  }
];
