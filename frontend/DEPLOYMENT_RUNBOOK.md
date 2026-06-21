# Deployment Runbook

## Required Files
- backend env template:
  - [C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backend\.env.example](C:\Users\Ahmed%20Bilal%20Khan\Desktop\Respark_Clone\backend\.env.example)
- local stack helper:
  - [C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\start-local-stack.ps1](C:\Users\Ahmed%20Bilal%20Khan\Desktop\Respark_Clone\start-local-stack.ps1)
- backup helper:
  - [C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backup-respark.ps1](C:\Users\Ahmed%20Bilal%20Khan\Desktop\Respark_Clone\backup-respark.ps1)
- backend health script:
  - [C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backend\scripts\healthcheck.mjs](C:\Users\Ahmed%20Bilal%20Khan\Desktop\Respark_Clone\backend\scripts\healthcheck.mjs)

## Backend Setup
```powershell
cd C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backend
copy .env.example .env
npm.cmd install
npx.cmd prisma db push
npx.cmd prisma generate
npm.cmd test
npm.cmd run start
```

## Frontend Setup
```powershell
cd C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\frontend
npm.cmd install
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

## Production Readiness Checks
- configure production `DATABASE_URL`
- configure strong `JWT_SECRET`
- configure strong `JWT_REFRESH_SECRET`
- configure `FRONTEND_APP_URL`
- configure SMTP values if transactional emails are needed
- enable HTTPS on reverse proxy or platform
- set `TRUST_PROXY=true` when deployed behind a proxy
- confirm `/health` and `/ready` respond correctly
- rotate any locally used real secrets before production

## Operational Commands
```powershell
cd C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backend
npm.cmd run healthcheck
npx.cmd prisma db push
npx.cmd prisma generate
```

## Backup
```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backup-respark.ps1"
```

Optional environment variables for backup:
- `RESPARK_DB_NAME`
- `RESPARK_DB_USER`
- `RESPARK_DB_PASSWORD`

## Verified Local QA Baseline
- backend tests: `79 passed`
- frontend lint: passed
- frontend production build: passed
- Prisma db push: passed
- Prisma generate: passed
