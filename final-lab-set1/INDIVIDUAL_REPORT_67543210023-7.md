# INDIVIDUAL_REPORT_[studentid].md

## ข้อมูลผู้จัดทำ
- ชื่อ-นามสกุล: นายวรรธนะ คำมาลัย
- รหัสนักศึกษา: 67543210023-7
- กลุ่ม: SEC1 GROUP10

## ขอบเขตงานที่รับผิดชอบ
- Database Schema และ Seed Users (`db/init.sql`)
- Auth Service (`auth-service/`) ทั้งหมด
- Nginx API Gateway พร้อม HTTPS (`nginx/`)
- Docker Compose และ Environment Config (`docker-compose.yml`, `.env.example`)
- Self-signed Certificate Script (`scripts/gen-certs.sh`)

## สิ่งที่ได้ดำเนินการด้วยตนเอง

**Database Schema**
ออกแบบและเขียน `db/init.sql` ครอบคลุม 3 tables ได้แก่ `users`, `tasks` และ `logs`
พร้อม index สำหรับ logs table และ seed users ทั้ง 3 บัญชี
โดยต้องสร้าง bcrypt hash จริงด้วยคำสั่ง `node -e` แทน placeholder ก่อน import

**Auth Service**
- เขียน `POST /api/auth/login` พร้อม timing-safe compare
  โดยใช้ `DUMMY_BCRYPT_HASH` กรณีที่ไม่พบ user เพื่อป้องกัน timing attack
- เขียน `GET /api/auth/verify`, `/me`, `/health`
- เพิ่ม `logEvent()` helper สำหรับส่ง log ไปยัง Log Service
  แบบ fire-and-forget เพื่อไม่ให้กระทบ login flow หาก Log Service ไม่ตอบสนอง
- ตั้งค่า DB connection ให้ชี้ไปที่ shared PostgreSQL container

**Nginx + HTTPS**
- เขียน `nginx.conf` ตั้งค่า TLS termination ด้วย Self-signed Certificate
- ตั้งค่า HTTP → HTTPS redirect (port 80 → 443)
- ตั้งค่า rate limiting แยก zone สำหรับ login (5r/m) และ API ทั่วไป (30r/m)
- บล็อก `/api/logs/internal` จากภายนอกด้วย `return 403`
- เขียน `scripts/gen-certs.sh` สำหรับสร้าง self-signed certificate

**Docker Compose**
- เขียน `docker-compose.yml` รวม 6 services พร้อม network และ healthcheck
- ตั้งค่า `depends_on` ให้ทุก service รอ postgres healthy ก่อนเริ่มทำงาน
- เขียน `.env.example` และ `.gitignore` ให้ครอบ `.env` และ `nginx/certs/*.pem`

## ปัญหาที่พบและวิธีการแก้ไข

**ปัญหาที่ 1: Nginx crash loop เพราะ resolve upstream ไม่ได้ตอน startup**

Nginx พยายาม resolve ชื่อ `auth-service` ตั้งแต่ตอน startup แต่ service อื่นยังไม่พร้อม
ทำให้เกิด error `host not found in upstream` และ container restart วนซ้ำ
แก้ไขโดยเปลี่ยน `depends_on` ของ nginx ให้ใช้ `condition: service_started`
แทนการระบุชื่อ service เฉยๆ เพื่อให้ Docker รอ service อื่น start ก่อน

**ปัญหาที่ 2: bcrypt hash ใน init.sql เป็น placeholder ทำให้ login ไม่ได้**

`db/init.sql` ตัวอย่างในโจทย์ใช้ค่า `$2b$10$REPLACE_WITH_HASH_FOR_alice123`
ซึ่งไม่ใช่ hash จริง ทำให้ `bcrypt.compare()` คืนค่า false เสมอ
แก้ไขโดยรันคำสั่ง `node -e "const b=require('bcryptjs'); console.log(b.hashSync('alice123',10))"`
สำหรับแต่ละ user แล้วแทนค่า hash จริงลงใน INSERT statement ก่อน build

## สิ่งที่ได้เรียนรู้จากงานนี้

**เชิงเทคนิค**
- การทำ TLS termination ที่ Nginx ทำให้ service ภายในสื่อสารกันด้วย HTTP ได้
  โดยไม่ต้องจัดการ certificate ใน service แต่ละตัว
- Timing attack ใน login flow คือการที่ผู้โจมตีวัดเวลา response เพื่อเดาว่า email มีอยู่จริงหรือไม่
  การใช้ `DUMMY_BCRYPT_HASH` ทำให้เวลาประมวลผลเท่ากันทั้งกรณีพบและไม่พบ user
- Rate limiting ที่ Nginx ช่วยป้องกัน brute force ได้โดยไม่ต้องเพิ่ม logic ใน service

**เชิงสถาปัตยกรรม**
- Shared database ทำให้ deploy ง่ายและ query ข้าม service ได้สะดวก
  แต่มี trade-off คือ service ทุกตัว coupled กับ schema เดียวกัน
  หาก schema เปลี่ยน ทุก service ได้รับผลกระทบพร้อมกัน
- การแยก Log Service ออกมาเป็น service ต่างหากทำให้ service อื่น
  ส่ง log แบบ fire-and-forget ได้โดยไม่ต้องรอการตอบสนอง

## แนวทางการพัฒนาต่อไปใน Set 2

- แยก database ให้แต่ละ service มี DB เป็นของตัวเอง (Database per Service pattern)
  เพื่อลด coupling และให้ scale ได้อิสระ
- เปลี่ยนจาก Self-signed Certificate เป็น Certificate จาก CA จริง
  หรือใช้ Let's Encrypt สำหรับ production
- เพิ่ม refresh token mechanism ใน Auth Service
  เพื่อให้ผู้ใช้ไม่ต้อง login ใหม่เมื่อ access token หมดอายุ
- พิจารณาแยก Log Service ออกเป็น async queue เช่น RabbitMQ
  เพื่อรองรับ log volume สูงโดยไม่กระทบ response time ของ service หลัก