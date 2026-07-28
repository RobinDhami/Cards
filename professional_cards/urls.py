from django.urls import path

from . import views
from vcard_backend.react_views import react_app

app_name = 'professional_cards'

urlpatterns = [
    path('dashboard/professional-cards/', react_app, name='list'),
    path('dashboard/professional-cards/add/', react_app, name='create'),
    path('dashboard/professional-cards/<int:pk>/edit/', react_app, name='edit'),
    path('dashboard/professional-cards/<int:pk>/delete/', react_app, name='delete'),
    path('p/<slug:slug>/', react_app, name='public_profile'),
    path('p/<slug:slug>/edit-login/', react_app, name='edit_login'),
    path('p/<slug:slug>/edit/', react_app, name='owner_edit'),
    path('p/<slug:slug>/vcard/', views.professional_vcard, name='vcard'),
    path('p/<slug:slug>/qr.png', views.professional_qr_code, name='qr_code'),
    path('api/professions/', views.profession_suggestions_api, name='profession_suggestions_api'),
    path('api/professional-profiles/<slug:slug>/', views.public_professional_profile_api, name='public_profile_api'),
]
