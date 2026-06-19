from django.db import models
from .website import WebsiteSetup
import uuid


class BusinessInfo(models.Model):
    """Business information for the website"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    website_setup = models.OneToOneField(
        WebsiteSetup,
        on_delete=models.CASCADE,
        related_name='business_info'
    )

    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    about = models.TextField(blank=True)
    address = models.TextField(blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    working_hours = models.JSONField(
        default=dict,
        help_text="Store working hours as JSON: {monday: {open, close, closed}, ...}"
    )
    is_published = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Business Info for {self.name}"

    class Meta:
        db_table = 'business_info'
