from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pharmacies', '0006_pharmacyorder_payment_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='pharmacy',
            name='google_sheet_url',
            field=models.URLField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='pharmacy',
            name='google_sheet_sync_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='pharmacy',
            name='google_sheet_last_synced_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
