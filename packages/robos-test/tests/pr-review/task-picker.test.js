const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {listTasks}=require('../../../pr-review/lib/task-picker');
test('saved reviews survive offline loading, deduplicate tracker tasks and flag missing checkouts',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'review-picker-'));const dir=path.join(root,'saved');fs.mkdirSync(dir);const url='https://github.com/org/tasks/issues/142';fs.writeFileSync(path.join(dir,'review.json'),JSON.stringify({title:'Connector setup',repo:'org/code',workspace:path.join(root,'missing'),task:{url,title:'Connector setup'}}));
 const server={type:'github',repos:[{org:'org',repo:'tasks'}]};const gh=async()=>JSON.stringify([{title:'Same task',url,labels:[]},{title:'Next task',url:'https://github.com/org/tasks/issues/143',labels:[]},{title:'Epic',url:'https://github.com/org/tasks/issues/141',labels:[{name:'epic'}]}]);
 const result=await listTasks({root,server,remote:true,gh});assert.equal(result.rows.length,2);assert.equal(result.rows[0].title,'Connector setup');assert.equal(result.rows[0].available,false);assert.equal(result.rows[1].saved,false);
 const offline=await listTasks({root,server,remote:true,gh:async()=>{throw Error('offline');}});assert.equal(offline.rows.length,1);assert.match(offline.warning,/Saved reviews/);
});
test('closing a review opens the picker; the checks-tab action keeps its existing navigation',async()=>{
 const vm=require('node:vm');const source=fs.readFileSync(path.resolve(__dirname,'../../../pr-review/renderer/app.js'),'utf8');
 const fn=source.match(/window\.exitTheater = async function\(\) \{[\s\S]*?\n\};/)[0];let opened=false;
 const context={window:{api:{showTaskPicker:async()=>{opened=true;}}},showTheaterToast:()=>{throw Error('Unexpected error');}};vm.runInNewContext(fn,context);await context.window.exitTheater();assert.equal(opened,true);
 const checks=source.match(/window\.switchToMainChecksTab = function\(\) \{[\s\S]*?\n\};/)[0];assert.doesNotMatch(checks,/exitTheater/);
});
