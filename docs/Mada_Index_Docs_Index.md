# Mada Index — Documentation Index

**Version 1.1 · June 2026**

Start here. This document tells you what exists, who should read what, how to use the docs together, and — at the end — how to maintain them and resume work later without re-explaining anything.

---

## 1. What this documentation covers

This is the complete handover documentation for **Mada Index** — the cross-platform content analytics dashboard built for Mada Masr. It covers the full system: the Airtable base, the Make.com data pipeline, the dashboard frontend, and the decisions behind all of it.

**What it does not cover:** day-to-day editorial use of the dashboard. That's in the **User Guide**, which is written for the Mada team.

---

## 2. Who reads what

| You are… | Start with | Then read |
|---|---|---|
| **Mada team member** using the dashboard | User Guide | — |
| **Mada team member** noticing something wrong | Runbook §3 (health check) | Runbook §5–10 (playbooks) |
| **Developer** picking up the project | Dashboard Technical Reference §18 | Dashboard Ref §4–6 (architecture) |
| **Developer** fixing a pipeline issue | Pipeline Reference §C (scenario ref) | Pipeline Ref §D (gotchas) |
| **Developer** understanding a metric decision | Decision Log | Pipeline Ref §B (data layer) |
| **AI assistant** diagnosing a problem | See §4 below | — |
| **Anyone** confused about why something works the way it does | Decision Log | — |

---

## 3. How the documents relate

```
User Guide          ← team-facing; non-technical
     │
     │  "something looks wrong"
     ▼
Runbook             ← symptom → cause → fix or escalate
     │
     │  "what's happening in the pipeline?"
     ▼
Pipeline Reference  ← Make.com scenarios, data flow, auth, gotchas
     │
     │  "why is it built this way?"
     ▼
Decision Log        ← the permanent record of every consequential choice

Dashboard Technical Reference  ← parallel track: frontend codebase
     │
     │  cross-references →  Pipeline Reference (data layer)
     │  cross-references →  Decision Log (metric formulas)
```

The **Pipeline Reference** and **Dashboard Technical Reference** are the two technical pillars. The **Runbook** sits on top of both and tells you which to consult for any given symptom. The **Decision Log** is the "why" layer that all other documents reference by DL-xx entry ID.

---

## 4. LLM diagnosis workflow

When something is broken and you want an AI assistant to help diagnose it:

**Step 1 — Identify the domain.** Is the symptom in the data (wrong numbers, missing records, stale sync)? Or in the dashboard (zeros, blank views, display errors)?

**Step 2 — Assemble the bundle.** Give the AI:
- This Index (so it understands the system boundary)
- The **Runbook** (always — it maps symptoms to causes)
- The **Pipeline Reference** if the issue is data/sync-related
- The **Dashboard Technical Reference** if the issue is display-related
- The **Decision Log** if the question is "why does it work this way?"

All four together is fine — they're designed to be read as a set.

**Step 3 — Describe the symptom precisely.** Include: which view or which platform is affected; what the actual value is vs. what you expected; when it started; what's in the Errors table (copy the `Type`, `Message`, `Detail`, and `Execution` URL fields for any relevant error records).

**Step 4 — Follow the escalation line.** The Runbook (§2) defines what's safe self-service vs. what requires the maintainer. An AI assistant will respect this boundary — it will tell you what the fix is and whether to do it yourself or escalate.

---

## 5. Complete document catalog

| Document | File | Audience |
|---|---|---|
| **This index** | `docs/Mada_Index_Docs_Index.md` | Everyone |
| **User Guide** | `docs/Mada_Index_User_Guide.md` (+ `.pdf` / `.docx` for sharing) | Mada team |
| **Runbook** | `docs/Mada_Index_Runbook.md` | Operators, LLM diagnosis |
| **Pipeline Reference** | `docs/Mada_Index_Pipeline_Reference.md` | Developer, LLM diagnosis |
| **Dashboard Technical Reference** | `docs/Mada_Index_Dashboard_Reference.md` | Developer, LLM diagnosis |
| **Decision Log** | `docs/Mada_Index_Decision_Log.md` | Everyone |

All six live in `docs/` in the Git repo (root: `~/mada_index/`, GitHub: `github.com/tarekshalaby/mada-index`). **Markdown is the source of truth.** The User Guide's `.pdf` and `.docx` are *generated* artifacts for sharing with the team — when the guide changes, edit the markdown and regenerate them (see the Maintenance Guide, §7).

---

## 6. Archived planning documents

The following documents were produced during the design and planning phases. They are accurate as of their creation date but are **not actively maintained** — the technical references above supersede them for anything operational. They're worth reading for historical context on design intent.

| Document | What it was for |
|---|---|
| `docs/Mada_Dashboard_Brief.md` | Original project brief and scope |
| `docs/Mada_Dashboard_Plan.md` | Implementation plan by phase |
| `docs/Mada_Index_Design_Language.md` | Visual design system spec (tokens, typography, colour roles) |
| `docs/Mada_Metrics_Spec.md` | Metrics definitions and rationale (superseded by Decision Log) |
| `docs/Mada_Visualization_Spec.md` | Chart and visualization specifications |
| `docs/Mada_Persona_Map.md` | User persona research |
| `docs/Mada_Question_Map.md` | Questions the dashboard was designed to answer |

---

## 7. Maintaining these docs & resuming work

The full protocol — how to update each doc, how to regenerate the User Guide's shareable formats, the versioning rule, and how to resume a session cold — lives in **`docs/README.md`**. Read that first whenever you come back to this.

The short version:
- **Edit the markdown in `docs/`.** That's the source of truth for every document.
- **Bump the version line** in the doc header when content changes materially.
- **For the User Guide only**, regenerate the `.pdf` / `.docx` after editing (the markdown is the master; those are downstream copies).
- **Decision Log is append-only** — add a new DL-xx entry; never rewrite an old one.
- **Commit** with a clear message so the change is traceable.

---

*End of Documentation Index (v1.1).*
