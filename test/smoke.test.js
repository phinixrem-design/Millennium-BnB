const http = require('http');
const { once } = require('events');

(async () => {
  const server = require('../server');
  const port = 3001;
  const serverInstance = server.listen(port, async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      const body = await res.text();
      if (res.status !== 200) {
        throw new Error(`Health check failed with ${res.status}: ${body}`);
      }
      console.log('Smoke test passed:', body);
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      serverInstance.close();
    }
  });
})();
