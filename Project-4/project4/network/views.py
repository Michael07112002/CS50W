from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator
import json

from .models import User, Post, Like, Follow


def index(request):
    return render(request, "network/index.html")


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
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


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
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html") 


def profile_view(request, user_pk):
    # Find user 
    try: 
        user = User.objects.get(pk=user_pk)
    except User.DoesNotExist: 
        return render(request, "network/profile.html", {
            "error_message": "Error, user not found."
        })
    return render(request, "network/profile.html", {
        "user_pk": user.pk,
        "username": user.username
    }) 


def following(request): 
    user = request.user
    if not user.is_authenticated: 
            return JsonResponse({"error": "User not logged in."})
    return render(request, "network/following.html")




#######################    
# API route functions #
#######################

def create_post(request): 
    # must be via POST 
    if request.method !=  "POST": 
        return JsonResponse({"error": "POST request required."}, status=400)

    # extract user input from JS fetch 
    data = json.loads(request.body)
    content = data.get("content", "").strip()
    # Server side validation 
    if len(content) > 280 or len(content) == 0: 
        return JsonResponse({"error": "Invalid post input."}, status=400)
    
    # Set variables for adding into the model 
    user = request.user 
    post = Post(
        user=user, 
        content=content)
    
    post.save() 

    return JsonResponse({"message": "Post posted successfully."}, status=201)


def profiles(request, user_pk): 
    try: 
        profile_user = User.objects.get(pk=user_pk)
    except User.DoesNotExist:
        return JsonResponse({"error": "User does not exist."}, status=400)
    current_user = request.user 
    if request.method == "GET":
        posts = profile_user.posts.all().order_by("-timestamp") 
        followers_count = Follow.objects.filter(following=profile_user).count()
        following_count = Follow.objects.filter(follower=profile_user).count()
        
        paginator = Paginator(posts, 10) # 10 posts per page
        # Find the page number requested 
        page_number = request.GET.get("page")
        page_obj = paginator.get_page(page_number)

        # Create posts Json response
        post_data = []
        for post in page_obj: 
            likes = post.likes.count()
            liked_status = Like.objects.filter(post=post, user=request.user).exists()
            
            post_data.append({
                "pk": post.pk,
                "user": post.user.username, 
                "content": post.content, 
                "timestamp": post.timestamp.strftime("%b %d %Y, %I:%M %p"),
                "likes": likes, 
                "liked_status": liked_status
            }) 

        following_status = Follow.objects.filter(follower=current_user, following=profile_user).exists()

        return JsonResponse({
            "current_user": current_user.username,
            "profile_user_pk": profile_user.pk,
            "profile_user": profile_user.username,
            "posts": post_data,
            "followers": followers_count, 
            "following": following_count,
            "following_status": following_status,
            "has_next": page_obj.has_next(), 
            "has_previous": page_obj.has_previous(), 
            "page_number": page_obj.number, 
            "total_pages": paginator.num_pages
            }) 
    
    if request.method == "POST": 
        if not current_user.is_authenticated: 
            return JsonResponse({"error": "User not logged in."})
        print("profile user pk", profile_user.pk)
        print("current user pk", current_user.pk)
        follow = Follow(follower=current_user, following=profile_user) 
        follow.save()
        return JsonResponse({"message": "Followed user successfully."}, status=201)
    
    if request.method == "DELETE": 
        Follow.objects.filter(follower=current_user, following=profile_user).delete() 
        return JsonResponse({"message": "Unfollowed user successfully."})


def posts(request, post_pk=None, feed_type=None): 
    if request.method == "GET": 
        print("past GET if statement")
        if post_pk:
            print("In pk if statment")
            try: 
                post = Post.objects.get(pk=post_pk) 
                likes = post.likes.count()
            except Post.DoesNotExist: 
                return JsonResponse({"error": "Post does not exist."}, status=400)
            
            return JsonResponse({
                "pk": post.pk, 
                "user": post.user.username, 
                "content": post.content, 
                "timestamp": post.timestamp, 
                "likes": likes
            })
        elif feed_type == "following": 
            print("past feed_type if statement, good")
            followed_users = Follow.objects.filter(
            follower=request.user
            ).values_list("following", flat=True)
            print("finding followed users worked")
            posts = Post.objects.filter(
                user__in=followed_users
            ) 
            print("finding followed users' posts worked")
        else: 
            posts = Post.objects.all()

        # Return posts in reverse chronological order
        posts = posts.order_by("-timestamp").all()
        paginator = Paginator(posts, 10) # 10 posts per page

        # Find the page number requested 
        page_number = request.GET.get("page")
        page_obj = paginator.get_page(page_number)

        # Create JSON repsonse for each post 
        post_data = [] 
        for post in page_obj: 
            likes = post.likes.count() 
            liked_status = Like.objects.filter(post=post, user=request.user).exists()
            post_data.append({
                "post_pk": post.pk,
                "user_pk": post.user.pk,
                "user": post.user.username, 
                "content": post.content, 
                "timestamp": post.timestamp.strftime("%b %d %Y, %I:%M %p"),
                "likes": likes, 
                "liked_status": liked_status 
            })
        
        return JsonResponse({
            "current_user": request.user.username,
            "posts": post_data, 
            "has_next": page_obj.has_next(), 
            "has_previous": page_obj.has_previous(), 
            "page_number": page_obj.number, 
            "total_pages": paginator.num_pages
            }) 
    
    if request.method == "POST":
        # extract user input from JS fetch 
        data = json.loads(request.body)
        content = data.get("content", "").strip()
        # Server side validation 
        if len(content) > 280 or len(content) == 0: 
            return JsonResponse({"error": "Invalid post input."}, status=400)
        
        # Set variables for adding into the model 
        user = request.user 
        post = Post(
            user=user, 
            content=content)
        post.save() 
        return JsonResponse({"message": "Post posted successfully."}, status=201)
    
    if request.method == "PUT": 
        print("PUT request received")
        data = json.loads(request.body)
        print("data:", data)
        content = data.get("content", "").strip()
        print("content", content)
        # Server side validation 
        print("content length", len(content))
        if len(content) > 280 or len(content) == 0: 
            return JsonResponse({"error": "Invalid post input."}, status=400)
        try:
            post = Post.objects.get(pk=post_pk, user=request.user) 
            print("through try statement")
        except Post.DoesNotExist:
            print("post pk", post_pk)
            print("caught by does not exist exception") 
            return JsonResponse({"error": "Post does not exist."}, status=400)
        except Exception as e: 
            return JsonResponse({"error": str(e)}, status=500)
        post.content = content 
        post.save() 
        return JsonResponse({
            "success": True, 
            "post": {
                "post_pk": post.pk,
                "content": post.content, 
                "timestamp": post.timestamp # Try and update timestamp later
            }
        })


def like(request, post_pk): 
    user = request.user 
    if not user.is_authenticated: 
        return JsonResponse({"error": "User not logged in."})
    try: 
        post = Post.objects.get(pk=post_pk)
    except Post.DoesNotExist: 
        return JsonResponse({"error": "Post not found."}) 
    
    liked_status = Like.objects.filter(user=user, post=post).exists()
    print("liked statis", liked_status)
    if request.method == "POST": 
        print("in POST section")
        if liked_status == True: 
            return JsonResponse({"error": "Post is already liked."})
        print("past liked_status error catch")
        like_post = Like(
            user=user, 
            post=post) 
        like_post.save() 
        return JsonResponse({"message": "Post successfully liked"}) 
    
    if request.method == "DELETE": 
        if liked_status == False: 
            return JsonResponse({"error": "Post is not already liked."})
        Like.objects.get(user=user, post=post).delete()
        return JsonResponse({"message": "Post successfully unliked"})


    