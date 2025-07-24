from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    pass


class Listing(models.Model): 
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listings")
    title = models.CharField(max_length=64)
    description = models.CharField(max_length=500)
    starting_bid = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.CharField(max_length=1000, blank=True, null=True)
    category = models.CharField(max_length=64, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    # Identifies the highest current bid if it exists
    @property
    def current_bid(self): 
        highest = self.bid.order_by("-bid_amount").first()
        if highest: 
            return highest.bid_amount
        return None
    # Identifies the user with the highest
    @property 
    def highest_bidder(self): 
        highest = self.bid.order_by("-bid_amount").first()
        if highest: 
            return highest.user
        return None

class WatchList(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="watchlist")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="watchlist")

class Bid(models.Model): 
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="bid")
    bid_amount = models.DecimalField(max_digits=10, decimal_places=2)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bid")

class Transaction(models.Model): 
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name="transactions_sold")
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="transactions_bought")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="transaction")



