# Page Workflow Context

Use this file as a lightweight source of truth for working with pages in this repository.
Keep entries concise and update them when routes or core behavior change.

## Project Basics

- Local app URL: `http://localhost:<port>`
- App entry command: `npm run dev` (or project-specific equivalent)
- Environment preconditions: API token or login fallback, required feature flags, required roles

## Routes and Page Flows

Document key routes and one representative flow per route.

### MI page location

Where the page behind this repository lives in Metric Insights. `mi.url` and `app.id` (the page id) come from
`pp-dev.config.ts`. `GET <mi.url>/api/page/id/<page-id>` returns the page `internal_name` and `template_id`.

- Instance: `<mi.url>`
- Page `<page-id>`: view `<mi.url>/p/<internal-name>` · edit `<mi.url>/editor/page/<page-id>`
- Template `<template-id>`: edit `<mi.url>/editor/page/template/<template-id>`

Example (MI 7.x):

- View page: `https://stg70.metricinsights.com/p/mi-file-manager`
- Edit page: `https://stg70.metricinsights.com/editor/page/10559`
- Edit template: `https://stg70.metricinsights.com/editor/page/template/3981`

Instances before 7.0 use the legacy admin UI: edit page `<mi.url>/admin/page/edit/id/<page-id>`.

### Route: `<route-pattern>`

- Example URL: `<example-url>`
- Purpose: `<what-this-page-is-for>`
- Preconditions: `<auth/data/setup needed>`
- Primary flow:
  1. `<step-1>`
  2. `<step-2>`
  3. `<step-3>`
- Expected UI markers:
  - `<stable element or text>`
  - `<stable element or text>`
- Known caveats:
  - `<permissions/version-specific behavior/slow endpoint/etc.>`

## Smoke Checks

List quick checks that confirm core page functionality still works after changes.

- `<route>`: `<quick smoke check>`
- `<route>`: `<quick smoke check>`

## API Touchpoints (Version-Aware)

Use this section to record API dependencies for page flows and any instance-specific differences.

- Doc reference: https://help.metricinsights.com/m/API_Access
- Verified on instance/version: `<instance-url>` / `<version>`
- Known differences from docs:
  - `<endpoint or field difference>`
  - `<validation or payload difference>`
