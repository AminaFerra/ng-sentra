const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const app = express();
app.use('/', createProxyMiddleware({
  target: 'http://example.com',
  selfHandleResponse: (proxyRes, req, res) => {
    return false; // Automatically pipe
  },
  on: {
    proxyRes: (proxyRes, req, res) => {
      // Don't call interceptor
      console.log("proxyRes called, but skipped interceptor");
    }
  }
}));
app.listen(3005, () => {
  require('http').get('http://localhost:3005/', res => {
    console.log("Status:", res.statusCode);
    res.on('data', chunk => console.log("Received chunk of size:", chunk.length));
    process.exit(0);
  });
});
