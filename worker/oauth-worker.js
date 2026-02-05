/**
 * GitAudit OAuth Worker for Cloudflare Workers
 * 
 * This worker handles the GitHub OAuth token exchange securely.
 * Deploy to Cloudflare Workers (free tier available).
 * 
 * Setup:
 * 1. Go to https://dash.cloudflare.com/
 * 2. Workers & Pages → Create Application → Create Worker
 * 3. Paste this code and deploy
 * 4. Go to Settings → Variables → Add:
 *    - GITHUB_CLIENT_ID: Your GitHub App Client ID
 *    - GITHUB_CLIENT_SECRET: Your GitHub App Client Secret (encrypt this!)
 * 5. Update the ALLOWED_ORIGINS below with your GitHub Pages URL
 * 6. Update js/config.js OAUTH_PROXY_URL with your worker URL
 */

// Update this with your GitHub Pages URL
const ALLOWED_ORIGINS = [
  'https://nagusamecs.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
];

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request);
    }

    const url = new URL(request.url);
    
    // Handle token exchange
    if (url.pathname === '/api/auth/github' && request.method === 'POST') {
      return handleTokenExchange(request, env);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'gitaudit-oauth' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

function handleCORS(request) {
  const origin = request.headers.get('Origin');
  const headers = new Headers();
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  
  return new Response(null, { status: 204, headers });
}

async function handleTokenExchange(request, env) {
  const origin = request.headers.get('Origin');
  const headers = new Headers({
    'Content-Type': 'application/json'
  });
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  try {
    const { code } = await request.json();
    
    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
        status: 400,
        headers
      });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return new Response(JSON.stringify({ 
        error: tokenData.error,
        error_description: tokenData.error_description 
      }), {
        status: 400,
        headers
      });
    }

    // Return only the access token (don't expose other data)
    return new Response(JSON.stringify({ 
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers
    });
  }
}
