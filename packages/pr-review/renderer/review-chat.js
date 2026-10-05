'use strict';
(()=>{
 let component,panel,split,toggle,divider,initializing,selection={};
 document.addEventListener('selectionchange',()=>{const selected=window.getSelection();const node=selected?.anchorNode;const element=node?.nodeType===1?node:node?.parentElement;const stage=element?.closest('.theater-stage');if(stage&&String(selected).trim())selection={view:stage.id,text:String(selected).slice(0,4000)};});
 function context(){
  const stage=document.querySelector('.theater-stage.active');
  return {view:stage?.id||'review',file:stage?.id==='stage-3'?document.getElementById('diff-current-file')?.textContent||'':'',selection:selection.view===stage?.id?selection.text:''};
 }
 function createShell(){
  if(split)return;
  const viewer=document.querySelector('.theater-stage-content');if(!viewer)return;
  split=document.createElement('div');split.className='review-chat-split';viewer.before(split);split.append(viewer);
  divider=document.createElement('div');divider.className='review-chat-divider';divider.tabIndex=0;divider.setAttribute('role','separator');divider.setAttribute('aria-orientation','vertical');divider.setAttribute('aria-label','Resize review and agent chat');divider.setAttribute('aria-valuemin','25');divider.setAttribute('aria-valuemax','60');
  panel=document.createElement('aside');panel.id='review-agent-panel';panel.className='review-agent-panel';panel.setAttribute('aria-label','Suggest changes');
  const header=document.createElement('header'),title=document.createElement('h3'),close=document.createElement('button');title.textContent='Suggest Changes';close.textContent='×';close.setAttribute('aria-label','Close suggestions');close.onclick=()=>show(false);header.append(title,close);panel.append(header);
  const note=document.createElement('p');note.className='review-chat-context';note.textContent='Ask about what you’re reviewing, or request a code change.';panel.append(note);
  split.append(divider,panel);
  toggle=document.createElement('button');toggle.id='suggest-changes-button';toggle.textContent='Suggest Changes';toggle.className='suggest-changes-button';toggle.setAttribute('aria-controls',panel.id);toggle.onclick=()=>window.openReviewChat();
  document.querySelector('.theater-actions')?.prepend(toggle);
  let width=38;try{width=Number(localStorage.getItem('robos-review-chat-width'))||38;}catch{}
  function resize(value){width=Math.max(25,Math.min(60,value));split.style.setProperty('--review-chat-width',width+'%');divider.setAttribute('aria-valuenow',String(Math.round(width)));try{localStorage.setItem('robos-review-chat-width',String(width));}catch{}window.dispatchEvent(new Event('resize'));}
  resize(width);
  divider.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();divider.setPointerCapture(event.pointerId);split.classList.add('resizing');};
  divider.onpointermove=event=>{if(!divider.hasPointerCapture(event.pointerId))return;const rect=split.getBoundingClientRect();resize((rect.right-event.clientX)/rect.width*100);};
  divider.onpointerup=event=>{if(divider.hasPointerCapture(event.pointerId))divider.releasePointerCapture(event.pointerId);split.classList.remove('resizing');};
  divider.onlostpointercapture=()=>split.classList.remove('resizing');
  divider.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();resize(event.key==='Home'?25:event.key==='End'?60:width+(event.key==='ArrowLeft'?2:-2));};
  show(false);
 }
 function show(open){if(!split)return;panel.hidden=!open;divider.hidden=!open;split.classList.toggle('chat-open',open);toggle.setAttribute('aria-expanded',String(open));if(!open)toggle.focus();window.dispatchEvent(new Event('resize'));}
 window.mountReviewChat=async function(){
  createShell();if(component||!panel)return component;
  if(initializing)return initializing;
  initializing=(async()=>{
   component=window.createRobosAgentChat({container:panel,getState:()=>window.api.getDemoState(),subscribe:fn=>window.api.onDemoState(fn),send:text=>window.api.demoAction({action:'suggest',text,context:context()}),clear:()=>window.api.clearDemoChat(),history:before=>window.api.getDemoHistory(before),openSession:()=>window.api.openDemoSessionFile()});
   await component.ready;return component;
  })();return initializing;
 };
 window.openReviewChat=async()=>{createShell();show(true);const chat=await window.mountReviewChat();chat?.focus();};
 document.addEventListener('DOMContentLoaded',createShell);
})();
