import { readFileSync } from "fs";
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const QDRANT_URL = "http://localhost:6333";
const COLLECTION = "legion_tools";
const BATCH_SIZE = 100;
const catalog = JSON.parse(readFileSync("adapter-catalog.json", "utf-8"));
const registry = JSON.parse(readFileSync("mcp-registry.json", "utf-8"));
const docs = [];
for (const e of catalog) { const t = e.toolNames || []; docs.push({ id: e.name, type: "rest", text: [e.displayName||e.name, e.description||'', e.category||'', t.join(' ').replace(/_/g,' '), (e.keywords||[]).join(' ')].filter(Boolean).join('. '), payload: { adapter_id: e.name, name: e.displayName||e.name, category: e.category||'misc', toolCount: t.length, toolNames: t, type: 'rest' } }); }
for (const e of registry) { if (e.type !== 'mcp') continue; const t = e.mcp?.toolNames || []; docs.push({ id: e.id, type: 'mcp', text: [e.name, e.description||'', e.category||'', t.join(' ').replace(/_/g,' ')].filter(Boolean).join('. '), payload: { adapter_id: e.id, name: e.name, category: e.category||'misc', toolCount: e.mcp?.toolCount||t.length, toolNames: t.slice(0,50), type: 'mcp', transport: e.mcp?.transport||'unknown' } }); }
console.log('Documents:', docs.length);
function tokenize(s) { return s.toLowerCase().replace(/[^a-z0-9]/g,' ').split(/\s+/).filter(t=>t.length>2); }
function bm25Sparse(s) { const t=tokenize(s), f={}; for(const w of t) f[w]=(f[w]||0)+1; const indices=[], values=[]; for(const[w,c] of Object.entries(f)) { let h=0; for(let i=0;i<w.length;i++) h=((h<<5)-h+w.charCodeAt(i))|0; indices.push(Math.abs(h)%100000); values.push(c); } return {indices,values}; }
function minicoilSparse(s) { const t=tokenize(s), indices=[], values=[], seen=new Set(); for(const w of t) { for(let n=2;n<=3;n++) for(let i=0;i<=w.length-n;i++) { const ng=w.slice(i,i+n); let h=0; for(let j=0;j<ng.length;j++) h=((h<<5)-h+ng.charCodeAt(j))|0; const idx=Math.abs(h)%100000; if(!seen.has(idx)){seen.add(idx);indices.push(idx);values.push(1.0);} } } return {indices,values}; }
async function embedBatch(texts) { const r=await fetch('https://api.openai.com/v1/embeddings',{method:'POST',headers:{'Authorization':'Bearer '+OPENAI_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'text-embedding-3-small',input:texts})}); if(!r.ok) throw new Error('OpenAI '+r.status+': '+(await r.text()).slice(0,200)); const d=await r.json(); return d.data.map(x=>x.embedding); }
async function upsertBatch(points) { const r=await fetch(QDRANT_URL+'/collections/'+COLLECTION+'/points',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({points})}); if(!r.ok) throw new Error('Qdrant '+r.status+': '+(await r.text()).slice(0,200)); }
async function main() { let n=0; for(let i=0;i<docs.length;i+=BATCH_SIZE) { const batch=docs.slice(i,i+BATCH_SIZE); const texts=batch.map(d=>d.text.slice(0,8000)); const emb=await embedBatch(texts); const points=batch.map((d,j)=>({id:n+j+1,vector:{dense:emb[j],minicoil:minicoilSparse(d.text),bm25:bm25Sparse(d.text)},payload:d.payload})); await upsertBatch(points); n+=batch.length; process.stdout.write('\r  '+n+'/'+docs.length); if(i+BATCH_SIZE<docs.length) await new Promise(r=>setTimeout(r,350)); } console.log('\nDone.',n,'embedded.'); const c=await(await fetch(QDRANT_URL+'/collections/'+COLLECTION)).json(); console.log('Qdrant points:',c.result?.points_count); }
main().catch(e=>{console.error(e);process.exit(1);});
