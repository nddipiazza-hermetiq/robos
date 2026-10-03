'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readHelp,helpPrompt}=require('../../../robos-lib/agent-question-help');
test('help context includes questionnaire and unsent answers without submitting',()=>{
 const item={id:'abc',context:'Browser unavailable',questions:[{id:'q0',prompt:'Which connection?'}],answers:{q0:'old'},helpDraft:{q0:'local Chrome'},status:'pending'};
 const context=readHelp(['--questionnaire-help=abc'],{read:id=>{assert.equal(id,'abc');return item;}});
 assert.equal(context.answers.q0,'local Chrome');assert.equal(item.status,'pending');
 const prompt=helpPrompt(context,'What does connection mean?');assert.match(prompt,/Browser unavailable/);assert.match(prompt,/local Chrome/);assert.match(prompt,/What does connection mean/);assert.match(prompt,/do not run commands/);
 assert.equal(readHelp([],{read:()=>assert.fail()}),null);
});
