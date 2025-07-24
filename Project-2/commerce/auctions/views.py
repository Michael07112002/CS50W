from django.contrib.auth import authenticate, login, logout
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django import forms
from .util import image_url_checker


from .models import User, Listing, WatchList, Bid, Transaction

class CreateListingForm(forms.ModelForm):
    class Meta: 
        model = Listing 
        
        # Set the fields from the model
        fields = ["title", "description", "starting_bid", "image", "category"] 
        
        # Styling for the fields
        widgets = {
            "description": forms.Textarea(attrs={"rows": 4, "cols": 40}),
            "image": forms.TextInput(attrs={"placeholder": "Optional"}), 
            "category": forms.TextInput(attrs={"placeholder": "Optional"})
        }

    # Initialise such that necessary fields are made optional
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["image"].required = False 
        self.fields["category"].required = False

    # Validating image url format
    def clean_image(self): 
        url = self.cleaned_data["image"]
        if url:
            clean_url = image_url_checker(url)
            if clean_url: 
                return clean_url 
            else:
                raise ValidationError("Invalid image URL format")
        return url
    
    
class MakeBidForm(forms.ModelForm): 
    class Meta: 
        model = Bid
    
        # Set the fields from the model 
        fields = ["bid_amount"]

        # Styling for the fields 
        widgets = {"bid_amount": forms.TextInput(attrs={"placeholder": "Enter Bid"})}
    

    def __init__(self, *args, **kwargs): 
        self.listing = kwargs.pop("listing", None)
        super().__init__(*args, **kwargs)


    def clean_bid_amount(self): 
        bid = self.cleaned_data["bid_amount"]

        # Query for existing bids for this listing
        existing_bids = Bid.objects.filter(listing=self.listing)
        if existing_bids:

            # Find highest bid by ordering the query set
            highest_bid = existing_bids.order_by("-bid_amount").first().bid_amount

            if bid > highest_bid: 
                return bid 
            
            raise ValidationError(f"Bid must be higher than the current bid of {highest_bid}.")
        
        # If no existing bids then validate on the starting bid
        starting_bid = self.listing.starting_bid
        if bid >= starting_bid:
            return bid 
        
        raise ValidationError(f"Bid must be higher than or equal to the starting bid of {starting_bid}")

        

def index(request):
    
    return render(request, "auctions/index.html", {
        "listings": Listing.objects.all()
    })


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "auctions/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "auctions/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "auctions/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "auctions/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "auctions/register.html") 
    

def create(request):
    if not request.user.is_authenticated:
        return HttpResponseRedirect(reverse("login"))
    if request.method == "POST":
        form = CreateListingForm(request.POST) 
        
        if form.is_valid():
            image_url_input = form.cleaned_data["image"] or None
            category_input = form.cleaned_data["category"] or None

            Listing.objects.create(user=request.user, 
                                    title=form.cleaned_data["title"], 
                                    description=form.cleaned_data["description"], 
                                    starting_bid=form.cleaned_data["starting_bid"], 
                                    image=image_url_input, 
                                    category=category_input)
            
            return HttpResponseRedirect(reverse("index"))
        else: 
            return HttpResponse("Error: Form input incorrect") 
            
    else: 
        return render(request, "auctions/create.html", {
            "form": CreateListingForm 
        })
    
    
def listing_page(request, pk): 

    # Check a listing with the pk exists
    listing = Listing.objects.filter(pk=pk)
    if listing.exists():
        form = MakeBidForm()
        return render(request, "auctions/listing_page.html", {
            "listing": listing.first(), 
            "form": form

        })
    return HttpResponse("Error: Listing does not exist")


def search_bar_input(request):
    search_input = request.GET.get("q")
    if search_input:
        return HttpResponseRedirect(reverse("search", kwargs={"search_input": search_input}))
    return HttpResponseRedirect(reverse("index"))


def search(request, search_input): 

    # Search model for the user input
    search_results = Listing.objects.filter(title__icontains=search_input)
    if search_results:
        return render(request, "auctions/search_results.html", {
            "listings": search_results
        }) 
    return HttpResponse("Error: Listing does not exist")


def watchlist(request): 
    if not request.user.is_authenticated:
        return HttpResponse(reverse("login"))
    if request.method == "POST":
        action = request.POST.get("action")
        if action == "add":
            pk = request.POST.get("listing_pk")
            listing = Listing.objects.get(pk=pk)
            WatchList.objects.create(user=request.user, 
                                    listing=listing)
        
        elif action == "remove": 
            pk = request.POST.get("watchlist_pk")
            WatchList.objects.filter(pk=pk, user=request.user).delete()
            
    return render(request, "auctions/watchlist.html", {
        "watchlist_items": WatchList.objects.filter(user=request.user)})


def make_bid(request): 
    if request.method == "POST":
        pk = request.POST.get("listing_pk")
        listing = Listing.objects.get(pk=pk)
        form = MakeBidForm(request.POST, listing=listing)
        if form.is_valid():
            new_bid = form.save(commit=False)
            new_bid.user = request.user
            new_bid.listing = listing 
            new_bid.save()
            return render(request, "auctions/listing_page.html", {
                "listing": listing
            })
        return render(request, "auctions/listing_page.html", { 
            "listing": listing,
            "form": form,
            "message": "Invalid bid amount"
        })
    return render(request, "auctions/listing_page.html", {
                "listing": listing
            })

def sales(request): 
    if request.method == "POST": 
        price = request.POST.get("price")
        listing = Listing.objects.get(pk=request.POST.get("listing_pk"))
        seller = request.user
        buyer = listing.highest_bidder
        Transaction.objects.create(seller=seller, buyer=buyer, price=price, listing=listing)
        listing.is_active = False
        listing.save()

    sales = Transaction.objects.filter(seller=request.user)
    return render(request, "auctions/sales.html", {
        "sales": sales,
        "transaction_type": "Sales"
    })
    
    

def purchases(request):
    purchases = Transaction.objects.filter(buyer=request.user)
    return render(request, "auctions/sales.html", {
        "sales": purchases, 
        "transaction_type": "Purchases"
    })


def categories(request, category=None): 
    if category:  
        listings = Listing.objects.filter(category=category)
        return render(request, "auctions/categories.html", {
            "selected_category": category,
            "listings": listings
        })
    else: 
        listings_categories = Listing.objects.filter(category__isnull=False)
        categories = listings_categories.values_list("category", flat=True).distinct()
    
        return render(request, "auctions/categories.html", {
            "categories": categories, 
        })




