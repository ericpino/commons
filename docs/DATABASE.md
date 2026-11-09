# Database migrations and seeders

Prisma 7.10.1 is pinned because the registry's latest tag was a Prisma 8 release candidate. Prisma CLI, Client and the PostgreSQL adapter use the same version. Node 22 Docker images and the local Node 24 runtime satisfy the selected release.

## Structure

- `apps/api/prisma/schema.prisma`: introspected existing tables and relations, no renamed columns or new domain fields.
- `apps/api/prisma/migrations/20261109000000_initial/migration.sql`: existing DDL, role/kind/visibility checks, skill catalog constraints, normalized unique index and skill trigger. Catalog import/normalization is preserved as a one-time data migration. No fictional person or work records are embedded in migrations.
- `apps/api/prisma/seed.mjs`: Prisma Client transaction for the existing five-team Northstar fixture, including skills, records, follows, voluntary interests and fictional audit history. Normal seeding skips workspace insertion if any users exist. The explicitly requested `--reset-demo` mode retains the old reset behavior.
- `apps/api/prisma.config.ts`: database URL, migration directory and configured seed command; reads root `.env` if present. Environment variables take precedence.
- `scripts/seed-demo.mjs`: compatibility wrapper delegating to Prisma seed; no independent seed implementation.

The API still uses `pg` for request queries and audit transactions. Startup now checks connectivity rather than executing DDL; npm lifecycle hooks run migration deployment and safe seeding before the API starts. Invoking `node apps/api/dist/main.js` directly requires migrations/seeding to have run separately.

## Fresh database

Set DATABASE_URL, then run `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`. Docker API builds generate Client and include the config/migration/seed files. The Prisma CLI is a runtime dependency because startup deploys migrations after dev dependencies are pruned.

## Existing database adoption

1. Back up the existing database. Check its eight tables, columns, foreign keys, PostgreSQL checks, normalized skill index and `users_skills_catalog` trigger against the initial SQL. Do this before replacing the running API.
2. If it matches, run `npm run db:baseline` once. This invokes `prisma migrate resolve --applied 20261109000000_initial` and records history without rerunning schema/data SQL.
3. Run `npm run db:migrate`, then `npm run db:seed` if desired, and start the API.

Do not use baseline to suppress a mismatch. A nonempty database without migration history will intentionally fail deployment rather than silently modify or reset it. Do not run `prisma migrate reset` against retained data. The current Commons database was not migrated or reset as part of implementation verification.

Prisma cannot express all PostgreSQL checks, expression indexes or triggers in its schema model. Preserve and review these SQL definitions when generating future migrations; schema generation alone is not proof of equivalent database enforcement.

## Development and verification

`npm run db:migrate:dev -- --name descriptive_name` creates a migration against a development database (requires a shadow database or appropriate PostgreSQL permissions). Review its SQL and commit it with the schema. Production uses `npm run db:migrate` only.

`npm run test:migrations` refuses any existing public tables. Against an empty disposable database it checks fresh deployment, repeat deployment, seed idempotency, edited-data preservation, audit stability, skill trigger, role/visibility checks and normalized index. CI runs it before the HTTP suites.

The destructive `npm run seed:demo` remains a separate opt-in operation. It clears audit history and sessions and must not be used on retained data. No reset was run on the user's current database.

## Verified results (9 November 2026)

- `npm run lint`: ESLint and both TypeScript checks passed.
- `npm test`: 5 API and 15 frontend tests passed, no failures.
- `npm run build -w apps/api`: Prisma Client generated and TypeScript build passed.
- `npm run test:migrations`: passed on a new isolated PostgreSQL database; repeated deployment had no pending migration, seed reruns preserved an edited goal and six audit entries, and all tested database constraints remained enforced.
- Legacy adoption: initialized another isolated database with the previous committed schema/fixtures, baselined it, deployed and seeded. Before/after user and record snapshots were identical.
- `npm run test:integration`: all three HTTP suites passed on isolated API port 4103, including audit rollback and catalog enforcement.
- Explicit demo reset and `scripts/demo-readiness-integration.mjs`: passed only on the disposable verification database.

The current database and its sessions were not reset or baselined. Verification databases are named `commons_prisma_verify`, `commons_prisma_fresh` and `commons_prisma_legacy` on the local development PostgreSQL server.

Reference: [Prisma baseline workflow](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining).

Container verification: `docker build -f apps/api/Dockerfile -t commons-prisma-api:verify .` passed, including Client generation, API compilation and production dependency pruning. Running `db:migrate` and `db:seed` inside that image as its default non-root user passed against `commons_prisma_verify`. The root multi-target Dockerfile includes the Prisma config and directory, but its build was not completed: Docker's external syntax frontend fetch stalled with `only one connection allowed`. The service-image result does not claim that root multi-target build passed.
