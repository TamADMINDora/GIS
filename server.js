const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const path = require("path");

const app = express();
const db = new Database(process.env.DB_PATH || path.join(__dirname, "geolearn.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS questions (
 id INTEGER PRIMARY KEY AUTOINCREMENT, chapter TEXT NOT NULL, topic TEXT NOT NULL DEFAULT '',
 question TEXT NOT NULL, options TEXT NOT NULL, correct_index INTEGER NOT NULL,
 explanation TEXT NOT NULL, difficulty TEXT NOT NULL DEFAULT 'Thông hiểu',
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS attempts (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
 total INTEGER NOT NULL, correct INTEGER NOT NULL, duration_seconds INTEGER NOT NULL,
 answers TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
const seed = [
["Chương 1 · Giới thiệu GIS","Khái niệm GIS","Theo nội dung học tập GIS, hệ thống GIS được sử dụng chủ yếu để giải quyết nhóm vấn đề nào?",["Các vấn đề liên quan đến không gian và vị trí địa lý","Chỉ các phép tính thống kê không gian","Chỉ việc thiết kế bản đồ in","Chỉ lưu trữ văn bản hành chính"],0,"GIS hỗ trợ thu thập, quản lý, phân tích và trình bày thông tin có tham chiếu vị trí; trọng tâm của GIS gắn với không gian và vị trí địa lý.","Nhận biết"],
["Chương 1 · Giới thiệu GIS","Thành phần GIS","Nhóm nào sau đây gồm các thành phần cơ bản thường được trình bày trong mô hình GIS?",["Phần cứng, phần mềm, dữ liệu, con người và phương pháp","Máy tính, máy in và Internet","Bản đồ giấy, la bàn và thước đo","Chỉ phần mềm và dữ liệu"],0,"Năm thành phần phối hợp để GIS hoạt động gồm phần cứng, phần mềm, dữ liệu, con người và phương pháp.","Nhận biết"],
["Chương 2 · Cấu trúc dữ liệu","Raster","Trong mô hình dữ liệu Raster, đối tượng không gian được biểu diễn chủ yếu bằng gì?",["Các ô lưới (pixel)","Các điểm, đường và vùng độc lập","Các bảng quan hệ","Các đường đồng mức dạng văn bản"],0,"Raster tổ chức dữ liệu thành lưới ô; mỗi ô lưu một giá trị mô tả hiện tượng tại vị trí tương ứng.","Nhận biết"],
["Chương 2 · Cấu trúc dữ liệu","Vector","Đặc điểm nào mô tả đúng dữ liệu Vector?",["Biểu diễn đối tượng bằng điểm, đường và vùng","Chỉ gồm pixel có kích thước bằng nhau","Mỗi ô lưới chỉ lưu độ cao","Không thể lưu thông tin thuộc tính"],0,"Vector mô tả đối tượng rời rạc bằng ba dạng hình học cơ bản: điểm, đường và vùng; có thể liên kết với bảng thuộc tính.","Nhận biết"],
["Chương 3 · Mô hình số độ cao","DEM","DEM là mô hình dùng để biểu diễn thông tin nào?",["Độ cao địa hình dưới dạng số","Mật độ dân số","Loại hình sử dụng đất","Ranh giới thửa đất"],0,"DEM (Digital Elevation Model) là mô hình số độ cao, biểu diễn độ cao bề mặt địa hình.","Nhận biết"],
["Chương 4 · Phân tích không gian","Lan truyền","Chức năng lan truyền (Spread) xác định giá trị tại các ô theo nguyên tắc nào?",["Lan truyền từ vị trí nguồn và tích lũy chi phí di chuyển","Chỉ phân loại pixel theo màu sắc","Tính diện tích mọi vùng","Chuyển đổi hệ tọa độ"],0,"Chức năng lan truyền bắt đầu từ vị trí nguồn, lan ra các ô theo hướng di chuyển và cộng dồn chi phí theo mô hình được thiết lập.","Thông hiểu"],
["Chương 4 · Phân tích không gian","Hướng dòng","Trong phân tích hướng dòng chảy dựa trên DEM, dòng chảy thường được mô phỏng theo hướng nào?",["Từ ô cao xuống ô thấp theo địa hình","Từ ô thấp lên ô cao","Theo thứ tự tên pixel","Luôn theo hướng Bắc"],0,"Hướng dòng được xác định dựa trên quan hệ độ cao giữa các ô; dòng chảy mô phỏng xu thế thoát từ cao xuống thấp.","Thông hiểu"],
["Chương 4 · Phân tích không gian","Đường đi chi phí thấp","Kết hợp phân tích lan truyền và truy vết dòng có thể hỗ trợ bài toán nào?",["Tìm đường đi có tổng chi phí di chuyển thấp","Tăng độ phân giải phổ ảnh vệ tinh","Tạo bảng chú giải","Đổi kiểu chữ nhãn"],0,"Phân tích lan truyền tính chi phí tích lũy từ nguồn; bước truy vết có thể xác định tuyến đi theo chi phí đã tính.","Thông hiểu"]
];
const insertQ = db.prepare("INSERT INTO questions(chapter,topic,question,options,correct_index,explanation,difficulty) VALUES(?,?,?,?,?,?,?)");
if (db.prepare("SELECT COUNT(*) n FROM questions").get().n === 0) {
  const tx = db.transaction(rows => rows.forEach(q => insertQ.run(q[0],q[1],q[2],JSON.stringify(q[3]),q[4],q[5],q[6])));
  tx(seed);
}
function setting(name){return process.env[name] || ""}
if (!db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get()) {
  const user = setting("ADMIN_USERNAME"), pass = setting("ADMIN_PASSWORD");
  if (user && pass) db.prepare("INSERT OR IGNORE INTO users(username,password_hash,role) VALUES(?,?,?)").run(user,bcrypt.hashSync(pass,12),"admin");
}
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:"200kb"}));
app.use(session({
 secret: setting("SESSION_SECRET") || "CHANGE_THIS_LONG_RANDOM_SECRET_BEFORE_DEPLOYMENT",
 resave:false, saveUninitialized:false,
 store:new SQLiteStore({db:"sessions.sqlite",dir:process.env.DATA_DIR || __dirname}),
 cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:1000*60*60*8}
}));
const requireAuth=(req,res,next)=>req.session.user?next():res.status(401).json({error:"Vui lòng đăng nhập."});
const requireAdmin=(req,res,next)=>req.session.user?.role==="admin"?next():res.status(403).json({error:"Chỉ quản trị viên được thực hiện thao tác này."});
const cleanUser=u=>({id:u.id,username:u.username,role:u.role});
app.post("/api/login",(req,res)=>{
 const {username,password}=req.body||{};
 if(typeof username!=="string"||typeof password!=="string") return res.status(400).json({error:"Thiếu thông tin đăng nhập."});
 const u=db.prepare("SELECT * FROM users WHERE username=?").get(username.trim());
 if(!u||!bcrypt.compareSync(password,u.password_hash)) return res.status(401).json({error:"Tên đăng nhập hoặc mật khẩu không đúng."});
 req.session.regenerate(err=>{if(err)return res.status(500).json({error:"Không thể tạo phiên đăng nhập."});req.session.user=cleanUser(u);res.json({user:req.session.user});});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json({user:req.session.user||null}));
app.get("/api/questions",requireAuth,(req,res)=>{
 const rows=db.prepare("SELECT id,chapter,topic,question,options,difficulty FROM questions WHERE active=1 ORDER BY chapter,id").all();
 res.json(rows.map(q=>({...q,options:JSON.parse(q.options)})));
});
app.get("/api/admin/questions",requireAuth,requireAdmin,(req,res)=>{
 const rows=db.prepare("SELECT * FROM questions ORDER BY chapter,id").all();
 res.json(rows.map(q=>({...q,options:JSON.parse(q.options)})));
});
app.post("/api/admin/questions",requireAuth,requireAdmin,(req,res)=>{
 const q=req.body||{};
 if(!q.chapter||!q.question||!Array.isArray(q.options)||q.options.length!==4||!Number.isInteger(q.correct_index)||q.correct_index<0||q.correct_index>3||!q.explanation) return res.status(400).json({error:"Cần đủ chương, câu hỏi, 4 lựa chọn, đáp án đúng và giải thích."});
 const args=[q.chapter,q.topic||"",q.question,JSON.stringify(q.options),q.correct_index,q.explanation,q.difficulty||"Thông hiểu"];
 if(q.id){db.prepare("UPDATE questions SET chapter=?,topic=?,question=?,options=?,correct_index=?,explanation=?,difficulty=? WHERE id=?").run(...args,q.id);return res.json({ok:true,id:q.id});}
 const info=db.prepare("INSERT INTO questions(chapter,topic,question,options,correct_index,explanation,difficulty) VALUES(?,?,?,?,?,?,?)").run(...args);
 res.json({ok:true,id:info.lastInsertRowid});
});
app.delete("/api/admin/questions/:id",requireAuth,requireAdmin,(req,res)=>{db.prepare("DELETE FROM questions WHERE id=?").run(req.params.id);res.json({ok:true});});
app.get("/api/admin/users",requireAuth,requireAdmin,(req,res)=>res.json(db.prepare("SELECT id,username,role,created_at FROM users ORDER BY id").all()));
app.post("/api/admin/users",requireAuth,requireAdmin,(req,res)=>{
 const {username,password}=req.body||{};
 if(typeof username!=="string"||! /^[a-zA-Z0-9_.-]{3,32}$/.test(username)||typeof password!=="string"||password.length<10) return res.status(400).json({error:"Tên đăng nhập 3–32 ký tự; mật khẩu tối thiểu 10 ký tự."});
 try{const info=db.prepare("INSERT INTO users(username,password_hash,role) VALUES(?,?, 'student')").run(username,bcrypt.hashSync(password,12));res.json({ok:true,id:info.lastInsertRowid});}
 catch(e){res.status(409).json({error:"Tên đăng nhập đã tồn tại."});}
});
app.delete("/api/admin/users/:id",requireAuth,requireAdmin,(req,res)=>{
 const id=Number(req.params.id); if(id===req.session.user.id)return res.status(400).json({error:"Không thể tự xóa tài khoản đang đăng nhập."});
 const remove = db.transaction(() => {
  db.prepare("DELETE FROM attempts WHERE user_id=?").run(id);
  db.prepare("DELETE FROM users WHERE id=? AND role='student'").run(id);
 });
 remove();res.json({ok:true});
});
app.post("/api/attempts",requireAuth,(req,res)=>{
 const {answers,total,duration_seconds}=req.body||{};
 if(!Array.isArray(answers)||!Number.isInteger(total)||total<1||answers.length!==total)return res.status(400).json({error:"Dữ liệu bài thi không hợp lệ."});
 let correct=0;
 const normalized=answers.map(a=>{const q=db.prepare("SELECT id,correct_index FROM questions WHERE id=? AND active=1").get(a.question_id);if(!q)return null;if(a.selected_index===q.correct_index)correct++;return {question_id:q.id,selected_index:a.selected_index,correct_index:q.correct_index};});
 if(normalized.some(x=>!x))return res.status(400).json({error:"Bài thi có câu hỏi không còn tồn tại."});
 const info=db.prepare("INSERT INTO attempts(user_id,total,correct,duration_seconds,answers) VALUES(?,?,?,?,?)").run(req.session.user.id,total,correct,Math.max(0,Number(duration_seconds)||0),JSON.stringify(normalized));
 res.json({id:info.lastInsertRowid,correct,total,score:Math.round(correct/total*10*10)/10});
});
app.get("/api/attempts",requireAuth,(req,res)=>{
 const rows=req.session.user.role==="admin"
 ? db.prepare("SELECT a.id,a.total,a.correct,a.duration_seconds,a.created_at,u.username FROM attempts a JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 100").all()
 : db.prepare("SELECT id,total,correct,duration_seconds,created_at FROM attempts WHERE user_id=? ORDER BY id DESC LIMIT 30").all(req.session.user.id);
 res.json(rows);
});
app.use(express.static(path.join(__dirname,"public")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`GeoLearn listening on ${port}`));
