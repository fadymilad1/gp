import json
import time

from django.core.cache import cache
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import ChatConversation, ChatMessage, TemplateAISettings, WebsiteSetup
from core.serializers import ChatConversationSerializer, ChatbotRequestSerializer
from core.services.chatbot import ChatbotServiceError, MedicalChatbotService
from rag_model.rag_service import RAGService


class ChatbotAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        website_setup = self._resolve_website_setup(request)
        if isinstance(website_setup, Response):
            return website_setup

        conversation_id = request.query_params.get('conversation_id')
        if not conversation_id:
            return Response(
                {
                    'detail': 'conversation_id is required.',
                    'disclaimer': self._get_ai_settings(website_setup).disclaimer,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation = get_object_or_404(
            ChatConversation.objects.prefetch_related('messages'),
            id=conversation_id,
            website_setup=website_setup,
        )
        serializer = ChatConversationSerializer(conversation)
        return Response(
            {
                'conversation': serializer.data,
                'disclaimer': self._get_ai_settings(website_setup).disclaimer,
            }
        )

    def post(self, request):
        serializer = ChatbotRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        website_setup = self._resolve_website_setup(request, data.get('subdomain'))
        if isinstance(website_setup, Response):
            return website_setup

        # ── Subscription gate (hospital users only) ──────────────────────────
        # Pharmacy users use the RAG pipeline which is not plan-gated.
        if getattr(website_setup.user, 'business_type', '') == 'hospital':
            from core.services.subscription import has_feature_access
            if not has_feature_access(website_setup, 'ai_chatbot'):
                return Response(
                    {
                        'detail': (
                            'This feature is not included in your current plan. '
                            'Please upgrade your subscription to access the AI chatbot.'
                        ),
                        'code': 'FEATURE_LOCKED',
                        'feature': 'ai_chatbot',
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        ai_settings = self._get_ai_settings(website_setup)
        rate_limit_response = self._enforce_rate_limit(request, website_setup, ai_settings)
        if rate_limit_response is not None:
            return rate_limit_response


        conversation = self._get_or_create_conversation(
            website_setup=website_setup,
            conversation_id=data.get('conversation_id'),
            visitor_id=data.get('visitor_id', ''),
            locale=data.get('locale', 'en'),
        )

        user_message = ChatMessage.objects.create(
            conversation=conversation,
            role='user',
            content=data['message'],
            metadata={
                'visitor_id': data.get('visitor_id', ''),
                'patient_profile': data.get('patient_profile', {}),
            },
        )

        history = conversation.messages.exclude(id=user_message.id).order_by('created_at')

        # If this tenant is a pharmacy, prefer RAG-based answers (evidence-grounded)
        chatbot_response = None
        try:
            if getattr(website_setup.user, 'business_type', '') == 'pharmacy':
                rag = RAGService()
                rag_result = rag.ask(data['message'])
                # construct a lightweight ChatbotResponse-compatible object
                class _R:
                    pass

                _r = _R()
                _r.answer = rag_result.get('answer')
                _r.follow_up_questions = []
                _r.possible_conditions = []
                _r.recommended_specialties = []
                _r.guidance = []
                _r.urgency = 'routine'
                _r.seek_emergency_care = False
                _r.confidence_note = f"retrieval_confidence={rag_result.get('confidence', 0):.2f}"
                _r.disclaimer = ai_settings.disclaimer
                _r.raw_model_output = rag_result.get('raw_model_output', '')
                chatbot_response = _r
            else:
                chatbot_response = MedicalChatbotService.generate_response(
                    ai_settings=ai_settings,
                    history=history,
                    user_message=data['message'],
                    patient_profile=data.get('patient_profile'),
                )
        except ChatbotServiceError as exc:
            chatbot_response = MedicalChatbotService.generate_fallback_response(
                ai_settings=ai_settings,
                user_message=data['message'],
                reason=str(exc),
            )

        assistant_message = ChatMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=chatbot_response.answer,
            model_name=ai_settings.model_id,
            safety_flags={
                'urgency': chatbot_response.urgency,
                'seek_emergency_care': chatbot_response.seek_emergency_care,
            },
            metadata={
                'possible_conditions': chatbot_response.possible_conditions,
                'recommended_specialties': chatbot_response.recommended_specialties,
                'follow_up_questions': chatbot_response.follow_up_questions,
                'guidance': chatbot_response.guidance,
                'confidence_note': chatbot_response.confidence_note,
            },
        )

        conversation.last_risk_level = chatbot_response.urgency
        conversation.last_suggested_conditions = chatbot_response.possible_conditions
        conversation.last_recommended_specialties = chatbot_response.recommended_specialties
        conversation.title = conversation.title or data['message'][:80]
        conversation.metadata = {
            **conversation.metadata,
            'last_model': ai_settings.model_id,
            'last_disclaimer': chatbot_response.disclaimer,
        }
        conversation.save(update_fields=[
            'last_risk_level',
            'last_suggested_conditions',
            'last_recommended_specialties',
            'title',
            'metadata',
            'updated_at',
        ])

        payload = {
            'conversation_id': str(conversation.id),
            'message_id': str(assistant_message.id),
            'assistant': {
                'content': chatbot_response.answer,
                'follow_up_questions': chatbot_response.follow_up_questions,
                'possible_conditions': chatbot_response.possible_conditions,
                'recommended_specialties': chatbot_response.recommended_specialties,
                'guidance': chatbot_response.guidance,
                'urgency': chatbot_response.urgency,
                'seek_emergency_care': chatbot_response.seek_emergency_care,
                'confidence_note': chatbot_response.confidence_note,
                'disclaimer': chatbot_response.disclaimer,
            },
        }

        if data.get('stream'):
            return self._stream_payload(payload)

        return Response(payload, status=status.HTTP_200_OK)

    def _resolve_website_setup(self, request, subdomain=None):
        if request.user and request.user.is_authenticated:
            website_setup = WebsiteSetup.objects.filter(user=request.user).order_by('-updated_at').first()
            if not website_setup:
                return Response({'detail': 'Website setup not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            tenant_key = (subdomain or request.headers.get('X-Site-Subdomain') or '').strip()
            if not tenant_key:
                return Response(
                    {'detail': 'subdomain is required for public chatbot requests.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            website_setup = WebsiteSetup.objects.filter(subdomain=tenant_key).first()
            if not website_setup:
                return Response({'detail': 'Website setup not found.'}, status=status.HTTP_404_NOT_FOUND)

        ai_settings = self._get_ai_settings(website_setup)
        # Use tenant AI settings as the source of truth for chatbot availability.
        # WebsiteSetup.ai_chatbot defaults to False in older records and should not
        # hard-block chatbot requests when tenant settings are enabled.
        if not ai_settings.enabled:
            return Response(
                {
                    'detail': 'Chatbot is disabled for this website.',
                    'disclaimer': ai_settings.disclaimer,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return website_setup

    def _get_ai_settings(self, website_setup):
        settings_obj, _ = TemplateAISettings.objects.get_or_create(website_setup=website_setup)
        return settings_obj

    def _get_or_create_conversation(self, *, website_setup, conversation_id, visitor_id, locale):
        if conversation_id:
            return get_object_or_404(ChatConversation, id=conversation_id, website_setup=website_setup)
        return ChatConversation.objects.create(
            website_setup=website_setup,
            visitor_id=visitor_id or '',
            locale=locale or 'en',
        )

    def _enforce_rate_limit(self, request, website_setup, ai_settings):
        forwarded_for = request.headers.get('X-Forwarded-For', '')
        ip_address = forwarded_for.split(',')[0].strip() if forwarded_for else request.META.get('REMOTE_ADDR', 'anonymous')
        cache_key = f'chatbot-rate:{website_setup.id}:{ip_address}'
        now = int(time.time())
        window = int(ai_settings.rate_limit_window_seconds)
        limit = int(ai_settings.per_ip_rate_limit)
        record = cache.get(cache_key) or {'count': 0, 'reset_at': now + window}

        if now >= record['reset_at']:
            record = {'count': 0, 'reset_at': now + window}

        if record['count'] >= limit:
            retry_after = max(record['reset_at'] - now, 1)
            return Response(
                {
                    'detail': 'Rate limit exceeded. Please slow down and try again shortly.',
                    'retry_after_seconds': retry_after,
                    'disclaimer': ai_settings.disclaimer,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        record['count'] += 1
        cache.set(cache_key, record, timeout=window)
        return None

    def _stream_payload(self, payload):
        def event_stream():
            yield self._format_sse('meta', {'conversation_id': payload['conversation_id'], 'message_id': payload['message_id']})
            for chunk in MedicalChatbotService.stream_chunks(payload['assistant']['content']):
                yield self._format_sse('chunk', {'delta': chunk})
            final_payload = {k: v for k, v in payload.items() if k != 'message_id'}
            yield self._format_sse('done', final_payload)

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

    def _format_sse(self, event, data):
        return f'event: {event}\ndata: {json.dumps(data)}\n\n'
