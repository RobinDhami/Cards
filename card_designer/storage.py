from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


@deconstructible
class PrivateCardMediaStorage(FileSystemStorage):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("location", settings.PRIVATE_CARD_MEDIA_ROOT)
        super().__init__(*args, **kwargs)

    def url(self, name):
        raise ValueError("Private card media does not have a public URL.")


private_card_media_storage = PrivateCardMediaStorage()

