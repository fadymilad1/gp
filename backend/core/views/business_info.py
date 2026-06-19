from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import WebsiteSetup, BusinessInfo
from core.serializers import BusinessInfoSerializer, BusinessInfoCreateUpdateSerializer
from core.services.subscription import can_publish_hospital


class BusinessInfoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BusinessInfo.objects.select_related('website_setup').filter(website_setup__user=self.request.user)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BusinessInfoCreateUpdateSerializer
        return BusinessInfoSerializer

    def get_object(self):
        website_setup, _ = WebsiteSetup.objects.get_or_create(
            user=self.request.user,
            defaults={'subdomain': self.request.user.email.split('@')[0]}
        )
        business_info, created = BusinessInfo.objects.get_or_create(website_setup=website_setup)
        return business_info

    def list(self, request, *args, **kwargs):
        business_info = self.get_object()
        serializer = self.get_serializer(business_info, context={'request': request})
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        website_setup, _ = WebsiteSetup.objects.get_or_create(
            user=request.user,
            defaults={'subdomain': request.user.email.split('@')[0]}
        )
        if BusinessInfo.objects.filter(website_setup=website_setup).exists():
            return Response(
                {'error': 'Business info already exists. Use update endpoint.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(website_setup=website_setup)
        business_info = BusinessInfo.objects.get(website_setup=website_setup)
        response_serializer = BusinessInfoSerializer(business_info, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        business_info = self.get_object()
        serializer = self.get_serializer(business_info, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response_serializer = BusinessInfoSerializer(business_info, context={'request': request})
        return Response(response_serializer.data)

    def partial_update(self, request, *args, **kwargs):
        # Handle PATCH requests to /business-info/ (without ID)
        # This is called by the frontend
        business_info = self.get_object()
        serializer = self.get_serializer(business_info, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response_serializer = BusinessInfoSerializer(business_info, context={'request': request})
        return Response(response_serializer.data)

    @action(detail=False, methods=['post'])
    def publish(self, request):
        """
        Publish the hospital website.
        Requires an active subscription OR a valid one-time payment.
        Returns HTTP 402 with code SUBSCRIPTION_REQUIRED if access is denied.
        """
        website_setup, _ = WebsiteSetup.objects.get_or_create(
            user=request.user,
            defaults={'subdomain': request.user.email.split('@')[0]}
        )

        if not can_publish_hospital(website_setup):
            return Response(
                {
                    'detail': (
                        'You need an active subscription or purchased plan to publish your '
                        'hospital website. Please upgrade your plan to continue.'
                    ),
                    'code': 'SUBSCRIPTION_REQUIRED',
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        business_info = self.get_object()
        business_info.is_published = True
        business_info.save()
        serializer = self.get_serializer(business_info, context={'request': request})
        return Response(serializer.data)
