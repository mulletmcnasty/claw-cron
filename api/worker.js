/**
 * claw-cron API Worker
 * Stores and serves cron job state for the dashboard
 * 
 * Deploy to Cloudflare Workers with a KV namespace bound as CRON_STATE
 * Or use the in-memory fallback for simple deployments
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
};

// In-memory fallback if no KV (will reset on cold start)
let memoryState = null;

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // GET /state - Return current cron state
    if (path === '/state' && request.method === 'GET') {
      let state;
      
      if (env.CRON_STATE) {
        state = await env.CRON_STATE.get('jobs', 'json');
      } else {
        state = memoryState;
      }

      if (!state) {
        return jsonResponse({ jobs: [], error: 'No state available' }, 404);
      }

      return jsonResponse(state);
    }

    // POST /state - Update cron state (requires auth)
    if (path === '/state' && request.method === 'POST') {
      const authToken = request.headers.get('X-Auth-Token');
      const expectedToken = env.AUTH_TOKEN || 'claw-cron-secret';

      if (authToken !== expectedToken) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      try {
        const body = await request.json();
        
        // Add timestamp
        body.updatedAt = new Date().toISOString();

        if (env.CRON_STATE) {
          await env.CRON_STATE.put('jobs', JSON.stringify(body));
        } else {
          memoryState = body;
        }

        return jsonResponse({ success: true, jobCount: body.jobs?.length || 0 });
      } catch (e) {
        return jsonResponse({ error: 'Invalid JSON' }, 400);
      }
    }

    // GET / - Health check / info
    if (path === '/' || path === '') {
      return jsonResponse({
        service: 'claw-cron-api',
        version: '1.0.0',
        endpoints: {
          'GET /state': 'Get current cron job state',
          'POST /state': 'Update cron job state (requires X-Auth-Token)',
        },
        dashboard: 'https://mulletmcnasty.github.io/claw-cron/'
      });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
