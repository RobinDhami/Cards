from django import views
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path, re_path
from django.views.static import serve as serve_media
from django.contrib import admin
from vcards.views import *
from vcards.views import dashboard_qr_export, dashboard_qr_export_download

urlpatterns = [
    path('',home,name='home'),
    path('robots.txt', robots_txt, name='robots_txt'),
    path('sitemap.xml', sitemap_xml, name='sitemap_xml'),
    path('', include('professional_cards.urls')),
    path('login/', dashboard_login, name='dashboard_login'),
    path('logout/', dashboard_logout, name='dashboard_logout'),
    path('profile/<int:student_id>/',profile,name='profile'),
    path('admin/', admin.site.urls),
    path('dashboard/', admin_dashboard, name='admin_dashboard'),
    path('dashboard/schools/', dashboard_schools, name='dashboard_schools'),
    path('dashboard/students/', dashboard_students, name='dashboard_students'),
    path('dashboard/teachers/', dashboard_teachers, name='dashboard_teachers'),
    path('dashboard/reports/', dashboard_reports, name='dashboard_reports'),
    path('dashboard/settings/', dashboard_settings, name='dashboard_settings'),
    path('dashboard/print/', dashboard_print, name='dashboard_print'),
    path('dashboard/qr-export/', dashboard_qr_export, name='dashboard_qr_export'),
    path('dashboard/print/preview/', dashboard_print_preview, name='dashboard_print_preview'),
    path('dashboard/print/export-pdf/', dashboard_print_export_pdf, name='dashboard_print_export_pdf'),
    path('dashboard/qr-export/download/', dashboard_qr_export_download, name='dashboard_qr_export_download'),
    path('dashboard/bulk-upload/', dashboard_bulk_upload, name='dashboard_bulk_upload'),
    path('dashboard/create/', add_user, name='add_user'),
    path('dashboard/college_details/<int:college_id>/', college_details, name='college_details'),
    path('dashboard/edit_college/<int:college_id>/', edit_college, name='edit_college'),
    path('dashboard/add_college/', add_college, name='add_college'),
    path('dashboard/delete_college/<int:college_id>/', delete_college, name='delete_college'),
    path('student/<int:student_id>/login/', edit_student_auth, name='edit_student_auth'),
    path('student/<int:student_id>/logout/', logout_student_edit, name='logout_student_edit'),
    path('student/<int:student_id>/manage/', student_owner_dashboard, name='student_owner_dashboard'),
    path('dashboard/edit/<int:student_id>/', edit_student, name='edit_student'),
    path('dashboard/student/<int:student_id>/credentials/', student_credentials, name='student_credentials'),
    path('dashboard/delete/<int:student_id>/', delete_student_profile, name='delete_student_profile'),
    path('dashboard/reset-password/<int:student_id>/', reset_student_password, name='reset_student_password'),
    path('dashboard/students/assign-usernames/', assign_school_usernames, name='assign_school_usernames'),
    path('bulk-upload/', bulk_upload, name='bulk_upload'),
    path('dashboard/college/<int:college_id>/add_student/', add_student_to_college, name='add_student_to_college'),
    path('student/<int:student_id>/', contact_card, name='contact_card'),
    path('student/<int:student_id>/contact-card/', student_digital_contact_card, name='student_contact_card'),
    path('student/<int:student_id>/action/<slug:action>/', track_contact_action, name='track_contact_action'),
    path('student/<int:student_id>/download-vcard/', download_vcard, name='download_vcard'),
    path('student/<int:student_id>/birth-certificate/', view_birth_certificate, name='view_birth_certificate'),
    path('student/<int:student_id>/print-preview/', print_card_preview, name='print_card_preview'),
    path('student/<int:student_id>/print-qr.png', print_qr_code, name='print_qr_code'),
    path('student/edit/<int:student_id>',edit_student_manual,name='edit_student_manual'),
    path('ai-chat/', ai_chat, name='ai_chat'),
    path('send-message/', send_site_message, name='send_message'),
    path('api/card/lookup/', api_card_lookup, name='api_card_lookup'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [path("__reload__/", include("django_browser_reload.urls"))]
elif settings.SERVE_MEDIA_FILES:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve_media, {'document_root': settings.MEDIA_ROOT}),
    ]
