# Not-active rules

Rules and items considered but **not in force**. Moved out of [CLAUDE.md](CLAUDE.md) so the active rules stay lean. Promote one back by moving it into a graded table in CLAUDE.md.

## Specs / tasks — not rules

*A spec describes how a feature works (project-specific fact), not a way-of-working. Differentiated from Parked rules, which ARE rules we chose not to adopt.*

| Item | Description |
| --- | --- |
| **DATA-49** Effective-load maths | calcs use effective load (added + bodyweight share); display shows added weight — a Data feature spec, not a rule |

## Parked — not adopted

| Rule | Description / mechanics |
| --- | --- |
| **PROC-02** No padded lists | tag suggestions with code + severity; list real items, never pad to a round count |
| <br /> | LOW |
| <br /> | Context - judgment |
| **PROC-03** Velocity check | weigh estimates against the owner's real pace; answer "worth it?" in days/SP |
| <br /> | LOW |
| <br /> | Context - judgment |
| **DATA-08** No number clashes | pick task code + version LAST as highest-in-history + 1; re-derive after rebase |
| <br /> | LOW |
| <br /> | Context - verifiable |
| **DATA-15** Toggles only | every option is a pressable pill; never checkbox/radio/segmented-row |
| <br /> | LOW |
| <br /> | Context - judgment |
| **DATA-12** Write fresh, don't couple | write a similar view fresh using the other as inspiration, not copy-paste |
| <br /> | LOW |
| <br /> | Context - judgment |
| **DATA-18** Version code-names | display renames the version via a name table; the number string is unchanged |
| <br /> | LOW |
| <br /> | Context - verifiable |

*(DATA-21, DATA-23, DATA-31 were tasks, not rules — deleted from the Data repo, not adopted here. See META-02.)*

## Portable ideas (cross-project)

*Good rules/patterns worth reusing elsewhere — **not** vz-specific. Lift these into a new project's CLAUDE.md and adapt the nouns.*

- **Hand over the rebuilt deliverable after every change** — give the user the artifact they actually consume (built file, deployed URL, generated output), not just the source/diff. *(vz form: "always send the rebuilt `index.html`.")*
