# Physio Platform - Development Guide

This document provides instructions for running and testing the Physio platform.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for database)
- PostgreSQL 15 (via Docker Compose)

## Getting Started

### 1. Start Services

Start all services with Docker Compose:

```bash
PS C:\Users\jalil\physio> docker compose up --build
```

This will start:
- PostgreSQL database on port 5432
- Adminer (database admin) on port 8080
- Backend API on port 4000
- Frontend on port 3000

### 2. Database Setup

Run migrations and seed the database:

```bash
PS C:\Users\jalil\physio\backend> npm install
PS C:\Users\jalil\physio\backend> npx prisma migrate dev --name init
PS C:\Users\jalil\physio\backend> npm run prisma:seed
```

### 3. Start Backend (if not using Docker)

```bash
PS C:\Users\jalil\physio\backend> npm install
PS C:\Users\jalil\physio\backend> npm run dev
```

The backend will run on http://localhost:4000

### 4. Start Frontend (if not using Docker)

```bash
PS C:\Users\jalil\physio\frontend> npm install
PS C:\Users\jalil\physio\frontend> npm run dev
```

The frontend will run on http://localhost:3000

## Testing

### Run Tests

```bash
PS C:\Users\jalil\physio\backend> npm test
```

## File Uploads

### Overview

File uploads are stored locally under `backend/uploads/` directory. Files are served statically at `/uploads/<filename>`.

### Upload Endpoint

**POST** `/api/uploads/file`

Requires authentication via Bearer token.

#### Request

```bash
curl -X POST \
  http://localhost:4000/api/uploads/file \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@./test-data/video.mp4" \
  -F "purpose=completion" \
  -F "referenceId=123"
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "video.mp4",
    "url": "http://localhost:4000/uploads/uuid.mp4",
    "size": 1024000,
    "mimeType": "video/mp4",
    "uploadedAt": "2024-01-01T12:00:00.000Z",
    "purpose": "completion",
    "referenceId": 123
  }
}
```

### Upload with Completion (Combined Flow)

You can upload a file directly when creating a completion event:

**POST** `/api/patients/:id/complete`

```bash
curl -X POST \
  http://localhost:4000/api/patients/1/complete \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "therapyPlanExerciseId=1" \
  -F "file=@./test-data/image.png" \
  -F "notes=Completed exercise with video" \
  -F "painLevel=3" \
  -F "satisfaction=4"
```

Or use an existing upload ID:

```bash
curl -X POST \
  http://localhost:4000/api/patients/1/complete \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "therapyPlanExerciseId": 1,
    "mediaUploadId": 1,
    "notes": "Completed exercise",
    "painLevel": 3,
    "satisfaction": 4
  }'
```

### Get Upload Metadata

**GET** `/api/uploads/:uploadId`

```bash
curl -X GET \
  http://localhost:4000/api/uploads/1 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Accessing Uploaded Files

Files are served statically at:

```
http://localhost:4000/uploads/<uuid>.<ext>
```

Example:
```
http://localhost:4000/uploads/550e8400-e29b-41d4-a716-446655440000.png
```

### File Upload Constraints

- **Maximum file size**: 20 MB
- **Allowed file types**:
  - Images: JPEG, PNG, WebP
  - Videos: MP4, QuickTime, AVI
- **Storage location**: `backend/uploads/` (auto-created on first upload)
- **File naming**: UUID-based filenames (prevents overwrites)

### Development Testing

1. Create a test file (e.g., `test-image.png`)
2. Login to get JWT token:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient1@example.com",
    "password": "password123"
  }'
```

3. Upload file using the token:

```bash
curl -X POST \
  http://localhost:4000/api/uploads/file \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@./test-image.png"
```

4. Access the file at the returned URL

### Notes

- Files are stored with UUID filenames for security
- Directory listing is disabled on `/uploads` endpoint
- Uploads are linked to patients/users for access control
- In production, consider adding virus scanning (ClamAV)

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (email+password or regNumber+dob for patients)
- `POST /api/auth/verify` - Verify email with token
- `GET /api/auth/me` - Get current user

### Exercises

- `GET /api/exercises` - List exercises
- `POST /api/exercises` - Create exercise (staff only)
- `PATCH /api/exercises/:id` - Update exercise (staff only)
- `DELETE /api/exercises/:id` - Archive exercise (staff only)

### Therapy Plans

- `POST /api/therapy-plans` - Create therapy plan
- `GET /api/therapy-plans/:id` - Get therapy plan with exercises
- `POST /api/therapy-plans/:id/exercises` - Add exercise (bumps version)
- `PATCH /api/therapy-plans/:id/exercises/:exerciseId` - Update exercise details
- `DELETE /api/therapy-plans/:id/exercises/:exerciseId` - Archive exercise

### Completions

- `POST /api/patients/:id/complete` - Create completion (with optional file upload)
- `POST /api/completion-events/:id/undo` - Undo completion (5-minute rule for patients)

### Appointments

- `POST /api/appointments` - Create appointment
- `GET /api/appointments/calendar` - Get appointments for date range
- `GET /api/appointments/:id` - Get appointment
- `PATCH /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Visit Requests

- `POST /api/visit-requests` - Create visit request
- `GET /api/visit-requests` - List visit requests
- `PATCH /api/visit-requests/:id/respond` - Accept/reject (doctor only)
- `POST /api/visit-requests/:id/assign` - Assign doctor (admin/reception only)

### Invoices

- `POST /api/invoices` - Create invoice (admin/reception only)
- `GET /api/invoices` - List invoices
- `PATCH /api/invoices/:id` - Update invoice status
- `POST /api/invoices/:id/void` - Void invoice (admin/reception only)

### Analytics

- `GET /api/analytics/adherence` - Get adherence analytics (admin/doctor only)

### Uploads

- `POST /api/uploads/file` - Upload file
- `GET /api/uploads/:uploadId` - Get upload metadata

## Environment Variables

See `.env.example` for required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing
- `PUBLIC_BASE_URL` - Base URL for public file URLs (default: http://localhost:4000)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration (optional, uses Ethereal in dev)

## Database Access

### Adminer

Access database admin interface at:
http://localhost:8080

- Server: `db`
- Username: `physio`
- Password: `physio_pass`
- Database: `physio_dev`

### Prisma Studio

```bash
PS C:\Users\jalil\physio\backend> npx prisma studio
```

Access at http://localhost:5555

## Troubleshooting

### Uploads directory not found

The `backend/uploads/` directory is auto-created on first upload. If you need to create it manually:

```bash
PS C:\Users\jalil\physio> mkdir backend\uploads
```

### File upload fails

- Check file size (max 20 MB)
- Verify file type is allowed (images/videos only)
- Ensure authentication token is valid
- Check server logs for detailed error messages

### Email not sending

In development, emails are sent via Ethereal Email. Check console logs for preview URLs:
```
📧 Email preview: https://ethereal.email/message/...
```

