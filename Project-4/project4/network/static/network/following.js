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
 * Generate the DOM structure for a single post, including user link, content, likes, and edit option.
 * @param {Object} post - The post data returned from the API
 * @param {string} currentUser - The username of the logged-in user
 * @returns {HTMLElement} The constructed post <div>
 */
function createPostDiv(post, currentUser) {
    const postDiv = document.createElement("div");
    postDiv.id = `post-div-${post.post_pk}`
    const userHeader = document.createElement("h5");
    const profileBaseUrl = `/profile_page/${post.user_pk}`;
    userHeader.innerHTML = `<a href=${profileBaseUrl}>${post.user}</a>`;
    userHeader.style.cursor = "pointer";

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
    likesLogoDiv.id = `likes-logo-div-${post.post_pk}`
    const likesCountDiv = document.createElement("div");
    likesCountDiv.id = `likes-count-div-${post.post_pk}`
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
    
    // Edit link 
    if (post.user === currentUser) {
        const editLink = document.createElement("a");
        editLink.innerText = "Edit";
        editLink.style.color = "blue";
        elements.splice(0, 0, editLink);
        editLink.style.cursor = "pointer";
    };

    // Prepend username header
    elements.splice(0,0, userHeader);

    elements.forEach(el => postDiv.appendChild(el));
    return postDiv;
};


/**
 * ----- CORE ACTION FUNCTIONS -----
 */


/**
 * Display the post form
 */
function newPostForm() {
    const form = document.querySelector("#new-post-form")
    const textarea = document.querySelector("#new-post-content");
    const maxChars = 280;

    // Hide the feedback elements on page reload 
    document.querySelector("#new-post-view").style.display = "block";
    document.querySelector("#validation-feedback").style.display = "none";
    document.querySelector("#char-counter").style.display = "none";

    // Clear form field 
    textarea.value = ""; 

    // Validation for content character length 
    textarea.addEventListener("input", function() {
        if (textarea.value.length > maxChars) { 
            textarea.value = textarea.value.slice(0, maxChars); // Trim excess 
        }

        // Update live counter
        const counter = document.querySelector("#char-counter"); 
        counter.textContent = `${textarea.value.length}/${maxChars}`;
        counter.style.display ="block";

        // Remove live counter shown if there is no longer chars in text area
        if (textarea.value.length === 0) {
        document.querySelector("#char-counter").style.display = "none"
    };
    });

};


/**
 * Generate posts for user to view
 */
function followingFeed() {
    const feedView = document.querySelector("#following-feed-view")
    // Show the feed view
    feedView.style.display = "block";

    // --- REQUEST POSTS FROM SERVER --- 
    fetch(`/posts/following/?page=1`)
    .then(response => response.json())
    .then(data => { 
        console.log("response", data);
        const currentUser = data.current_user; 

        // Create light-weight container for optimisation 
        const fragment = document.createDocumentFragment(); 

        
        // Create div for each post
        data.posts.forEach(function(post) {
            const postDiv = createPostDiv(post, currentUser);
            fragment.appendChild(postDiv);

        }); 

        // Append all post divs to the view at once 
        feedView.appendChild(fragment);

        // Dealing with multiple pages in response
        // Add infinite scroll logic HERE
        
       
    });
}; 


/**
 * ----- EVENT-DRIVEN FUNCTIONS -----
 */

/**
 * Send created post to server
 */
function submitPostForm() {
    document.querySelector("#new-post-form").addEventListener("submit", function(event) {
        event.preventDefault(); // Prevent page reload 
        
        // Extract user input 
        const content = document.querySelector("#new-post-content").value;
        const feedbackDiv = document.querySelector("#validation-feedback");
        // Input validation 
        if (content === "") {
            feedbackDiv.style.color = "red";
            feedbackDiv.style.display = "block";
            return;
        };

        // Need to create posts api route
        fetch("/posts/", {
            method: "POST", 
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken")
            },
            body: JSON.stringify({
                content: content
            })
        })
        .then(response => response.json())
        .then(result => {
            console.log(result)
        });
        // Potentially add feature of new posts appearing on submit without page reload
    });
};

function like_functionality(post) {
    const postPK = post.post_pk;
    const postDiv = document.querySelector(`#post-div-${postPK}`); 
    const likesLogoDiv = postDiv.querySelector(`#likes-logo-div-${postPK}`);
    const likesCountDiv = postDiv.querySelector(`#likes-count-div-${postPK}`);
    let likeCount = parseInt(likesCountDiv.textContent); 
    if (likesLogoDiv.classList.contains("not-liked")) {
        fetch(`/like/${post.post_pk}/`, {
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
        fetch(`/like/${post.post_pk}/`, {
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

}; 



/**
 * ----- INITIALIZATION -----
 */
document.addEventListener("DOMContentLoaded", function() {

    // By default load all posts
    newPostForm();
    submitPostForm();
    followingFeed();
}); 