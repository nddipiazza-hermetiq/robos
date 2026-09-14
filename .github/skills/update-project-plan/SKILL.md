---
name: update-project-plan
description: Edit, refresh, or restore a saved RobOS project plan with a reviewed graph proposal; preserve work-item identities.
---

# Update project plan

Use an explicit absolute `ROBOS_SOURCE_ROOT` checkout and `ROBOS_GRAPH_ROOT`
(directory containing `.robos`). Run the CLI from that same RobOS revision.
Do not substitute RobOS's own graph or a global demo workspace.

Read `packages/task-planner/PROJECT-PLANS.md` from that checkout. Resolve the
requested task with `view`; if multiple plans match, obtain the intended plan.
Use its exact graphId for export (a slug works only when unique):

```sh
node "$ROBOS_SOURCE_ROOT/packages/task-planner/bin/project-plan.js" export EXACT_PLAN_GRAPH_ID --graph-root "$ROBOS_GRAPH_ROOT" --output plan-before.json
```

Keep this backup. Edit a separate plan JSON with only the requested changes.
Preserve id, namespace, repository, source attribution, and unrelated fields.
Do not treat an edit as design approval; approval requires a real approval record.
For refresh only, reuse the exported plan unchanged; propose rereads every issue.
For restore, use the retained source/backup of the removed plan with the same identity.
New issues require the team's issue workflow, not invented URLs.

```sh
node "$ROBOS_SOURCE_ROOT/packages/task-planner/bin/project-plan.js" propose --graph-root "$ROBOS_GRAPH_ROOT" --file plan.json --output proposal.json
node "$ROBOS_SOURCE_ROOT/packages/task-planner/bin/project-plan.js" apply --graph-root "$ROBOS_GRAPH_ROOT" --file proposal.json
```

Between these commands inspect the delta and require conforming validation. Apply
only the requested scope. A stale proposal must be regenerated and reviewed.
Removing an item from the plan does not delete its graph node or GitHub issue.
Issue relationship fields are shared graph data: inspect effects on other plans
before changing parents/dependencies. Stop if the delta would alter unrelated work.
After saving, export/view again, verify requested changes, and update the authored
source plan and affected documentation. Restoring also refreshes GitHub snapshots.
