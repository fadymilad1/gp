import json
import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable
from urllib import error, request

from django.conf import settings
from django.core.cache import cache
from huggingface_hub import InferenceClient

from core.models import ChatMessage, TemplateAISettings


DEFAULT_MEDICAL_DISCLAIMER = (
    'Medical disclaimer: This assistant provides general educational information only and '
    'is not a medical diagnosis. It cannot replace a doctor, pharmacist, or emergency care. '
    'If symptoms are severe, worsening, or urgent, seek in-person medical attention immediately.'
)

EMERGENCY_KEYWORDS = {
    'chest pain',
    'difficulty breathing',
    'shortness of breath',
    'severe bleeding',
    'stroke',
    'face drooping',
    'slurred speech',
    'loss of consciousness',
    'seizure',
    'anaphylaxis',
    'suicidal',
    'blue lips',
    'pregnancy bleeding',
}

SPECIALTY_KEYWORDS = {
    'Cardiology': ['chest pain', 'palpitations', 'heart', 'blood pressure'],
    'Pulmonology': ['cough', 'breathing', 'wheezing', 'asthma'],
    'Neurology': ['headache', 'migraine', 'dizziness', 'numbness', 'seizure'],
    'Dermatology': ['rash', 'itching', 'skin', 'eczema'],
    'Gastroenterology': ['nausea', 'vomiting', 'diarrhea', 'abdominal', 'stomach'],
    'ENT': ['sore throat', 'ear pain', 'sinus', 'congestion'],
    'Endocrinology': ['blood sugar', 'thyroid', 'fatigue', 'weight loss'],
    'Orthopedics': ['joint pain', 'back pain', 'swelling', 'injury'],
    'General Practice': ['fever', 'fatigue', 'body aches', 'infection'],
}

SYSTEM_PROMPT_TEMPLATE = """You are MedifyCare, a cautious medical triage assistant embedded inside a healthcare website.

Your job:
- Collect symptoms and ask focused follow-up questions when history is incomplete.
- Suggest a short differential of possible conditions, clearly marked as possibilities rather than diagnoses.
- Recommend the most relevant medical specialties.
- Give general self-care or next-step guidance appropriate for non-emergency use.
- Escalate to urgent or emergency care when red flags are present.

Safety rules:
- Never claim certainty or provide a definitive diagnosis.
- Never recommend prescription-only treatment plans or medication dosing.
- Never ignore emergency symptoms.
- State uncertainty explicitly when symptoms are broad or incomplete.
- Keep the answer concise, structured, and medically responsible.
- Always include the exact disclaimer from the tenant settings.

Output valid JSON only with this schema:
{
  \"answer\": string,
  \"follow_up_questions\": string[],
  \"possible_conditions\": string[],
  \"recommended_specialties\": string[],
  \"guidance\": string[],
  \"urgency\": \"self_care\" | \"routine\" | \"urgent\" | \"emergency\",
  \"seek_emergency_care\": boolean,
  \"confidence_note\": string,
  \"disclaimer\": string
}
"""


class ChatbotServiceError(Exception):
    pass


DEFAULT_SUPPORTED_MODELS = (
    'microsoft/Phi-3-mini-4k-instruct',
    'HuggingFaceH4/zephyr-7b-beta',
    'Qwen/Qwen2.5-7B-Instruct',
)


@dataclass
class ChatbotResponse:
    answer: str
    follow_up_questions: list[str]
    possible_conditions: list[str]
    recommended_specialties: list[str]
    guidance: list[str]
    urgency: str
    seek_emergency_care: bool
    confidence_note: str
    disclaimer: str
    raw_model_output: str

    def to_dict(self) -> dict:
        return {
            'answer': self.answer,
            'follow_up_questions': self.follow_up_questions,
            'possible_conditions': self.possible_conditions,
            'recommended_specialties': self.recommended_specialties,
            'guidance': self.guidance,
            'urgency': self.urgency,
            'seek_emergency_care': self.seek_emergency_care,
            'confidence_note': self.confidence_note,
            'disclaimer': self.disclaimer,
            'raw_model_output': self.raw_model_output,
        }


class MedicalChatbotService:
    @classmethod
    def generate_response(
        cls,
        *,
        ai_settings: TemplateAISettings,
        history: Iterable[ChatMessage],
        user_message: str,
        patient_profile: dict | None = None,
    ) -> ChatbotResponse:
        prompt = cls._build_prompt(
            ai_settings=ai_settings,
            history=history,
            user_message=user_message,
            patient_profile=patient_profile or {},
        )
        raw_text = cls._call_huggingface(prompt=prompt, ai_settings=ai_settings)
        parsed = cls._parse_json_response(raw_text)
        urgency = cls._normalize_urgency(parsed.get('urgency'))
        emergency = cls._contains_emergency_language(user_message) or bool(parsed.get('seek_emergency_care'))
        if emergency and urgency != 'emergency':
            urgency = 'emergency'

        possible_conditions = cls._normalize_string_list(parsed.get('possible_conditions'))[:3]
        recommended_specialties = cls._normalize_string_list(parsed.get('recommended_specialties'))[:3]
        if not recommended_specialties:
            recommended_specialties = cls._infer_specialties(user_message)

        follow_up_questions = cls._normalize_string_list(parsed.get('follow_up_questions'))[: ai_settings.follow_up_question_limit]
        if not follow_up_questions and urgency != 'emergency':
            follow_up_questions = cls._default_follow_up_questions(user_message)[: ai_settings.follow_up_question_limit]

        guidance = cls._normalize_string_list(parsed.get('guidance'))[:4]
        if emergency:
            guidance = [
                'Seek emergency medical care now or contact local emergency services.',
                'Do not rely on the chatbot for urgent symptom management.',
            ]

        disclaimer = str(parsed.get('disclaimer') or ai_settings.disclaimer or DEFAULT_MEDICAL_DISCLAIMER).strip()
        answer = str(parsed.get('answer') or raw_text).strip()
        confidence_note = str(
            parsed.get('confidence_note')
            or 'This is an initial triage-style summary based on limited information and may be incomplete.'
        ).strip()

        if disclaimer not in answer:
            answer = f'{answer}\n\n{disclaimer}'

        return ChatbotResponse(
            answer=answer,
            follow_up_questions=follow_up_questions,
            possible_conditions=possible_conditions,
            recommended_specialties=recommended_specialties,
            guidance=guidance,
            urgency=urgency,
            seek_emergency_care=emergency,
            confidence_note=confidence_note,
            disclaimer=disclaimer,
            raw_model_output=raw_text,
        )

    @classmethod
    def stream_chunks(cls, text: str, chunk_size: int | None = None) -> Iterable[str]:
        size = chunk_size or getattr(settings, 'CHATBOT_STREAM_CHUNK_SIZE', 28)
        for index in range(0, len(text), size):
            yield text[index:index + size]

    @classmethod
    def generate_fallback_response(
        cls,
        *,
        ai_settings: TemplateAISettings,
        user_message: str,
        reason: str = '',
    ) -> ChatbotResponse:
        emergency = cls._contains_emergency_language(user_message)
        urgency = 'emergency' if emergency else 'routine'
        disclaimer = (ai_settings.disclaimer or DEFAULT_MEDICAL_DISCLAIMER).strip()

        if emergency:
            answer = (
                'Your symptoms may need urgent in-person evaluation. '
                'Please contact local emergency services now, or go to the nearest emergency department.'
            )
            guidance = [
                'Seek emergency care immediately.',
                'Do not rely on online triage for severe or rapidly worsening symptoms.',
            ]
            follow_up_questions: list[str] = []
        else:
            answer = (
                'Thanks for sharing your symptoms. I can provide an initial triage-style summary and next steps, '
                'but this should not replace professional medical evaluation.'
            )
            guidance = [
                'Monitor symptom progression (duration, severity, and new symptoms).',
                'Arrange a clinical review if symptoms persist, worsen, or interfere with daily activities.',
            ]
            follow_up_questions = cls._default_follow_up_questions(user_message)[: ai_settings.follow_up_question_limit]

        if disclaimer not in answer:
            answer = f'{answer}\n\n{disclaimer}'

        note = 'Fallback response was used because the AI provider is temporarily unavailable.'
        if reason:
            note = f'{note} ({reason})'

        return ChatbotResponse(
            answer=answer,
            follow_up_questions=follow_up_questions,
            possible_conditions=[],
            recommended_specialties=cls._infer_specialties(user_message),
            guidance=guidance,
            urgency=urgency,
            seek_emergency_care=emergency,
            confidence_note=note,
            disclaimer=disclaimer,
            raw_model_output='',
        )

    @classmethod
    def _build_prompt(
        cls,
        *,
        ai_settings: TemplateAISettings,
        history: Iterable[ChatMessage],
        user_message: str,
        patient_profile: dict,
    ) -> str:
        prior_messages = list(history)[-ai_settings.max_history_messages :]
        transcript_lines = []
        for message in prior_messages:
            transcript_lines.append(f'{message.role.upper()}: {message.content}')

        profile_json = json.dumps(patient_profile, ensure_ascii=True) if patient_profile else '{}'
        transcript = '\n'.join(transcript_lines) if transcript_lines else 'No previous messages.'

        return (
            f'{SYSTEM_PROMPT_TEMPLATE}\n'
            f'Tenant disclaimer: {ai_settings.disclaimer or DEFAULT_MEDICAL_DISCLAIMER}\n'
            f'Model version: {ai_settings.system_prompt_version}\n'
            f'Patient profile JSON: {profile_json}\n'
            f'Conversation transcript:\n{transcript}\n\n'
            f'Latest patient message: {user_message}\n'
            'Respond with safe triage-oriented JSON only.'
        )

    @classmethod
    def _call_huggingface(cls, *, prompt: str, ai_settings: TemplateAISettings) -> str:
        token = getattr(settings, 'HUGGINGFACE_API_TOKEN', '')
        if not token:
            raise ChatbotServiceError('HUGGINGFACE_API_TOKEN is not configured.')

        configured_model = getattr(settings, 'HF_MEDICAL_MODEL_ID', DEFAULT_SUPPORTED_MODELS[0])
        candidate_models: list[str] = []
        router_models = cls._discover_router_models(token)
        for model_name in [ai_settings.model_id, configured_model, *DEFAULT_SUPPORTED_MODELS, *router_models]:
            cleaned = str(model_name or '').strip()
            if cleaned and cleaned not in candidate_models:
                candidate_models.append(cleaned)

        api_url = getattr(settings, 'HUGGINGFACE_API_URL', 'https://router.huggingface.co/v1/chat/completions')
        timeout = getattr(settings, 'CHATBOT_HTTP_TIMEOUT', 60)
        client = InferenceClient(api_key=token)
        errors: list[str] = []

        for model_id in candidate_models:
            try:
                result = client.text_generation(
                    prompt,
                    model=model_id,
                    max_new_tokens=ai_settings.max_new_tokens,
                    temperature=float(ai_settings.temperature or Decimal('0.20')),
                    return_full_text=False,
                )
                if isinstance(result, str) and result.strip():
                    return result.strip()
            except Exception as exc:
                client_error = str(exc)
            else:
                client_error = 'Empty response from Hugging Face model.'

            # Some providers expose a model only for conversational/chat tasks.
            try:
                chat_api = getattr(client, 'chat', None)
                completions_api = getattr(chat_api, 'completions', None) if chat_api else None
                create_api = getattr(completions_api, 'create', None) if completions_api else None
                if callable(create_api):
                    chat_result = create_api(
                        model=model_id,
                        messages=[{'role': 'user', 'content': prompt}],
                        max_tokens=ai_settings.max_new_tokens,
                        temperature=float(ai_settings.temperature or Decimal('0.20')),
                    )
                    if chat_result is not None:
                        choices = getattr(chat_result, 'choices', None)
                        if choices and len(choices) > 0:
                            first = choices[0]
                            message = getattr(first, 'message', None)
                            content = getattr(message, 'content', None) if message is not None else None
                            if isinstance(content, str) and content.strip():
                                return content.strip()
            except Exception as exc:
                client_error = str(exc)

            payload = json.dumps(
                {
                    'model': model_id,
                    'messages': [
                        {
                            'role': 'user',
                            'content': prompt,
                        }
                    ],
                    'stream': False,
                    'max_tokens': ai_settings.max_new_tokens,
                    'temperature': float(ai_settings.temperature or Decimal('0.20')),
                }
            ).encode('utf-8')

            req = request.Request(
                api_url,
                data=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json',
                },
                method='POST',
            )

            try:
                with request.urlopen(req, timeout=timeout) as response:
                    body = response.read().decode('utf-8')
            except error.HTTPError as exc:
                details = exc.read().decode('utf-8', errors='ignore')
                errors.append(
                    f"model '{model_id}' failed: Hugging Face client failed: {client_error}. "
                    f'Router request failed: {exc.code} {details}'
                )
                continue
            except error.URLError:
                errors.append(
                    f"model '{model_id}' failed: Hugging Face client failed: {client_error}. "
                    'Router request failed due to a network error.'
                )
                continue

            try:
                parsed = json.loads(body)
            except json.JSONDecodeError:
                cleaned_body = body.strip()
                if cleaned_body:
                    return cleaned_body
                errors.append(f"model '{model_id}' failed: empty text response.")
                continue

            if isinstance(parsed, dict) and parsed.get('error'):
                errors.append(f"model '{model_id}' failed: {parsed['error']}")
                continue

            if isinstance(parsed, dict):
                choices = parsed.get('choices')
                if isinstance(choices, list) and choices:
                    first = choices[0]
                    if isinstance(first, dict):
                        message = first.get('message')
                        if isinstance(message, dict):
                            content = message.get('content')
                            if isinstance(content, str) and content.strip():
                                return content.strip()

                generated = parsed.get('generated_text') or parsed.get('answer')
                if isinstance(generated, str) and generated.strip():
                    return generated.strip()

            if isinstance(parsed, list) and parsed:
                first = parsed[0]
                if isinstance(first, dict):
                    generated = first.get('generated_text') or first.get('summary_text')
                    if isinstance(generated, str) and generated.strip():
                        return generated.strip()

            cleaned_body = body.strip()
            if cleaned_body:
                return cleaned_body

            errors.append(f"model '{model_id}' failed: no usable content returned.")

        raise ChatbotServiceError('All configured Hugging Face models failed. ' + ' | '.join(errors))

    @classmethod
    def _discover_router_models(cls, token: str) -> list[str]:
        cache_key = 'chatbot:router_models'
        cached = cache.get(cache_key)
        if isinstance(cached, list) and cached:
            return [str(item) for item in cached if str(item).strip()]

        req = request.Request(
            'https://router.huggingface.co/v1/models',
            headers={'Authorization': f'Bearer {token}'},
            method='GET',
        )
        try:
            with request.urlopen(req, timeout=getattr(settings, 'CHATBOT_HTTP_TIMEOUT', 60)) as response:
                body = response.read().decode('utf-8')
        except Exception:
            return []

        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            return []

        data = parsed.get('data') if isinstance(parsed, dict) else []
        if not isinstance(data, list):
            return []

        discovered: list[str] = []
        for entry in data:
            if not isinstance(entry, dict):
                continue

            model_id = str(entry.get('id') or '').strip()
            if not model_id:
                continue

            providers = entry.get('providers')
            if isinstance(providers, list):
                live_provider = any(isinstance(p, dict) and str(p.get('status', '')).lower() == 'live' for p in providers)
                if not live_provider:
                    continue

            if model_id in discovered:
                continue
            discovered.append(model_id)
            if len(discovered) >= 8:
                break

        if discovered:
            cache.set(cache_key, discovered, timeout=60 * 60)
        return discovered

    @classmethod
    def _parse_json_response(cls, raw_text: str) -> dict:
        candidate = raw_text.strip()
        if candidate.startswith('{') and candidate.endswith('}'):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

        match = re.search(r'\{.*\}', candidate, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

        return {
            'answer': candidate,
            'follow_up_questions': cls._default_follow_up_questions(candidate),
            'possible_conditions': [],
            'recommended_specialties': cls._infer_specialties(candidate),
            'guidance': [
                'Monitor symptoms and seek in-person medical care if they worsen or persist.',
            ],
            'urgency': 'routine',
            'seek_emergency_care': cls._contains_emergency_language(candidate),
            'confidence_note': 'The model did not return structured JSON, so a safe fallback response was used.',
            'disclaimer': DEFAULT_MEDICAL_DISCLAIMER,
        }

    @classmethod
    def _normalize_string_list(cls, value) -> list[str]:
        if isinstance(value, list):
            cleaned = []
            for item in value:
                text = str(item).strip()
                if text:
                    cleaned.append(text)
            return cleaned
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    @classmethod
    def _normalize_urgency(cls, value) -> str:
        normalized = str(value or 'routine').strip().lower()
        if normalized in {'self_care', 'routine', 'urgent', 'emergency'}:
            return normalized
        return 'routine'

    @classmethod
    def _contains_emergency_language(cls, text: str) -> bool:
        lowered = text.lower()
        return any(keyword in lowered for keyword in EMERGENCY_KEYWORDS)

    @classmethod
    def _infer_specialties(cls, text: str) -> list[str]:
        lowered = text.lower()
        matches = []
        for specialty, keywords in SPECIALTY_KEYWORDS.items():
            if any(keyword in lowered for keyword in keywords):
                matches.append(specialty)
        if not matches:
            matches.append('General Practice')
        return matches[:3]

    @classmethod
    def _default_follow_up_questions(cls, text: str) -> list[str]:
        lowered = text.lower()
        questions = [
            'When did the symptoms start, and are they getting better, worse, or staying the same?',
            'How severe are the symptoms, and are they constant or intermittent?',
        ]
        if 'fever' in lowered:
            questions.append('What temperature was recorded, and are there chills or dehydration signs?')
        elif 'pain' in lowered:
            questions.append('Where exactly is the pain, and does anything make it better or worse?')
        else:
            questions.append('Do you have any relevant medical conditions, allergies, or current medications?')
        return questions
