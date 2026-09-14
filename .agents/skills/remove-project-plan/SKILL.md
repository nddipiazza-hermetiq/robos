---
name: remove-project-plan
description: Remove one saved RobOS plan through a reviewed proposal while retaining its project, tasks, relationships and GitHub issues.
---

# Remove project plan

Use an explicit absolute `ROBOS_SOURCE_ROOT` checkout and `ROBOS_GRAPH_ROOT`
(directory containing `.robos`). Run the CLI from that same RobOS revision.
Do not substitute RobOS's own graph or a global demo workspace.

This removes only the saved `robos:planJson` document. It does not delete the
project, source JSON, task server, issue nodes, relationships, or GitHub issues;
project descriptions and design documentation remain. Do not use graph cascade delete.
If the user means deletion of the whole project, clarify the materially broader scope.

Resolve task selectors with `view` first. If more than one plan matches, ask which
one. Export the exact plan graphId to a new, retained backup file before proposing:

```sh
node "$ROBOS_SOURCE_ROOT/packages/task-planner/bin/project-plan.js" export EXACT_PLAN_GRAPH_ID --graph-root "$ROBOS_GRAPH_ROOT" --output plan-backup.json
node "$ROBOS_SOURCE_ROOT/packages/task-planner/bin/project-plan.js" propose-remove EXACT_PLAN_GRAPH_ID --graph-root "$ROBOS_GRAPH_ROOT" --output removal-proposal.json
```

Read the delta: it must unset only `robos:planJson` on the named project and pass
validation. User authorization to remove this exact plan is required before apply;
a request to explain removal or create this skill is not authorization to remove data.

```sh
node "$ROBOS_SOURCE_ROOT/packages/task-planner/bin/project-plan.js" apply --graph-root "$ROBOS_GRAPH_ROOT" --file removal-proposal.json
```

Verify `list` excludes that plan and retained project/tasks remain. Other plans
for the same task must still be viewable. Report exactly what was removed, the
backup path, and that `update-project-plan` can restore it via propose/apply.
Update affected documentation to mark the plan withdrawn, without deleting its source.
