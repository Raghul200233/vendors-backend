# Multi-Tenant E-Commerce Backend

## 🚀 Tech Stack
- Node.js & Express.js
- MongoDB with Mongoose
- JWT Authentication
- Stripe Payment Integration
- Cloudinary Image Upload
- Nodemailer for Emails

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/Raghul200233/vendors-backend.git

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your credentials

# Start development server
npm run dev

# Start production server
npm start
🔐 Environment Variables
env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ecommerce_platform
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
STRIPE_SECRET_KEY=your_stripe_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
📁 Project Structure
text
backend/
├── src/
│   ├── config/        # Database, Cloudinary, Stripe config
│   ├── models/        # Mongoose models
│   ├── controllers/   # Business logic
│   ├── routes/        # API routes
│   ├── middleware/    # Auth, error handlers
│   └── utils/         # Helper functions
├── .env
└── package.json
🔑 API Endpoints
Authentication
POST /api/auth/register - Register new user

POST /api/auth/login - Login user

GET /api/auth/me - Get current user

Products
GET /api/products - Get all products

POST /api/products - Create product (Vendor)

PUT /api/products/:id - Update product

DELETE /api/products/:id - Delete product

Orders
POST /api/orders - Create order

GET /api/orders/myorders - Get user orders

PUT /api/orders/:id/status - Update order status

Admin
GET /api/admin/vendors - Get all vendors

PUT /api/admin/vendors/:id/approve - Approve vendor

GET /api/admin/customers - Get all customers

GET /api/admin/stats - Platform statistics

👥 User Roles
Customer: Browse products, place orders

Vendor: Manage products, view orders, dashboard

Super Admin: Manage vendors, customers, platform

📝 Scripts
npm run dev - Start development server

npm start - Start production server

npm run seed - Seed database with sample data

npm run set-password - Reset vendor passwords

📄 License
MIT

text

### Frontend README (F:/multi-tenant-ecommerse/frontend/README.md)
Create this file before pushing:

```markdown
# Multi-Tenant E-Commerce Frontend

## 🚀 Tech Stack
- React 18 with Vite
- Redux Toolkit for State Management
- Tailwind CSS for Styling
- React Router DOM for Navigation
- Stripe for Payments
- Axios for API calls
- React Hot Toast for Notifications
- Recharts for Analytics

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/Raghul200233/vendors-frontend.git

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your backend URL

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
🔐 Environment Variables
env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
📁 Project Structure
text
frontend/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   │   ├── admin/      # Admin pages
│   │   ├── vendor/     # Vendor pages
│   │   └── customer/   # Customer pages
│   ├── redux/          # Redux store & slices
│   ├── utils/          # Helper functions
│   ├── App.jsx
│   └── main.jsx
├── public/
├── .env
├── tailwind.config.js
├── vite.config.js
└── package.json
🎨 Features
Customer
Browse products by category

Search products

Add to cart

Checkout with Stripe

Order history

View order status

Vendor
Dashboard with analytics

Product management (CRUD)

Inventory management

Order management

Store profile settings

Image upload for products

Admin
Dashboard with platform stats

Vendor management (approve/suspend)

Customer management

Platform analytics

🚀 Deployment
Build for Production
bash
npm run build
Deploy to Vercel
bash
npm install -g vercel
vercel
Deploy to Netlify
bash
npm install -g netlify-cli
netlify deploy
📱 Responsive Design
Mobile-first approach

Tailwind CSS for responsive utilities

Works on all screen sizes

🔗 API Integration
Connected to backend at VITE_API_URL

JWT token stored in localStorage

Axios interceptors for auth headers