const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const app = express();
app.use('/', createProxyMiddleware({
  target: 'http://example.com',
  selfHandleResponse: (proxyRes, req, res) => {
    return false;
  },
  on: {
    proxyRes: responseInterceptor(async (responseBuffer) => {
      console.log("Interceptor called!");
      return responseBuffer;
    })
  }
}));
app.listen(3004, () => {
  require('http').get('http://localhost:3004/', res => {
    console.log("Status:", res.statusCode);
    process.exit(0);
  });
});
