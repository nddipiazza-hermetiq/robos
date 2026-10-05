# Walkthrough templates

Walkthrough templates describe what a reviewer should try. Evidence templates describe what was captured. A walkthrough remains pending until its checkpoints are actually exercised.

`robos:WalkthroughTemplate` has a versioned `@id`, `dcterms:title`, `robos:version`, `robos:webElement`, `robos:instructions`, and `robos:checkpoints` (title/given/when/then). The supported element is `robos-walkthrough-checkpoints`. Custom templates are registered through KGraph proposals; existing IDs cannot be changed.

Use `node packages/robos-lib/walkthrough-template-cli.js list` to browse templates, `register --file template.json` to add one, and `instantiate --template ID --task task.json --output walkthrough.json` to create the task's editable process. Put that process alongside the task's evidence artifacts as `walkthrough.json`. Task Implementer selects or creates a template and customizes its checkpoints. Preparing a review loads this process; old reviews without one keep their existing process.

The Claude connector template starts the local app and MCP service, verifies the URL shown and copied by Quickstart, follows the native connector instructions, and runs a read-only request. Cloud-hosted connectors cannot reach localhost directly: an approved reachable endpoint is a separate prerequisite, not grounds to silently switch to production. Login or reachability blockers keep the corresponding checkpoint pending.
