# Sigil Website and Activation Event Taxonomy

Updated: 2026-05-05

## Principles

Track qualified intent, not vanity traffic. Website analytics must remain compatible with the privacy page: no secrets, no source code, no scenario contents, and no personally sensitive data in event properties.

## Events

| Event | Where | Fires when | Properties |
|---|---|---|---|
| `page_viewed` | All pages | DOM ready | `path`, `title`, `referrer` |
| `install_clicked` | Landing/install links | Visitor clicks an install CTA | `path`, `cta`, `href` |
| `install_command_copy` | Landing/install command blocks | Visitor copies install command | `path`, `source` |
| `quickstart_clicked` | Landing/docs links | Visitor clicks quickstart CTA | `path`, `cta`, `href` |
| `contact_clicked` | Contact links | Visitor clicks contact CTA or mailto route | `path`, `cta`, `href` |
| `docs_viewed` | Docs pages | Docs page view | `path`, `title`, `section` |
| `search_submitted` | Starlight search | Search form submits | `path`, `query` |
| `search_results_displayed` | Starlight search | Results render | `path`, `query`, `result_count` |
| `search_result_clicked` | Starlight search | Visitor clicks a result | `path`, `href`, `text` |
| `install_completed` | CLI, optional | CLI install completes | `version`, `platform`, opt-in only |
| `first_eval_completed` | CLI, optional | First eval writes `eval.complete` | `version`, `service`, opt-in only |
| `decision_emitted` | CLI, optional | `sigil decide` emits a decision | `decision`, `trust`, opt-in only |

## Implementation Notes

The website exposes `window.sigilTrack(name, properties)` and dispatches a `sigil:analytics` custom event. If `window.plausible` exists, events are sent to Plausible. If `window.SIGIL_ANALYTICS_ENDPOINT` is configured, the site sends beacons there.

CLI telemetry is not enabled by this website work. If product telemetry is added later, it must be opt-in or explicitly documented before release.

## Weekly Review

- Review zero-result docs searches.
- Review install-copy to quickstart click-through.
- Review contact topics for missing docs.
- Review first-eval blockers from support messages.
