'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {evidenceSection,implementationInstructions}=require('../../../robos-lib/task-evidence');
const {readPlan,selectionPrompt,EvidencePlanner}=require('../../../pr-review/lib/evidence-plan');
test('planned evidence survives in task body without taking later sections',()=>{
 const body='Task\n## Evidence plan\nM05: actual MCP transcript.\n## Scope\nNo deployment.';
 assert.equal(evidenceSection(body),'M05: actual MCP transcript.');assert.match(implementationInstructions({body}),/Follow the task’s chosen evidence plan/);assert.match(implementationInstructions({}),/No evidence plan was supplied/);
});
test('explicit task evidence takes precedence over cached AI suggestions',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'evidence-test-'));fs.writeFileSync(path.join(directory,'evidence-plan.json'),JSON.stringify({markdown:'AI guess'}));
 const review={summary:'## Evidence plan\nShow actual MCP responses.'};assert.equal(readPlan(review,{directory}).source,'task-plan');assert.equal(readPlan(review,{directory}).markdown,'Show actual MCP responses.');
});
test('fallback prompt uses real inventory and distinguishes recommendations from proof',()=>{
 const prompt=selectionPrompt({title:'M05 cache trends',changedFiles:['mcp.go'],workspace:'/tmp/lab'},{evidence:[{id:'abc',label:'captured response'}]});assert.match(prompt,/M05 cache trends/);assert.match(prompt,/captured response/);assert.match(prompt,/do not run tests/);assert.match(prompt,/selectedEvidence/);
});
test('missing configured agent fails visibly instead of producing invented evidence',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'evidence-test-'));const planner=new EvidencePlanner({title:'test'},{directory});await assert.rejects(planner.recommend(),/Configure a Codex/);
});
test('AI selection is saved once, never converted to verified evidence',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'evidence-run-'));const script=path.join(directory,'agent');
 fs.writeFileSync(script,'#!/usr/bin/env node\nconst fs=require("fs");const out=process.argv[process.argv.indexOf("--output-last-message")+1];process.stdin.resume();process.stdin.on("end",()=>fs.writeFileSync(out,JSON.stringify({templateId:"urn:robos:evidence-template:mcp-response:v1",newTemplateJson:"",markdown:"M05: compare actual MCP calls.",selectedEvidence:[],missing:["Live model exchange"]})));',{mode:0o700});
 const planner=new EvidencePlanner({workspace:directory,head:'abc',title:'M05',demoAgent:{command:script,args:['exec'],timeoutMs:2000}},{directory});
 const [a,b]=await Promise.all([planner.recommend(),planner.recommend()]);assert.deepEqual(a,b);assert.equal(a.source,'ai-recommendation');assert.equal(a.verified,undefined);assert.equal(planner.get().missing[0],'Live model exchange');
 assert.equal(readPlan({head:'new'},{directory}),null);
});
test('resolves task-implementer template references without accepting unknown IDs',()=>{
 const {readPlan}=require('../../../pr-review/lib/evidence-plan');
 const review={evidencePlan:{markdown:'Check connector',template:{id:'urn:robos:evidence-template:connector-setup:v1',name:'Connector setup'}}};
 assert.equal(readPlan(review,null).template['@type'],'robos:EvidenceTemplate');
 review.evidencePlan.template.id='urn:robos:evidence-template:unknown:v1';
 assert.throws(()=>readPlan(review,null),/Unknown evidence template/);
});
