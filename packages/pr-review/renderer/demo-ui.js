'use strict';
window.mountWalkthrough = async function () {
  window.cleanupWalkthrough?.();
  if(!document.getElementById('walkthrough-layout-css')){const css=document.createElement('link');css.id='walkthrough-layout-css';css.rel='stylesheet';css.href='walkthrough.css';document.head.append(css);}
  const stage = document.getElementById('stage-6');
  stage.replaceChildren(); stage.classList.add('walkthrough');
  const bar = document.createElement('div'); bar.className = 'walkthrough-bar';
  const title = document.createElement('strong'); title.textContent = 'Walkthrough';
  const badge = document.createElement('span'); badge.className = 'walkthrough-status';
  const start = button('Start walkthrough', 'Start the live walkthrough', () => act('start'));
  const restart = button('Start over', 'Rerun setup and return to checkpoint 1; keep code changes and chat', () => act('restart'));
  const before = button('How it used to work', 'Demo the main branch in a separate checkout', () => act('before'));
  const feature = button('Show the change', 'Return to the feature branch walkthrough', () => act('feature'));
  const explain = button('Explain this step', 'Explain what you are demonstrating at this checkpoint', () => { window.openReviewChat?.(); return act('explain'); });
  const next = button('Next checkpoint →', 'Go to the next checkpoint', () => act(state.status === 'error' ? 'continue' : 'next'));
  const resume = button('Resume agent', 'Continue this saved agent session at the current step', () => act('resume'));
  const retry = button('Recheck this step', 'Retry this checkpoint', () => act('retry'));
  const process = button('Process…', 'Customize this project’s demo process', () => { editor.value = JSON.stringify(state.process, null, 2); dialog.showModal(); });
  const more = document.createElement('details'); more.className = 'walkthrough-more';
  const moreToggle = document.createElement('summary'); moreToggle.textContent = 'More'; moreToggle.setAttribute('aria-label', 'More walkthrough actions');
  const menu = document.createElement('div'); menu.className = 'walkthrough-menu'; menu.append(restart, before, feature, process); more.append(moreToggle, menu);
  menu.addEventListener('click', event => { if (event.target.closest('button')) more.open = false; });
  const dismissMenu = event => { if (!more.contains(event.target)) more.open = false; };
  const escapeMenu = event => { if (event.key === 'Escape' && more.open) { more.open = false; moreToggle.focus(); } };
  document.addEventListener('click', dismissMenu); document.addEventListener('keydown', escapeMenu);
  next.className = 'walkthrough-primary'; start.className = 'walkthrough-primary'; retry.className = '';
  bar.append(title, badge, more);
  const checkpoint = document.createElement('robos-walkthrough-checkpoints'); checkpoint.className = 'walkthrough-checkpoint'; checkpoint.setAttribute('aria-live', 'polite');
  const stepActions = document.createElement('div'); stepActions.className = 'walkthrough-step-actions'; stepActions.append(start, resume, explain, retry, next);
  const error=document.createElement('p');error.className='walkthrough-error';error.setAttribute('role','alert');
  stage.append(bar,checkpoint,stepActions,error);
  await window.mountReviewChat?.();
  const dialog = document.createElement('dialog'); dialog.className = 'walkthrough-process';
  const heading = document.createElement('h3'); heading.textContent = 'Project demo process';
  const hint = document.createElement('p'); hint.textContent = 'Edit demo instructions, checkpoint intent, and the optional before-change walkthrough. Saving restarts the walkthrough at its beginning. The agent executable is configured separately on this workstation.';
  const editor = document.createElement('textarea'); editor.setAttribute('aria-label', 'Demo process JSON'); editor.rows = 18;
  const editorError = document.createElement('p'); editorError.setAttribute('role', 'alert');
  const save = button('Save process', 'Save process and reset walkthrough', async () => { try { const result = await window.api.saveDemoProcess(JSON.parse(editor.value)); if (!result.ok) throw new Error(result.error); render(result.state); dialog.close(); } catch (e) { editorError.textContent = e.message; } });
  dialog.append(heading, hint, editor, editorError, save, button('Cancel', 'Close without saving', () => dialog.close())); stage.append(dialog);
  let state;
  function button(text,label,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.title=label;b.addEventListener('click',fn);return b;}
  function render(value){
    if(!value)return;state=value;const busy=value.status==='running';
    if(value.persistenceError)error.textContent=value.persistenceError;
    resume.hidden=!value.restored||busy||value.index<0;
    const stepIndex = (value.walkthroughStatus||value.status) === 'error' ? (value.failedIndex ?? Math.max(0, value.index)) : value.index;
    const lastStep = stepIndex >= value.total - 1;
    badge.textContent = value.reviewChatActive ? (value.index<0?'Walkthrough not started':`Step ${value.index+1} of ${value.total}`) : busy ? 'In progress' : value.status === 'paused' ? lastStep ? 'Walkthrough complete' : `Step ${value.index + 1} of ${value.total}` : (value.walkthroughStatus||value.status) === 'error' ? `Step ${stepIndex + 1} of ${value.total} · Check incomplete` : `Ready · ${value.total} ${value.total===1?'step':'steps'}`;
    start.hidden = busy || value.index >= 0 || (value.walkthroughStatus||value.status) === 'error'; start.disabled = busy;
    restart.hidden = value.messages.length === 0; restart.disabled = busy;
    before.hidden = !value.process.before || value.mode === 'before'; before.disabled = busy;
    feature.hidden = value.mode !== 'before'; feature.disabled = busy;
    more.hidden = busy; if (busy) more.open = false;
    explain.hidden = busy || value.index < 0; explain.disabled = busy || value.index < 0;
    next.hidden = busy || !['paused', 'error'].includes(value.status) || lastStep;
    next.disabled = busy;
    next.textContent = (value.walkthroughStatus||value.status) === 'error' ? `Continue to step ${stepIndex + 2} →` : `Next step: ${(value.mode === 'before' ? value.process.before?.checkpoints : value.process.checkpoints)?.[value.index + 1]?.title || 'Continue'} →`;
    retry.hidden = value.status !== 'error'; process.disabled = busy;
    checkpoint.replaceChildren();
    const c = value.checkpoint;
    const heading=document.createElement('h2');heading.textContent=value.process.template?.name||'Review the change';checkpoint.append(heading);
    if(value.process.template)heading.title=value.process.template.id;
    const intro=document.createElement('p');intro.className='walkthrough-intro';intro.textContent='We’ll prepare the app, then pause at each step so you can try it yourself.';checkpoint.append(intro);
    if(c){
      const current=document.createElement('section');current.className='walkthrough-current';
      const label=document.createElement('span');label.className='walkthrough-eyebrow';label.textContent=`CURRENT STEP · ${stepIndex+1} OF ${value.total}`;
      const h=document.createElement('h3');h.textContent=c.title;
      const p=document.createElement('p');p.textContent=busy&&!value.reviewChatActive?'Preparing this step…':value.guidance||c.when;
      current.append(label,h,p);checkpoint.append(current);
      if(value.baseline){const note=document.createElement('p');note.textContent=`Before the change · ${value.baseline.ref} · ${value.baseline.revision.slice(0,8)}`;checkpoint.append(note);}
    }
    const list=document.createElement('ol');list.className='walkthrough-steps';list.setAttribute('aria-label','Walkthrough steps');
    const steps=value.mode==='before'?value.process.before.checkpoints:value.process.checkpoints;
    steps.forEach((step,i)=>{
      const item=document.createElement('li');
      if(i===stepIndex)item.setAttribute('aria-current','step');
      const number=document.createElement('span');number.className='walkthrough-step-number';number.textContent=String(i+1);number.setAttribute('aria-hidden','true');
      const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=step.title;
      const body=document.createElement(step.steps?.length?'div':'dl');
      for(const [label,text] of [['Before you start',step.given],['What to do',step.when],['What to check',step.then]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=text;body.append(dt,dd);}
      if(step.steps?.length){
        const actions=document.createElement('ol');actions.className='walkthrough-action-list';
        for(const action of step.steps){
          const li=document.createElement('li'),text=document.createElement('p');text.textContent=action.instruction;li.append(text);
          if(action.command){const location=document.createElement('small');location.textContent='Bash · '+action.cwd;const pre=document.createElement('pre'),code=document.createElement('code');code.textContent=action.command;pre.append(code);li.append(location,pre);}
          if(action.expected){const expected=document.createElement('p');expected.className='walkthrough-expected';expected.textContent='Check: '+action.expected;li.append(expected);}actions.append(li);
        }
        body.replaceChildren();body.append(actions);
      }
      details.append(summary,body);item.append(number,details);list.append(item);
    });checkpoint.append(list);
    if ((value.walkthroughStatus||value.status) === 'error') { const reason = document.createElement('p'); reason.className = 'walkthrough-blocker'; reason.textContent = (value.messages.filter(m => m.kind !== 'progress' && m.role !== 'user').at(-1)?.text || 'This step could not be verified.') + (lastStep ? ' You can recheck or open Suggest Changes.' : ' Recheck this step, open Suggest Changes, or continue with this check marked unverified.'); checkpoint.append(reason); }
    if (value.status === 'paused' && lastStep) { const done = document.createElement('p'); done.textContent = 'You’ve reached the end of this walkthrough. Use Suggest Changes to request edits, or use More to start over. This does not approve or merge the PR.'; checkpoint.append(done); }
  }
  async function act(action, text) { error.textContent = ''; try { const result = await window.api.demoAction({ action, text }); if (!result.ok) throw new Error(result.error); render(result.state); return true; } catch (e) { error.textContent = e.message; return false; } }
  const unsubscribe=window.api.onDemoState(render);
  window.cleanupWalkthrough=()=>{unsubscribe?.();document.removeEventListener('click',dismissMenu);document.removeEventListener('keydown',escapeMenu);};
  render(await window.api.getDemoState());
};
