---
name: view-task-plan
description: View or list saved RobOS project plans by task number, exact GitHub issue URL, or plan id without changing data.
---

# View task plan

Use an explicit absolute `ROBOS_SOURCE_ROOT` checkout and `ROBOS_GRAPH_ROOT`
(directory containing `.robos`). Run the CLI from that same RobOS revision.
Do not substitute RobOS's own graph or a global demo workspace.

```sh
node "$ROBOS_SOURCE_ROOT/packages/task-planner/bin/project-plan.js" list --graph-root "$ROBOS_GRAPH_ROOT"
node "$ROBOS_SOURCE_ROOT/packages/task-planner/bin/project-plan.js" view 48 --repo OWNER/REPO --graph-root "$ROBOS_GRAPH_ROOT"
```

Replace the example selector and repository with the requested values. Exact issue
URLs and plan ids also work. A task can belong to multiple plans: show each match,
not an arbitrary first result. Task lookups read GitHub live; plan-id lookups and
lists contain saved snapshots. Report access failures and missing plans honestly.
Present design/review status, owners, ordered delivery, dependencies, verification,
and issue links. Do not infer completion from a merged partial PR.

For a visual view, launch KGraph Explorer with the same graph, select the project
or task and open **Project Plan**; Task Planner's **KGraph Project Plans** uses the
same format. Viewing does not create plans, write the graph, or change issues.
