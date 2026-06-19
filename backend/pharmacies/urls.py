from django.urls import path, include
from rest_framework.routers import DefaultRouter
from pharmacies.views import PharmacyOrderViewSet, PharmacyViewSet, ProductViewSet

router = DefaultRouter()
router.register(r'pharmacies', PharmacyViewSet, basename='pharmacy')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'orders', PharmacyOrderViewSet, basename='pharmacy-order')

urlpatterns = [
    path('', include(router.urls)),
]
