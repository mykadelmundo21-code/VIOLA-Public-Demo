# VIOLA • An Intelligent Student Violation Monitoring

VIOLA is a web-based Student Guidance and Violation Management System designed to help schools manage student records, violations, interventions, assessments, and communication between school personnel and parents.

The system provides role-based features for Guidance personnel, Teachers, and Parents.

> **Portfolio Project**
>
> This repository is a public portfolio/demo version of the VIOLA system. Sensitive credentials, environment files, generated files, and local dependencies are excluded from the repository.

---

## ✨ Features

### 🔐 Authentication & Account Management

- User login and logout
- Role-based access
- Password change
- Password reset using verification codes
- Account management

### 👩‍💼 Guidance Management

- Guidance dashboard
- Student management
- Student records
- Violation management
- Violation types
- Student assessments
- Intervention management
- Intervention history
- Archived records
- Reports
- Account management

### 👨‍🏫 Teacher Features

- Teacher dashboard
- View assigned students
- View student records
- Manage and view violation records
- Violation history

### 👨‍👩‍👧 Parent Features

- Parent dashboard
- View student information
- View student violations
- View violation status and updates

### 🔔 Notifications

- User notifications
- Violation status notifications
- Intervention update notifications
- Real-time notification support

### ⚙️ Profile & Settings

- Profile management
- Profile photo
- User preferences
- Account settings

---

## 👥 User Roles

| Role | Main Functions |
|------|----------------|
| Guidance | Manage students, violations, assessments, interventions, accounts, archives, and reports |
| Teacher | View assigned students and manage/view violation records |
| Parent | View student information and violation records |

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS
- Laravel Echo

### Backend

- Laravel
- PHP
- REST API
- Laravel Sanctum
- Laravel Reverb

### Database

- MySQL
- Laravel Migrations

### Development Tools

- Composer
- npm
- Git

---
# Installation
Requirements

Make sure you have:

PHP
Composer
Node.js and npm
MySQL 
Git

1. Clone the Repository
git clone https://github.com/mykadelmundo21-code/VIOLA-Public-Demo.git
cd VIOLA-Public-Demo

2. Backend Setup
Navigate to the Laravel backend:
cd backend

Install PHP dependencies:
composer install

Create your local environment file:
copy .env.example .env

Generate the Laravel application key:
php artisan key:generate

Configure your database and other local settings inside:
backend/.env

Run the database migrations:
php artisan migrate

3. Frontend Setup

Open another terminal and navigate to the frontend:
cd frontend

Install the frontend dependencies:
npm install

Create your local environment file:
frontend/.env

Configure the required Vite and Reverb settings for your local environment.

4. Run the Backend

From the backend directory:
php artisan serve

The Laravel backend will normally be available at:
http://127.0.0.1:8000

5. Run the Frontend
From the frontend directory:
npm run dev

Vite will provide the local frontend development URL.

# 🔒 Security
Sensitive environment files are intentionally excluded from this repository.

The following files should remain local:
backend/.env
frontend/.env

The repository also excludes local dependencies and generated files such as:
vendor/
node_modules/
storage/logs/

# Never commit real:
API keys
Passwords
Database credentials
Access tokens
Private configuration

# System Architecture
React + TypeScript
        │
        │ API Requests
        ▼
Laravel Backend
        │
        ├── Authentication
        ├── Business Logic
        ├── Student Management
        ├── Violation Management
        ├── Intervention Management
        └── Notifications
        │
        ▼
MySQL

Real-time functionality is supported through Laravel Reverb and Laravel Echo.

# Project Purpose

VIOLA was developed as a web-based solution for organizing student guidance and violation-related processes.

The system focuses on:

Centralized student records
Violation tracking
Guidance interventions
Student assessments
Parent access
Teacher access
Notifications
Role-based management

# Portfolio Note

This repository is maintained as a public portfolio/demo version of the VIOLA system.

Production credentials and private environment configuration are not included in this repository.

Some production-specific services and configurations may require additional local environment setup before the complete system can be executed.

👩‍💻 Author

Myka Delmundo

Bachelor of Science in Information Technology

GitHub:
https://github.com/mykadelmundo21-code