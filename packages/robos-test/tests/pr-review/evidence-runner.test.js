'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {EvidenceRunner,validateResult}=require('../../../pr-review/lib/evidence-runner');
test('passed evidence must exist within this run, including symlink checks',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'proof-check-'));fs.writeFileSync(path.join(root,'call.json'),'{}');
 const r={summary:'done',scenarios:[{id:'M05',status:'passed',artifacts:['call.json']}]};assert.equal(validateResult(r,root,'head')[0].verified,true);
 r.scenarios[0].artifacts=[];assert.throws(()=>validateResult(r,root,'head'),/without captured/);
 r.scenarios[0].artifacts=['missing'];assert.throws(()=>validateResult(r,root,'head'));
 fs.symlinkSync('/etc/hosts',path.join(root,'outside'));r.scenarios[0].artifacts=['outside'];assert.throws(()=>validateResult(r,root,'head'),/outside/);
});
test('runner executes a real child, registers captured files, streams progress and blocks omitted scenarios',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'proof-run-'));execFileSync('git',['init','-q',dir]);execFileSync('git',['-C',dir,'-c','user.name=Test','-c','user.email=test@example.test','commit','--allow-empty','-qm','baseline']);
 const script=path.join(dir,'agent');fs.writeFileSync(script,`#!/usr/bin/env node
const fs=require('fs'),path=require('path');const out=process.argv[process.argv.indexOf('--output-last-message')+1];process.stdin.resume();process.stdin.on('end',()=>{console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Calling the local MCP server.'}}));fs.writeFileSync(path.join(path.dirname(out),'actual.txt'),'actual test child output');fs.writeFileSync(out,JSON.stringify({summary:'M05 checked; M06 unavailable',questions:[],scenarios:[{id:'M05',status:'passed',summary:'Observed response',artifacts:['actual.txt']}]}));});`,{mode:0o700});
 const runner=new EvidenceRunner({workspace:dir,demoAgent:{command:script,args:['exec'],evidenceTimeoutMs:2000}},{directory:dir});
 const finished=new Promise(resolve=>runner.on('state',s=>{if(s.status!=='running')resolve(s);}));runner.start({markdown:'M05 and M06'});assert.throws(()=>runner.start({markdown:'M05'}),/already/);const s=await finished;
 assert.equal(s.status,'needs-attention');assert.equal(s.scenarios[1].status,'blocked');assert.match(s.progress[0].text,/Calling/);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'evidence','index.json'))).evidence.length,1);
});
