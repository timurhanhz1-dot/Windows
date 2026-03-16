const functions = require('firebase-functions');
const https = require('https');

// Groq API Proxy
exports.groqProxy = functions.https.onRequest((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  const postData = JSON.stringify(req.body);
  
  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': req.headers.authorization,
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    
    proxyRes.on('data', (chunk) => {
      data += chunk;
    });
    
    proxyRes.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        res.status(proxyRes.statusCode).json(jsonData);
      } catch (error) {
        res.status(proxyRes.statusCode).send(data);
      }
    });
  });
  
  proxyReq.on('error', (error) => {
    console.error('Proxy request error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  });
  
  proxyReq.write(postData);
  proxyReq.end();
});
