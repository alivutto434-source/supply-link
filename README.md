# SupplyLink BD — Trade & Distribution Management

A B2B distribution portal connecting **Dealers**, **Suppliers**, and **Businessmen (Shops)** built with **React**, **TypeScript**, **Ant Design**, and **Tailwind CSS**.

## Core Capabilities

- **Supplier Overview Dashboard (`/`)**:
  - Tracks total monthly sales volume in BDT (`৳`).
  - Calculates active discount eligibility (editable base discount defaulting to `22%`, plus dynamic monthly bonus slab percentage).
  - Ranks Businessmen (Shops) sorted from highest spend to lowest spend.
- **Dealer Operations (`/dealer/*`)**:
  - Register distribution suppliers by name.
  - Publish company products directly to the supplier catalog.
  - Configure the Base Supplier Discount (%) and manage monthly target bonus slabs (`plusPercentage` and BDT `min`–`max` range; add and delete).
  - Issue multi-item advance product packages across multiple categories to one or multiple suppliers on deferred payment terms.
- **Supplier Operations (`/supplier/*`)**:
  - Browse products published by the Dealer alongside custom Supplier items.
  - Add custom items to the Supplier catalog.
  - Place multi-item quantity-based orders for Businessmen (Shops) with real-time monthly quota impact preview.
  - Track and settle deferred advance stock balances.
- **LocalStorage Persistence & Quota Guard**:
  - All records persist in browser `localStorage` with live capacity monitoring and `QuotaExceededError` protection.
  - Includes a **Clear Local Storage** control that removes custom changes while preserving baseline records.

## Development

```bash
npm install
npm run dev
npm run build
```
