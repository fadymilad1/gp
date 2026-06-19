from django.contrib import admin

from core.models import ChatConversation, ChatMessage, TemplateAISettings


@admin.register(TemplateAISettings)
class TemplateAISettingsAdmin(admin.ModelAdmin):
	list_display = ('website_setup', 'enabled', 'provider', 'model_id', 'updated_at')
	list_filter = ('enabled', 'provider')
	search_fields = ('website_setup__subdomain', 'website_setup__user__email', 'model_id')


class ChatMessageInline(admin.TabularInline):
	model = ChatMessage
	extra = 0
	readonly_fields = ('role', 'content', 'model_name', 'safety_flags', 'metadata', 'created_at')
	can_delete = False


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
	list_display = ('id', 'website_setup', 'status', 'last_risk_level', 'updated_at')
	list_filter = ('status', 'last_risk_level')
	search_fields = ('id', 'website_setup__subdomain', 'website_setup__user__email', 'visitor_id')
	readonly_fields = ('created_at', 'updated_at', 'metadata')
	inlines = [ChatMessageInline]
