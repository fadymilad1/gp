from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ChatConversation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('visitor_id', models.CharField(blank=True, max_length=128)),
                ('locale', models.CharField(default='en', max_length=16)),
                ('title', models.CharField(blank=True, max_length=255)),
                ('status', models.CharField(choices=[('open', 'Open'), ('closed', 'Closed'), ('escalated', 'Escalated')], default='open', max_length=16)),
                ('last_risk_level', models.CharField(default='routine', max_length=32)),
                ('last_suggested_conditions', models.JSONField(blank=True, default=list)),
                ('last_recommended_specialties', models.JSONField(blank=True, default=list)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('website_setup', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chat_conversations', to='core.websitesetup')),
            ],
            options={
                'db_table': 'chat_conversations',
                'ordering': ['-updated_at'],
            },
        ),
        migrations.CreateModel(
            name='TemplateAISettings',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('enabled', models.BooleanField(default=True)),
                ('provider', models.CharField(choices=[('huggingface', 'Hugging Face')], default='huggingface', max_length=32)),
                ('model_id', models.CharField(default='biso2006/phi3-medical-diagnosis', max_length=255)),
                ('system_prompt_version', models.CharField(default='medical-v1', max_length=64)),
                ('disclaimer', models.TextField(default='Medical disclaimer: This assistant provides general educational information only. It does not replace a doctor, pharmacist, or emergency care. If symptoms are severe, worsening, or urgent, seek in-person medical attention immediately.')),
                ('max_history_messages', models.PositiveSmallIntegerField(default=8)),
                ('max_new_tokens', models.PositiveIntegerField(default=450)),
                ('temperature', models.DecimalField(decimal_places=2, default=0.2, max_digits=4)),
                ('per_ip_rate_limit', models.PositiveIntegerField(default=20)),
                ('rate_limit_window_seconds', models.PositiveIntegerField(default=60)),
                ('follow_up_question_limit', models.PositiveSmallIntegerField(default=3)),
                ('specialty_catalog', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('website_setup', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='ai_settings', to='core.websitesetup')),
            ],
            options={
                'db_table': 'template_ai_settings',
            },
        ),
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('system', 'System'), ('user', 'User'), ('assistant', 'Assistant')], max_length=16)),
                ('content', models.TextField()),
                ('model_name', models.CharField(blank=True, max_length=255)),
                ('safety_flags', models.JSONField(blank=True, default=dict)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='core.chatconversation')),
            ],
            options={
                'db_table': 'chat_messages',
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='chatconversation',
            index=models.Index(fields=['website_setup', 'updated_at'], name='chat_conver_website_31d4df_idx'),
        ),
        migrations.AddIndex(
            model_name='chatconversation',
            index=models.Index(fields=['website_setup', 'visitor_id'], name='chat_conver_website_eb9b6e_idx'),
        ),
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['conversation', 'created_at'], name='chat_messag_convers_913d16_idx'),
        ),
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['role'], name='chat_messag_role_2fdd3c_idx'),
        ),
    ]
