# Database Migrations & Seeding

This directory contains the Prisma schema and seed data for the Physio project.

## Schema

The `schema.prisma` file defines all database models including:
- User (authentication)
- Patient, Doctor (user profiles)
- Exercise, TherapyPlan, TherapyPlanExercise
- CompletionEvent, VisitRequest, Appointment
- Upload, Invoice, Notification, AuditLog

## Running Migrations

To create and apply database migrations locally:

```bash
cd backend
npx prisma migrate dev --name init
```

This command will:
1. Generate Prisma Client
2. Create a new migration with all schema changes
3. Apply the migration to your local database
4. Regenerate Prisma Client

For subsequent schema changes:

```bash
npx prisma migrate dev --name <migration-name>
```

## Seeding the Database

After running migrations, seed the database with initial data:

```bash
cd backend
npm run prisma:seed
```

Or using Prisma directly:

```bash
npx prisma db seed
```

The seed script creates:
- 1 Admin user
- 1 Receptionist user
- 2 Physiotherapist users (with doctor profiles)
- 3 Patient users (with patient profiles and registration numbers)
- 6 Exercises (various difficulty levels)
- 3 Therapy Plans (connecting patients to therapists)

All users have the default password: `password123`

The script will print all created credentials and registration numbers to the console.

## Prisma Client Generation

Generate/regenerate Prisma Client after schema changes:

```bash
npx prisma generate
```

## Viewing the Database

Access the database using Adminer at http://localhost:8080 or use Prisma Studio:

```bash
npx prisma studio
```

