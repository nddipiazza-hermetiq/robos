'use strict';
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
function repositories(server){
 const rows=server.repos?.length?server.repos:[{org:server.gh_org,repo:server.gh_repo}];
 const repos=rows.map(r=>r.org+'/'+r.repo).filter(r=>/^[\w.-]+\/[\w.-]+$/.test(r)&&!r.includes('undefined'));
 if(!repos.length)throw Error('Choose a repository in Task Servers.');return [...new Set(repos)];
}
async function list(server,filter={},run=async args=>(await promisify(execFile)('gh',args,{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024})).stdout){
 const groups=await Promise.all(repositories(server).map(async repo=>{
  const args=['issue','list','--repo',repo,'--limit','200','--state',filter.state||'open','--json','number,title,state,labels,assignees,updatedAt,body,url'];
  if(filter.assignee)args.push('--assignee',filter.assignee);if(filter.label)args.push('--label',filter.label);
  return JSON.parse(await run(args)).map(i=>({key:'#'+i.number,number:i.number,title:i.title,body:i.body||'',status:i.state,labels:(i.labels||[]).map(l=>typeof l==='string'?l:l.name),assignee:i.assignees?.[0]?.login||null,updated:i.updatedAt,repo,url:i.url||`https://github.com/${repo}/issues/${i.number}`}));
 }));return groups.flat();
}
module.exports={repositories,list};
