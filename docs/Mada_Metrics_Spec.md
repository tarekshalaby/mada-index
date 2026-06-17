# Mada Index — Metrics Spec (Content + Stories)

*Planning & Architecture · the canonical metric definition · sits on the Question Map, feeds the Database build and the Visualization spec*
*Status: finalized. Spec only — field/formula implementation lands in follow-up Database tasks.*

Two deliverables: the standardized per-piece metric set on **Content**, and the rollup set on **Stories**. Question IDs (ME-1, AN-4 …) reference the Question Map. Every metric answers a mapped persona question — nothing is measured for its own sake.

---

## 1. Platform → Content mapping (the inputs)

All nine platform workers already mirror their rows into Content with standardized inputs. The mapping (corrected against live data):

| Universal field | Article (GA4) | Facebook | IG Post | IG Story | LinkedIn | X | YouTube | Newsletter | Podcast |
|---|---|---|---|---|---|---|---|---|---|
| Impressions | Pageviews | Impressions | Views | Views | Impressions | Impressions | Views | Opens | Streams & Downloads |
| Reactions | — | Total reactions | Likes | — | Reactions | Likes | Likes | — | — |
| Comments | — | Comments | Comments | Replies | Comments | Comments | Comments | — | — |
| Shares | — | Shares | Shares | Shares + Reposts | Shares | RT + Quote | Shares | — | — |
| Saves | — | — | Saves | — | — | Bookmarks | Saves | — | — |
| Clicks (link) | — | **— (removed)** | — | Link taps | Clicks | — | — | Link clicks | — |
| Video Views | — | Video Views | Views | — | — | — | Views | — | — |
| Watch/Read (min) | Engaged sec ÷ 60 | Watch ms ÷ 60000 | Watch ms ÷ 60000 | — | — | — | Watch min | — | Listen hrs × 60 |

**Two corrections applied:**
- **Facebook Clicks removed.** FB's click metric counts any interactive click on the post, not link clicks — it was inflating Weighted Engagement and Engagement Quality Rate. Column emptied in Content; mapping removed in the FB worker (create + update branches).
- **Article read-time unit fixed.** GA `userEngagementDuration` arrives in seconds; the Content module now divides by 60 to land in minutes. Verified live: articles now show ~20–40 sec engaged time per pageview and EQRs in the teens–thirties (was 1,945%). Older articles correct on the monthly GA run.

**Native Clicks vs Site Clicks.** Native link clicks are kept only where a platform genuinely reports them (IG Stories, LinkedIn, Newsletter); these feed the Weighted Engagement *Clicks* term. **Site Clicks** is a separate metric — measured link clicks to madamasr from the Links table (Bitly + t.co + Mailchimp link-level) — and is the cross-platform socials→site signal (AN-1). It is *not* part of Weighted Engagement. (Consequence: a viral FB/X post's link clicks appear in Site Clicks, not in its Weighted Engagement, since those platforms expose no native click field. Accepted for simplicity; the click story stays visible via Site Clicks.)

---

## 2. Content table — per-piece metrics

### 2a. Raw inputs
Impressions, Reactions, Comments, Shares, Saves, Clicks (link), Video Views, Watch/Read time (minutes) — sourced per the mapping above. Stored on Content; platform tables keep native richness.

### 2b. Derived / standardized

| Metric | Definition & formula | Answers | Persona |
|---|---|---|---|
| **Interactions** | Raw discrete-action sum: `Reactions + Comments + Shares + Saves + Clicks`. Cross-Type comparable volume. | ME-4, AN-3 | ME, Analyst |
| **Weighted Engagement** | `Clicks×5 + Saves×4 + Comments×3 + Shares×2 + Reactions×1 + Watch/Read-min×0.5`. The total value score; **time retained**. | ME-1, ME-2, ME-4, AN-5 | ME, Analyst |
| **Attention (avg)** | `Watch/Read minutes ÷ Impressions`. Headline for long-form (video/podcast/article). | ME-1, AN-3 | ME, Analyst |
| **Attention (total)** | `Watch/Read minutes` total. Total watch/listen/read minutes for grant headlines. | FR-1 | Fundraising |
| **Engagement Quality Rate** | `Weighted Engagement ÷ Impressions × 100`. Engagement richness per impression. Can exceed 100 for attention-heavy content — read as an index, not a capped %. | AN-4 | Analyst, ME |
| **Site Clicks** | Σ clicks on this piece's outbound madamasr links, from linked Links rows (Bitly + t.co + Mailchimp). | **AN-1** | Analyst |
| **Penetration Rate** | `Impressions ÷ Potential Audience × 100`. Denominators in §4. | ME-1, FR-3 | ME, Fundraising |
| **Exposure Percentile** | Percentile rank of Impressions **within Type**. Dashboard-computed (§5). | ME-4 | ME, Analyst |
| **Engagement Quality Percentile** | Percentile rank of EQR **within Type**. Dashboard-computed (§5). | ME-4, AN-5 | Analyst |

---

## 3. Stories table — rollup metrics

A Story = anchor article + translations + every post/newsletter/video that promotes it. Rollups aggregate across member Content rows. **All values are lifetime** (§6).

**Double-counting guardrail (required):** add **`Counts Toward Story Total`** (checkbox on Content, default true; **false** for newsletters/roundups spanning multiple stories). Summed rollups count only where true; multi-story members still link in and display as "appeared in" without inflating totals. This is the defensible-aggregates requirement for Fundraising (FR-1).

| Rollup | Definition | Answers | Persona |
|---|---|---|---|
| **Story Impressions** | Σ Impressions (counting members) | ME-1, FR-3 | ME, Fundraising |
| **Story Weighted Engagement** | Σ Weighted Engagement | ME-1, ME-4, ME-7 | ME |
| **Story Interactions** | Σ Interactions (+ per-component sums) | ME-1, AN-5 | ME, Analyst |
| **Story Site Clicks** | Σ Site Clicks | AN-1 | Analyst |
| **Story Attention (total)** | Σ Watch/Read minutes | FR-1 | Fundraising |
| **Member count** | # Content rows | ME-1 | ME |
| **Platform count** | # distinct Types present (journey breadth) | ME-1 | ME |
| **Date span** | `min(Published)` → `max(Published)` | ME-1 | ME |
| **Story EQR** | `Story Weighted Engagement ÷ Story Impressions × 100` | ME-4, AN-4 | ME, Analyst |

**Per-platform journey breakdown (ME-1's core)** is rendered in the dashboard by expanding the linked member rows — totals live in Airtable, the breakdown is computed client-side. Stories inherit Section / Geography / Format / Series / Topics from the anchor; the generative cuts (ME-6, ME-7) are answered by grouping Story rollups along those dimensions in the dashboard.

---

## 4. Penetration Rate — denominators

`Penetration Rate = Impressions ÷ Potential Audience × 100`. Potential Audience by Type:

- **Social (FB / IG / X / LinkedIn / YouTube):** follower count **at publish time**, looked up from the weekly Followers table (§6) for that platform and week. Can exceed 100% (post out-reached the follower base — meaningful).
- **Article:** **the highest pageviews any single article has reached on record** — the demonstrated article-reach ceiling. A near-fixed number, updated only when a new record is set. Most articles read as a modest slice of it. (Can exceed 100% briefly when a new record is set.)
- **Newsletter:** recipients of that send. Penetration = opens ÷ recipients = **Open Rate**. Cleanly capped at 100%.
- **Podcast:** no fixed potential audience; Penetration not computed (use Exposure Percentile within Type instead).

---

## 5. Percentiles — dashboard-computed

Exposure Percentile (Impressions) and Engagement Quality Percentile (EQR) are ranked **within Type** and **computed in the dashboard at query time**, not stored in Airtable. Airtable formulas cannot rank a record against its peers (a formula sees only its own row); the front end already fetches Content, so it ranks within Type on render — always current, zero Airtable footprint, no scheduled job. (Storing them in Airtable would require a scheduled Make job and is unnecessary for a custom dashboard.)

---

## 6. Architecture — lifetime-only, with a weekly Followers table

**Per-content historical snapshots are not built in this phase.** Content and Stories hold **lifetime/current** values only. The Supabase daily-curve layer is deferred to a later phase (it adds significant hours, complexity, and maintenance; the project is already at 70 hours with the frontend not yet started).

**Consequence for trend / period questions:** time comparisons are answered by **publish cohort** — "content published in period A vs period B," summing lifetime metrics — not by metric-snapshot deltas on the same piece. This matches how Mada already runs its monthly analyses (ME-5, FR-1, and the AN-1 trend are cohort-based).

**Kept: a weekly Followers table** (per-platform follower counts, ~a handful of platforms × 52 rows/year — trivial). It does double duty: Penetration denominators for social, and the follower-growth trend (AN-7, FR-2, and the correlational AN-6 overlay). Newsletter subscriber growth (FR-2) comes free from each campaign's send size over time — no separate subscriber snapshot.

**Deferred with history:** the "does this article quietly pick up traffic weeks later" curve. Not one of the mapped persona questions, so not a coverage gap — but a conscious trade to flag to Mada.

---

## 7. Coverage audit — every persona question is answered

| Q | Answered by | Status |
|---|---|---|
| ME-1 story across platforms | Story rollups + member breakdown by Type | ✓ |
| ME-2 format across platforms | metrics grouped by Format | ✓ |
| ME-3 velocity by format | count by Published × Format | ✓ |
| ME-4 top/bottom performers | rank by WE / EQR / Impressions (+ percentiles) | ✓ |
| ME-5 period vs period | publish-cohort comparison | ⚠ cohort, not metric-delta |
| ME-6 demand by Topic/Series/Format | rollups grouped by editorial cut | ✓ |
| ME-7 Series perform / launch | Series-grouped + supporting-metric adjacency | ✓ |
| AN-1 socials→site | Site Clicks, by platform | ⚠ trend by cohort |
| AN-2 socials→newsletter signups | signup-CTA clicks + subscriber-growth trend | ⚠ correlational |
| AN-3 per-platform performance | platform-grouped metrics | ✓ |
| AN-4 views→interactions | Engagement Quality Rate | ✓ |
| AN-5 best treatments | rank by EQR / Site Clicks / save-rate | ✓ |
| AN-6 which stories drove followers | weekly follower trend overlaid on timeline | ⚠ correlational |
| AN-7 follower growth | weekly Followers table | ✓ |
| BC-1 footprint | Headlines sums | ✓ |
| BC-2 engaged topics | Topic-grouped EQR / WE | ✓ |
| FR-1 total reach/engagement | cohort sums, de-duped | ✓ |
| FR-2 audience growth | weekly Followers + campaign send sizes | ✓ |
| FR-3 topic/campaign aggregate | Topic-filtered sums | ✓ |

Every question is answered. The five ⚠ are cohort-based or correlational rather than precise — each follows from a deliberate decision (lifetime-only → cohort comparisons; no per-post follower attribution → correlational overlays), and each is flagged to Mada as such.

---

## 8. Decisions log (why, for future reference)

- **Time stays in Weighted Engagement.** The EQR explosion was bad *inputs* (FB fake-clicks + article seconds-as-minutes), not the formula. Fixed at source; the time term is a real value signal and is retained.
- **Weights** (Clicks ×5, Saves ×4, Comments ×3, Shares ×2, Reactions ×1, Watch/Read-min ×0.5): intent-led toward Mada's Q2/Q3 priorities (clicks/saves = strongest "go read the article" signals). Shares down-weighted from the conventional ×5 because public sharing of politically sensitive content carries real personal risk for Mada's readers, so a share is rarer and not automatically most valuable. **Versioned; retuned after ~1 month against real conversion data.**
- **Impressions unweighted.** An article pageview, a FB impression, and an email open all sum simply into Impressions. The quality difference between a passive impression and an intentful open lives in EQR / Attention, not in a weighted impression — and Headlines shows the by-Type breakdown so the mix stays visible. Keeps Impressions a clean, funder-defensible "times seen."
- **Penetration denominators** chosen for stability and meaning: followers-at-publish (social), all-time article-reach ceiling (article), recipients (newsletter = open rate).
- **Percentiles within Type** (not cross-Type) because impression scales differ by orders of magnitude across platforms; cross-Type quality comparison is carried by EQR.

---

## 9. Carry-forward to Visualization

- EQR is the cross-Type quality comparator; Attention (avg + total) is the long-form headline — surface it where Weighted Engagement alone would mislead.
- Story view = totals (ranking) + member expansion (per-platform journey).
- "Why" questions (ME-7, AN-6) are answered by adjacency — put the supporting metric (save-rate, Site Clicks, EQR) next to the headline number.
- Trends and period comparisons render as publish-cohort cuts; follower growth renders as the weekly account-level trend with the content timeline overlaid (labelled correlation).
- Percentiles are computed client-side within Type at render.
