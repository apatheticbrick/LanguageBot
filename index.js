require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint example: client requests /api/data?param=value
// Server forwards request to third-party API with injected API key
app.get('/api/*', async (req, res) => {
    try {
        // Construct third-party API URL based on incoming request path and query
        // Example: If your third-party API base URL is "https://api.example.com"
        const thirdPartyBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

        // Extract the path after /api
        const apiPath = req.path.replace(/^\/api/, '');

        // Get query string parameters from original request
        const queryParams = {...req.query, key: API_KEY}; // inject API key as query param; adjust key name if different

        // Build full URL with query params
        const url = new URL(apiPath, thirdPartyBaseUrl);
        Object.keys(queryParams).forEach(key => url.searchParams.append(key, queryParams[key]));

        // Make request to third-party API
        const response = await axios.get(url.toString());

        // Forward the response data back to client
        res.json(response.data);

    } catch (error) {
        console.error('API proxy error:', error.message);
        res.status(500).json({error: 'Failed to fetch data'});
    }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});