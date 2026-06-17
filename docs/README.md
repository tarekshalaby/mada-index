# Mada Index — Documentation

This folder is the **single source of truth** for everything about Mada Index: how to use it, how it's built, how to operate it, and why every consequential choice was made. If you're picking this up after a break — human or AI — start here.

---

## What's in here

| File | What it is | Who it's for |
|---|---|---|
| `Mada_Index_Docs_Index.md` | **Start here.** Map of all docs + how to use them together (incl. handing them to an AI for diagnosis) | Everyone |
| `Mada_Index_User_Guide.md` | How to *use* the dashboard, non-technical | The Mada team |
| `Mada_Index_Runbook.md` | Operations: symptom → cause → fix or escalate | Whoever's keeping it running |
| `Mada_Index_Pipeline_Reference.md` | The Make.com data pipeline + Airtable base model | Developer / AI |
| `Mada_Index_Dashboard_Reference.md` | The frontend codebase, file by file | Developer / AI |
| `Mada_Index_Decision_Log.md` | Every consequential decision and *why* (DL-01…DL-30) | Everyone |

Plus the **archived planning docs** (`Mada_Dashboard_Brief.md`, `Mada_Dashboard_Plan.md`, `Mada_Index_Design_Language.md`, `Mada_Metrics_Spec.md`, `Mada_Persona_Map.md`, `Mada_Question_Map.md`, `Mada_Visualization_Spec.md`) — historical context from the design phase, **not actively maintained**.

---

## The one rule: markdown is the source of truth

Every document lives here as **markdown**. That is the master copy. Everything else — the User Guide PDF, the User Guide Word file, any Google Doc — is a **generated copy** made *from* the markdown. When something needs to change, you change the markdown, then regenerate the copies. Never edit a PDF/Doc and expect it to flow back; it won't.

Why markdown: it renders cleanly on GitHub, it diffs line-by-line so every change is reviewable, and it's the format an AI assistant reads most reliably.

---

## How to apply a change to any doc

1. **Edit the markdown file** in this folder.
2. **Bump the version line** in the header *only if the change is material* (new section, changed instruction, corrected fact). Typo fixes don't need a bump. Convention: `v1.x` for updates within v1, `v2.0` for a big restructure. Update the "Last updated" month too.
3. **If you edited the User Guide**, regenerate its shareable formats — see the next section.
4. **Commit** with a clear message, e.g. `docs: correct LinkedIn followers endpoint in Pipeline Ref`.

**Special case — the Decision Log is append-only.** Never rewrite or delete an existing DL-xx entry. If a decision changes, add a *new* entry that supersedes it and mark the old one `Superseded`. The whole point of the log is that history is preserved.

**When code or pipeline changes, the matching doc changes in the same commit:**
- A Make scenario changes → update `Mada_Index_Pipeline_Reference.md` §C for that scenario.
- A new period is added to the dashboard → update `Mada_Index_Dashboard_Reference.md` §10.
- A metric or data rule changes → append a new DL-xx to the Decision Log.
- A new failure mode shows up → add it to the Runbook playbook.

---

## How to regenerate the User Guide's shareable formats (PDF / Word / Google Doc)

The team reads the User Guide as a **PDF** (recommended — looks identical everywhere, can't be broken) or a **Google Doc** (if they want to comment). Both come from `Mada_Index_User_Guide.md`.

The cleanest, most reliable way to produce them — and the one to ask an AI assistant for next time — is:

> "Take `docs/Mada_Index_User_Guide.md` and generate a polished, styled **.docx** with real heading styles, then render a **PDF** from it."

That produces a properly designed Word file (real Heading 1/2/3 styles, styled tables, callout boxes) and a matching PDF. To get it into Google Drive:

- **For a read-only team copy:** just upload the **PDF**. Done.
- **For a commentable Google Doc:** upload the **.docx** to Drive, then double-click it → **File → Save as Google Docs**. Word heading styles map natively to Google Docs styles, so the formatting carries over cleanly and you get a real document outline.

**What doesn't work (learned the hard way):** pushing files into Drive through an API/connector as base64. A `.docx` is a ZIP archive, and the base64 round-trip corrupts the ZIP bytes — the file uploads but won't open ("File could not open"). Always move the finished file into Drive **by hand** (drag-and-drop or upload), or share the PDF directly. Don't try to auto-convert markdown/HTML to a Google Doc via a connector — it imports as a wall of unstyled text.

The current generated copies live alongside this repo's outputs and can be regenerated any time from the markdown. The screenshots in the guide (`[ 📷 Screenshot: … ]`) can be added when convenient — they're all listed at the end of the User Guide under *Before you share this*.

---

## Resuming work cold — for an AI assistant

If you're an AI assistant being asked to continue this project, you should need almost nothing explained. Do this:

1. **Read `Mada_Index_Docs_Index.md`** — it orients you to the whole system.
2. **Read the Decision Log** — so you don't "fix" something that was deliberate.
3. **For a dashboard/code task:** read `Mada_Index_Dashboard_Reference.md`, then `git log --oneline` in the repo root, then the core files it points to (`src/data/adapter.ts`, `src/data/SdkProvider.tsx`, `src/data/types.ts`).
4. **For a data/pipeline task:** read `Mada_Index_Pipeline_Reference.md`, and verify against the live Airtable base (base `appr8MnuDG2NjwMQf`) and the blueprint JSONs before asserting anything.
5. **For an operations/"something's broken" task:** start at the Runbook.

**Working rules that always apply** (also in `CLAUDE.md` at the repo root):
- Verify against the live base / repo / blueprints — don't assert platform or data facts from memory.
- Keep spec and implementation phases separate. Review the plan, get the go-ahead, *then* build.
- Respect the three architecture boundaries in Dashboard Reference §4 (one SDK file, one adapter, pure lib functions; never add a component library).
- The maintainer marks tracker tasks Done — you don't.

---

## Repo facts (so nobody has to rediscover them)

- **Git root:** `~/mada_index/` · GitHub: `github.com/tarekshalaby/mada-index`
- **Dashboard code:** `~/mada_index/frontend/src/`
- **Airtable base (Mada Index):** `appr8MnuDG2NjwMQf` · **Block ID:** `blkc9G4qPWFhyCsoF`
- **Project Tracker base:** `appXk5UZDP6LwhuJI` · Tasks table `tblA8Fhzn2xloY9t2`
- **Maintainer:** Tarek Shalaby · tarek@shala.by · Signal preferred

---

*This README is the front door. The Docs Index is the map. Keep both current.*
