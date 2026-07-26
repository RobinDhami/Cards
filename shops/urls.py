from django.urls import path

from . import views

app_name = 'shops'

urlpatterns = [
    path('<slug:store_slug>/', views.store_home, name='store_home'),
    path('<slug:store_slug>/products/', views.product_list, name='product_list'),
    path('<slug:store_slug>/product/<slug:product_slug>/', views.product_detail, name='product_detail'),
    path('<slug:store_slug>/category/<slug:category_slug>/', views.category_detail, name='category_detail'),
    path('<slug:store_slug>/cart/', views.cart_detail, name='cart'),
    path('<slug:store_slug>/cart/add/<int:product_id>/', views.cart_add, name='cart_add'),
    path('<slug:store_slug>/cart/update/<int:product_id>/', views.cart_update, name='cart_update'),
    path('<slug:store_slug>/checkout/', views.checkout, name='checkout'),
    path('<slug:store_slug>/order-success/<str:order_number>/', views.order_success, name='order_success'),
    path('<slug:store_slug>/track-order/', views.track_order, name='track_order'),
    path('<slug:store_slug>/owner/', views.owner_dashboard, name='owner_dashboard'),
    path('<slug:store_slug>/owner/orders/', views.owner_orders, name='owner_orders'),
    path('<slug:store_slug>/owner/products/', views.owner_products, name='owner_products'),
    path('<slug:store_slug>/owner/products/new/', views.owner_product_create, name='owner_product_create'),
    path('<slug:store_slug>/owner/categories/', views.owner_categories, name='owner_categories'),
    path('<slug:store_slug>/owner/customers/', views.owner_customers, name='owner_customers'),
    path('<slug:store_slug>/owner/discounts/', views.owner_discounts, name='owner_discounts'),
    path('<slug:store_slug>/owner/marketing/', views.owner_marketing, name='owner_marketing'),
    path('<slug:store_slug>/owner/reports/', views.owner_reports, name='owner_reports'),
    path('<slug:store_slug>/owner/website/', views.owner_website, name='owner_website'),
    path('<slug:store_slug>/owner/staff/', views.owner_staff, name='owner_staff'),
    path('<slug:store_slug>/owner/billing/', views.owner_billing, name='owner_billing'),
    path('<slug:store_slug>/owner/settings/', views.owner_settings, name='owner_settings'),
    path('<slug:store_slug>/owner/support/', views.owner_support, name='owner_support'),
    path('<slug:store_slug>/owner/inventory/', views.owner_inventory, name='owner_inventory'),
    path('<slug:store_slug>/owner/payments/verify/', views.owner_payment_verification, name='owner_payment_verification'),
    path('<slug:store_slug>/owner/notifications/', views.owner_notifications, name='owner_notifications'),
    path('<slug:store_slug>/owner/store-preview/', views.owner_store_preview, name='owner_store_preview'),
]
