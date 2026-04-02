from django import views
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from django.contrib import admin
from vcards.views import *

urlpatterns = [
    path('',home,name='home'),
    path('profile/<int:student_id>/',profile,name='profile'),
    path('admin/', admin.site.urls),
    path('dashboard/', admin_dashboard, name='admin_dashboard'),
    path('dashboard/create/', add_user, name='add_user'),
    path('dashboard/college_details/<int:college_id>/', college_details, name='college_details'),
    path('dashboard/edit_college/<int:college_id>/', edit_college, name='edit_college'),
    path('dashboard/add_college/', add_college, name='add_college'),
    path('dashboard/delete_college/<int:college_id>/', delete_college, name='delete_college'),
    path('student/<int:student_id>/login/', edit_student_auth, name='edit_student_auth'),
    path('student/<int:student_id>/logout/', logout_student_edit, name='logout_student_edit'),
    path('student/<int:student_id>/manage/', student_owner_dashboard, name='student_owner_dashboard'),
    path('dashboard/edit/<int:student_id>/', edit_student, name='edit_student'),
    path('bulk-upload/', bulk_upload, name='bulk_upload'),
    path('dashboard/college/<int:college_id>/add_student/', add_student_to_college, name='add_student_to_college'),
    path('student/<int:student_id>/', contact_card, name='contact_card'),
    path('student/<int:student_id>/action/<slug:action>/', track_contact_action, name='track_contact_action'),
    path('student/<int:student_id>/download-vcard/', download_vcard, name='download_vcard'),
    path('student/<int:student_id>/choose/', student_profile_choice, name='student_profile_choice'),
    path('student/<int:student_id>/contact-card/', contact_card, name='contact_card'),
    path('student/edit/<int:student_id>',edit_student_manual,name='edit_student_manual'),
    path('send-message/', send_message, name='send_message'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += [
        path("__reload__/", include("django_browser_reload.urls")),
    ]
