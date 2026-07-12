import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { LocalProxy } from '../src/main/proxy.js';

test('proxy rewrites model and injects upstream key', async t => {
  let received;
  const upstream=http.createServer(async(req,res)=>{
    const chunks=[]; for await(const chunk of req) chunks.push(chunk);
    received={url:req.url,authorization:req.headers.authorization,body:JSON.parse(Buffer.concat(chunks))};
    res.writeHead(200,{'content-type':'application/json'});res.end('{"ok":true}');
  });
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  const upstreamPort=upstream.address().port;
  const proxy=new LocalProxy(()=>({baseUrl:`http://127.0.0.1:${upstreamPort}/v1`,model:'replacement-model',protocol:'openai',apiKey:'secret'}));
  await proxy.start(0); t.after(async()=>{await proxy.stop();await new Promise(resolve=>upstream.close(resolve));});
  const response=await fetch(`http://127.0.0.1:${proxy.server.address().port}/v1/responses`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'old'})});
  assert.equal(response.status,200); assert.equal(received.url,'/v1/responses');
  assert.equal(received.authorization,'Bearer secret'); assert.equal(received.body.model,'replacement-model');
});
