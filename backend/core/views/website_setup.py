from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import WebsiteSetup
from core.serializers import WebsiteSetupSerializer
from core.services.subscription import (
    get_allowed_features,
    can_publish_hospital,
    SUBSCRIPTION_ACTIVE,
    SUBSCRIPTION_EXPIRED,
)


class WebsiteSetupViewSet(viewsets.ModelViewSet):
    serializer_class = WebsiteSetupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WebsiteSetup.objects.filter(user=self.request.user)

    def get_object(self):
        setup, created = WebsiteSetup.objects.get_or_create(user=self.request.user)
        return setup

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='subscription')
    def subscription(self, request):
        """
        GET /api/website-setups/subscription/
        Returns the current user's subscription state and allowed feature list.
        """
        setup, _ = WebsiteSetup.objects.get_or_create(user=request.user)
        if (
            setup.subscription_status == SUBSCRIPTION_ACTIVE
            and setup.subscription_ends_at
            and setup.subscription_ends_at <= timezone.now()
        ):
            setup.subscription_status = SUBSCRIPTION_EXPIRED
            setup.save(update_fields=['subscription_status', 'updated_at'])
        plan_access = get_allowed_features(setup)
        return Response({
            'plan_type': plan_access.plan_type,
            'subscription_status': getattr(setup, 'subscription_status', 'INACTIVE'),
            'subscription_ends_at': getattr(setup, 'subscription_ends_at', None),
            'is_active': plan_access.is_active,
            'allowed_features': plan_access.allowed_features,
            'can_publish': can_publish_hospital(setup),
        })
