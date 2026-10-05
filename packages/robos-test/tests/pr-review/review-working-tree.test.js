'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {statusArgs,hasSourceChanges}=require('../../../pr-review/lib/review-working-tree');
test('generated evidence does not block publication; other untracked and tracked files do',()=>{
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'review-status-'));
 const git=args=>execFileSync('git',args,{cwd,encoding:'utf8'});
 git(['init','-q']);fs.mkdirSync(path.join(cwd,'.robos/task-evidence/task'),{recursive:true});fs.writeFileSync(path.join(cwd,'.robos/task-evidence/task/bundle.json'),'{}');
 assert.equal(hasSourceChanges(git(statusArgs)),false);
 fs.writeFileSync(path.join(cwd,'.robos/source.js'),'source');assert.equal(hasSourceChanges(git(statusArgs)),true);
 assert.equal(hasSourceChanges(' M .robos/task-evidence/task/bundle.json'),true);
 assert.equal(hasSourceChanges('A  .robos/task-evidence/task/bundle.json'),true);
 assert.equal(hasSourceChanges('?? src/new.js'),true);
});
