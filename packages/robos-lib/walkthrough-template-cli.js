#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),templates=require('./walkthrough-templates');
function run(args){
 const command=args.shift(),flags={};while(args.length){const key=args.shift();if(!key.startsWith('--')||!args.length)throw Error('Use --name value arguments.');flags[key.slice(2)]=args.shift();}
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));let value;
 if(command==='list')value=templates.listTemplates(flags['graph-root']);
 else if(command==='register')value=templates.registerTemplate(read(flags.file),flags['graph-root']);
 else if(['select','instantiate'].includes(command)){
  const t=templates.listTemplates(flags['graph-root']).find(t=>t['@id']===flags.template);if(!t)throw Error('Unknown walkthrough template.');
  value=command==='select'?t:templates.instantiate(t,flags.task?read(flags.task):{});
 }else throw Error('Use list, register --file FILE, select --template ID, or instantiate --template ID --task FILE --output FILE.');
 if(flags.output){fs.mkdirSync(path.dirname(path.resolve(flags.output)),{recursive:true});fs.writeFileSync(flags.output,JSON.stringify(value,null,2)+'\n',{mode:0o600});}else console.log(JSON.stringify(value,null,2));return value;
}
if(require.main===module)try{run(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}
module.exports={run};
