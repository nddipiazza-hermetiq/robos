'use strict';
window.mountEvidencePlan=async function(){
 let panel=document.getElementById('task-evidence-plan');if(panel)return;
 panel=document.createElement('section');panel.id='task-evidence-plan';panel.className='task-evidence';
 const stage=document.getElementById('stage-5');
 const intro=stage.querySelector('.stage-header p');if(intro)intro.textContent='Review the chosen proof, captured artifacts, and checks still needed.';
 for(const el of stage.querySelectorAll('.stage-badge-wrap,.canvas-mode-bar,#canvas-desktop-view')){el.hidden=true;el.style.display='none';}
 stage.prepend(panel);
 function el(tag, className, text){const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;}
 const header=el('header','evidence-header');
 const title=el('h3','','Evidence for this task');
 const generate=el('button','evidence-generate','Generate evidence');generate.disabled=true;
 const help=el('p','evidence-help','Run the planned checks and capture their results.');
 header.append(title,generate,help);
 const status=el('p');status.setAttribute('role','status');status.textContent='Loading evidence plan…';
 const body=el('div','evidence-plan-sections');
 const list=el('ul');
 const retry=el('button','','Choose evidence with AI');retry.hidden=true;
 const runStatus=el('p','evidence-run-status');runStatus.setAttribute('role','status');
 const runNote=el('p','evidence-run-note');
 const progressDetails=el('details','evidence-progress');progressDetails.append(el('summary','','Run activity'));
 const progress=el('div');progress.setAttribute('role','log');progressDetails.append(progress);
 const results=el('div','evidence-results');
 const artifacts=el('section','evidence-artifacts');
 const planDetails=el('details','evidence-plan');planDetails.append(el('summary','','Evidence plan'),status,body,retry);
 const references=el('details','evidence-references');references.append(el('summary','','Earlier artifacts and missing checks'),list);
 const preview=el('dialog','evidence-preview');preview.setAttribute('aria-labelledby','evidence-preview-title');
 const previewTitle=el('h3');previewTitle.id='evidence-preview-title';
 const close=el('button','','Close');close.onclick=()=>preview.close();
 const previewHeader=el('header');previewHeader.append(previewTitle,close);
 const previewBody=el('div','evidence-preview-body');
 const openFile=el('button','','Open file in another app');
 preview.append(previewHeader,previewBody,openFile);
 panel.append(header,runStatus,runNote,results,artifacts,progressDetails,planDetails,references,preview);
 let previewRequest=0;
 preview.addEventListener('close',()=>{previewRequest++;});
 async function showArtifact(item){
  const request=++previewRequest;
  previewTitle.textContent=item.label||'Captured file';previewBody.replaceChildren();
  openFile.onclick=async()=>{try{const r=await window.api.openReviewEvidence(item.id);if(!r.ok)throw Error(r.error);}catch(e){previewBody.append(el('p','evidence-error',e.message));}};
  preview.showModal();
  if(/\.(png|jpe?g|webp)$/i.test(item.path||'')){
   const img=el('img');img.src='robos-evidence://screenshot/'+item.id;img.alt=item.label;
   img.onerror=()=>{if(request===previewRequest)previewBody.replaceChildren(el('p','evidence-error','This screenshot could not be loaded.'));};previewBody.append(img);return;
  }
  previewBody.append(el('p','','Loading file…'));
  try{
   const r=await window.api.readReviewEvidence(item.id);if(request!==previewRequest)return;if(!r.ok)throw Error(r.error);
   previewBody.replaceChildren(el('pre','',r.text));
   if(r.truncated)previewBody.append(el('p','','Showing the first 256 KB. Open the file to read the rest.'));
  }catch(e){if(request===previewRequest)previewBody.replaceChildren(el('p','evidence-error',e.message));}
 }
 function artifactRow(item){
  const row=el('article','evidence-artifact');const name=el('div');name.append(el('h4','',item.label||'Captured file'));
  const filename=(item.path||'').split('/').pop();if(filename)name.append(el('p','',filename));
  const action=/\.(png|jpe?g|webp)$/i.test(item.path||'')?'View screenshot':/exchange/i.test((item.label||'')+' '+filename)?'View exchange':/copied|clipboard/i.test(item.label||'')?'View copied text':/test/i.test(item.label||'')?'View test output':'View details';
  const button=el('button','',action);button.setAttribute('aria-label',action+': '+item.label);button.onclick=()=>showArtifact(item);row.append(name,button);return row;
 }
 async function renderRun(run){
  if(!run)return;
  const running=run.status==='running', scenarios=run.scenarios||[];
  generate.disabled=running;generate.textContent=running?'Generating evidence…':run.status==='idle'?'Generate evidence':'Run checks again';
  const passed=scenarios.filter(s=>s.status==='passed'),failed=scenarios.filter(s=>s.status==='failed'),pending=scenarios.filter(s=>!['passed','failed'].includes(s.status));
  const counts=[];if(passed.length)counts.push(passed.length+' passed');if(failed.length)counts.push(failed.length+' failed');if(pending.length)counts.push(pending.length+' pending');
  runStatus.textContent=running?'Checks are running':counts.length?counts.join(' · '):({idle:'No checks run yet',error:'Evidence run could not finish',interrupted:'Evidence run interrupted',completed:'Evidence collected','needs-attention':'Checks need follow-up'}[run.status]||'Evidence results');
  runNote.textContent=['error','interrupted'].includes(run.status)?run.summary||'Run the checks again to finish collecting evidence.':pending.length?'Pending checks have not been verified. They are not failed tests.':(!scenarios.length&&!running?run.summary||'':'');
  results.replaceChildren();
  for(const [heading,items,tone] of [['Still to verify',pending,'pending'],['Failed checks',failed,'failed'],['Passed checks',passed,'passed']]){
   if(!items.length)continue;const section=el('section','evidence-check-group');section.append(el('h4','',heading));
   for(const item of items){const row=el('article','evidence-check '+tone);row.append(el('span','evidence-check-badge',tone==='pending'?'Pending':tone==='failed'?'Failed':'Passed'));const copy=el('div');copy.append(el('h5','',item.title||item.id),el('p','',item.summary||''));row.append(copy);section.append(row);}results.append(section);
  }
  progress.replaceChildren();for(const update of run.progress||[]){progress.append(el('p','walkthrough-bubble assistant progress-entry',update.text));}progressDetails.hidden=!progress.childElementCount;progressDetails.open=running;progress.scrollTop=progress.scrollHeight;
  artifacts.replaceChildren();if(run.artifacts?.length){artifacts.append(el('h4','','Captured evidence'),el('p','evidence-help','Open a screenshot or read the original output.'));for(const item of run.artifacts)artifacts.append(artifactRow(item));}
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
