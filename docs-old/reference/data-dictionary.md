# Data — Rules

Grade = importance. Kind = Hook (fires) or Context (just text). 3rd row = runtime weight.
Codes keep the original stable numbers (`#n`). Scope: `adomasgaudi/*` repos only.

### TOP

| Rule | Description |
| --- | --- |
| **#1** Version patch only | bump ONLY the 3rd digit, whole numbers, every change; never minor/major (owner does those) |
| <br /> | Hook `rules-check.cjs` · verifiable |
| <br /> | Stop-hook spawn per turn; checks version shape on release |
| <br /> | <br /> |
| **#2** Authoritative branch | `opus-4.8` is source of truth; other branches sync from it, opus wins on conflict |
| <br /> | Context · verifiable |
| <br /> | ~25 always-on tokens; no runtime |
| <br /> | <br /> |
| **#3** Save | commit + push after every change — owner only sees the live GitHub Pages site |
| <br /> | Context · verifiable |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#7** Done = deploy + propagate | push verified work to `opus-4.8`, deploy, sync other branches; never strand on a side branch |
| <br /> | Context · verifiable |
| <br /> | ~20 always-on tokens; no runtime |
| <br /> | <br /> |
| **#9** AI-optimised, not human | owner never reads code; favour small files/tests/machine-readable over human readability |
| <br /> | Context · judgment |
| <br /> | ~25 always-on tokens; no runtime |
| <br /> | <br /> |
| **#13** Translate everything | every new/changed user-facing string gets its LT entry in `src/i18n.ts` same change |
| <br /> | Context · verifiable |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#19** Never claim a visual fix works | can't see live site; verified = build + tests; visuals/perf = "I changed X, please check" |
| <br /> | Hook `rules-check.cjs` · verifiable |
| <br /> | Stop-hook flags assertive phrasings in the reply |
| <br /> | <br /> |
| **#29** Every change bumps version | bump patch + update `<span class="version">` + prepend `RELEASES` entry; never ship without all three |
| <br /> | Hook `rules-check.cjs` · verifiable |
| <br /> | Stop-hook checks version lockstep when a release was touched |
| <br /> | <br /> |
| **#37** Stamp your model | new `RELEASES` entry sets `model` to the model you run as; never the breakpoint default |
| <br /> | Hook `rules-check.cjs` · verifiable |
| <br /> | Stop-hook verifies the model stamp |
| <br /> | <br /> |
| **#38** Forgotten rule → hook it | a rule that keeps slipping gets a machine check in `rules-check.cjs`, not more prose |
| <br /> | Context · judgment |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#41** Supabase = browser cache | localStorage is each device's SSOT; Supabase mirrors keys; device prefs stay local |
| <br /> | Context · verifiable |
| <br /> | ~30 always-on tokens; no runtime |
| <br /> | <br /> |
| **#42** AI does all backend | owner never touches Supabase/SQL/consoles; AIs automate via GitHub Actions + MCP |
| <br /> | Context · judgment |
| <br /> | ~22 always-on tokens; no runtime |

### MED

| Rule | Description |
| --- | --- |
| **#4** Reply format | details first, Summary last; Summary opens `User:` recap, repeats body titles only |
| <br /> | Context · judgment |
| <br /> | ~30 always-on tokens; no runtime |
| <br /> | <br /> |
| **#5** Commit subject | `CODE (SP:n) version kebab`; body has model + `cost-v.2`; date is git-logged |
| <br /> | Context · verifiable |
| <br /> | ~20 always-on tokens; no runtime |
| <br /> | <br /> |
| **#8** No number clashes | pick task code + version LAST as highest-in-history + 1; re-derive after rebase |
| <br /> | Context · verifiable |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#11** Pickable, severity-tagged lists | tag items with code + severity (🔴🟠🟢); never pad to a round count |
| <br /> | Context · judgment |
| <br /> | ~22 always-on tokens; no runtime |
| <br /> | <br /> |
| **#14** Velocity check | weigh estimates against owner's ~50–100 SP/day; answer "worth it?" in days/SP |
| <br /> | Context · judgment |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#15** Toggles only | every option is a pressable pill; never checkbox/radio/segmented-row/button-row |
| <br /> | Context · judgment |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#16** Cram tight | match the tightest existing UI; drop redundant labels; one scrolling row not wrapped |
| <br /> | Context · judgment |
| <br /> | ~20 always-on tokens; no runtime |
| <br /> | <br /> |
| **#17** Snappy clicks | a tap updates its own control instantly; defer heavy re-renders, coalesced |
| <br /> | Context · judgment |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#20** Custom `.xdd` dropdown | never native `<select>` picker; native selects auto-enhanced |
| <br /> | Context · verifiable |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#22** Small rounding | no `border-radius:999px`/`50%` on buttons/chips/inputs; use `--r-pill` token |
| <br /> | Context · verifiable |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#26** Never cite a rule by number | quote the rule's wording to the owner; numbers are for AI scanning only |
| <br /> | Context · judgment |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#27** UI layout is yours | decide size/placement yourself; don't punt to AskUserQuestion; apply ui-taste.md |
| <br /> | Context · judgment |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#34** Cost hook format | print real cost (rate-limit based, not API list) each turn; read cost-model.md first |
| <br /> | Context · verifiable |
| <br /> | ~20 always-on tokens; no runtime |
| <br /> | <br /> |
| **#36** Default model Haiku | Haiku for routine work; escalate to Sonnet only if it fails; never Fable/Opus unasked |
| <br /> | Context · verifiable |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#39** End with token block | run `scripts/show-cost.py`, quote verbatim; never guess token counts |
| <br /> | Context · verifiable |
| <br /> | ~15 always-on tokens; ~30ms Python per reply |
| <br /> | <br /> |
| **#40** End with model+version line | shows `v.x -> v.y` shift; codename from versionName.ts, never guessed |
| <br /> | Context · verifiable |
| <br /> | ~15 always-on tokens; computed by show-cost.py |
| <br /> | <br /> |
| **#43** 3 nested levels per bullet | bold informative 2–5-word label + 5–15-word desc + optional 15–50-word detail |
| <br /> | Context · judgment |
| <br /> | ~25 always-on tokens; no runtime |
| <br /> | <br /> |
| **#46** Loading states everywhere | every async op + heavy re-render shows an immediate indicator; never frozen/stale |
| <br /> | Context · judgment |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#50** Session code-name | take next famous scientist chronologically; set `ai:` on releases, end replies with it |
| <br /> | Context · verifiable |
| <br /> | ~25 always-on tokens; no runtime |
| <br /> | <br /> |
| **#52** Asks → AskUserQuestion | needs owner to do/check/pick → pop a question, never bury it in prose |
| <br /> | Context · judgment |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#53** Ask more when work is open | unfinished/bug/multi-prompt → lean to AskUserQuestion; open with a plain recap |
| <br /> | Context · judgment |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#54** Fix fails once → #debug | stop shipping fixes; log whole path, smallest increments, one digit at a time |
| <br /> | Context · judgment |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#55** Debug by contrast | start from siblings that already work; ask how the broken one differs |
| <br /> | Context · judgment |
| <br /> | ~18 always-on tokens; no runtime |

### LOW

| Rule | Description |
| --- | --- |
| **#6** Two AIs at once | each desktop-editor AI gets own folder + branch; Claude Code/web AIs exempt |
| <br /> | Context · verifiable |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#10** Removing code — 3 tiers | default DELETE (git is the net); attic for undecided, warehouse for decided-out |
| <br /> | Context · judgment |
| <br /> | ~20 always-on tokens; no runtime |
| <br /> | <br /> |
| **#12** S-ANL its own view | write S-ANL fresh using full-ANL as inspiration, not copy-paste; avoid coupling |
| <br /> | Context · judgment |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#18** Version code-names | minor shows as Bleach zanpakutō + `v.<patch>`; tables in `src/versionName.ts` |
| <br /> | Context · verifiable |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#21** Locked views show self only | non-admin views show only the logged-in athlete; no other chips/sex-menu/admin tabs |
| <br /> | Context · verifiable |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#23** Grouped lifts use the lens | pick original lift, then ⊕ Combine / ⇄ Compare; per-scope remembered toggles |
| <br /> | Context · judgment |
| <br /> | ~22 always-on tokens; no runtime |
| <br /> | <br /> |
| **#24** Popout keeps open state | read previous `.open` from live DOM before rebuilding innerHTML |
| <br /> | Context · verifiable |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#25** Unknown `#tag` → search first | grep memories/notes for the closest rule, act on that; never silently skip |
| <br /> | Context · judgment |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#28** Lens colours one set | gold/teal/amethyst/terracotta from graph palette; never ad-hoc bright colours |
| <br /> | Context · verifiable |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#30** Supabase sets PK | composite natural PK `(user_id,date,exercise_name,set_number)`; no uuid id |
| <br /> | Context · verifiable |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#31** No native tap-highlight | global `-webkit-tap-highlight-color:transparent`; use own hover/active feedback |
| <br /> | Context · verifiable |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#32** Popouts position:fixed | use `clampMenuIntoView()`; never absolute with hardcoded offsets |
| <br /> | Context · verifiable |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#33** Super-persistent → bisect | bug surviving multiple fixes → git bisect + on-screen diagnostic, fix root |
| <br /> | Context · judgment |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#35** `#tokens` analysis | judge new-chat-vs-continue, model fit, cache hits, waste; one recommended action |
| <br /> | Context · judgment |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#47** Graded values = popup menu | a graded/list-reordering control opens a floating menu, never a cycle-on-tap toggle |
| <br /> | Context · judgment |
| <br /> | ~18 always-on tokens; no runtime |
| <br /> | <br /> |
| **#48** Short release titles | `shortTitle` is a 2–5-word label, never a sentence; detail goes in title/note |
| <br /> | Hook `rules-check.cjs` · verifiable |
| <br /> | Stop-hook flags newest entry over 5 words |
| <br /> | <br /> |
| **#49** Effective-load maths | calcs use effective load (added + bodyweight share); display shows added weight |
| <br /> | Context · verifiable |
| <br /> | ~22 always-on tokens; no runtime |
| <br /> | <br /> |
| **#51** On-screen `dbg()` console | phones have no devtools; instrument every step of a failing flow |
| <br /> | Context · judgment |
| <br /> | ~15 always-on tokens; no runtime |
| <br /> | <br /> |
| **#56** No "what's next" asks | never pop AskUserQuestion just for direction; done + nothing mid-stream → say so, stop |
| <br /> | Context · judgment |
| <br /> | ~15 always-on tokens; no runtime |
