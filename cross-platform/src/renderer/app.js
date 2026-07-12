const $ = s => document.querySelector(s);
const fmt = n => Intl.NumberFormat('zh-CN', { notation: n > 999999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n || 0);
const toast = message => { const el=$('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200); };
let state;

document.querySelectorAll('nav button').forEach(button => button.onclick = () => {
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b===button));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('hidden',v.id!==button.dataset.view));
});

async function refreshUsage() {
  const usage=await window.aiusage.usage(); const t=usage.totals;
  $('#summary').innerHTML=[['会话',t.sessions],['输入 Token',t.input],['缓存 Token',t.cached],['输出 Token',t.output],['推理 Token',t.reasoning]].map(([label,value])=>`<div class="card"><div class="label">${label}</div><div class="metric">${fmt(value)}</div></div>`).join('');
  const days=usage.days.slice(-30); const max=Math.max(1,...days.map(d=>d.input+d.output));
  $('#chart').innerHTML=days.length?days.map(d=>`<div class="bar-wrap" data-tip="${d.date} · ${fmt(d.input+d.output)}"><div class="bar" style="height:${Math.max(2,(d.input+d.output)/max*100)}%"></div></div>`).join(''):'<p>尚未发现 Codex 会话记录</p>';
}

async function refreshNodes(){
  state=await window.aiusage.state();
  $('#node-list').innerHTML=state.nodes.length?state.nodes.map(n=>`<div class="node ${n.id===state.activeNodeId?'active-node':''}"><div><h3>${escapeHtml(n.name)}</h3><div class="meta">${escapeHtml(n.baseUrl)} · ${escapeHtml(n.model||'跟随请求')} · ${n.hasKey?'密钥已保存':'无密钥'}</div></div><div class="buttons"><button data-activate="${n.id}">${n.id===state.activeNodeId?'使用中':'切换'}</button><button class="danger" data-delete="${n.id}">删除</button></div></div>`).join(''):'<div class="panel"><p>还没有节点。点击右上角“新建节点”。</p></div>';
  document.querySelectorAll('[data-activate]').forEach(b=>b.onclick=async()=>{await window.aiusage.activateNode(b.dataset.activate);toast('节点已切换');refreshNodes();});
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('确定删除该节点？')){await window.aiusage.deleteNode(b.dataset.delete);refreshNodes();}});
}
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function refreshTargets(){
  const status=await window.aiusage.configStatus();
  const names={codex:'Codex CLI',claude:'Claude Code',opencode:'OpenCode'};
  $('#targets').innerHTML=Object.entries(names).map(([id,name])=>`<div class="card target-card"><div><strong>${name}</strong><div class="label">${status[id]?'已接管（存在安全备份）':'未接管'}</div></div><button class="${status[id]?'danger':'success'}" data-target="${id}" data-active="${status[id]}">${status[id]?'停用并恢复':'激活'}</button></div>`).join('');
  document.querySelectorAll('[data-target]').forEach(b=>b.onclick=async()=>{try{if(b.dataset.active==='true')await window.aiusage.configDeactivate(b.dataset.target);else await window.aiusage.configActivate(b.dataset.target);toast('配置操作完成');refreshTargets();}catch(e){toast(`失败：${e.message}`)}});
}

$('#refresh').onclick=()=>refreshUsage();
$('#new-node').onclick=()=>{$('#node-dialog form').reset();$('#node-dialog').showModal();};
$('#save-node').onclick=async e=>{e.preventDefault();const form=new FormData($('#node-dialog form'));try{await window.aiusage.saveNode(Object.fromEntries(form));$('#node-dialog').close();toast('节点已保存');refreshNodes();}catch(err){toast(err.message)}};

const proxy=await window.aiusage.proxyStatus(); $('#proxy-pill').textContent=proxy.running?`● 本地代理 127.0.0.1:${proxy.port}`:'● 本地代理未启动';
await Promise.all([refreshUsage(),refreshNodes(),refreshTargets()]);
