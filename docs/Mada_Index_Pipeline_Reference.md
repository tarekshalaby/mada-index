# Mada Index — Data Pipeline & Integrations Reference

**Version 1.1 · June 2026**
**Make.com team:** Mada · **Airtable base:** `appr8MnuDG2NjwMQf`

How data gets from the platforms into Airtable, how the 14 scenarios are wired together, what every table holds, and what breaks (and why).

---

## Part A · Architecture overview

### 1. How the pipeline works

The data pipeline is a collection of **Make.com scenarios** that run on a schedule and push platform data into Airtable. There is no backend server, no database separate from Airtable, and no code that the maintainer runs — everything runs inside Make.

**The flow:**

```
Platform APIs / Apify / GA4
        │  (Make HTTP modules, official connectors)
        ▼
Make.com scenarios (one per platform + supporting scenarios)
        │  (Airtable modules: Create, Update, Search, Upsert)
        ▼
Airtable — Mada Index base (appr8MnuDG2NjwMQf)
  ├── Platform-raw tables (one per platform)
  ├── Content table (unified)
  ├── Stories table (editorial grouping)
  ├── Followers table (audience snapshots)
  └── Supporting tables (Contributors, Errors, Sync Settings, …)
        │  (read via @airtable/blocks SDK)
        ▼
Mada Index dashboard (Interface Extension)
```

**Triggering:** most scenarios are triggered by the **Scheduler** scenario, which reads the Sync Settings table and calls each worker's webhook URL at the configured cadence. Workers don't run on Make's built-in schedule — they wake up when the Scheduler calls them.

**Error handling:** every scenario writes to the **Errors** table on failure (Scenario, Module, Type, Message, Detail, Execution URL). Workers update their `Last Run Started` / `Last Run Ended` / `Last Credits` fields in Sync Settings to confirm each run.

---

### 2. Make Data Store: credentials

Make's Data Store (named `mada_credentials` or similar) holds secrets the scenarios read at runtime. The keys used across scenarios:

| Key | Used by | What it holds |
|---|---|---|
| `facebook_page` | Facebook Posts, Platform Followers, Instagram | Long-lived Facebook page access token |
| `spotify_creators` | Spotify Episodes, Platform Followers | Spotify refresh token (self-rotating — see §C11) |

LinkedIn authentication uses a Make OAuth **Connection** (not the Data Store). X uses Apify (not direct API credentials).

---

### 3. Sync Settings table

Table ID: `tbl8MQn9WDZqUWlHc`. One row per worker.

Key fields:

| Field | Purpose |
|---|---|
| `Enabled` | Toggle — if unchecked, Scheduler skips this worker |
| `Cadence` | `4-Hourly` / `Daily` / `Weekly` / `Monthly` — controls when Scheduler calls it |
| `Webhook URL` | The Make webhook URL the Scheduler POSTs to |
| `Max Items` | Passed to the scenario as a limit on records processed per run |
| `Last Run Started` | Written by the worker at the top of every run |
| `Last Run Ended` | Written by the worker at the bottom — confirms completion |
| `Last Credits` | Make operations consumed in the last run — a cost and loop-size signal |
| `Run Scenario` (button) | Manually triggers the worker immediately |

**The Scheduler formula** (simplified): runs at 02:00, 08:00, 14:00, 20:00 server time. At 08:00 on the first Sunday of the month, it also runs Monthly workers. At 08:00 every Sunday, it runs Weekly workers. Daily workers run at 08:00 every day.

**Scenario dispatch notes (as of June 2026):**
- **Links Discovery** (Links Analytics scenario) — Daily-only, Max Items 20. Weekly and monthly rows were removed; 20 items covers ~7 linked posts/day with headroom. Discovery is set-once per post (a post drops out of the filter as soon as it has any Outbound Link), so tiered cadences add no value. See DL-34.
- **Bitly Analytics** (Bitly Links Analytics scenario) — three rows: Daily (Max 10), Weekly (Max 50), Monthly (Max 100). Multiple cadences refresh different cohort sizes; newer links are prioritised within each run by sorting `Created/Bitly` descending.

---

## Part B · The Airtable data model

### 4. Table inventory

| Table | ID | What it holds |
|---|---|---|
| Content | `tbl3e8lSE5xjb5itB` | Every post from every platform — the unified record |
| Stories | `tblFRfZsMggiHMM49` (same as WordPress Articles in CLAUDE.md — verify) | One row per story (editorial grouping) |
| WordPress Articles | `tblFRfZsMggiHMM49` | Website articles from the WP REST API |
| Contributors | — | People with bylines in WordPress articles |
| Followers | — | Weekly audience-size snapshots per platform |
| Facebook Posts | — | Facebook-native post data |
| Instagram Posts | `tbltR2zTFIHXmcwnj` | Instagram feed post data |
| Instagram Stories | `tbl4n49HpN1gug1IM` | Instagram Story data |
| X Posts | `tblWcqtGqrWybdWqoi` | X (Twitter) post data |
| LinkedIn Posts | `tblD2un05DQTP68hA` | LinkedIn post data |
| YouTube Videos | `tblrG95tupOZxDW4m` | YouTube video data |
| MailChimp Emails | `tblcpHtXiU0pLywRo` | Mailchimp campaign data |
| Podcast Episodes | `tblJ3LcxlQg5HFBXJ` | Spotify episode data |
| Sync Settings | `tbl8MQn9WDZqUWlHc` | Pipeline schedule and health |
| Errors | — | Pipeline error log |
| Links | `tblQk4zbxF3kJYJWO` | Bitly link tracking; per-link click counts and per-platform referrer splits |
| Topics | `tbluHUm54HljOYtAE` | Editorial topic taxonomy (deferred — see DL-29) |

---

### 5. The Content table — the unified record

Every platform post has one row here, regardless of where it came from. This is the table the dashboard reads directly for most of its metrics.

**Key fields:**

- `Published` — ISO date string (from the source platform)
- `Type` — one of: `Article`, `Facebook Post`, `Instagram Post`, `Instagram Story`, `X Post`, `LinkedIn Post`, `YouTube Video`, `Newsletter`, `Podcast Episode`
- `Language` — `Arabic` / `English` / `Both`
- `Title` — from source (WP title for articles; caption for social)
- `URL` — canonical link
- `Image` — thumbnail (attachment)
- `Story` — linked record to Stories table (the editorial grouping)
- `Story Count` — formula: `if(Type = "Newsletter", 0, 1)`. Gates story-level rollups.
- `Caption Links` (`fldWVde2oQXfJX0gb`, multilineText) — fully-resolved destination URLs from the post's caption, one per line. Written at ingestion by platform workers from the platform's expanded-URL entities (X: `entities.urls[].expanded_url`). Used by Links Analytics as the primary link source — falls back to raw `Caption` text if empty. See DL-32.
- Platform links — `Facebook Post`, `Instagram Post`, `Instagram Story`, `X Post`, `LinkedIn Post`, `YouTube Video`, `Newsletter`, `Podcast Episode` — one linked-record field per platform pointing to the platform-raw table.

**Metric fields on Content:**
- `Impressions`, `Reactions`, `Comments`, `Shares`, `Saves`, `Clicks`, `Video Views`, `Attention` — raw platform values
- `Weighted Engagement` — Airtable formula (fallback: computed in adapter)
- `Engagement Quality Rate` — `WE / Impressions × 100`
- `Interactions` — `Reactions + Comments + Shares + Saves + Clicks`
- `Site Clicks` — from Links Analytics (resolves to articles only)
- `Attention (avg)` — watch/read time per view

GA4 fields (articles only): `Sessions`, `Unique Visitors`, `Engagement Rate`, `Bounce Rate`, `Avg Engagement Time (sec)`

**Penetration fields** (written once at content creation time):
- `Potential Audience` — follower count at publish week (from Followers table at creation time)
- `Penetration Rate` — formula: `Impressions / Potential Audience × 100`

---

### 6. The Stories table

One row per editorial story. Content items are linked here via the `Story` field on Content.

**Key fields:**
- `Article Title` — from the WordPress article (if one exists)
- `Images` — thumbnail (lookup from WP article)
- `First Published` / `Last Published` — rollup from Content
- `Format`, `Section`, `Geography`, `Series`, `Topics` — editorial classification (canonical here — see DL-11)
- `Platform count` — count of distinct platforms the story appeared on
- **Rollup metric fields:** `Impressions`, `Weighted Engagement`, `Interactions`, `Site Clicks`, `Attention (total)`, `Engagement Quality Rate` — all rollups gated by `Story Count = 1` (see DL-08)

---

### 7. The Followers table

One row per snapshot (platform × date). Written by the Platform Followers scenario (weekly).

**Key fields:** `Platform`, `Snapshot Date`, `Follower Count`

The dashboard reads the latest row per platform for current follower tiles, and the full history for the Follower Growth chart. It also stores `Website Arabic` and `Website English` snapshot rows — these are used as the Potential Audience denominators for article penetration rates (DL-04).

---

### 8. The Links table

Table ID: `tblQk4zbxF3kJYJWO`. One row per tracked link (Bitly, MailChimp tracked URL, or caption-scraped URL). Written by Links Analytics (C13) and refreshed by Bitly Links Analytics (C14).

**Key fields:**

| Field | ID | Type | Notes |
|---|---|---|---|
| `Name` | `fldnBZgsW2f1EyOGt` | formula | Auto-generated display label |
| `Source` | `fldlPnDA779plwAgK` | singleSelect | `Bitly` (choice `selxxFHyWZOe73734`), `MailChimp`, `Caption` |
| `Key` | `fld6iUaYVVaiiIVxU` | text | The unique match key used by the scenario (bit.ly hash, `{campaignId}\|{url}`, or URL path) |
| `Short Link` | `fldRjh4vvnvpaEmtb` | url | The shortened or tracked URL |
| `Long URL` | `fldaJ42KBQhQmRoGB` | url | Resolved destination URL |
| `URL Path` | `fld26aNcxUovvm94O` | text | Path portion of the destination URL — used for article matching |
| `Destination Type` | `fldUjxoWIkCyRHnZv` | singleSelect | `Article`, `External`, etc. |
| `Total Clicks` | `fld27efh0rgraNo8r` | number | Sum of all referrer clicks (Bitly window) |
| `Clicks: Facebook` | `fld6E4c3BZXxOmHOs` | number | Clicks from `facebook.com` / `fb.com` / `m.facebook.com` |
| `Clicks: X` | `fld8DExQmPAROs7zT` | number | Clicks from `t.co` / `twitter.com` / `x.com` |
| `Clicks: Direct` | `fldVFIDO7lN7hJa87` | number | Clicks with no referrer |
| `Clicks: Instagram` | `fldLgLINhpn6UFZ54` | number | Clicks from `instagram.com` / `l.instagram.com` |
| `Clicks: YouTube` | `fldj2daJ6i5FU919e` | number | Clicks from `youtube.com` / `youtu.be` |
| `Clicks: LinkedIn` | `fldnTzUVq7GDajiZJ` | number | Clicks from `linkedin.com` / `lnkd.in` |
| `Clicks: Other` | `flduOYAe0llmAqs7h` | number | All remaining referrers |
| `Created/Bitly` | `fldBmkDy4CxNSpblB` | dateTime | Bitly link creation date — sort field for Bitly Analytics |
| `Last Synced` | `fld7C1tt6Sl2rSZBY` | dateTime | When Bitly Analytics last refreshed this row |
| `Origin` | `fldtp9ZADTBROPQ6f` | linkedRecord | Content row(s) that published this link |
| `Destination` | `fld8VIVFKYgavs9M4` | linkedRecord | Content row(s) this link points to |

---

## Part C · Scenario reference

Each scenario entry covers: what it does, how it's triggered, the module flow, what it writes to Airtable, platform-specific quirks, and known failure modes.

---

### C1 · Scheduler

**Purpose:** wakes up every 4 hours (Make schedule) and calls the appropriate workers by POSTing to their webhook URLs.

**Trigger:** Make's built-in schedule (not a webhook — this one runs autonomously).

**Module flow:**
1. `Get Schedules` — searches Sync Settings for rows where `Enabled = true` and cadence matches the current run's window
2. `Run Scenario` — HTTP POST to each row's `Webhook URL`

**The cadence formula** (in the Airtable formula on the Search step):
```
AND(
  {Enabled},
  OR(
    {Cadence} = "4-Hourly",
    AND(
      hour(now()) = 8,
      {Cadence} = if(
        dayOfWeek(now()) = "Sunday",
        if(day(now()) <= 7, "Monthly", "Weekly"),
        "Daily"
      )
    )
  )
)
```
This means: 4-Hourly workers run every time; Daily workers run at 08:00; Weekly on 08:00 Sundays; Monthly on the first Sunday of each month at 08:00.

**Failure mode:** if the Make schedule is off or the scenario is deactivated, no workers run. Check Make → Scheduler scenario → schedule icon. Also verify the Scheduler itself is not showing red-failed executions.

---

### C2 · WordPress Articles

**Purpose:** ingests articles from the Mada Masr WordPress REST API (both the main Arabic site and the English mirror), creates/updates WordPress Article records and corresponding Content rows, upserts Contributors, and wires articles to Stories.

**Trigger:** Scheduler (4-Hourly).

**Module flow:**
1. Webhook receives trigger
2. `Date & Sites` — sets two variables: the lookback date (based on `Max Items` or last-run date) and the list of site base URLs (main + mirror)
3. `Update Schedule` — writes `Last Run Started`
4. `Iterate over Sites` — loops over the two sites
5. `Get Types` — calls `/wp-json/wp/v2/types` to enumerate post types
6. `Iterate over Types` — loops over post types
7. `Get Articles` — calls `/wp-json/wp/v2/{type}?after={date}&per_page=100` with `X-Dev-Token` auth header
8. `Iterate Over Articles` — for each article:
   - `Search for Article` — looks up by WordPress Post ID
   - `Create Article` or `Update Article` — upserts the WordPress Articles record
   - If new: `Get Followers` (reads Followers to set Potential Audience) → `Create Content` → Story creation / translation-pair wiring → `Iterate Over Authors` → `Search for Contributor` → `Upsert Contributor`
9. `Search for Errors` — logs any module errors to the Errors table
10. `Update Schedule` — writes `Last Run Ended`, `Last Credits`

**What it writes:**
- WordPress Articles table: one row per article (Post ID, Title, URL, Thumbnail, WP Categories, WP Tags, Post Type, contributors linked)
- Content table: one row per article (Type = "Article", language derived from site, metrics initially 0 — GA4 fills these later)
- Contributors table: upsert by name (creates or links)

**Story wiring:** the scenario creates or finds the Story record for each article. Translation pairs (Arabic + English) share one Story (DL-12).

**Auth:** `X-Dev-Token` header — a static token in the Make module's HTTP headers. If it expires, the scenario returns 401/403. Escalate.

**Known quirk:** deduplication is on WordPress `Post ID` (integer). If the main site and mirror return different IDs for the same article, a duplicate Content row is created. This is the only known source of article duplication.

---

### C3 · Google Analytics

**Purpose:** pulls GA4 session/visitor/engagement metrics for the articles already in Airtable and writes them back to the WordPress Articles and Content rows.

**Trigger:** Scheduler (Daily, 08:00).

**Module flow:**
1. Webhook receives trigger
2. `Update Schedule` — writes `Last Run Started`
3. `Get Articles` — searches Content for articles (Type = Article) not yet synced or with a stale GA4 date
4. Aggregates article URLs into batches
5. `regex` — transforms URLs to GA4 path format
6. `Get Analytics` — calls GA4 Reporting API (`generateReport`) with dimensions `pagePath` and metrics `sessions`, `activeUsers`, `engagementRate`, `bounceRate`, `averageSessionDuration`
7. Processes the GA4 report rows
8. `Add Analytics to Article` — updates the WordPress Article row
9. `Add Analytics to Content` — updates the Content row
10. `Update Schedule` — writes `Last Run Ended`

**What it writes:** `Sessions`, `Unique Visitors`, `Engagement Rate`, `Bounce Rate`, `Avg Engagement Time (sec)` on both WordPress Articles and Content rows.

**Known quirk:** GA4 only reports on URLs that received at least one session in the report period. Articles with zero sessions in the lookback window won't appear in the response — their GA4 fields will remain at their prior values (which may be 0 or stale). This is expected behaviour, not a bug.

---

### C4 · Facebook Posts

**Purpose:** fetches Mada's published Facebook posts and their engagement insights, creates/updates Facebook Post records and corresponding Content rows.

**Trigger:** Scheduler (4-Hourly).

**Module flow:**
1. Webhook receives trigger
2. `Update Schedule` — writes `Last Run Started`
3. `Get Token` — reads `facebook_page` from Make Data Store
4. `List Posts` — calls the Facebook Graph API (`/me/posts`) using the page token
5. For each post:
   - `Get Insights` — calls `/post_id/insights` for `post_impressions`, `post_impressions_unique`, `post_reactions_by_type_total`, `post_clicks`
   - `Search for Post` — checks if Facebook Post record exists
   - If new: `Create Post` → `Get Followers` (reads latest Facebook follower count for Potential Audience) → `Create Content`
   - If existing: `Update Post` → `Update Content`
6. `Update Schedule` — writes `Last Run Ended`

**What it writes:** Facebook Posts table (Post ID, Impressions, Reactions total, Comments, Shares, Clicks, URL). Content row (Type = "Facebook Post", Reactions = reactions total).

**Facebook Reactions decision (DL-18):** `Content.Reactions` uses the total reactions the API returns. The reshare-exclusive breakdown cannot be isolated, so the available total is used as-is.

**Facebook Clicks decision (DL-06):** Facebook's `post_clicks` counts all interaction clicks including on-post interactions, not just link clicks. It is *not* written to `Content.Clicks`. Facebook posts have no `Clicks` metric in the dashboard.

**Auth:** long-lived page token in `facebook_page` Data Store key. Facebook page tokens last ~60 days; renewal requires Meta developer console access. Escalate when expired (OAuthException / Error code 190).

---

### C5 · Instagram Posts

**Purpose:** fetches Mada's published Instagram feed posts, their insight metrics, and their Linkin.bio links (for site click attribution).

**Trigger:** Scheduler (4-Hourly).

**Module flow:**
1. Webhook receives trigger
2. `Update Schedule` — writes `Last Run Started`
3. `Get Token` — reads `facebook_page` from Data Store (Instagram uses the same Meta token)
4. `Instagram Posts` — calls Instagram Graph API (`/me/media`) via the official Make connector
5. For each post:
   - `Get Insights` — calls `/media_id/insights` for `impressions`, `reach`, `saved`, `likes`, `comments`, `video_views` (where applicable)
   - `Search for Post` — checks if Instagram Post record exists
   - If new: `Create Post` → `Get Followers` → `Create Content` → `Get linkin.bio` (fetches the Linkin.bio launchpad for this post) → processes Bitly links in the caption
   - If existing: `Update Post`
6. `Update Schedule` — writes `Last Run Ended`

**Linkin.bio logic:** Instagram posts often use the Linkin.bio launchpad (`bit.ly/m/...`) instead of direct Bitly links. The scenario detects this pattern and calls the Linkin.bio API to resolve the actual destination links. These become Outbound Links entries for the Links Analytics scenario to process.

**What it writes:** Instagram Posts table (Media ID, Impressions, Reach, Saves, Likes, Comments, Video Views). Content row (Type = "Instagram Post").

**Auth:** same as Facebook — `facebook_page` Data Store token.

---

### C6 · Instagram Stories

**Purpose:** fetches Mada's Instagram Stories (which expire after 24 hours) and their insights.

**Trigger:** Scheduler (4-Hourly — critical, because story media CDN URLs expire in 24 hours).

**Module flow:**
1. Webhook receives trigger
2. `Update Schedule` — writes `Last Run Started`
3. `Get Token` — reads `facebook_page` from Data Store
4. `Get Posts & Insights` — custom HTTP call to Instagram Graph API for Stories media + insights in one request
5. Processes the response into individual story items
6. For each story:
   - `Search for Story` — checks if Instagram Story record exists
   - If new: `Create Story` → `Get Followers` → `Create Content`
   - If existing: `Update Story`
7. Route continues with content detail updates
8. `Update Schedule` — writes `Last Run Ended`

**What it writes:** Instagram Stories table (Story ID, Reach, Impressions, Profile Visits, Taps Forward, Taps Back, Exits). Content row (Type = "Instagram Story", Clicks = link-sticker clicks where available).

**Known issue (from Runbook §6):** Instagram Story media CDN URLs expire after 24 hours. If the scenario misses a run within 24 hours of a Story being posted, the thumbnail can't be downloaded — and the data is unrecoverable. Keep the 4-Hourly cadence healthy.

---

### C7 · X Posts

**Purpose:** fetches Mada's X (Twitter) posts and their engagement metrics via the Apify X scraper.

**Trigger:** Scheduler (4-Hourly).

**Module flow:**
1. Webhook receives trigger
2. `Update Schedule` — writes `Last Run Started`
3. `Scrape Tweets` — runs an Apify task (the X/Twitter scraper, configured with Mada's handle and lookback window)
4. `Get Results` — fetches the Apify dataset items (Apify is async — this step waits for the task to complete)
5. For each tweet:
   - `Search for Post` — checks if X Post record exists
   - If new: `Create Post` → `Get Followers` → `Create Content`
   - If existing: `Update Post` → `Update Content`
6. `Update Schedule` — writes `Last Run Ended`

**What it writes:** X Posts table (Tweet ID, Impressions, Likes, Retweets, Quote Tweets, Replies, Bookmarks). Content row (Type = "X Post", `Caption Links` = all resolved destination URLs from `entities.urls[].expanded_url`, joined one per line — written on both Create Content (#18) and Update Content (#20) steps. See DL-32.

**Why Apify:** X API v2's free and basic tiers are highly restricted. Apify's scraper bypasses the API rate limit constraints and provides the engagement metrics the API would otherwise gate. The tradeoff: Apify credit consumption and occasional scraper blocking.

**Failure modes:** Apify account credits exhausted; scraper task configuration changed; X blocking the scraper. Check the Apify console for task status. Escalate.

---

### C8 · LinkedIn Posts

**Purpose:** fetches Mada Masr's LinkedIn organisation posts and their engagement statistics.

**Trigger:** Scheduler (4-Hourly).

**Module flow:**
1. Webhook receives trigger
2. `Update Schedule` — writes `Last Run Started`
3. `List Posts` — calls the Make LinkedIn connector (`linkedin:listOrganizationPosts2`) for Mada's organisation
4. For each post:
   - `Get Statistics` — calls `linkedin:getStatisticsShares` for impressions, clicks, reactions, comments, shares, engagement rate
   - `Search for Post` — checks if LinkedIn Post record exists
   - If new: `Create Post` → `Get Followers` → `Create Content`
   - Route check: if existing: `Update Post` → `Update Content`
5. `Update Schedule` — writes `Last Run Ended`

**What it writes:** LinkedIn Posts table (Post ID, Impressions, Clicks, Reactions, Comments, Shares, Engagement Rate). Content row (Type = "LinkedIn Post").

**Known gotcha — followers endpoint (DL-17):** LinkedIn followers are fetched in the Platform Followers scenario, not here. The endpoint used is `/v2/networkSizes/urn:li:organization:{id}` (unversioned, raw colons in the URN path, `edgeType=COMPANY_FOLLOWED_BY_MEMBER`), reading `firstDegreeSize`. Do not use the versioned `/rest/` path — it's structurally unreachable through Make's module.

**Known error — URN encoding (from Runbook §10):** `400 Syntax exception in path variables` means Make is double-encoding the colons in the URN. The raw Make HTTP module (not the connector) handles this correctly.

**Auth:** Make OAuth Connection for LinkedIn. Expires periodically — escalate to renew.

---

### C9 · YouTube Videos

**Purpose:** fetches Mada's YouTube videos and their analytics via the YouTube Data API v3 and YouTube Analytics API.

**Trigger:** Scheduler (Daily, 08:00).

**Module flow:**
1. Webhook receives trigger
2. `Update Schedule` — writes `Last Run Started`
3. `List Videos` — HTTP call to YouTube Data API v3 (`/youtube/v3/search?channelId=...&type=video`)
4. For each video:
   - `Videos Details` — batch call to `/videos?id=...&part=snippet,statistics,contentDetails` for duration, view count, likes, comments
   - `Get Analytics` — YouTube Analytics API for watch time, average view duration, subscribers gained
   - `Get Retention` — YouTube Analytics API for retention percentages at 25%, 50%, 75%, 95%, 100%
   - `Search for Video` — checks if YouTube Video record exists
   - Create or Update accordingly
   - Handles pagination via `Run with Next Page`
5. `Update Schedule` — writes `Last Run Ended`

**What it writes:** YouTube Videos table (Video ID, Title, Views, Likes, Comments, Subscribers Gained, Duration, Average View Duration, Retention at 25/50/75/95/100%). Content row (Type = "YouTube Video", Impressions = Views, Video Views = Views).

**Note on retention:** retention percentages are written to the YouTube Videos table and read by the dashboard's ContentDetail view. They're not surfaced in aggregate charts.

---

### C10 · MailChimp Emails

**Purpose:** fetches Mada's Mailchimp email campaigns and their report metrics, creates/updates MailChimp Email records and Content rows.

**Trigger:** Scheduler (Daily, 08:00).

**Module flow:**
1. Webhook receives trigger
2. `Update Schedule` — writes `Last Run Started`
3. `List Emails Reports` — custom Mailchimp API call to `/3.0/reports?count={Max Items}` — returns campaign report summaries
4. Processes each campaign:
   - `Search for Email` — checks if MailChimp Email record exists
   - If new: `Create Email` → `Create Content`
   - `Get Campaign` — calls `/3.0/campaigns/{id}` for title, send time, recipient count
   - `Get Content` — calls `/3.0/campaigns/{id}/content` for the email HTML body
   - `Find Image` — regex parser to extract the first image URL from the HTML body
   - Update the Email and Content rows with all fields
5. `Update Schedule` — writes `Last Run Ended`

**What it writes:** MailChimp Emails table (Campaign ID, Title, Sent Date, Emails Sent, Unique Opens, Open Rate, Click Rate, Unsubscribed). Content row (Type = "Newsletter", Title, Image, Impressions = Emails Sent, Clicks = campaign click count).

**Display label decision (DL-30):** in the dashboard, this platform is labelled "MailChimp" everywhere the user sees it. The internal `Platform` type remains `'newsletter'` in code. Don't rename the type — only the display label is "MailChimp."

**Backfill note (DL-26):** the scenario uses a `count={Max Items}` lookback window. Campaigns published more than ~14 days before the scenario was first run are not automatically backfilled. A separate manual backfill pass was scoped but parked.

---

### C11 · Spotify Episodes

**Purpose:** fetches Mada's Spotify podcast episodes (for both the Arabic show and the English show if applicable), their stream counts, and audience retention metrics from the Spotify for Creators API.

**Trigger:** Scheduler (Daily, 08:00).

**Module flow:**
1. Webhook receives trigger
2. `Update Schedule` — writes `Last Run Started`
3. `Get Token` — reads the Spotify refresh token from `spotify_creators` Data Store
4. `Generate Token` — calls Spotify OAuth token endpoint to exchange the refresh token for an access token
5. `Update Token` — writes the new refresh token back to the Data Store (self-rotating)
6. `List of Shows` — iterates over configured Spotify Show IDs
7. `List Episodes` — calls Spotify API to list episodes for each show
8. For each episode:
   - `Streams & Downloads` — calls Spotify for Creators API for stream counts
   - `Spotify Plays` — additional plays metric
   - `Consumption Hours` — total listening time
   - `Retention & Performance` — retention at 25%, 100%; median completion seconds
   - `Search for Episode` — checks if Podcast Episode record exists
   - Create or Update accordingly
9. `Update Schedule` — writes `Last Run Ended`

**What it writes:** Podcast Episodes table (Episode ID, Title, Duration, Streams, Plays, Listeners, Consumption Hours, Median Completion Seconds, Retention at 25%/100%). Content row (Type = "Podcast Episode", Impressions = Streams).

**Self-rotating token (DL-16):** Spotify access tokens are short-lived (~1 hour). The scenario generates a fresh one from the stored refresh token on every run and writes the new refresh token back. The Data Store always holds the latest refresh token. If the refresh token itself expires (non-use for >1 year) or is revoked, the `Generate Token` step fails — update the `spotify_creators` Data Store key after re-authorizing in Spotify for Creators.

---

### C12 · Platform Followers

**Purpose:** takes a weekly snapshot of Mada's audience size on every platform and writes it to the Followers table.

**Trigger:** Scheduler (Weekly — 08:00 on Sundays).

**Module flow:**
1. Webhook receives trigger
2. `Update Schedule` — writes `Last Run Started`
3. Runs all platform follower fetches in parallel branches:
   - **Facebook:** `Get Facebook Page` (facebook-pages connector) → reads `fan_count` → `Add Follower Update`
   - **Instagram:** `Get Instagram Account` (instagram-business connector) → reads `followers_count` → `Add Follower Update`
   - **LinkedIn:** `Get Thumbnail` (raw HTTP → `/v2/networkSizes/...`) → reads `firstDegreeSize` → `Add Follower Update`
   - **YouTube:** `Get YouTube Channel` (HTTP → Data API v3 `/channels`) → reads `subscriberCount` → `Add Follower Update`
   - **X:** `Apify runTask` → `fetchDatasetItems` → reads follower count from scraper output → `Add Follower Update`
   - **Spotify:** `Get Token` → `Generate Token` → `Update Token` → `Streams & Downloads` API → reads listener totals → `Add Follower Update`
   - **Website Arabic:** `GA4 generateAnalyticsReports` → aggregate active users → `Add Follower Update`
   - **Website English:** same, separate GA4 report → `Add Follower Update`
   - **MailChimp:** `searchLists` (Mailchimp connector) → iterates over lists → `Get List Stats` → reads `member_count` → aggregate via `BasicAggregator` → `Add Follower Update`
4. `Update Schedule` — writes `Last Run Ended`

**What it writes:** Followers table — one new row per platform per run (Platform, Snapshot Date, Follower Count).

**Important — Potential Audience dependency:** the WordPress Articles scenario reads the Followers table at article-creation time to set `Content.Potential Audience`. The Platform Followers scenario must have run at least once before new articles can get a meaningful Potential Audience value. If Followers table is empty, article penetration rates will be 0 or blank.

**LinkedIn gotcha (DL-17):** uses the unversioned `/v2/networkSizes/urn:li:organization:{id}?edgeType=COMPANY_FOLLOWED_BY_MEMBER` endpoint. The Make LinkedIn module's native followers call returns demographic facets, not a usable total — so this uses a raw HTTP module instead.

---

### C13 · Links Analytics

**Purpose:** discovers outbound links in social post captions and MailChimp campaigns, creates Links rows for new ones, resolves destination articles, and aggregates inbound Site Clicks back to destination Content rows. This scenario is **post-driven** — a post exits the filter as soon as it has any Outbound Link, so each post is processed once. Bitly click-count refresh on existing Links rows is handled by the separate Bitly Links Analytics scenario (C14).

**Trigger:** Scheduler (Daily — see DL-34; previously 4-Hourly).

**Module flow:**
1. Webhook receives `{syncRecordId}`
2. `Update Schedule` — writes `Last Run Started`
3. Routes through three branches:
   - **Branch A — MailChimp click refresh:**
     - `Search for Emails` — finds MailChimp Email rows sent within the last **7 days** (reduced from 150 — see DL-33). Email clicks saturate within ~48h and are frozen by ~7 days; the narrow window keeps credit consumption low while staying current.
     - For each email: `Click Details` — calls Mailchimp `/3.0/campaigns/{id}/click-details` to enumerate every tracked link and its click count.
     - For each link: `Search for Link` → Create or Update Links row (Source = MailChimp).
   - **Branch B — New social post discovery:**
     - `Search Articles with Links` — finds Content rows with no Outbound Links that contain a year-path mirror URL or a Bitly link (see DL-32 for the dual-type rationale):
       ```
       AND(
         OR(
           FIND("/" & YEAR(TODAY()) & "/", {Caption Links}),
           FIND("/" & (YEAR(TODAY()) - 1) & "/", {Caption Links}),
           FIND("bit.ly/", {Caption}),
           FIND("bit.ly/", {Caption Links})
         ),
         NOT(FIND("bit.ly/m/", {Caption})),
         LEN({Outbound Links} & "") = 0
       )
       ```
       The `bit.ly/m/` exclusion drops Linkin.bio launchpads (handled by the Instagram Posts scenario). The final `LEN` clause ensures a post exits the filter permanently once it has any Outbound Link.
     - `Extract Link` — regex Text Parser, input: `ifempty({Caption Links}; {Caption})`. X posts yield the mirror URL from Caption Links; FB and LinkedIn fall back to the bit.ly URL in Caption.
     - **All-Links route** (direct/mirror URLs — typically X): resolves destination from URL Path → `Search for Content` → `Search for Link` → Create or Update Links row (Source = Caption).
     - **Bitly route** (bit.ly links — typically FB/LinkedIn): creates a Links row (Source = Bitly); click counts are populated later by Bitly Links Analytics (C14).
   - **Branch C — Inbound click aggregation:**
     - Aggregates `Links.Total Clicks` from resolved Links rows back to destination `Content.Site Clicks` rollup.
4. `Update Schedule` — writes `Last Run Ended`

**What it writes:** Links table (Key, Source, Short Link, Long URL, URL Path, Destination Type, linked Destination Content, Last Synced). Updates `Content.Site Clicks` on destination article rows via the Links → Content rollup.

**Why destination-anchored (DL-07):** Site Clicks are counted at the destination article, not the origin post. Two posts linking to the same article each create separate Links rows, but the article's Site Clicks field is the sum — no double-counting.

**Blueprint note:** the stored blueprint (`Links Analytics.blueprint (1).json`) pre-dates the dual-type filter, the 7-day MailChimp window, and the `ifempty` Extract Link input — it is **stale**. Re-export from Make before using it for restoration.

---

### C14 · Bitly Links Analytics

**Purpose:** refreshes click counts and per-platform referrer breakdowns on existing Bitly Links rows. This scenario is **links-driven**, not post-driven: it iterates over a bounded set of Bitly Links rows (sorted newest-first) and re-fetches their referrer data from Bitly. It exists because Links Analytics (C13) creates each Bitly Links row exactly once — the click count is fetched at first touch and then frozen. Bitly Analytics un-freezes it.

**Trigger:** Scheduler — three cadence rows in Sync Settings ("Bitly Analytics"): Daily (Max 10), Weekly (Max 50), Monthly (Max 100).

**Module flow:**
1. Webhook receives `{syncRecordId}`
2. `Update Schedule` — writes `Last Run Started`
3. **Analytics loop:**
   - `Get Links` — searches Links table (`tblQk4zbxF3kJYJWO`) for rows where `Source = Bitly` (choice `selxxFHyWZOe73734`), sorted by `Created/Bitly` (`fldBmkDy4CxNSpblB`) descending, up to `Max Items` records from the matched Sync Settings row. Descending sort prioritises newer links whose referrer window still covers most of the link's lifetime.
   - `Get Referrers` — Bitly API call: `GET /v4/bitlinks/{Key}/referrers`. Response: `metrics[]` of `{value: referrer, clicks: N}`.
   - `Update Link` — writes back to the Links row:
     - `Total Clicks` (`fld27efh0rgraNo8r`) = sum of all referrer clicks
     - `Clicks: Facebook` (`fld6E4c3BZXxOmHOs`) = clicks from `facebook.com` / `fb.com` / `m.facebook.com`
     - `Clicks: X` (`fld8DExQmPAROs7zT`) = clicks from `t.co` / `twitter.com` / `x.com`
     - `Clicks: Direct` (`fldVFIDO7lN7hJa87`) = clicks with no referrer
     - `Clicks: Instagram` (`fldLgLINhpn6UFZ54`) = clicks from `instagram.com` / `l.instagram.com`
     - `Clicks: YouTube` (`fldj2daJ6i5FU919e`) = clicks from `youtube.com` / `youtu.be`
     - `Clicks: LinkedIn` (`fldnTzUVq7GDajiZJ`) = clicks from `linkedin.com` / `lnkd.in`
     - `Clicks: Other` (`flduOYAe0llmAqs7h`) = sum of all remaining referrers
     - `Last Synced` (`fld7C1tt6Sl2rSZBY`) = now
4. `Update Schedule` — writes `Last Run Ended` + `Last Credits`
5. Error handler on work modules → Errors table

**What it writes:** updates existing Links rows only (Total Clicks + six per-platform Clicks fields + Last Synced). Does not create records.

**Known limitation — bounded referrer window:** Bitly's referrer API covers a sliding retention window (observed ~141 days on the current plan). For Bitly links older than that window, `Total Clicks` reflects only the windowed period, not all-time, and drifts downward as the window advances. The descending-sort heuristic keeps the freshest links prioritised; old evergreen links will eventually undercount. Potential future fix: `units=-1` (lifetime aggregation) if the Bitly plan supports it (see DL-31).

**Blueprint:** not yet exported from Make. Export and store as `docs/blueprints/Bitly Links Analytics.blueprint.json` before the next scheduled maintenance window.

---

## Part D · Known gotchas and cross-cutting patterns

### 5. The standard worker pattern

Every worker follows the same shape:
1. Receive webhook trigger
2. Write `Last Run Started` to Sync Settings
3. Do the platform work (fetch → search → create/update)
4. Write `Last Run Ended` and `Last Credits` to Sync Settings
5. On any module error: write to Errors table (Scenario, Module, Type, Message, Detail, Execution URL)

A run is only considered complete if `Last Run Ended` is written. A stale `Last Run Started` with no matching `Last Run Ended` means the run crashed.

---

### 6. `Get Followers` pattern inside workers

When a content item is newly created (not found in the `Search for Post` step), the worker calls `Get Followers` — a search on the Followers table for the latest snapshot of that platform's follower count. This value is written to `Content.Potential Audience` and frozen there permanently. It is not updated on subsequent runs.

This is intentional (DL-04): the potential audience is the one that existed at publish time, not today's.

---

### 7. The BasicRouter create-vs-update split

All workers use a `builtin:BasicRouter` module after the existence check. Route 1: the record doesn't exist → Create. Route 2: it does exist → Update. Make can't merge routes, so both paths independently write to both the platform-raw table and the Content table.

For workers that write to Content on the create path, the fields written are a superset of the update path (the create path also writes `Published`, `Type`, `Language`, `Potential Audience`). The update path only refreshes the metric fields.

---

### 8. Auth summary and renewal guide

| Platform | Auth mechanism | Where it lives | Renewal |
|---|---|---|---|
| Facebook / Instagram | Long-lived page token | `facebook_page` Data Store | Escalate — Meta dev console |
| LinkedIn | Make OAuth Connection | Make → Connections | Escalate — re-authorize in Make |
| YouTube | Google OAuth (Make connector) | Make → Connections | Usually auto-renews — escalate if fails |
| Google Analytics | Same Google OAuth as YouTube | Make → Connections | Same |
| X | No direct API — Apify | Apify task configuration | Escalate — Apify console |
| Spotify | Self-rotating refresh token | `spotify_creators` Data Store | Re-authorize in Spotify for Creators, update Data Store |
| Mailchimp | Make Mailchimp connector (API key) | Make → Connections | Rarely expires — escalate |
| WordPress | Static dev token in HTTP headers | Make module headers | Escalate — token is hardcoded |

---

### 9. Blueprint files

Scenario blueprints are stored in `docs/blueprints/` in this repo. They can be imported into Make if a scenario is ever corrupted or accidentally deleted. To restore a scenario: Make.com → Scenarios → ⊕ New → Import Blueprint → upload the `.json` file → reconnect all connections and configure the Data Store references.

> **Stale / missing blueprints (as of June 2026):** `Links Analytics.blueprint (1).json` is **stale** — it pre-dates the dual-type filter, the 7-day MailChimp window, and the `ifempty` Extract Link input. `Bitly Links Analytics` has **no blueprint yet** — the scenario was created directly in Make and has not been exported. Both need re-export from Make before the next maintenance window.

| Blueprint file | Scenario | Status |
|---|---|---|
| `Scheduler.blueprint.json` | Scheduler | Current |
| `WordPress Articles.blueprint (3).json` | WordPress Articles | Current |
| `Google Analytics.blueprint (1).json` | Google Analytics | Current |
| `Facebook Posts Analytics.blueprint (2).json` | Facebook Posts | Current |
| `Instagram Posts Analytics.blueprint (1).json` | Instagram Posts | Current |
| `Instagram Stories Analytics.blueprint (3).json` | Instagram Stories | Current |
| `X Posts Analytics.blueprint (1).json` | X Posts | Current |
| `LinkedIn Posts Analytics.blueprint (1).json` | LinkedIn Posts | Current |
| `YouTube Videos Analytics.blueprint (1).json` | YouTube Videos | Current |
| `MailChimp Emails Analytics.blueprint (1).json` | MailChimp Emails | Current |
| `Spotify Episodes Analytics.blueprint (1).json` | Spotify Episodes | Current |
| `Platform Followers.blueprint.json` | Platform Followers | Current |
| `Links Analytics.blueprint (1).json` | Links Analytics | **Stale** — re-export needed |
| *(not yet exported)* | Bitly Links Analytics | **Missing** — export after creation |

---

*End of Pipeline & Integrations Reference (v1.1).*
