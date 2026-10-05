---
title: "Agent Code Review & PR Review Theater"
package: pr-review
category: code-review
icon: pr-review.svg
summary: "Autonomous AI pull request auditor, PR Review Theater, team KGraph policy, Show The Fix agent phase, and IDE bridges."
description: "Autonomous AI pull request auditor, PR Review Theater, team KGraph policy, Show The Fix agent phase, and IDE bridges."
related:
  - /pr-review-theater.html
---

Autonomous AI-driven code review, audit hub, and Review Theater for pull requests. Analyzes pull requests created by AI agents or human developers, provides side-by-side color-coded diffs, runs automatic security audits, tests OpenAPI contract compatibility, generates on-demand masterclasses with verified Knowledge Graph completion certificates, proves runtime correctness with 1080p narrated video proof-of-work teaching feature mechanics first followed by "Show Me The Fix" agent demonstrations, and connects directly with your preferred IDE via native plugins:
- **PR Review Theater**: Customizable multi-stage review pipeline (eLearning Knowledge Check, Living Docs, Diff Viewer, IDE Bridge, Evidence Video Proof-of-Work, "Show Me The Fix" Agent Guided Walkthrough, and Sign-Off & Dual Merge). Configurable per-team in `robos:Team` Knowledge Graph policy. Read the full guide in [PR Review Theater & Verification]({{ site.baseurl }}{% link pr-review-theater.md %}).
- **IntelliJ IDEA Pull Request Review Plugin**: Communicates over RobOS port `63343` IPC bridge and native JetBrains CLI integration to jump straight to modified files, set live breakpoints at change sites, and launch JetBrains' native Pull Request review tool window.
- **VS Code Pull Request Review Plugin**: Deeply integrates with the industry-standard `GitHub Pull Requests and Issues` extension (`vscode://github.vscode-pull-request-github/open-pr`) to review diffs, leave inline line comments, and approve PRs right inside Visual Studio Code.
![PR Review Theater]({{ '/assets/images/screenshots/pr-review-theater-02-pr-detail.png' | relative_url }})

## Mention reviewers in a PR notification

Enable **Send PR review notification**, select its destination, and use
**Reviewers to @mention** to choose recipients. Defaults come from the project's
messaging settings in Git Projects. Search `@name` to find a person; the preview
shows who will be notified. The sender is excluded, and Slack receives stable
member-ID mentions rather than plain display names. Recipient changes here apply
only to this request. Save project defaults in Git Projects.

## Author mode after publication

Creating a PR reloads it from GitHub and compares its author with the connected
GitHub account. The author keeps the same evidence, diff, and walkthrough, with
an editable description and **Update PR** action while the PR remains open.
Use the walkthrough discussion for further changes, then **Push walkthrough
adjustments** to publish the committed branch changes without a force push.

The Pull Request tab shows **Not Created**, **In Draft**, **In Review**,
**Merged**, or **Closed**, each with its own icon and color. **Reload PR**
refreshes the status and description. Closed/merged PRs and reviewer mode keep
the description read-only. If someone changes the description on GitHub during
editing, reload before saving rather than overwriting their work.

For an author's draft PR, a green **Ready for review** button appears in the
header when CI passes. Use **Reload PR** after checks finish to refresh it.
Clicking the button checks GitHub again and takes the PR out of draft. A changed
branch or pending/failed checks leave it in draft.

## Review captured evidence

The Evidence tab separates passed checks, failed checks, and checks still to
verify. Pending means the check has not been verified; it does not mean a test
failed. **Generate evidence** runs the task's evidence plan; **Run checks again**
starts another run.

Use **View screenshot**, **View exchange**, or **View test output** to inspect
captured files inside the review. Text previews show the original content,
limited to the first 256 KB, with an option to open the full file in another app.
The evidence plan and earlier artifacts remain in expandable sections below
current results.

Task Implementer hands the theater a populated `robos:EvidenceTemplate` and its
artifact bindings. The tab displays **Evidence template used for this task**,
the template name, and its chosen web component. Text outputs appear directly
in their slots; screenshots retain their before/after labels. Missing required
slots remain visible. Older reviews without templates still show their files;
the next generation run asks the agent to choose a template first.

## Choose a task when opening Code Review

Opening Code Review from the launcher shows **Open a task**. Saved local reviews
appear first, followed by open tasks from the configured GitHub task server.
Search by title, issue number, or repository. **Open review** restores that
task's changes, evidence, and walkthrough; **Choose checkout** lets you locate
an implementation branch for a task without a saved review. Epics are excluded
from the GitHub task list. Saved reviews remain available if GitHub is offline.

Direct task and PR links still open their review immediately. Each local task
has its own window, so selecting another task does not focus the wrong review.

The review's **×** returns to **Open a task**. You can reopen that task or select
another one; closing the review view does not discard its saved evidence.

## Suggest changes while reviewing

**Suggest Changes** opens the agent conversation beside the review viewer.
Drag the divider to resize the two panels, or focus it and use the arrow keys.
The conversation stays open as you move between Changes, Evidence, and
Walkthrough. Closing the panel keeps its messages and unsent draft.

The conversation uses the shared `robos-ui/agent-chat.js` view and AI textarea.
It retains streamed messages, steering, follow-latest, saved history, and clear
chat. You can ask questions or request changes before starting the walkthrough;
those requests do not advance its checkpoints. The agent receives the active
review tab and selected text as context. Changes remain on the local branch.

Walkthrough contains launch instructions, controls, and the current checkpoint.
Its conversation is in the side panel. **Explain this step** opens that panel
for the agent's answer.
