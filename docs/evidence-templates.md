---
layout: default
title: Evidence templates
---

# Evidence templates

An evidence template defines what a reviewer should see for a task. An MCP
change might show a request and the actual before/after replies. A UI change
might show the real screens and browser checks. The template is reusable; the
captured artifacts belong to a particular task and tested revision.

## Schema

`robos:EvidenceTemplate` has these fields:

| Field | Purpose |
| --- | --- |
| `@id` | Immutable versioned ID, such as `urn:robos:evidence-template:mcp-response:v1` |
| `dcterms:title` | Human-readable name |
| `robos:version` | Positive version number |
| `robos:webElement` | Registered component that renders this template |
| `robos:collectionInstructions` | How to produce the evidence |
| `robos:artifactSlots` | Named slots with `id`, `name`, `kind`, and `required` |

Slot kinds are `text`, `screenshot`, or `file`. Registered elements are
`robos-evidence-transcript`, `robos-evidence-gallery`, and
`robos-evidence-checks`. They render declarative slots using text previews,
screenshot previews, and file actions. Templates cannot load scripts or HTML.
A new arrangement of slots can use an existing component without an app change.
A new interactive renderer requires a normal RobOS component implementation.

The SHACL shape derives from Schema.org CreativeWork. The companion
`robos:EvidenceBundle` uses OSLC Quality Management TestResult as its reference
and links to its template through `robos:evidenceTemplate`. It records the
revision, scenario results, artifact hashes, and slot bindings.

## Agent workflow

Run `node packages/robos-lib/evidence-template-cli.js list` from RobOS to inspect
the catalog. It includes MCP responses, product UI comparisons, CLI output, and
task checks. Custom templates are validated and stored through KGraph's
proposal/apply mechanism under
`~/.config/robos/evidence-templates/.robos/`. Set
`ROBOS_EVIDENCE_TEMPLATE_ROOT` to use another registry.

1. Select the template that fits the acceptance criteria. Save its snapshot with
   `select --template TEMPLATE_ID --output template.json`.
2. If none fits, write a new template node and use `register --file new-template.json`.
   Changed templates need new versioned IDs; existing IDs cannot be overwritten.
3. Run the actual checks. Write `result.json` with `summary`, `questions`,
   `scenarios`, and `templateArtifacts`. Each scenario records its `id`, `title`,
   `status`, `summary`, and relative artifact paths. Each binding records
   `scenarioId`, `slotId`, and a captured `path`.
4. After committing the tested implementation, run
   `collect --template template.json --result result.json --workspace CHECKOUT --output bundle.json`.

All commands above use `node packages/robos-lib/evidence-template-cli.js` as
the prefix. Task Implementer supplies absolute paths and a task-specific output
directory to its agent. Local review loads the resulting bundle automatically.
The review's **Run checks again** action also populates the chosen template.

Required slots apply to every scenario. Use optional slots for additional
screens or metadata that only some scenarios produce. A missing required
artifact prevents a passed result. A recorded file alone is not proof of a
successful assertion: agents must report the observed result honestly, keep
blocked checks explicit, and label fixtures, local runs, replayed data, and
production calls accurately.
