'use strict';
(()=>{
 const list=document.getElementById('task-list'),status=document.getElementById('picker-status'),search=document.getElementById('task-search'),refresh=document.getElementById('refresh-tasks');
 let rows=[],busy=false,loading=0;
 const el=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
 function render(){
  list.replaceChildren();const query=search.value.trim().toLowerCase();
  const visible=rows.filter(row=>[row.title,row.url,row.repo,row.workspace].filter(Boolean).join(' ').toLowerCase().includes(query));
  if(!visible.length){const p=el('p',query?'No matching tasks.':'No tasks found. Implement a task first, or configure your GitHub task server in RobOS.');p.className='empty';list.append(p);return;}
  for(const row of visible){const article=el('article','');article.className='task-row';const copy=el('div','');copy.append(el('h2',row.title));const number=row.url?.match(/\/issues\/(\d+)$/)?.[1];copy.append(el('p',[number?'#'+number:'',row.repo].filter(Boolean).join(' · ')));const state=el('p',row.saved?(row.available?'Saved review · ready to open':'Saved checkout is missing · choose its new location'):'Choose the implementation checkout to start reviewing');state.className='task-state';copy.append(state);if(row.workspace)copy.append(el('p',row.workspace));
   const open=el('button',row.saved&&row.available?'Open review':'Choose checkout');open.disabled=busy;open.setAttribute('aria-label',open.textContent+': '+row.title);open.onclick=async()=>{
    busy=true;render();status.textContent='Opening '+row.title+'…';
    try{const result=await window.api.openReviewTask(row.id);if(!result.ok)throw Error(result.error);status.textContent=result.canceled?'No checkout selected.':'Opened '+row.title+'.';}catch(e){status.textContent=e.message;}finally{busy=false;render();}
   };article.append(copy,open);list.append(article);
  }
 }
 async function load(){
  const generation=++loading;refresh.disabled=true;status.textContent='Loading saved reviews…';
  try{
   const local=await window.api.listReviewTasks(false);if(generation!==loading)return;if(!local.ok)throw Error(local.error);rows=local.tasks;render();status.textContent='Checking the task server…';
   const remote=await window.api.listReviewTasks(true);if(generation!==loading)return;if(!remote.ok)throw Error(remote.error);rows=remote.tasks;render();status.textContent=remote.warning||rows.length+' tasks available';
  }catch(e){if(generation===loading)status.textContent=e.message;}finally{if(generation===loading)refresh.disabled=false;}
 }
 search.oninput=render;refresh.onclick=load;load();
})();
