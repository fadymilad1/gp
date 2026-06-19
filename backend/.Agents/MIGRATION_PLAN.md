# Code Migration Plan: Single App → Multi-App Architecture

## Overview
Migrate from `api` app to `core`, `hospitals`, and `pharmacies` apps with zero data loss and minimal disruption.

## Current State
- ✅ Apps created: `core/`, `hospitals/`, `pharmacies/`
- ❌ Apps not registered in `INSTALLED_APPS`
- ❌ Models still in `api/models/`
- ❌ Views/serializers still in `api/`
- ✅ Database has existing data (User, WebsiteSetup, BusinessInfo)

## Target Distribution

### Core App (Shared Infrastructure)
**Models:**
- `User` (from `api/models/user.py`)
- `WebsiteSetup` (from `api/models/website.py`)
- `BusinessInfo` (from `api/models/business.py`)
- `Payment` (from `api/models/payment.py`) - needs fixes

**Serializers:**
- `UserSerializer`, `SignupSerializer`
- `WebsiteSetupSerializer`
- `BusinessInfoSerializer`, `BusinessInfoCreateUpdateSerializer`

**Views:**
- Auth views: `signup`, `login`, `get_current_user`, `api_root`
- `WebsiteSetupViewSet`
- `BusinessInfoViewSet`

**Additional Folders:**
- `core/services/` - Business logic layer
- `core/permissions/` - Custom permissions
- `core/selectors/` - Query abstractions

### Hospitals App
**Models:**
- `Department` (from `api/models/department.py`) - needs fixes
- `Doctor` (from `api/models/doctor.py`) - needs fixes
- Future: `Appointment`, `Patient`, `MedicalRecord`

**Serializers:**
- `DepartmentSerializer`
- `DoctorSerializer`

**Views:**
- `DepartmentViewSet`
- `DoctorViewSet`

### Pharmacies App
**Models:**
- `Product` (from `api/models/product.py`) - needs fixes
- Future: `Inventory`, `Order`, `Cart`, `CartItem`

**Serializers:**
- `ProductSerializer`

**Views:**
- `ProductViewSet`

---

## Migration Steps (Phase-by-Phase)

### Phase 0: Preparation & Backup ⚠️ CRITICAL
**Duration:** 10 minutes

1. **Backup database**
   ```bash
   cp db.sqlite3 db.sqlite3.backup
   ```

2. **Create git checkpoint**
   ```bash
   git add -A
   git commit -m "checkpoint: before app migration"
   ```

3. **Document current migration state**
   ```bash
   python manage.py showmigrations > migrations_before.txt
   ```

4. **Verify tests pass (if any)**
   ```bash
   python manage.py test
   ```

---

### Phase 1: Register New Apps
**Duration:** 5 minutes
**Risk:** Low

1. **Update `medify_backend/settings.py`**
   - Add to `INSTALLED_APPS`:
     ```python
     'core.apps.CoreConfig',
     'hospitals.apps.HospitalsConfig',
     'pharmacies.apps.PharmaciesConfig',
     'api',  # Keep temporarily
     ```

2. **Update app configs**
   - Ensure `core/apps.py` has `name = 'core'`
   - Ensure `hospitals/apps.py` has `name = 'hospitals'`
   - Ensure `pharmacies/apps.py` has `name = 'pharmacies'`

3. **Test server starts**
   ```bash
   python manage.py check
   ```

---

### Phase 2: Move Core Models
**Duration:** 20 minutes
**Risk:** Medium (database tables)

1. **Create folder structure in `core/`**
   ```bash
   mkdir -p core/models
   mkdir -p core/serializers
   mkdir -p core/views
   mkdir -p core/services
   mkdir -p core/permissions
   ```

2. **Copy models (don't delete from api yet)**
   ```bash
   cp api/models/user.py core/models/user.py
   cp api/models/website.py core/models/website.py
   cp api/models/business.py core/models/business.py
   cp api/models/payment.py core/models/payment.py
   ```

3. **Fix imports in core models**
   - Change relative imports to absolute:
     - `from .user import User` → `from core.models.user import User`
     - `from .website import WebsiteSetup` → `from core.models.website import WebsiteSetup`

4. **Create `core/models/__init__.py`**
   ```python
   from .user import User
   from .website import WebsiteSetup
   from .business import BusinessInfo
   # from .payment import Payment  # Uncomment after fixing
   
   __all__ = ['User', 'WebsiteSetup', 'BusinessInfo']
   ```

5. **Fix `Payment` model class definition**
   - Change `class Payment:` → `class Payment(models.Model):`

6. **Update `settings.py` AUTH_USER_MODEL**
   ```python
   AUTH_USER_MODEL = 'core.User'  # Changed from 'api.User'
   ```

7. **Create initial migration (DON'T RUN YET)**
   ```bash
   python manage.py makemigrations core --empty
   ```

---

### Phase 3: Database Migration Strategy (CRITICAL)
**Duration:** 30 minutes
**Risk:** HIGH - Wrong approach will lose data

⚠️ **DECISION POINT:** Choose ONE approach:

#### Option A: Fake Migrations (Recommended - Zero Downtime)
Since tables already exist, we tell Django they're managed by `core` now:

1. **Create migration to move tables**
   - Manually edit `core/migrations/0001_initial.py`
   - Set `db_table` explicitly:
     ```python
     class Meta:
         db_table = 'api_user'  # Keep existing table name
     ```

2. **Run migrations**
   ```bash
   python manage.py migrate core --fake-initial
   ```

3. **Verify data still exists**
   ```bash
   python manage.py shell
   >>> from core.models import User
   >>> User.objects.count()
   ```

#### Option B: Use db_table Meta (Recommended - Clean)
Better approach - keep existing table names:

1. **In each model, set `db_table` to existing name**
   ```python
   class User(AbstractUser):
       class Meta:
           db_table = 'api_user'
   
   class WebsiteSetup(models.Model):
       class Meta:
           db_table = 'website_setups'
   ```

2. **Run makemigrations**
   ```bash
   python manage.py makemigrations core
   ```

3. **Run migrate with fake-initial**
   ```bash
   python manage.py migrate core --fake-initial
   ```

---

### Phase 4: Move Serializers & Views
**Duration:** 15 minutes
**Risk:** Low

1. **Copy serializers to core**
   ```bash
   cp api/serializers/user_serializers.py core/serializers/
   cp api/serializers/website_serializers.py core/serializers/
   cp api/serializers/business_serializers.py core/serializers/
   ```

2. **Fix serializer imports**
   - Change `from api.models import` → `from core.models import`
   - Remove unused `import factory` from website_serializers.py

3. **Create `core/serializers/__init__.py`**

4. **Copy views to core**
   ```bash
   cp api/views/auth.py core/views/
   cp api/views/website_setup.py core/views/
   cp api/views/business_info.py core/views/
   ```

5. **Fix view imports**
   - Change `from ..models import` → `from core.models import`
   - Change `from ..serializers import` → `from core.serializers import`

6. **Fix typo in `BusinessInfoViewSet.get_queryset()`**
   - Line 12: `self.requset.user` → `self.request.user`

7. **Create `core/views/__init__.py`**

---

### Phase 5: Create Core URLs
**Duration:** 10 minutes
**Risk:** Low

1. **Create `core/urls.py`**
   ```python
   from django.urls import path, include
   from rest_framework.routers import DefaultRouter
   from rest_framework_simplejwt.views import TokenRefreshView
   from core.views import auth, website_setup, business_info
   
   router = DefaultRouter()
   router.register(r'website-setups', website_setup.WebsiteSetupViewSet, basename='websitesetup')
   router.register(r'business-info', business_info.BusinessInfoViewSet, basename='businessinfo')
   
   urlpatterns = [
       path('', auth.api_root, name='api_root'),
       path('auth/signup/', auth.signup, name='signup'),
       path('auth/login/', auth.login, name='login'),
       path('auth/me/', auth.get_current_user, name='get_current_user'),
       path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
       path('', include(router.urls)),
   ]
   ```

2. **Update `medify_backend/urls.py`**
   ```python
   urlpatterns = [
       path('', root_view, name='root'),
       path('admin/', admin.site.urls),
       path('api/', include('core.urls')),  # Changed from api.urls
   ]
   ```

3. **Test endpoints work**
   ```bash
   python manage.py runserver
   # Test: http://localhost:8000/api/
   ```

---

### Phase 6: Move Hospital Models
**Duration:** 20 minutes
**Risk:** Medium

1. **Create folder structure**
   ```bash
   mkdir -p hospitals/models
   mkdir -p hospitals/serializers
   mkdir -p hospitals/views
   ```

2. **Fix and move models**
   - Copy `api/models/department.py` to `hospitals/models/department.py`
   - Copy `api/models/doctor.py` to `hospitals/models/doctor.py`
   - Fix imports:
     ```python
     from core.models import WebsiteSetup
     from .department import Department
     ```

3. **Create `hospitals/models/__init__.py`**

4. **Run migrations**
   ```bash
   python manage.py makemigrations hospitals
   python manage.py migrate hospitals
   ```

5. **Create basic serializers and views**

---

### Phase 7: Move Pharmacy Models
**Duration:** 15 minutes
**Risk:** Medium

1. **Create folder structure**
   ```bash
   mkdir -p pharmacies/models
   mkdir -p pharmacies/serializers
   mkdir -p pharmacies/views
   ```

2. **Fix and move models**
   - Copy `api/models/product.py` to `pharmacies/models/product.py`
   - Fix imports: `from core.models import WebsiteSetup`

3. **Create `pharmacies/models/__init__.py`**

4. **Run migrations**
   ```bash
   python manage.py makemigrations pharmacies
   python manage.py migrate pharmacies
   ```

---

### Phase 8: Clean Up & Remove API App
**Duration:** 15 minutes
**Risk:** Low

1. **Remove `api` from `INSTALLED_APPS`**

2. **Delete or archive `api/` folder**
   ```bash
   mv api api_old_backup
   ```

3. **Run checks**
   ```bash
   python manage.py check
   python manage.py showmigrations
   ```

4. **Test all endpoints**

5. **Update AGENTS.md** to reflect new structure

---

### Phase 9: Implement Design Patterns
**Duration:** 60+ minutes
**Risk:** Low

1. **Create service layer**
   - `core/services/auth_service.py` - Handle signup flow
   - `core/services/website_service.py` - Handle website setup logic

2. **Create permissions**
   - `core/permissions/ownership.py` - IsOwnerOfWebsiteSetup, etc.

3. **Create selectors**
   - `core/selectors/business_selectors.py` - Query abstractions

4. **Refactor views to use services**

---

## Rollback Plan

If anything goes wrong:

1. **Restore database**
   ```bash
   cp db.sqlite3.backup db.sqlite3
   ```

2. **Revert git changes**
   ```bash
   git reset --hard HEAD
   ```

3. **Clear migration tables if needed**
   ```bash
   python manage.py migrate core zero
   python manage.py migrate hospitals zero
   python manage.py migrate pharmacies zero
   ```

---

## Validation Checklist

After each phase:
- [ ] `python manage.py check` passes
- [ ] Server starts without errors
- [ ] Existing data is accessible
- [ ] No migration conflicts
- [ ] All imports resolve correctly

After completion:
- [ ] All API endpoints return correct responses
- [ ] User authentication works
- [ ] Website setup CRUD works
- [ ] Business info CRUD works
- [ ] Admin panel works
- [ ] No import errors in any file
- [ ] Run linter: `flake8 .`
- [ ] Check types: `pyright`

---

## Estimated Total Time
- **Preparation:** 10 min
- **Core migration:** 90 min
- **Hospital/Pharmacy migration:** 40 min
- **Testing & cleanup:** 30 min
- **Pattern implementation:** 60+ min
- **TOTAL:** ~3.5 hours (excluding pattern implementation)

---

## Notes

1. **Don't delete old migrations** - Keep `api/migrations/` until verified everything works
2. **Use `db_table` Meta option** - Prevents table recreation
3. **Test after each phase** - Easier to debug
4. **Keep backups** - Database + code checkpoint
5. **Update documentation** - Keep AGENTS.md current
