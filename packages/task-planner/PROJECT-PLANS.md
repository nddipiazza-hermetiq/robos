# Linked project plans

Launch Task Planner or KGraph Explorer with `ROBOS_GRAPH_ROOT` set to the directory
containing `.robos`. **KGraph Project Plans** in Task Planner uses the same graph
and renderer as the **Project Plan** inspector tab on project and task nodes.
This workspace workflow is separate from the legacy global project drafts.

The canonical plan is the versioned `robos:planJson` string on its `robos:Project`
node. It is a serialized JSON literal rather than an RDF relationship. A
`robos:TaskServer` and issue nodes model the project and its GitHub work items;
`inProject`, `inFeature` and `dependsOn` provide navigable relationships.
GitHub remains the source of issue state and scope. Saved snapshots show their
update timestamps; **Read current task** fetches GitHub without saving anything.

Minimum input (issue URLs must exist and belong to `repository`):

```json
{
  "version": 1,
  "id": "example-delivery",
  "namespace": "example",
  "name": "Example delivery",
  "repository": "example/tracker",
  "owners": ["Delivery owner"],
  "status": "review-required",
  "summary": "User outcome",
  "design": "Design and ordered delivery increments",
  "verification": "Observable completion and verification",
  "risks": "Pending decisions",
  "source": {"repository": "example/plans", "path": "plans/delivery.json"},
  "items": [
    {"url": "https://github.com/example/tracker/issues/1", "type": "Feature", "delivery": "Outcome and acceptance"},
    {"url": "https://github.com/example/tracker/issues/2", "type": "Task", "parent": "https://github.com/example/tracker/issues/1", "dependsOn": [], "delivery": "Small implementation increment"}
  ]
}
```

Statuses are `draft`, `review-required`, and `approved`; approved requires an
`approvalUrl`. Optional `window` and `references` add scheduling context and sources.
Unknown bug severity is recorded explicitly as `unknown`, not inferred from type.
Source evidence identifies the authored plan in its repository; issue snapshots
retain exact URLs and GitHub update timestamps. No credentials are stored.

The CLI supports `list`, `view <id|issue-url|number>`, `propose --file`, and
`apply --file`, with `--graph-root`, `--repo` for ambiguous task numbers, and
`--output`. Preview reads GitHub using the authenticated `gh` account. A GitHub
error prevents a proposal. Saving uses GraphWorkspace's reviewed transaction and
rejects stale revisions. The CLI/UI do not create, close, or approve GitHub issues.
Use the team's work-item workflow first and import the resulting exact URLs.

Verify with `node --test packages/robos-test/tests/sdlc-graph/project-plan.test.js`.
The opt-in Electron test additionally requires real authenticated GitHub access
and an existing external graph with plans; it saves only to an isolated copy.

## Plan lifecycle and downstream skill adapters

`export <plan-id|graphId>` returns one saved plan without GitHub access; use a
retained backup and a separate edited input. `propose --file` creates or updates
the same identity and refreshes issue snapshots. `view` also accepts a graphId.

`propose-remove <plan-id|graphId>` proposes unsetting only `robos:planJson`.
Review it before `apply`. This removes the plan from lists and the Project Plan
tab, but preserves the project, design documentation, tasks, relationships,
source files and GitHub issues. Restore by proposing the exported backup with
the same identity. No task-number selectors or batch removal are accepted.
Removing an item during an update likewise does not delete its graph entity.

Downstream company plugins can supply graph/tracker configuration and explicitly
read `view-task-plan`, `update-project-plan`, `remove-project-plan`, or
`plan-before-implement` from a configured RobOS checkout. This is instruction
composition, not automatic transitive plugin installation. Keep company data out
of RobOS; keep generic plan procedures out of company wrappers. Provision both
dependencies, pin a compatible released RobOS revision, and read skills and run
the CLI from that same checkout. Missing dependencies must fail visibly.

For local RobOS skill development, `./plugins/install.sh --sync --skill NAME`
updates just that skill's agent mirrors without refreshing unrelated skills.
