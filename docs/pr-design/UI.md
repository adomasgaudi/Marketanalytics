# UI / UX design context

Loaded automatically by [`ui_design_reminder.py`](.claude/hooks/ui_design_reminder.py)
whenever a prompt is about a UI / design change. Purpose: stop AIs shipping
*ugly-but-functional* layouts that pass a quick "looks correct" glance but waste
space a human eye flags instantly.

---

## Mandatory process (do this first, every UI change)

1. **Ask for a screenshot before editing.** You cannot see the live site
   (CONV-02). Use the **AskUserQuestion** interface (CONV-03) to ask the owner
   for a current screenshot of the screen you're about to change — phone
   screenshot preferred, since mobile width is the binding constraint. Don't
   start editing UI blind.
2. **Run the rubric against that render**, not against the code. Score
   *proportion*, not just correctness.
3. **Build, rebuild (`python3 src/build_site.py`), then ask for a fresh
   screenshot** and re-score. UI work is a loop: render → critique → refine,
   never one-shot.

---

## The space-efficiency rubric (score the screenshot out loud)

Ask each line against the render. Any "no" is a 🔴/🟠 to fix or flag.

1. **Column-vs-content width** — does any element get width/height
   disproportionate to its information content? (a 40px column for one digit; a
   wide, mostly-empty metadata column next to cramped content). Tables on a
   ~360px phone almost always fail this — prefer **stacked cards** over columns.
2. **No atomic-token wrapping** — dates, version strings, numbers must not break
   mid-value across two lines. If they wrap, the column is too narrow.
3. **Content gets the most room** — the information that matters (the change
   text, the value) should get the most width; short metadata should not get
   fixed columns that then sit in a sea of whitespace. Don't invert the ladder.
4. **Redundant labels dropped** (DATA-16 / #cram) — match the tightest existing
   UI; one scrolling row where possible.
5. **Reach ladder** (#joy-of-less) — more-used controls closer to hand; graded
   values open a popup (DATA-47), toggles are pressable pills (#toggle), not
   checkboxes.
6. **Tokens, not ad-hoc** — colours from the shared palette (DATA-28), small
   radius not full-pill on buttons/chips/inputs (DATA-22), loading state on every
   async op (DATA-46).

---

## Why AIs miss this (root cause)

The whole VLM-critique literature names one gap: reviews either **iterate but
can't see** (self-refine on code/tests, never the render) or **see but can't
iterate** (one-shot vision-to-code, no refine pass). Both ship lopsided layouts.
Add saliency bias (models weight *text present* over *space wasted*), no felt
sense of pixel cost, and prompt anchoring (asked to "analyse," models hunt for
*broken* things and pass ugly-but-functional).

**The fix is structural, not a bigger model:** a render→critique→refine loop
scored against a fixed rubric (above), made durable by a hook (PROC-01) — which
is what this file + `ui_design_reminder.py` implement. Few-shot of your own past
sins beats model size (UICrit); a grid/coordinate overlay on the screenshot
makes disproportion *measurable* instead of felt.

### Worked example (the SP column, v61)

Dropped a thin one-digit SP column → the wasted space **relocated** into a wide,
mostly-empty Version column, and the date began wrapping "2026-/06-21". Fixing
the *case* (remove column) left the *class* (3-column table on a phone) alive.
Root fix: stacked cards. Lesson — "the case is gone" is not "the class is gone."

---

## Sources (graded)

- **A** — [UICrit, UIST 2024 (Berkeley + Google)](https://people.eecs.berkeley.edu/~bjoern/papers/duan-uicrit-uist2024.pdf):
  983 human UI critiques; few-shot examples of flaws beat a bigger model.
- **A** — [ReLook (arXiv 2510.11498)](https://arxiv.org/html/2510.11498):
  vision-grounded generate–diagnose–refine; names the "iterate-blind vs see-once" gap.
- **A** — [Vision-Guided Iterative Refinement (arXiv 2604.05839)](https://arxiv.org/html/2604.05839v1)
  & [Perceptual Self-Reflection (arXiv 2602.12311)](https://arxiv.org/html/2602.12311v1):
  treat the render as primary evidence, validate with a vision model.
- **A−** — [Set-of-Mark / visual prompting study](https://thegrigorian.medium.com/can-llms-understand-graph-structure-from-visuals-a-study-on-layout-prompting-and-readability-a147d42027ff):
  grids / numbered patches / coordinate axes raise spatial accuracy.
- **B+** — [CritiqueCrew (arXiv 2602.01796)](https://arxiv.org/pdf/2602.01796):
  multi-perspective critic agents catch what a builder rationalises.
- **B** — [SlideAudit (arXiv 2508.03630)](https://arxiv.org/pdf/2508.03630),
  [Percy visual testing](https://percy.io/blog/visual-screenshot-testing):
  taxonomy of visual flaws; baseline screenshot diffing catches drift (not first-time ugliness).
- **C** — practitioner blogs (Sony, Kalungi, dev.to): confirm the symptom
  (poor whitespace / weak hierarchy), no measured method.
