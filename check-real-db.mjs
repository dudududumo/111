import { db, userDb } from "./database/db.js";

console.log("=== 检查实际使用的数据库 ===");

console.log("数据库文件路径:", db.name);

console.log("\n所有用户:");
const users = db.prepare('SELECT id, email, display_name, gender, phone, department, grade, teaching_experience FROM users').all();
console.log(users);

console.log("\n查找张老师:");
const teacher1 = userDb.findByEmail('teacher1@school.com');
console.log(teacher1);