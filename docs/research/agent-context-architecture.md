# Agent-context architecture — how to structure hooks, rules, skills & memory for adherence

> Research (2026-07-11, via the `keyword-research` method). Question: how should the files that steer an AI agent — `CLAUDE.md`, `.claude/rules/`, skills (`SKILL.md`), memory, and hooks — be structured so the agent actually _follows_ them? Full technical vocabulary retained. Sources graded A (primary/peer-reviewed or official vendor engineering doc) → C (practitioner blog).
>
> Field term: **context engineering** (Karpathy's reframing of "prompt engineering"). This doc is about the **architecture** of the agent-context system, not UI/product design.

---

## 1. Positional attention → where rules go

**Lost in the Middle** (Liu, Lin, Hewitt, Paranjape, Bevilacqua, Petroni, Liang — TACL vol. 12, 2024). **Grade A.**
Retrieval accuracy is a **U-shaped function of position**: highest at the **primacy (start)** and **recency (end)** of context, degrading sharply in the middle — the middle-placement gap exceeds the _closed-book_ baseline in some settings, and persists in models explicitly trained for long context. Attributed to a primacy/recency **positional-attention bias** (decoder-only causal attention + positional-encoding effects such as RoPE decay).
→ **Critical, non-negotiable rules belong at the TOP or BOTTOM of the file, never mid-document.**
<https://aclanthology.org/2024.tacl-1.9/> · corrob. "Found in the Middle: Calibrating Positional Attention Bias," arXiv:2406.16008 (B).

## 2. Effective vs advertised context length

**RULER** (Hsieh et al., NVIDIA, 2024). **Grade A.**
Advertised window ≠ **effective context length**. Of 17 models claiming ≥32K, \~half held quality at 32K; RULER extends needle-in-a-haystack (NIAH) with multi-hop tracing, aggregation, variable-tracking and exposes 15–30% accuracy loss between short and long fills.
→ **Do not treat a 200K/1M window as free real-estate for instructions.** Budget by _effective_, not nominal, length.
<https://arxiv.org/abs/2404.06654>

## 3. Context failure taxonomy

**Breunig** (practitioner, canonical; amplified by Simon Willison). **Grade C.**
Four named modes: **context poisoning** (a hallucinated/erroneous token enters context and is repeatedly re-referenced, compounding); **context distraction** (context grows so large the model over-weights its own history over trained priors — degradation past ~100K tokens, agent repeats prior actions rather than synthesising); **context confusion** (superfluous content, e.g. irrelevant tool defs, drags output quality); **context clash** (mutually contradictory instructions accumulate and derail reasoning).
<https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html>

**Anthropic — "Effective context engineering for AI agents."** **Grade A.**
Verbatim: "as the number of tokens in the context window increases, the model's ability to accurately recall information from that context decreases" (**context rot**); attention forms **n² pairwise relationships for n tokens** → "a natural tension between context size and attention focus"; context is "a finite resource with diminishing marginal returns." System prompts should hit the **right altitude** — neither "brittle if-else hardcoded prompts" nor "overly general" guidance; use "the minimal set of information that fully outlines your expected behavior," where **"minimal does not necessarily mean short."** Structure with distinct sections via **XML tags or Markdown headers**; "exact formatting… likely becoming less important as models become more capable."
<https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>

## 4. Instruction hierarchy → what wins conflicts

**The Instruction Hierarchy** (Wallace, Xiao, Leike, Weng, Heidecke, Beutel — OpenAI, 2024, arXiv:2404.13208). **Grade A.**
Fixed precedence: **system/developer > user > tool-output / third-party content** (Model Spec formalises root > system > developer > user > guideline). Load-bearing distinction is **aligned vs misaligned** lower-privilege instructions: aligned ones (same goal) are followed; misaligned ones get **selective ignorance** (act as if unseen) or, failing that, **refusal**. Trained via **context synthesis** (aligned) + **context ignorance** (misaligned), SFT + RLHF; ≤63% robustness gains.
→ **Critical for this repo:** `CLAUDE.md` is delivered as a **user-role message** _**after/below**_ **the system prompt**, not as system prompt. So a rules file **cannot out-rank the true system prompt**, and **a live user chat turn overrides the file.** System altitude requires `--append-system-prompt`, not the memory file.
<https://arxiv.org/abs/2404.13208> · <https://openai.com/index/the-instruction-hierarchy/>

## 5. Agent Skills — three-tier progressive disclosure

**Anthropic — "Equipping agents for the real world with Agent Skills."** **Grade A.**

- **Tier 1 — always loaded:** YAML frontmatter `name` + `description` only, preloaded into the system prompt at startup. `name` ≤ 64 chars, lowercase-hyphenated, matches folder; `description` ≤ 1,024 chars, must state **both what the skill does AND when to use it** (the trigger signal).
- **Tier 2 — on trigger:** full **SKILL.md body** read into context when the description matches the task.
- **Tier 3+ — on demand:** bundled/linked files navigated **only as needed**.

Token-budget rationale (verbatim): because an agent with filesystem + code-execution "don't need to read the entirety of a skill into their context window," bundled context is "**effectively unbounded**." **No prescribed SKILL.md length**; behavioural rule: "When the SKILL.md file becomes unwieldy, split its content into separate files and reference them"; "If certain contexts are mutually exclusive or rarely used together, keeping the paths separate will reduce the token usage."
→ Frontmatter = razor-sharp discovery signal; body = common-path procedure; linked files = reference/rare branches/long examples.
<https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills>

## 6. CLAUDE.md / AGENTS.md conventions

**Claude Code memory docs.** **Grade A.**

- **Size:** "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." Loaded **in full regardless of length**.
- **Specificity:** be more precise like "Use 2-space indentation" not "Format code properly"; "Run `npm test` before committing" not "Test your changes."
- **Consistency:** "if two rules contradict each other, Claude may pick one arbitrarily" — periodically purge conflicts (mitigates _context clash_).
- **Imports:** `@path` syntax, recursion **max depth 4 hops**, parsing skips Markdown code spans/fenced blocks. **Imports do NOT save context** — imported files load at launch and expand inline.
- **NOT to include:** multi-step procedures or single-subdir concerns → move to a **skill** or **path-scoped rule** (`.claude/rules/*.md` with `paths:` frontmatter, loads only on matching files); pasted code → use `file:line` references.
- **Hierarchy:** files concatenate root→cwd; **closest file read last** (higher effective priority); user rules load before project rules so project wins.
  <https://code.claude.com/docs/en/memory>

**AGENTS.md standard.** **Grade A/B.** "A README for agents." Plain Markdown, no mandatory fields. Nested files: agent reads the **nearest file**, closest takes precedence; **"explicit user chat prompts override everything."** Claude Code reads CLAUDE.md, not AGENTS.md — bridge via `@AGENTS.md` import or symlink.
<https://agents.md/>

## 7. Reliability mechanisms — do emphasis / framing / redundancy work?

**Factorial study of file-structure variables** (arXiv:2605.10039). **Grade B** (empirical preprint, directly on-point: 1,650 Claude Code CLI sessions, 16,050 function-level observations, Sonnet 4.6 + Opus 4.6/4.7). Factorially manipulated **file size (25/100/250/500 lines), instruction position (top/25%/centre/75%/bottom), emphasis, architecture (single CLAUDE.md vs +AGENTS.md vs +nested)**.

- **Headline null:** "None of the four structural variables or three two-way interactions produced a detectable contrast after multiple-testing correction."
- **The one robust effect: within-session adherence decay** — each additional generated function carries **\~5.6% lower odds of compliance (OR ≈ 0.944)**, reproduced on a second codebase and on Opus 4.6.
  → **Where you place a rule and how you decorate it (IMPORTANT/YOU MUST) matters far less than how deep into a long run the model is.** Emphasis markers are **not empirically reliable.**
  <https://arxiv.org/abs/2605.10039>

**IFScale — "How Many Instructions Can LLMs Follow at Once?"** (arXiv:2507.11538). **Grade B.**
10 instructions: 98–100%. 150: 84.8% (gemini-2.5-pro) → 34.2% (gemini-2.5-flash). 500: 68.9% (gemini-2.5-pro) → 6.7% (llama-4-scout). Three regimes: **threshold decay** (reasoning models stable to ~150 then steep drop), **linear decay** (gpt-4.1, claude-sonnet-4/3.7), **exponential decay** (llama-4-scout, claude-3.5-haiku, floor ~7–15%). **Primacy bias in which instructions survive** — earlier-listed rules preferentially obeyed at moderate density.
→ **Fewer, earlier-placed load-bearing rules are obeyed more reliably.**
<https://arxiv.org/abs/2507.11538>

**Multi-turn instruction forgetting.** **Grade B/C.** Adherence to earlier-turn instructions decays **monotonically with turn count** (e.g. o1-preview 88%→71% by turn 3). DIM-Bench: models are **specifically vulnerable to negative/distractor requirements** → prefer **positive framing** ("do X") over prohibition ("do not Y"). Reinforces re-injecting critical rules.

---

## Synthesis — how to structure the agent-context system for maximum adherence

1. **Length.** Hard-cap `CLAUDE.md` **< 200 lines** (Anthropic's own threshold; loaded in full; context-rot + density-decay penalise bloat). Budget by _effective_ context (RULER), not the advertised window.
2. **Ordering & placement.** Exploit the **U-shaped positional-attention curve**: highest-stakes, non-negotiable rules at **top or bottom**, never mid-file. Keep the load-bearing rule count **low** (IFScale primacy bias; density collapse).
3. **Tier-splitting (progressive disclosure).** Lean always-loaded surface: tight SKILL.md `description` (what + when), tight CLAUDE.md. Push procedures, examples, mutually-exclusive branches to **path-scoped `.claude/rules/`, skills, or linked files** loaded just-in-time. **Never paste code** — `file:line` pointers.
4. **Emphasis & framing.** IMPORTANT/YOU MUST are **not empirically reliable** (2605.10039 null). Prefer **positive imperatives** over prohibitions, **verifiable specifics** over vague guidance, and **eliminate contradictions** (context clash → arbitrary resolution).
5. **The real lever is enforcement, not text.** Adherence decays **within a run (\~5.6%/step)** and **across turns** — so **re-assert critical rules via hooks** (deterministic, zero-cost when irrelevant), not prose. This is exactly this repo's **Schema.md hook-vs-context doctrine (PROC-01)**, now empirically backed: prose forgets at \~5.6%/step; a hook fires every time its trigger matches.

### Direct implications for this repo

- **CLAUDE.md is \~230+ lines** → over the 200-line adherence threshold; candidate for trimming, with procedures pushed to skills/path-scoped rules.
- The **`vN CODE-NN | … | n sp` house format**, **REPO-01 save**, **BULD-02 version bump** are all **program-detectable** → correctly already hooks, not prose. Keep migrating detectable rules out of CLAUDE.md text.
- **Judgment rules** (SP fairness, design taste, terminology) can only be Context — accept the decay, keep them short and near the file edges.
