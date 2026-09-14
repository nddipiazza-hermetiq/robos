'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawn } = require('node:child_process');
const { _electron: electron } = require('playwright-core');
const { GraphWorkspace, hash } = require('../../../robos-graph/lib/graph-workspace');
test('readable brief and reviewed changes use real workspace IPC', {timeout:90000}, async () => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'readable-review-')), ws=new GraphWorkspace(root);
 const proof=process.env.ROBOS_GRAPH_PROOF_ROOT; assert.ok(proof); fs.mkdirSync(proof,{recursive:true});
 const document=ws.empty('Review usability test');
 document['robos:nodes']=[{'@id':'urn:example:project:editor','@type':['robos:Project'],'robos:package':'organization','dcterms:title':'Configuration Editor','dcterms:description':'Review configuration before rollout.','robos:evidence':[{repository:'example/editor',path:'src/editor.js',line:12,revision:'working-tree',workingTreeStatus:'modified'}]}];
 document['robos:nodes'][0]['robos:status']='draft';
 ws.apply(ws.propose({mode:'replace',document})); const baseline=hash(ws.read());
 const edits=path.join(root,'edits.json'); fs.writeFileSync(edits,JSON.stringify({edits:[{op:'update',id:'urn:example:project:editor',set:{'dcterms:description':'Review configuration and show validation before rollout.'}}]}));
 const recording=spawn('ffmpeg',['-loglevel','error','-y','-f','x11grab','-video_size','1920x1080','-framerate','15','-i',process.env.DISPLAY,'-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','8',path.join(proof,'readable-review.webm')],{stdio:['pipe','ignore','pipe']});
 const started=Date.now(),captions=[]; let app;
 async function cue(page,selector,text) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.evaluate(({selector,text})=>{document.getElementById('review-callout')?.remove();const target=document.querySelector(selector),r=target.getBoundingClientRect(),e=document.createElement('div');e.id='review-callout';e.textContent=text;e.style.cssText=`position:fixed;left:${Math.max(10,r.left)}px;top:${Math.min(innerHeight-80,r.bottom+8)}px;max-width:650px;background:#17424e;color:white;padding:12px;z-index:9999;pointer-events:none;border:2px solid #00bcd4`;document.querySelector('dialog').append(e);}, {selector,text});
  captions.push({time:(Date.now()-started)/1000,text}); await page.waitForTimeout(1500);
 }
 try {
  app=await electron.launch({executablePath:process.env.ELECTRON_BIN,args:[path.resolve(__dirname,'../../../robos-graph/main.js'),'--no-sandbox','--disable-gpu'],env:{...process.env,ROBOS_GRAPH_ROOT:root,ROBOS_TEST:'1'}});
  const page=await app.firstWindow();await page.locator('#btn-workspace-review').click();
  await cue(page,'#workspace-prompt','Describe the correction in plain language.');await page.locator('#workspace-prompt').fill('Explain the configuration validation flow.');
  await cue(page,'#workspace-context','Prepare a readable brief with source evidence.');await page.locator('#workspace-context').click();
  await page.locator('#workspace-context-output h3').waitFor({timeout:5000});
  assert.match(await page.locator('#workspace-context-output').innerText(),/Configuration Editor/);
  assert.equal(await page.locator('#workspace-context-output pre:visible').count(),0);
  await cue(page,'#workspace-context-output .review-card details:first-of-type > summary','Open source evidence to inspect repository, file and revision.');
  await page.locator('#workspace-context-output .review-card summary').first().click();
  assert.match(await page.locator('#workspace-context-output').innerText(),/src\/editor.js/);
  await page.evaluate(()=>document.getElementById('review-callout')?.remove());
  await page.screenshot({path:path.join(proof,'brief.png')});
  await page.locator('#workspace-manual > summary').click();await page.locator('#workspace-file').setInputFiles(edits);
  await cue(page,'#workspace-propose','Preview imported edits without changing the saved graph.');await page.locator('#workspace-propose').click();
  await page.locator('#workspace-apply:not([disabled])').waitFor();assert.equal(hash(ws.read()),baseline);
  await cue(page,'#workspace-diff','Review readable before and after values. Raw JSON stays collapsed.');
  assert.equal(await page.locator('#workspace-diff pre:visible').count(),0);assert.equal(await page.locator('.review-comparison').count(),1);
  await page.evaluate(()=>{document.getElementById('review-callout')?.remove();document.getElementById('workspace-context-details').open=false;document.getElementById('workspace-manual').open=false;});
  await page.locator('#workspace-diff').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(proof,'changes.png')});
  await cue(page,'#workspace-apply','Save this reviewed change in the isolated test workspace.');await page.locator('#workspace-apply').click();
  await page.locator('#workspace-status').filter({hasText:'Saved revision'}).waitFor();assert.notEqual(hash(ws.read()),baseline);
  assert.equal(ws.read()['robos:nodes'][0]['dcterms:description'],'Review configuration and show validation before rollout.');
  await page.locator('#workspace-scope').fill('no-such-record');await page.locator('#workspace-context').click();
  await page.getByText('No matching records. Try a broader title or an exact node ID.').waitFor();
 } finally {
  if(app)await app.close();recording.stdin.write('q');await new Promise(r=>recording.on('close',r));
  const time=s=>new Date(s*1000).toISOString().slice(11,23);fs.writeFileSync(path.join(proof,'readable-review.vtt'),'WEBVTT\n\n'+captions.map((c,i)=>`${i+1}\n${time(c.time)} --> ${time(captions[i+1]?.time||(Date.now()-started)/1000)}\n${c.text}\n`).join('\n'));
 }
});
