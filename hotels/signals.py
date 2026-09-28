from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Hotel, HotelFeatureSettings, HotelPackageEntitlement


@receiver(post_save, sender=Hotel)
def ensure_hotel_feature_settings(sender, instance, created, **kwargs):
    if created:
        HotelFeatureSettings.objects.get_or_create(hotel=instance)
        HotelPackageEntitlement.objects.get_or_create(hotel=instance)
