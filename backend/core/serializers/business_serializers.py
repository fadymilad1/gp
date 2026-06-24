from rest_framework import serializers
from core.models import BusinessInfo


class BusinessInfoSerializer(serializers.ModelSerializer):
    """Serializer for BusinessInfo model"""
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = BusinessInfo
        fields = [
            'id', 'name', 'logo', 'logo_url', 'about', 'address', 'latitude',
            'longitude', 'contact_phone', 'contact_email', 'website',
            'years_of_experience', 'working_hours', 'is_published', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class BusinessInfoCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating BusinessInfo (without logo_url)"""
    # Explicitly allow blank so an empty string doesn't fail URL validation
    website = serializers.URLField(allow_blank=True, required=False)
    # name is optional on PATCH (partial update)
    name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = BusinessInfo
        fields = [
            'name', 'logo', 'about', 'address', 'latitude', 'longitude',
            'contact_phone', 'contact_email', 'website', 'years_of_experience', 'working_hours',
            'is_published'
        ]
