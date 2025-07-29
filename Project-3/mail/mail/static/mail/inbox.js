alert("Script updated!");

document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM is loaded")

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => {
    compose_email(); // switch view
    send_email(); // handle form submission
    }
  );

  // 
  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email(recipient = "", subject = "", body = "") {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector("#email-view").style.display = "none";

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = recipient;
  document.querySelector('#compose-subject').value = subject;
  document.querySelector('#compose-body').value = body;
}

function send_email() {

  // Make

  document.querySelector('#compose-form').addEventListener("submit", function(event) {
    event.preventDefault(); // Prevent page reload 

    console.log("Compose form submitted"); // Confirm that form was submitted in the console
    const recipients = document.querySelector('#compose-recipients').value; // Extract user input from the form
    const subject = document.querySelector('#compose-subject').value;
    const body = document.querySelector('#compose-body').value;
    [recipients, subject, body].forEach(function(item) {
      console.log(item); // Check the user input in the console
    });
    fetch("/emails", {
      method: "POST", 
      body: JSON.stringify({
        recipients: recipients, 
        subject: subject, 
        body: body
      })
    })
    .then(response => response.json())
    .then(result => {
      console.log(result)
    })
  })

}





function load_mailbox(mailbox) {
  // Check function is being loaded 
  console.log(`loading ${mailbox}`)
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector("#email-view").style.display = "none";

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>
  <hr>
  `;

  // Make get request for the emails 
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(data => {
    console.log(`get request response:`);
    console.log(data);
    
    // Loop through each email in the response object
    data.forEach(function(email) {
      console.log("email body");
      console.log(email.body);
      console.log(`email.read is:`, email.read, typeof email.read);
      
      // Create email div to show sender, subject, time
      const emailDiv = document.createElement("div");
      emailDiv.innerHTML = `
      <strong>From:</strong> ${email.sender} <br> 
      <strong>Subject:</strong> ${email.subject} <br>
      <strong>Time:</strong> ${email.timestamp}
      <hr>
      `; 

      // Set background color of div based on if the email has been read
      console.log("about to enter if statement");
      if (email.read === true) {
        console.log("Email has been read");
        emailDiv.style.backgroundColor = "lightgray"
      } else { 
        console.log("Email is unread");
        emailDiv.style.backgroundColor = "white"
      };

      // Add pointer to mouse
      emailDiv.addEventListener("mouseenter", function() {
        emailDiv.style.cursor = "pointer"
      });

      // Add div to the emails view
      document.querySelector("#emails-view").appendChild(emailDiv);

      // Take user to email page if clicked on 
      emailDiv.addEventListener("click", () => view_email(email))

    })
  })
  .catch(error => {console.error("Fetch error:", error)})
;
}



// Archive button function
function handleArchiveClick(event, email) {
  console.log("Archive button clicked");

  // Toggle the archived status 
  const newStatus = !email.archived;

  // Make PUT request to change archive status 
  fetch(`emails/${email.id}`,{
    method: "PUT", 
    body: JSON.stringify({
      archived: newStatus 
    })
  })
  .then(response => {
    if (response.ok) {
      console.log(`Email was ${newStatus ? "archived": "unarchived"}.`); 
      // Reload view email display to update button label and stat 
      view_email(email);
    }
    else {
      console.error("Failed to update archive status", response.status);
    }
  })
  .catch(error => {
    console.error("Network error", error);
  });
}


// Reply button function
function handleReplyClick(event, email) {
  const reply = /^(Re:)/.test(email.subject);
  const bodyAttach = `
  
  On ${email.timestamp} ${email.sender} wrote: ${email.body}`; 
  if (reply === true) {
    compose_email(recipient=email.sender, subject=email.subject, body=bodyAttach);
  }
  else {
    compose_email(recipient=email.sender, subject=`Re: ${email.subject}`, body=bodyAttach);
  };

}


function view_email(email) {

  // Check function is called and the inputted email content
  console.log("view email function triggered");
  console.log("email.id is", email.id, typeof email.id);
  document.querySelector("#email-view").innerHTML = "";


  // Make GET request and display the selected email
  fetch(`/emails/${email.id}`)
  .then(response => response.json())
  .then(data => {
    console.log("GET request response");
    console.log(data);


    // Show only the email view
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'none';
    document.querySelector("#email-view").style.display = 'block'; 


    // Create divs for details and body
    const detailsDiv = document.createElement("div");
    const bodyDiv = document.createElement("div");

    // Fill detailsDiv 
    detailsDiv.innerHTML = `
    <strong>From:</strong> ${data.sender} <br> 
    <strong>Subject:</strong> ${data.subject} <br>
    <strong>Time:</strong> ${data.timestamp} <br> 
    <button class="btn btn-sm btn-outline-primary" id="reply">Reply</button> <br>
    `; 

    // Create archive/unarchive button
    const archiveButton = document.createElement("button"); // create new button 
    archiveButton.className = "btn btn-sm btn-outline-primary"; // style the button
    archiveButton.innerText = data.archived // Set the label depending on the status of archive
    ? "Unarchive"
    : "Archive";


    // Archive/unarchive button functionality
    console.log("Check email object before passed in to Archive button", data)
    archiveButton.addEventListener("click", event => handleArchiveClick(event, data));

    // Add archive button and <hr> to detailsDiv
    detailsDiv.appendChild(archiveButton);
    detailsDiv.appendChild(document.createElement("hr"));

    // Fill bodyDiv with email body
    bodyDiv.innerHTML = `
    ${data.body}
    `;

    // Append everything to #email-view div
    document.querySelector("#email-view").appendChild(detailsDiv);
    document.querySelector("#email-view").appendChild(bodyDiv);

    // Reply button functionality 
    document.querySelector("#reply").addEventListener("click", event => handleReplyClick(event, data))
  });

  // Make PUT request to mark email as read
  fetch(`emails/${email.id}`, {
    method: "PUT", 
    body: JSON.stringify({
      read: true
    })
  })
  .then(response => {
    if (response.ok) {
      console.log("Email marked as read")
    }
    else {
      console.error("Failed to mark email as read:", response.status)
    }
  })
  .catch(error => {
    console.error("Network error:", error)
  });
}


