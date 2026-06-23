# Mada Index — Operations & Maintenance Runbook

**Version 1.1 · June 2026**

How to keep Mada Index running, diagnose problems, and know when to escalate.

---

## Part A · Using this document

### 1. How to use it — including with an AI assistant

This runbook is written to work both for a human reading it and for an AI assistant diagnosing a live problem. The recommended workflow for any issue:

**Step 1 — Locate the symptom** in Part C (the Playbook). Symptoms are organized by where you noticed the problem: sync failures, data issues, auth problems, dashboard problems, known errors.

**Step 2 — Follow the cause chain.** Each symptom entry gives the likely cause(s) and a diagnostic test to confirm.

**Step 3 — If using an AI assistant for diagnosis**, give it this bundle:
- This Runbook
- The **Data Pipeline & Integrations Reference** (for pipeline and scenario detail)
- The **Dashboard Technical Reference** (for dashboard and field-visibility issues)
- The **Decision Log** (for "why does it work this way?" questions)

Then describe the symptom. The AI has enough context to walk you through diagnosis and the fix — or tell you to escalate.

**Step 4 — Check the escalation line** (§2) before touching anything you're unsure of.

---

### 2. The golden rule and escalation line

**The golden rule:** if you're unsure whether an action is reversible, stop and escalate.

**Safe self-service** — you can do these without escalating:
- Checking Sync Settings and Errors tables in Airtable
- Enabling a field in Interface Designer's Fields panel
- Manually triggering a scenario via the `Run Scenario` button on a Sync Settings row
- Disabling an Enabled toggle on a Sync Settings row to pause a worker
- Reviewing Make.com scenario execution history (read-only)
- Updating the Spotify refresh token in the Make Data Store

**Escalate to the maintainer (Tarek · tarek@shala.by)** for:
- Any change to a Make scenario's module configuration
- Any change to Airtable table structure (adding/removing/renaming fields or tables)
- Any change to the dashboard codebase (`~/mada_index/frontend/`)
- Releasing a new dashboard version (`echo "description" | block release` in the repo root)
- Anything involving API credentials other than the Spotify token rotation
- Airtable base sharing or permissions changes
- Unexplained data loss or mass incorrect writes

---

## Part B · System health checks

### 3. Daily health check

Takes about two minutes. Do this if anyone reports something looks wrong, or as a weekly spot-check.

**In Airtable → Mada Index base:**

1. **Sync Settings table** — scan the `Last Run Ended` column. Every enabled row should have a timestamp from within the last 24 hours (4-Hourly workers) or since the last expected cadence window. A stale timestamp means the worker didn't complete.

2. **Errors table** — filter `Solved = false`. Any unsolved errors? Note the `Scenario`, `Module`, `Type`, and `Message` fields. If the error count is growing, a worker is failing repeatedly.

3. **Content table** — sort by `Last Synced` descending. The most recent rows should be from today (or whenever the last scheduled run was). If all `Last Synced` values are days old across all platforms, the Scheduler itself may have stopped.

**In Make.com → Mada team → Scenarios:**

4. Spot-check the `Last edited` / last-run timestamps in the scenario list. Any scenario showing a red/failed execution badge needs investigation.

---

### 4. Per-scenario health signals

| Scenario | Expected cadence | Signs of health |
|---|---|---|
| Facebook Posts | 4-Hourly | Last Run Ended within 6h; no unsolved FB Errors |
| Google Analytics | Daily | Last Run Ended today (08:00 window) |
| Instagram Posts | 4-Hourly | Last Run Ended within 6h |
| Instagram Stories | 4-Hourly | Last Run Ended within 6h |
| LinkedIn Posts | 4-Hourly | Last Run Ended within 6h |
| Links Discovery | Daily | Last Run Ended today (08:00 window); Links table growing |
| Bitly Links Analytics | Daily / Weekly / Monthly | Last Run Ended for each cadence within its expected window; `Last Synced` on Bitly Links rows advancing |
| MailChimp Emails | Daily | Last Run Ended today |
| Platform Followers | Weekly | Last Run Ended within 7 days |
| Scheduler | 4× daily | `Last Run Started` on two of the Sync Settings rows updated at 02/08/14/20 |
| Spotify Episodes | Daily | Last Run Ended today |
| WordPress Articles | 4-Hourly | Last Run Ended within 6h; new articles appearing |
| X Posts | 4-Hourly | Last Run Ended within 6h |
| YouTube Videos | Daily | Last Run Ended today |

---

## Part C · The playbook

Each entry: symptom → likely cause(s) → diagnostic test → fix or escalate.

---

### 5. Sync / Make failures

---

**Symptom: A Sync Settings row shows a stale `Last Run Started` but no `Last Run Ended` (or `Last Run Ended` is older than `Last Run Started`).**

Cause: the worker started but crashed mid-run. Check: Airtable Errors table, filter `Scenario = [worker name]` + `Solved = false`. If there's a recent Error record, read the `Module` and `Message` fields — these identify exactly where it failed.

Fix: depends on the error type. See §7 (data errors), §8 (auth errors), §11 (known error catalog).

If no Error record exists: the crash happened before the worker's onerror handler could log it. Open Make.com → the scenario → execution history → find the failed run → read the error detail there.

---

**Symptom: `Last Run Started` and `Last Run Ended` are both very old across multiple workers simultaneously.**

Cause: the Scheduler scenario itself stopped running, or Make's built-in schedule is paused/disabled.

Diagnostic: open Make.com → Scheduler scenario → check the scenario's built-in schedule is active (the clock icon should show the next scheduled run). Also check the scenario's on/off toggle (top of the editor).

Fix: if the schedule is off, re-enable it. If the scenario was deactivated, activate it. Then manually trigger one worker via its `Run Scenario` button to confirm the pipeline flows end-to-end.

Escalate if: the Scheduler scenario is active but workers still aren't being called — the webhook URL infrastructure may need attention.

---

**Symptom: A specific platform worker fails consistently, others run fine.**

Cause: platform-specific — API token expired, rate limit, platform API change, or Apify task issue (for X).

Diagnostic: check the Errors table for that worker's `Type` and `Message`. Cross-reference with §8 (auth) and §11 (known errors) below.

---

**Symptom: `Last Credits` is dramatically higher than usual for a specific worker.**

Cause: a loop or pagination expanded unexpectedly — for example, the YouTube worker re-triggering itself more times than usual, or a larger-than-expected result set.

Diagnostic: check `Max Items` in Sync Settings for that worker. If it was recently changed to a higher value, that explains it. If not, open the Make execution history for the run in question and look for loop counts.

Fix: if Make credit consumption is a concern, reduce `Max Items` for the affected worker in Sync Settings.

---

### 6. Sync format and data shape issues

---

**Symptom: Sync runs successfully (no Errors, `Last Run Ended` is fresh) but a platform's data looks wrong — zero metrics, wrong values, or outdated.**

Cause A — field not visible in Interface Designer. The most common cause of "zeros that shouldn't be zeros." The worker wrote the value correctly, but the dashboard can't read it. Check: open Interface Designer → ⚙️ (settings) → Fields → find the relevant table → confirm all required fields are enabled. See the Dashboard Technical Reference §8 for the full field checklist.

Cause B — the worker wrote to the platform-raw table but the Content row update failed. Check: open the Airtable Content table, find a recent record of this type, and check whether the raw metric fields are populated on the Content row vs. the platform-raw row. If the platform-raw row has data but Content doesn't, the content upsert step failed for those records.

Cause C — the platform API changed what it returns. Check: compare the field values in the platform-raw table against what the API documentation says the field should contain. If the API endpoint or field names changed, escalate — the Make module mapper needs updating.

---

**Symptom: Instagram Stories have thumbnails missing in the dashboard.**

Cause: Story media CDN URLs expire after 24 hours. The worker downloads thumbnails to Airtable immediately — but if the worker didn't run within 24 hours of a Story being published, the download window was missed.

Fix: this data is unrecoverable for the missed Stories. Ensure the Instagram Stories worker is running on its 4-Hourly cadence.

---

**Symptom: Site Clicks for a post show 0 even though the post clearly has a Bitly link in its caption.**

Cause A — the `bit.ly/m/` Linkin.bio launchpad filter. If the caption contains the Linkin.bio launchpad link (`bit.ly/m/...`) rather than a direct Bitly link, it's excluded from caption-link processing and handled through the Linkin.bio API path instead. Check the actual link in the caption.

Cause B — the Links Analytics worker hasn't processed this post yet. Check `Last Synced` on the Links row (if it exists) or whether the post's Content row has an Outbound Links entry yet. Links Analytics now runs Daily (08:00), not 4-Hourly — allow up to 24h for a newly published post to be picked up.

Cause C — the Bitly link resolves to an external destination (not a madamasr.com article). External links get a Links row with `Destination Type = External` and don't contribute to article-level Site Clicks received.

Cause D — the Bitly link's click count hasn't been refreshed yet. Links Analytics creates the Links row once (at first touch) but doesn't refresh the click count. Click count refresh is done by Bitly Links Analytics (Daily/Weekly/Monthly). If the link was just discovered, wait for the next Bitly Analytics run.

---

**Symptom: A Bitly link's `Total Clicks` appears lower than expected, or seems to decline over time.**

Cause: the Bitly referrer API covers a sliding retention window (observed ~141 days on the current plan). For Bitly links older than that window, `Total Clicks` reflects only the windowed period, not all-time, and drifts downward as the window advances. This is a known limitation (DL-31). Links created within ~141 days of today are unaffected.

Fix: no automated fix. The Bitly Analytics scenario uses descending-sort by creation date to prioritise newer links; old evergreen links will eventually undercount. A potential future fix using `units=-1` (lifetime aggregation) is tracked in DL-31. Document the observed click count for affected links if a snapshot is needed for reporting.

---

**Symptom: MailChimp-tracked link click counts appear lower than Mailchimp's own reporting shows.**

Cause: Links Analytics refreshes MailChimp click counts only for campaigns sent within the last **7 days** (reduced from 150 in June 2026 — see DL-33). Email clicks saturate within ~48h and are frozen by ~7 days, so the narrow window is intentional. For older campaigns, the click count was captured during the campaign's 7-day window and is now frozen.

Fix: expected behaviour. If a specific old campaign's click count must be updated, escalate — the window would need to be temporarily widened in the scenario.

---

**Symptom: Bitly Links Analytics is not running, or `Last Synced` on Bitly Links rows is not advancing.**

Cause A — a Sync Settings row for "Bitly Analytics" is disabled. The scenario has three rows (Daily, Weekly, Monthly) — check all three are enabled.

Cause B — the Bitly API returned an error. Check the Errors table for entries with `Scenario = Bitly Links Analytics`. A `401` or `403` means the Bitly API token is expired or invalid — escalate. A `404` means a specific bitlink key is invalid (the record may be stale).

Cause C — the scenario has not yet been exported and imported into Make. If this is a new installation, the Bitly Links Analytics blueprint does not exist yet — escalate to have the maintainer set it up.

---

**Symptom: A post shows `Story Match = "Pending"` in the Content table.**

Cause: the Instagram Posts worker found a Linkin.bio entry for this post but the Links row for that Bitly key doesn't have a Destination Story yet — meaning the Links Analytics worker hasn't resolved the destination. Or for non-Instagram posts: the post hasn't been manually or automatically linked to a Story.

Fix: run Links Analytics manually (via `Run Scenario` button) to trigger destination resolution. If still Pending after that, the destination article may not yet exist in the Content table (the WordPress Articles worker may not have ingested it).

---

**Symptom: An article shows under one Story in Airtable but a different (or no) Story in the dashboard.**

Cause: the `Story` field on the Content row isn't in the Interface Designer's visible fields list, or the Content→Stories link hasn't been written yet.

Diagnostic: check the Content row directly in Airtable — does it have a Story linked? If yes, it's a field visibility issue. If no, the WordPress Articles worker's translation-pair / Story-creation step didn't fire for this article.

---

**Symptom: Penetration Rate for an article is blank.**

Cause A — `Potential Audience` is 0 or empty on the Content row. The WordPress Articles worker didn't find a Website Arabic / Website English Follower snapshot when creating the Content row. Check: does the Followers table have at least one `Website Arabic` and one `Website English` row? Platform Followers must run at least once before new articles can get a Potential Audience.

Cause B — the article is a Podcast episode (intentional — DL-04).

---

### 7. Data integrity issues

---

**Symptom: A Story has inflated totals — impressions or engagement far higher than the sum of its platform posts.**

Cause: a Newsletter Content row has `Counts Toward Story Total = 1` when it should be 0. This field is a formula (`= if(Type = "Newsletter"; 0; 1)`) — check that the `Type` field on the Content row is correctly set to "Newsletter". If the formula isn't evaluating, the field may not be enabled in Interface Designer.

Alternative cause: a Content row is linked to two Stories simultaneously (shouldn't happen, but check `Story Count` on the Content row — should be 1).

---

**Symptom: The same article appears twice in the Stories or Content view.**

Cause: the article was ingested twice — typically because the main site and the mirror site both returned it and the dedup key didn't match. The WordPress Articles worker deduplicates on `Post ID` (WordPress's internal integer ID), which should be the same across both sites. If the IDs differ between main and mirror for the same article, a duplicate will be created.

Fix: escalate. Merging duplicate records safely (without corrupting rollups) requires care.

---

**Symptom: A contributor appears multiple times in the Team view with slightly different names.**

Cause: the Contributors table has separate records for the Arabic and English byline versions of the same person, or a name was spelled differently on different articles. This is a known architectural reality — AR/EN contributor identity unification is deferred to post-v1 (DL-25).

Fix: no automated fix. If the duplication is causing a reporting problem, records can be manually merged in Airtable, but this requires care (update all WordPress Articles links first, then delete the redundant record).

---

### 8. Authentication and token failures

---

**Symptom: Facebook / Instagram worker fails with an auth or token error.**

Cause: the `facebook_page` token in the Make Data Store has expired. Facebook page tokens need periodic renewal (long-lived tokens last ~60 days; the actual expiry depends on the token type issued).

Fix: escalate to the maintainer. Renewing a Facebook/Instagram token requires accessing the Meta developer console with the account credentials, generating a new long-lived token, and updating the `facebook_page` Data Store key in Make.

---

**Symptom: Spotify worker (Spotify Episodes or Platform Followers) fails at the "Generate Token" step.**

Cause: the refresh token in the `spotify_creators` Data Store has been revoked, or it expired from non-use (Spotify revokes refresh tokens inactive for more than 1 year).

Fix: re-authorize in Spotify for Creators (creators.spotify.com). After re-authorization, locate the new refresh token and update the `spotify_creators` key in Make → Data Stores. The workers will then self-rotate it on the next run.

---

**Symptom: LinkedIn worker fails with a 403 or "invalid scope" error.**

Cause: the LinkedIn OAuth connection in Make has expired or had its permissions revoked.

Fix: escalate to the maintainer. Re-authorize the LinkedIn connector in Make → Connections.

---

**Symptom: X Posts worker fails consistently.**

Cause: X worker runs via Apify (not direct API). Possible causes: Apify account credit exhaustion, the Apify task configuration changed, or the scraper is blocked.

Fix: escalate to the maintainer. Check Apify account status and the X scraper task in the Apify console.

---

**Symptom: WordPress Articles worker fails with a 401 or 403 error.**

Cause: the `X-Dev-Token` header value used to authenticate against the WordPress REST API is no longer valid.

Fix: escalate to the maintainer. The dev token is hardcoded in the Make scenario's HTTP module headers.

---

### 9. Dashboard appearance and access issues

---

**Symptom: The dashboard shows all zeros / blank data, but the Airtable base has data.**

Most likely cause: critical fields are not enabled in Interface Designer's Fields panel. The `interface-alpha` SDK throws (silently caught as 0) for any field not in the visible configuration.

Fix: open Interface Designer → ⚙️ → Fields → for each table, enable all fields. See the Dashboard Technical Reference §8 for the full field checklist per table.

Secondary cause: the Interface Extension is loading sample data because the SDK isn't connected. This shows the dashboard layout with placeholder numbers. If this is happening in production (not development), escalate.

---

**Symptom: The dashboard shows a diagnostic screen listing missing tables.**

Cause: `SdkProvider.tsx` detected that one or more of the 13 required tables is not accessible to the extension.

Fix: open Interface Designer and expose the listed tables to the extension. See Dashboard Technical Reference §7.

---

**Symptom: A team member can't see the Mada Index interface.**

Cause: they don't have access to the Mada Index Airtable base, or they have access to the base but not the specific Interface.

Fix: escalate to the maintainer. Adding base collaborators or sharing an interface requires owner/creator-level permissions. Do not grant base access yourself.

---

**Symptom: The dashboard loads but a specific view is blank or shows an error state.**

Cause A — field visibility, as above (most common).

Cause B — a code bug in the dashboard (less common post-release). If the field visibility check passes and data exists in Airtable, escalate. Include a screenshot and which view/section is affected.

---

**Symptom: Fonts look wrong — serif where there should be Arabic, or system font instead of Newsreader.**

Cause: the font files referenced in `mada.css` use paths (`/assets/...`) that don't resolve on Airtable's CDN. This is a known issue (see Dashboard Technical Reference §17). The fallback fonts (Georgia / system-ui) are intentional and readable — this is a cosmetic issue, not a functional one.

Fix: escalate if font rendering needs to be addressed. It requires hosting the font files on an external CDN and updating `@font-face` declarations.

---

**Symptom: The "Generate PDF" / "Print Report" button produces a blank or broken PDF.**

Cause: the print report is generated by `printReport.ts`, a separate HTML generator that must be kept in sync with dashboard changes. If a new section was added to the dashboard without updating `printReport.ts`, it won't appear in the PDF.

Fix: escalate to the maintainer. Updating the print report requires a code change and a rebuild/release.

---

**Symptom: The dashboard shows the wrong month's data by default.**

Cause: the default period is hardcoded to a specific month (`'may-26'`) in `App.tsx`. When the current month advances, the default needs updating.

Fix: escalate to the maintainer. This is a one-line code change + `echo "update default period" | block release`. (Future: auto-detection of current month is on the improvements list.)

---

### 10. Known errors catalog

Recurring error types that have appeared before and have known resolutions.

| Error message pattern | Scenario | Cause | Resolution |
|---|---|---|---|
| `400 Syntax exception in path variables` | LinkedIn | URN encoding mismatch — the Make module is double-encoding colons | Escalate — module path needs adjustment |
| `400 Invalid param edgeType` | LinkedIn Platform Followers | Wrong `edgeType` value — must be `COMPANY_FOLLOWED_BY_MEMBER` (uppercase, underscore-separated, post-May 2023 API) | Confirm the query param is `COMPANY_FOLLOWED_BY_MEMBER` in the module; escalate if the module config changed |
| `OAuthException` / `Error validating access token` | Facebook or Instagram | Page token expired | Escalate — token renewal |
| `Error code 190` | Facebook or Instagram | Token expired or permissions revoked | Escalate |
| `Invalid or expired token` | Spotify | Refresh token invalid | Update `spotify_creators` in Make Data Store (see §8) |
| `429 Too Many Requests` | Any | Rate limit hit | The Make scenario's built-in retry will handle transient cases. If persistent, reduce `Max Items` in Sync Settings or space out cadence |
| `Connection refused` / timeout | Any | Platform API outage | Transient — the next scheduled run will retry. Check platform status pages if persistent |
| `Record not found` during update | Any | A record ID used in an update step is stale (record was deleted) | Escalate — the scenario may need a record-existence check added |
| `UNKNOWN_FIELD_NAME` | Dashboard (console) | A field name in `adapter.ts` doesn't match the actual Airtable field name | Escalate — code change required |
| `getCellValue` throws for a field | Dashboard (console) | Field not enabled in Interface Designer | Enable the field in Interface Designer → Fields |

---

## Part D · Fixing and escalating

### 11. What you can fix yourself

**Enable a field in Interface Designer:**
1. Open the Mada Index Airtable base.
2. Open the Dashboard interface.
3. Click ⚙️ (settings, near the top right of the interface editor).
4. Click "Fields" in the panel.
5. Find the relevant table, toggle the missing field on.
6. Reload the interface.

**Trigger a worker manually:**
1. Open the Mada Index Airtable base → Sync Settings table.
2. Find the row for the worker you want to run.
3. Click the "Run Scenario" button.
4. Wait for `Last Run Ended` to update (may take a minute or several, depending on volume).

**Pause a worker:**
1. Sync Settings → find the row → uncheck `Enabled`.
2. The Scheduler will skip it on subsequent runs.
3. Re-enable when ready.

**Update the Spotify refresh token:**
1. Re-authorize in Spotify for Creators → get the new refresh token.
2. Make.com → Data Stores → `spotify_creators` → edit the `value` field → paste the new token → save.
3. Trigger the Spotify Episodes worker manually to confirm it runs.

**Mark an Error as solved:**
1. Errors table → find the record → check the `Solved` checkbox.
2. This removes it from unsolved-error filters. Keep the record for audit purposes — don't delete it.

---

### 12. Escalation contacts and information to provide

**Primary escalation:** Tarek Shalaby · tarek@shala.by · Signal preferred.

**When escalating, always include:**
- Which scenario or which dashboard view is affected.
- The exact error message (copy from Errors table: `Type`, `Message`, `Detail` fields).
- The Make.com execution URL (the `Execution` field in the Errors table links directly to the failed run in Make).
- What you already checked and ruled out.
- Whether the issue is ongoing or a one-time event.

**What not to touch while waiting for escalation:**
- Don't disable multiple workers at once trying to isolate the problem.
- Don't delete Errors records.
- Don't change Sync Settings `Max Items` or `Cadence` values without understanding the impact.
- Don't attempt to edit a Make scenario.

---

*End of Runbook (v1.1).*
