const {chromium}=require(process.env.ROBOS_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const template=require('../../../robos-lib/evidence-templates').BUILTIN[0];
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ROBOS_CHROMIUM_PATH,args:['--no-sandbox']});try{
 const page=await browser.newPage();await page.setContent('<main></main>');await page.addScriptTag({path:path.resolve(__dirname,'../../../robos-ui/evidence-template.js')});
 await page.evaluate(template=>{const view=document.createElement(template['robos:webElement']);view.readArtifact=async()=>({ok:true,text:'<script>original MCP output</script>'});view.evidence={template,scenarios:[{id:'one',title:'Cache trend drill-down'}],artifacts:[{id:'actual',label:'Observed response',source:'Local sandbox'}],templateBindings:[{scenarioId:'one',slotId:'after',artifactId:'actual'}]};view.addEventListener('evidence-open',e=>window.opened=e.detail.id);document.querySelector('main').append(view);},template);
 assert.match(await page.locator('main').innerText(),/Evidence template used for this task: MCP request and response/);
 assert.equal(await page.getByText('Not captured yet',{exact:true}).count(),2);
 assert.equal(await page.locator('pre').textContent(),'<script>original MCP output</script>');assert.equal(await page.locator('main script').count(),0);
 await page.getByRole('button',{name:'Read after response: Cache trend drill-down'}).click();assert.equal(await page.evaluate(()=>window.opened),'actual');
 // A newly registered declarative template needs no application code changes.
 await page.evaluate(template=>{template['@id']='urn:robos:evidence-template:new:v1';template['dcterms:title']='Recorded handshake';template['robos:webElement']='robos-evidence-checks';template['robos:artifactSlots']=[{id:'handshake',name:'Handshake output',kind:'text',required:true}];const view=document.createElement(template['robos:webElement']);view.evidence={template,scenarios:[{id:'new',title:'Login'}]};document.querySelector('main').replaceChildren(view);},template);
 assert.match(await page.locator('main').innerText(),/Recorded handshake/);assert.match(await page.locator('main').innerText(),/Handshake output/);
 console.log('PASS: template component renders recorded text, missing slots, artifact actions and new declarative layouts.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
