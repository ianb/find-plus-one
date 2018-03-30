let searchId = `frame-${Math.random()}-${Date.now()}`;

let searchFrame = document.createElement("div");
searchFrame.style.position = "fixed";
searchFrame.style.width = "80%";
searchFrame.style.height = "80%";
searchFrame.style.top = "10%";
searchFrame.style.left = "10%";
searchFrame.style.zIndex = "10000000";
searchFrame.style.backgroundColor = "#fff";
searchFrame.style.border = "2px outset #666";
searchFrame.style.padding = "1em";
document.body.appendChild(searchFrame);
searchFrame.innerHTML = `
<div>
  <frameset>
    <legend>Search</legend>
    <input type="text" name="search" style="width: 100%">
  </frameset>

  <div class="find-plus-one-search-result">
  </div>
</div>
`;
let searchInput = searchFrame.querySelector("input[name='search']");
let searchResult = searchFrame.querySelector(".find-plus-one-search-result");


searchInput.addEventListener("keyup", (event) => {
  if (event.code == "Escape") {
    teardown();
  } else if (event.code == "Enter") {
    search(event.target.value);
  }
});

let links = document.querySelectorAll("a[href]")
let urls = new Set();
for (let link of links) {
  let href = link.href;
  if (href.split("#")[0] === location.href) {
    // Just an internal fragment reference
    continue;
  }
  urls.add(href);
}

browser.runtime.sendMessage({
  type: "linksToLoad",
  searchId,
  urls: Array.from(urls.values())
});

function teardown() {
  browser.runtime.sendMessage({
    type: "unloadSearch",
    searchId
  });
  searchFrame.parentNode.removeChild(searchFrame);
}

function search(term) {
  console.log("searching with term", term);
  browser.runtime.sendMessage({
    type: "search",
    term,
    searchId
  });
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "searchResult") {
    showSearchResult(message);
  } else {
    console.error("Unexpected message type:", message);
  }
});

function showSearchResult(page) {
  let div = document.createElement("div");
  div.innerHTML = `
    <div class="title"><a target="_blank" href=""></a></div>
  `;
  div.querySelector(".title a").textContent = page.title;
  div.querySelector(".title a").href = page.documentUrl;
  for (let result of page.results) {
    let resultDiv = document.createElement("div");
    let img = document.createElement("img");
    img.src = result.snapshot.url;
    img.style.maxWidth = "90%";
    img.style.height = "auto"
    img.style.border = "1px #999 inset";
    img.title = result.textContent;
    resultDiv.appendChild(img);
    div.appendChild(resultDiv);
  }
  if (!page.results.length) {
    let errorDiv = document.createElement("div");
    errorDiv.textContent = "No matches";
    div.appendChild(errorDiv);
  }
  searchResult.appendChild(div);
}

searchInput.focus();
