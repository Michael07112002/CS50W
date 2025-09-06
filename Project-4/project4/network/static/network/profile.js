

/**
 * ----- UTILITY FUNCTIONS -----
 */

/**
 * Function to get the cookie value
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


/**
 * Create a div for a single post
 */
function createPostDiv(post, currentUser) {
    const postDiv = document.createElement("div"); 
    postDiv.id = `post-div-${post.pk}`;

    const postPara = document.createElement("p");
    postPara.innerText = post.content;

    const timestampPara = document.createElement("p"); 
    timestampPara.innerText = post.timestamp;
    timestampPara.style.color = "grey";

     const likesDiv = document.createElement("div");
    likesDiv.id = "likes-div";
    likesDiv.style.display = "flex";
    likesDiv.style.flexDirection = "row";
    const likesLogoDiv = document.createElement("div");
    likesLogoDiv.id = `likes-logo-div-${post.pk}`
    const likesCountDiv = document.createElement("div");
    likesCountDiv.id = `likes-count-div-${post.pk}`
    likesCountDiv.innerText = post.likes;
    if(post.liked_status == false){
        likesLogoDiv.innerHTML = "<span>♡</span>";
        likesLogoDiv.classList.add("not-liked");
    } else {
        likesLogoDiv.innerHTML = "<span>♥</span>";
        likesLogoDiv.classList.add("liked");
    }
    likesDiv.append(likesLogoDiv, likesCountDiv);
    likesDiv.style.cursor = "pointer";
    likesDiv.addEventListener("click", () => {
        like_functionality(post)
    });

    const border = document.createElement("hr");


    // Collect elements to append
    const elements = [postPara, likesDiv, timestampPara, border]
    

    // If logged-in user is the author, add an edit link
    if (post.user === currentUser) {
        const editLink = document.createElement("a");
        editLink.innerText = "Edit";
        editLink.style.color = "blue";
        elements.splice(0, 0, editLink);
        editLink.addEventListener("click", () => editPost(post.pk));
        editLink.style.cursor = "pointer";
    };

    
    


    
    elements.forEach(el => postDiv.appendChild(el));
    return postDiv;
}; 



/**
 * ----- CORE ACTION FUNCTIONS -----
 */

/**
 * Load the profile page (user info, follow/unfollow, posts)
 */
function loadProfilePage(currentPage, infiniteScrollFinished) {
    const profilePageView = document.getElementById("profile-page-view");
    const profileUserId = profilePageView.dataset.userId;

    fetch(`/profiles/${profileUserId}/?page=${currentPage}`)
    .then(response => response.json())
    .then(data => {
        console.log(data);

        const currentUser = data.current_user;
        const profileUser = data.profile_user;
        const followingStatus = data.following_status;

        // --- FOLLOW/UNFOLLOW SECTION ---
        const followerDiv = document.createElement("div"); 
        followerDiv.id = "follower-div";
        followerDiv.style.marginBottom = "3%";

        // Add follower/following counts
        followerDiv.innerHTML = `<p>Followers: ${data.followers} Following: ${data.following}`; 

        if(currentUser !== profileUser) {
            const followBtn = document.createElement("button"); 
            followBtn.classList.add("btn", "btn-outline-secondary");
            followBtn.id = "followBtn";
            followBtn.addEventListener("click", () => followBtnFunctionality(data.profile_user_pk))
            if (followingStatus == false) {
                followBtn.innerText = "Follow";
            } else {
                followBtn.innerText = "Unfollow";
            };
            followerDiv.appendChild(followBtn);
        };
        console.log("past if statement for the follow button");
        profilePageView.appendChild(followerDiv);
        // --- POSTS SECTION ---
        // Create light-weight container for optimisation 
        const fragment = document.createDocumentFragment(); 
        data.posts.forEach(function(post) {
            const postDiv = createPostDiv(post, currentUser);
            fragment.appendChild(postDiv);
        });
        // Append all posts in one go
        profilePageView.append(fragment);

        infiniteScrollLogic(currentPage, data.total_pages, infiniteScrollFinished);
    });
};



/**
 * ----- EVENT-DRIVEN FUNCTIONS -----
 */

/**
 * Follow button functionality
 */
function followBtnFunctionality(profileUserPK) {
    const followBtn = document.querySelector("#followBtn")
    if (followBtn.innerText == "Follow") {
        fetch(`/profiles/${profileUserPK}/`, {
            method: "POST", 
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken")
            }
        })
        .then(response => response.json()) 
        .then(result => {
            console.log(result);
            followBtn.innerText = "Unfollow";
        })
    } else {
        fetch(`/profiles/${profileUserPK}/`, {
            method: "DELETE", 
            headers: {
                "Content-Type": "application/json", 
                "X-CSRFToken": getCookie("csrftoken")
            }
        })
        .then(response => response.json())
        .then(result => {
            console.log(result);
            followBtn.innerText = "Follow";
        })
    }

}


/**
 * Switch a post into edit mode 
 */
function editPost(post_pk) {
    editDiv = document.querySelector(`#post-div-${post_pk}`);
    const postPara = editDiv.querySelector("p");
    // Hide original elements
    postPara.style.display = "none"; 
    editDiv.querySelector("a").style.display = "none"; 

    // Create textarea for editing
    const contentTextArea = document.createElement("textarea"); 
    contentTextArea.innerText = postPara.innerText;

    // Submit button
    const submitBtn = document.createElement("button"); 
    submitBtn.classList.add("btn", "btn-primary"); 
    submitBtn.innerText = "Save";

    submitBtn.addEventListener("click", () => 
        submitEditPost(post_pk, contentTextArea.value)
    );

    // Prepend new elements
    editDiv.prepend(contentTextArea, submitBtn)
}; 


/**
 * Send edit post to the server
 */
function submitEditPost(post_pk, post_content) {
    console.log("post_pk", post_pk)
    fetch(`/posts/${post_pk}/`, {
            method: "PUT", 
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({
                content: post_content
            })
    })
    .then(response => response.json())
    .then(result => {
        console.log(result);
        updatePostDiv(result);
    });        
}; 


/**
 * Update a post div with edited content
 * @Param {Object} data - The Push data returned from API
 */ 
function updatePostDiv(data) {
    if(data.success == true) {
        const postDiv = document.querySelector(`#postDiv${data.post.post_pk}`); 

        const contentPara = postDiv.querySelector("p"); 
        contentPara.innerText = data.post.content; 
        contentPara.style.display = "block"; 

        postDiv.querySelector("a").style.display = "block";

        postDiv.querySelector("textarea").style.display = "none";
        postDiv.querySelector("button").style.display = "none";

    }
};


function like_functionality(post) {
    const postPK = post.pk;
    console.log("post pk", postPK);
    const postDiv = document.querySelector(`#post-div-${postPK}`); 
    const likesLogoDiv = postDiv.querySelector(`#likes-logo-div-${postPK}`);
    const likesCountDiv = postDiv.querySelector(`#likes-count-div-${postPK}`);
    let likeCount = parseInt(likesCountDiv.textContent); 
    console.log("likeCount", likeCount)
    if (likesLogoDiv.classList.contains("not-liked")) {
        
        console.log("If statement reads that the post is not liked");
        fetch(`/like/${postPK}/`, {
            "method": "POST", 
            "headers": {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            }
        })
        .then(response => response.json()) 
        .then(result => {
            console.log(result);
            // Toggle to liked
            likeCount += 1;
            likesCountDiv.textContent = likeCount;
            likesLogoDiv.textContent = "♥";
            likesLogoDiv.classList.remove("not-liked"); 
            likesLogoDiv.classList.add("liked");
        }
        )
    } else {
        console.log("If statement reads that the post is already liked");
        fetch(`/like/${postPK}/`, {
            "method": "DELETE", 
            "headers": {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            }
        })
        .then(response => response.json())
        .then(result => {
            console.log(result); 
            // Toggle to not liked
            likeCount -= 1;
            likesCountDiv.textContent = likeCount; 
            likesLogoDiv.textContent = "♡";
            likesLogoDiv.classList.remove("liked"); 
            likesLogoDiv.classList.add("not-liked");
        })
    }; 

}


/**
 * Infinite Scoll logic
 */
function infiniteScrollLogic(currentPage, totalPages, infiniteScrollFinished) {
    console.log("in infinite scroll logic")
    window.onscroll = () => {
        if (infiniteScrollFinished) {
            console.log("infiniteScrollFinished is found to be true")
            return;
        }
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
            console.log("reached bottom of page")
            if (currentPage === totalPages) {
                console.log("infiniteScrollFinished set to true")
                infiniteScrollFinished = true;
            } else {
                currentPage += 1;
                loadProfilePage(currentPage, infiniteScrollFinished);
            };
        };
    };
    
}; 


// RUN after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
    // Get the query string part of the current URL
    const params = new URLSearchParams(window.location.search); 

    // Extract a specific parameter - "page" 
    let page = params.get("page");
    if (page === null) {
        page = 1;
    }; 
    page = parseInt(page);
    console.log("page", page);

    let infiniteScrollFinished = false;

    loadProfilePage(page, infiniteScrollFinished);

})