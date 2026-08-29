const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];let originalData='',galleryData=[],aiData='',items=[],status={};
async function api(url,opt={}){const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(opt.headers||{})},...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Erro na operação');return d}
const EXPECTED_SERVER_VERSION=12;
function setAuthMode(setup){
  $('#authTitle').textContent=setup?'Criar acesso da proprietária':'Entrar no painel';
  $('#authText').textContent=setup?'Crie uma senha para proteger o painel. Ao concluir, você entrará automaticamente.':'Digite a senha que você criou para acessar o painel.';
  $('#passwordLabel').firstChild.textContent=setup?'Nova senha':'Senha';
  $('#confirmWrap').hidden=!setup;
  $('#confirmPassword').required=setup;
  $('#authSubmit').textContent=setup?'Criar acesso e entrar':'Entrar no painel';
  $('#authSubmit').disabled=false;
  const steps=$('#authSteps'),help=$('#authHelp');
  if(steps)steps.hidden=!setup;
  if(help)help.textContent=setup?'A senha é criada somente uma vez. Depois, basta entrar com ela.':'Use a mesma senha criada no primeiro acesso.';
}
function backendMismatch(found){
  const btn=$('#authSubmit');
  btn.disabled=false;btn.textContent='Recarregar';
  $('#authMsg').innerHTML=`<strong>Servidor antigo detectado.</strong><br>Esta página é da versão 10, mas o servidor aberto é ${found?`da versão ${found}`:'de uma versão anterior'}. Feche o terminal antigo e inicie pelo arquivo <strong>INICIAR-YAYA.bat</strong>.`;
  btn.onclick=()=>location.reload(true);
}
async function boot(){
  $('#authMsg').textContent='Verificando acesso…';
  let st;
  try{st=await api('/api/admin/status?ts='+Date.now())}
  catch(e){$('#authMsg').textContent='Não foi possível falar com o servidor. Atualize a página após a nova publicação na Cloudflare.';return}
  if(st.serverVersion!==EXPECTED_SERVER_VERSION){backendMismatch(st.serverVersion);return}
  status=st;
  $('#authMsg').textContent='';
  if(status.authenticated){await showAdmin();return}
  let setup=!status.configured;
  setAuthMode(setup);

  $('#authForm').onsubmit=async e=>{
    e.preventDefault();
    const btn=$('#authSubmit'),password=$('#password').value;
    $('#authMsg').textContent='';
    if(setup&&password!==$('#confirmPassword').value){
      $('#authMsg').textContent='As senhas não são iguais.';
      return;
    }
    btn.disabled=true;
    btn.textContent=setup?'Criando acesso…':'Entrando…';
    try{
      const result=await api(setup?'/api/admin/setup':'/api/admin/login',{
        method:'POST',body:JSON.stringify({password})
      });
      if(result.serverVersion!==EXPECTED_SERVER_VERSION){backendMismatch(result.serverVersion);return}
      if(!result.authenticated)throw new Error('O servidor não confirmou o acesso.');
      await showAdmin();
    }catch(err){
      // Reconsulta o servidor para saber exatamente em qual estado ficou.
      const fresh=await api('/api/admin/status?ts='+Date.now()).catch(()=>null);
      if(fresh?.serverVersion!==EXPECTED_SERVER_VERSION){
        backendMismatch(fresh?.serverVersion);return;
      }
      if(fresh?.authenticated){await showAdmin();return}
      if(fresh?.configured){
        setup=false;
        setAuthMode(false);
        $('#confirmWrap').hidden=true;
        $('#authMsg').textContent='A senha foi criada. Agora digite a mesma senha e clique em Entrar no painel.';
        $('#password').focus();
        return;
      }
      $('#authMsg').textContent=err.message||'Não foi possível concluir o acesso.';
      btn.disabled=false;
      btn.textContent=setup?'Criar acesso e entrar':'Entrar no painel';
    }
  };
}
async function showAdmin(){
  $('#authView').hidden=true;
  $('#adminView').hidden=false;
  bind();
  const results=await Promise.allSettled([loadProducts(),loadSettings()]);
  const failed=results.find(x=>x.status==='rejected');
  if(failed)console.error('Falha ao carregar parte do painel:',failed.reason);
  renderOverview();
}
function bind(){$$('.nav').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));$$('[data-open-new]').forEach(b=>b.onclick=()=>{resetForm();openTab('new')});$('#logout').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});location.reload()};$('#imageFile').onchange=handleImage;$('#improveBtn').onclick=improve;$('#productForm').onsubmit=saveProduct;$('#cancelEdit').onclick=()=>{resetForm();openTab('products')};$('#aiForm').onsubmit=saveSettings;$('#clearKey').onclick=clearKey;$('#goProducts').onclick=()=>openTab('products');const qr=$('#qrImage');qr.src=`https://quickchart.io/qr?text=${encodeURIComponent(location.origin)}&size=360`;$('#downloadQr').onclick=()=>open(qr.src,'_blank');}
function openTab(t){$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));$$('.tab').forEach(x=>x.classList.remove('active'));$(`#tab-${t}`).classList.add('active')}
async function loadProducts(){items=await api('/api/admin/products');if($('#stats'))renderOverview();$('#productList').innerHTML=items.length?items.map(p=>`<article class="admin-product"><img src="${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><p>${p.category} • ${p.price?Number(p.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'sem preço'} • ${p.availability||'Disponível hoje'} ${p.active===false?'• oculto':''}</p><div class="badges">${p.new?'<span class="badge">Novidade</span>':''}${p.featured?'<span class="badge">Destaque</span>':''}</div></div><div class="admin-actions"><button class="ghost" onclick="editProduct('${p.id}')">Editar</button><button class="ghost danger" onclick="removeProduct('${p.id}')">Excluir</button></div></article>`).join(''):'<p>Nenhum produto cadastrado.</p>'}
window.editProduct=id=>{const p=items.find(x=>x.id===id);if(!p)return;resetForm();$('#editId').value=p.id;$('#formTitle').textContent='Editar produto';$('#name').value=p.name||'';$('#category').value=p.category||'Buquês';$('#price').value=p.price??'';$('#availability').value=p.availability||'Disponível hoje';$('#addons').value=(p.addons||[]).map(x=>typeof x==='string'?x:x.name).join(', ');$('#description').value=p.description||'';$('#occasions').value=(p.occasions||[]).join(', ');$('#recipients').value=(p.recipients||[]).join(', ');$('#featured').checked=!!p.featured;$('#isNew').checked=!!p.new;$('#active').checked=p.active!==false;showPreview($('#originalPreview'),p.image);originalData='';openTab('new')}
window.removeProduct=async id=>{if(!confirm('Excluir este produto?'))return;try{await api(`/api/admin/products/${id}`,{method:'DELETE'});await loadProducts()}catch(e){alert(e.message)}}
function resetForm(){$('#productForm').reset();$('#editId').value='';$('#formTitle').textContent='Novo produto';$('#active').checked=true;originalData='';galleryData=[];aiData='';hidePreview($('#originalPreview'));hidePreview($('#aiPreview'));$('#publishChoice').hidden=true;$('#formMsg').textContent=''}
function showPreview(img,src){img.src=src;img.style.display='block';img.nextElementSibling.style.display='none'}function hidePreview(img){img.removeAttribute('src');img.style.display='none';img.nextElementSibling.style.display='block'}
function handleImage(e){const files=[...e.target.files];if(!files.length)return;galleryData=[];let done=0;files.forEach((f,i)=>{const r=new FileReader();r.onload=()=>{galleryData[i]=r.result;done++;if(i===0){originalData=r.result;aiData='';showPreview($('#originalPreview'),originalData);hidePreview($('#aiPreview'));$('#publishChoice').hidden=true}if(done===files.length)$('#formMsg').textContent=`${files.length} foto(s) pronta(s) para publicar.`};r.readAsDataURL(f)})}
async function improve(){if(!originalData){$('#formMsg').textContent='Selecione uma nova foto para usar a melhoria com IA.';return}const b=$('#improveBtn');b.disabled=true;b.textContent='Melhorando…';$('#formMsg').textContent='A Gemini está preparando uma versão profissional. Isso pode levar alguns segundos.';try{const d=await api('/api/admin/improve-image',{method:'POST',body:JSON.stringify({imageData:originalData})});aiData=d.imageData;showPreview($('#aiPreview'),aiData);$('#publishChoice').hidden=false;$('#formMsg').textContent='Pronto. Compare as duas versões e escolha qual publicar.'}catch(e){$('#formMsg').textContent=e.message}finally{b.disabled=false;b.textContent='✨ Melhorar foto com Gemini'}}
async function saveProduct(e){e.preventDefault();const id=$('#editId').value,pick=$('input[name="publishImage"]:checked')?.value;let imageData=pick==='ai'&&aiData?aiData:originalData;const payload={name:$('#name').value.trim(),category:$('#category').value,price:$('#price').value?Number($('#price').value):null,description:$('#description').value.trim(),availability:$('#availability').value,addons:$('#addons').value.split(',').map(x=>x.trim()).filter(Boolean).map(name=>({name,price:null})),occasions:$('#occasions').value.split(',').map(x=>x.trim()).filter(Boolean),recipients:$('#recipients').value.split(',').map(x=>x.trim()).filter(Boolean),featured:$('#featured').checked,new:$('#isNew').checked,active:$('#active').checked};if(imageData)payload.imageData=imageData;if(galleryData.length)payload.galleryData=galleryData;try{await api(id?`/api/admin/products/${id}`:'/api/admin/products',{method:id?'PUT':'POST',body:JSON.stringify(payload)});$('#formMsg').textContent='Produto salvo com sucesso.';await loadProducts();setTimeout(()=>{resetForm();openTab('products')},600)}catch(err){$('#formMsg').textContent=err.message}}
async function loadSettings(){const s=await api('/api/admin/settings');$('#aiModel').value=s.geminiModel||'gemini-3.1-flash-image';$('#aiStatus').className='status '+(s.hasKey?'ok':'');$('#aiStatus').textContent=s.hasKey?`Gemini conectada: ${s.maskedKey}`:'Gemini ainda não conectada.'}
async function saveSettings(e){e.preventDefault();try{const s=await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({geminiApiKey:$('#apiKey').value,geminiModel:$('#aiModel').value})});$('#apiKey').value='';$('#aiStatus').className='status ok';$('#aiStatus').textContent=`Gemini conectada: ${s.maskedKey}`}catch(err){$('#aiStatus').textContent=err.message}}
async function clearKey(){if(!confirm('Remover a chave da Gemini?'))return;await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({clearKey:true})});loadSettings()}
boot().catch(e=>{$('#authMsg').textContent=e.message});

function renderOverview(){if(!$('#stats'))return;const active=items.filter(x=>x.active!==false).length,today=items.filter(x=>(x.availability||'Disponível hoje')==='Disponível hoje'&&x.active!==false).length,newc=items.filter(x=>x.new&&x.active!==false).length,off=items.filter(x=>x.availability==='Indisponível'||x.active===false).length;$('#stats').innerHTML=`<div class="stat"><small>Produtos ativos</small><strong>${active}</strong></div><div class="stat"><small>Disponíveis hoje</small><strong>${today}</strong></div><div class="stat"><small>Novidades</small><strong>${newc}</strong></div><div class="stat"><small>Indisponíveis/ocultos</small><strong>${off}</strong></div>`;}
