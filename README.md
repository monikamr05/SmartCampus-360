# 🎓 Smart Campus 360

**Smart Campus 360** is a full-stack digital campus management platform built for students, faculty, and administrators. It unifies academics, attendance, library, events, analytics, and notifications into a single, role-aware application.

---

## 📸 Project Overview

| Role | Dashboard | Key Capabilities |
|------|-----------|-----------------|
| 🛡️ **Admin** | `/dashboard/admin` | Manage students, faculty, courses, departments, timetables, attendance, exams, events, library, analytics, announcements |
| 🧑‍🏫 **Faculty** | `/dashboard/faculty` | View assigned courses, mark attendance, enter marks, manage assignments, view class analytics, post announcements |
| 🎓 **Student** | `/dashboard/student` | View results, attendance predictions, timetable, assignments, events, library catalog, notifications, personal analytics |

---

## ✨ Feature Highlights

### 🔐 Authentication & Access Control
- JWT-based authentication with bcrypt password hashing
- Role-based access: Admin / Faculty / Student
- Protected routes — unauthorized users are redirected to login
- Token stored in `localStorage`, verified on every session start
- Auto-logout on token expiry (401 response interceptor)

### 👥 Admin Dashboard
- Full CRUD for Students, Faculty, Departments, Courses
- Paginated tables with search, sort, and filter
- Timetable management — create weekly slot schedules with conflict detection (room + course overlap)
- Attendance management — bulk mark attendance, view shortage students, attendance bar charts
- Examination management — enter internal marks, auto-calculate grades (A+→F), publish results
- **Smart Analytics** — attendance shortage predictions with best/worst-case modeling, academic at-risk identification
- Event management — create events, track registrations, mark attendance
- Library management — book catalog CRUD, issue/return with overdue fine calculation
- Announcement management with priority and audience targeting
- Admin notification broadcast with generate-alerts for attendance, assignments, and events

### 🧑‍🏫 Faculty Dashboard
- View assigned courses and enrolled students
- Mark/update daily attendance with duplicate-entry prevention
- Inline marks entry with live grade preview
- Assignment CRUD + grade individual submissions
- Class performance analytics — grade distribution charts, top performers, at-risk table
- Attendance shortage prediction per student per course
- Post and manage announcements

### 🎓 Student Dashboard
- Personal overview: GPA, attendance ring, upcoming events, pending assignments
- Subject-wise attendance with shortage prediction (best/worst case, classes needed)
- Exam results — semester tabs, internal marks breakdown, stacked bar + radar charts
- Weekly timetable with day tabs, slot type color-coding
- Assignment list with expandable submission details
- Event browsing with one-click registration and "My Registrations" tab
- Library catalog search and "My Issued Books" with overdue status
- Notifications center with read/unread management
- Personal analytics — GPA trend, attendance trend, weak subject detection

### 🔔 Notifications
- Real-time unread badge on bell icon in all topbars
- Auto-generated alerts: attendance shortage, assignment deadlines, event reminders
- Admin broadcast to all users or by role
- Expandable dropdown panel with mark-all-read and deep-link routing

### 🔍 Global Search
- Debounced search bar in every dashboard topbar
- Searches across students, courses, events, and books simultaneously
- Results categorized by type with icons and direct navigation links

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | UI framework |
| Vite | 5.3.1 | Build tool & dev server |
| React Router DOM | 6.24.0 | Client-side routing |
| Axios | 1.7.2 | HTTP client with interceptors |
| Recharts | 2.12.7 | Data visualization (charts) |
| CSS Modules (custom) | — | Component-scoped styling |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | ≥ 18 | Runtime |
| Express | 4.19.2 | REST API framework |
| Mongoose | 8.4.1 | MongoDB ODM |
| bcryptjs | 2.4.3 | Password hashing |
| jsonwebtoken | 9.0.2 | JWT auth tokens |
| dotenv | 16.4.5 | Environment config |
| cors | 2.8.5 | Cross-origin resource sharing |
| nodemon | 3.1.3 | Dev auto-reload |

### Database
| Technology | Purpose |
|-----------|---------|
| MongoDB (Atlas) | Primary database — documents, relationships |

---

## 📁 Project Structure

```
SmartCampus/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                   # MongoDB connection
│   │   ├── controllers/                # Business logic (15 files)
│   │   │   ├── authController.js
│   │   │   ├── statsController.js
│   │   │   ├── studentController.js
│   │   │   ├── facultyController.js
│   │   │   ├── departmentController.js
│   │   │   ├── courseController.js
│   │   │   ├── announcementController.js
│   │   │   ├── timetableController.js
│   │   │   ├── academicController.js
│   │   │   ├── analyticsController.js
│   │   │   ├── eventController.js
│   │   │   ├── libraryController.js
│   │   │   ├── notificationController.js
│   │   │   ├── studentDashboardController.js
│   │   │   └── facultyDashboardController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js        # JWT protect
│   │   │   └── roleMiddleware.js        # requireRole()
│   │   ├── models/                      # Mongoose schemas (14 files)
│   │   │   ├── User.js
│   │   │   ├── StudentProfile.js
│   │   │   ├── FacultyProfile.js
│   │   │   ├── Department.js
│   │   │   ├── Course.js
│   │   │   ├── SubjectAttendance.js
│   │   │   ├── ExamResult.js
│   │   │   ├── Assignment.js
│   │   │   ├── Timetable.js
│   │   │   ├── Announcement.js
│   │   │   ├── Activity.js
│   │   │   ├── Event.js
│   │   │   ├── Book.js
│   │   │   └── Notification.js
│   │   ├── routes/                      # Express routers (9 files)
│   │   │   ├── authRoutes.js
│   │   │   ├── adminRoutes.js
│   │   │   ├── studentRoutes.js
│   │   │   ├── facultyRoutes.js
│   │   │   ├── academicRoutes.js
│   │   │   ├── analyticsRoutes.js
│   │   │   ├── eventsRoutes.js
│   │   │   ├── libraryRoutes.js
│   │   │   └── notificationRoutes.js
│   │   └── server.js
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── render.yaml
│
└── frontend/
    ├── public/
    │   └── favicon.svg
    ├── src/
    │   ├── components/                  # Reusable UI components
    │   │   ├── Navbar.jsx / .css
    │   │   ├── Hero.jsx / .css
    │   │   ├── Features.jsx / .css
    │   │   ├── Testimonials.jsx / .css
    │   │   ├── Footer.jsx / .css
    │   │   ├── NotificationBell.jsx / .css
    │   │   └── GlobalSearch.jsx / .css
    │   ├── context/
    │   │   └── AuthContext.jsx          # Auth state, login/logout/register
    │   ├── pages/
    │   │   ├── Home.jsx / About.jsx / FeaturesPage.jsx / Login.jsx / NotFound.jsx
    │   │   └── dashboards/
    │   │       ├── admin/              # 13 pages + shared styles
    │   │       ├── faculty/            # 9 pages
    │   │       └── student/            # 11 pages
    │   ├── routes/
    │   │   ├── PrivateRoute.jsx        # Redirect unauthenticated users
    │   │   └── RoleRoute.jsx           # Redirect wrong-role users
    │   ├── services/
    │   │   └── api.js                  # Axios instance + interceptors
    │   └── styles/
    │       ├── index.css               # Design system (CSS variables)
    │       └── App.css
    ├── .env.example
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── vercel.json
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js** v18 or later — [download](https://nodejs.org)
- **MongoDB** running locally **or** a free [MongoDB Atlas](https://cloud.mongodb.com) cluster
- **Git** — [download](https://git-scm.com)

### 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/SmartCampus360.git
cd SmartCampus360
```

### 2 — Set up the Backend

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Open `backend/.env` and set:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/smartcampus360
JWT_SECRET=your_very_long_random_secret_here
FRONTEND_URL=http://localhost:5173
```

> **MongoDB Atlas (recommended for deployment)**
> Replace `MONGO_URI` with your Atlas connection string:
> `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/smartcampus360?retryWrites=true&w=majority`

```bash
# Start the backend in development mode (auto-reload)
npm run dev
# → Server running on http://localhost:5000
```

### 3 — Set up the Frontend

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
# → App running on http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:5000` automatically — no extra configuration needed.

### 4 — Create your first admin account

1. Open [http://localhost:5173](http://localhost:5173)
2. Click **Get Started** → **Create Account**
3. Enter your name, email, password, and select **Administrator**
4. You will be redirected to `/dashboard/admin`

---

## 🌐 Deployment

### Frontend → Vercel

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `VITE_API_BASE_URL` = `https://your-backend.onrender.com`
5. Deploy — `vercel.json` handles SPA routing automatically

### Backend → Render

1. Go to [render.com](https://render.com) → **New Web Service** → connect repo
2. Set **Root Directory** to `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables in Render dashboard:
   - `NODE_ENV` = `production`
   - `MONGO_URI` = *(Atlas connection string)*
   - `JWT_SECRET` = *(strong random string)*
   - `FRONTEND_URL` = `https://your-app.vercel.app`
6. Deploy — `render.yaml` pre-configures all settings

### Database → MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user and get the connection string
3. Add `0.0.0.0/0` to Network Access (allow all IPs) for Render
4. Paste the connection string as `MONGO_URI` in Render

---

## 🔑 API Reference

All API routes are prefixed with `/api`.

| Prefix | Roles | Description |
|--------|-------|-------------|
| `/api/auth` | Public | Register, Login, Profile |
| `/api/admin` | Admin | Student/Faculty/Course/Department CRUD |
| `/api/student` | Student | Personal dashboard data |
| `/api/faculty` | Faculty | Course management, marks, assignments |
| `/api/academic` | Admin, Faculty | Timetable, attendance, exams |
| `/api/analytics` | Admin, Faculty, Student | Attendance predictions, academic insights |
| `/api/events` | All | Event listing; Admin CRUD; Student register |
| `/api/library` | All | Book catalog; Admin issue/return |
| `/api/notifications` | All | Personal notifications, global search |

**Health check:** `GET /api/health` → `{ "status": "ok", "uptime": … }`

---

## 🔐 Role-Based Access Summary

| Feature | Admin | Faculty | Student |
|---------|:-----:|:-------:|:-------:|
| View dashboard | ✅ | ✅ | ✅ |
| Manage students/faculty | ✅ | — | — |
| Mark attendance | ✅ | ✅ (own courses) | — |
| Enter exam marks | ✅ | ✅ (own courses) | — |
| View own marks | — | — | ✅ |
| Create events | ✅ | — | — |
| Register for events | — | — | ✅ |
| Issue/return books | ✅ | — | — |
| View library | ✅ | ✅ | ✅ |
| Analytics | ✅ (all) | ✅ (own courses) | ✅ (self) |
| Broadcast notifications | ✅ | — | — |
| Post announcements | ✅ | ✅ | — |

---

## 📊 Analytics — Attendance Prediction Method

The attendance shortage prediction uses the following formula:

```
futureTotalClasses  = classesHeld + remainingClasses
minRequired         = ceil(0.75 × futureTotalClasses)
classesNeededMore   = max(0, minRequired − attended)
canReachThreshold   = classesNeededMore ≤ remainingClasses
bestCasePct         = (attended + remaining) / futureTotalClasses × 100
worstCasePct        = attended / futureTotalClasses × 100
```

> ⚠️ **Disclaimer:** Predictions are statistical estimates based on current attendance data and an assumed number of remaining classes. They are not guaranteed outcomes and may change with schedule updates.

---

## 🧪 Running Tests

The project does not include automated tests at this stage. To verify functionality manually:

1. Start both servers as described above
2. Register accounts for each role (admin, faculty, student)
3. Use the Admin dashboard to create departments, courses, and assign profiles
4. Test each dashboard feature end-to-end

---

## 🎨 Design System

The frontend uses a custom CSS design system defined in `frontend/src/styles/index.css`:

- **Colors:** Blue (`--blue-*`), Purple (`--purple-*`), neutral grays
- **Typography:** Inter (body) + Poppins (headings) via Google Fonts
- **Tokens:** `--primary`, `--secondary`, `--border`, shadows, radii, transitions
- **Dashboard accents:** Admin = Blue/Purple · Faculty = Amber/Orange · Student = Green/Teal

---

## 📄 License

This project is submitted as an academic capstone project. All rights reserved by the author.

---

## 👨‍💻 Author

**Smart Campus 360** — built as a full-stack capstone project demonstrating end-to-end web application development with React, Node.js, Express, and MongoDB.

---

*Built with ❤️ for the future of education*
