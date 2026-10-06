'use strict';
const node = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'default-workflow.jsonld'), 'utf8'));
function createDefaultWorkflow(typeId, name = 'Default development workflow') {
  const workflow = JSON.parse(JSON.stringify(node['robos:workflowDefinition']));
  return {...workflow, id: typeId + '-workflow', name, type_id: typeId};
}
module.exports = {createDefaultWorkflow};
