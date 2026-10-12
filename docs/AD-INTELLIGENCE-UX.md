# Ad Intelligence — UX specification

## Product goal
A workspace for discovering, comparing, saving and reviewing advertising creatives across supported ad networks, including YAN/RSYA and social platforms. Distinguish observed evidence from inferred metadata. The prototype must not imply complete network coverage until the parser verifies it.

## Navigation inside this workspace
- Overview
- Ad library
- Live scans / parsing jobs
- Saved collections
- Advertisers
- Sources & coverage
- Alerts
- Export history
- Settings

## Main screen: Ad library
### Header
- Breadcrumb: NEON / Ad Intelligence / Ad library
- Page title: Ad library
- Supporting text: Search observed creatives across connected and publicly accessible sources.
- Actions: Save search, New scan (if quota allows), Export.

### Search and filters
- Full-width query input: advertiser, brand, domain, text in creative, destination URL.
- Source/platform multi-select.
- Placement: feed, stories, display, video, native, search, unknown.
- Creative type: image, video, carousel, text, responsive, other.
- First seen / last seen date range.
- Country / language.
- Active/observed status where source data supports it.
- Sorting: newest observed, oldest observed, recently re-seen.
- Filter chips with clear-one and clear-all.
- Persist filter state in URL once backend exists.

### Results layout
- Desktop: 3 columns of generous creative cards; optional left filter rail on wide screens.
- Tablet: 2 columns.
- Mobile: 1 column, filters in a drawer.
- Card shows creative preview (image/video frame/neutral placeholder), platform badge, advertiser/domain, short primary text, first/last observed date, format, and collection/save action.
- Card preview uses consistent media ratio; contain creatives rather than crop essential text. Use a neutral skeleton while loading.
- Never invent platform, advertiser, dates, reach, impressions or spend. Unknown values say “Не определено”.
- A source badge distinguishes directly observed, parser-inferred and user-imported information.

### Creative detail drawer/page
- Large original creative preview with fit-to-container and open original.
- Copy/text, title, CTA and destination URL as detected.
- Platform, source page, placement, observation timestamps, parser version and detection confidence where available.
- Evidence panel: saved DOM snippet/HTML artifact, screenshot if available, detected selectors and extraction notes.
- Actions: Save to collection, add note, copy URL, export metadata, report incorrect parsing.
- Version/history if same creative is observed again; preserve raw snapshots with retention policy.
- Mark extraction fields individually as observed/inferred/unknown.

### Collections
- Create, rename, duplicate, archive and delete (confirmation).
- Add/remove creatives, tags, notes, owner/team visibility.
- Bulk select, export CSV/JSON and share link only with permission.
- Empty state explains how to save first creative.

### Scan jobs
- Create scan: choose source/platform, target page/domain/search seed where supported, scan depth/limits and schedule.
- Review quota impact before starting.
- Job states: queued, running, partial, completed, failed, stopped.
- Progress, start/end time, records detected, records recognized, unrecognized samples and retry action.
- Partial failures must not be represented as full success.
- Avoid promises to bypass access controls, authentication, CAPTCHAs or platform restrictions.

### Coverage and parser quality
- Show last successful scan by source, extraction success rate, unknown creative count, parser version and freshness.
- Split “ads found” and “ads fully recognized”; they are different metrics.
- Make clear when a source is unavailable or the sample is too small.
- Unrecognized HTML artifacts should be retained safely with size limits, sanitization on display and configurable retention.
- Never execute captured HTML/JS in the app; render untrusted markup in a sandboxed preview or show escaped source.

## Design language
- Keep the approved dashboard component style: larger, roomy cards; calm surfaces; soft borders/shadows; rounded containers; clean hierarchy.
- Global theme: graphite / light neutral surfaces according to approved shell, with neon green #39FF88 and violet #A78BFA as product accents. Use accents sparingly.
- Ad Intelligence uses green accent. Platform logos retain recognizable brand colors only where appropriate.
- Large media-first cards, no tiny dense tiles. Prioritize readable creative previews and metadata.

## Interaction and states
- Loading skeletons; first-use empty state; no results; filter no-match; scan quota exceeded; permission denied; source unavailable; partial extraction; retry; export in progress; export complete; invalid URL; unsaved collection edits.
- Keyboard accessible filters and drawers, visible focus, descriptive labels, status text beyond color.
- Destructive actions need confirmation. Bulk actions show selected count.
- All controls must do something in prototype or clearly show a “demo” notification; no silent inert buttons.

## MVP sequence
1. Build Ad library shell and creative cards with mock data clearly labeled.
2. Implement filter/search behavior against fixture data.
3. Implement detail drawer and save-to-collection interaction.
4. Implement scan creation modal and demo job statuses.
5. Add saved collections and export.
6. Connect parser API, artifact storage and platform adapters.
7. Add access control, quotas, audit trail, data retention and security review.
