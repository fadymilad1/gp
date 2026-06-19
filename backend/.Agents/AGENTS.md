# AGENTS.md - Medify Backend Development Guide

This document provides guidelines for agents working on the Medify backend codebase.

## Project Overview

**Medify** is a website builder platform that creates customized websites for medical businesses:
- **Hospital websites** with CRM features (doctor management, departments, appointments, patient portal)
- **Pharmacy websites** as e-commerce platforms (product catalog, inventory, orders)

### Tech Stack
- **Framework**: Django 4.2.7 with Django REST Framework 3.14.0
- **Language**: Python
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Authentication**: JWT via djangorestframework-simplejwt

### Business Model
- Users sign up and select business type (hospital or pharmacy)
- System creates a WebsiteSetup with configurable features
- Users customize BusinessInfo (branding, contact, location)
- Feature-based pricing with payment integration
- Each user gets a unique subdomain for their generated website

## Project Structure

### Current Structure (Single App)

```
backend/
├── api/                          # Main Django app (will be split into core/hospitals/pharmacies)
│   ├── migrations/
│   ├── models/                   # Database models
│   │   ├── user.py              # ✅ Active: Custom user with business_type
│   │   ├── website.py           # ✅ Active: WebsiteSetup with features & pricing
│   │   ├── business.py          # ✅ Active: BusinessInfo (branding, contact, location)
│   │   ├── department.py        # 🚧 Stub: Hospital departments (needs migration)
│   │   ├── doctor.py            # 🚧 Stub: Hospital doctors (needs migration)
│   │   ├── product.py           # 🚧 Stub: Pharmacy products (needs migration)
│   │   ├── payment.py           # 🚧 Stub: Payment transactions (needs migration)
│   │   └── features.py          # ⚠️ Deprecated: Replaced by WebsiteSetup fields
│   ├── serializers/              # DRF serializers
│   │   ├── user_serializers.py
│   │   ├── business_serializers.py
│   │   └── website_serializers.py
│   ├── views/                    # API views
│   │   ├── auth.py              # Signup, login, current user
│   │   ├── business_info.py     # Business info CRUD
│   │   └── website_setup.py     # Website setup CRUD
│   ├── admin.py
│   ├── apps.py
│   └── urls.py
├── medify_backend/               # Django project settings
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── Agents/
│   ├── AGENTS.md                # This file
│   └── Patterns.md              # Design pattern recommendations
├── manage.py
├── db.sqlite3
├── pyproject.toml               # pyright config
├── requirements.txt
├── .flake8                      # flake8 config (ignores E501)
└── setup.cfg                    # pycodestyle config
```

### Recommended Future Structure (Multi-App)

As the project grows, split into domain-specific apps:

```
backend/
├── core/                        # Shared models & auth
│   ├── models/                  # User, WebsiteSetup, BusinessInfo, Payment
│   ├── serializers/
│   ├── views/
│   ├── services/                # Business logic layer
│   ├── permissions/             # Custom permission classes
│   └── selectors/               # Query logic abstraction
├── hospitals/                   # Hospital-specific features
│   ├── models/                  # Department, Doctor, Appointment, Patient
│   ├── serializers/
│   ├── views/
│   └── services/                # CRM business logic
├── pharmacies/                  # Pharmacy-specific features
│   ├── models/                  # Product, Inventory, Order, Cart
│   ├── serializers/
│   ├── views/
│   └── services/                # E-commerce business logic
└── medify_backend/              # Project settings
```

## Build/Lint/Test Commands

### Running the Development Ser (doctor, department, features, payment, product) if not needed yetver
```bash
python manage.py runserver
```

### Database Migrations
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

### Linting
```bash
# flake8 (recommended - ignores E501 line length)
flake8 .

# Run with specific config
flake8 --config=.flake8 .
```

### Type Checking
```bash
# pyright (configured in pyproject.toml)
pyright
```

### Django Management Commands
```bash
# Create superuser
python manage.py createsuperuser

# Check configuration
python manage.py check

# Shell access
python manage.py shell
```

### Running Tests
```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test api

# Run a specific test file
python manage.py test api.tests.test_views

# Run a specific test class
python manage.py test api.tests.test_views.UserViewSetTest

# Run a specific test method
python manage.py test api.tests.test_views.UserViewSetTest.test_create_user

# With coverage (if coverage is installed)
coverage run manage.py test
coverage report
```

## Code Style Guidelines

### Imports (PEP 8 - Standard Library First)
```python
# 1. Standard library
import uuid
import os
from pathlib import Path
from datetime import timedelta

# 2. Third-party packages
from django.db import models
from django.contrib.auth.models import AbstractUser
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

# 3. Local imports (relative)
from .models import User, WebsiteSetup
from .serializers import UserSerializer
```

### Formatting
- **Line length**: E501 ignored (no strict limit)
- **Indentation**: 4 spaces
- **Blank lines**: Two blank lines between top-level definitions
- **Trailing whitespace**: Avoid

### Naming Conventions
- **Classes**: PascalCase (`UserSerializer`, `BusinessInfoViewSet`)
- **Functions/methods**: snake_case (`get_queryset`, `create_user`)
- **Variables**: snake_case (`user_data`, `is_valid`)
- **Constants**: SCREAMING_SNAKE_CASE
- **Database fields**: snake_case (`created_at`, `business_type`)
- **Files**: snake_case (`user_serializers.py`, `views.py`)

### Type Hints
- Use type hints for function arguments and return values where beneficial
- Example:
```python
from typing import Optional, List

def get_user(email: str) -> Optional[User]:
    """Get user by email."""
    try:
        return User.objects.get(email=email)
    except User.DoesNotExist:
        return None
```

### Django Model Guidelines
```python
from django.db import models
import uuid

class BusinessInfo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
```

### DRF Serializer Guidelines
```python
from rest_framework import serializers
from api.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'business_type', 'created_at']
        read_only_fields = ['id', 'created_at']
```

### ViewSet Guidelines
```python
class BusinessInfoViewSet(viewsets.ModelViewSet):
    serializer_class = BusinessInfoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BusinessInfo.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def publish(self, request):
        # Custom action implementation
        pass
```

### Error Handling
- Use `serializer.is_valid(raise_exception=True)` for automatic validation errors
- Return appropriate HTTP status codes:
  - `200 OK` - Successful GET/PUT/PATCH
  - `201 Created` - Successful POST
  - `400 Bad Request` - Validation errors
  - `401 Unauthorized` - Authentication failed
  - `404 Not Found` - Resource not found
- Example error response:
```python
return Response(
    {'error': 'Business info already exists. Use update endpoint.'},
    status=status.HTTP_400_BAD_REQUEST
)
```

### API Endpoints Structure
Follow REST conventions:
- `GET /api/resource/` - List
- `POST /api/resource/` - Create
- `GET /api/resource/{id}/` - Retrieve
- `PUT/PATCH /api/resource/{id}/` - Update
- `DELETE /api/resource/{id}/` - Destroy
- Custom actions: `POST /api/resource/{id}/action_name/`

### Custom Actions Pattern
```python
@action(detail=False, methods=['post'])
def publish(self, request):
    """Publish the website."""
    business_info = self.get_obj (e.g., `appointment.py`)
2. Add to `api/models/__init__.py`
3. Run `python manage.py makemigrations`
4. Review migration file for correctness
5. Run `python manage.py migrate`

### Creating a New Serializer
1. Add to appropriate file in `api/serializers/` (or create new file)
2. Export in `api/serializers/__init__.py`
3. Follow read/write serializer split pattern for complex models

### Creating a New ViewSet
1. Add viewset to appropriate file in `api/views/`
2. Export in `api/views/__init__.py`
3. Register in `api/urls.py` (router or path)
4. Add appropriate permission classes

### Adding a New App
1. Create app: `python manage.py startapp newapp`
2. Add to `INSTALLED_APPS` in `settings.py`
3. Create `urls.py` in new app
4. Include in `medify_backend/urls.py`: `path('api/newapp/', include('newapp.urls'))`
5. Consider inter-app dependencies (prefer importing from `core`)

## Active Models & Their Relationships

```
User (core)
  ├── business_type: 'hospital' | 'pharmacy'
  └── OneToOne → WebsiteSetup
                    ├── Features (hospital): review_system, ai_chatbot, patient_portal, etc.
                    ├── Features (pharmacy): template_id
                    ├── Payment: is_paid, total_price
                    ├── subdomain (unique)
                    ├── OneToOne → BusinessInfo (branding, contact, hours, location)
                    ├── ForeignKey ← Department[] (planned - hospitals only)
                    └── ForeignKey ← Product[] (planned - pharmacies only)

Department (planned)
  └── ForeignKey ← Doctor[]

Payment (planned)
  └── Tracks website feature payments
```

## Known Issues & TODOs

### Critical
- [ ] Fix typo in `BusinessInfoViewSet.get_queryset()` (line 12): `self.requset.user` → `self.request.user`
- [ ] `WebsiteSetup.subdomain` is required but not set during signup (needs factory or default logic)
- [ ] Stub models (department, doctor, product, payment) have import errors and are not migrated

### DRF Best Practice Violations
- [ ] `BusinessInfoViewSet.list()` returns single object instead of list (violates REST semantics)
- [ ] `get_object()` overrides ignore URL pk parameter (should use `@action(detail=False)` pattern)
- [ ] Login view uses manual `request.data` parsing instead of serializer validation
- [ ] Side effects in `create()`/`update()` should use `perform_create()`/`perform_update()` hooks

### Refactoring Opportunities
- [ ] Remove unused `import factory` from `website_serializers.py`
- [ ] Deprecate/remove `features.py` model (functionality moved to `WebsiteSetup`)
- [ ] Implement service layer for signup flow (user + website_setup creation)
- [ ] Add custom permission classes for ownership checks
- [ ] Consider `TokenObtainPairView` for login instead of custom function-based view

### Documentation
- Include docstrings for all views, serializers, and complex functions
- Format: Google-style or simple descriptions
- Example:
```python
def get_queryset(self):
    """Return business info for the current user's website setup."""
    pass
```

## Environment Configuration

Create a `.env` file (do not commit):
```
SECRET_KEY=your-secret-key
DEBUG=True
DB_ENGINE=sqlite  # or postgresql
DB_NAME=medify_db
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
FRONTEND_URL=http://localhost:3000
```

## Common Development Tasks

### Creating a New Model
1. Create model in `api/models/`
2. Add to `api/models/__init__.py`
3. Run `python manage.py makemigrations`
4. Run `python manage.py migrate`

### Creating a New Serializer
1. Add to appropriate file in `api/serializers/`
2. Export in `api/serializers/__init__.py`

### Creating a New ViewSet
1. Add viewset to `api/views.py`
2. Add to `api/urls.py`

### Adding a New App
1. Create app: `python manage.py startapp newapp`
2. Add to `INSTALLED_APPS` in `settings.py`
3. Add to `ROOT_URLCONF`
