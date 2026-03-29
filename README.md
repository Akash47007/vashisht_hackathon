# FutureYou Retirement Coach

FutureYou is a mobile-first web application that helps Gen Z users turn retirement planning from a distant idea into a weekly habit. It combines financial projections, contribution workflows, behavioral nudges, and short learning modules to make Gen Z, plan their future.

## Problem Statement
Retirement blindness among Gen Z is driven by three major issues:

- Retirement feels too far away, so users prioritize short-term spending.
- Financial literacy is often limited, making long-term planning confusing.
- Even when users understand the goal, consistent action is missing.

This leads to delayed investing, lower long-term corpus growth, and higher risk of financial insecurity later in life.

## Solution Overview
FutureYou solves the awareness-to-action gap with an end-to-end behavior-change system. There are many solutions that provide investing solutions and other services, but none make it easy and intutive for the Gen Z. 
FutureYou focuses on simplifying the complex world of retirement planning into a tangible, actionable, and consistent experience that builds financial literacy and confidence over time.

We do not aim provide high level and complex investment and finance management, but rather a starting point with gamified experience to make it appealing for the Gen Z and make them start planning for their future.
We intentionally made the project simple and easy to use, with a focus on the core features that can drive behavior change, rather than trying to be a comprehensive financial tool from day one.

We want to create a product that is approachable and engaging for users who may be new to financial planning, while still providing valuable insights and actionable steps to help them start their retirement planning journey. 

- Tangibility: retirement snapshot with required vs projected corpus and confidence score.
- Actionability: contribution setup, recurring behavior simulation, and what-if planning.
- Consistency: streaks, nudges, milestones, and guided next actions.
- Literacy: practical learning quests tied to user decisions.
- Safety: withdrawal preview with liquidity checks and retirement-impact simulation.

## Key Features
### Onboarding and Planning
- Account signup and login.
- Financial profile capture (income, expenses, savings, risk comfort, target retirement age).
- Plan generation using transparent assumptions (inflation and return rates).
- What-if simulator for monthly contribution changes.

### Post-Onboarding Experience
- Snapshot page for retirement readiness.
- Contributions page for recurring plan setup and contribution logging.
- Dashboard with:
  - streak and consistency tracking,
  - money flow breakdown,
  - returns tracker,
  - allocation guidance,
  - nudges and action checklist.
- Learning quests with completion tracking.
- Withdrawals center with:
  - preview of charges and estimated net payout,
  - retirement corpus impact before confirmation,
  - liquidity and emergency-fund safety checks,
  - withdrawal history and transaction timeline.
- Dedicated User Manual page for feature-by-feature guidance after onboarding.

## Financial Logic (High Level)
The backend planning engine computes:

- Future monthly expense at retirement (inflation-adjusted).
- Required retirement corpus (annuity-based approximation).
- Projected future value from current savings and recurring contributions.
- Monthly contribution needed to close the gap.

Important: this product is educational planning support, not regulated personalized investment advice.

## Tech Stack
- Frontend: Next.js 14 (App Router), React 18
- Backend: Node.js, Express, Zod
- Auth and utility libraries: bcryptjs, jsonwebtoken, uuid
- Scheduler: node-cron
- Current storage: in-memory runtime store
- Planned persistence: PostgreSQL schema in `database/schema.sql`

## Project Structure
- `frontend/` - Next.js client application
- `backend/` - Express API and planning engine
- `database/schema.sql` - PostgreSQL target schema
- `problem_statement.txt` - challenge problem statement
- `expectations.txt` - end-to-end product expectations

## Setup Instructions
### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+

### 1. Install dependencies
From the repository root:

```bash
npm install
```

### 2. Configure backend environment
Create `backend/.env` with the following values:

```env
PORT=4000
JWT_SECRET=replace-with-a-strong-secret
CLIENT_ORIGIN=http://localhost:3000

DEFAULT_INFLATION_RATE=0.06
DEFAULT_PRE_RETIREMENT_RETURN=0.10
DEFAULT_POST_RETIREMENT_RETURN=0.05
DEFAULT_YEARS_IN_RETIREMENT=30
```

### 3. Configure frontend environment
Create `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### 4. Run the full stack
From the repository root:

```bash
npm run dev
```

This starts:
- Backend at `http://localhost:4000`
- Frontend at `http://localhost:3000`

### 5. Open the app
- Home: `http://localhost:3000`
- Onboarding: `http://localhost:3000/onboarding`
- User Manual: `http://localhost:3000/manual`

## Basic Verification
After starting the app:

- Backend health: `GET http://localhost:4000/health`
- Frontend routes expected to return 200:
  - `/manual`
  - `/dashboard`
  - `/contribution`
  - `/snapshot`
  - `/withdrawals`

## Video Demo
[Link to demo video walkthrough](https://www.loom.com/share your-demo-video-link)

## Future Improvements
- Wire backend to PostgreSQL persistence layer.
- Add protected-route middleware and stronger auth hardening.
- Add automated tests for planning and withdrawal edge cases.
- Add observability dashboards for activation and behavior metrics.
- Implement more granular nudge triggers and personalized learning paths.
- Implement more versitile ways to invest and better guidence system with actual human support.