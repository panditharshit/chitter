// JS code for HTMLModElement.ejs

// Jquery code to trigger dropdown menu
$('.ui.dropdown')
    .dropdown()
    ;

// jQuery code to display a toast message on recieving message through res.render 
if (document.querySelector("#updateMessage").innerHTML.trim() != "") {
    $('#updateMessage')
        .toast({
            class: 'success',
            message: document.querySelector("#updateMessage").innerHTML,
            closeIcon: true,
        })
        ;
}

// Utility values from backend
const username = document.getElementById("username").innerHTML.trim();
const picture = document.getElementById("picture").innerHTML.trim();
const email = document.getElementById("email").innerHTML.trim();
console.log(username, picture, email);

// JS for tweet handling

const saveTweet = document.getElementById("save-tweet"); // save tweet button   
const tweetBox = document.querySelector(".tweet-box");  // tweet box / feed where tweets will be shown
let previousLength = 0;
// Checking user authentication 
const input = document.getElementById("tweet-input"); //textarea to input tweets
input.addEventListener("keyup", (e) => {
    checkStatus();
});

// function to focus on input textarea when called
function focusOnTweet() {
    input.focus();
    input.style.color = "blue";
}

// Check Status of User Function (if authenticated or not)
async function checkStatus() {
    const res = await fetch("/status");
    const result = await res.json();
    console.log("result is" + result);
    if (result == 0) {
        $('body')
            .toast({
                class: 'warning',
                message: 'Login to tweet!'
            })
            ;
        saveTweet.setAttribute("disabled", "true");
    }
}

// handling what to happen if save tweet button is clicked
saveTweet.addEventListener("click", (e) => {
    if (document.getElementById("tweet-input").value == "") {
        $('body')
            .toast({
                class: 'warning',
                message: 'Enter Some Text!'
            })
            ;
    }
    else {
        saveTweetFunction();
        getNewTweet();
    }
});

// Function to save User's new tweets
async function saveTweetFunction() {
    let tweetInput = document.getElementById("tweet-input").value;
    let authorName = "Guest";
    if (username.trim() != "") {
        authorName = username;
    }
    // code to get date & time
    var todaysDate = new Date().getDate();
    var month = new Date().getMonth() + 1;
    var year = new Date().getFullYear();
    let date = todaysDate + "/" + month + "/" + year;
    console.log("tweetInput" + tweetInput);
    let likes = [];
    let data = { authorName, date, tweetInput, hiddenImgUrl ,email, picture, likes };
    console.log(data, "here's the data");
    let options = {
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        body: JSON.stringify(data)
    };
    let res = await fetch('/newtweet', options);
    console.log(res, "response from backend for save");
    console.log("tweet saved");
    makeInputNull();
}
function makeInputNull() {
    document.getElementById("tweet-input").value = "";
}


// Function To get tweets when page loads first time
async function getTweet() {
    console.log("function called");
    let res = await fetch(`/getTweet`);
    let tweet = await res.json();
    previousLength = tweet.length;

    if (tweet != "") {
        // flag value checks if user has liked the tweet or not
        // if liked then the color of like button changed to red and is disabled
        for (let i = 0; i < tweet.length; i++) {
            var flag = 0;
            for (let j = 0; j < tweet[i].likes.length; j++) {
                if (tweet[i].likes[j] == email)
                    flag = 1;
            }
            if (flag == 0) {
                // insert tweets into tweet box /feed
                tweetBox.innerHTML =
                    `<div class="event">
            <div class="label">
            <img src="${tweet[i].picture}">
            </div>
            <div class="content">
            <div class="summary">
                               <a>${tweet[i].authorName}</a> tweeted
                               <div class="date">
                                   ${new Date().getDate() - tweet[i].date.split("/")[0]} days ago
                               </div>
                               </div>
                           <div class="extra text">
                               ${tweet[i].tweetInput}
                               </div>
                           <form action="/likesupdate" method="post">
                           <input type="text" class="tweet-id" name="tweetId" value="${tweet[i]._id}" hidden/>
                           <button class="meta like-button" type="submit">
                           <a class="like">
                           <i class="like icon"></i> ${tweet[i].likes.length} Likes
                               </a>
                               </button>
                           </form>
                       </div>
                       </div>` + tweetBox.innerHTML;
            }
            else if (flag == 1) {
                // insert tweets into tweet box /feed
                tweetBox.innerHTML =
                    `<div class="event">
           <div class="label">
           <img src="${tweet[i].picture}">
           </div>
           <div class="content">
           <div class="summary">
           <a>${tweet[i].authorName}</a> tweeted
           <div class="date">
           ${new Date().getDate() - tweet[i].date.split("/")[0]} days ago
           </div>
           </div>
           <div class="extra text">
           ${tweet[i].tweetInput}
                           </div>
                           <form action="/likesupdate" method="post">
                           <input type="text" class="tweet-id" name="tweetId" value="${tweet[i]._id}" hidden/>
                           <button class="meta like-button" type="submit" disabled>
                           <a class="like">
                           <i class="like red icon"></i> ${tweet[i].likes.length} Likes
                           (You Liked)
                           </a>
                           </button>
                           </form>
                           </div>
                           </div>` + tweetBox.innerHTML;
            }

        }
    }
    else{
        tweetBox.innerHTML = `<h2 style="margin-top:15px;"> Your posts and posts of people you follow will appear here.</h2>`
    }
}
getTweet();

// Function to get when new tweet is updated
async function getNewTweet() {
    console.log(" prev length" + previousLength);
    console.log(" get new tweet function called");
    let res = await fetch(`/getTweet`);
    let tweet = await res.json();

    // flag value checks if user has liked the tweet or not
    // if liked then the color of like button changed to red and is disabled
    for (let i = previousLength; i < tweet.length; i++) {
        var flag = 0;
        for (let j = 0; j < tweet[i].likes.length; j++) {
            if (tweet[i].likes[j] == email)
                flag = 1;
        }
        if (flag == 0) {
            // insert tweets into tweet box /feed
            tweetBox.innerHTML =
                `<div class="event">
                       <div class="label">
                           <img src="${tweet[i].picture}">
                       </div>
                       <div class="content">
                           <div class="summary">
                               <a>${tweet[i].authorName}</a> tweeted
                               <div class="date">
                                   ${new Date().getDate() - tweet[i].date.split("/")[0]} days ago
                               </div>
                           </div>
                           <div class="extra text">
                               ${tweet[i].tweetInput}
                           </div>
                           <form action="/likesupdate" method="post">
                           <input type="text" class="tweet-id" name="tweetId" value="${tweet[i]._id}" hidden/>
                           <button class="meta like-button" type="submit">
                               <a class="like">
                                   <i class="like icon"></i> ${tweet[i].likes.length} Likes
                               </a>
                           </button>
                           </form>
                       </div>
                   </div>` + tweetBox.innerHTML;
        }
        else if (flag == 1) {
            // insert tweets into tweet box /feed
            tweetBox.innerHTML =
                `<div class="event">
                       <div class="label">
                           <img src="${tweet[i].picture}">
                       </div>
                       <div class="content">
                           <div class="summary">
                               <a>${tweet[i].authorName}</a> tweeted
                               <div class="date">
                                   ${new Date().getDate() - tweet[i].date.split("/")[0]} days ago
                               </div>
                           </div>
                           <div class="extra text">
                               ${tweet[i].tweetInput}
                           </div>
                           <form action="/likesupdate" method="post">
                           <input type="text" class="tweet-id" name="tweetId" value="${tweet[i]._id}" hidden/>
                           <button class="meta like-button" type="submit" disabled>
                               <a class="like">
                                   <i class="like red icon"></i> ${tweet[i].likes.length} Likes
                                   (You Liked)
                               </a>
                           </button>
                           </form>
                       </div>
                   </div>` + tweetBox.innerHTML;
        }
    }
    previousLength = tweet.length;
}