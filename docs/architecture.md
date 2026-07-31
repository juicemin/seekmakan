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