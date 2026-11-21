# Ad Profit Calculator

A small Laravel app that tells a business owner whether their paid ads are actually making money. The user enters their ad numbers and gets a profitability score, a label, the key metrics, and the main bottleneck.

Built as the Joya Digital Junior Developer assessment.

## Stack

- PHP 8.2+ / Laravel [VERSION]
- SQLite
- Blade + Tailwind CSS (Vite)
- Vanilla JavaScript (live CPL preview)
- PHPUnit

## Setup (fresh machine)

Requirements: PHP 8.2+, Composer, Node.js 18+, the `pdo_sqlite` PHP extension.

```bash
git clone [REPO_URL] ad-profit-doctor
cd ad-profit-doctor

composer install
cp .env.example .env
php artisan key:generate

touch database/database.sqlite
php artisan migrate

npm install
npm run build

php artisan serve
```

Open http://127.0.0.1:8000.

Make sure `.env` contains `DB_CONNECTION=sqlite` (remove the `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` lines if present).

Run the tests:

```bash
php artisan test
```

## What I built

- A form with the 8 inputs (ad spend, leads, customers, customer value, gross margin %, close rate %, lead response time, follow-up process).
- Server-side validation with a Form Request, with an error message under each field and old input preserved.
- A `CalculationService` that returns CPL, CPA, break-even CPL/CPA, revenue, net profit, ROAS, score, label and bottleneck.
- A `SubmissionService` that calls the calculation and saves the result.
- A results page (score, label, metrics, bottleneck), reachable by an unguessable UUID link.
- Every submission is saved in a `submissions` table (inputs and results).
- Unit tests for the calculation service.
- A live CPL preview on the form (vanilla JS), mobile-first layout.

## Structure

| Layer | Responsibility |
|---|---|
| `CalculateRequest` | Validation and error messages |
| `SubmissionController` | HTTP only: receive, delegate, redirect |
| `SubmissionService` | Orchestration: calculate, then save |
| `CalculationService` | Pure calculations, no database, no HTTP |
| `Submission` model | Persistence, casts, UUID route key |
| `ResponseTime` enum | Dropdown values and their score points |
| `BottleneckResponse` enum | The four bottleneck labels |

The calculation service takes an array and returns an array, so it is unit-tested without a database.

After a successful POST the app redirects to `/results/{uuid}` (Post/Redirect/Get), so refreshing does not create a duplicate submission and the user can come back to the link later.

## Assumptions and decisions

**Case C (leads = 0): no crash.**
CPL is `ad spend / leads`, which is a division by zero. I return `null` for CPL (and for CPA when customers = 0, and ROAS when spend = 0) instead of inventing a number. The score rules for CPL/CPA are skipped when the value is `null`, and the UI shows "N/A". Case C therefore scores 10: 50 − 25 (zero customers) − 15 (negative net profit).

**Bottleneck when CPL is `null`.**
The brief does not cover it. I return **Ads / offer problem**, because money was spent and the ads produced no leads at all. The alternative would be showing "not enough data".

**Comparisons.**
- Score: `<` and `>` for CPL and CPA ("below" / "above"). Equal to break-even gives 0 points. The extra +10 uses `<=` because the brief says "20% or more below".
- Bottleneck: "above break-even" is the Ads problem, so CPL equal to break-even continues to the next conditions.
- Same-day response gives 0 points (not covered by either rule).

**Rounding.**
Money values are rounded to 2 decimals before comparison to avoid floating point errors (e.g. `100.00000000000001` vs `100`).

**Percentages.**
Gross margin and close rate are entered as 0–100 and converted to decimals inside the service.

**Validation rules I added beyond the brief.**
- `ad_spend > 0`: the tool evaluates paid ads, and zero spend makes ROAS undefined and CPL misleadingly perfect.
- `customer_value > 0` and `gross_margin > 0`: zero makes break-even 0, which is not meaningful.
- `customers <= leads`: a customer must first be a lead.
- `leads = 0` and `customers = 0` are allowed (Case C).

**Anonymous submissions.**
There are no user accounts. Each submission is anonymous and opened through an unguessable UUID, so people cannot browse other people's numbers by counting ids.

**Stored results.**
Results are stored with the inputs, so an old result stays exactly as the user saw it even if the formulas change later.

## Tests

Unit tests in `tests/Unit/CalculationServiceTest.php` cover:

- Cases A, B and C from the brief
- Score cap at 0 and at 100
- CPL equal to break-even gives no CPL points
- Same-day response gives 0 points
- The extra +10 applies only at 20% or more below break-even (including the exact threshold)
- Zero customers
- Bottleneck: ads, follow-up, sales conversion, none

## What I would improve with more time

- Feature tests for the full HTTP flow (validation errors, Case C through the form, 404 on a bad UUID).
- Rate limiting on the form and automatic deletion of old submissions (privacy).
- Move the live preview script out of the Blade file into `resources/js`.
- Move scoring thresholds and points into config so they can change without touching logic.
- Add LTV and repeat purchases: the tool assumes a customer buys once, which understates the value of ads for repeat-purchase businesses.
- Localization (Arabic/RTL) and currency selection.

## Time spent

Roughly [X] hours.

## Use of AI tools

[Be specific and honest here. Example:] I used Claude to discuss the formulas and architecture, to review my code, and to generate the Tailwind markup for the form and results page. I wrote and adjusted the service logic, validation and tests myself and I can explain every line.
