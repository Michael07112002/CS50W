from django.contrib import admin
from .models import User, Listing, WatchList, Bid, Transaction

# Register your models here.
admin.site.register(User)
admin.site.register(Listing)
admin.site.register(WatchList)
admin.site.register(Bid)
admin.site.register(Transaction)
