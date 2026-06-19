from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from core.models import User, WebsiteSetup, BusinessInfo


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model"""
    list_display = ['email', 'name', 'business_type', 'is_active', 'created_at']
    list_filter = ['business_type', 'is_active', 'created_at']
    search_fields = ['email', 'name']
    ordering = ['-created_at']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('name', 'business_type')}),
    )


@admin.register(WebsiteSetup)
class WebsiteSetupAdmin(admin.ModelAdmin):
    """Admin interface for WebsiteSetup model"""
    list_display = ['user', 'is_paid', 'total_price', 'template_id', 'created_at']
    list_filter = ['is_paid', 'created_at']
    search_fields = ['user__email', 'user__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(BusinessInfo)
class BusinessInfoAdmin(admin.ModelAdmin):
    """Admin interface for BusinessInfo model"""
    list_display = ['name', 'website_setup', 'is_published', 'contact_phone', 'created_at']
    list_filter = ['is_published', 'created_at']
    search_fields = ['name', 'contact_email', 'contact_phone']
    readonly_fields = ['id', 'created_at', 'updated_at']
