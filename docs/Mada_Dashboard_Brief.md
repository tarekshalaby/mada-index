# Mada Masr Content Intelligence Dashboard

**Project brief for Mada Masr**
*Version 0.2 — post-meeting revision*
*Last updated: May 1, 2026*

> **What changed in v0.2:** Added a Categorization Approach section describing the AI-driven classification flow, so the editorial team is not asked to tag content. Added a Security and Data section answering the data-handling questions raised in the post-meeting exchange. Reframed the metrics weighting as empirically tuned from real conversion data rather than fixed up front. Replaced the existing-WordPress-derived Section list with a small analytical set proposed for refinement with Mada. Trimmed the dashboard view list to focus on Stories as the primary working view. Vague-ened Phase 2 to reflect that its shape will follow from real-world use of Phase 1.

---

## Table of Contents

1. [Overview](#overview)
2. [What the Dashboard Will Do](#what-the-dashboard-will-do)
3. [Who It's For](#who-its-for)
4. [Stack and Architecture](#stack-and-architecture)
5. [Categorization Approach](#categorization-approach)
6. [Security and Data](#security-and-data)
7. [Metrics Framework](#metrics-framework)
8. [Scope and Phasing](#scope-and-phasing)
9. [Timeline and Investment](#timeline-and-investment)
10. [What We Need from Mada](#what-we-need-from-mada)
11. [Open Questions](#open-questions)
12. [Appendix A: Content Framework](#appendix-a-content-framework)
13. [Appendix B: Data Architecture](#appendix-b-data-architecture)
14. [Appendix C: Integration Approach](#appendix-c-integration-approach)

---

## Overview

Mada Masr produces content across many channels — two websites (Arabic and English), Facebook, Instagram, X, LinkedIn, YouTube, newsletters, and podcasts. Each channel has its own analytics, its own reporting tools, its own dashboard. Nothing brings them together.

The result is that it's genuinely difficult to answer questions like:

- How is our coverage of the war on Lebanon doing across all channels?
- Which articles are readers spending real time with, versus which ones got a burst of traffic and died?
- Is Sudan Nashra reaching more people than our standard news pieces?
- How well did a particular story perform on its full publication journey — from the website, through socials, to email?
- Are our social posts actually driving readers to the website and to newsletter signups?

This project builds a single dashboard that answers these questions. It sits on top of a unified database that collects and standardizes data from every platform Mada publishes on, and it presents the picture in one clear interface that the Managing Editor and social team can open on any device.

The goal is not to replace any platform's native analytics. GA4, Meta Business Suite, and YouTube Studio will always go deeper than we can. The goal is to make the *cross-platform* picture visible for the first time — and to make story-level questions, which today require manual data compilation across multiple sources, immediately answerable.

---

## What the Dashboard Will Do

The dashboard is organized around a few core views:

**Overview**
The landing page. Headline metrics for the selected date range, with comparison to the previous period. Recent highlights — top-performing stories, notable spikes. Publishing velocity by format.

**Stories**
The primary working view, and the answer to Mada's top priority question: *"how did X story perform across platforms."* Every published piece of content, grouped by story. Pick any story and see its full publication journey — the website article (Arabic and English), every social post promoting it, the newsletter that included it, any video or podcast referencing it. All metrics rolled up; all timing visible.

**Content**
Every piece of content Mada has published, in one filterable list. Filter by language, format, section, topic, series, author, date range, platform. Sort by any metric. Drill into any piece for full performance detail.

**Platforms**
Cross-platform comparison — which channels are driving the most reach, engagement, and site traffic? Per-platform views when native detail is wanted (Facebook reaction breakdowns, Instagram saves, YouTube watch time retention).

**Headlines**
Aggregate metrics suitable for grant reports and high-level overviews. Quarterly and half-year totals for traffic, engagement, and follower growth, exportable in formats useful for external sharing.

Topic-based and Series-based queries are available throughout the dashboard as filters and cuts on the Stories and Content views, rather than as separate dedicated pages.

---

## Who It's For

The Managing Editor and the social/audience team are the primary users.

For the Managing Editor: what's working, what's not, and how individual stories are performing across the full publication journey. Surfaced primarily through the Overview and Stories views.

For the social/audience team: platform-level performance in detail, story-grouped views for assessing reach, and clarity on which social treatments translate into website and newsletter traction.

The business/commercial and fundraising teams aren't the primary users, but the Headlines view gives them what they typically need for grant reports and high-level overviews. Specific funder questions that need deeper cuts can be pulled from the Content or Stories views directly.

---

## Stack and Architecture

**Airtable** — the database backbone. All content, all metrics, all editorial classification lives here.

**Make.com** — the integration layer. Make pulls data from every platform's API on a schedule, normalizes it, runs the AI classification step, and writes everything to Airtable. Make also handles the automatic linking between social posts and the articles they promote.

**Custom dashboard** — built with modern web tools, hosted simply, password-protected.

**Data refresh.** Every 4–6 hours. New content appears in the dashboard within hours of publishing.

**Historical tracking.** Every piece of content has a daily metric snapshot captured for its first 90 days, then weekly snapshots indefinitely. This lets us see how performance evolves over time — articles that pick up long after publishing, content with sustained engagement versus quick bursts.

---

## Categorization Approach

A core principle of the project: **the editorial team does not tag content for the dashboard.** Classification is handled automatically.

When an article is published, an automation reads the article and assigns it to controlled vocabularies that are defined up front. Four classification dimensions:

### Format

What kind of content it is. Drawn from a fixed list:

- News
- News Feature
- Feature/Investigation
- Op-Ed
- Panorama
- Cartoon
- Newsletter
- Podcast
- Video
- Breaking News
- Story of the Day
- Platform-native (for standalone social content not tied to a specific article)

WordPress already exposes most of this on the backend. The AI handles only the cases WordPress doesn't disambiguate (notably News Feature vs. Feature/Investigation), with a manual override field available for cases the AI gets wrong.

### Series

For content belonging to a named recurring editorial project. Drawn from a fixed list:

- Nashret Mada al-Youmiya
- Nashret Gaza
- Eye on Sudan / Sudan Nashra
- Detox
- Montaha al-Adab
- Story of the Day
- Mada Membership *(if applicable — to be confirmed)*

Most content has no Series. The AI matches against the list when there's a clear signal (an article titled "Nashret Mada — April 28," for example).

### Section

High-level subject area. **Defined for this project as a small analytical set, distinct from the existing WordPress categories.** Starting proposal:

- Egypt — politics
- Egypt — economy
- Egypt — society
- Regional & international
- Culture
- Documentation & witness

Each piece has one primary Section. This is intentionally a small, coarse set — granular thematic work happens at the Topic layer.

This Section vocabulary is the most editorially-sensitive piece of the taxonomy. We propose this set as a starting point and refine it with Mada before going live.

### Topics

Granular thematic tags that span Sections and time. A piece typically has 1–4 Topics. The list grows over time as Mada covers new ground. Examples:

- "2026 Israeli war on Lebanon"
- "Sudan war"
- "Egyptian central bank policy"
- "Cairo housing crisis"
- "Detained writers and journalists"
- "Climate change in Egypt"

### How it works

For each new article, the automation sends the title, dek, and body to Claude with the existing list of Topics. Claude returns:

- Format (if not already determined from WordPress)
- Section (one)
- Series (if any)
- Topics (1–4 from the existing list, plus any new ones it suggests for novel material)

Confirmed Topics from the existing list go straight into the live record. New Topic suggestions go into a review queue. Someone on Mada's side reviews the queue periodically — approves, rejects, or merges with existing — and approved Topics join the live list. This is light-touch governance: roughly 5 minutes a week.

Semantic similarity is used when matching against existing Topics, so "Sudan war" and "Sudan crisis" get unified rather than created as duplicates.

### Topic propagation

When a social post promotes an article, it inherits the article's Format, Section, Topics, and Series automatically through the Promotes link. So a Facebook post about a central bank investigation carries `[central bank, currency devaluation, monetary policy]` without anyone tagging it. **This is what makes story-level cross-platform queries work.**

For platform-native social content (a standalone Instagram carousel that doesn't promote a specific article), the AI classifies the post directly from its caption — and, where useful, from its visual content — using the same Section and Topic vocabularies.

### One-time backlog pass

The same classification runs once over the existing article archive at project start, so the dashboard has a populated historical record from day one rather than building up only from new publications.

### Worked example

A Beesan Kassab investigation on the November currency devaluation, published in both Arabic and English:

| Field | Value |
|---|---|
| Format | Feature/Investigation |
| Section | Egypt — economy |
| Series | (none) |
| Topics | Egyptian central bank, Currency devaluation, Monetary policy |
| Author | Beesan Kassab |

A Facebook post linking to the Arabic article inherits all four classifications via the Promotes link. So does the Instagram carousel summarizing it. So does the Nashret Mada edition that leads with it. The Stories view rolls everything up into a single story unit.

---

## Security and Data

The system handles only data that Mada has already publicly published, plus aggregate engagement metrics from each platform.

### What flows in

- Published articles (titles, URLs, body text, dek, byline, publish date)
- Social posts as they appear publicly (text, link, publish time)
- Newsletter editions (subject, body, publish date)
- Podcast episodes and videos (title, description, publish date)
- Aggregate engagement metrics: counts of impressions, reactions, comments, shares, saves, clicks, pageviews
- Author bylines and photo credits as they appear on the website

### What does not flow in

- Subscriber email addresses or any newsletter list data
- Follower lists or individual audience identities on any platform
- Comment text or commenter identities
- Session-level GA4 data — only aggregate per-article metrics
- Direct messages of any kind
- Any data that requires identifying individual audience members

### API access required

Read-only API access to each platform's public analytics endpoints, plus the WordPress feed. No posting permissions, no message access, no follower-list scopes. Specific scopes are reviewed per platform before any access is granted.

### Where the data lives

Airtable's hosted infrastructure. Airtable does not offer end-to-end encryption or self-hosting. Given that the entire database consists of publicly published content and aggregate engagement counts, the threat model is *"an attacker who breached the database would gain access to data already published on madamasr.com."* This is not a meaningful elevation of risk relative to what's already public.

---

## Metrics Framework

Every piece of Content has the same standardized metrics regardless of type:

| Metric | What it measures |
|--------|------------------|
| Impressions | Total times the content was displayed |
| Reactions | Likes, reactions (all types aggregated for Facebook) |
| Comments | Comment count |
| Shares | Shares, retweets, reposts, forwards |
| Saves | Saves, bookmarks (where exposed) |
| Clicks | Link clicks (where exposed) |
| Video Views | View count for video content |
| Video Watch Time | Total watch time in seconds |
| Weighted Engagement | Composite score (see below) |
| Engagement Quality Rate | Weighted Engagement ÷ Impressions × 100 |

### Weighted engagement: starting weights

The composite score weights different interactions differently. Starting weights are set to reflect Mada's stated priority of converting social engagement into website visits and newsletter signups:

- **Saves** and **link clicks** rated highest — these are the strongest signals of intent to consume the underlying article.
- **Comments** in the middle, as a substantive engagement signal.
- **Shares** rated lower than in a standard formula, given that publicly sharing politically sensitive content carries personal risk for many of Mada's readers in Egypt.
- **Reactions** as the baseline engagement signal.
- **Read/watch time** included where available.

Specific weight values are recorded in the system and adjustable at any time.

### Empirical reweighting

After the first month of real data, a correlation analysis is run: *which engagement signals on a social post most strongly predict subsequent pageviews on the linked article and newsletter signups in the days that follow?* The weights are retuned based on what the data actually shows.

This is not a one-time decision. The weighting is reviewed quarterly and tuned as patterns evolve. The weights are versioned, so historical comparisons remain valid.

This approach has two benefits: it removes the guesswork from initial weighting, and it makes the weighting empirically defensible — Mada can answer *"why is a save worth more than a share"* by pointing to actual conversion patterns in their own data rather than to an opinion.

### Per-platform mapping

Each platform exposes different native metrics. The mapping standardizes them:

| Platform | Impressions | Reactions | Shares | Special |
|----------|-------------|-----------|--------|---------|
| Article (GA4) | Pageviews | — | — | Reading time contributes to engagement |
| Facebook | Impressions | All reactions summed | Shares | — |
| Instagram | Impressions | Likes | Shares | Includes Saves |
| X | Impressions | Likes | Retweets + Quote Tweets | Includes Bookmarks |
| LinkedIn | Impressions | Reactions | Reposts | — |
| YouTube | Views | Likes | Shares | Watch time heavily weighted |
| Newsletter | Opens | — | Forwards (if tracked) | Clicks are primary engagement |
| Podcast | Downloads | — | — | Listen time if exposed |

### Period comparison

Every metric is shown with delta vs. a comparison period. Pick any two ranges — "this week vs last week," "this month vs last month," "Q1 2026 vs Q1 2025" — and the delta is computed.

---

## Scope and Phasing

**Phase 1 (this project) covers:**

- Full data integration for all platforms: WordPress (both Arabic and English sites), GA4, Facebook, Instagram, X, LinkedIn, YouTube, newsletter platform, podcast host
- Unified Airtable base with AI-driven classification across Format, Series, Section, and Topics
- One-time backlog classification pass on the existing article archive
- Standardized metrics framework with empirically-tuned weighting
- Full dashboard with the views described above
- Topic governance interface for approving AI-suggested new Topics

**Phase 2 (future, not included)** would extend the system in directions Mada finds useful as the dashboard sees real-world use — additional platforms, deeper analytical cuts, or specific features that emerge from actual use of Phase 1. The shape of Phase 2 is intentionally undefined; it follows from what Phase 1 surfaces as needed.

---

## Timeline and Investment

**Total: ~70 hours, $5,250** (at $75/hr)

| Phase | Hours |
|-------|-------|
| Discovery and architecture | 8 |
| Airtable base setup | 8 |
| Make integrations (all platforms) | 18 |
| AI classification setup and backlog pass | 6 |
| Dashboard build | 20 |
| Testing, refinement, handover | 10 |

Delivery: ~4 weeks from kickoff, assuming Mada is available for occasional check-ins and feedback during the build.

**What's included:**
- All development and configuration
- Deployment and hosting setup
- Documentation for the team
- One training session with the Managing Editor and social team
- Two weeks of post-launch support for bug fixes and minor adjustments

**What's not included:**
- Ongoing monthly costs for Make and Airtable (Mada's existing subscriptions may suffice; if upgrades are needed, this will be flagged)
- Hosting (free at this scale)
- Phase 2 additions

---

## What We Need from Mada

To kick off the build:

**Platform access.** Read-only API access (or admin-level access we can scope down) to each platform Mada publishes on, including both WordPress sites, GA4, Facebook, Instagram, X, LinkedIn, YouTube, the newsletter platform, and the podcast host. Specific scopes reviewed per platform before access is granted.

**Sign-off on the proposed Section vocabulary.** The six-Section starting set (Egypt politics, Egypt economy, Egypt society, Regional & international, Culture, Documentation & witness) is a proposal — Mada's editorial input on whether these are the right cuts, before going live.

**Designation of the Topic governance reviewer.** One person on Mada's side to handle the weekly ~5-minute review of AI-suggested new Topics.

---

## Open Questions

1. **Section vocabulary refinement.** The six-Section starting set is a proposal. We expect at least one round of iteration with Mada before locking it.

2. **News Feature vs. Feature/Investigation distinction.** WordPress doesn't disambiguate these, but they're editorially distinct, and investigation performance is one of Mada's priority questions. Default approach: AI classifies, with a manual override field for cases the AI gets wrong. Confirmation needed that this is acceptable.

3. **Penetration Rate benchmark for website articles.** For social posts, the benchmark is follower count. For articles, the options are (a) average monthly unique visitors as a steady normalization point, (b) highest single-day pageviews as a more aspirational benchmark, or (c) skipping Penetration Rate for articles entirely and using percentile rank instead. Worth a brief conversation.

4. **"Story of the Day" handling.** This is both a Format and a Series. The system handles that fine (a piece can carry both attributes), but worth confirming the team thinks of it the same way.

5. **Mada Membership as a Series.** Original brief listed it; needs confirmation that this is still an active recurring editorial project.

---

## Appendix A: Content Framework

### The core concept: Content

Everything Mada publishes anywhere is treated as **Content**. An article on the website is Content. A Facebook post is Content. A newsletter edition is Content. A podcast episode is Content.

Each piece of Content has:
- A **Type** (Article, Facebook Post, Instagram Post, X Post, LinkedIn Post, YouTube Video, Newsletter, Podcast Episode)
- A **Language** (Arabic, English, Both, or Not Applicable)
- A **Publish Date**
- Editorial classification: **Format, Section, Topics, Series, Author**
- Standardized performance metrics

### How content links together

- An article's Arabic and English versions are linked as translations, where the WordPress link exists. (Mada noted this link is editorially-driven and not always present; the system handles this gracefully.)
- A social post is linked to the article(s) it promotes via a Promotes field.
- When a social post references both language versions of an article, it's linked to both.

This linking is what makes the Stories view possible — it's the unit of analysis for the priority "story journey" question.

---

## Appendix B: Data Architecture

The Airtable base has three layers:

1. **Platform-specific tables** — one per platform, preserving the native richness of each platform's data
2. **A unified Content table** — one record per piece of content, regardless of type, with standardized metrics
3. **Lookup and supporting tables**

Section, Format, and Series are implemented as single-select fields with controlled values rather than as separate tables, because the vocabularies are small and fixed. Topics is a separate table because the list grows and each Topic carries metadata.

### Approximate table list (~21 tables)

**Platform content tables (with history):**
1. Articles
2. Articles History
3. Facebook Posts
4. Facebook Posts History
5. Instagram Posts
6. Instagram Posts History
7. X Posts
8. X Posts History
9. LinkedIn Posts
10. LinkedIn Posts History
11. YouTube Videos
12. YouTube Videos History
13. Newsletters
14. Newsletters History
15. Podcast Episodes
16. Podcast Episodes History

**Unified layer:**
17. Content

**Supporting:**
18. Topics
19. People (Authors and, where available, Photographers)
20. Platform Accounts
21. Followers History

### How the layers work together

When Make detects a new Facebook post via the Meta API:
1. It creates a record in **Facebook Posts**, preserving every native field (reaction breakdown, post type, video metrics, etc.)
2. It creates a record in **Content**, with standardized metrics and editorial classification
3. The two records are linked

Every metrics sync (every 4–6 hours):
1. A new snapshot is added to **Facebook Posts History** with current platform-native metrics
2. The Facebook Posts record updates current metrics via Airtable rollups
3. The Content record updates standardized metrics via Airtable rollups

The dashboard primarily queries **Content** for cross-type views and drops into platform-specific tables when native detail is needed (e.g., Facebook reaction breakdown for a specific post).

### Why this architecture

The alternative — one giant table for everything — would mean either empty fields for most records (a Facebook post has no "word count") or losing the platform-specific richness. Keeping platform tables separate preserves faithful data; the Content table provides the unified layer needed for cross-platform queries.

---

## Appendix C: Integration Approach

### Data sources and collection methods

| Source | Method | Frequency |
|--------|--------|-----------|
| WordPress (both sites) | REST API or RSS | On new publish + every 6 hours |
| Google Analytics 4 | GA4 API | Every 6 hours |
| Facebook | Meta Graph API | Every 4 hours |
| Instagram | Meta Graph API | Every 4 hours |
| X (Twitter) | Apify scraper | Every 6 hours |
| LinkedIn | LinkedIn API or Phantombuster | Every 6 hours |
| YouTube | YouTube Data API | Every 6 hours |
| Newsletter | Mailchimp API | Per campaign + every 12 hours |
| Podcast | Hosting platform RSS or API | Every 12 hours |

### Automatic content linking

When a social post is detected, Make runs this logic to find the article it promotes:

1. **Direct URL match** — If the post contains a madamasr.com link (including the mirror site), match directly to the article. High confidence, auto-linked.
2. **Link-in-bio resolution** (Instagram) — Query Later.com and Bitly to find what link was active when the post was published.
3. **Fuzzy title match** — For posts without direct URLs, compare the post text against recent article titles. High-confidence matches auto-link.
4. **Review queue** — Unlinked or low-confidence posts appear in a small review interface for the social team to confirm or mark as platform-native content.

Expected accuracy: 70–80% of social posts auto-linked correctly; the rest pass through brief human review.

### What's automated vs manual

**Automated:**
- New content detection and ingestion
- Metric snapshot collection
- Standardized metric computation
- AI classification (Format, Section, Series, Topics)
- Topic and classification inheritance from article to promoting posts
- Translation relationship detection (where the WordPress link exists)

**Manual (small, ambient workflows):**
- Confirming low-confidence article links for social posts (~5 minutes/week)
- Reviewing AI-suggested new Topics (~5 minutes/week)

---

*End of document.*
