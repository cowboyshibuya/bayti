# Entity interface review — 7 October 2026

## Scope and Coverage

Mode: **full**. Scope: creation/editing and list controls for expenses, bills, tasks, events, shopping lists/items, documents, and manual reminders. Notes are excluded because the feature is unfinished. The implementation retains Inter, Tailwind, Radix, and the existing semantic OKLCH palette.

Runtime checks used the real components and Accounting/Documents pages with mocked network responses. Persistence and authorization checks used `convex-test`; no production data was changed. This review does not cover unrelated dashboard reports, authentication, or a production deployment.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Dialog focus restoration, keyboard dismissal, named controls, expanded forms, validation alerts, submit guards; 16 automated scans across both themes | Confirmed issues corrected |
| Layout | Modal header/body/footer, grid shrinkability, responsive rows and Documents page; 320/390/768/1280px checks | Confirmed overflow corrected |
| Writing | Create/edit action labels, errors, descriptions, unknown payment dates, filter summaries | Clear within the stated scope |
| Typography | Inter retained; 16px mobile form text, wrapping titles, tabular amounts | Clear within the stated scope |
| Colors | Semantic tokens retained; expanded-form automated contrast checks in both themes; explicit dialog label/description measurements | Measured normal text exceeds 4.5:1 |
| UI | Shared editor surfaces and action footer, restrained motion, explicit details actions, successful/failed save states | Confirmed interaction issues corrected |

## Findings

These findings define the implemented change scope and are resolved in this patch.

| # | Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HIGH | UI | `components/shared/entity-form.tsx:16`, Accounting creation dialogs | Save completed while the expense dialog remained open | Shared save completion closes controlled dialogs only after success | Prevents ambiguous completion and accidental repeated creation |
| 2 | HIGH | UI | `components/shared/entity-edit-button.tsx:34`, expense and shopping rows | Expense/item rows had no editing interaction; other entities required separate navigation | Native edit triggers reuse existing forms and mutations, with independent details/actions | Makes editing available directly from the entity |
| 3 | MEDIUM | Layout | `components/ui/dialog.tsx:120`, `components/shared/entity-collection.tsx:43` | Overlay-relative close positioning and intrinsic grid widths; browser reproduced row overflow at 320px | Content positioned directly, shrinkable grid tracks, independent scrolling form body, visible action footer | Keeps content and actions reachable at narrow widths |
| 4 | MEDIUM | UI | `convex/bills.ts:355`, financial list view selectors | Paid bills sorted by due date, with no editable payment date | Atomic status/payment-date updates; paid history ordered by payment date, unknown dates last | Displays payment history in its actual chronological order |
| 5 | MEDIUM | Accessibility | Shopping deletion, recurrence inputs, shared date controls | Hover-hidden/unnamed deletion control, unlabeled intervals, unsupported `aria-required` on buttons | Visible named deletion action, associated labels, valid required-field announcements | Makes controls understandable and usable by keyboard and assistive technology |

## Considered but Rejected

| Location | Candidate | Rejected because |
| --- | --- | --- |
| `app/globals.css`, root typography | Replace Inter or introduce a new palette | The existing design language is suitable; the problems were structure, interaction, and token use |
| Shared rows and dialogs | Hide horizontal overflow globally | It would conceal the failing content rather than fix its layout |
| Shared date controls | Replace the existing picker with another dependency | Existing controls could be retained and corrected; a new dependency was unnecessary |

## Verification

Passed:

- `bun run test`: 9 backend regression tests covering bill date/status transitions, chronological history, optional-field clearing, recurrence preservation, permission enforcement, other entity edits, and filtering before result limits.
- `bunx tsc --noEmit --pretty false` and `bunx tsc --noEmit -p convex/tsconfig.json --pretty false`.
- `bun run lint`: no errors; 11 pre-existing warnings remain outside this change's interface fixes.
- `bun run build` and `bun run build:cf`.
- `git diff --check`.
- Isolated Playwright checks: successful creation dismisses the dialog; failed saves preserve values; editing is prefilled; Escape restores focus; 56 modal checks at four widths in both themes; 16 expanded-form axe scans; actual Accounting save/tab/search/filter interactions; responsive Documents page.
- Additional browser checks: 200% reflow simulation using a 320×450 CSS viewport at device scale factor 2, reduced-motion preference, rejected discard confirmation, blocked pending dismissal, and duplicate-submit prevention.
- Explicit normal-text measurements against the dialog surface: minimum **6.01:1 light** and **5.76:1 dark** for sampled bill-form labels/descriptions.

Not verified:

- A live production session and deployment. Ship the updated Convex functions before the frontend; the existing `build:cf:ci` pipeline already performs that ordering.
- Manual spoken output in a screen reader and native browser UI zoom. Accessible names, labels, error roles, focus behavior, and reflow were checked programmatically.

## Verdict

**Approve** for the implementation and automated/runtime coverage stated above. Production deployment and manual assistive-technology checks are not claimed.

## Follow-up: deletion, modal clipping, and select menus

The screenshot regression came from footer negative margins inside nested scrolling containers, compounded by page-level dialog scroll overrides. Dialog panels now keep the footer inside their bounds; form bodies provide the single scroll area only when expanded content exceeds the available height. The compact expense form puts Merchant in Additional details and keeps related fields beside each other. Its collapsed body requires no scrolling at 320, 390, 768, or 1280px widths with a 568px viewport height.

Editors now expose a confirmed Delete action using existing authorized mutations. Deleting shopping lists warns that their items are deleted too. Canceled or failed deletion preserves the editor; successful deletion closes it. Confirmations prevent duplicate requests and dismissal while deleting. The new destructive controls retain semantic red surfaces with readable foreground text.

Select content is positioned directly by Radix, aligns with its trigger, respects viewport collision padding, and has padded 40px options. Long menus have a bounded, keyboard-focusable options group with scrolling controls. Transform wrappers and the incorrect trigger-height viewport rule were removed.

Verification: Playwright checked select bounds, option sizing, keyboard selection, and axe at four widths; confirmed all six shared editor deletion mutation routes plus the Documents editor; tested delete cancellation, failure recovery, and pending dismissal protection. Light/dark confirmation accessibility scans passed. Existing responsive form, expanded-form accessibility, focus, save, reflow, and reduced-motion checks also passed. Frontend/Convex type checks, nine backend tests, lint (11 existing warnings), native Next.js build, and Cloudflare build passed. Network responses in browser checks were mocked; no production deletion or deployment was performed.

## Follow-up: workspace currency and expense row activation

Settings Preferences now stores an admin-managed workspace currency, with EUR as the fallback for existing workspaces. Expense, bill, and document forms no longer ask for currency. New forms and backend creation defaults use the workspace preference; edits preserve each record's stored currency. Accounting and dashboard summary formatting uses the workspace default. Changing this preference does not convert existing records or perform currency conversion.

Expense rows now place their title, amount, metadata, and padding inside one native editor button. Remove is a separate sibling action. The row no longer moves during a layout animation, avoiding a moving click target.

Verification: 10 backend tests passed, including preference authorization/validation, defaults for all three operation types, and currency preservation on edits. Browser checks with mocked responses verified preference success/failure and accessibility, automatic USD expense creation, absent currency inputs, preserved existing currencies, first-click activation across four row regions at four widths, and separate removal behavior. Responsive/theme modal checks and expanded-form accessibility scans passed. Frontend/Convex type checks, native Next.js and Cloudflare builds passed; lint has no errors and 11 existing warnings.
