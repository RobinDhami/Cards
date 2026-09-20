"""Small DRF serializers for the club-profile API.

The main application currently uses Django JsonResponse views rather than DRF
viewsets. Keeping serialization here makes the API payload rules reusable while
preserving that established routing/authentication pattern.
"""

from rest_framework import serializers

from .models import ClubMemberProfile, ClubMemberSocialLink, ClubProfileSettings, ClubSocialLink


class ClubProfileSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubProfileSettings
        fields = (
            'id', 'about', 'hero_left_text', 'hero_right_text', 'hero_quote',
            'cta_title', 'cta_subtitle', 'cta_button_label', 'is_public',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class ClubSocialLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubSocialLink
        fields = ('id', 'platform', 'url', 'label', 'is_visible', 'sort_order', 'created_at')
        read_only_fields = ('id', 'created_at')


class ClubMemberProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubMemberProfile
        fields = (
            'id', 'quote', 'show_email', 'show_phone', 'show_address',
            'show_social_media', 'enable_connect', 'enable_save_contact',
            'is_published', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class ClubMemberSocialLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubMemberSocialLink
        fields = ('id', 'platform', 'url', 'label', 'is_visible', 'sort_order', 'created_at')
        read_only_fields = ('id', 'created_at')
