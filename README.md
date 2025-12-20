# Inventory Management POC – Backend

## Overview

This backend service is part of an Inventory Management Proof of Concept designed for Indian AEC (Architecture, Engineering, Construction) businesses.

The backend focuses on **inventory tracking, consumption analysis, runway calculation, and intelligent material request analysis**, enabling better operational decisions and reducing losses caused by stock-outs, dead inventory, and poor planning.

It exposes clean REST APIs consumed by the frontend application.

---

## Core Responsibilities

- Manage construction sites and materials
- Track site-level inventory
- Record daily material usage
- Calculate inventory runway (time-based availability)
- Analyze material requests before submission
- Provide APIs for dashboards and visualizations

---

## Key Features

### Inventory Management
- Create and manage inventory per site and material
- Track quantity and estimated daily burn rate
- Identify dead or slow-moving inventory

### Daily Usage Tracking
- Record daily material consumption
- Maintain historical usage data
- Support consumption trend analysis

### Inventory Runway Calculation
- Converts quantity into time-based insight (days of work remaining)
- Helps prevent mid-day work stoppages and idle labor costs

### Material Request Analysis
- Analyzes the impact of a request before approval
- Flags high-risk requests that may lead to shortages
- Encourages reuse of available inventory instead of blind procurement

### Simple & Transparent APIs
- RESTful endpoints
- Easy to test and extend
- Designed for internal operational tools

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **Architecture**: REST API
- **Deployment**: Render

---

## API Overview

### Sites
- `GET /sites` – List all construction sites

### Materials
- `GET /materials` – List all materials

### Inventory
- `GET /inventory` – View inventory across sites
- `POST /inventory` – Add new inventory
- `DELETE /inventory/:id` – Delete inventory
- `POST /inventory/check-in` – Record daily material usage

### Usage History
- `GET /inventory/:id/usage-history` – Fetch usage per check-in for visualization

### Material Request
- `POST /request/analyze` – Analyze feasibility of a material request
- `POST /request` – Submit material request (POC scope)

---

## Database Notes

- SQLite is used for simplicity and ease of deployment
- Database files are created at runtime
- Data may reset on redeployments (acceptable for POC)

---

## Live Deployment

Backend URL: https://inventory-management-backend-z46r.onrender.com/
