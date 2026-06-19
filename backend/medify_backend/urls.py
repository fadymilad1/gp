"""
URL configuration for medify_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods


@require_http_methods(["GET"])
def root_view(request):
    """Root view redirecting to API"""
    return JsonResponse({
        'message': 'Medify Backend API',
        'api_root': '/api/',
        'admin': '/admin/',
        'status': 'running'
    })


urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/pharmacy/', include('pharmacies.urls')),
    path('api/hospital/', include('hospitals.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
