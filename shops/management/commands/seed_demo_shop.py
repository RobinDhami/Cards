from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from shops.models import (
    Category,
    DeliverySetting,
    Order,
    OrderItem,
    PaymentSetting,
    Product,
    ProductOption,
    ProductOptionValue,
    ProductVariant,
    ShopCustomer,
    Store,
    StoreStaffMembership,
)


class Command(BaseCommand):
    help = 'Create or refresh the complete Dipak Store demonstration dataset.'

    def handle(self, *args, **options):
        user_model = get_user_model()
        owner = user_model.objects.filter(is_superuser=True).first()
        store, _ = Store.objects.update_or_create(
            slug='urbanstore',
            defaults={
                'owner': owner,
                'name': 'Dipak Store',
                'description': 'Nepal\'s trusted destination for thoughtfully selected fashion, footwear and everyday accessories.',
                'phone': '+977 980-123-4567',
                'email': 'hello@dipakstore.com',
                'address': 'New Road, Kathmandu 44600',
                'city': 'Kathmandu',
                'country': 'Nepal',
                'primary_color': '#7c3aed',
                'secondary_color': '#171821',
                'selected_theme': 'urban',
                'subdomain': 'dipakstore',
                'custom_domain': 'www.dipakstore.com',
                'subscription_plan': 'business',
                'subscription_status': 'active',
                'is_active': True,
                'is_published': True,
                'hero_title': 'Own your everyday look.',
                'hero_subtitle': 'Curated fashion, accessories and essentials delivered across Nepal.',
                'hero_label': 'New season / 2026',
                'hero_image': 'shop/images/hero-model.jpg',
                'promo_title': 'Summer Style, Sorted.',
                'promo_code': 'WELCOME20',
                'promo_image': 'shop/images/promo-model.jpg',
            },
        )

        DeliverySetting.objects.update_or_create(
            store=store,
            defaults={
                'flat_delivery_charge': Decimal('150.00'),
                'free_delivery_minimum': Decimal('3000.00'),
                'inside_valley_charge': Decimal('120.00'),
                'outside_valley_charge': Decimal('220.00'),
                'allow_store_pickup': True,
            },
        )
        PaymentSetting.objects.update_or_create(
            store=store,
            defaults={
                'enable_cash_on_delivery': True,
                'enable_manual_qr': True,
                'enable_bank_transfer': True,
                'bank_name': 'Nabil Bank',
                'bank_account_name': 'Dipak Sharma',
                'bank_account_number': '02100175004821',
            },
        )

        category_data = [
            ('fashion', 'Fashion', None, 'shop/images/hero-model.jpg'),
            ('men', 'Men', 'fashion', 'shop/images/shirt.jpg'),
            ('women', 'Women', 'fashion', 'shop/images/bag.jpg'),
            ('children', 'Children', 'fashion', 'shop/images/hero-model.jpg'),
            ('accessories', 'Accessories', None, 'shop/images/sunglasses.jpg'),
            ('bags', 'Bags', 'accessories', 'shop/images/bag.jpg'),
            ('watches', 'Watches', 'accessories', 'shop/images/watch.jpg'),
            ('sunglasses', 'Sunglasses', 'accessories', 'shop/images/sunglasses.jpg'),
            ('footwear', 'Footwear', None, 'shop/images/shoes.jpg'),
            ('sneakers', 'Sneakers', 'footwear', 'shop/images/shoes.jpg'),
            ('formal-shoes', 'Formal Shoes', 'footwear', 'shop/images/shoes.jpg'),
            ('beauty-care', 'Beauty & Care', None, 'shop/images/promo-model.jpg'),
        ]
        categories = {}
        for index, (slug, name, _parent_slug, image) in enumerate(category_data, start=1):
            category, _ = Category.objects.update_or_create(
                store=store,
                slug=slug,
                defaults={
                    'name': name,
                    'image': image,
                    'display_order': index,
                    'is_active': True,
                },
            )
            categories[slug] = category
        for slug, _name, parent_slug, _image in category_data:
            category = categories[slug]
            parent = categories.get(parent_slug)
            if category.parent_id != getattr(parent, 'id', None):
                category.parent = parent
                category.save(update_fields=['parent'])

        products = [
            ('classic-wrist-watch', 'Classic Black Watch', 'watches', 'shop/images/watch.jpg', '3499', '3999', '1920', 24, 6, 'T2C-WAT-001', True, True, False, True, 'A refined black dial watch with a comfortable leather strap and dependable everyday movement.'),
            ('womens-handbag', 'Leather Handbag', 'bags', 'shop/images/bag.jpg', '4499', '4999', '2680', 18, 8, 'T2C-BAG-018', True, True, False, True, 'Structured everyday handbag with durable handles, organised compartments and a premium brown finish.'),
            ('white-sneakers', 'Urban White Sneakers', 'sneakers', 'shop/images/shoes.jpg', '3999', '4299', '2380', 32, 8, 'T2C-SHO-024', True, True, True, True, 'Clean low-top sneakers with cushioned comfort for workdays, weekends and city walks.'),
            ('mens-casual-shirt', 'Linen Cotton Shirt', 'men', 'shop/images/shirt.jpg', '2199', '2399', '1180', 42, 10, 'T2C-SRT-047', True, True, True, False, 'A breathable linen-cotton shirt cut for an easy, polished fit in every season.'),
            ('polarized-sunglasses', 'Polarized Sunglasses', 'sunglasses', 'shop/images/sunglasses.jpg', '1699', '1899', '740', 17, 6, 'T2C-SUN-012', True, True, True, True, 'Lightweight polarized sunglasses with UV protection and a versatile black frame.'),
            ('premium-tote-bag', 'Premium Tote Bag', 'bags', 'shop/images/bag.jpg', '5499', None, '3120', 11, 6, 'T2C-BAG-022', True, False, False, True, 'A roomy leather-look tote designed for work, travel and everyday organisation.'),
            ('everyday-sneakers', 'Everyday Sneakers', 'sneakers', 'shop/images/shoes.jpg', '4499', None, '2540', 26, 8, 'T2C-SHO-031', True, True, False, True, 'Versatile sneakers with a stable sole and soft lining for all-day wear.'),
            ('chrono-blue-watch', 'Chrono Blue Watch', 'watches', 'shop/images/watch.jpg', '3999', '4499', '2210', 9, 5, 'T2C-WAT-008', False, True, True, True, 'Sport-inspired chronograph styling with a deep dial and polished metal details.'),
            ('aviator-sunglasses', 'Aviator Sunglasses', 'sunglasses', 'shop/images/sunglasses.jpg', '1799', None, '790', 21, 6, 'T2C-SUN-019', False, True, False, True, 'Classic aviator lines, smoke lenses and a lightweight frame made for daily wear.'),
            ('travel-backpack', 'Travel Backpack', 'bags', 'shop/images/bag.jpg', '4899', None, '2710', 15, 6, 'T2C-BAG-029', True, False, True, True, 'A practical carry-all with padded straps, secure storage and a clean city-ready profile.'),
            ('tailored-grey-shirt', 'Tailored Grey Shirt', 'men', 'shop/images/shirt.jpg', '1899', '2199', '960', 28, 8, 'T2C-SRT-052', False, True, False, False, 'A smart grey button-up with an easy tailored shape for office and weekend styling.'),
            ('minimalist-dress-watch', 'Minimalist Dress Watch', 'watches', 'shop/images/watch.jpg', '4299', None, '2390', 5, 5, 'T2C-WAT-011', True, False, True, False, 'A minimal dress watch with clear markers and understated proportions.'),
            ('city-crossbody-bag', 'City Crossbody Bag', 'bags', 'shop/images/bag.jpg', '2899', '3299', '1560', 14, 6, 'T2C-BAG-034', False, True, True, False, 'A compact hands-free bag sized for your phone, wallet and daily essentials.'),
            ('canvas-low-top-sneakers', 'Canvas Low-top Sneakers', 'sneakers', 'shop/images/shoes.jpg', '2699', None, '1410', 36, 10, 'T2C-SHO-038', False, False, True, False, 'Easy canvas sneakers with a flexible sole and a simple all-white finish.'),
            ('relaxed-fit-overshirt', 'Relaxed Fit Overshirt', 'men', 'shop/images/shirt.jpg', '2799', '3199', '1480', 19, 8, 'T2C-SRT-061', True, False, True, False, 'A lightweight layering shirt with a relaxed silhouette and useful front pockets.'),
            ('round-frame-sunglasses', 'Round Frame Sunglasses', 'sunglasses', 'shop/images/sunglasses.jpg', '1499', None, '620', 3, 5, 'T2C-SUN-025', False, True, False, False, 'Retro-inspired round frames with dark UV-protective lenses.'),
            ('weekend-carryall', 'Weekend Carryall', 'bags', 'shop/images/bag.jpg', '5999', '6499', '3480', 8, 5, 'T2C-BAG-041', True, False, False, True, 'A generous carryall for short trips, gym days and organised daily commuting.'),
            ('sport-dial-watch', 'Sport Dial Watch', 'watches', 'shop/images/watch.jpg', '3799', None, '2040', 13, 5, 'T2C-WAT-016', False, True, True, False, 'A durable everyday watch with bold markers and a comfortable adjustable strap.'),
            ('premium-jacket', 'Premium Jacket', 'men', 'shop/images/promo-model.jpg', '5799', '6499', '3260', 7, 5, 'T2C-JKT-009', True, False, True, False, 'A polished lightweight jacket made for cool evenings and elevated everyday outfits.'),
            ('summer-edit-top', 'Summer Edit Top', 'women', 'shop/images/hero-model.jpg', '2499', '2999', '1290', 16, 6, 'T2C-WMN-014', True, True, True, False, 'A soft statement top in the season\'s signature purple, designed for effortless styling.'),
        ]
        seeded_products = []
        for row in products:
            (
                slug, name, category_slug, image, regular_price, discounted_price,
                cost_price, stock, threshold, sku, featured, trending, new_arrival,
                best_seller, description,
            ) = row
            product, _ = Product.objects.update_or_create(
                store=store,
                slug=slug,
                defaults={
                    'category': categories[category_slug],
                    'name': name,
                    'brand': 'Dipak Select',
                    'short_description': description,
                    'full_description': f'{description} Carefully selected by Dipak Store and available for delivery across Nepal.',
                    'regular_price': Decimal(discounted_price) if discounted_price else Decimal(regular_price),
                    'discounted_price': Decimal(regular_price) if discounted_price else None,
                    'cost_price': Decimal(cost_price),
                    'sku': sku,
                    'barcode': f'977{sku.replace("T2C-", "").replace("-", "")}',
                    'stock_quantity': stock,
                    'low_stock_threshold': threshold,
                    'status': 'active',
                    'is_featured': featured,
                    'is_trending': trending,
                    'is_new_arrival': new_arrival,
                    'is_best_seller': best_seller,
                    'image': image,
                    'weight': Decimal('0.65'),
                    'shipping_information': 'Dispatches in 1-2 business days. Delivery takes 1-3 days inside Kathmandu Valley and 3-7 days elsewhere in Nepal.',
                    'seo_title': f'{name} | Dipak Store Nepal',
                    'seo_description': f'Buy {name} online from Dipak Store with secure payment and Nepal-wide delivery.',
                },
            )
            seeded_products.append(product)

        for stale_category in store.categories.exclude(slug__in=categories):
            if not stale_category.products.exists() and not stale_category.children.exists():
                stale_category.delete()

        self._seed_variants(seeded_products)
        customers = self._seed_customers(store)
        self._seed_orders(store, customers, seeded_products)
        self._seed_staff(store, user_model)

        self.stdout.write(self.style.SUCCESS(
            f'Dipak Store demo ready: {store.categories.count()} categories, '
            f'{len(seeded_products)} products, {len(customers)} customers and '
            f'{store.orders.filter(order_number__startswith="DEMO-").count()} orders. '
            f'Open /shop/{store.slug}/'
        ))

    def _seed_variants(self, products):
        size_values = {
            'mens-casual-shirt': ['S', 'M', 'L', 'XL'],
            'tailored-grey-shirt': ['S', 'M', 'L', 'XL'],
            'relaxed-fit-overshirt': ['S', 'M', 'L', 'XL'],
            'premium-jacket': ['M', 'L', 'XL'],
            'summer-edit-top': ['S', 'M', 'L'],
            'white-sneakers': ['39', '40', '41', '42'],
            'everyday-sneakers': ['39', '40', '41', '42'],
            'canvas-low-top-sneakers': ['39', '40', '41', '42'],
        }
        for product in products:
            values = size_values.get(product.slug)
            if not values:
                continue
            option, _ = ProductOption.objects.update_or_create(
                product=product,
                name='Size',
                defaults={'display_order': 1},
            )
            for index, value in enumerate(values, start=1):
                option_value, _ = ProductOptionValue.objects.update_or_create(
                    option=option,
                    value=value,
                    defaults={'display_order': index},
                )
                variant, _ = ProductVariant.objects.update_or_create(
                    product=product,
                    sku=f'{product.sku}-{value}',
                    defaults={
                        'price': product.current_price,
                        'stock_quantity': max(1, product.stock_quantity // len(values)),
                        'is_active': True,
                    },
                )
                variant.option_values.set([option_value])

    def _seed_customers(self, store):
        customer_data = [
            ('Ram Bahadur', '+977 980-100-0001', 'ram.bahadur@example.com'),
            ('Sita Thapa', '+977 980-100-0002', 'sita.thapa@example.com'),
            ('Bikash Rai', '+977 980-100-0003', 'bikash.rai@example.com'),
            ('Anita Karki', '+977 980-100-0004', 'anita.karki@example.com'),
            ('Sujan Shrestha', '+977 980-100-0005', 'sujan.shrestha@example.com'),
            ('Mina Gurung', '+977 980-100-0006', 'mina.gurung@example.com'),
            ('Nisha Koirala', '+977 980-100-0007', 'nisha.koirala@example.com'),
            ('Prakash Pandey', '+977 980-100-0008', 'prakash.pandey@example.com'),
            ('Sarita Magar', '+977 980-100-0009', 'sarita.magar@example.com'),
            ('Arjun Rana', '+977 980-100-0010', 'arjun.rana@example.com'),
            ('Nisha Maharjan', '+977 980-100-0011', 'nisha.maharjan@example.com'),
            ('Kiran Basnet', '+977 980-100-0012', 'kiran.basnet@example.com'),
            ('Rojina Tamang', '+977 980-100-0013', 'rojina.tamang@example.com'),
            ('Aayush Poudel', '+977 980-100-0014', 'aayush.poudel@example.com'),
            ('Sabina Lama', '+977 980-100-0015', 'sabina.lama@example.com'),
            ('Nabin Shrestha', '+977 980-100-0016', 'nabin.shrestha@example.com'),
            ('Puja Adhikari', '+977 980-100-0017', 'puja.adhikari@example.com'),
            ('Roshan KC', '+977 980-100-0018', 'roshan.kc@example.com'),
            ('Manisha Oli', '+977 980-100-0019', 'manisha.oli@example.com'),
            ('Deepak Chaudhary', '+977 980-100-0020', 'deepak.chaudhary@example.com'),
        ]
        customers = []
        for full_name, phone, email in customer_data:
            customer, _ = ShopCustomer.objects.update_or_create(
                store=store,
                phone=phone,
                defaults={'full_name': full_name, 'email': email},
            )
            customers.append(customer)
        return customers

    def _seed_orders(self, store, customers, products):
        Order.objects.filter(store=store, order_number__startswith='DEMO-').delete()
        statuses = ['new', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'delivered', 'delivered', 'cancelled', 'returned']
        locations = [
            ('Bagmati', 'Kathmandu', 'New Road'),
            ('Bagmati', 'Lalitpur', 'Patan'),
            ('Bagmati', 'Bhaktapur', 'Suryabinayak'),
            ('Gandaki', 'Pokhara', 'Lakeside'),
            ('Koshi', 'Biratnagar', 'Main Road'),
            ('Lumbini', 'Butwal', 'Traffic Chowk'),
            ('Koshi', 'Dharan', 'Bhanu Chowk'),
            ('Bagmati', 'Chitwan', 'Bharatpur'),
        ]
        payment_methods = ['cod', 'manual_qr', 'bank_transfer']
        now = timezone.now()
        for index in range(48):
            customer = customers[index % len(customers)]
            status = statuses[index % len(statuses)]
            payment_method = payment_methods[index % len(payment_methods)]
            if status == 'cancelled':
                payment_status = 'failed'
            elif status == 'returned':
                payment_status = 'refunded'
            elif status in {'delivered', 'shipped'} or payment_method != 'cod':
                payment_status = 'paid'
            else:
                payment_status = 'unpaid'
            province, city, area = locations[index % len(locations)]
            selected = [products[(index * 3) % len(products)]]
            if index % 3 == 0:
                selected.append(products[(index * 3 + 5) % len(products)])
            if index % 7 == 0:
                selected.append(products[(index * 3 + 9) % len(products)])
            quantities = [1 + (index % 2)] + [1] * (len(selected) - 1)
            subtotal = sum((product.current_price * quantity for product, quantity in zip(selected, quantities)), Decimal('0.00'))
            discount = Decimal('300.00') if index % 5 == 0 else Decimal('0.00')
            delivery = Decimal('0.00') if subtotal - discount >= Decimal('3000.00') else Decimal('120.00')
            created = now - timedelta(days=(index * 2) % 70, hours=index % 11, minutes=index * 3)
            order = Order.objects.create(
                store=store,
                customer=customer,
                order_number=f'DEMO-{created:%Y%m%d}-{index + 1:04d}',
                status=status,
                payment_status=payment_status,
                payment_method=payment_method,
                customer_name=customer.full_name,
                customer_phone=customer.phone,
                customer_email=customer.email,
                province=province,
                city=city,
                area=area,
                detailed_address=f'Ward {index % 12 + 1}, {area}, {city}',
                delivery_instructions='Please call before delivery.' if index % 4 == 0 else '',
                subtotal=subtotal,
                discount_amount=discount,
                delivery_charge=delivery,
                grand_total=subtotal - discount + delivery,
                transaction_reference=f'TXN-{820000 + index}' if payment_method != 'cod' else '',
                internal_notes='[DEMO] Seeded order for the Tap2Connect Shop showcase.',
            )
            Order.objects.filter(pk=order.pk).update(created_at=created, updated_at=created)
            for product, quantity in zip(selected, quantities):
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    product_sku=product.sku,
                    selected_variations={'Size': 'M'} if product.options.exists() else {},
                    quantity=quantity,
                    unit_price=product.current_price,
                    line_total=product.current_price * quantity,
                )

    def _seed_staff(self, store, user_model):
        staff_data = [
            ('demo.suman.rai', 'Suman', 'Rai', 'suman@dipakstore.com', {'can_process_orders': True, 'can_view_customers': True, 'can_print_invoices': True}),
            ('demo.pooja.karki', 'Pooja', 'Karki', 'pooja@dipakstore.com', {'can_manage_products': True, 'can_manage_inventory': True}),
            ('demo.roshan.thapa', 'Roshan', 'Thapa', 'roshan@dipakstore.com', {'can_process_orders': True, 'can_view_customers': True}),
        ]
        for username, first_name, last_name, email, permissions in staff_data:
            user, created = user_model.objects.update_or_create(
                username=username,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': email,
                    'is_active': True,
                },
            )
            if created:
                user.set_unusable_password()
                user.save(update_fields=['password'])
            defaults = {
                'can_manage_products': False,
                'can_manage_inventory': False,
                'can_process_orders': False,
                'can_view_customers': False,
                'can_print_invoices': False,
                'can_view_reports': False,
                'is_active': True,
            }
            defaults.update(permissions)
            StoreStaffMembership.objects.update_or_create(
                store=store,
                user=user,
                defaults=defaults,
            )
