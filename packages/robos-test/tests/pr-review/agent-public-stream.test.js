'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {AgentPublicStream}=require('../../../robos-lib/agent-public-stream');
test('split events stream public narration before completion, never reasoning or tool payloads',()=>{
 const updates=[];const s=new AgentPublicStream('codex',u=>updates.push(u));
 const line=JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Checking the connector.'}})+'\n';s.push(Buffer.from(line.slice(0,25)));assert.equal(updates.length,0);s.push(Buffer.from(line.slice(25)));assert.equal(updates[0].text,'Checking the connector.');
 s.push(Buffer.from(JSON.stringify({type:'item.completed',item:{type:'reasoning',text:'private'}})+'\n'));
 s.push(Buffer.from(JSON.stringify({type:'item.started',item:{type:'command_execution',command:'secret command'}})+'\n'));
 assert.equal(updates.length,2);assert.doesNotMatch(JSON.stringify(updates),/private|secret/);assert.equal(s.end(),'Checking the connector.');
});
test('Claude preserves final result and ignores thinking content',()=>{
 const updates=[];const s=new AgentPublicStream('claude',u=>updates.push(u));
 for(const event of [{type:'assistant',message:{content:[{type:'thinking',thinking:'private'},{type:'text',text:'Opening the app.'}]}},{type:'result',result:'Final reply'}])s.push(Buffer.from(JSON.stringify(event)+'\n'));
 assert.equal(updates.length,1);assert.equal(s.end(),'Final reply');
});
test('provider failures are not successful final replies',()=>{
 const s=new AgentPublicStream('claude',()=>{});assert.throws(()=>s.push(Buffer.from('{"type":"result","is_error":true,"result":"Login required"}\n')),/Login required/);
});
