from django.db import models
from core.models import WebsiteSetup
import uuid

class Department(models.Model):
    """Hospital department (e.g. Cardiology, Neurology)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    website_setup = models.ForeignKey(
        WebsiteSetup,
        on_delete=models.CASCADE,
        related_name='hospital_departments'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'hospital_departments'
        ordering = ['name']

    def __str__(self):
        return self.name
