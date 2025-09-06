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
    postDiv.id = `post-div-${post.post_pk}`;

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
        editLink.addEventListener("click", () => editPost(post.post_pk));
        editLink.style.cursor = "pointer";
    };

    // Prepend username header
    elements.splice(0,0, userHeader);

    elements.forEach(el => postDiv.appendChild(el));
    return postDiv;
};


/**
 * Pagination elements
 */
function pagination(currentPage, data) {
    const paginationView = document.querySelector("#pagination-view");
    const paginationNav = document.createElement("nav");
    const navList = document.createElement("ul");
    navList.classList.add("pagination");
    currentPage = parseInt(currentPage);

    if (currentPage > 1) {
        const prevListItem = document.createElement("li"); 
        prevListItem.classList.add("page-item");

        const prevLink = document.createElement("a"); 
        prevLink.classList.add("page-link")
        prevLink.href = `?page=${currentPage - 1}`; 
        prevLink.textContent = "Previous"; 

        prevListItem.appendChild(prevLink); 
        navList.appendChild(prevListItem); 
    }; 

    const currentListItem = document.createElement("li"); 
    currentListItem.classList.add("page-item");

    const pageNumber = document.createElement("a");
    pageNumber.classList.add("page-link");
    pageNumber.href = `?page=${currentPage}`;
    pageNumber.textContent = currentPage; 

    currentListItem.appendChild(pageNumber);
    navList.appendChild(currentListItem);

    if (currentPage < data.total_pages) {
        const nextListItem = document.createElement("li"); 
        nextListItem.classList.add("page-item");

        const nextLink = document.createElement("a"); 
        nextLink.classList.add("page-link");
        nextLink.href = `?page=${currentPage + 1}`
        nextLink.textContent = "Next"; 

        nextListItem.appendChild(nextLink);
        navList.appendChild(nextListItem);
    }; 
    paginationNav.appendChild(navList);
    paginationView.appendChild(paginationNav);
}


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
function feed(currentPage, infiniteScrollFinished) {
    const feedView = document.querySelector("#feed-view")
    // Show the feed view
    feedView.style.display = "block";

    // --- REQUEST POSTS FROM SERVER --- 
    fetch(`/posts/?page=${currentPage}`)
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
        const totalPages = data.total_pages; 
        console.log("inifiniteScrollLogic initialization")
        infiniteScrollLogic(currentPage, totalPages);
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



/**
 * Switch a post into edit mode 
 */
function editPost(post_pk) {
    const editDiv = document.querySelector(`#post-div-${post_pk}`)
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
} 


/**
 * Update a post div with edited content
 * @Param {Object} data - The Push data returned from API
 */ 
function updatePostDiv(data) {
    if(data.success == true) {
        const postDiv = document.querySelector(`#post-div-${data.post.post_pk}`); 

        const contentPara = postDiv.querySelector("p"); 
        contentPara.innerText = data.post.content; 
        contentPara.style.display = "block"; 

        postDiv.querySelector("a").style.display = "block";

        postDiv.querySelector("textarea").style.display = "none";
        postDiv.querySelector("button").style.display = "none";
    }
    }


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
                feed(currentPage, infiniteScrollFinished);
            };
        };
    };
    
}; 


function inInfiniteScroll(currentPage) {
    currentPage += 1;
    return feed(currentPage); 
}; 


function initializeInfiniteScroll(currentPage, totalPages) {
    console.log("in initialization"); 
    console.log("currentPage", currentPage); 
    console.log("totalPages", totalPages)
    if (currentPage < parseInt(totalPages)) {
        console.log("currentPage < totalPages")
        return infiniteScrollLogic(currentPage);
    }; 
    console.log("currentPage = totalPages, END of LOOP")
    return 1;
}


/**
 * ----- INITIALIZATION -----
 */
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
    // By default load all posts
    newPostForm();
    submitPostForm();
    feed(page, infiniteScrollFinished);
}); 