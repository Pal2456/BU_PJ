const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',           // ✅ ใส่ username ตรงนี้
  password: 'root',       // ✅ ถ้าไม่มีรหัสผ่าน ให้ใส่เป็น '' (ว่าง)
  database: 'dbforpj',     // ✅ ตรวจชื่อให้ตรงกับที่ import เข้า phpMyAdmin
  port: 3000,           // ✅ ถ้าใช้ port อื่นให้เปลี่ยนตรงนี้
});

module.exports = db;
