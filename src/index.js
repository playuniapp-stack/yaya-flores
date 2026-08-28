
const enc = new TextEncoder();

function json(data,status=200,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8",...headers}});
}
function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function fromHex(hex){return new Uint8Array(hex.match(/.{1,2}/g).map(x=>parseInt(x,16)))}
async function sha256(s){return new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(s)))}
async function hmac(secret,msg){
  const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(msg))));
}
async function pbkdf2(password,salt){
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:enc.encode(salt),iterations:180000},key,256);
  return b64url(new Uint8Array(bits));
}
function cookies(req){
  const out={}; for(const part of (req.headers.get("cookie")||"").split(";")){
    const i=part.indexOf("="); if(i>0) out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());
  } return out;
}
async function sessionSecret(env){
  let row=await env.DB.prepare("SELECT value FROM settings WHERE key='adminSessionSecret'").first();
  if(row?.value)return row.value;
  const secret=crypto.randomUUID()+crypto.randomUUID();
  await env.DB.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('adminSessionSecret',?)").bind(secret).run();
  return secret;
}
async function createSession(env){
  const ts=Date.now().toString(), secret=await sessionSecret(env), sig=await hmac(secret,ts);
  return `${ts}.${sig}`;
}
async function authenticated(req,env){
  const token=cookies(req).yaya_admin; if(!token)return false;
  const [ts,sig]=token.split("."); if(!ts||!sig)return false;
  if(Date.now()-Number(ts)>8*60*60*1000)return false;
  const expected=await hmac(await sessionSecret(env),ts);
  return sig===expected;
}
async function setting(env,key){
  const r=await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind(key).first(); return r?.value??"";
}
async function setSetting(env,key,value){
  await env.DB.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)").bind(key,String(value??"")).run();
}
async function readBody(req){try{return await req.json()}catch{return {}}}
function productFromRow(r){
  return {...r,active:!!r.active,novelty:!!r.novelty,images:JSON.parse(r.images||"[]"),addons:JSON.parse(r.addons||"[]")};
}
async function listProducts(env,admin=false){
  const q=admin?"SELECT * FROM products ORDER BY sort_order ASC, created_at DESC":"SELECT * FROM products WHERE active=1 ORDER BY sort_order ASC, created_at DESC";
  const {results}=await env.DB.prepare(q).all(); return results.map(productFromRow);
}
async function saveProduct(env,p,id){
  const now=new Date().toISOString(); const pid=id||crypto.randomUUID();
  const exists=id?await env.DB.prepare("SELECT id FROM products WHERE id=?").bind(id).first():null;
  const vals=[
    p.name||"",p.category||"",p.description||"",p.price||"",p.availability||"Disponível hoje",
    JSON.stringify(p.images||[]),JSON.stringify(p.addons||[]),p.active===false?0:1,p.novelty?1:0,
    Number(p.sort_order||0),now,pid
  ];
  if(exists){
    await env.DB.prepare(`UPDATE products SET name=?,category=?,description=?,price=?,availability=?,images=?,addons=?,active=?,novelty=?,sort_order=?,updated_at=? WHERE id=?`).bind(...vals).run();
  }else{
    await env.DB.prepare(`INSERT INTO products(name,category,description,price,availability,images,addons,active,novelty,sort_order,created_at,updated_at,id) VALUES(?,?,?,?,?,?,?,?,?,?,?, ?,?)`)
      .bind(p.name||"",p.category||"",p.description||"",p.price||"",p.availability||"Disponível hoje",JSON.stringify(p.images||[]),JSON.stringify(p.addons||[]),p.active===false?0:1,p.novelty?1:0,Number(p.sort_order||0),now,now,pid).run();
  }
  return pid;
}
async function api(req,env,url){
  const path=url.pathname;
  if(path==="/api/products"&&req.method==="GET") return json(await listProducts(env,false));
  if(path==="/api/admin/status"&&req.method==="GET"){
    const configured=!!(await setting(env,"adminPasswordHash"));
    return json({serverVersion:9,authenticated:await authenticated(req,env),configured});
  }
  if(path==="/api/admin/setup"&&req.method==="POST"){
    if(await setting(env,"adminPasswordHash"))return json({error:"A senha já foi criada."},409);
    const {password}=await readBody(req); if(!password||password.length<6)return json({error:"Use uma senha com pelo menos 6 caracteres."},400);
    const salt=crypto.randomUUID(),hash=await pbkdf2(password,salt);
    await setSetting(env,"adminPasswordSalt",salt); await setSetting(env,"adminPasswordHash",hash);
    const token=await createSession(env);
    return json({ok:true,authenticated:true,serverVersion:9},200,{"set-cookie":`yaya_admin=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`});
  }
  if(path==="/api/admin/login"&&req.method==="POST"){
    const {password}=await readBody(req), salt=await setting(env,"adminPasswordSalt"), hash=await setting(env,"adminPasswordHash");
    if(!salt||!hash||await pbkdf2(password||"",salt)!==hash)return json({error:"Senha incorreta."},401);
    const token=await createSession(env);
    return json({ok:true,authenticated:true,serverVersion:9},200,{"set-cookie":`yaya_admin=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`});
  }
  if(path==="/api/admin/logout"&&req.method==="POST")
    return json({ok:true},200,{"set-cookie":"yaya_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"});
  if(path.startsWith("/api/admin/") && !(await authenticated(req,env)))return json({error:"Não autorizado."},401);

  if(path==="/api/admin/products"&&req.method==="GET")return json(await listProducts(env,true));
  if(path==="/api/admin/products"&&req.method==="POST"){
    const p=await readBody(req); const id=await saveProduct(env,p); return json({ok:true,id},201);
  }
  const pm=path.match(/^\/api\/admin\/products\/([^/]+)$/);
  if(pm&&req.method==="PUT"){const p=await readBody(req);await saveProduct(env,p,pm[1]);return json({ok:true})}
  if(pm&&req.method==="DELETE"){await env.DB.prepare("DELETE FROM products WHERE id=?").bind(pm[1]).run();return json({ok:true})}

  if(path==="/api/admin/settings"&&req.method==="GET"){
    const {results}=await env.DB.prepare("SELECT key,value FROM settings WHERE key NOT LIKE 'adminPassword%' AND key!='adminSessionSecret'").all();
    const o=Object.fromEntries(results.map(x=>[x.key,x.value])); if(o.geminiApiKey)o.geminiApiKey="••••••••";
    return json(o);
  }
  if(path==="/api/admin/settings"&&req.method==="PUT"){
    const body=await readBody(req);
    for(const [k,v] of Object.entries(body)){
      if(k.startsWith("adminPassword")||k==="adminSessionSecret")continue;
      if(k==="geminiApiKey"&&String(v).includes("•"))continue;
      await setSetting(env,k,v);
    } return json({ok:true});
  }
  if(path==="/api/admin/upload"&&req.method==="POST"){
    const form=await req.formData(); const file=form.get("file");
    if(!(file instanceof File))return json({error:"Arquivo não enviado."},400);
    if(!file.type.startsWith("image/"))return json({error:"Envie uma imagem."},400);
    const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").toLowerCase();
    const key=`products/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    await env.IMAGES.put(key,file.stream(),{httpMetadata:{contentType:file.type}});
    return json({ok:true,url:`/media/${key}`});
  }
  if(path==="/api/admin/improve-image"&&req.method==="POST"){
    const key=await setting(env,"geminiApiKey");
    if(!key)return json({error:"Configure a chave Gemini no painel."},400);
    return json({error:"A melhoria Gemini está preparada para a Cloudflare, mas requer a chave/modelo configurados antes do teste final."},501);
  }
  return json({error:"Rota não encontrada."},404);
}
async function media(env,key){
  const obj=await env.IMAGES.get(key); if(!obj)return new Response("Not found",{status:404});
  const h=new Headers(); obj.writeHttpMetadata(h); h.set("etag",obj.httpEtag); h.set("cache-control","public, max-age=31536000, immutable");
  return new Response(obj.body,{headers:h});
}
export default {
  async fetch(req,env){
    const url=new URL(req.url);
    try{
      if(url.pathname.startsWith("/api/"))return await api(req,env,url);
      if(url.pathname.startsWith("/media/"))return await media(env,url.pathname.slice(7));
      if(url.pathname==="/admin")return env.ASSETS.fetch(new Request(new URL("/admin.html",url),req));
      if(url.pathname==="/produto")return env.ASSETS.fetch(new Request(new URL("/produto.html",url),req));
      return env.ASSETS.fetch(req);
    }catch(e){console.error(e);return json({error:"Erro interno.",detail:String(e?.message||e)},500)}
  }
};
