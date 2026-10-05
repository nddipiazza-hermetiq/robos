'use strict';
window.mountEvidencePlan=async function(){
 let panel=document.getElementById('task-evidence-plan');if(panel)return;
 panel=document.createElement('section');panel.id='task-evidence-plan';panel.className='task-evidence';
 const stage=document.getElementById('stage-5');
 const intro=stage.querySelector('.stage-header p');if(intro)intro.textContent='Review the chosen proof, captured artifacts, and checks still needed.';
 for(const el of stage.querySelectorAll('.stage-badge-wrap,.canvas-mode-bar,#canvas-desktop-view')){el.hidden=true;el.style.display='none';}
 stage.prepend(panel);
 const title=document.createElement('h3');title.textContent='Evidence for this task';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Loading evidence plan…';
 const body=document.createElement('div');body.className='evidence-plan-sections';
 const list=document.createElement('ul');
 const retry=document.createElement('button');retry.textContent='Choose evidence with AI';retry.hidden=true;
 const generate=document.createElement('button');generate.textContent='Generate evidence';generate.disabled=true;
 const runStatus=document.createElement('p');runStatus.setAttribute('role','status');
 const progress=document.createElement('div');progress.setAttribute('role','log');progress.style.cssText='max-height:260px;overflow:auto;white-space:pre-wrap;margin:12px 0';
 const results=document.createElement('ul');
 const references=document.createElement('details');references.className='evidence-references';const refsTitle=document.createElement('summary');refsTitle.textContent='Earlier artifacts and missing checks';references.append(refsTitle,list);
 panel.append(title,status,generate,runStatus,progress,results,body,references,retry);
 async function renderRun(run){
  if(!run)return;generate.disabled=run.status==='running';generate.textContent=run.status==='running'?'Generating evidence…':'Generate evidence';
  runStatus.textContent=run.status==='idle'?'No evidence run yet.':run.status+' — '+(run.summary||'Executing the evidence plan.');
  progress.replaceChildren();for(const update of run.progress||[]){const bubble=document.createElement('p');bubble.className='walkthrough-bubble assistant progress-entry';bubble.textContent=update.text;progress.append(bubble);}progress.scrollTop=progress.scrollHeight;
  results.replaceChildren();for(const scenario of run.scenarios||[]){const li=document.createElement('li');li.textContent=(scenario.title||scenario.id)+' · '+scenario.status+' — '+scenario.summary;results.append(li);}
  for(const item of run.artifacts||[]){const li=document.createElement('li'),open=document.createElement('button');open.textContent=item.label;open.onclick=()=>window.api.openReviewEvidence(item.id);li.append(open);results.append(li);}

 }
 generate.onclick=async()=>{generate.disabled=true;try{const r=await window.api.generateReviewEvidence();if(!r.ok)throw Error(r.error);await renderRun(r.state);}catch(e){runStatus.textContent=e.message;generate.disabled=false;}};
 window.cleanupEvidenceRun?.();const unsubscribe=window.api.onEvidenceRunState?.(renderRun);window.cleanupEvidenceRun=()=>unsubscribe?.();
 window.api.evidenceRunState?.().then(renderRun);

 const viewers=[];
 function renderPlan(markdown){
  for(const viewer of viewers.splice(0))viewer.destroy();body.replaceChildren();
  const parts=String(markdown).split(/(?=^### [^\n]+)/m);
  for(const [i,part] of parts.entries()){
   const heading=part.match(/^### ([^\n]*)/);const details=document.createElement('details');details.className='evidence-scenario-plan';
   const summary=document.createElement('summary');summary.textContent=heading?heading[1]:'Scope, baseline and data';details.append(summary);
   const content=document.createElement('div');content.className='evidence-markdown';details.append(content);body.append(details);
   const text=(heading?part.slice(heading[0].length):part).replace(/^## Evidence plan\s*$/gm,'').trim();
   if(window.toastui?.Editor&&window.DOMPurify){viewers.push(toastui.Editor.factory({el:content,viewer:true,initialValue:text,theme:'dark',usageStatistics:false,customHTMLSanitizer:html=>DOMPurify.sanitize(html,{FORBID_TAGS:['img','iframe','script'],FORBID_ATTR:['style']})}));}
   else content.textContent=text;
  }
 }
 async function load(recommend=false){
  retry.disabled=true;
  try{
   const result=await window.api.evidencePlan(recommend);if(!result.ok)throw Error(result.error);
   if(!result.plan&&!recommend){status.textContent='No evidence was chosen in the task plan. AI is reviewing the task and available artifacts…';return await load(true);}
   const plan=result.plan;status.textContent=plan.source==='task-plan'?'Chosen during task planning':'AI recommendation · collection and verification still required';
   renderPlan(plan.markdown);list.replaceChildren();
   const selected=new Set(plan.selectedEvidence||[]);
   for(const item of result.inventory.filter(e=>selected.has(e.id))){const li=document.createElement('li');const open=document.createElement('button');open.textContent=item.label;open.onclick=async()=>{const r=await window.api.openReviewEvidence(item.id);if(!r.ok)status.textContent=r.error;};li.append(open,document.createTextNode(' — '+(item.verified===true?'recorded as verified':'verification not recorded')));list.append(li);}
   for(const missing of plan.missing||[]){const li=document.createElement('li');li.textContent='Still needed: '+missing;list.append(li);}
   retry.hidden=true;const running=await window.api.evidenceRunState?.();generate.disabled=running?.status==='running';
  }catch(e){status.textContent=e.message;retry.hidden=false;}finally{retry.disabled=false;}
 }
 retry.onclick=()=>load(true);await load();
};
