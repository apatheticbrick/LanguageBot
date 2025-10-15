require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

// Proxy endpoint example: client requests /api/data?param=value
// Server forwards request to third-party API with injected API key
app.post('/api/*splat', async (req, res) => {
    try {
        // Construct third-party API URL based on incoming request path and query
        // Example: If your third-party API base URL is "https://api.example.com"
        const thirdPartyBaseUrl = 'https://generativelanguage.googleapis.com';

        // Extract the path after /api
        const apiPath = req.path.replace(/^\/api/, '');

        // Get query string parameters from original request
        // const queryParams = {...req.query, key: API_KEY}; // inject API key as query param; adjust key name if different

        // Build full URL with query params
        const url = new URL(apiPath, thirdPartyBaseUrl).toString();

        // Object.keys(queryParams).forEach(key => url.searchParams.append(key, queryParams[key]));

        // Copy incoming headers
        const headers = {...req.headers};
        headers['x-goog-api-key'] = `${API_KEY}`;
        delete headers.host;

        // Make request to third-party API
        const response = await axios.post(url, req.body, { headers });

        // Forward the response data back to client
        res.status(response.status).json(response.data);

    } catch (error) {
        console.error('API proxy error:', error.message);
        res.status(500).json({error: 'Failed to fetch data'});
    }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});