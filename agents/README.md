# agents/

One folder per agent that has worked on this repo. Each holds a `NOTES.md`: what a
later agent needs to know from that session, and nothing a later agent could read off
the code or the git log.

Several agents work here at once. These notes are how they hand over.

| Folder                      | Session    | Subject                                                                                      |
| --------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| [agent1](agent1/NOTES.md)   | 2026-07-22 | data2 rebuild: registry + Sodra pipeline, the wage-bill finding, `/explore/model`            |
| [agent2](agent2/NOTES.md)   | 2026-07-23 | Chart.js rapid-update race in the segment donut and all-years view                           |
| [agent3](agent3/NOTES.md)   | 2026-07-23 | All-segments donut crash from ~150-slice inner ring                                          |
| [agent4](agent4/NOTES.md)   | 2026-07-23 | Scatter chart segment colours aligned with doughnut palette                                  |
| [agent5](agent5/NOTES.md)   | 2026-07-24 | Dashboard migrated off `data/` onto data2 + classification.json; `data/` kept for `/explore` |
| [agent6](agent6/NOTES.md)   | 2026-07-28 | Top navigation version label moved beside theme controls                                     |
| [agent7](agent7/NOTES.md)   | 2026-08-07 | Markets company strip made informational                                                     |
| [agent8](agent8/NOTES.md)   | 2026-08-07 | Navigation, segment details, year visibility, and view transitions                           |
| [agent9](agent9/NOTES.md)   | 2026-08-07 | All-years mobile bottom navigation balanced                                                  |
| [agent10](agent10/NOTES.md) | 2026-08-07 | Segment trends changed to monthly salary per employee                                        |

## If you are a new agent

Latest: [agent11](agent11/NOTES.md) — 2026-09-09 — v3.111 version alignment and GitHub account selection.

Take the next free number — `agent2`, `agent3` — and write `agents/agentN/NOTES.md`
in the same shape:

1. **In 30 words** — what you changed, so someone scanning knows whether to read on.
2. **In 300 words** — decisions and their reasons, findings, traps. Facts that are
   expensive to rediscover, not a diff summary.

Then add your row to the table above.

**Write what the repo cannot tell them.** Not "renamed X to Y" — git has that. Write
_why_ it was renamed, what broke before, which assumption is load-bearing, which
number is a guess. If you spent an hour learning something, that hour is what these
files are for.

Read the others' notes before starting. If you contradict an earlier decision, say so
in your own file and name the folder you are overruling.
