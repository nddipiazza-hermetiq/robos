'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const templates=require('../../../robos-lib/evidence-templates');
const {bindTemplate,readBundle}=require('../../../robos-lib/evidence-bundle');
const {run}=require('../../../robos-lib/evidence-template-cli');
const {SHACLValidator}=require('../../../robos-graph/lib/shacl-validator');
const {EvidenceRunner,validateResult}=require('../../../pr-review/lib/evidence-runner');
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'robos-template-'));
const git=(dir,...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8'}).trim();
const fixture=()=>{const dir=temporary();git(dir,'init','-q');git(dir,'-c','user.name=Test','-c','user.email=test@example.test','commit','--allow-empty','-qm','baseline');return dir;};
test('templates are schema elements; custom definitions persist in KGraph with immutable IDs',()=>{
 const root=temporary(),template={...templates.BUILTIN[0],'@id':'urn:robos:evidence-template:custom:v1','dcterms:title':'Service handshake'};
 assert.equal(new SHACLValidator().validate(template).conforms,true);
 const bad={...template};delete bad['robos:webElement'];assert.equal(new SHACLValidator().validate(bad).conforms,false);
 assert.throws(()=>templates.validateTemplate({...template,'robos:webElement':'script'}),/registered/);
 templates.registerTemplate(template,root);assert.equal(templates.listTemplates(root).find(t=>t['@id']===template['@id'])['dcterms:title'],'Service handshake');
 templates.registerTemplate(template,root);
 assert.throws(()=>templates.registerTemplate({...template,'dcterms:title':'Different'},root),/immutable/);
 const graph=new (require('../../../robos-graph/lib/graph-workspace').GraphWorkspace)(root).read();assert.equal(graph['robos:nodes'][0]['robos:package'],'testing');
});
test('collect creates a populated template and blocks missing required slots',()=>{
 const dir=fixture(),template=templates.BUILTIN[0];fs.writeFileSync(path.join(dir,'request.txt'),'actual call');
 const result={summary:'Read tool',questions:[],scenarios:[{id:'a',status:'passed',summary:'Received response',artifacts:['request.txt']}],templateArtifacts:[{scenarioId:'a',slotId:'request',path:'request.txt'}]};
 fs.writeFileSync(path.join(dir,'template.json'),JSON.stringify(template));fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result));
 const file=path.join(dir,'bundle.json');run(['collect','--template',path.join(dir,'template.json'),'--result',path.join(dir,'result.json'),'--workspace',dir,'--output',file]);
 const bundle=readBundle(file,git(dir,'rev-parse','HEAD'));assert.equal(bundle.status,'needs-attention');assert.equal(bundle.scenarios[0].status,'blocked');assert.deepEqual(bundle.scenarios[0].missingSlots,['before','after']);assert.equal(bundle.artifacts[0].verified,false);
 result.templateArtifacts[0].slotId='invented';assert.throws(()=>bindTemplate(template,result,validateResult(result,dir,'head'),dir),/Invalid template/);
});
test('implementation bundle reaches review; changed files and revisions invalidate proof',()=>{
 const dir=fixture(),template=templates.BUILTIN[3];fs.writeFileSync(path.join(dir,'actual.txt'),'actual observed output');
 const result={summary:'Checked',questions:[],scenarios:[{id:'a',status:'passed',summary:'Observed output',artifacts:['actual.txt']}],templateArtifacts:[{scenarioId:'a',slotId:'result',path:'actual.txt'}]};
 fs.writeFileSync(path.join(dir,'template.json'),JSON.stringify(template));fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result));const file=path.join(dir,'bundle.json');
 run(['collect','--template',path.join(dir,'template.json'),'--result',path.join(dir,'result.json'),'--workspace',dir,'--output',file]);
 const head=git(dir,'rev-parse','HEAD');const runner=new EvidenceRunner({head,evidenceBundlePath:file},{directory:dir});assert.equal(runner.state().template['@id'],template['@id']);assert.equal(runner.state().status,'completed');
 assert.equal(readBundle(file,'other-head').status,'needs-attention');fs.writeFileSync(path.join(dir,'actual.txt'),'changed');assert.equal(readBundle(file,head).scenarios[0].status,'blocked');
});
test('task review automatically loads the implementation delivery paths',()=>{
 const workspace=fixture();git(workspace,'remote','add','origin','https://github.com/test/repo.git');git(workspace,'update-ref','refs/remotes/origin/main','HEAD');git(workspace,'symbolic-ref','refs/remotes/origin/HEAD','refs/remotes/origin/main');git(workspace,'checkout','-qb','codex/task');
 const task={url:'https://github.com/test/issues/1',title:'Demo task'};const dir=templates.taskEvidenceDirectory(workspace,task);fs.mkdirSync(dir,{recursive:true});for(const file of ['template.json','evidence-plan.json','bundle.json'])fs.writeFileSync(path.join(dir,file),'{}');
 const manifest=require('../../../pr-review/lib/prepare-local-review').prepareLocalReview(workspace,task,temporary());const review=JSON.parse(fs.readFileSync(manifest));assert.equal(review.evidenceBundlePath,path.join(dir,'bundle.json'));assert.equal(review.evidenceTemplatePath,path.join(dir,'template.json'));
 assert.match(require('../../../robos-lib/task-evidence').implementationInstructions(task),/Do not stop after choosing a template/);
});
