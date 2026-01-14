# Hidn Backend

Backend API cho Hidn - Hidden AI Study Tools

## Kiến trúc

Project sử dụng kiến trúc 3-layer pattern:
- **Controllers**: Xử lý HTTP requests/responses
- **Services**: Business logic và orchestration
- **Repositories**: Data access layer

## Cấu trúc thư mục

```
hidn-be/
├── database/
│   └── hidn_db.sql           # Database schema
├── uploads/                   # Uploaded files (OCR)
├── src/
│   ├── config/
│   │   ├── database.js       # Database configuration
│   │   ├── credits.js        # Credit system config
│   │   └── multer.js         # File upload config
│   ├── controllers/
│   │   ├── admin.controller.js    # Admin dashboard
│   │   ├── ai.controller.js       # AI tools
│   │   ├── auth.controller.js     # Authentication
│   │   ├── history.controller.js  # Usage history
│   │   ├── ocr.controller.js      # OCR processing
│   │   ├── user.controller.js     # User management
│   │   └── wallet.controller.js   # Credit wallet
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── validate.js       # Input validation
│   │   ├── rateLimiter.js    # Rate limiting
│   │   ├── errorHandler.js   # Error handling
│   │   └── index.js
│   ├── repositories/
│   │   ├── admin.repository.js
│   │   ├── aiRequest.repository.js
│   │   ├── emailVerification.repository.js
│   │   ├── history.repository.js
│   │   ├── passwordReset.repository.js
│   │   ├── profile.repository.js
│   │   ├── user.repository.js
│   │   ├── wallet.repository.js
│   │   └── index.js
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── ai.routes.js
│   │   ├── auth.routes.js
│   │   ├── history.routes.js
│   │   ├── user.routes.js
│   │   ├── wallet.routes.js
│   │   └── index.js
│   ├── services/
│   │   ├── admin.service.js       # Admin operations
│   │   ├── auth.service.js        # Auth logic
│   │   ├── email.service.js       # Email sending
│   │   ├── gemini.service.js      # Google Gemini API
│   │   ├── toolConfig.service.js  # Tool configuration
│   │   ├── user.service.js        # User operations
│   │   ├── wallet.service.js      # Credit operations
│   │   └── index.js
│   ├── validators/
│   │   ├── ai.validator.js
│   │   ├── auth.validator.js
│   │   ├── profile.validator.js
│   │   └── index.js
│   ├── app.js                # Express app setup
│   └── server.js             # Server entry point
└── package.json
```

## Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Thiết lập database

Tạo database MySQL và chạy script khởi tạo:

```bash
mysql -u root -p < database/init.sql
```

### 3. Cấu hình môi trường

Sao chép `.env.example` thành `.env` và điền thông tin:

```bash
cp .env.example .env
```

Cập nhật các giá trị trong `.env`:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database credentials
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT secrets
- `GEMINI_API_KEY` - Google Gemini API key
- `FRONTEND_URL` - Frontend URL for CORS
- `EMAIL_USER`, `EMAIL_PASSWORD` - SMTP credentials
- `PORT` - Server port (default: 5000)

### 4. Chạy server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server sẽ chạy tại `http://localhost:5000`

## Database Schema

### Main Tables
- **users** - User accounts và authentication
- **roles** - User roles (user/admin)
- **wallets** - Credit balances
- **ai_requests** - AI tool usage logs
- **email_verifications** - Email verification tokens
- **password_resets** - Password reset tokens
- **credit_config** - Credit system configuration
- **tool_configs** - Tool-specific settings
- **security_logs** - Security events
- **system_logs** - System activity logs

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hidn_db
DB_PORT=3306

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Frontend
FRONTEND_URL=http://localhost:3000

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# File Upload
MAX_FILE_SIZE=5242880
```

## Development

### Scripts
```bash
npm run dev        # Start with nodemon
npm start          # Start production
npm run lint       # Run ESLint (if configured)
```

### Testing APIs
Sử dụng Postman hoặc Thunder Client với collection:
1. Import endpoints từ `docs/api.md`
2. Set base URL: `http://localhost:5000`
3. Authenticate và nhận JWT token
4. Add token vào Authorization header cho protected routes

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets
- [ ] Configure production database
- [ ] Set up proper CORS whitelist
- [ ] Enable HTTPS
- [ ] Set up process manager (PM2)
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up monitoring and logging
- [ ] Database backups
- [ ] Rate limiting tuned for production

### PM2 Deployment
```bash
npm install -g pm2
pm2 start src/server.js --name hidn-be
pm2 save
pm2 startup
```

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

Private - Not for redistribution

### Authentication (`/api/auth`)
- `POST /register` - Đăng ký user mới
- `POST /login` - Đăng nhập
- `POST /logout` - Đăng xuất
- `GET /profile` - Lấy thông tin profile
- `POST /verify-email` - Xác thực email
- `POST /resend-verification` - Gửi lại email xác thực
- `POST /forgot-password` - Yêu cầu reset password
- `POST /reset-password` - Reset password

### Users (`/api/users`)
- `GET /me` - Thông tin user hiện tại
- `PUT /profile` - Cập nhật profile
- `PUT /password` - Đổi mật khẩu

### Wallet (`/api/wallet`)
- `GET /` - Lấy thông tin ví credits
- `GET /costs` - Lấy bảng giá công cụ
- `GET /history` - Lịch sử giao dịch credits

### History (`/api/history`)
- `GET /` - Lấy lịch sử sử dụng (paginated)
- `GET /:id` - Chi tiết một lần sử dụng
- `DELETE /:id` - Xóa một lần sử dụng

### AI Tools (`/api/ai`)
- `POST /summarize` - Tóm tắt văn bản
- `POST /questions` - Tạo câu hỏi từ văn bản
- `POST /explain` - Giải thích văn bản
- `POST /rewrite` - Viết lại văn bản
- `POST /ocr` - OCR từ hình ảnh (upload file)

### Admin (`/api/admin`)
#### Dashboard
- `GET /dashboard/stats` - Thống kê tổng quan

#### User Management
- `GET /users` - Danh sách users (với filters)
- `GET /users/:id` - Chi tiết user

#### Credit Management
- `GET /credits/logs` - Logs sử dụng credits
- `GET /credits/config` - Cấu hình credit system
- `PUT /credits/config` - Cập nhật cấu hình credits

#### Tool Management
- `GET /tools/analytics` - Phân tích sử dụng tools
- `GET /tools/config` - Cấu hình tools
- `PUT /tools/config` - Cập nhật cấu hình tools

#### Security Logs
- `GET /security-logs` - Danh sách security logs
- `GET /security-logs/stats` - Thống kê security
- `GET /security-logs/:id` - Chi tiết log
- `PATCH /security-logs/:id/resolve` - Đánh dấu đã xử lý
- `POST /security-logs` - Tạo log mới

#### System Logs
- `GET /system-logs` - Danh sách system logs
- `GET /system-logs/stats` - Thống kê system logs
- `POST /system-logs` - Tạo system log

## Tech Stack

### Core
- **Node.js** + **Express** - Web framework
- **MySQL** - Database

### Authentication & Security
- **JWT** - Token-based authentication
- **bcrypt** - Password hashing
- **express-validator** - Input validation
- **express-rate-limit** - Rate limiting
- **helmet** - Security headers
- **cors** - CORS handling

### AI & Processing
- **Gemini API** - AI text processing
- **Tesseract.js** - OCR engine
- **multer** - File upload handling

### Utilities
- **nodemailer** - Email sending
- **dotenv** - Environment configuration
- **compression** - Response compression
- **morgan** - HTTP request logger

## Tính năng chính

### 🔐 Authentication & Authorization
- JWT-based authentication
- Email verification
- Password reset flow
- Role-based access control (User/Admin)

### 💳 Credit System
- Free daily credits
- Pay-as-you-go credits
- Credit history tracking
- Tool-specific pricing
- Bonus credit campaigns

### 🤖 AI Tools
- **Summarize**: Tóm tắt văn bản dài
- **Questions**: Tạo câu hỏi từ nội dung
- **Explain**: Giải thích văn bản phức tạp
- **Rewrite**: Viết lại văn bản
- **OCR**: Trích xuất text từ ảnh

### 📊 Admin Dashboard
- User management
- Credit configuration
- Tool analytics
- Security monitoring
- System logs

### 🔒 Security Features
- Rate limiting per user/IP
- Security event logging
- Failed login tracking
- Suspicious activity detection
- CORS protection
- Input sanitization

## Bảo mật

- Password hashing với bcrypt (salt rounds: 10)
- JWT-based authentication với refresh tokens
- Rate limiting: 100 requests/15 minutes per IP
- Input validation trên tất cả endpoints
- CORS protection với whitelist
- Security headers với helmet
- SQL injection protection (parameterized queries)
- XSS protection
- CSRF protection cho form submissions

## License

Private - Not for redistribution
