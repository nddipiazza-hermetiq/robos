const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {detectAntigravity}=require('../../../robos-lib/existing-antigravity');
test('existing Antigravity configuration is detected without copying credentials or claiming authentication',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'robos-existing-cli-'));
 fs.mkdirSync(path.join(home,'.gemini','antigravity-cli'),{recursive:true});
 const file=path.join(home,'.gemini','antigravity-cli','settings.json');
 const original=JSON.stringify({modelProvider:'gemini',gateway:{credential:'private-test-marker'},model:{name:'existing-model'}});
 fs.writeFileSync(file,original);
 const result=detectAntigravity({home,version:()=> '0.53.0\n'});
 assert.equal(result.installed,true);assert.equal(result.authType,'Existing Gemini API provider');assert.equal(result.authenticated,false);
 assert.equal(fs.readFileSync(file,'utf8'),original);
 assert.ok(!JSON.stringify(result).includes('private-test-marker'));
});
test('missing CLI and missing settings produce no setup writes',()=>{
 const home=path.join(os.tmpdir(),'robos-absent-'+Date.now());
 const result=detectAntigravity({home,version:()=>{throw Error('missing')}});
 assert.equal(result.installed,false);assert.equal(fs.existsSync(home),false);
});
