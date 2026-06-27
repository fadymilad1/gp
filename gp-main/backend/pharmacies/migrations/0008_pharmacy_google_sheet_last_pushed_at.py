from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pharmacies', '0007_pharmacy_google_sheet_sync'),
    ]

    operations = [
        migrations.AddField(
            model_name='pharmacy',
            name='google_sheet_last_pushed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
