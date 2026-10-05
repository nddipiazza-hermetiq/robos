'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const templates=require('../../../robos-lib/walkthrough-templates');
test('connector walkthrough checks local URL before live client authentication',()=>{
 const t=templates.BUILTIN.find(t=>t['@id'].includes('claude-connector'));
 const p=templates.instantiate(t,{title:'Fix connector setup'});
 assert.equal(p.template.id,t['@id']);assert.equal(p.checkpoints.length,4);
 assert.match(p.checkpoints[1].when,/clipboard|copied URL/);
 assert.match(p.checkpoints[2].when,/cannot reach localhost/);
 assert.match(p.checkpoints[2].then,/blocked, not passed/);
 p.checkpoints[0].title='Changed';assert.notEqual(t['robos:checkpoints'][0].title,'Changed');
});
test('registry persists custom walkthroughs and rejects mutation or executable components',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'walkthrough-registry-'));
 const t=structuredClone(templates.BUILTIN[0]);t['@id']='urn:robos:walkthrough-template:custom:v1';
 templates.registerTemplate(t,root);assert.ok(templates.listTemplates(root).some(n=>n['@id']===t['@id']));
 assert.doesNotThrow(()=>templates.registerTemplate(t,root));
 assert.throws(()=>templates.registerTemplate({...t,'dcterms:title':'Changed'},root),/immutable/);
 assert.throws(()=>templates.validateTemplate({...t,'robos:webElement':'script'}),/component/);
 assert.throws(()=>templates.validateTemplate({...t,'robos:checkpoints':[]}),/checkpoint/);
});
