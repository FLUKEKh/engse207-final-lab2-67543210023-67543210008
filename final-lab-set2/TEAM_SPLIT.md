# TEAM_SPLIT — ENGSE207 Final Lab Set 2

**รายวิชา:** ENGSE207 Software Architecture
**งาน:** Final Lab ชุดที่ 2: Microservices Scale-Up + Cloud Deployment (Railway)

---

## สมาชิกกลุ่ม

| รหัสนักศึกษา | ชื่อ-สกุล |
|---|---|
| 67543210032 | นายวรรธนะ คำมาลัย |
| 67543210008 | นายณัฐพงศ์ จินะปัญญา |

---

## การแบ่งงาน

### 67543210032 — Auth Side

**รับผิดชอบหลัก:**
- `auth-service/` ทั้งหมด
  - เพิ่ม `POST /api/auth/register` (Register API ใหม่)
  - คง `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/verify`, `GET /api/auth/health`
  - แยก `init.sql` สำหรับ `auth-db` โดยเฉพาะ (ไม่ใช้ shared DB แบบ Set 1)
- Deploy `auth-service` + `auth-db` บน Railway
- ตั้งค่า Environment Variables บน Railway สำหรับ auth-service
- ทดสอบ T2, T3, T4 บน Cloud และถ่าย screenshot
- เขียน `INDIVIDUAL_REPORT_67543210032.md`

---

### 67543210008 — Task + User Side

**รับผิดชอบหลัก:**
- `task-service/` — ปรับให้ทำงานกับ `task-db` แยกออกมา (ตัด JOIN กับ users table ออก ใช้ข้อมูลจาก JWT แทน)
- `user-service/` — สร้างใหม่ทั้งหมด
  - `GET /api/users/me` พร้อม auto-create profile เมื่อผู้ใช้ใหม่เรียกครั้งแรก
  - `PUT /api/users/me` แก้ไข profile
  - `GET /api/users` เฉพาะ admin
  - `GET /api/users/health`
- `docker-compose.yml` สำหรับ local testing (3 services + 3 databases)
- `.env.example`
- Deploy `task-service` + `task-db` และ `user-service` + `user-db` บน Railway
- Gateway Strategy (Option A) + `frontend/config.js`
- ทดสอบ T5–T11 บน Cloud และถ่าย screenshot
- เขียน `README.md`, `TEAM_SPLIT.md`
- เขียน `INDIVIDUAL_REPORT_67543210008.md`

---

## งานที่ทำร่วมกัน

- ทดสอบ `docker compose up --build` ครั้งแรกด้วยกัน
- ยืนยัน `JWT_SECRET` ค่าเดียวกันทุก service ก่อน deploy
- screenshot `01_railway_dashboard.png` — dashboard แสดง 3 services + 3 databases active
- screenshot `12_readme_architecture.png`
- Git push รอบสุดท้าย
