from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Set

from django.utils import timezone

PLAN_TYPE_BASIC = 'BASIC'
PLAN_TYPE_STANDARD = 'STANDARD'
PLAN_TYPE_AI = 'AI'
PLAN_TYPE_PREMIUM = 'PREMIUM'

SUBSCRIPTION_ACTIVE = 'ACTIVE'
SUBSCRIPTION_INACTIVE = 'INACTIVE'
SUBSCRIPTION_EXPIRED = 'EXPIRED'
SUBSCRIPTION_CANCELLED = 'CANCELLED'
SUBSCRIPTION_PENDING = 'PENDING'

PLAN_TYPE_CHOICES = (
    (PLAN_TYPE_BASIC, 'Basic'),
    (PLAN_TYPE_STANDARD, 'Premium'),
    (PLAN_TYPE_AI, 'AI'),
    (PLAN_TYPE_PREMIUM, 'Premium'),
)

SUBSCRIPTION_STATUS_CHOICES = (
    (SUBSCRIPTION_ACTIVE, 'Active'),
    (SUBSCRIPTION_INACTIVE, 'Inactive'),
    (SUBSCRIPTION_EXPIRED, 'Expired'),
    (SUBSCRIPTION_CANCELLED, 'Cancelled'),
    (SUBSCRIPTION_PENDING, 'Pending'),
)

ONE_TIME_FEATURES: Set[str] = {
    'ambulance_ordering',
    'custom_theme',
}

PLAN_FEATURES = {
    PLAN_TYPE_BASIC: set(),
    PLAN_TYPE_STANDARD: {'review_system', 'ai_chatbot', 'patient_portal', 'prescription_refill'},
    PLAN_TYPE_AI: {'ai_chatbot'},
    PLAN_TYPE_PREMIUM: {
        'review_system',
        'ai_chatbot',
        'patient_portal',
        'prescription_refill',
        'ambulance_ordering',
        'custom_theme',
    },
}

THEME_FEATURE_KEYS = {
    'custom_theme': {
        'primaryColor',
        'backgroundColor',
        'fontFamily',
        'fontSize',
        'fontStyle',
        'textColor',
        'mutedTextColor',
        'surfaceColor',
        'surfaceAltColor',
        'borderColor',
        'linkColor',
        'buttonPrimaryColor',
        'buttonPrimaryTextColor',
        'buttonPrimaryHoverColor',
        'buttonSecondaryColor',
        'buttonSecondaryTextColor',
        'buttonSecondaryBorderColor',
        'buttonSecondaryHoverColor',
        'inputBackgroundColor',
        'inputBorderColor',
        'inputFocusColor',
        'borderRadius',
        'emergencyNumber',
    },
    'ai_chatbot': {'chatbotName', 'chatbotColor'},
}


@dataclass(frozen=True)
class PlanAccess:
    plan_type: str
    is_active: bool
    allowed_features: List[str]


def _normalize_plan_type(plan_type: str | None) -> str:
    if plan_type in PLAN_FEATURES:
        return plan_type
    return PLAN_TYPE_BASIC


def _normalize_one_time_features(values: Iterable[str] | None) -> List[str]:
    if not values:
        return []
    filtered = [value for value in values if value in ONE_TIME_FEATURES]
    # Preserve order while de-duplicating
    seen = set()
    unique = []
    for value in filtered:
        if value in seen:
            continue
        seen.add(value)
        unique.append(value)
    return unique


def is_subscription_active(website_setup) -> bool:
    status = getattr(website_setup, 'subscription_status', SUBSCRIPTION_INACTIVE)
    if status != SUBSCRIPTION_ACTIVE:
        return False
    ends_at = getattr(website_setup, 'subscription_ends_at', None)
    if ends_at and ends_at <= timezone.now():
        return False
    return True


def resolve_allowed_features(*, plan_type: str, subscription_status: str, subscription_ends_at, one_time_features: Iterable[str] | None) -> PlanAccess:
    normalized_plan = _normalize_plan_type(plan_type)
    active = subscription_status == SUBSCRIPTION_ACTIVE
    if subscription_ends_at and subscription_ends_at <= timezone.now():
        active = False
    allowed: Set[str] = set()
    if active:
        allowed |= PLAN_FEATURES.get(normalized_plan, set())
    allowed |= set(_normalize_one_time_features(one_time_features))
    return PlanAccess(plan_type=normalized_plan, is_active=active, allowed_features=sorted(allowed))


def get_allowed_features(website_setup) -> PlanAccess:
    return resolve_allowed_features(
        plan_type=getattr(website_setup, 'plan_type', PLAN_TYPE_BASIC),
        subscription_status=getattr(website_setup, 'subscription_status', SUBSCRIPTION_INACTIVE),
        subscription_ends_at=getattr(website_setup, 'subscription_ends_at', None),
        one_time_features=getattr(website_setup, 'one_time_features', None),
    )


def has_feature_access(website_setup, feature: str) -> bool:
    access = get_allowed_features(website_setup)
    return feature in access.allowed_features


def can_publish_hospital(website_setup) -> bool:
    access = get_allowed_features(website_setup)
    if access.is_active:
        return True
    one_time_features = getattr(website_setup, 'one_time_features', []) or []
    if one_time_features:
        return True
    # Legacy support for one-time payments stored as is_paid
    if getattr(website_setup, 'is_paid', False):
        return True
    return False


def required_theme_features(theme_settings: dict | None) -> Set[str]:
    if not theme_settings:
        return set()
    required = set()
    for feature, keys in THEME_FEATURE_KEYS.items():
        if any(key in theme_settings for key in keys):
            required.add(feature)
    return required
