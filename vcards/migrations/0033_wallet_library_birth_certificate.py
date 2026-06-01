from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('vcards', '0032_studentprofile_additional_info'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='birth_certificate',
            field=models.FileField(blank=True, null=True, upload_to='birth_certificates/'),
        ),
        migrations.CreateModel(
            name='LibraryBook',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('author', models.CharField(blank=True, default='', max_length=255)),
                ('isbn', models.CharField(blank=True, default='', max_length=50)),
                ('category', models.CharField(blank=True, default='', max_length=100)),
                ('book_code', models.CharField(max_length=80, unique=True)),
                ('total_copies', models.PositiveIntegerField(default=1)),
                ('available_copies', models.PositiveIntegerField(default=1)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='StudentWallet',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('balance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('student', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='wallet', to='vcards.studentprofile')),
            ],
        ),
        migrations.CreateModel(
            name='StudentCard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('card_uid', models.CharField(max_length=120, unique=True)),
                ('card_number', models.CharField(blank=True, default='', max_length=80)),
                ('is_active', models.BooleanField(default=True)),
                ('issued_date', models.DateField(default=django.utils.timezone.localdate)),
                ('lost_or_blocked', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cards', to='vcards.studentprofile')),
            ],
        ),
        migrations.CreateModel(
            name='WalletTopUp',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('payment_method', models.CharField(choices=[('cash', 'Cash'), ('bank', 'Bank'), ('online', 'Online'), ('other', 'Other')], default='cash', max_length=20)),
                ('note', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('received_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='received_wallet_topups', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='wallet_topups', to='vcards.studentprofile')),
                ('wallet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='topups', to='vcards.studentwallet')),
            ],
        ),
        migrations.CreateModel(
            name='WalletTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('transaction_type', models.CharField(choices=[('topup', 'Top-up'), ('cafeteria', 'Cafeteria'), ('stationery', 'Stationery'), ('bus', 'Bus Fare'), ('library_fine', 'Library Fine'), ('refund', 'Refund')], max_length=30)),
                ('description', models.CharField(blank=True, default='', max_length=255)),
                ('counter_name', models.CharField(blank=True, default='', max_length=120)),
                ('balance_before', models.DecimalField(decimal_places=2, max_digits=12)),
                ('balance_after', models.DecimalField(decimal_places=2, max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('processed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processed_wallet_transactions', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='wallet_transactions', to='vcards.studentprofile')),
                ('wallet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='vcards.studentwallet')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='LibraryBorrowRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('issue_date', models.DateField(default=django.utils.timezone.localdate)),
                ('due_date', models.DateField()),
                ('return_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('borrowed', 'Borrowed'), ('returned', 'Returned'), ('overdue', 'Overdue'), ('lost', 'Lost')], default='borrowed', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('book', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='borrow_records', to='vcards.librarybook')),
                ('issued_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='issued_library_books', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='library_records', to='vcards.studentprofile')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddConstraint(
            model_name='studentcard',
            constraint=models.UniqueConstraint(condition=models.Q(('is_active', True), ('lost_or_blocked', False)), fields=('student',), name='one_active_card_per_student'),
        ),
    ]
