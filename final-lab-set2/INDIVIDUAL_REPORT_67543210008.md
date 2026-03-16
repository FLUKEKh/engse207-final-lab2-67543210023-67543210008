# INDIVIDUAL REPORT — 67543210008

**ชื่อ:** นายณัฐพงศ์ จินะปัญญา
**รหัสนักศึกษา:** 67543210008
**รายวิชา:** ENGSE207 Software Architecture
**งาน:** Final Lab ชุดที่ 2

---

## 1. ส่วนที่รับผิดชอบ

รับผิดชอบ Task Service, User Service, docker-compose, Gateway Strategy และเอกสารระดับ project

---

## 2. สิ่งที่ลงมือทำจริง

### 2.1 ปรับ task-service ให้ทำงานกับ task-db แยก
Set 1 task-service ทำ `JOIN users` เพราะอยู่ใน shared DB ใน Set 2 เมื่อแยก DB แล้วจึงต้องตัด JOIN ออกทั้งหมด และใช้ข้อมูล username/role จาก JWT payload แทน เนื่องจาก JWT มี `sub`, `email`, `username`, `role` ครบอยู่แล้ว

### 2.2 สร้าง user-service ใหม่ทั้งหมด
สร้าง service ใหม่จากศูนย์ประกอบด้วย
- `GET /api/users/me` — ดู profile พร้อม auto-create ถ้าผู้ใช้ยังไม่มีข้อมูลใน user-db
- `PUT /api/users/me` — แก้ไข display_name, bio, avatar_url
- `GET /api/users` — admin only แสดง user ทั้งหมดใน user-db
- `GET /api/users/health`

logic สำคัญคือ `getOrCreateProfile()` ที่ตรวจก่อนว่ามี profile ของ user_id นั้นหรือยัง ถ้าไม่มีจะ INSERT ข้อมูลจาก JWT ให้อัตโนมัติ ทำให้ผู้ใช้ที่ register ใหม่แล้ว login สำเร็จสามารถเรียก `GET /api/users/me` ได้ทันทีโดยไม่ error

### 2.3 docker-compose.yml สำหรับ local
สร้าง docker-compose ที่มี 3 services + 3 databases โดยแต่ละ database mount `init.sql` ของตัวเองเข้าไป และใช้ `healthcheck` + `depends_on condition: service_healthy` เพื่อให้ service รอ DB พร้อมก่อนจึงค่อย start

### 2.4 Gateway Strategy (Option A)
เลือก Option A คือ frontend เรียก URL ของแต่ละ service โดยตรง เหตุผลเพราะประหยัดเวลา deploy ไม่ต้อง setup Nginx เพิ่ม และเหมาะกับงานสอบที่ต้องการความเร็ว

### 2.5 Deploy บน Railway
deploy task-service และ user-service พร้อม PostgreSQL plugin ของแต่ละตัว และตั้งค่า `JWT_SECRET` ให้ตรงกันกับ auth-service

---

## 3. ปัญหาที่พบและวิธีแก้

**ปัญหา:** task-service เดิม JOIN กับ users table แต่ใน Set 2 ไม่มี users table ใน task-db
**แก้:** ตัด JOIN ออก และดึง username จาก `req.user.username` ที่ได้จาก JWT แทน

**ปัญหา:** ผู้ใช้ใหม่ที่ register แล้ว เรียก `GET /api/users/me` แล้วไม่เจอข้อมูลใน user-db
**แก้:** เพิ่ม `getOrCreateProfile()` ที่ auto-insert profile เริ่มต้นจาก JWT payload เมื่อยังไม่มี record

**ปัญหา:** docker-compose service start ก่อน DB พร้อม ทำให้ connection ล้มเหลว
**แก้:** เพิ่ม healthcheck ใน postgres services และ `depends_on condition: service_healthy` ใน application services

---

## 4. สิ่งที่เรียนรู้เชิงสถาปัตยกรรม

- **Database-per-Service** ไม่มี foreign key ข้าม database แต่ใช้ user_id เป็น logical reference แทน ซึ่งเป็น trade-off ที่ยอมรับได้เพื่อแลกกับ service independence
- **JWT เป็น self-contained token** ทำให้ user-service ไม่ต้องพึ่ง auth-service ตอน runtime เลย เพียงแค่มี `JWT_SECRET` ค่าเดียวกันก็ verify ได้
- **Gateway Strategy** ส่งผลต่อความซับซ้อนของ frontend และ security ต่างกันมาก Option A เรียบง่ายแต่ frontend ต้องรู้ URL ทุกตัว ส่วน Option B (Nginx) มี single entry point แต่ต้อง maintain config เพิ่ม

---

## 5. ส่วนที่ยังไม่สมบูรณ์หรืออยากปรับปรุง

- อยากเพิ่ม `DELETE /api/users/:id` สำหรับ admin แต่ต้องลบข้ามหลาย DB (auth-db, task-db, user-db) ซึ่งซับซ้อนเกินขอบเขตงานนี้
- user_profiles ใน user-db ยัง sync ข้อมูลแบบ manual (ต้อง PUT ด้วยตัวเอง) อยากให้ auth-service notify user-service เมื่อมีการเปลี่ยนข้อมูล แต่ต้องใช้ event-driven pattern
- Gateway Option A ทำให้ CORS ต้องเปิดทุก service ซึ่งไม่ ideal ในระบบ production จริง
