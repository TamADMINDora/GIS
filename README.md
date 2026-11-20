# GeoLearn Online

Ứng dụng học GIS có đăng nhập, phân quyền admin/học viên, ngân hàng câu hỏi, thi thử có thời gian và lưu lịch sử kết quả.

## Chạy thử trên máy

1. Cài Node.js 20 LTS trở lên.
2. Sao chép `.env.example` thành `.env`, thay `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` bằng giá trị riêng.
3. Tạo thư mục `data`.
4. Cài và chạy:

```bash
npm install
npm start
```

Mở `http://localhost:3000`.

**Không dùng mật khẩu mẫu cũ của bản HTML.** Admin đầu tiên chỉ được khởi tạo khi đặt `ADMIN_USERNAME` và `ADMIN_PASSWORD` trong môi trường. Nếu đã có admin trong DB, đổi mật khẩu bằng công cụ quản trị DB hoặc bổ sung chức năng đổi mật khẩu trước khi phát hành rộng rãi.

## Triển khai trực tuyến (Render / Railway / VPS)

- Tạo dịch vụ Web Node, build command `npm install`, start command `npm start`.
- Thiết lập biến môi trường: `NODE_ENV=production`, `SESSION_SECRET` (chuỗi ngẫu nhiên dài), `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
- Gắn **persistent disk/volume** và đặt `DATA_DIR` cùng `DB_PATH` vào thư mục mount, ví dụ `/var/data` và `/var/data/geolearn.sqlite`.
- Bật HTTPS. Cookie phiên tự đặt `secure` khi `NODE_ENV=production`.
- Sao lưu định kỳ file SQLite và `sessions.sqlite`. Không dùng ephemeral filesystem cho dữ liệu quan trọng.

## Phân quyền

- Người dùng không thể tự đăng ký.
- Admin được khởi tạo qua biến môi trường khi database chưa có admin.
- Chỉ admin tạo/xóa tài khoản học viên và tạo/sửa/xóa câu hỏi.
- Học viên chỉ xem câu hỏi, làm bài và xem lịch sử cá nhân.
- Mật khẩu được băm bằng bcrypt; phiên đăng nhập lưu trong SQLite.

## Tính năng trong bản này

- Dashboard theo 4 chương.
- Khu lý thuyết và cẩm nang thao tác.
- Ngân hàng câu hỏi có giải thích.
- Thi thử có đồng hồ đếm ngược, trộn câu hỏi, chấm điểm và lưu lịch sử.
- Admin quản lý học viên và câu hỏi.

## Giới hạn và việc cần hoàn thiện trước khi dùng chính thức

- Nội dung lý thuyết/câu hỏi hiện là bộ khởi tạo minh họa dựa trên chủ đề đã nêu trong trao đổi; chưa thể xác nhận toàn bộ bám sát giáo trình gốc vì các file giáo trình chưa truy xuất được trong phiên này. Cần đối chiếu từng câu với tài liệu môn học trước khi phát hành.
- Cần bổ sung luồng đổi/đặt lại mật khẩu, CSRF protection, rate limiting đăng nhập, nhật ký thao tác admin, kiểm tra sao lưu/khôi phục và kiểm thử bảo mật độc lập trước khi dùng cho kỳ thi chính thức.
- Tính năng thực hành hiện là cookbook nội dung, chưa nhúng QGIS/ArcGIS thực tế hoặc tải dữ liệu GIS.
