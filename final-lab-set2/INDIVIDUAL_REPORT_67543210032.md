# INDIVIDUAL REPORT — 67543210032

**ชื่อ:** นายวรรธนะ คำมาลัย
**รหัสนักศึกษา:** 67543210032
**รายวิชา:** ENGSE207 Software Architecture
**งาน:** Final Lab ชุดที่ 2

---

## 1. ส่วนที่รับผิดชอบ

รับผิดชอบ Auth Service ทั้งหมด ตั้งแต่การพัฒนาโค้ดไปจนถึงการ deploy บน Railway

---

## 2. สิ่งที่ลงมือทำจริง

### 2.1 เพิ่ม Register API
ใน Set 1 ระบบใช้เฉพาะ Seed Users และไม่มี register จึงต้องเพิ่ม `POST /api/auth/register` โดยมีการตรวจสอบ duplicate username/email, hash password ด้วย bcrypt และ insert ลง `auth-db`

### 2.2 แยก init.sql ออกจาก shared DB
Set 1 ใช้ฐานข้อมูลร่วมกันทุก service ใน Set 2 ย้ายตาราง `users` และ `logs` มาอยู่ใน `auth-db` เพียงอย่างเดียว โดยตาราง `tasks` และ `user_profiles` แยกออกไปอยู่ใน `task-db` และ `user-db` ตามลำดับ

### 2.3 รองรับ DATABASE_URL สำหรับ Railway
แก้ `db.js` ให้ตรวจสอบว่ามี `DATABASE_URL` หรือไม่ ถ้ามีใช้ connection string โดยตรง (Railway inject ให้อัตโนมัติ) ถ้าไม่มีจึง fallback ไปใช้ individual env vars สำหรับ local

### 2.4 เพิ่ม initDB() สำหรับ Railway
เนื่องจาก Railway ไม่ mount volume เหมือน Docker ท้องถิ่น จึงเพิ่มฟังก์ชัน `initDB()` ที่อ่าน `init.sql` และรันตอน startup เพื่อสร้าง schema อัตโนมัติ

### 2.5 Deploy บน Railway
- สร้าง Railway project
- เพิ่ม PostgreSQL plugin สำหรับ `auth-db`
- ตั้งค่า environment variables โดยเฉพาะ `JWT_SECRET` ที่ต้องตรงกับทุก service
- ตรวจสอบ deploy logs และทดสอบ endpoints

---

## 3. ปัญหาที่พบและวิธีแก้

**ปัญหา:** bcrypt hash ของ seed users ใน init.sql ไม่ตรงกับ password จริง
**แก้:** generate hash ใหม่ด้วย `node -e "const b=require('bcryptjs'); console.log(b.hashSync('alice123',10))"`

**ปัญหา:** Railway ไม่รัน init.sql อัตโนมัติเหมือน Docker volume mount
**แก้:** เพิ่ม `initDB()` ใน index.js ที่อ่านและรัน init.sql ตอน service เริ่มต้น

---

## 4. สิ่งที่เรียนรู้เชิงสถาปัตยกรรม

- **Database-per-Service** ทำให้แต่ละ service เป็นเจ้าของข้อมูลของตัวเองอย่างแท้จริง ไม่มี schema coupling ข้ามกัน
- **JWT เป็น stateless token** ทำให้ task-service และ user-service ไม่ต้อง query `auth-db` เลย แค่ verify ด้วย `JWT_SECRET` เดียวกันก็เพียงพอ
- **logical reference ผ่าน user_id** ใช้แทน foreign key ข้าม database ซึ่งเป็นแนวทางมาตรฐานใน microservices

---

## 5. ส่วนที่ยังไม่สมบูรณ์หรืออยากปรับปรุง

- ยังไม่มี refresh token mechanism — JWT หมดอายุแล้วต้อง login ใหม่ทุกครั้ง
- อยากเพิ่ม email format validation ใน register
- Logging ยังเป็นแบบ write-to-own-db ไม่ได้รวมไปที่ centralized log service
