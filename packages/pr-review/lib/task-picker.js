'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createHash}=require('node:crypto');
const defaultRoot=path.join(os.homedir(),'.robos','local-reviews');
const identity=value=>createHash('sha256').update(value).digest('hex').slice(0,16);
const isEpic=task=>(task.labels||[]).some(l=>/^epic$/i.test(typeof l==='string'?l:l.name))||/^epic\b/i.test(task.type||'');
function savedTasks(root=defaultRoot){
 const rows=[];if(!fs.existsSync(root))return rows;
 for(const entry of fs.readdirSync(root,{withFileTypes:true})){
  if(!entry.isDirectory())continue;const manifest=path.join(root,entry.name,'review.json');
  try{const review=JSON.parse(fs.readFileSync(manifest,'utf8')),task=review.task||{};if(isEpic(task))continue;
   rows.push({id:identity(manifest),title:task.title||review.title,url:task.url||'',repo:review.repo||'',workspace:review.workspace,manifest,task,updatedAt:fs.statSync(manifest).mtime.toISOString(),available:!!review.workspace&&fs.existsSync(review.workspace),saved:true,branch:review.pullRequest?.headRefName||''});
  }catch{/* An incomplete manifest must not hide other reviews. */}
 }
 return rows.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
async function listTasks({root=defaultRoot,server,remote=false,gh=require('../../dev-central/lib/pull-requests').run}={}){
 const rows=savedTasks(root);let warning='';
 if(remote&&server?.type==='github'){
  const repos=server.repos?.length?server.repos:(server.gh_org&&server.gh_repo?[{org:server.gh_org,repo:server.gh_repo}]:[]);
  const outcomes=await Promise.allSettled(repos.map(async item=>{
   const repo=item.org+'/'+item.repo;
   const tasks=JSON.parse(await gh(['issue','list','--repo',repo,'--state','open','--limit','100','--json','number,title,url,body,labels,updatedAt']));
   return {repo,tasks};
  }));
  for(const outcome of outcomes){
   if(outcome.status==='rejected'){warning='Some tasks could not be loaded from GitHub. Saved reviews are still available.';continue;}
   const {repo,tasks}=outcome.value;
   for(const task of tasks){if(isEpic(task)||rows.some(row=>row.url===task.url))continue;rows.push({id:identity(task.url),title:task.title,url:task.url,repo,task,updatedAt:task.updatedAt,saved:false,available:true});}
  }
 }else if(remote&&server&&server.type!=='github')warning='Saved reviews are shown. Loading new tasks from this task server is not supported yet.';
 return {rows,warning};
}
module.exports={savedTasks,listTasks};
