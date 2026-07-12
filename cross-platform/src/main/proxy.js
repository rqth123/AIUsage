import http from 'node:http';

export class LocalProxy {
  constructor(getNode) { this.getNode = getNode; this.server = null; this.port = null; }
  async start(port) {
    if (this.server && this.port === port) return;
    await this.stop();
    this.server = http.createServer((req, res) => this.handle(req, res));
    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(port, '127.0.0.1', resolve);
    });
    this.port = port;
  }
  async stop() {
    if (!this.server) return;
    await new Promise(resolve => this.server.close(resolve)); this.server = null; this.port = null;
  }
  async handle(req, res) {
    try {
      const node = this.getNode();
      if (!node) throw new Error('No active API node');
      if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}'); return; }
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      let body = Buffer.concat(chunks);
      if (body.length && node.model) {
        try { const parsed = JSON.parse(body); parsed.model = node.model; body = Buffer.from(JSON.stringify(parsed)); } catch { /* passthrough */ }
      }
      const incoming = new URL(req.url || '/', 'http://localhost');
      const base = new URL(`${node.baseUrl.replace(/\/$/, '')}/`);
      const basePath = base.pathname.replace(/\/$/, '');
      let requestPath = incoming.pathname;
      if (basePath.endsWith('/v1') && requestPath.startsWith('/v1/')) requestPath = requestPath.slice(3);
      const target = new URL(`${basePath}${requestPath}${incoming.search}`, base.origin);
      const headers = { 'content-type': req.headers['content-type'] || 'application/json', accept: req.headers.accept || '*/*' };
      if (node.protocol === 'anthropic') headers['x-api-key'] = node.apiKey;
      else headers.authorization = `Bearer ${node.apiKey}`;
      const upstream = await fetch(target, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body, duplex: 'half' });
      const responseHeaders = {}; upstream.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) responseHeaders[k] = v; });
      res.writeHead(upstream.status, responseHeaders);
      if (upstream.body) for await (const chunk of upstream.body) res.write(chunk);
      res.end();
    } catch (error) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: error.message, type: 'aiusage_proxy_error' } }));
    }
  }
}
