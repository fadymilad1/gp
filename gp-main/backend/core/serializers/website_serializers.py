from django.utils import timezone
from rest_framework import serializers
from .user_serializers import UserSerializer
from core.models import WebsiteSetup
from core.services.subscription import (
    get_allowed_features,
    can_publish_hospital,
    is_subscription_active,
    SUBSCRIPTION_ACTIVE,
    SUBSCRIPTION_CANCELLED,
    SUBSCRIPTION_EXPIRED,
    SUBSCRIPTION_INACTIVE,
    SUBSCRIPTION_PENDING,
)


class WebsiteSetupSerializer(serializers.ModelSerializer):
    """Serializer for WebsiteSetup model"""
    user = UserSerializer(read_only=True)
    allowed_features = serializers.SerializerMethodField()
    can_publish = serializers.SerializerMethodField()
    is_subscription_active = serializers.SerializerMethodField()

    class Meta:
        model = WebsiteSetup
        fields = [
            'id', 'user', 'subdomain',
            # Feature flags (boolean toggles on the model)
            'review_system', 'ai_chatbot', 'ambulance_ordering',
            'patient_portal', 'prescription_refill',
            # Template
            'template_id',
            # Payment (legacy)
            'is_paid', 'total_price',
            # Subscription
            'plan_type', 'subscription_status', 'subscription_ends_at', 'one_time_features',
            # Computed
            'allowed_features', 'can_publish', 'is_subscription_active',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'created_at', 'updated_at',
            'allowed_features', 'can_publish', 'is_subscription_active',
        ]

    def validate(self, attrs):
        instance = self.instance
        if not instance:
            return attrs

        subscription_fields = {'plan_type', 'subscription_status', 'subscription_ends_at'}
        if not subscription_fields.intersection(attrs.keys()):
            return attrs

        now = timezone.now()
        current_status = instance.subscription_status
        current_plan = instance.plan_type
        current_ends_at = instance.subscription_ends_at
        current_active = is_subscription_active(instance)

        incoming_status = attrs.get('subscription_status', current_status)
        incoming_plan = attrs.get('plan_type', current_plan)
        incoming_ends_at = attrs.get('subscription_ends_at', current_ends_at)

        if current_status == SUBSCRIPTION_ACTIVE and current_ends_at and current_ends_at <= now:
            current_status = SUBSCRIPTION_EXPIRED
            current_active = False

        if incoming_status == SUBSCRIPTION_ACTIVE and incoming_ends_at and incoming_ends_at <= now:
            raise serializers.ValidationError({
                'subscription_ends_at': 'Subscription end date must be in the future.'
            })

        if incoming_plan != current_plan and incoming_status in {
            SUBSCRIPTION_CANCELLED, SUBSCRIPTION_INACTIVE, SUBSCRIPTION_EXPIRED,
        }:
            raise serializers.ValidationError(
                'Cancel your current plan before subscribing to another plan.'
            )

        if current_status == SUBSCRIPTION_PENDING:
            if incoming_status in {SUBSCRIPTION_PENDING, SUBSCRIPTION_ACTIVE}:
                if incoming_plan != current_plan:
                    raise serializers.ValidationError(
                        'Cancel your current plan before subscribing to another plan.'
                    )
            elif incoming_status not in {SUBSCRIPTION_CANCELLED, SUBSCRIPTION_INACTIVE}:
                raise serializers.ValidationError(
                    'Cancel your current plan before subscribing to another plan.'
                )

        if incoming_status == SUBSCRIPTION_PENDING:
            if current_active:
                raise serializers.ValidationError(
                    'Cancel your current plan before subscribing to another plan.'
                )

        if current_active:
            if incoming_status == SUBSCRIPTION_CANCELLED and incoming_plan == current_plan:
                return attrs
            if incoming_plan == current_plan:
                raise serializers.ValidationError('You already have an active subscription.')
            raise serializers.ValidationError(
                'Cancel your current plan before subscribing to another plan.'
            )

        return attrs

    def update(self, instance, validated_data):
        now = timezone.now()
        if (
            instance.subscription_status == SUBSCRIPTION_ACTIVE
            and instance.subscription_ends_at
            and instance.subscription_ends_at <= now
            and 'subscription_status' not in validated_data
        ):
            validated_data['subscription_status'] = SUBSCRIPTION_EXPIRED

        if validated_data.get('subscription_status') == SUBSCRIPTION_CANCELLED:
            validated_data.setdefault('subscription_ends_at', now)

        # Merge one_time_features (append new, don't replace existing purchases)
        if 'one_time_features' in validated_data:
            incoming = validated_data['one_time_features'] or []
            existing = list(instance.one_time_features or [])
            merged = list(dict.fromkeys(existing + incoming))  # deduplicated, order-preserved
            validated_data['one_time_features'] = merged

        return super().update(instance, validated_data)

    def get_allowed_features(self, obj) -> list:
        return get_allowed_features(obj).allowed_features

    def get_can_publish(self, obj) -> bool:
        return can_publish_hospital(obj)

    def get_is_subscription_active(self, obj) -> bool:
        return get_allowed_features(obj).is_active
