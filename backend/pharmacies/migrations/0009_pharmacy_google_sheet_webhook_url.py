from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pharmacies', '0008_pharmacy_google_sheet_last_pushed_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='pharmacy',
            name='google_sheet_webhook_url',
            field=models.URLField(blank=True, default='', max_length=500),
        ),
    ]
