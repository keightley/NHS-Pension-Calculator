# NHS Scotland Pension Projection Calculator

A client-side web application that projects NHS Scotland pension benefits. Covers the 1995 Section, 2008 Section, and 2015 CARE Scheme, including McCloud Remedy comparison, tapered protection, commutation, and scheme flexibilities.

## Features

- **Date-based inputs** for precise service and factor calculations
- **Three-basis salary projection** (CPI+0%, CPI+1%, CPI+2%) matching SPPA format
- **McCloud Remedy comparison** — legacy vs CARE for 2015–2022
- **Full SPPA factor tables** — ERF, LRF, commutation (monthly precision)
- **Protection status** auto-derived from DoB and date joined
- **Part-time working** support
- **Scheme flexibilities** — Additional Pension, ERRBO, Added Years
- **ABS accuracy check** — project next ABS values for validation
- **Scottish income tax** calculation (6 bands + PA taper)
- **Survivor benefits** estimation
- **Print / PDF** export via browser

## Run Locally

```bash
npm install
npm run dev
```

## Deploy

Deployed automatically to GitHub Pages on push to `main` via the included GitHub Actions workflow.

## Disclaimer

This calculator is for guidance purposes only. It is not financial advice. Contact an independent financial adviser if needed. Factor data sourced from SPPA (GAD) — see the app footer for version details.
