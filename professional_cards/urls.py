from django.urls import path

from . import views

app_name = 'professional_cards'

urlpatterns = [
    path('dashboard/professional-cards/', views.professional_profile_list, name='list'),
    path('dashboard/professional-cards/add/', views.professional_profile_create, name='create'),
    path('dashboard/professional-cards/<int:pk>/edit/', views.professional_profile_edit, name='edit'),
    path('dashboard/professional-cards/<int:pk>/delete/', views.professional_profile_delete, name='delete'),
    path('p/<slug:slug>/', views.public_professional_profile, name='public_profile'),
    path('p/<slug:slug>/vcard/', views.professional_vcard, name='vcard'),
    path('p/<slug:slug>/qr.png', views.professional_qr_code, name='qr_code'),
]
