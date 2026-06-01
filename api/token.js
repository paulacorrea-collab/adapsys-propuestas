// api/token.js — Vercel Serverless Function
// Exchanges OAuth authorization code for access token (PKCE flow)
// Deploy alongside index.html on Vercel

export default async function handler(req, res) {
  // Allow CORS from same origin
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { code, code_verifier, redirect_uri } = req.body;

  if (!code || !code_verifier || !redirect_uri) {
    res.status(400).json({ error: 'Missing required fields' }); return;
  }

  // GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in Vercel env vars
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Server not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel environment variables.' });
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri,
        code_verifier,
        grant_type: 'authorization_code',
      }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      res.status(400).json({ error: data.error_description || data.error || 'Token exchange failed' });
      return;
    }

    // Only return the access token — never expose refresh token to frontend in prod
    res.status(200).json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (err) {
    res.status(500).json({ error: 'Internal error: ' + err.message });
  }
}
