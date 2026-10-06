'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createDefaultWorkflow} = require('./default-workflow');
const {WORK_ITEM_TYPES, statusBucket} = require('../robos-task-client/work-item');
const {validateDocument} = require('../robos-graph/lib/graph-workspace');
const root = path.resolve(__dirname, '../..');
const node = JSON.parse(fs.readFileSync(path.join(__dirname,'default-workflow.jsonld')));
test('default has the seven agreed stages and valid reachable transitions', () => {
 const w=createDefaultWorkflow('task');
 assert.deepEqual(w.states.map(s=>s.label), ['Not started','Designed','Agent implementing','Local evidence review','Draft PR pipeline review','Human review','Closed']);
 assert.deepEqual(w.states.filter(s=>s.is_initial).map(s=>s.id), ['not-started']);
 assert.deepEqual(w.states.filter(s=>s.is_final).map(s=>s.id), ['closed']);
 const ids=w.states.map(s=>s.id);
 for(const t of w.transitions)assert.ok(ids.includes(t.from)&&ids.includes(t.to));
 for(let i=1;i<ids.length;i++)assert.ok(w.transitions.some(t=>t.from===ids[i-1]&&t.to===ids[i]));
 w.states[0].label='Custom';assert.equal(createDefaultWorkflow('bug').states[0].label,'Not started');
});
test('graph default and shipped runtime definition match and validate',()=>{
 const {'@context':context,...definition}=node;
 for(const file of ['.robos/kgraphs/organization/package.jsonld','.robos/knowledge-graph.jsonld']){
  const doc=JSON.parse(fs.readFileSync(path.join(root,file)));
  assert.deepEqual(doc['robos:nodes'].find(n=>n['@id']===node['@id']),definition);
 }
 const report=validateDocument({'@context':context,'robos:nodes':[definition]});
 assert.equal(report.conforms,true,JSON.stringify(report.errors));
});
test('work item defaults share the workflow and active stages are in progress',()=>{
 const ids=createDefaultWorkflow('task').states.map(s=>s.id);
 for(const kind of ['epic','story','bug'])assert.deepEqual(WORK_ITEM_TYPES[kind].defaultWorkflow,ids);
 for(const id of ids.slice(2,6))assert.equal(statusBucket(id),'in_progress');
 assert.equal(statusBucket('closed'),'done');
});
