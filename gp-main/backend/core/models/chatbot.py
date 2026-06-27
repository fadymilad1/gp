from django.db import models
from .website import WebsiteSetup
import uuid


class TemplateAISettings(models.Model):
    """Tenant-level AI configuration for a purchased Medify template."""

    PROVIDER_CHOICES = [
        ('huggingface', 'Hugging Face'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    website_setup = models.OneToOneField(
        WebsiteSetup,
        on_delete=models.CASCADE,
        related_name='ai_settings',
    )
    enabled = models.BooleanField(default=True)
    provider = models.CharField(max_length=32, choices=PROVIDER_CHOICES, default='huggingface')
    model_id = models.CharField(max_length=255, default='microsoft/Phi-3-mini-4k-instruct')
    system_prompt_version = models.CharField(max_length=64, default='medical-v1')
    disclaimer = models.TextField(
        default=(
            'Medical disclaimer: This assistant provides general educational information only. '
            'It does not replace a doctor, pharmacist, or emergency care. If symptoms are severe, '
            'worsening, or urgent, seek in-person medical attention immediately.'
        )
    )
    max_history_messages = models.PositiveSmallIntegerField(default=8)
    max_new_tokens = models.PositiveIntegerField(default=450)
    temperature = models.DecimalField(max_digits=4, decimal_places=2, default=0.20)
    per_ip_rate_limit = models.PositiveIntegerField(default=20)
    rate_limit_window_seconds = models.PositiveIntegerField(default=60)
    follow_up_question_limit = models.PositiveSmallIntegerField(default=3)
    specialty_catalog = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'template_ai_settings'

    def __str__(self):
        return f'AI settings for {self.website_setup.subdomain or self.website_setup.user.email}'


class ChatConversation(models.Model):
    """Conversation history for public or authenticated website visitors."""

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('escalated', 'Escalated'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    website_setup = models.ForeignKey(
        WebsiteSetup,
        on_delete=models.CASCADE,
        related_name='chat_conversations',
    )
    visitor_id = models.CharField(max_length=128, blank=True)
    locale = models.CharField(max_length=16, default='en')
    title = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='open')
    last_risk_level = models.CharField(max_length=32, default='routine')
    last_suggested_conditions = models.JSONField(default=list, blank=True)
    last_recommended_specialties = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_conversations'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['website_setup', 'updated_at']),
            models.Index(fields=['website_setup', 'visitor_id']),
        ]

    def __str__(self):
        return f'Conversation {self.id} for {self.website_setup.subdomain or self.website_setup.user.email}'


class ChatMessage(models.Model):
    """Stored turns for model auditing, support review, and analytics."""

    ROLE_CHOICES = [
        ('system', 'System'),
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=16, choices=ROLE_CHOICES)
    content = models.TextField()
    model_name = models.CharField(max_length=255, blank=True)
    safety_flags = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f'{self.role} message in {self.conversation_id}'
