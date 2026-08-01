from django.urls import path

from . import views


app_name = "card_designer"

urlpatterns = [
    path("bootstrap/", views.bootstrap, name="bootstrap"),
    path("designs/", views.designs, name="designs"),
    path("designs/<uuid:design_id>/", views.design_detail, name="design_detail"),
    path(
        "designs/<uuid:design_id>/revisions/",
        views.design_revisions,
        name="design_revisions",
    ),
    path(
        "designs/<uuid:design_id>/revisions/<int:version>/restore/",
        views.restore_design_revision,
        name="restore_design_revision",
    ),
    path("assets/", views.assets, name="assets"),
    path("assets/<uuid:asset_id>/", views.asset_detail, name="asset_detail"),
    path("assets/<uuid:asset_id>/file/", views.asset_file, name="asset_file"),
    path("templates/", views.templates, name="templates"),
    path(
        "templates/<uuid:template_id>/",
        views.template_detail,
        name="template_detail",
    ),
    path(
        "templates/<uuid:template_id>/use/",
        views.use_template,
        name="use_template",
    ),
    path(
        "templates/<uuid:template_id>/thumbnail/",
        views.template_thumbnail,
        name="template_thumbnail",
    ),
]

