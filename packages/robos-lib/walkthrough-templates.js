'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {GraphWorkspace}=require('../robos-graph/lib/graph-workspace');
const BUILTIN=require('./walkthrough-templates/builtin.json');
function validateTemplate(t){
 if(!t||t['@type']!=='robos:WalkthroughTemplate'||!/^urn:robos:walkthrough-template:[a-z0-9:-]+$/.test(t['@id']||''))throw Error('Walkthrough template requires a versioned ID and robos:WalkthroughTemplate type.');
 if(typeof t['robos:instructions']!=='string'||!t['robos:instructions'].trim())throw Error('Walkthrough requires instructions.');
 if(!Number.isInteger(t['robos:version'])||t['robos:version']<1)throw Error('Invalid walkthrough version.');
 if(typeof t['dcterms:title']!=='string'||!t['dcterms:title'].trim())throw Error('Walkthrough requires a name.');
 if(t['robos:webElement']!=='robos-walkthrough-checkpoints')throw Error('Unknown walkthrough component.');
 require('../pr-review/lib/demo-session').validateProcess({instructions:t['robos:instructions'],checkpoints:t['robos:checkpoints']});
 return t;
}
function registry(root){return new GraphWorkspace(root||process.env.ROBOS_WALKTHROUGH_TEMPLATE_ROOT||path.join(os.homedir(),'.config','robos','walkthrough-templates'));}
function listTemplates(root){
 const custom=registry(root).read()['robos:nodes'].filter(n=>n['@type']==='robos:WalkthroughTemplate');
 return [...BUILTIN,...custom.filter(n=>!BUILTIN.some(b=>b['@id']===n['@id']))].map(validateTemplate);
}
function registerTemplate(template,root){
 validateTemplate(template);const graph=registry(root),existing=listTemplates(root).find(n=>n['@id']===template['@id']);
 if(existing){if(require('../robos-graph/lib/graph-workspace').hash(existing)!==require('../robos-graph/lib/graph-workspace').hash({...template,'robos:package':'testing'}))throw Error('Template IDs are immutable. Create a new version with a new ID.');return existing;}
 const node={...template,'robos:package':'testing'};
 const proposal=graph.propose({mode:'refine',edits:[{op:'add',node}],prompt:'Register reusable walkthrough template '+node['dcterms:title']});
 if(!proposal.validation.conforms)throw Error(JSON.stringify(proposal.validation));graph.apply(proposal);return node;
}
function readTemplate(selection){return validateTemplate(typeof selection==='string'?JSON.parse(fs.readFileSync(selection,'utf8')):selection);}

function instantiate(template,task={}){
 const t=validateTemplate(template);
 return {template:{id:t['@id'],name:t['dcterms:title'],version:t['robos:version'],webElement:t['robos:webElement']},instructions:t['robos:instructions']+'\nTask reference: '+JSON.stringify({title:task.title,url:task.url}),checkpoints:structuredClone(t['robos:checkpoints'])};
}
module.exports={BUILTIN,validateTemplate,listTemplates,registerTemplate,readTemplate,instantiate};
