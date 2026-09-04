# 🔧 Dumu Waks - Professional Maintenance & Repair Services Platform

<div align="center">
  <img src="./frontend/public/images/logo-full.png" alt="Dumu Waks Logo" width="200"/>
  <br/>
  <br/>

  <h3>🌐 <a href="https://dumuwaks.ementech.co.ke">Live App</a></h3>

  <p><strong>Connecting skilled technicians with customers across Kenya</strong></p>
</div>

> A comprehensive full-stack platform enabling customers to find, book, and pay skilled technicians for professional repairs, maintenance, and engineering services. Built with the MERN stack and featuring AI-powered matching, real-time communication, and M-Pesa payment integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org/)
[![Live Demo](https://img.shields.io/badge/demo-online-success)](https://dumuwaks.ementech.co.ke)

---

## 🌟 Live Application

**🔗 Visit the app:** [https://dumuwaks.ementech.co.ke](https://dumuwaks.ementech.co.ke)

> **Production Ready!** The platform is live and accepting real users. Create your account to start:
> - **Customers**: Find and book skilled technicians for your maintenance needs
> - **Technicians**: Showcase your skills and connect with customers
> - **Real Payments**: Integrated M-Pesa payment system (Kenya)
> - **Real-Time Matching**: AI-powered technician matching algorithm

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd dumuwaks

# Quick setup
cp .env.docker.example .env.docker
nano .env.docker  # Configure your environment

# Start with Docker (Recommended)
./scripts/docker-dev.sh

# OR manual setup
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

**Access the app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api-docs

📖 **Detailed setup**: See [QUICK_START.md](./QUICK_START.md)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

## ✨ Features

### Core Features
- 🔐 **Authentication & Authorization** - JWT-based secure auth with role management
- 👥 **User Management** - Customer, Technician, Admin, Support roles
- 🛠️ **Service Booking** - 99+ service types across 12 categories
- 💰 **Smart Pricing** - Dynamic pricing with distance, urgency, and time factors
- 💳 **M-Pesa Integration** - Seamless mobile payments
- 🤖 **AI Matching** - Intelligent technician matching algorithm
- 💬 **Real-time Messaging** - In-app chat between customers and technicians
- 📍 **Location Services** - Distance-based pricing and technician discovery
- ⭐ **Rating & Reviews** - Two-way rating system
- 🎫 **Support System** - Comprehensive ticket-based support

### Payment Features
- 💳 **M-Pesa Integration** - Seamless STK Push payments
- 💰 **Booking Fee System** - 20% refundable deposit (held in escrow)
- 🔄 **Completion Payment** - Automatic collection of remaining balance
- 💸 **Technician Payouts** - 85% payout to technicians via M-Pesa B2C
- 📊 **Transparent Pricing** - Clear breakdown of all fees
- 🤖 **Automatic Processing** - Platform commission (15%) handled automatically
- ⚡ **Dynamic Pricing** - Based on urgency, distance, and time
- 📱 **Admin Dashboard** - Manage pending payouts and batch processing

### Advanced Features
- Service completion verification
- Matching preferences
- Session-based search
- Document encryption
- API rate limiting
- Comprehensive logging

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB 7.0
- **Cache:** Redis
- **Authentication:** JWT
- **Payment:** M-Pesa Daraja API
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **State Management:** Redux Toolkit
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **UI Components:** Custom component library

### DevOps
- **Server:** VPS (Ubuntu 24.04, PM2 + Nginx)
- **CI/CD:** GitHub Actions (zero-downtime deploy)
- **SSL:** Let's Encrypt / Certbot
- **Containerization:** Docker + Docker Compose (local dev)
- **Monitoring:** Health checks + PM2 logging
- **Database:** MongoDB Atlas (managed)

## 🏷️ Brand identity — brand.registry.json

`brand.registry.json` (repo root) is a vendored copy of the estate-wide brand
registry (canonical source: `ementech-website/src/config/brand.registry.json`).
It is the single source of truth for domains, emails, NAP and product status.
`seo/src/lib/constants.ts` derives `SITE_URL` from it; the frontend contact
details match it. When the registry changes upstream, re-vendor the copy in
the same commit so the diff is reviewable.

## 📁 Project Structure

```
dumuwaks/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Custom middleware
│   │   ├── utils/        # Utility functions
│   │   ├── jobs/         # Background jobs
│   │   └── server.js     # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── frontend/             # React/TypeScript app
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── store/        # Redux store
│   │   ├── services/     # API services
│   │   ├── utils/        # Utility functions
│   │   └── App.tsx       # Root component
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docs/                 # Documentation
│   ├── api/              # API documentation
│   ├── deployment/       # Deployment guides
│   ├── features/         # Feature documentation
│   ├── guides/           # How-to guides
│   ├── backend/          # Backend docs
│   └── fixes/            # Bug fixes & solutions
│
├── scripts/              # Utility scripts
│   ├── docker-dev.sh     # Development deployment
│   └── docker-prod.sh    # Production deployment
│
├── docker-compose.yml    # Development setup
├── docker-compose.prod.yml  # Production setup
├── .env.docker.example   # Environment template
├── QUICK_START.md        # Quick start guide
└── README.md             # This file
```

## 📚 Documentation

### 🚀 Getting Started
- [Quick Start Guide](./QUICK_START.md) - Get up and running in 5 minutes
- [Environment Variables](./docs/backend/ENV_VARIABLES.md) - Configuration reference
- [Docker Deployment](./docs/deployment/DOCKER_DEPLOYMENT.md) - Containerized deployment

### 🔌 API Documentation
- [API Routes Summary](./docs/api/API_ROUTES_SUMMARY.md) - All available endpoints
- [Swagger Setup](./docs/api/SWAGGER_SETUP_SUMMARY.md) - Interactive API docs
- [Swagger Testing](./docs/api/SWAGGER_TESTING_GUIDE.md) - Testing with Swagger UI

### 💡 Features
- [Pricing System](./docs/features/PRICING_SYSTEM_DOCUMENTATION.md) - How pricing works
- [M-Pesa Integration](./docs/features/MPESA_INTEGRATION_GUIDE.md) - Payment integration
- [Booking Fee System](./docs/features/BOOKING_FEE_SYSTEM.md) - Escrow & fees
- [AI Matching](./docs/features/AI_MATCHING_IMPLEMENTATION.md) - Matching algorithm
- [Support System](./docs/features/SUPPORT_SYSTEM_SUMMARY.md) - Ticket system

### 🛠️ Development
- [Database Schema](./docs/backend/DATABASE_SCHEMA_SUMMARY.md) - MongoDB collections
- [Implementation Summary](./docs/backend/IMPLEMENTATION_SUMMARY.md) - Architecture overview
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute

### 🐛 Fixes & Solutions
- [Booking Fee Fixes](./docs/fixes/BOOKING_FEE_COMPLETE_DEBUGGING_SUMMARY.md)
- [Service Type Optimization](./docs/fixes/SERVICE_TYPE_OPTIMIZATION.md)
- [Pricing Model Updates](./docs/features/PRICING_MODEL_UPDATE.md)

### 🚀 Deployment
- [VPS Deployment Guide](./docs/deployment/VPS_DEPLOYMENT.md) - Production VPS deployment
- [CI/CD Strategy](./docs/CI_CD_STRATEGY.md) - Full CI/CD pipeline details
- [Docker Deployment Guide](./docs/deployment/DOCKER_DEPLOYMENT.md) - Local Docker setup

## 💻 Development

### Prerequisites
- Node.js 18+ and npm
- MongoDB 7.0+
- Redis (optional, for caching)
- M-Pesa Developer Account

### Local Development

#### Backend
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Seed pricing data
npm run seed:pricing

# Start development server
npm run dev
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Start development server
npm run dev
```

### Docker Development
```bash
# One command to start everything
./scripts/docker-dev.sh

# Or manually
docker-compose up -d
docker-compose logs -f
```

### Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Production (VPS)

The app is deployed on a VPS with zero-downtime blue-green deployments via GitHub Actions.

**Production URLs:**
- **Frontend:** [https://dumuwaks.ementech.co.ke](https://dumuwaks.ementech.co.ke)
- **API:** [https://api.ementech.co.ke](https://api.ementech.co.ke)
- **Health Check:** [https://api.ementech.co.ke/api/v1/health](https://api.ementech.co.ke/api/v1/health)

**Infrastructure:**
- Ubuntu 24.04 VPS with PM2 + Nginx
- SSL via Let's Encrypt
- GitHub Actions CI/CD pipeline
- Automated rollback on health check failure

Pushing to `master` triggers automatic deployment.

📖 **Full guide**: [VPS Deployment Guide](./docs/deployment/VPS_DEPLOYMENT.md) | [CI/CD Strategy](./docs/CI_CD_STRATEGY.md)

### Local Development (Docker)

1. **Configure environment:**
```bash
cp .env.docker.example .env.docker
nano .env.docker  # Set development values
```

2. **Start services:**
```bash
./scripts/docker-dev.sh
```

3. **Verify:**
```bash
docker-compose ps
docker-compose logs -f
```

📖 **Full guide**: [Docker Deployment Guide](./docs/deployment/DOCKER_DEPLOYMENT.md)

## 🔐 Security

- JWT authentication with secure token storage
- Password hashing with bcrypt
- Environment variable protection
- Rate limiting on sensitive endpoints
- CORS configuration
- Input validation and sanitization
- Secure M-Pesa API integration
- Document encryption for sensitive data

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **Backend Development:** Full-stack API with Node.js/Express
- **Frontend Development:** React/TypeScript SPA
- **DevOps:** Docker containerization and deployment

## 🙏 Acknowledgments

- M-Pesa Daraja API for payment integration
- MongoDB for database
- React and TypeScript communities
- All contributors and testers

## 📞 Support

- **Documentation:** See [docs/](./docs/) folder
- **Issues:** GitHub Issues

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [x] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] SMS notifications via Africa's Talking
- [ ] Automated testing suite (Jest + React Testing Library)
- [ ] Performance monitoring (New Relic/Sentry)
- [x] CI/CD pipeline (GitHub Actions)
- [ ] Enhanced technician verification (KYC)
- [ ] Video consultations (Agora integration)

---

<div align="center">
  <p><strong>Built with ❤️ in Kenya</strong></p>
  <p>Connecting skilled technicians with customers who need them</p>
  <img src="./frontend/public/images/logo-medium.png" alt="Dumu Waks" width="100"/>
</div>
