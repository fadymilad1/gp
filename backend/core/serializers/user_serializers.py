from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from core.models import User


ACCOUNT_DELETE_CONFIRMATION_TEXT = 'DELETE'


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    is_staff = serializers.SerializerMethodField()
    pharmacy_id = serializers.SerializerMethodField()
    pharmacy_name = serializers.SerializerMethodField()
    pharmacy_logo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'name',
            'business_type',
            'google_oauth_id',
            'is_onboarding_completed',
            'created_at',
            'is_staff',
            'pharmacy_id',
            'pharmacy_name',
            'pharmacy_logo',
        ]
        read_only_fields = ['id', 'created_at']

    def get_is_staff(self, obj):
        return hasattr(obj, 'pharmacy_staff') and obj.pharmacy_staff is not None

    def get_pharmacy_id(self, obj):
        if hasattr(obj, 'pharmacy_staff') and obj.pharmacy_staff:
            return str(obj.pharmacy_staff.pharmacy.id)
        return None

    def _resolve_pharmacy(self, obj):
        if hasattr(obj, 'pharmacy_staff') and obj.pharmacy_staff:
            return obj.pharmacy_staff.pharmacy
        if hasattr(obj, 'pharmacy_profile') and obj.pharmacy_profile:
            return obj.pharmacy_profile
        return None

    def get_pharmacy_name(self, obj):
        pharmacy = self._resolve_pharmacy(obj)
        if not pharmacy:
            return None

        # 1. Try to get from BusinessInfo (linked to WebsiteSetup)
        try:
            if pharmacy.website_setup and hasattr(pharmacy.website_setup, 'business_info'):
                binfo = pharmacy.website_setup.business_info
                if binfo and binfo.name:
                    return binfo.name
        except Exception:
            pass

        # 2. Fallback to Pharmacy model itself
        if pharmacy.name:
            return pharmacy.name

        # 3. Fallback to owner name
        if pharmacy.user:
            return pharmacy.user.name

        return None

    def get_pharmacy_logo(self, obj):
        pharmacy = self._resolve_pharmacy(obj)
        if not pharmacy:
            return None

        # 1. Try to get from BusinessInfo (linked to WebsiteSetup)
        try:
            if pharmacy.website_setup and hasattr(pharmacy.website_setup, 'business_info'):
                binfo = pharmacy.website_setup.business_info
                if binfo and binfo.logo:
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(binfo.logo.url)
                    return binfo.logo.url
        except Exception:
            pass

        # 2. Fallback to Pharmacy model itself
        if pharmacy.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(pharmacy.logo.url)
            return pharmacy.logo.url

        return None





class SignupSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'name', 'business_type']
        extra_kwargs = {
            'email': {'required': True},
            'name': {'required': True},
            'business_type': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['email'],  # Use email as username
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data['name'],
            business_type=validated_data['business_type'],
        )
        return user


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False)
    all_devices = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if not attrs.get('all_devices') and not attrs.get('refresh'):
            raise serializers.ValidationError({
                'refresh': 'Refresh token is required unless logging out all devices.',
            })
        return attrs


class DeleteAccountSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, trim_whitespace=False)
    confirmation_text = serializers.CharField(required=True)

    def validate_confirmation_text(self, value):
        if value.strip().upper() != ACCOUNT_DELETE_CONFIRMATION_TEXT:
            raise serializers.ValidationError(
                f'Confirmation text must be {ACCOUNT_DELETE_CONFIRMATION_TEXT}.',
            )
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError('Authentication required.')

        if attrs['email'].strip().lower() != user.email.lower():
            raise serializers.ValidationError({'email': 'Email confirmation does not match current account.'})

        if not user.check_password(attrs['password']):
            raise serializers.ValidationError({'password': 'Incorrect password.'})

        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetTokenValidationSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        trim_whitespace=False,
        validators=[validate_password],
    )
    password_confirm = serializers.CharField(write_only=True, required=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': "Password fields didn't match."})
        return attrs
