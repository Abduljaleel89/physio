# Physio Platform

A comprehensive physiotherapy management platform with exercise video uploads, patient management, and therapy plan tracking.

## Features

- 👥 **User Management**: Admin can create users (patients, doctors, receptionists)
- 🏥 **Doctor-Patient Assignments**: Assign doctors to patients
- 💪 **Exercise Library**: Create exercises with video uploads
- 📋 **Therapy Plans**: Create and manage therapy plans for patients
- ✅ **Exercise Completion**: Patients can mark exercises as completed
- 📊 **Analytics**: Track patient adherence and progress
- 📅 **Appointments**: Schedule and manage appointments
- 💰 **Invoicing**: Create and manage invoices

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT Authentication
- Multer for file uploads
- Nodemailer for emails

### Frontend
- Next.js 14
- React 18
- Tailwind CSS
- Axios for API calls

## Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (if running without Docker)

### Setup

1. **Clone repository**:
   ```bash
   git clone <your-repo-url>
   cd physio
   ```

2. **Start services**:
   ```bash
   docker compose up
   ```

3. **Run database migrations**:
   ```bash
   docker compose exec backend npm run prisma:migrate
   docker compose exec backend npm run prisma:generate
   docker compose exec backend npm run prisma:seed
   ```

4. **Access applications**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Adminer (DB): http://localhost:8080

### Default Login Credentials

- **Admin**: `admin@physio.com` / `password123`
- **Doctor**: `doctor@physio.com` / `password123`
- **Patient**: Use seeded patient accounts

## Deployment

See `README_DEPLOYMENT.md` for detailed deployment instructions.

### Quick Deploy
1. Set up Neon database
2. Deploy backend to Railway
3. Deploy frontend to Vercel
4. Configure environment variables
5. Run migrations

## Project Structure

```
physio/
├── backend/          # Express API server
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── lib/
│   │   └── middleware/
│   └── prisma/       # Database schema & migrations
├── frontend/         # Next.js frontend
│   ├── pages/
│   ├── components/
│   └── lib/
└── docker-compose.yml
```

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 4000)
- `PUBLIC_BASE_URL` - Backend public URL

### Frontend
- `NEXT_PUBLIC_API_BASE` - Backend API URL

## License

MIT

