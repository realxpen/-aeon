# AEON Technical Specification v0.1

## Architecture

AEON is a web application with a React/TypeScript frontend, Node backend, PostgreSQL/Supabase persistence, an agent runtime, and a WebMCP adapter layer. WebMCP tools expose real AEON capabilities to agents.

## Core mission flow

1. Create mission
2. Define Agent Constitution
3. Start agent
4. Search products
5. Evaluate and compare
6. Create bundle
7. Negotiate with vendors
8. Produce recommendation
9. Request human approval
10. Simulate reservation/purchase
11. Complete mission

## Agent states

IDLE -> UNDERSTANDING -> SEARCHING -> EVALUATING -> OPTIMIZING -> NEGOTIATING -> PROPOSAL_READY -> WAITING_FOR_APPROVAL -> APPROVED -> EXECUTING -> COMPLETED

## Core API

- POST /api/missions
- POST /api/missions/:missionId/policy
- POST /api/missions/:missionId/start
- POST /api/products/search
- POST /api/products/compare
- POST /api/bundles
- POST /api/negotiations/request
- POST /api/negotiations/:negotiationId/counter
- POST /api/missions/:missionId/approval
- POST /api/transactions/reserve

## WebMCP tools

- search_products
- get_product
- compare_products
- create_bundle
- calculate_bundle
- request_offer
- negotiate_offer
- request_human_approval
- reserve_bundle
- confirm_purchase

## Authority

Search, product retrieval, comparison, bundle creation, calculation, offer requests, and negotiation within policy are autonomous. Reservation and purchase confirmation require human approval.

## Repository layout

apps/web/ contains the frontend. server/ contains backend and agent services. supabase/ contains database migrations and seed data. docs/ contains product, UX, technical, hackathon, and decision documentation.
