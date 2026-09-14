#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { proposePlan, viewPlan, plans, exportPlan, proposeRemovePlan } = require('../lib/project-plan');
const { GraphWorkspace } = require('../../robos-graph/lib/graph-workspace');
const args = process.argv.slice(2), command = args.shift();
const flag = name => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1]; };
try {
  const root = flag('graph-root') || process.env.ROBOS_GRAPH_ROOT;
  if (!root) throw new Error('Specify --graph-root or ROBOS_GRAPH_ROOT');
  let result;
  if (command === 'list') result = plans(root);
  else if (command === 'view') result = viewPlan(root, args[0], flag('repo'));
  else if (command === 'export') result = exportPlan(root, args[0]);
  else if (command === 'propose-remove') result = proposeRemovePlan(root, args[0]);
  else if (command === 'propose') result = proposePlan(root, JSON.parse(fs.readFileSync(flag('file'), 'utf8')));
  else if (command === 'apply') result = new GraphWorkspace(root).apply(JSON.parse(fs.readFileSync(flag('file'), 'utf8')));
  else throw new Error('Usage: project-plan list | view <task-number|issue-url|plan-id> | export <plan-id|graphId> | propose-remove <plan-id|graphId> | propose --file plan.json | apply --file proposal.json [--graph-root path] [--repo owner/repo] [--output file]');
  const output = JSON.stringify(result, null, 2) + '\n';
  if (flag('output')) fs.writeFileSync(flag('output'), output); else process.stdout.write(output);
  if (result.validation && !result.validation.conforms) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
