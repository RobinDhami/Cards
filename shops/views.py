from decimal import Decimal

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST

from .models import Category, DeliverySetting, Order, OrderItem, PaymentSetting, Product, ShopCustomer, Store


def _published_store(slug):
    return get_object_or_404(Store, slug=slug, is_active=True, is_published=True)


def _cart_session_key(store):
    return f'shop_cart_{store.slug}'


def _cart_items(request, store):
    raw_cart = request.session.get(_cart_session_key(store), {})
    product_ids = [int(product_id) for product_id in raw_cart.keys() if str(product_id).isdigit()]
    products = Product.objects.filter(
        store=store,
        id__in=product_ids,
        status='active',
    ).select_related('category')
    products_by_id = {product.id: product for product in products}
    items = []
    subtotal = Decimal('0.00')
    for product_id, quantity in raw_cart.items():
        if not str(product_id).isdigit():
            continue
        product = products_by_id.get(int(product_id))
        if product is None:
            continue
        quantity = max(1, int(quantity))
        quantity = min(quantity, product.stock_quantity) if product.stock_quantity else 1
        line_total = product.current_price * quantity
        subtotal += line_total
        items.append({
            'product': product,
            'quantity': quantity,
            'unit_price': product.current_price,
            'line_total': line_total,
        })
    return items, subtotal


def _cart_summary(request, store):
    items, subtotal = _cart_items(request, store)
    delivery_setting, _ = DeliverySetting.objects.get_or_create(store=store)
    coupon_code = request.session.get(f'shop_coupon_{store.slug}', '')
    coupon_applied = bool(coupon_code and coupon_code.upper() == store.promo_code.upper())
    discount = (subtotal * Decimal('0.20')).quantize(Decimal('0.01')) if coupon_applied else Decimal('0.00')
    discounted_subtotal = max(Decimal('0.00'), subtotal - discount)
    delivery_charge = delivery_setting.delivery_charge_for(discounted_subtotal) if items else Decimal('0.00')
    return {
        'items': items,
        'subtotal': subtotal,
        'discount': discount,
        'delivery_charge': delivery_charge,
        'grand_total': discounted_subtotal + delivery_charge,
        'count': sum(item['quantity'] for item in items),
        'coupon_code': coupon_code,
        'coupon_applied': coupon_applied,
        'free_delivery_minimum': delivery_setting.free_delivery_minimum,
    }


def _store_context(request, store, **extra):
    cart = _cart_summary(request, store)
    context = {
        'store': store,
        'cart': cart,
    }
    context.update(extra)
    return context


def _decorate_products(products):
    products = list(products)
    for product in products:
        product.demo_rating = f'{4.6 + (product.pk % 4) / 10:.1f}'
        product.demo_review_count = 42 + (product.pk * 17) % 190
        product.discount_percent = (
            int((product.regular_price - product.discounted_price) * 100 / product.regular_price)
            if product.discounted_price and product.regular_price
            else 0
        )
        product.discount_amount = (
            product.regular_price - product.discounted_price
            if product.discounted_price
            else Decimal('0.00')
        )
    return products


def store_home(request, store_slug):
    store = _published_store(store_slug)
    categories = (
        store.categories.filter(is_active=True)
        .annotate(published_product_count=Count('products', filter=Q(products__status='active')))
        .order_by('display_order', 'name')
    )
    products = store.products.filter(status='active').select_related('category')
    featured_products = _decorate_products(products.filter(is_featured=True)[:5])
    trending_products = _decorate_products(products.filter(is_trending=True)[:5] or products[:5])
    new_arrivals = _decorate_products(products.filter(is_new_arrival=True)[:5])
    best_sellers = _decorate_products(products.filter(is_best_seller=True)[:5])
    reviews = [
        {'name': 'Sita Thapa', 'location': 'Lalitpur', 'initials': 'ST', 'text': 'The handbag looked exactly like the photos and arrived the next day. The packaging felt very thoughtful.'},
        {'name': 'Bikash Rai', 'location': 'Dharan', 'initials': 'BR', 'text': 'Simple checkout, helpful delivery updates and the sneakers fit perfectly. I would order again.'},
        {'name': 'Nisha Maharjan', 'location': 'Kathmandu', 'initials': 'NM', 'text': 'QR payment was easy and the team verified it quickly. The whole experience felt reliable.'},
    ]
    return render(request, 'shop/home.html', _store_context(
        request,
        store,
        categories=categories,
        trending_products=trending_products,
        featured_products=featured_products,
        new_arrivals=new_arrivals,
        best_sellers=best_sellers,
        reviews=reviews,
        order_count=store.orders.count(),
        customer_count=store.customers.count(),
    ))


def product_list(request, store_slug):
    store = _published_store(store_slug)
    query = (request.GET.get('q') or '').strip()
    category_slug = (request.GET.get('category') or '').strip()
    sort = (request.GET.get('sort') or 'featured').strip()
    products = store.products.filter(status='active').select_related('category')
    if query:
        products = products.filter(
            Q(name__icontains=query)
            | Q(brand__icontains=query)
            | Q(category__name__icontains=query)
            | Q(sku__icontains=query)
        )
    if category_slug:
        products = products.filter(Q(category__slug=category_slug) | Q(category__parent__slug=category_slug))
    sort_map = {
        'featured': ('-is_featured', '-is_trending', 'name'),
        'newest': ('-created_at',),
        'price_low': ('discounted_price', 'regular_price'),
        'price_high': ('-discounted_price', '-regular_price'),
        'name': ('name',),
    }
    products = products.order_by(*sort_map.get(sort, sort_map['featured']))
    categories = store.categories.filter(is_active=True, parent__isnull=True).order_by('display_order')
    return render(request, 'shop/product_list.html', _store_context(
        request,
        store,
        products=_decorate_products(products),
        query=query,
        categories=categories,
        selected_category=category_slug,
        sort=sort,
    ))


def category_detail(request, store_slug, category_slug):
    store = _published_store(store_slug)
    category = get_object_or_404(Category, store=store, slug=category_slug, is_active=True)
    products = category.products.filter(store=store, status='active')
    return render(request, 'shop/product_list.html', _store_context(
        request,
        store,
        products=_decorate_products(products),
        category=category,
        categories=store.categories.filter(is_active=True, parent__isnull=True).order_by('display_order'),
        selected_category=category.slug,
        sort='featured',
    ))


def product_detail(request, store_slug, product_slug):
    store = _published_store(store_slug)
    product = get_object_or_404(
        Product.objects.select_related('category').prefetch_related('options__values', 'variants__option_values'),
        store=store,
        slug=product_slug,
        status='active',
    )
    _decorate_products([product])
    related_products = _decorate_products(
        store.products.filter(status='active', category=product.category)
        .exclude(pk=product.pk)
        .select_related('category')[:4]
    )
    return render(request, 'shop/product_detail.html', _store_context(
        request,
        store,
        product=product,
        related_products=related_products,
    ))


def cart_detail(request, store_slug):
    store = _published_store(store_slug)
    coupon_message = ''
    if request.method == 'POST':
        coupon = (request.POST.get('coupon') or '').strip().upper()
        coupon_key = f'shop_coupon_{store.slug}'
        if request.POST.get('remove_coupon'):
            request.session.pop(coupon_key, None)
            coupon_message = 'Coupon removed.'
        elif coupon == store.promo_code.upper():
            request.session[coupon_key] = coupon
            coupon_message = f'{coupon} applied. You saved 20%.'
        else:
            request.session.pop(coupon_key, None)
            coupon_message = 'That coupon code is not valid.'
        request.session.modified = True
    return render(request, 'shop/cart.html', _store_context(request, store, coupon_message=coupon_message))


@require_POST
def cart_add(request, store_slug, product_id):
    store = _published_store(store_slug)
    product = get_object_or_404(Product, store=store, id=product_id, status='active')
    quantity = max(1, int(request.POST.get('quantity') or 1))
    if not product.is_in_stock:
        return redirect(product.get_absolute_url())
    key = _cart_session_key(store)
    cart = request.session.get(key, {})
    current_quantity = int(cart.get(str(product.id), 0))
    cart[str(product.id)] = min(product.stock_quantity, current_quantity + quantity)
    request.session[key] = cart
    request.session.modified = True
    return redirect(request.POST.get('next') or store.get_absolute_url())


@require_POST
def cart_update(request, store_slug, product_id):
    store = _published_store(store_slug)
    product = get_object_or_404(Product, store=store, id=product_id)
    key = _cart_session_key(store)
    cart = request.session.get(key, {})
    quantity = int(request.POST.get('quantity') or 0)
    if quantity <= 0:
        cart.pop(str(product.id), None)
    else:
        cart[str(product.id)] = min(product.stock_quantity or quantity, quantity)
    request.session[key] = cart
    request.session.modified = True
    return redirect('shops:cart', store.slug)


def checkout(request, store_slug):
    store = _published_store(store_slug)
    cart = _cart_summary(request, store)
    if not cart['items']:
        return redirect('shops:cart', store.slug)

    if request.method == 'POST':
        required_fields = [
            'full_name', 'phone', 'province', 'city', 'area', 'detailed_address',
        ]
        missing = [field for field in required_fields if not (request.POST.get(field) or '').strip()]
        if not missing:
            with transaction.atomic():
                customer, _ = ShopCustomer.objects.get_or_create(
                    store=store,
                    phone=request.POST['phone'].strip(),
                    defaults={
                        'full_name': request.POST['full_name'].strip(),
                        'email': (request.POST.get('email') or '').strip(),
                    },
                )
                customer.full_name = request.POST['full_name'].strip()
                customer.email = (request.POST.get('email') or '').strip()
                customer.save()

                payment_method = request.POST.get('payment_method') or 'cod'
                payment_status = 'pending_verification' if payment_method in {'manual_qr', 'bank_transfer'} else 'unpaid'
                order = Order.objects.create(
                    store=store,
                    customer=customer,
                    customer_name=customer.full_name,
                    customer_phone=customer.phone,
                    customer_email=customer.email,
                    province=request.POST['province'].strip(),
                    city=request.POST['city'].strip(),
                    area=request.POST['area'].strip(),
                    detailed_address=request.POST['detailed_address'].strip(),
                    delivery_instructions=(request.POST.get('delivery_instructions') or '').strip(),
                    payment_method=payment_method,
                    payment_status=payment_status,
                    transaction_reference=(request.POST.get('transaction_reference') or '').strip(),
                    subtotal=cart['subtotal'],
                    discount_amount=cart['discount'],
                    delivery_charge=cart['delivery_charge'],
                    grand_total=cart['grand_total'],
                )
                for item in cart['items']:
                    product = item['product']
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=product.name,
                        product_sku=product.sku,
                        quantity=item['quantity'],
                        unit_price=item['unit_price'],
                        line_total=item['line_total'],
                    )
                    Product.objects.filter(pk=product.pk).update(
                        stock_quantity=max(0, product.stock_quantity - item['quantity'])
                    )

            request.session[_cart_session_key(store)] = {}
            request.session.modified = True
            return redirect('shops:order_success', store.slug, order.order_number)
        cart['errors'] = missing

    payment_setting, _ = PaymentSetting.objects.get_or_create(store=store)
    return render(request, 'shop/checkout.html', _store_context(
        request,
        store,
        cart=cart,
        payment_setting=payment_setting,
    ))


def order_success(request, store_slug, order_number):
    store = _published_store(store_slug)
    order = get_object_or_404(Order.objects.prefetch_related('items'), store=store, order_number=order_number)
    return render(request, 'shop/order_success.html', _store_context(request, store, order=order))


def track_order(request, store_slug):
    store = _published_store(store_slug)
    order = None
    if request.GET.get('order_number'):
        order = Order.objects.filter(
            store=store,
            order_number=request.GET['order_number'].strip(),
            customer_phone=(request.GET.get('phone') or '').strip(),
        ).first()
    return render(request, 'shop/track_order.html', _store_context(
        request,
        store,
        order=order,
        tracking_searched=bool(request.GET.get('order_number')),
    ))


def _can_manage_store(user, store):
    if not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True
    if store.owner_id == user.id:
        return True
    return store.staff_memberships.filter(user=user, is_active=True).exists()


def _is_platform_admin(user):
    return user.is_authenticated and (user.is_staff or user.is_superuser)


def _manageable_store_or_404(user, store_slug):
    store = get_object_or_404(Store, slug=store_slug)
    if not _can_manage_store(user, store):
        raise Http404
    return store


@login_required
def owner_dashboard(request, store_slug):
    store = _manageable_store_or_404(request.user, store_slug)
    orders = store.orders.all()
    products = store.products.all()
    recent_orders = orders[:8]
    low_stock_products = products.filter(stock_quantity__lte=5).order_by('stock_quantity')[:8]
    stats = {
        'total_sales': orders.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00'),
        'total_orders': orders.count(),
        'pending_orders': orders.filter(status__in=['new', 'confirmed', 'processing']).count(),
        'total_customers': store.customers.count(),
        'product_count': products.count(),
        'active_products': products.filter(status='active').count(),
    }
    status_counts = {status: orders.filter(status=status).count() for status, _ in Order.STATUS_CHOICES}
    stats.update({f'{status}_orders': count for status, count in status_counts.items()})
    stats['total_sales_display'] = f"NPR {stats['total_sales']:,.0f}"
    stats['conversion_rate'] = f"{(stats['total_orders'] / max(stats['total_customers'] * 10, 1) * 100):.2f}%"
    top_products = (
        Product.objects.filter(store=store, orderitem__isnull=False)
        .annotate(total_sold=Sum('orderitem__quantity'))
        .order_by('-total_sold')[:5]
    )
    checklist = [
        {'label': 'Publish store', 'done': store.is_published},
        {'label': 'Add at least 5 products', 'done': stats['product_count'] >= 5},
        {'label': 'Configure delivery', 'done': hasattr(store, 'delivery_settings')},
        {'label': 'Configure payments', 'done': hasattr(store, 'payment_settings')},
        {'label': 'Add contact information', 'done': bool(store.phone and store.email)},
    ]
    dashboard_orders = [
        {'id': '#ORD-00234', 'customer': 'Ram Bahadur', 'amount': 'NPR 4,498', 'payment': 'COD', 'status': 'New', 'date': '2 min ago'},
        {'id': '#ORD-00233', 'customer': 'Sita Thapa', 'amount': 'NPR 2,499', 'payment': 'Khalti', 'status': 'Confirmed', 'date': '15 min ago'},
        {'id': '#ORD-00232', 'customer': 'Bikash Rai', 'amount': 'NPR 1,299', 'payment': 'eSewa', 'status': 'Processing', 'date': '45 min ago'},
        {'id': '#ORD-00231', 'customer': 'Anita Karki', 'amount': 'NPR 3,999', 'payment': 'COD', 'status': 'Shipped', 'date': '1 hour ago'},
        {'id': '#ORD-00230', 'customer': 'Sujan Shrestha', 'amount': 'NPR 2,999', 'payment': 'Bank Transfer', 'status': 'Delivered', 'date': '2 hours ago'},
    ]
    dashboard_products = [
        {'rank': 1, 'name': 'Classic Wrist Watch', 'sold': '156 sold', 'price': 'NPR 3,999', 'image': 'shop/images/watch.jpg'},
        {'rank': 2, 'name': 'Women’s Handbag', 'sold': '98 sold', 'price': 'NPR 2,499', 'image': 'shop/images/bag.jpg'},
        {'rank': 3, 'name': 'White Sneakers', 'sold': '87 sold', 'price': 'NPR 2,999', 'image': 'shop/images/shoes.jpg'},
        {'rank': 4, 'name': 'Men’s Casual Shirt', 'sold': '67 sold', 'price': 'NPR 1,499', 'image': 'shop/images/shirt.jpg'},
        {'rank': 5, 'name': 'Sunglasses', 'sold': '56 sold', 'price': 'NPR 1,299', 'image': 'shop/images/sunglasses.jpg'},
    ]
    low_stock_alerts = [
        {'name': 'Leather Handbag', 'stock': 'Stock: 5 left'},
        {'name': 'Classic Watch', 'stock': 'Stock: 3 left'},
        {'name': 'White Sneakers', 'stock': 'Stock: 4 left'},
        {'name': 'Men’s Jacket', 'stock': 'Stock: 6 left'},
        {'name': 'Sunglasses', 'stock': 'Stock: 2 left'},
    ]
    dashboard_orders = [{
        'id': f'#{order.order_number}',
        'customer': order.customer_name,
        'amount': f'NPR {order.grand_total:,.0f}',
        'payment': order.get_payment_method_display(),
        'status': order.get_status_display(),
        'date': order.created_at.strftime('%b %d, %I:%M %p'),
    } for order in recent_orders[:5]]
    dashboard_products = [{
        'rank': rank,
        'name': product.name,
        'sold': f'{product.total_sold or 0} sold',
        'price': f'NPR {product.current_price:,.0f}',
        'image': product.image,
    } for rank, product in enumerate(top_products, start=1)]
    low_stock_alerts = [{
        'name': product.name,
        'stock': f'Stock: {product.stock_quantity} left',
    } for product in products.order_by('stock_quantity') if product.stock_quantity <= product.low_stock_threshold][:5]
    return render(request, 'shop/dashboard/overview.html', {
        'store': store,
        'stats': stats,
        'recent_orders': recent_orders,
        'low_stock_products': low_stock_products,
        'top_products': top_products,
        'checklist': checklist,
        'dashboard_orders': dashboard_orders,
        'dashboard_products': dashboard_products,
        'low_stock_alerts': low_stock_alerts,
    })


@login_required
def owner_orders(request, store_slug):
    store = _manageable_store_or_404(request.user, store_slug)
    summary_cards = [
        {'label': 'Total Orders', 'value': '320', 'trend': '+8.2%', 'icon': 'shopping-cart', 'tone': 'purple'},
        {'label': 'New Orders', 'value': '23', 'trend': '+4.8%', 'icon': 'sparkles', 'tone': 'blue'},
        {'label': 'Processing', 'value': '68', 'trend': '+6.4%', 'icon': 'loader-circle', 'tone': 'orange'},
        {'label': 'Ready to Ship', 'value': '18', 'trend': '+2.1%', 'icon': 'package-check', 'tone': 'green'},
        {'label': 'Delivered', 'value': '205', 'trend': '+12.0%', 'icon': 'truck', 'tone': 'navy'},
    ]
    tabs = [
        ('All Orders', 320), ('New', 23), ('Confirmed', 45), ('Processing', 68),
        ('Ready to Ship', 18), ('Shipped', 96), ('Delivered', 205),
        ('Cancelled', 16), ('Returned', 5),
    ]
    orders = [
        {'id': '#ORD-00234', 'customer': 'Ram Bahadur', 'phone': '+977 9800000001', 'products': '2 products', 'amount': 'NPR 4,498', 'payment': 'Cash on Delivery', 'payment_status': 'Unpaid', 'status': 'New', 'date': '2 min ago'},
        {'id': '#ORD-00233', 'customer': 'Sita Thapa', 'phone': '+977 9800000002', 'products': '1 product', 'amount': 'NPR 2,499', 'payment': 'Khalti', 'payment_status': 'Paid', 'status': 'Confirmed', 'date': '15 min ago'},
        {'id': '#ORD-00232', 'customer': 'Bikash Rai', 'phone': '+977 9800000003', 'products': '3 products', 'amount': 'NPR 5,899', 'payment': 'eSewa', 'payment_status': 'Paid', 'status': 'Processing', 'date': '45 min ago'},
        {'id': '#ORD-00231', 'customer': 'Anita Karki', 'phone': '+977 9800000004', 'products': '1 product', 'amount': 'NPR 3,999', 'payment': 'Cash on Delivery', 'payment_status': 'Unpaid', 'status': 'Shipped', 'date': '1 hour ago'},
        {'id': '#ORD-00230', 'customer': 'Sujan Shrestha', 'phone': '+977 9800000005', 'products': '2 products', 'amount': 'NPR 2,999', 'payment': 'Bank Transfer', 'payment_status': 'Pending Verification', 'status': 'Delivered', 'date': '2 hours ago'},
        {'id': '#ORD-00229', 'customer': 'Mina Gurung', 'phone': '+977 9800000006', 'products': '2 products', 'amount': 'NPR 6,498', 'payment': 'Cash on Delivery', 'payment_status': 'Unpaid', 'status': 'Ready to Ship', 'date': '3 hours ago'},
        {'id': '#ORD-00228', 'customer': 'Nabin Shrestha', 'phone': '+977 9800000007', 'products': '1 product', 'amount': 'NPR 1,499', 'payment': 'eSewa', 'payment_status': 'Paid', 'status': 'Cancelled', 'date': '4 hours ago'},
    ]
    detail_products = [
        {'name': 'Women’s Handbag', 'variation': 'Color: Brown', 'quantity': 1, 'price': 'NPR 2,499', 'image': 'shop/images/bag.jpg'},
        {'name': 'Men’s Casual Shirt', 'variation': 'Size: M, Color: Grey', 'quantity': 1, 'price': 'NPR 1,499', 'image': 'shop/images/shirt.jpg'},
    ]
    timeline = [
        {'label': 'Order placed', 'time': '2 min ago', 'done': True},
        {'label': 'Payment pending', 'time': 'Cash on Delivery', 'done': True},
        {'label': 'Awaiting confirmation', 'time': 'Next step', 'done': False},
        {'label': 'Ready to ship', 'time': 'Pending', 'done': False},
    ]
    store_orders = store.orders.select_related('customer').prefetch_related('items__product')
    counts = {status: store_orders.filter(status=status).count() for status, _ in Order.STATUS_CHOICES}
    total_orders = store_orders.count()
    summary_cards = [
        {'label': 'Total Orders', 'value': str(total_orders), 'trend': 'All store orders', 'icon': 'shopping-cart', 'tone': 'purple'},
        {'label': 'New Orders', 'value': str(counts['new']), 'trend': 'Needs confirmation', 'icon': 'sparkles', 'tone': 'blue'},
        {'label': 'Processing', 'value': str(counts['processing']), 'trend': 'Being prepared', 'icon': 'loader-circle', 'tone': 'orange'},
        {'label': 'Ready to Ship', 'value': str(counts['ready_to_ship']), 'trend': 'Ready for courier', 'icon': 'package-check', 'tone': 'green'},
        {'label': 'Delivered', 'value': str(counts['delivered']), 'trend': 'Completed orders', 'icon': 'truck', 'tone': 'navy'},
    ]
    tabs = [
        ('All Orders', total_orders), ('New', counts['new']), ('Confirmed', counts['confirmed']),
        ('Processing', counts['processing']), ('Ready to Ship', counts['ready_to_ship']),
        ('Shipped', counts['shipped']), ('Delivered', counts['delivered']),
        ('Cancelled', counts['cancelled']), ('Returned', counts['returned']),
    ]
    displayed_orders = list(store_orders[:10])
    orders = [{
        'id': f'#{order.order_number}',
        'customer': order.customer_name,
        'phone': order.customer_phone,
        'products': f'{order.items.count()} product{"s" if order.items.count() != 1 else ""}',
        'amount': f'NPR {order.grand_total:,.0f}',
        'payment': order.get_payment_method_display(),
        'payment_status': order.get_payment_status_display(),
        'status': order.get_status_display(),
        'date': order.created_at.strftime('%b %d, %I:%M %p'),
    } for order in displayed_orders]
    selected_order = displayed_orders[0] if displayed_orders else None
    detail_products = [{
        'name': item.product_name,
        'variation': ', '.join(f'{key}: {value}' for key, value in item.selected_variations.items()) or item.product_sku,
        'quantity': item.quantity,
        'price': f'NPR {item.line_total:,.0f}',
        'image': item.product.image if item.product else 'shop/images/bag.jpg',
    } for item in selected_order.items.all()] if selected_order else []
    return render(request, 'shop/dashboard/orders.html', {
        'store': store,
        'summary_cards': summary_cards,
        'tabs': tabs,
        'orders': orders,
        'detail_products': detail_products,
        'timeline': timeline,
        'total_orders': total_orders,
        'selected_order': selected_order,
    })


@login_required
def owner_products(request, store_slug):
    store = _manageable_store_or_404(request.user, store_slug)
    summary_cards = [
        {'label': 'Total Products', 'value': '156', 'trend': '+9 added', 'icon': 'package', 'tone': 'purple'},
        {'label': 'Active Products', 'value': '139', 'trend': '89% live', 'icon': 'badge-check', 'tone': 'green'},
        {'label': 'Draft Products', 'value': '12', 'trend': 'Needs review', 'icon': 'file-clock', 'tone': 'blue'},
        {'label': 'Out of Stock', 'value': '5', 'trend': 'Restock soon', 'icon': 'package-x', 'tone': 'orange'},
        {'label': 'Low Stock', 'value': '18', 'trend': 'Below threshold', 'icon': 'triangle-alert', 'tone': 'navy'},
    ]
    products = [
        {
            'name': 'Classic Wrist Watch',
            'sku': 'T2C-WAT-001',
            'category': 'Accessories',
            'price': 'NPR 3,999',
            'compare_price': 'NPR 4,499',
            'stock': 24,
            'sales': 86,
            'status': 'Active',
            'updated': '12 min ago',
            'variations': '3 variations',
            'image': 'shop/images/watch.jpg',
            'warning': '',
        },
        {
            'name': "Women's Leather Handbag",
            'sku': 'T2C-BAG-018',
            'category': 'Bags',
            'price': 'NPR 2,499',
            'compare_price': '',
            'stock': 8,
            'sales': 143,
            'status': 'Active',
            'updated': '35 min ago',
            'variations': '4 variations',
            'image': 'shop/images/bag.jpg',
            'warning': 'Low stock',
        },
        {
            'name': 'White Sneakers',
            'sku': 'T2C-SHO-024',
            'category': 'Footwear',
            'price': 'NPR 5,899',
            'compare_price': 'NPR 6,499',
            'stock': 0,
            'sales': 64,
            'status': 'Inactive',
            'updated': '1 hour ago',
            'variations': '6 variations',
            'image': 'shop/images/shoes.jpg',
            'warning': 'Out of stock',
        },
        {
            'name': "Men's Casual Shirt",
            'sku': 'T2C-SRT-047',
            'category': 'Clothing',
            'price': 'NPR 1,499',
            'compare_price': '',
            'stock': 42,
            'sales': 112,
            'status': 'Active',
            'updated': '2 hours ago',
            'variations': '8 variations',
            'image': 'shop/images/shirt.jpg',
            'warning': '',
        },
        {
            'name': 'Premium Jacket',
            'sku': 'T2C-JKT-009',
            'category': 'Outerwear',
            'price': 'NPR 4,799',
            'compare_price': 'NPR 5,499',
            'stock': 5,
            'sales': 39,
            'status': 'Draft',
            'updated': 'Yesterday',
            'variations': '5 variations',
            'image': 'shop/images/promo-model.jpg',
            'warning': 'Low stock',
        },
        {
            'name': 'Sunglasses',
            'sku': 'T2C-SUN-012',
            'category': 'Accessories',
            'price': 'NPR 1,299',
            'compare_price': '',
            'stock': 17,
            'sales': 77,
            'status': 'Active',
            'updated': 'Yesterday',
            'variations': '2 variations',
            'image': 'shop/images/sunglasses.jpg',
            'warning': '',
        },
    ]
    product_qs = store.products.select_related('category').prefetch_related('variants').annotate(sales_count=Sum('orderitem__quantity'))
    total_products = product_qs.count()
    active_products = product_qs.filter(status='active').count()
    draft_products = product_qs.filter(status='draft').count()
    out_of_stock = product_qs.filter(stock_quantity=0).count()
    low_stock = sum(1 for item in product_qs if 0 < item.stock_quantity <= item.low_stock_threshold)
    summary_cards = [
        {'label': 'Total Products', 'value': str(total_products), 'trend': 'Catalogue items', 'icon': 'package', 'tone': 'purple'},
        {'label': 'Active Products', 'value': str(active_products), 'trend': f'{round(active_products / max(total_products, 1) * 100)}% live', 'icon': 'badge-check', 'tone': 'green'},
        {'label': 'Draft Products', 'value': str(draft_products), 'trend': 'Needs review', 'icon': 'file-clock', 'tone': 'blue'},
        {'label': 'Out of Stock', 'value': str(out_of_stock), 'trend': 'Restock soon', 'icon': 'package-x', 'tone': 'orange'},
        {'label': 'Low Stock', 'value': str(low_stock), 'trend': 'Below threshold', 'icon': 'triangle-alert', 'tone': 'navy'},
    ]
    products = [{
        'name': item.name,
        'sku': item.sku,
        'category': item.category.name if item.category else 'Uncategorized',
        'price': f'NPR {item.current_price:,.0f}',
        'compare_price': f'NPR {item.regular_price:,.0f}' if item.discounted_price else '',
        'stock': item.stock_quantity,
        'sales': item.sales_count or 0,
        'status': item.get_status_display(),
        'updated': item.updated_at.strftime('%b %d, %Y'),
        'variations': f'{item.variants.count()} variations',
        'image': item.image,
        'warning': 'Out of stock' if item.stock_quantity == 0 else ('Low stock' if item.stock_quantity <= item.low_stock_threshold else ''),
    } for item in product_qs]
    return render(request, 'shop/dashboard/products.html', {
        'store': store,
        'summary_cards': summary_cards,
        'products': products,
        'total_products': total_products,
    })


@login_required
def owner_product_create(request, store_slug):
    store = _manageable_store_or_404(request.user, store_slug)
    return render(request, 'shop/dashboard/product_create.html', {
        'store': store,
    })


@login_required
def owner_categories(request, store_slug):
    store = _manageable_store_or_404(request.user, store_slug)
    summary_cards = [
        {'label': 'Total Categories', 'value': '12', 'trend': '3 parent groups', 'icon': 'folders', 'tone': 'purple'},
        {'label': 'Active Categories', 'value': '10', 'trend': '83% visible', 'icon': 'badge-check', 'tone': 'green'},
        {'label': 'Hidden Categories', 'value': '2', 'trend': 'Not on store', 'icon': 'eye-off', 'tone': 'blue'},
        {'label': 'Uncategorized Products', 'value': '7', 'trend': 'Needs attention', 'icon': 'circle-alert', 'tone': 'orange'},
    ]
    categories = [
        {'name': 'Fashion', 'count': 68, 'status': 'Active', 'order': 1, 'depth': 0, 'image': 'shop/images/promo-model.jpg'},
        {'name': 'Men', 'count': 24, 'status': 'Active', 'order': 1, 'depth': 1, 'image': 'shop/images/shirt.jpg'},
        {'name': 'Women', 'count': 31, 'status': 'Active', 'order': 2, 'depth': 1, 'image': 'shop/images/bag.jpg'},
        {'name': 'Children', 'count': 13, 'status': 'Hidden', 'order': 3, 'depth': 1, 'image': 'shop/images/hero-model.jpg'},
        {'name': 'Accessories', 'count': 42, 'status': 'Active', 'order': 2, 'depth': 0, 'image': 'shop/images/watch.jpg'},
        {'name': 'Bags', 'count': 18, 'status': 'Active', 'order': 1, 'depth': 1, 'image': 'shop/images/bag.jpg'},
        {'name': 'Watches', 'count': 14, 'status': 'Active', 'order': 2, 'depth': 1, 'image': 'shop/images/watch.jpg'},
        {'name': 'Sunglasses', 'count': 10, 'status': 'Active', 'order': 3, 'depth': 1, 'image': 'shop/images/sunglasses.jpg'},
        {'name': 'Footwear', 'count': 27, 'status': 'Active', 'order': 3, 'depth': 0, 'image': 'shop/images/shoes.jpg'},
        {'name': 'Sneakers', 'count': 19, 'status': 'Active', 'order': 1, 'depth': 1, 'image': 'shop/images/shoes.jpg'},
        {'name': 'Formal Shoes', 'count': 8, 'status': 'Hidden', 'order': 2, 'depth': 1, 'image': 'shop/images/shoes.jpg'},
        {'name': 'Beauty & Care', 'count': 19, 'status': 'Active', 'order': 4, 'depth': 0, 'image': 'shop/images/hero-model.jpg'},
    ]
    category_qs = store.categories.select_related('parent').annotate(product_count=Count('products')).order_by('display_order', 'parent_id', 'name')
    total_categories = category_qs.count()
    active_categories = category_qs.filter(is_active=True).count()
    hidden_categories = total_categories - active_categories
    uncategorized = store.products.filter(category__isnull=True).count()
    summary_cards = [
        {'label': 'Total Categories', 'value': str(total_categories), 'trend': f'{category_qs.filter(parent__isnull=True).count()} parent groups', 'icon': 'folders', 'tone': 'purple'},
        {'label': 'Active Categories', 'value': str(active_categories), 'trend': f'{round(active_categories / max(total_categories, 1) * 100)}% visible', 'icon': 'badge-check', 'tone': 'green'},
        {'label': 'Hidden Categories', 'value': str(hidden_categories), 'trend': 'Not on store', 'icon': 'eye-off', 'tone': 'blue'},
        {'label': 'Uncategorized Products', 'value': str(uncategorized), 'trend': 'Needs attention' if uncategorized else 'Catalogue organised', 'icon': 'circle-alert', 'tone': 'orange'},
    ]
    categories = [{
        'name': item.name,
        'count': item.product_count,
        'status': 'Active' if item.is_active else 'Hidden',
        'order': item.display_order,
        'depth': 1 if item.parent_id else 0,
        'image': item.image or 'shop/images/hero-model.jpg',
    } for item in category_qs]
    return render(request, 'shop/dashboard/categories.html', {
        'store': store,
        'summary_cards': summary_cards,
        'categories': categories,
        'total_categories': total_categories,
    })


@login_required
def owner_customers(request, store_slug):
    store = _manageable_store_or_404(request.user, store_slug)
    summary_cards = [
        {'label': 'Total Customers', 'value': '1,245', 'trend': '+8.6%', 'icon': 'users', 'tone': 'purple'},
        {'label': 'New This Month', 'value': '128', 'trend': '+18.2%', 'icon': 'user-plus', 'tone': 'blue'},
        {'label': 'Returning Customers', 'value': '384', 'trend': '30.8% rate', 'icon': 'repeat-2', 'tone': 'green'},
        {'label': 'Average Order Value', 'value': 'NPR 2,840', 'trend': '+5.4%', 'icon': 'receipt-text', 'tone': 'orange'},
        {'label': 'Customer Lifetime Value', 'value': 'NPR 8,950', 'trend': '+7.1%', 'icon': 'gem', 'tone': 'navy'},
    ]
    customers = [
        {'initials': 'RB', 'name': 'Ram Bahadur', 'email': 'ram.bahadur@example.com', 'phone': '+977 980-123-4567', 'location': 'Kathmandu', 'orders': 12, 'spent': 'NPR 38,450', 'last_order': '2 days ago', 'type': 'VIP'},
        {'initials': 'ST', 'name': 'Sita Thapa', 'email': 'sita.thapa@example.com', 'phone': '+977 981-445-2390', 'location': 'Lalitpur', 'orders': 6, 'spent': 'NPR 16,870', 'last_order': '4 days ago', 'type': 'Returning'},
        {'initials': 'BR', 'name': 'Bikash Rai', 'email': 'bikash.rai@example.com', 'phone': '+977 984-210-8750', 'location': 'Dharan', 'orders': 1, 'spent': 'NPR 5,899', 'last_order': '6 days ago', 'type': 'New'},
        {'initials': 'AK', 'name': 'Anita Karki', 'email': 'anita.karki@example.com', 'phone': '+977 986-118-4412', 'location': 'Bhaktapur', 'orders': 8, 'spent': 'NPR 24,320', 'last_order': '1 week ago', 'type': 'Returning'},
        {'initials': 'SS', 'name': 'Sujan Shrestha', 'email': 'sujan.s@example.com', 'phone': '+977 985-330-9244', 'location': 'Pokhara', 'orders': 15, 'spent': 'NPR 52,990', 'last_order': '1 week ago', 'type': 'VIP'},
        {'initials': 'MG', 'name': 'Mina Gurung', 'email': 'mina.gurung@example.com', 'phone': '+977 980-772-4108', 'location': 'Butwal', 'orders': 3, 'spent': 'NPR 9,740', 'last_order': '2 weeks ago', 'type': 'Returning'},
        {'initials': 'NK', 'name': 'Nisha Koirala', 'email': 'nisha.k@example.com', 'phone': '+977 982-454-1800', 'location': 'Biratnagar', 'orders': 1, 'spent': 'NPR 2,499', 'last_order': '3 weeks ago', 'type': 'New'},
        {'initials': 'PP', 'name': 'Prakash Pandey', 'email': 'prakash.p@example.com', 'phone': '+977 984-641-9255', 'location': 'Chitwan', 'orders': 2, 'spent': 'NPR 4,980', 'last_order': '5 months ago', 'type': 'Inactive'},
    ]
    recent_orders = [
        {'id': '#ORD-00221', 'date': 'Jun 2, 2026', 'amount': 'NPR 4,498', 'status': 'Delivered'},
        {'id': '#ORD-00198', 'date': 'May 18, 2026', 'amount': 'NPR 2,999', 'status': 'Delivered'},
        {'id': '#ORD-00167', 'date': 'Apr 29, 2026', 'amount': 'NPR 5,899', 'status': 'Delivered'},
    ]
    customer_qs = store.customers.annotate(
        order_count=Count('orders', distinct=True),
        total_spent=Sum('orders__grand_total'),
    ).order_by('-total_spent', 'full_name')
    total_customers = customer_qs.count()
    now = timezone.localtime()
    new_this_month = customer_qs.filter(created_at__year=now.year, created_at__month=now.month).count()
    returning_customers = customer_qs.filter(order_count__gt=1).count()
    order_totals = store.orders.aggregate(total=Sum('grand_total'), count=Count('id'))
    total_revenue = order_totals['total'] or Decimal('0.00')
    order_count = order_totals['count'] or 0
    average_order_value = total_revenue / max(order_count, 1)
    lifetime_value = total_revenue / max(total_customers, 1)
    summary_cards = [
        {'label': 'Total Customers', 'value': f'{total_customers:,}', 'trend': 'Customer profiles', 'icon': 'users', 'tone': 'purple'},
        {'label': 'New This Month', 'value': f'{new_this_month:,}', 'trend': 'Recently added', 'icon': 'user-plus', 'tone': 'blue'},
        {'label': 'Returning Customers', 'value': f'{returning_customers:,}', 'trend': f'{(returning_customers / max(total_customers, 1) * 100):.1f}% rate', 'icon': 'repeat-2', 'tone': 'green'},
        {'label': 'Average Order Value', 'value': f'NPR {average_order_value:,.0f}', 'trend': 'Across all orders', 'icon': 'receipt-text', 'tone': 'orange'},
        {'label': 'Customer Lifetime Value', 'value': f'NPR {lifetime_value:,.0f}', 'trend': 'Average revenue', 'icon': 'gem', 'tone': 'navy'},
    ]
    customers = []
    for customer in customer_qs[:8]:
        last_order = customer.orders.first()
        spent = customer.total_spent or Decimal('0.00')
        initials = ''.join(part[0] for part in customer.full_name.split()[:2]).upper()
        customer_type = 'VIP' if spent >= Decimal('15000') else ('Returning' if customer.order_count > 1 else 'New')
        customers.append({
            'initials': initials,
            'name': customer.full_name,
            'email': customer.email,
            'phone': customer.phone,
            'location': last_order.city if last_order else 'Nepal',
            'orders': customer.order_count,
            'spent': f'NPR {spent:,.0f}',
            'last_order': last_order.created_at.strftime('%b %d, %Y') if last_order else 'No orders yet',
            'type': customer_type,
        })
    selected_customer = customer_qs.first()
    recent_orders = [{
        'id': f'#{order.order_number}',
        'date': order.created_at.strftime('%b %d, %Y'),
        'amount': f'NPR {order.grand_total:,.0f}',
        'status': order.get_status_display(),
    } for order in selected_customer.orders.all()[:3]] if selected_customer else []
    return render(request, 'shop/dashboard/customers.html', {
        'store': store,
        'summary_cards': summary_cards,
        'customers': customers,
        'recent_orders': recent_orders,
        'total_customers': total_customers,
    })


@login_required
def owner_discounts(request, store_slug):
    store = _manageable_store_or_404(request.user, store_slug)
    summary_cards = [
        {'label': 'Active Discounts', 'value': '8', 'trend': '4 automatic', 'icon': 'badge-percent', 'tone': 'purple'},
        {'label': 'Scheduled', 'value': '3', 'trend': 'Next: Jul 28', 'icon': 'calendar-clock', 'tone': 'blue'},
        {'label': 'Expired', 'value': '14', 'trend': 'Past campaigns', 'icon': 'archive', 'tone': 'orange'},
        {'label': 'Coupon Uses', 'value': '486', 'trend': '+11.4%', 'icon': 'ticket-check', 'tone': 'green'},
        {'label': 'Revenue from Discounts', 'value': 'NPR 94,500', 'trend': '+16.8%', 'icon': 'trending-up', 'tone': 'navy'},
    ]
    tabs = [
        ('All', 25), ('Active', 8), ('Scheduled', 3), ('Expired', 14),
        ('Automatic Discounts', 4), ('Coupon Codes', 21),
    ]
    discounts = [
        {'name': 'Welcome Offer', 'code': 'WELCOME20', 'type': 'Percentage', 'value': '20%', 'usage': '84 uses', 'validity': 'Jun 1 - Aug 31', 'status': 'Active'},
        {'name': 'Free Delivery Nepal', 'code': 'FREESHIP', 'type': 'Free Delivery', 'value': 'Free', 'usage': '124 uses', 'validity': 'Ongoing', 'status': 'Active'},
        {'name': 'Dashain Savings', 'code': 'DASHAIN500', 'type': 'Fixed Amount', 'value': 'NPR 500', 'usage': '0 uses', 'validity': 'Sep 20 - Oct 10', 'status': 'Scheduled'},
        {'name': 'Summer Accessories', 'code': 'SUMMER15', 'type': 'Percentage', 'value': '15%', 'usage': '63 uses', 'validity': 'Jul 1 - Jul 31', 'status': 'Active'},
        {'name': 'Buy Two Get One', 'code': 'B2G1STYLE', 'type': 'Buy One Get One', 'value': '1 item', 'usage': '42 uses', 'validity': 'Jun 15 - Jul 15', 'status': 'Expired'},
        {'name': 'VIP Customer Reward', 'code': 'VIP1000', 'type': 'Fixed Amount', 'value': 'NPR 1,000', 'usage': '28 uses', 'validity': 'May 1 - Dec 31', 'status': 'Active'},
    ]
    return render(request, 'shop/dashboard/discounts.html', {
        'store': store,
        'summary_cards': summary_cards,
        'tabs': tabs,
        'discounts': discounts,
    })


def _render_owner_workspace(request, store_slug, template_name, active_section):
    store = _manageable_store_or_404(request.user, store_slug)
    return render(request, template_name, {
        'store': store,
        'active_section': active_section,
    })


@login_required
def owner_marketing(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/marketing.html', 'marketing')


@login_required
def owner_reports(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/reports.html', 'reports')


@login_required
def owner_website(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/website_editor.html', 'website')


@login_required
def owner_staff(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/staff.html', 'staff')


@login_required
def owner_billing(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/billing.html', 'billing')


@login_required
def owner_settings(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/settings.html', 'settings')


@login_required
def owner_support(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/support.html', 'support')


@login_required
def owner_inventory(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/inventory.html', 'inventory')


@login_required
def owner_payment_verification(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/payment_verification.html', 'payments')


@login_required
def owner_notifications(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/notifications.html', 'notifications')


@login_required
def owner_store_preview(request, store_slug):
    return _render_owner_workspace(request, store_slug, 'shop/dashboard/store_preview.html', 'preview')


@login_required
def business_suite(request):
    if not _is_platform_admin(request.user):
        raise Http404
    stores = (
        Store.objects.select_related('owner')
        .annotate(
            product_count=Count('products', distinct=True),
            order_count=Count('orders', distinct=True),
        )
        .order_by('-updated_at')
    )
    orders = Order.objects.select_related('store')
    stats = {
        'store_count': stores.count(),
        'active_store_count': stores.filter(is_active=True).count(),
        'published_store_count': stores.filter(is_published=True).count(),
        'product_count': Product.objects.count(),
        'order_count': orders.count(),
        'pending_order_count': orders.filter(status__in=['new', 'confirmed', 'processing']).count(),
        'total_sales': orders.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00'),
    }
    return render(request, 'shop/dashboard/business_suite.html', {
        'active_module': 'business_suite',
        'current_school': None,
        'school_options': [],
        'nav_school_query': '',
        'is_super_admin': True,
        'stores': stores,
        'stats': stats,
        'recent_orders': orders.order_by('-created_at')[:8],
    })
