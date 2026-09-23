# Restaurant discovery: pagination

Status: implemented in the working tree on 15 September 2026; automated checks
passed, browser/Atlas verification pending. This supports restaurant browsing
(FR2); pagination itself is an implementation decision, not a separately claimed
proposal requirement. Final report chapter placement awaits supervisor confirmation.

## Report draft

Restaurant discovery uses server-side pagination to retrieve a limited group of
active restaurants per request. The React interface maintains the selected page
and page size and sends them as query parameters to the FastAPI backend. The
backend validates the parameters, retrieves the requested documents from MongoDB,
and returns the restaurant data together with the total count and page information.
React uses this metadata to display the result range and enable navigation.

This approach keeps database access in the repository and presentation state in
React, following the refined React/FastAPI/MongoDB architecture. Offset pagination
was chosen for straightforward numbered navigation in the current small dataset.
This rationale is a development decision, not a quoted proposal justification.
It limits records returned per request but is not evidence of measured performance.

## Important actual code

`backend/app/routers/restaurants.py` validates inputs:

```python
page: int = Query(default=1, ge=1),
page_size: int = Query(default=20, ge=1, le=100),
```

Defaults apply when parameters are omitted. Invalid values produce HTTP 422
before repository access. The response schema is `RestaurantPage`.

`backend/app/repositories/restaurant_repository.py`:

```python
query = {"visibility_status": "active"}
total = collection.count_documents(query)
cursor = (
    collection
    .find(query)
    .sort("_id", 1)
    .skip((page - 1) * page_size)
    .limit(page_size)
)
```

The count and list use the same visibility condition. Sorting on a unique ID
keeps ordering deterministic for an unchanged dataset. For page 2 and size 2,
skip is 2, so records 3 and 4 are returned if available. Serialization converts
MongoDB ObjectIds to strings and constructs the restaurant response fields.

`backend/app/services/restaurant_service.py` calculates:

```python
"total_pages": (total + page_size - 1) // page_size,
```

Integer division rounds the page count up: five restaurants with size two need
three pages. Zero matches produce zero pages. An out-of-range positive page
returns HTTP 200 with empty items and the actual totals, rather than silently
changing the requested page.

`frontend/src/api/restaurants.js` maps JavaScript naming to API naming:

```javascript
const query = new URLSearchParams({page,page_size:pageSize});
```

`RestaurantDiscoveryPage.jsx` reloads when page, pageSize, or retry changes.
It reads `data.items`, `data.total`, and `data.total_pages`. Changing page size
resets page to 1. An AbortController and an active flag prevent an obsolete
request from replacing newer state. Loading and error states remain available;
Try again repeats the selected request. The size-two option supports checking
navigation with a small seeded dataset.

## Contract change and limitations

GET /api/restaurants previously returned an array with a limit parameter. It now
uses page/page_size and returns `{items, page, page_size, total, total_pages}`.
The application caller and existing list tests were updated together. External
callers must also adapt; the old limit parameter is no longer used.

Seeded records were retained; no schema migration or database mutation was performed.
Count and retrieval are separate reads, so concurrent dataset changes can affect
totals or page boundaries. Large offsets may become inefficient. Cursor pagination
and index tuning would be future decisions if needed. Page selection is local
component state, not a persistent/shareable URL parameter. Search, filters and map
synchronization are not provided by this change. Screenshots of the final interface
should be captured after manual verification and later refreshed if the UI changes.
