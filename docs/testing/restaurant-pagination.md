# Pagination testing record

Date/version: 2026-09-15, base commit eb24709 plus uncommitted pagination changes.
Evidence E1: terminal results below. Automated tests use an in-memory collection
double, not MongoDB Atlas. They exercise the actual route/service/repository but
cannot prove MongoDB driver behavior, deployed connectivity or browser rendering.

| Test ID | Requirement/feature | Scenario | Steps and test data | Expected result | Actual result | Pass/fail | Evidence | Date/version |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PAG01 | FR2/browse | Defaults | GET restaurants; 5 active + 1 hidden fixture | 200, 5 items, page 1, size 20, total 5, 1 page | Assertions matched | Pass | E1; test_pag01_defaults | 2026-09-15 / eb24709 + working tree |
| PAG02 | FR2/browse | Ordering and last page | Request pages 1–3, size 2; reversed fixture insertion order | Lengths 2/2/1; active names 1–5 once, total 5, 3 pages | Assertions matched | Pass | E1; test_pag02_pages_stable_and_exclude_hidden | Same |
| PAG03 | FR2/browse | Beyond final page | Request page 4, size 2 | 200, empty items, total 5, 3 pages | Assertions matched | Pass | E1; test_pag03_out_of_range | Same |
| PAG04 | FR2/browse | Empty collection | Clear in-memory fixture only; request default page | 200, empty items, total 0, 0 pages | Assertions matched | Pass | E1; test_pag04_empty | Same |
| PAG05 | Input validation | Six invalid values | page=0/-1/abc; page_size=0/101/1.5 | 422 for each request | All six assertions matched | Pass | E1; parameterized test_pag05_invalid_parameters | Same |
| PAG06 | Input validation | Maximum page size | Request page_size=100 | 200, response size metadata 100 | Assertions matched | Pass | E1; test_pag06_page_size_boundary | Same |
| REG01 | Existing backend | Regression suite | Run all backend tests | Existing 11 and new 11 pass | 22 passed | Pass | E1 | Same |
| BUILD01 | Frontend | Static checks/build | npm.cmd run lint; npm.cmd run build | No lint/build errors | Commands completed without errors | Pass | E1 | Same |
| MAN01 | FR2/browser + Atlas | Navigate pages | Run both apps; select size 2 with >2 active records; Next/Previous/First | Correct range/cards, no overlap on unchanged data; boundary buttons disabled | Not executed | Pending | Capture screenshot + Network response | Pending |
| MAN02 | FR2/browser | Change size | On page 2 choose size 10 | Returns to page 1; correct totals | Not executed | Pending | Capture screenshot | Pending |
| MAN03 | Recovery | Request fails then retry | Stop local backend; trigger page request; restart backend; Try again | Error then successful recovery | Not executed | Pending | Capture error and recovery | Pending |
| MAN04 | Interface | Small screen | Inspect navigation at narrow viewport | Controls readable and usable without horizontal overflow | Not executed | Pending | Screenshot with viewport size | Pending |

## E1 — executed command evidence

Working directory: backend. Command:
`.\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider`

```text
......................                                                   [100%]
22 passed in 2.80s
```

Working directory: frontend. Commands: `npm.cmd run lint`, `npm.cmd run build`.

```text
> frontend@0.0.0 lint
> oxlint

> frontend@0.0.0 build
> vite build

vite v8.1.5 building client environment for production...
transforming... 81 modules transformed.
dist/index.html                   0.45 kB | gzip:  0.29 kB
dist/assets/index-B4o55Pjc.css    2.15 kB | gzip:  0.93 kB
dist/assets/index-C3-YNTMh.js   236.74 kB | gzip: 75.62 kB
built in 1.16s
```

Terminal escape sequences/progress glyphs omitted for readability. No failure
occurred in this recorded run; no failure/fix history has been invented. Cache
writing was disabled for pytest, so this does not verify cache-directory permissions.
Manual checks and proposal-required user evaluation remain outstanding. Record
actual observations, failures, fixes and retests when performed; do not infer passes
from the automated run. Keep automated scripts in backend/tests as regression tests.
