# SeekMakan System Architecture

## Initial Proposal

The initial architecture proposed React for the frontend, Node.js and Express
for the main backend, and FastAPI for the recommendation service.

## Refined Architecture

During initial prototyping, the architecture was refined to use FastAPI as a
unified modular backend.

React
  ↓
FastAPI
  ├── Discovery
  ├── Authentication
  ├── Community Contribution
  ├── Administration
  ├── External Data Providers
  └── Hybrid Recommendation
  ↓
MongoDB Atlas

## Reason for Refinement

The refinement avoids duplicated backend responsibilities, reduces
communication and deployment complexity, and allows the development effort to
focus on the main project objectives: discovery, community contribution and
hybrid recommendation.

The recommendation module remains separated logically within the FastAPI
application so that it can be developed and tested independently.

## Implemented discovery flow — 15 September 2026

The diagram above describes the intended architecture, not completion of every module.
The current discovery foundation includes restaurant listing and detail retrieval.
Pagination is implemented; browser verification against Atlas remains pending.

`RestaurantDiscoveryPage.jsx` holds the selected page and page size.
`api/restaurants.js` sends the HTTP request. `routers/restaurants.py` validates
query parameters, `services/restaurant_service.py` constructs page metadata,
and `repositories/restaurant_repository.py` counts and retrieves active MongoDB
documents. `schemas/restaurant.py` defines the API response contract.

Example: Next → page 2 → GET /api/restaurants?page=2&page_size=2 →
validate → skip 2 and retrieve up to 2 active documents → serialize IDs →
return items and totals → React renders cards and navigation.

Search, filters, synchronized map/list, and the other planned modules must not
be described as complete on the basis of this pagination work.
See [pagination implementation](implementation/restaurant-pagination.md) and
[test record](testing/restaurant-pagination.md). Report chapter numbering awaits
supervisor confirmation; these notes are organized by content.
