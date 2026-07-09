from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('vcards', '0034_pause_wallet_payment_module'),
    ]

    operations = [
        migrations.DeleteModel(name='LibraryBorrowRecord'),
        migrations.DeleteModel(name='LibraryBook'),
    ]
