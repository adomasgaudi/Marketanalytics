# agents/

One folder per agent that has worked on this repo. Each holds a `NOTES.md`: what a
later agent needs to know from that session, and nothing a later agent could read off
the code or the git log.

Several agents work here at once. These notes are how they hand over.

| Folder | Session | Subject |
| --- | --- | --- |
| [agent1](agent1/NOTES.md) | 2026-07-22 | data2 rebuild: registry + Sodra pipeline, the wage-bill finding, `/explore/model` |
| [agent2](agent2/NOTES.md) | 2026-07-23 | Chart.js rapid-update race in the segment donut and all-years view |
| [agent3](agent3/NOTES.md) | 2026-07-23 | All-segments donut crash from ~150-slice inner ring |

## If you are a new agent

Take the next free number — `agent2`, `agent3` — and write `agents/agentN/NOTES.md`
in the same shape:

1. **In 30 words** — what you changed, so someone scanning knows whether to read on.
2. **In 300 words** — decisions and their reasons, findings, traps. Facts that are
   expensive to rediscover, not a diff summary.

Then add your row to the table above.

**Write what the repo cannot tell them.** Not "renamed X to Y" — git has that. Write
*why* it was renamed, what broke before, which assumption is load-bearing, which
number is a guess. If you spent an hour learning something, that hour is what these
files are for.

Read the others' notes before starting. If you contradict an earlier decision, say so
in your own file and name the folder you are overruling.
