# Mada Index — User Guide

**Version 1.0 · Last updated June 2026**

This is the guide for *using* the Mada Index dashboard. It's written for everyone at Mada who reads the dashboard — editors, the social and audience team, business, and fundraising. You don't need any technical background to follow it.

There is a separate set of technical documents for the people who maintain the system behind the dashboard. You'll only need those if something breaks or you're adding new features — see §15.

> **Note:** screenshots are marked with **[ 📷 Screenshot: … ]** throughout. These can be added when convenient. A list appears at the end of the guide under *Before you share this*.

---

## Contents

**A · Orientation**
1. How to use this guide
2. What Mada Index is, and why it exists

**B · Airtable, the data, and access**
3. Understanding Airtable
4. How it all fits together
5. Getting in, and sharing access

**C · Using the dashboard**
6. Reading any screen
7. Overview
8. Stories
9. Content
10. Platforms
11. Team
12. Reports

**D · Limits, the base, and getting help**
13. What the dashboard does and doesn't do
14. The few things you do in the base
15. Getting help, reporting bugs & requesting features
16. Glossary

---

## A · Orientation

### 1. How to use this guide

You can read this start to finish, or dip into the section you need. The quickest way in is the table below — find what you're trying to do and jump to that view. Any unfamiliar word is defined in the Glossary (§16).

| If you want to… | Go to |
|---|---|
| Get the month's headline numbers | Overview (§7) |
| Follow one story across all platforms | Stories (§8) |
| Look up a single post's numbers | Content (§9) |
| Compare how the platforms performed | Platforms (§10) |
| See what each writer published | Team (§11) |
| Pull numbers for a funder report | Reports (§12) |
| Understand a metric or a term | Glossary (§16) |

The guide assumes nothing technical. Where it helps, it points to the deeper technical documents — but you should never *need* those just to read the dashboard.

### 2. What Mada Index is, and why it exists

Mada publishes across many channels and in two languages. A single piece of journalism often appears as a website article, several social posts, a newsletter mention, and sometimes a video or podcast segment — in Arabic, in English, or both. Until now there was no single place to see how a story did across all of that together, and building the monthly performance picture meant stitching numbers together by hand from each platform's own analytics.

**Mada Index brings every channel into one dashboard, grouped the way Mada thinks about its work: by story.** It's built to answer the questions the newsroom actually asks — how did this story travel from the site to social to the newsletter? Which formats and topics are pulling their weight? What's resonating, and what isn't? And, for the business and fundraising side, it produces clean, defensible totals for grant and donor reporting.

It's deliberately honest about its numbers. Because a single story's many posts are grouped together, nothing gets double-counted, and the dashboard is transparent — on screen — about what each figure does and doesn't mean.

**How it was built, and who maintains it.** Mada Index is a custom dashboard built directly inside Airtable (more on Airtable in §3). The data is collected automatically from each platform — nobody types numbers in by hand. It was built and is maintained by **Tarek Shalaby**. For fixes, changes, or new features, contact **tarek@shala.by** (Signal preferred).

---

## B · Airtable, the data, and access

### 3. Understanding Airtable

Mada Index lives inside **Airtable**, so it helps to understand what Airtable is.

Airtable is a cloud tool that's part spreadsheet, part database. Like a spreadsheet, data sits in **tables** of rows and columns. Unlike a spreadsheet, tables can be *linked* to one another — a row in one table can point to related rows in another (for example, a social post pointing to the story it belongs to). That linking is what lets Mada's data describe real relationships instead of just sitting in flat lists.

On top of those tables, Airtable lets you build **interfaces** — custom, app-like screens that present the data cleanly. **Mada Index *is* an interface.**

So there are two layers:

- **The tables** — the raw data: every post, every metric, every story, in rows and columns. This is the source of truth.
- **The interface (Mada Index)** — a polished dashboard built on top of those tables. This is what you use day to day.

Why this matters for Mada: all the performance data lives in one structured, linked, always-current place, and the dashboard turns it into something you can actually read — with no separate software to host or maintain. **You'll spend almost all your time in the interface.** You rarely need to touch the tables; the few exceptions are in §14.

### 4. How it all fits together

In plain terms, here's the journey from a published post to a number on the dashboard:

1. **Collected automatically.** A few times a day, the system fetches the latest numbers from each platform — the website (via Google Analytics), Facebook, Instagram, X, LinkedIn, YouTube, the newsletter (Mailchimp), and the podcast (Spotify).
2. **Stored in tables.** Each platform's numbers land in its own table, and a central **Content** table pulls every post together in one place, whatever platform it came from.
3. **Grouped into stories.** A **Stories** table groups the posts that all cover the same piece of journalism — the website article, its social posts, the newsletter mention — into a single story.
4. **Presented in the dashboard.** Mada Index reads all of this and lays it out across its views.

Why the links matter: because each post is linked to its story, the dashboard can show a story's whole journey across platforms — and, just as importantly, it can add up a story's reach *without counting the same thing twice*.

The whole thing refreshes on its own a few times a day. What that means for very recent posts is covered in §6.

### 5. Getting in, and sharing access

**Getting in.** Mada Index lives inside Airtable. To open it: sign in to Airtable with your account → open the **Mada Index** base → open the **Dashboard** interface. (If you'd like a direct link, ask Tarek — tarek@shala.by.)

> [ 📷 Screenshot: the dashboard's home / Overview screen ]

**The six views at a glance:**

| View | What it's for |
|---|---|
| **Overview** | The month's headline numbers across all platforms |
| **Stories** | One story's full journey across site, social and email |
| **Content** | Every individual post, sortable and filterable |
| **Platforms** | How each channel performed; followers and growth |
| **Team** | What each contributor published |
| **Reports** | A clean, printable summary for funders |

**Sharing access — the interface only.** Airtable lets you give someone access to the **interface only**, *without* giving them access to the underlying tables. This matters: they get the full dashboard, but they can't see or accidentally change the raw data. It's exactly the right level for anyone who only needs to read the numbers. To add someone or change who has access, contact **Tarek Shalaby (tarek@shala.by)** — only the base owner can grant or change access.

**Onboarding someone new.** Granting interface access is all a new person needs to start using Mada Index.

---

## C · Using the dashboard

### 6. Reading any screen

A handful of things work the same way everywhere. Learn these once and every view makes sense.

**The period selector (top of every screen).** Nearly everything on the dashboard is scoped to a time window. The selector lets you choose one — the last 7, 30, or 90 days, a specific month, a quarter, a half-year, or the full year. Change it and the whole view re-filters to that period.

> [ 📷 Screenshot: the period selector ]

**KPI tiles.** The large number cards at the top of most views. Each shows a headline figure, often with a small trend chip comparing it to the previous equivalent period (this month vs last, say), and sometimes a rank badge showing whether it sits in the top, middle, or bottom band compared with similar items.

**What the colours mean.** Green, amber and red signal **good / neutral / bad relative to a benchmark** — not simply up or down. The "good" direction depends on the metric: more impressions is good, a higher unsubscribe rate is not, so the colour always reflects good-versus-bad. Separately, **each platform has its own fixed colour** used purely to identify it in charts and badges — those platform colours never carry a good-or-bad meaning.

**Filtering.** Most views let you narrow what you're seeing — by platform, by format, by language (Arabic / English), and so on.

**The core metrics, in plain words** (full definitions in the Glossary, §16):

- **Impressions** — how many times content was shown.
- **Weighted Engagement** — a single score combining all the ways people engaged (clicks, saves, comments, shares, reactions, time spent), weighting the more meaningful actions more heavily.
- **Engagement Quality Rate** — engagement as a share of impressions: how hard the content worked per view.
- **Site Clicks** — visits driven to Mada's website.
- **Attention** — time spent reading or watching.
- **Followers** — audience size on each platform.
- **Penetration** — reach measured against the audience you already have.

**How current the data is.** The dashboard updates automatically a few times a day. Two things follow from that: a brand-new post may not appear until the next update; and a recent post's numbers keep growing for days or weeks as engagement comes in. So **very recent items will look low at first and fill in over time** — if you're looking at the last day or two, treat the figures as still maturing.

**Desktop vs phone.** The dashboard is designed for a desktop screen, where everything has room to breathe. You can open it on a phone to check something quickly, but the layout is tighter and some charts are easier to read on a larger screen.

### 7. Overview

**What it's for:** the month's picture across everything, at a glance — usually the first screen to open.

**What's on it:**

- Five headline tiles: Impressions, Weighted Engagement, Site Clicks, Total Followers, and Attention.
- **Format performance** — how different formats (investigation, explainer, and so on) performed, broken down by platform.
- **Publishing velocity** — how much was published per week over the period.
- **Top stories** — the period's strongest stories, ranked.
- **Top topics** — the topics drawing the most engagement.
- **Follower snapshot** — current audience size per platform.

**How to read it:** start with the tiles for the headline numbers, then use format and topic performance to see *what kind* of work resonated.

> [ 📷 Screenshot: the Overview view ]

### 8. Stories

**What it's for:** this is the view built around Mada's biggest question — how did a story do across its *whole* journey, from the website to social to the newsletter? It's the thing no other tool showed before.

**The list:** stories for the period, ranked by Weighted Engagement. Each one shows its **platform journey** — which channels it ran on, in order — alongside its combined headline numbers.

**Story detail:** click any story to open it. You'll see a card for each platform the story appeared on, with that platform's own numbers, plus small **honesty labels** (like "story-level · de-duped") that tell you exactly what's being counted, so the totals are never misleading.

**Using it to plan:** because the view shows demonstrated audience demand by topic, series and format, it's a direct input to what to commission next — which series are worth continuing, which formats are pulling their weight.

> [ 📷 Screenshot: a story's detail / journey view ]

### 9. Content

**What it's for:** the full, detailed list of every individual piece of content for the period — one row per platform post.

**Working with it:** sort it, and filter by platform, format, or language to find what you need. Click any item to see its full platform-native detail — for example, the reaction breakdown on a Facebook post, or retention on a YouTube video.

**When to use it:** when you want the granular, post-by-post view rather than the story-level or summary view.

> [ 📷 Screenshot: the Content list ]

### 10. Platforms

**What it's for:** how each channel performed, and how the audience is growing. It has three tabs.

**Performance** (the default tab) — a **Channel comparison** that ranks every platform against the others. A toggle lets you rank by Impressions, Engagement, Quality, or Site clicks, and a language toggle switches between All, Arabic, and English. Each row shows the platform's post count, its average per post, the trend versus the previous period, and the total — click any row to open that platform's native metrics and its content. Below it, an **Engagement mix** chart shows how each platform's engagement breaks down across reactions, comments, shares, saves and clicks, normalised so you're comparing the *mix*, not the volume.

> [ 📷 Screenshot: Platforms → Performance ]

**Audience** — **Current followers** for each platform, shown as tiles, and a **Follower growth** chart (weekly account totals, stacked by platform).

> [ 📷 Screenshot: Platforms → Audience ]

**Publishing** — a **Publishing cadence** heatmap: a week-by-day grid where a darker cell means more was published that day, with a toggle to colour it by Publishing (how much went out) or Engagement (how it did).

> [ 📷 Screenshot: Platforms → Publishing ]

### 11. Team

**What it's for:** who published what. It lists the contributors who had work published in the selected period, with each person's article list, their trend over time, and their strongest stories.

**Important — what Team measures.** Contributor credit exists only for **website articles**. Social posts, the newsletter, videos and podcasts aren't attributed to individual people, so **Team measures article output specifically** — not someone's full contribution across every channel. Read it with that in mind.

**The quality figure.** The quality rate shown for a contributor is a **weighted** rate (total engagement divided by total impressions), not a simple average of their individual pieces — so a single small post can't swing it.

> [ 📷 Screenshot: a contributor profile ]

### 12. Reports

**What it's for:** a clean, funder-ready summary you can print or export — designed for grant and donor reporting.

**What's in it:** reach and engagement headlines, top stories, a platform breakdown, the content mix, audience totals, and a campaign section where you can filter to a topic to build a narrative around a specific body of work.

**Print and export:** a print button opens a clean, print-ready version you can save as a PDF; a separate export gives you the period's content as a CSV file.

**Why the numbers hold up:** the totals here are de-duplicated and defensible — a story covered on five platforms is counted once, and nothing is attributed to anyone or anything without basis. They're built to survive outside scrutiny.

> [ 📷 Screenshot: the Reports / printable summary ]

---

## D · Limits, the base, and getting help

### 13. What the dashboard does and doesn't do

**It's at its best for:** seeing a story's full cross-platform journey; comparing formats, topics, series and platforms; spotting trends; and producing defensible aggregate totals.

**Read these honestly:**

- **It's not real-time.** Numbers update a few times a day, and very recent posts are still maturing (§6).
- **Contributor credit is article-only.** Team reflects website-article bylines, not someone's full output across all channels (§11).
- **Follower growth is shown *next to* content, not *caused by* it.** When you see follower growth alongside the content timeline, that's a *correlation* you can read — not proof that a particular story "earned" those followers. No tool can attribute followers to a single post reliably, so the dashboard shows the overlay and lets you judge.
- **It shows the "what," and helps you infer the "why."** The dashboard can't tell you *why* something worked, but it places the right comparison next to each headline number so you can reason about it.
- **One quirk worth knowing:** for the podcast, the penetration figure can read above 100%, because it's measured against Spotify followers while listens can come from well beyond them. That's expected, not an error.

### 14. The few things you do in the base

You'll spend nearly all your time in the dashboard. There are only a couple of reasons to open the underlying tables:

- **Sync Settings.** How often each platform's data refreshes is controlled from a table called **Sync Settings** — this isn't shown in the dashboard. You'd only come here to check or change a platform's update schedule.
  > [ 📷 Screenshot: the Sync Settings table ]
- **The Errors table.** If something seems stuck, there's a table that logs problems the system runs into. A quick glance can tell you whether a particular platform's update is failing.

You don't need to know how to *operate* these to use the dashboard, and the people who maintain the system have a dedicated runbook that covers them in full. If something looks wrong, see §15.

### 15. Getting help, reporting bugs & requesting features

**If a number looks wrong, check these first:**

1. Is the period selector set to the window you actually mean?
2. Is the post very recent? Its numbers may still be maturing (§6).
3. Glance at the Errors table (§14) — is a platform's update stuck?

If it still looks wrong: hand the technical documentation to an AI assistant and describe exactly what you're seeing — it can walk you through diagnosing it — or contact **Tarek Shalaby (tarek@shala.by · Signal preferred)**.

**Reporting a bug in the dashboard.** Send **tarek@shala.by** (Signal preferred) a note that includes: which view you were on, the period you had selected, what you expected to see versus what you saw, and a screenshot if you can. That's usually enough to pin it down quickly.

**Requesting a new feature or a next phase.** Jot down what you'd like the dashboard to do, and contact Tarek to scope it as a new phase of work. Gathering a few requests together before reaching out usually makes that conversation more productive.

### 16. Glossary

- **Attention** — total time people spent reading or watching content. Shown in hours/minutes.
- **Benchmark (colours)** — the green / amber / red system. It marks a figure as good, neutral, or bad *relative to a reference point*, with the "good" direction set per metric. It is not a simple up/down indicator.
- **Cadence** — the pattern of *when* content is published (which days, how regularly), usually shown as a week-by-day grid.
- **Clicks** — when someone clicks through on a post.
- **Comments** — comments left on a post.
- **Content (table / item)** — the unified record of a single platform post. The Content table holds one row per post across every platform.
- **Engagement Quality Rate (EQR)** — Weighted Engagement divided by Impressions, as a percentage. How hard a piece worked per view.
- **Format** — the editorial type of a piece (e.g. investigation, explainer, feature).
- **Impressions** — the number of times content was shown. (Preferred over "reach," which implies *unique* people.)
- **Interactions** — the simple count of engagement actions (reactions, comments, shares, saves, clicks) added together, without weighting.
- **MailChimp** — the email marketing platform used for Mada's newsletter. What Mada calls the "newsletter" in everyday conversation; the dashboard reflects this by labelling the channel "MailChimp" everywhere you see platform names.
- **Penetration Rate** — reach measured against an audience you already have (for social, your followers; for the newsletter, emails sent; for the podcast, Spotify followers). Can exceed 100% for the podcast — see §13.
- **Percentile / rank band** — where a value sits compared with others of the same kind, shown as top / middle / bottom.
- **Period** — the time window selected at the top of the screen; it scopes everything on the view.
- **Platform colour** — the fixed colour used to identify each platform in charts and badges. Identity only — never a good/bad signal.
- **Reactions** — likes and other reaction types on a post.
- **Reports** — the printable, funder-ready summary view (§12).
- **Saves** — when someone saves or bookmarks a post.
- **Section** — Mada's editorial section (e.g. politics, economy, culture).
- **Series** — a named, ongoing series of related coverage.
- **Shares** — when someone shares or reposts a post.
- **Site Clicks** — visits driven to Mada's website from a post. Counted at the destination, so two posts linking to the same article don't double-count.
- **Story** — a single piece of journalism grouped across all the platforms it appeared on. The unit the dashboard is built around.
- **Sync / Sync Settings** — a "sync" is one automatic data refresh from a platform. **Sync Settings** is the table that controls how often each platform refreshes (§14).
- **Topic** — a subject tag describing what a piece is about.
- **Velocity** — how much was published over time, e.g. pieces per week.
- **Weighted Engagement (WE)** — a single engagement score that weights more meaningful actions more heavily (clicks and saves count for more than a reaction). The dashboard's main "how did this do?" number.

---

## Before you share this

A quick checklist of screenshots to add before this guide goes to the team:

- [ ] **§5** — screenshot of the dashboard's home / Overview screen
- [ ] **§6** — screenshot of the period selector
- [ ] **§7** — screenshot of the Overview view
- [ ] **§8** — screenshot of a story's detail / journey view
- [ ] **§9** — screenshot of the Content list
- [ ] **§10** — screenshots of Platforms → Performance, Audience, Publishing
- [ ] **§11** — screenshot of a contributor profile
- [ ] **§12** — screenshot of the Reports / printable summary
- [ ] **§14** — screenshot of the Sync Settings table

*End of guide.*
