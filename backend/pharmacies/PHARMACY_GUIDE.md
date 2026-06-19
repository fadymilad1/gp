# Pharmacy Backend Implementation Guide

## 📋 Overview

As a **pharmacy user**, you have access to two main data models:
1. **BusinessInfo** (shared with all business types) - Your pharmacy's basic information
2. **Product** (pharmacy-specific) - Your medication/product catalog

---

## 🏗️ Database Schema

### 1. BusinessInfo Model (Core App)
**Location:** `backend/core/models/business.py`

```
BusinessInfo
├── id (UUID)
├── website_setup (FK → WebsiteSetup)
├── name (Pharmacy name)
├── logo (Image)
├── about (Description)
├── address (Physical address)
├── latitude/longitude (Map coordinates)
├── contact_phone
├── contact_email
├── website (URL)
├── working_hours (JSON)
└── is_published (Boolean)
```

### 2. Product Model (Pharmacy App)
**Location:** `backend/pharmacies/models/product.py`

```
Product
├── id (UUID)
├── website_setup (FK → WebsiteSetup)
├── name (Medicine/product name)
├── category (e.g., "Pain Relief", "Antibiotics")
├── description
├── price (Decimal)
├── in_stock (Boolean)
├── created_at
└── updated_at
```

---

## 🔌 API Endpoints

### Business Info Endpoints

**Base URL:** `http://localhost:8000/api/business-info/`

```http
# Get business info
GET /api/business-info/

# Create business info
POST /api/business-info/
{
  "name": "HealthCare Pharmacy",
  "about": "Your trusted neighborhood pharmacy",
  "address": "123 Main St, City",
  "contact_phone": "+20123456789",
  "contact_email": "info@pharmacy.com",
  "working_hours": {
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false}
  }
}

# Update business info
PATCH /api/business-info/{id}/
{
  "name": "Updated Pharmacy Name",
  "is_published": true
}

# Publish website
POST /api/business-info/publish/
```

### Product Endpoints

**Base URL:** `http://localhost:8000/api/pharmacy/products/`

```http
# List all products
GET /api/pharmacy/products/

# Get single product
GET /api/pharmacy/products/{id}/

# Create product
POST /api/pharmacy/products/
{
  "name": "Paracetamol 500mg",
  "category": "Pain Relief",
  "description": "For fever and pain",
  "price": 25.50,
  "in_stock": true
}

# Update product
PATCH /api/pharmacy/products/{id}/
{
  "price": 30.00,
  "in_stock": false
}

# Delete product
DELETE /api/pharmacy/products/{id}/

# Bulk upload products (CSV)
POST /api/pharmacy/products/bulk_upload/
{
  "products": [
    {
      "name": "Aspirin 100mg",
      "category": "Pain Relief",
      "description": "Low-dose aspirin",
      "price": 15.00,
      "stock": 30,
      "image_url": "https://placehold.co/600x400/png?text=Aspirin"
    },
    {
      "name": "Amoxicillin 500mg",
      "category": "Antibiotics",
      "description": "Prescription antibiotic",
      "price": 120.00,
      "stock": 15
    }
  ]
}

# Get products by category
GET /api/pharmacy/products/by_category/

# Delete all products
DELETE /api/pharmacy/products/delete_all/
```

---

## 📝 Usage Flow for Pharmacy Users

### Step 1: Sign Up
```javascript
POST /api/auth/signup/
{
  "email": "pharmacy@example.com",
  "password": "securepass123",
  "business_type": "pharmacy",
  "full_name": "John Doe"
}
```

### Step 2: Login & Get Token
```javascript
POST /api/auth/login/
{
  "email": "pharmacy@example.com",
  "password": "securepass123"
}

// Response
{
  "access": "eyJ0eXAiOiJKV1QiLCJhb...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhb...",
  "user": {...}
}
```

### Step 3: Add Business Information
```javascript
// Include token in header
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhb...

POST /api/business-info/
{
  "name": "City Pharmacy",
  "address": "123 Health Street",
  "contact_phone": "+20123456789",
  "latitude": 30.0444,
  "longitude": 31.2357,
  "working_hours": {
    "monday": {"open": "09:00", "close": "21:00", "closed": false}
  }
}
```

### Step 4: Add Products
```javascript
POST /api/pharmacy/products/
{
  "name": "Vitamin C 1000mg",
  "category": "Supplements",
  "price": 45.00,
  "in_stock": true
}
```

### Step 5: Publish Website
```javascript
POST /api/business-info/publish/
```

---

## 🔒 Authentication

All endpoints (except signup/login) require JWT authentication:

```javascript
headers: {
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json'
}
```

---

## 💾 Data Relationships

```
User
  ↓
WebsiteSetup (business_type: "pharmacy")
  ↓
  ├─→ BusinessInfo (1-to-1)
  └─→ Product (1-to-many)
```

### Key Points:
1. **One pharmacy → One BusinessInfo**
2. **One pharmacy → Many Products**
3. All data is **user-isolated** (you only see YOUR products)
4. **Cascade deletion**: If WebsiteSetup is deleted, all related data is deleted

---

## 🛠️ Django Admin Panel

Access: `http://localhost:8000/admin/`

You can manage:
- Users
- Website Setups
- Business Info
- Products (NEW!)

Create superuser:
```bash
python manage.py createsuperuser
```

---

## 📦 Sample Data

### Sample Business Info:
```json
{
  "name": "HealthPlus Pharmacy",
  "about": "Your trusted source for quality medications and health products",
  "address": "456 Medical Center, Cairo, Egypt",
  "latitude": 30.0444,
  "longitude": 31.2357,
  "contact_phone": "+20123456789",
  "contact_email": "info@healthplus.com",
  "working_hours": {
    "monday": {"open": "08:00", "close": "22:00", "closed": false},
    "friday": {"open": "14:00", "close": "22:00", "closed": false}
  }
}
```

### Sample Products:
```json
[
  {
    "name": "Paracetamol 500mg",
    "category": "Pain Relief",
    "description": "Effective pain and fever relief",
    "price": 25.50,
    "in_stock": true
  },
  {
    "name": "Vitamin D3 1000 IU",
    "category": "Vitamins & Supplements",
    "description": "Supports bone health",
    "price": 85.00,
    "in_stock": true
  }
]
```

---

## ✅ Testing with Postman/Thunder Client

1. **Signup** → Save access token
2. **Create Business Info** → Get ID
3. **Add Products** → Multiple POST requests
4. **Test Bulk Upload** → Upload 10+ products
5. **Get By Category** → Verify grouping
6. **Publish** → Set is_published = true

---

## 🔍 Next Steps

1. ✅ Backend is ready
2. Frontend integration needed in:
   - Product management page
   - Product catalog display
   - CSV upload component
3. Improve image handling (compression/CDN and moderation)
4. Add inventory management features

---

## 📞 Support

Check files:
- Models: `backend/pharmacies/models/product.py`
- Views: `backend/pharmacies/views.py`
- Serializers: `backend/pharmacies/serializers.py`
- URLs: `backend/pharmacies/urls.py`
