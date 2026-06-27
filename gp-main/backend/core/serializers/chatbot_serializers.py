from rest_framework import serializers

from core.models import ChatConversation, ChatMessage, TemplateAISettings


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'role',
            'content',
            'model_name',
            'safety_flags',
            'metadata',
            'created_at',
        ]
        read_only_fields = fields


class ChatConversationSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatConversation
        fields = [
            'id',
            'visitor_id',
            'locale',
            'title',
            'status',
            'last_risk_level',
            'last_suggested_conditions',
            'last_recommended_specialties',
            'metadata',
            'created_at',
            'updated_at',
            'messages',
        ]
        read_only_fields = fields


class TemplateAISettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateAISettings
        fields = [
            'id',
            'enabled',
            'provider',
            'model_id',
            'system_prompt_version',
            'disclaimer',
            'max_history_messages',
            'max_new_tokens',
            'temperature',
            'per_ip_rate_limit',
            'rate_limit_window_seconds',
            'follow_up_question_limit',
            'specialty_catalog',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChatbotRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000)
    conversation_id = serializers.UUIDField(required=False)
    subdomain = serializers.CharField(max_length=255, required=False, allow_blank=True)
    visitor_id = serializers.CharField(max_length=128, required=False, allow_blank=True)
    locale = serializers.CharField(max_length=16, required=False, default='en')
    stream = serializers.BooleanField(required=False, default=False)
    patient_profile = serializers.JSONField(required=False)

    def validate_message(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Message is required.')
        return value
