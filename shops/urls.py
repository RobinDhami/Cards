from django.urls import path

from . import views
from vcard_backend.react_views import react_app

app_name = 'shops'

urlpatterns = [
    path('<slug:store_slug>/', react_app, name='store_home'),
    path('<slug:store_slug>/products/', react_app, name='product_list'),
    path('<slug:store_slug>/product/<slug:product_slug>/', react_app, name='product_detail'),
    path('<slug:store_slug>/category/<slug:category_slug>/', react_app, name='category_detail'),
    path('<slug:store_slug>/cart/', react_app, name='cart'),
    path('<slug:store_slug>/cart/add/<int:product_id>/', views.cart_add, name='cart_add'),
    path('<slug:store_slug>/cart/update/<int:product_id>/', views.cart_update, name='cart_update'),
    path('<slug:store_slug>/checkout/', react_app, name='checkout'),
    path('<slug:store_slug>/order-success/<str:order_number>/', react_app, name='order_success'),
    path('<slug:store_slug>/track-order/', react_app, name='track_order'),
    path('<slug:store_slug>/owner/', react_app, name='owner_dashboard'),
    path('<slug:store_slug>/owner/orders/', react_app, name='owner_orders'),
    path('<slug:store_slug>/owner/products/', react_app, name='owner_products'),
    path('<slug:store_slug>/owner/products/new/', react_app, name='owner_product_create'),
    path('<slug:store_slug>/owner/categories/', react_app, name='owner_categories'),
    path('<slug:store_slug>/owner/customers/', react_app, name='owner_customers'),
    path('<slug:store_slug>/owner/discounts/', react_app, name='owner_discounts'),
    path('<slug:store_slug>/owner/marketing/', react_app, name='owner_marketing'),
    path('<slug:store_slug>/owner/reports/', react_app, name='owner_reports'),
    path('<slug:store_slug>/owner/website/', react_app, name='owner_website'),
    path('<slug:store_slug>/owner/staff/', react_app, name='owner_staff'),
    path('<slug:store_slug>/owner/billing/', react_app, name='owner_billing'),
    path('<slug:store_slug>/owner/settings/', react_app, name='owner_settings'),
    path('<slug:store_slug>/owner/support/', react_app, name='owner_support'),
    path('<slug:store_slug>/owner/inventory/', react_app, name='owner_inventory'),
    path('<slug:store_slug>/owner/payments/verify/', react_app, name='owner_payment_verification'),
    path('<slug:store_slug>/owner/notifications/', react_app, name='owner_notifications'),
    path('<slug:store_slug>/owner/store-preview/', react_app, name='owner_store_preview'),
]
