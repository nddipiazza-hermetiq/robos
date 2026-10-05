const {chromium}=require(process.env.ROBOS_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ROBOS_CHROMIUM_PATH,args:['--no-sandbox']});try{
 const page=await browser.newPage();await page.addInitScript(()=>{window.api={listReviewTasks:async remote=>({ok:true,tasks:[{id:'saved',title:'Connector setup',repo:'org/code',url:'https://github.com/org/tasks/issues/142',saved:true,available:true},{id:'new',title:'Cache trends',repo:'org/code',saved:false,available:true}],warning:remote?'GitHub is offline. Saved reviews are still available.':''}),openReviewTask:async id=>{window.selected=id;return {ok:true,canceled:id==='new'};}};});
 await page.goto('file://'+path.resolve(__dirname,'../../../pr-review/renderer/task-picker.html'));
 await page.getByRole('button',{name:'Open review: Connector setup'}).click();assert.equal(await page.evaluate(()=>window.selected),'saved');
 await page.getByLabel('Find a task').fill('142');assert.equal(await page.locator('.task-row').count(),1);
 await page.getByLabel('Find a task').fill('cache');await page.getByRole('button',{name:'Choose checkout: Cache trends'}).click();assert.equal(await page.locator('[role=status]').innerText(),'No checkout selected.');
 await page.getByLabel('Find a task').fill('nothing');assert.match(await page.locator('#task-list').innerText(),/No matching/);
 console.log('PASS: search, saved review selection, checkout selection and cancel.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
