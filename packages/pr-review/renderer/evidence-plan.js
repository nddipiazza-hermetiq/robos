'use strict';
window.mountEvidencePlan=async function(){
 let panel=document.getElementById('task-evidence-plan');if(panel)return;
 panel=document.createElement('section');panel.id='task-evidence-plan';panel.style.cssText='margin:16px;padding:20px;border:1px solid #384758;border-radius:8px;';
 const stage=document.getElementById('stage-5');
 const intro=stage.querySelector('.stage-header p');if(intro)intro.textContent='Review the chosen proof, captured artifacts, and checks still needed.';
 for(const el of stage.querySelectorAll('.stage-badge-wrap,.canvas-mode-bar,#canvas-desktop-view')){el.hidden=true;el.style.display='none';}
 stage.prepend(panel);
 const title=document.createElement('h3');title.textContent='Evidence for this task';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Loading evidence plan…';
 const body=document.createElement('div');body.style.cssText='white-space:pre-wrap;line-height:1.6;margin:12px 0';
 const list=document.createElement('ul');
 const retry=document.createElement('button');retry.textContent='Choose evidence with AI';retry.hidden=true;
 panel.append(title,status,body,list,retry);
 async function load(recommend=false){
  retry.disabled=true;
  try{
   const result=await window.api.evidencePlan(recommend);if(!result.ok)throw Error(result.error);
   if(!result.plan&&!recommend){status.textContent='No evidence was chosen in the task plan. AI is reviewing the task and available artifacts…';return await load(true);}
   const plan=result.plan;status.textContent=plan.source==='task-plan'?'Chosen during task planning':'AI recommendation · collection and verification still required';
   body.textContent=plan.markdown;list.replaceChildren();
   const selected=new Set(plan.selectedEvidence||[]);
   for(const item of result.inventory.filter(e=>selected.has(e.id))){const li=document.createElement('li');const open=document.createElement('button');open.textContent=item.label;open.onclick=async()=>{const r=await window.api.openReviewEvidence(item.id);if(!r.ok)status.textContent=r.error;};li.append(open,document.createTextNode(' — '+(item.verified===true?'recorded as verified':'verification not recorded')));list.append(li);}
   for(const missing of plan.missing||[]){const li=document.createElement('li');li.textContent='Still needed: '+missing;list.append(li);}
   retry.hidden=true;
  }catch(e){status.textContent=e.message;retry.hidden=false;}finally{retry.disabled=false;}
 }
 retry.onclick=()=>load(true);await load();
};
