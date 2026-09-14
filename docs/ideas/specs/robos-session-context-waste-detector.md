---
layout: default
nav_exclude: true
---

# Feature Spec: RobOS Session Context Waste Detector & Inspector

- **Status**: Draft
- **Created Date**: 2026-09-14
- **Target Component**: `packages/agents-manager`, `packages/robos-lib`, `packages/agent-chat`, `packages/dev-central`, `packages/robos-graph`, `.robos/` Git Store
- **Author/Idea Source**: User & Antigravity Agent

---

## 1. Overview & Vision

Modern agentic software engineering platforms rely on autonomous AI agents (Google Antigravity, Anthropic Claude Code, GitHub Copilot CLI, OpenAI Codex, and RobOS UHP runners) executing long-running trajectories. A single development session can easily span 30 to 100+ turns, executing shell commands, reading entire source trees, generating diffs, and delegating to child subagents.

However, long-running agent workflows suffer from a critical, silent failure mode: **Context Bloat & Token Degradation**.

```
+-----------------------------------------------------------------------------------------+
|                                 THE MEGABYTE DILEMMA                                    |
|                                                                                         |
|  Agent Trajectory: Turn 1 (4 KB)  -------> Turn 48 (82 MB raw logs / 1.8M tokens)        |
|                                                                                         |
|  [ 42% Unbounded CLI Outputs ]  [ 28% Redundant File Reads ]  [ 16% Stale Dead Weight ]   |
|  -----------------------------  ----------------------------  ------------------------  |
|  `cat bundle.js` (2.4 MB)        `main.js` read 9x (1.8 MB)    Docs read at Turn 3      |
|  `npm test` stdout (850 KB)      `package-lock.json` (900 KB)  never cited again        |
+-----------------------------------------------------------------------------------------+
```

### The Problems
1. **Severe Reasoning Degradation ("Lost-in-the-Middle")**: As the prompt payload balloons with megabytes of noisy tool output, LLMs suffer from severe attention dispersion. The model begins missing instructions, forgetting architectural constraints, or hallucinating code paths.
2. **Exponential Turnaround Latency & Costs**: Transmitting hundreds of thousands of input tokens per turn causes generation requests to take minutes instead of seconds, while rapidly burning enterprise token budgets and hitting provider rate limits.
3. **Zero Payload Visibility**: Developers and architects currently have no intuitive visual tools to answer:
   - *Where did those 50+ megabytes of session data actually come from?*
   - *Which specific tool calls or commands blew up the context window?*
   - *Is the agent repeatedly reading the same 3,000-line file without making modifications?*
   - *How much of the active prompt history is dead weight that hasn't been referenced in 30 turns?*

### The Solution: RobOS Session Context Waste Detector & Inspector
The **RobOS Session Context Waste Detector** provides a multi-tabbed visual analytics GUI and heuristic engine integrated directly into **RobOS Agents** (`packages/agents-manager`) and the SDLC Knowledge Graph. It transparently ingests session logs and transcripts from **any** RobOS-governed agent (Antigravity, Claude Code, Copilot, Codex, and UHP in-process harnesses), pinpoints exact sources of context waste down to the byte and token, and equips engineers with 1-click tools to prune and compact sessions.

---

## 2. User Stories & Use Cases

- **As a Developer / AI Pair Programmer**, I want to click any active or archived session in **RobOS Agents** and immediately see a visual breakdown of where the megabytes are going, so I can understand why the agent is running slowly or hitting token limits.
- **As a Lead System Architect**, I want to audit agent efficiency and detect pathological agent loops (e.g. reading `package-lock.json` on every turn or dumping full build outputs) before they contaminate agent transcripts and downstream documentation.
- **As a FinOps / Token Budget Auditor**, I want to track aggregate context waste percentages across all AI providers in the organization and identify high-cost waste patterns.
- **As an Autonomous Agent Prompt Engineer**, I want to inspect dead weight and temporal decay in session history, allowing me to optimize agent system prompts, MCP tool output schemas, and file slicing strategies.

---

## 3. Key Capabilities & Scope

### In Scope

- [ ] **Universal Multi-Provider Session Ingestor**:
  - Automatically discovers and parses transcripts across all supported agent environments:
    - **Google Antigravity (`agy`)**: `~/.gemini/antigravity/brain/<id>/.system_generated/logs/transcript*.jsonl`
    - **Anthropic Claude Code (`claude`)**: `~/.claude/projects/`, `~/.claude/sessions/`, and `~/.claude/history.jsonl`
    - **GitHub Copilot CLI (`copilot`)**: `~/.copilot/session-state/<id>/`
    - **OpenAI Codex (`codex`)**: `~/.codex/state_*.sqlite`
    - **RobOS In-Process / UHP Runner**: `~/.config/robos/agent-sessions/<id>.json`
  - Normalized in-memory representation capturing step index, role, tool name, invocation payload, output byte size, token estimate, and target file hashes.

- [ ] **Multi-Tab Context & Waste Visualizer GUI (in `packages/agents-manager`)**:
  - **Tab 1: Composition & Category Breakdown**:
    - Interactive Treemap / Sunburst / Donut visualizer categorizing context payload into:
      - 🔴 **Tool Output Waste**: Raw stdout/stderr, compilation logs, stack traces.
      - 🟠 **Redundant File Reads**: Multiple reads of the same file without intervening modifications.
      - 🟡 **Stale / Dead Weight**: Context loaded early but never cited or utilized in subsequent turns.
      - 🔵 **Chain-of-Thought (Thoughts)**: Hidden thinking/reasoning token accumulation.
      - 🟣 **System & Injected MCP Schemas**: Base instructions, tool definitions, and skill manuals.
      - 🟢 **Active Working Set**: High-value prompts, recent code diffs, and relevant tool results.
    - Global session health metrics: Total Size (MB), Estimated Cumulative Tokens, Waste Ratio (% wasted), and Efficiency Score (A-F).
  - **Tab 2: Payload Heavy-Hitters (Tool & Command Leaderboard)**:
    - Ranked leaderboard of individual tool calls and command outputs sorted by byte size.
    - Columns: Step #, Tool Name, Target / Command, Payload Size (KB/MB), Token Weight, Waste Rating, and Action.
    - Click-to-preview slideout drawer showing syntax-highlighted snippets, payload head/tail, and byte-density analysis.
  - **Tab 3: Context Watermark & Growth Timeline**:
    - Chronological area chart showing step-by-step context volume accumulation over the session trajectory.
    - Visual indicators for sudden vertical payload spikes (e.g. dumping a minified bundle or directory dump) and context compaction/truncation horizons.
  - **Tab 4: Redundancy & Repetition Radar**:
    - Duplicate detection engine grouping identical or near-identical operations:
      - Same file read multiple times (`view_file` on `server.js` 8 times).
      - Repetitive polling loops (`run_command: git status` or health checks every turn).
      - Duplicate file listings (`list_dir` or `find_by_name` returning identical trees).
    - Calculates total wasted megabytes attributable strictly to duplicate fetches.
  - **Tab 5: Stale Context & Dead Weight Inspector**:
    - Temporal decay matrix tracking when data entered the context window vs when it was last referenced.
    - Flags "zombie context" (e.g. a 500-line specification read at turn 2 that has not been queried for 40 turns).
  - **Tab 6: Trimming & Compaction Studio**:
    - Automated remediation recommendations with 1-click execution:
      - *Rule 1: Truncate verbose tool outputs* (replaces middle 90% of massive CLI logs with concise truncation badges).
      - *Rule 2: Prune redundant file reads* (replaces intermediate duplicate file loads with references to the initial read).
      - *Rule 3: Milestone condensation* (condenses historical turns 1-25 into a compact semantic milestone summary).
    - **"Dry Run Compaction"**: Real-time side-by-side comparison of original MB vs pruned MB.
    - **"Export Pruned Transcript"**: Generates cleaned session transcript file.
    - **"Resume with Pruned Context"**: Launches the agent terminal resuming from the compacted state.

- [ ] **First-Class Knowledge Graph Logging (`robos:SessionContextWasteAudit`)**:
  - Automatic audit record emitted to `.robos/audits/` and indexed in Modular KGraph Packages.
  - W3C SHACL shape validation gate linking audit metrics to `robos:AgentSession` and `robos:Prompt`.

### Out of Scope (Initial Release)

- Live real-time memory injection into running foreign agent subprocesses (pruning is performed prior to or upon session resume/compaction).
- Lossy semantic re-encoding of code diffs (diffs remain untouched to preserve patch integrity).

---

## 4. Architectural & System Integration

### Ingestion & Analysis Architecture

```
+-----------------------------------------------------------------------------------------+
|                                ROBOS AGENT ECOSYSTEM                                    |
|                                                                                         |
|   Google Antigravity      Claude Code       GitHub Copilot        OpenAI Codex          |
|    (~/.gemini/brain)     (~/.claude/logs)   (~/.copilot/state)   (~/.codex/state.db)    |
+-----------------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|               UNIVERSAL TRANSCRIPT PARSER & NORMALIZER (`robos-lib`)                   |
|                                                                                         |
|   - Stream-reads JSONL, SQLite rows, or JSON session files                              |
|   - Normalizes steps: { index, role, tool, command, target, payload, bytes, tokens }     |
|   - Computes payload content hashes & file modification timeline                        |
+-----------------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|                           HEURISTIC WASTE DETECTION ENGINE                              |
|                                                                                         |
|   1. Redundant Read Detector          4. Runaway CoT / Verbosity Detector               |
|   2. Unbounded CLI Output Detector    5. System / Tool Schema Bloat Detector            |
|   3. Stale Context Decay Tracker      6. Token & Financial Cost Quantifier              |
+-----------------------------------------------------------------------------------------+
                                          |
                 +------------------------+------------------------+
                 |                                                 |
                 v                                                 v
+------------------------------------+  +-------------------------------------------------+
|   ROBOS AGENTS MANAGER GUI         |  |          KNOWLEDGE GRAPH STORE                  |
|   (`packages/agents-manager`)      |  |         (`.robos/` JSON-LD)                     |
|                                    |  |                                                 |
|   [Tab 1] Composition Treemap      |  |   - Entity: `robos:SessionContextWasteAudit`    |
|   [Tab 2] Payload Heavy-Hitters    |  |   - SHACL: `SessionContextWasteAuditShape`      |
|   [Tab 3] Watermark Timeline       |  |   - Linked to `robos:AgentSession`,             |
|   [Tab 4] Redundancy Radar         |  |     `robos:Prompt`, & `robos:AgentPersona`      |
|   [Tab 5] Dead Weight Inspector    |  |   - Dev Central AI Standup Alerts               |
|   [Tab 6] Pruning Studio           |  +-------------------------------------------------+
+------------------------------------+
```

### GUI User Interface Wireframe (Inside RobOS Agents)

When selecting any session card in **RobOS Agents**, the developer can click **"Inspect Context & Waste"** to open the interactive analyzer modal:

```
+---------------------------------------------------------------------------------------------------------+
|  [X] AGY Session 5c7d043d - Context & Waste Inspector                                                  |
|  Total Footprint: 54.2 MB  |  Tokens: ~1.28M  |  Waste Score: 68.4% (Grade: D)  |  Est. Tax: $4.12 / 48s  |
+---------------------------------------------------------------------------------------------------------+
| [ Composition ]  [ Heavy-Hitters ]  [ Growth Timeline ]  [ Redundancy ]  [ Dead Weight ]  [ Trimming ]  |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  CONTEXT COMPOSITION BREAKDOWN (54.2 MB Total)                                                          |
|                                                                                                         |
|  +----------------------------------------------------+---------------------------------------+         |
|  | Tool Output: 22.8 MB (42.1%)                       | Redundant File Reads: 14.3 MB (26.4%) |         |
|  | - `run_command` stdout/stderr: 18.2 MB             | - `packages/agents-manager/app.js`    |         |
|  | - `grep_search` results: 3.4 MB                    |   (read 9 times, unchanged: 1.2 MB)  |         |
|  | - `find_by_name` listings: 1.2 MB                  | - `package-lock.json` (read 4 times)  |         |
|  +----------------------------------------------------+---------------------------------------+         |
|  | Chain-of-Thought / Thoughts: 8.4 MB (15.5%)        | Stale Dead Weight: 6.1 MB (11.2%)     |         |
|  | - Internal planner reasoning logs                  | - Ingested at Step 2, unused since    |         |
|  +----------------------------------------------------+---------------------------------------+         |
|  | Active Working Set: 2.6 MB (4.8%)                  | System Prompts & MCP: 0.0 MB (0.0%)   |         |
|  +----------------------------------------------------+---------------------------------------+         |
|                                                                                                         |
|  QUICK ACTIONS:                                                                                         |
|  [ 🪄 1-Click Auto-Prune (Saves 37.1 MB / 68%) ]    [ 📥 Export Slim Transcript ]   [ 🚀 Resume Clean ]   |
+---------------------------------------------------------------------------------------------------------+
```

---

### JSON-LD Object Representation (`robos:SessionContextWasteAudit`)

```json
{
  "@context": {
    "oslc": "http://open-services.net/ns/core#",
    "dcterms": "http://purl.org/dc/terms/",
    "robos": "https://robos.dev/ns/sdlc#",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  },
  "@id": "urn:robos:audit:context-waste:5c7d043d-933d-4c5e-97cb-35e68a09a860",
  "@type": ["oslc:ExecutionRecord", "robos:SessionContextWasteAudit"],
  "dcterms:identifier": "WASTE-AUDIT-20260914-001",
  "dcterms:title": "Context Waste Audit for AGY Session 5c7d043d",
  "robos:targetSession": "urn:robos:session:5c7d043d-933d-4c5e-97cb-35e68a09a860",
  "robos:provider": "antigravity",
  "robos:totalSizeBytes": 56832819,
  "robos:estimatedTokenCount": 1284500,
  "robos:wasteSizeBytes": 38873648,
  "robos:wastePercentage": 68.4,
  "robos:efficiencyGrade": "D",
  "robos:estimatedLatencyTaxSeconds": 48.5,
  "robos:wasteCategories": {
    "toolOutputWasteBytes": 23907532,
    "redundantReadWasteBytes": 14994656,
    "staleContextWasteBytes": 6396313,
    "thoughtTokenBytes": 8808038,
    "activeWorkingSetBytes": 2726280
  },
  "robos:topWasteCulprits": [
    {
      "stepIndex": 14,
      "toolName": "run_command",
      "command": "./gradlew test --info",
      "payloadSizeBytes": 3450200,
      "wasteType": "UnboundedCommandOutput",
      "recommendation": "Truncate stdout to last 50 lines"
    },
    {
      "stepIndex": 22,
      "toolName": "view_file",
      "targetPath": "packages/agents-manager/renderer/app.js",
      "payloadSizeBytes": 104596,
      "repetitionCount": 9,
      "wasteType": "RedundantFileRead",
      "recommendation": "Use line slice range instead of full file read"
    }
  ],
  "dcterms:created": "2026-09-14T12:45:00Z"
}
```

### W3C SHACL Shape Definition

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix robos: <https://robos.dev/ns/sdlc#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

robos:SessionContextWasteAuditShape
    a sh:NodeShape ;
    sh:targetClass robos:SessionContextWasteAudit ;
    sh:property [
        sh:path robos:targetSession ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:message "Audit must reference a valid target session." ;
    ] ;
    sh:property [
        sh:path robos:totalSizeBytes ;
        sh:datatype xsd:integer ;
        sh:minCount 1 ;
        sh:message "Audit must record totalSizeBytes." ;
    ] ;
    sh:property [
        sh:path robos:wastePercentage ;
        sh:datatype xsd:decimal ;
        sh:minCount 1 ;
        sh:message "Audit must calculate wastePercentage." ;
    ] ;
    sh:property [
        sh:path robos:efficiencyGrade ;
        sh:datatype xsd:string ;
        sh:in ( "A" "B" "C" "D" "F" ) ;
        sh:minCount 1 ;
        sh:message "Audit must assign a letter grade (A-F)." ;
    ] .
```

---

## 5. Proposed Implementation Plan

1. **Phase 1: Shared Context Analysis Library (`packages/robos-lib/context-waste-analyzer.js`)**
   - Implement universal parsers for Google Antigravity, Claude Code, GitHub Copilot, OpenAI Codex, and RobOS UHP logs.
   - Implement heuristic detection algorithms:
     - Duplicate read hashing (`SHA-256(content)` / file path + mtime comparison).
     - Command output length thresholds (>50 KB marked as candidate unbounded outputs).
     - Temporal decay calculation (steps elapsed since last reference).
     - CoT thought-to-output ratio computation.

2. **Phase 2: Backend IPC Endpoints in `packages/agents-manager/main.js`**
   - Add IPC handlers:
     - `agents-inspect-session-context(provider, sessionId)`: Generates complete context composition, heavy-hitters list, timeline points, and waste breakdown.
     - `agents-prune-session-context(provider, sessionId, options)`: Creates compacted/trimmed session transcript artifact.
     - `agents-export-session-audit(auditRecord)`: Persists audit to `.robos/audits/` and registers with Knowledge Graph.

3. **Phase 3: Interactive Inspector UI in `packages/agents-manager/renderer/`**
   - Add "Inspect Waste" button and badge to all session cards across providers.
   - Implement the 6 tab views:
     - Tab 1: Composition Treemap & Category Breakdown (vanilla SVG/HTML5 canvas or CSS grid treemap).
     - Tab 2: Heavy-Hitters Leaderboard with click-to-preview syntax drawer.
     - Tab 3: Context Watermark Growth Timeline (SVG area chart).
     - Tab 4: Redundancy & Repetition Radar.
     - Tab 5: Stale Dead Weight Matrix.
     - Tab 6: Trimming & Compaction Studio with Dry-Run comparison.

4. **Phase 4: Deep Linking & Alerts from Dev Central & Agent Chat**
   - Add "Context Health" indicator to active sessions in Dev Central.
   - Provide direct deep-link from Agent Chat: "⚠️ Current session context is 82% waste — click to compact".

5. **Phase 5: Automated E2E Tests & Container Verification**
   - Create `packages/robos-test/tests/agents-context-waste.test.js` asserting correct categorization, waste calculation, and trimming functionality against synthetic Antigravity, Claude, and Copilot transcripts.
   - Run containerized verification via `./scripts/e2e-container.sh`.

---

## 6. Acceptance Criteria

- [ ] **Multi-Provider Discovery**: Successfully reads and normalizes session transcripts from Google Antigravity, Anthropic Claude Code, GitHub Copilot CLI, OpenAI Codex, and RobOS UHP sessions.
- [ ] **Accurate Byte & Token Accounting**: Computes total payload size, categorized byte distributions, and estimated token counts matching actual log file sizes within ±2%.
- [ ] **Heuristic Waste Categorization**: Accurately flags redundant file reads, unbounded command outputs, repetitive polling, and dead context.
- [ ] **6-Tab Visualizer**: All 6 tabs (Composition, Heavy-Hitters, Timeline, Redundancy, Dead Weight, Trimming) render interactively within `packages/agents-manager` without external framework dependencies.
- [ ] **Actionable Compaction**: The Trimming Studio generates a valid compacted transcript reducing payload size by >50% on bloated sessions while preserving critical working state.
- [ ] **Knowledge Graph Audit Record**: Emits a W3C SHACL-validated `robos:SessionContextWasteAudit` node stored in the `.robos/` Git store.
- [ ] **Zero Performance Overhead**: Background audit calculation finishes in under 200ms for transcripts up to 100 MB.
