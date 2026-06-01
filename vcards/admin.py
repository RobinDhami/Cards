from django.contrib import admin
from .models import (
    Skill, College, StudentProfile, ProfileActivity,
    StudentWallet, StudentCard, WalletTopUp, WalletTransaction,
    LibraryBook, LibraryBorrowRecord,
)

admin.site.register(Skill)
admin.site.register(College)
admin.site.register(StudentProfile)
admin.site.register(ProfileActivity)
admin.site.register(StudentWallet)
admin.site.register(StudentCard)
admin.site.register(WalletTopUp)
admin.site.register(WalletTransaction)
admin.site.register(LibraryBook)
admin.site.register(LibraryBorrowRecord)
