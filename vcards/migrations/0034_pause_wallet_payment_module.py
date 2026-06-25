from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('vcards', '0033_wallet_library_birth_certificate'),
    ]

    operations = [
        migrations.DeleteModel(name='WalletTransaction'),
        migrations.DeleteModel(name='WalletTopUp'),
        migrations.DeleteModel(name='StudentWallet'),
    ]
