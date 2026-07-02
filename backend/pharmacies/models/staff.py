from django.db import models
from django.conf import settings
import uuid

class PharmacyStaff(models.Model):
    """Pharmacy staff user mapped to a pharmacy tenant."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pharmacy_staff'
    )
    pharmacy = models.ForeignKey(
        'pharmacies.Pharmacy',
        on_delete=models.CASCADE,
        related_name='staff_members'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pharmacy_staff'
        verbose_name = 'Pharmacy Staff'
        verbose_name_plural = 'Pharmacy Staff'

    def __str__(self):
        return f"{self.user.name} - {self.pharmacy.name}"
