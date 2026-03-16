# ENGSE207 Software Architecture
## README — Final Lab Set 2: Microservices Scale-Up + Cloud Deployment (Railway)

---

## 1. ข้อมูลรายวิชาและสมาชิก

**รายวิชา:** ENGSE207 Software Architecture
**งาน:** Final Lab ชุดที่ 2

| รหัสนักศึกษา | ชื่อ-สกุล | รับผิดชอบ |
|---|---|---|
| 67543210032 | นายวรรธนะ คำมาลัย | Auth Service + Deploy Auth |
| 67543210008 | นายณัฐพงศ์ จินะปัญญา | Task/User Service + Gateway + Docs |

---

## 2. Service URLs บน Railway

| Service | URL |
|---|---|
| auth-service | `https://[AUTH_URL].up.railway.app` |
| task-service | `https://[TASK_URL].up.railway.app` |
| user-service | `https://[USER_URL].up.railway.app` |

> แก้ไข URL จริงหลัง deploy เสร็จ

---

## 3. ภาพรวม — Set 2 ต่อยอดจาก Set 1 อย่างไร

| ประเด็น | Set 1 | Set 2 |
|---|---|---|
| จำนวน Services | 2 (auth, task) + log | 3 (auth, task, user) |
| Database | Shared DB เดียว | Database-per-Service (3 DBs) |
| Register | ไม่มี ใช้ Seed Users | มี `POST /api/auth/register` |
| User Profile | ไม่มี | User Service + `user_profiles` table |
| Deployment | Local Docker เท่านั้น | Railway Cloud |
| Logging | Log Service (separate container) | แต่ละ service log ลง DB ของตัวเอง |

---

## 4. Architecture (Cloud Version)

```
Internet / Browser / Postman
         │
         │  Gateway Strategy: Option A
         │  (Frontend เรียก URL แต่ละ service โดยตรง)
         │
    ┌────┴────────────────────────────────────┐
    │                                         │
    ▼                                         ▼
AUTH_URL                               TASK_URL / USER_URL
    │                                         │
    ▼                                         ▼
┌──────────────┐    JWT_SECRET      ┌──────────────────────────────┐
│ Auth Service │ ←── shared ──────→ │ Task Service │ User Service  │
│   PORT 3001  │                    │   PORT 3002  │   PORT 3003   │
└──────┬───────┘                    └──────┬───────┴───────┬────────┘
       │                                   │               │
       ▼                                   ▼               ▼
 ┌──────────┐                       ┌──────────┐    ┌──────────┐
 │ auth-db  │                       │ task-db  │    │ user-db  │
 │ users    │                       │ tasks    │    │profiles  │
 │ logs     │                       │ logs     │    │ logs     │
 └──────────┘                       └──────────┘    └──────────┘

JWT Payload: { sub: user.id, email, username, role }
user_id ใน task-db และ user-db เป็น logical reference ไปยัง auth-db.users.id
```

---

## 5. DB Schema

### auth-db
- `users` — id, username, email, password_hash, role, created_at, last_login
- `logs` — id, level, event, user_id, message, meta, created_at

### task-db
- `tasks` — id, user_id, title, description, status, priority, created_at, updated_at
- `logs` — id, level, event, user_id, message, meta, created_at

### user-db
- `user_profiles` — id, user_id, username, email, role, display_name, bio, avatar_url, updated_at
- `logs` — id, level, event, user_id, message, meta, created_at

---

## 6. Gateway Strategy

**เลือก Option A** — Frontend เรียก URL ของแต่ละ service โดยตรง

**เหตุผล:**
- ลด complexity ในการ deploy ไม่ต้องตั้งค่า Nginx เพิ่ม
- เหมาะกับงานสอบที่เวลาจำกัด
- แต่ละ service มี CORS เปิดไว้ frontend เรียกได้โดยตรง

**Trade-offs:**
- Frontend ต้องรู้ URL ของทุก service (จัดการผ่าน `config.js`)
- ไม่มี single entry point เหมือน production จริง

---

## 7. API Summary

### Auth Service
| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| POST | /api/auth/register | ❌ | สมัครสมาชิก |
| POST | /api/auth/login | ❌ | Login รับ JWT |
| GET | /api/auth/verify | ❌ | ตรวจสอบ token |
| GET | /api/auth/me | ✅ JWT | ดูข้อมูล user |
| GET | /api/auth/health | ❌ | Health check |

### Task Service
| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| GET | /api/tasks/health | ❌ | Health check |
| GET | /api/tasks | ✅ JWT | ดู tasks (admin เห็นทั้งหมด) |
| POST | /api/tasks | ✅ JWT | สร้าง task |
| PUT | /api/tasks/:id | ✅ JWT | แก้ไข task |
| DELETE | /api/tasks/:id | ✅ JWT | ลบ task |

### User Service
| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| GET | /api/users/health | ❌ | Health check |
| GET | /api/users/me | ✅ JWT | ดู profile (auto-create ถ้าไม่มี) |
| PUT | /api/users/me | ✅ JWT | แก้ไข profile |
| GET | /api/users | ✅ JWT + Admin | ดูรายชื่อ user ทั้งหมด |

---

## 8. วิธีรัน Local ด้วย Docker Compose

```bash
# 1. Clone repo
git clone https://github.com/[USERNAME]/engse207-final-lab2-67543210032-67543210008
cd engse207-final-lab2-67543210032-67543210008

# 2. สร้าง .env
cp .env.example .env

# 3. ล้าง volume เก่า (ถ้ามี) แล้ว build ใหม่
docker compose down -v
docker compose up --build

# 4. ทดสอบ health
curl http://localhost:3001/api/auth/health
curl http://localhost:3002/api/tasks/health
curl http://localhost:3003/api/users/health
```

---

## 9. วิธี Deploy บน Railway

1. สร้าง project ใหม่บน Railway
2. Add service จาก GitHub สำหรับแต่ละ service (`auth-service`, `task-service`, `user-service`)
3. เพิ่ม PostgreSQL plugin สำหรับแต่ละ service (`auth-db`, `task-db`, `user-db`)
4. ตั้ง Environment Variables (ดูหัวข้อถัดไป)
5. Deploy และตรวจ logs

---

## 10. Environment Variables บน Railway

### auth-service
```
DATABASE_URL=${{auth-db.DATABASE_URL}}
JWT_SECRET=engse207-shared-secret-set2
JWT_EXPIRES_IN=1h
PORT=3001
NODE_ENV=production
```

### task-service
```
DATABASE_URL=${{task-db.DATABASE_URL}}
JWT_SECRET=engse207-shared-secret-set2
PORT=3002
NODE_ENV=production
```

### user-service
```
DATABASE_URL=${{user-db.DATABASE_URL}}
JWT_SECRET=engse207-shared-secret-set2
PORT=3003
NODE_ENV=production
```

> ⚠️ `JWT_SECRET` ต้องเหมือนกันทุก service

---

## 11. วิธีทดสอบด้วย curl (บน Cloud)

```bash
# แทน [AUTH_URL], [TASK_URL], [USER_URL] ด้วย URL จริงจาก Railway

# Register
curl -X POST https://[AUTH_URL]/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"testuser@example.com","password":"123456"}'

# Login → เก็บ token
TOKEN=$(curl -s -X POST https://[AUTH_URL]/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"123456"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Auth Me
curl https://[AUTH_URL]/api/auth/me -H "Authorization: Bearer $TOKEN"

# Get Profile (auto-create ถ้าไม่มี)
curl https://[USER_URL]/api/users/me -H "Authorization: Bearer $TOKEN"

# Update Profile
curl -X PUT https://[USER_URL]/api/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"display_name":"Test User","bio":"Hello from Set 2"}'

# Create Task
curl -X POST https://[TASK_URL]/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My first cloud task","priority":"high"}'

# Get Tasks
curl https://[TASK_URL]/api/tasks -H "Authorization: Bearer $TOKEN"

# Test 401 (ไม่มี JWT)
curl https://[TASK_URL]/api/tasks

# Admin token
ADMIN_TOKEN=$(curl -s -X POST https://[AUTH_URL]/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lab.local","password":"adminpass"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Test admin-only (GET /api/users)
curl https://[USER_URL]/api/users -H "Authorization: Bearer $ADMIN_TOKEN"

# Test 403 (member เรียก admin endpoint)
curl https://[USER_URL]/api/users -H "Authorization: Bearer $TOKEN"
```

---

## 12. Known Limitations

- ไม่มี foreign key ข้าม database — `user_id` ใน `task-db` และ `user-db` เป็น logical reference ไปยัง `auth-db.users.id` เท่านั้น
- ถ้า user ถูกลบออกจาก auth-db ข้อมูลใน task-db และ user-db จะไม่ถูกลบตาม (ไม่มี cascade)
- user_profiles sync แบบ manual ไม่มี event notification ระหว่าง services
- ใช้ Gateway Option A ซึ่ง frontend ต้องรู้ URL ทุก service ไม่มี single entry point

---

## 13. Screenshots

| ไฟล์ | รายการ |
|---|---|
| 01_railway_dashboard.png | Railway dashboard แสดง 3 services + 3 databases active |
| 02_auth_register_cloud.png | POST /api/auth/register → 201 |
| 03_auth_login_cloud.png | POST /api/auth/login → JWT token |
| 04_auth_me_cloud.png | GET /api/auth/me → user object |
| 05_user_me_cloud.png | GET /api/users/me → profile (auto-created) |
| 06_user_update_cloud.png | PUT /api/users/me → updated profile |
| 07_task_create_cloud.png | POST /api/tasks → 201 |
| 08_task_list_cloud.png | GET /api/tasks → task list |
| 09_protected_401_check.png | GET /api/tasks ไม่มี JWT → 401 |
| 10_member_forbidden_403.png | member GET /api/users → 403 |
| 11_admin_users_success.png | admin GET /api/users → 200 |
| 12_readme_architecture.png | README ส่วน architecture |
