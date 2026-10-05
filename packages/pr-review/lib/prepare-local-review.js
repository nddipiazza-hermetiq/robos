'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');const {execFileSync}=require('node:child_process');const {createHash}=require('node:crypto');
function prepareLocalReview(workspace,task={},root=path.join(os.homedir(),'.robos','local-reviews')) {
  const git=args=>execFileSync('git',['-C',workspace,...args],{encoding:'utf8'}).trim();
  const branch=git(['branch','--show-current']);if(!branch||['main','master'].includes(branch))throw new Error('Select the feature-branch checkout produced by Task Implementer.');
  const origin=git(['remote','get-url','origin']);const match=origin.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);if(!match)throw new Error('This review requires a GitHub origin.');
  const repo=match[1];let baseRef;try{baseRef=git(['symbolic-ref','--short','refs/remotes/origin/HEAD']);}catch{baseRef='origin/main';}git(['rev-parse','--verify',baseRef]);
  const id=createHash('sha256').update(workspace+'\n'+branch).digest('hex').slice(0,16);const dir=path.join(root,id);fs.mkdirSync(dir,{recursive:true,mode:0o700});const file=path.join(dir,'review.json');
  const evidenceDir=require('../../robos-lib/evidence-templates').taskEvidenceDirectory(workspace,task);
  const evidenceConfig={};
  for(const [key,name] of [['evidencePlanPath','evidence-plan.json'],['evidenceTemplatePath','template.json'],['evidenceBundlePath','bundle.json']])if(fs.existsSync(path.join(evidenceDir,name)))evidenceConfig[key]=path.join(evidenceDir,name);
  const walkthroughPath=path.join(evidenceDir,'walkthrough.json');
  if(fs.existsSync(walkthroughPath)){require('./demo-session').validateProcess(JSON.parse(fs.readFileSync(walkthroughPath,'utf8')));evidenceConfig.demoProcess=walkthroughPath;}
  if(fs.existsSync(file)){const saved=JSON.parse(fs.readFileSync(file,'utf8'));fs.writeFileSync(file,JSON.stringify({...saved,...evidenceConfig},null,2)+'\n',{mode:0o600});return file;}
  const processFile=path.join(dir,'demo.json');
  const walkthroughs=require('../../robos-lib/walkthrough-templates');
  if(!evidenceConfig.demoProcess)fs.writeFileSync(processFile,JSON.stringify(walkthroughs.instantiate(walkthroughs.BUILTIN.find(t=>t['@id']==='urn:robos:walkthrough-template:local-app:v2'),task),null,2)+'\n',{mode:0o600});
  const candidates=[process.env.ROBOS_CODEX_BIN,'/usr/lib/chatgpt/resources/codex',...(process.env.PATH||'').split(path.delimiter).map(p=>path.join(p,'codex'))].filter(Boolean);
  const command=candidates.find(p=>{try{fs.accessSync(p,fs.constants.X_OK);return true;}catch{return false;}});
  const config={...evidenceConfig,task,workspace,repo,title:task.title||branch,baseRef,summary:task.body||'',demoProcess:evidenceConfig.demoProcess||processFile};
  if(command)config.demoAgent={command,args:['exec','--json'],timeoutMs:600000};
  fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n',{mode:0o600});return file;
}
module.exports={prepareLocalReview};
