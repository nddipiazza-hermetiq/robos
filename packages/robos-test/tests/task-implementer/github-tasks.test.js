'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {repositories,list}=require('../../../task-implementer/lib/github-tasks');
test('uses configured repositories and keeps legacy server compatibility',()=>{
 assert.deepEqual(repositories({repos:[{org:'org',repo:'tasks'},{org:'org',repo:'tasks'}]}),['org/tasks']);
 assert.deepEqual(repositories({gh_org:'old',gh_repo:'tasks'}),['old/tasks']);
 assert.throws(()=>repositories({}),/Choose a repository/);
});
test('loads each repository and preserves task identity and filtering',async()=>{
 const calls=[];const tasks=await list({repos:[{org:'org',repo:'one'},{org:'org',repo:'two'}]},{state:'closed',label:'bug'},async args=>{calls.push(args);return JSON.stringify([{number:143,title:'Connector',state:'CLOSED',labels:[{name:'bug'}],body:'Details'}]);});
 assert.equal(tasks.length,2);assert.equal(tasks[1].url,'https://github.com/org/two/issues/143');assert.equal(tasks[0].body,'Details');assert.ok(calls.every(a=>a.includes('closed')&&a.includes('bug')));
});
