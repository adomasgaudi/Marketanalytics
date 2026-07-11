# Agent Mechanisms

> v91.12. Historic Claude-hook map; use current `AGENTS.md` for live policy.

**Context** is advisory text. **Hook** is event code that injects focused context.
Deterministic condition -> hook reminder; judgment -> short context. Prose is
not enforcement.

## Useful Event Pattern

| Event | Best use |
| --- | --- |
| Before tools | validate commit or dangerous action context |
| After writes | remind to rebuild, verify generated output, and align versions |
| End of turn | surface unsaved work or delivery gaps |
| Prompt arrival | load a narrow rubric only when its topic applies |

Historic examples: `version_reminder.py` after template writes,
`commit_message_check.py` before commits, `ui_design_reminder.py` on UI prompts,
and `save_reminder.py` at stop. Their branch assumptions are obsolete here.
