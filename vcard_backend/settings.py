"""
Django settings for vcard_backend project.
"""

import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name):
    return [value.strip() for value in os.environ.get(name, "").split(",") if value.strip()]


RENDER = os.environ.get("RENDER") is not None

# SECURITY WARNING: keep the secret key used in production secret!
DEBUG = env_bool("DEBUG", False)
SECRET_KEY = os.environ.get("SECRET_KEY", "").strip()
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "django-insecure-local-dev-key"
    else:
        raise ImproperlyConfigured("SECRET_KEY must be set when DEBUG is False.")

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS")
if DEBUG:
    ALLOWED_HOSTS.extend(["127.0.0.1", "localhost"])
render_hostname = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if render_hostname and render_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_hostname)

CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")
if render_hostname:
    CSRF_TRUSTED_ORIGINS.append(f"https://{render_hostname}")
if DEBUG:
    CSRF_TRUSTED_ORIGINS.extend([
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    ])
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = env_bool("CORS_ALLOW_CREDENTIALS", True)
if DEBUG:
    CORS_ALLOWED_ORIGINS.extend([
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    ])
# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cloudinary_storage',
    'cloudinary',
    'vcards',
    'professional_cards',
    'card_designer',
    'rest_framework',
    'corsheaders',
    'tailwind',
    'theme',
    'django_browser_reload',
]

TAILWIND_APP_NAME = 'theme'
INTERNAL_IPS = [
    "127.0.0.1",
]
NPM_BIN_PATH = os.environ.get("NPM_BIN_PATH", "npm")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_CHAT_MODEL = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-mini")


MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
if DEBUG:
    MIDDLEWARE.append('django_browser_reload.middleware.BrowserReloadMiddleware')
ROOT_URLCONF = 'vcard_backend.urls'

TEMPLATES = [
{
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'vcard_backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Kathmandu'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Media files (uploaded files)
MEDIA_URL = f'{os.environ.get("MEDIA_URL", "/media/").rstrip("/")}/'
media_root = os.environ.get("MEDIA_ROOT", "").strip()
private_card_media_root = os.environ.get("PRIVATE_CARD_MEDIA_ROOT", "").strip()
MEDIA_ROOT = Path(media_root) if media_root else BASE_DIR / "media"
PRIVATE_CARD_MEDIA_ROOT = (
    Path(private_card_media_root)
    if private_card_media_root
    else BASE_DIR / "private_card_media"
)
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
USE_CLOUDINARY_STORAGE = all(
    [CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]
)

if USE_CLOUDINARY_STORAGE:
    CLOUDINARY_STORAGE = {
        "CLOUD_NAME": CLOUDINARY_CLOUD_NAME,
        "API_KEY": CLOUDINARY_API_KEY,
        "API_SECRET": CLOUDINARY_API_SECRET,
    }


STATICFILES_DIRS = []
project_static_dir = BASE_DIR / "static"
if project_static_dir.exists():
    STATICFILES_DIRS.append(project_static_dir)

STORAGES = {
    "default": {
        "BACKEND": (
            "cloudinary_storage.storage.MediaCloudinaryStorage"
            if USE_CLOUDINARY_STORAGE
            else "django.core.files.storage.FileSystemStorage"
        ),
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

if not DEBUG:
    STORAGES["staticfiles"] = {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    }


EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() == "true"
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER or "webmaster@localhost",
)

SITE_NAME = os.environ.get("SITE_NAME", "Tap2Connect Nepal")
SITE_URL = os.environ.get("SITE_URL", "").strip().rstrip("/")

LOGIN_URL = "/login/"
LOGIN_REDIRECT_URL = "/dashboard/"


# Production security behind an explicitly configured HTTPS reverse proxy.
if env_bool("TRUST_X_FORWARDED_PROTO", False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", not DEBUG)
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SAMESITE = os.environ.get("CSRF_COOKIE_SAMESITE", "Lax")
SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", False)

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
    },
}


