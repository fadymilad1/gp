from django.db import models
from django.conf import settings
import uuid

class HospitalStaff(models.Model):
    """Hospital staff user mapped to a hospital profile (tenant)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hospital_staff'
    )
    hospital = models.ForeignKey(
        'hospitals.HospitalProfile',
        on_delete=models.CASCADE,
        related_name='staff_members'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'hospital_staff'
        verbose_name = 'Hospital Staff'
        verbose_name_plural = 'Hospital Staff'

    def __str__(self):
        return f"{self.user.name} - {self.hospital.name}"
