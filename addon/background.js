browser.contextMenus.create({
  id: "find-plus-one",
  title: "Find in a linked page...",
  contexts: ["page"],
  documentUrlPatterns: ["<all_urls>"]
});

browser.commands.onCommand.addListener(async (command) => {
  if (command === "find-plus-one") {
    let tabs = await browser.tabs.query({active: true});
    findPlusOne(tabs[0]);
  }
});

browser.browserAction.onClicked.addListener(async () => {
  let tabs = await browser.tabs.query({active: true});
  findPlusOne(tabs[0]);
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  findPlusOne(tab);
});

async function findPlusOne(tab) {
  console.log("Starting search on", tab.id);
  await browser.tabs.executeScript(tab.id, {
    file: "search.js"
  });
}

browser.runtime.onMessage.addListener((message, source) => {
  if (message.type === "linksToLoad") {
    loadLinks(message.urls, message.searchId, source.tab.id);
  } else if (message.type === "unloadSearch") {
    unloadSearch(message.searchId);
  } else if (message.type === "search") {
    search(message.term, message.searchId);
  } else if (message.type === "searchResult") {
    message.sourceTabId = source.tab.id;
    sendSearchResult(message);
  } else {
    console.error("Unexpected message type:", message.type);
  }
});

let tabIdsForSearchId = {};
let sourceTabIdForSearchId = {};

async function loadLinks(links, searchId, sourceTabId) {
  sourceTabIdForSearchId[searchId] = sourceTabId;
  let tabIds = tabIdsForSearchId[searchId] = [];
  console.log("opening all of", links);
  for (let link of links.slice(0, 5)) {
    let tab = await browser.tabs.create({active: false, openerTabId: sourceTabId, url: link});
    tabIds.push(tab.id);
  }
  await browser.tabs.hide(tabIds);
  console.log("hid all of", tabIds);
  for (let tabId of tabIds) {
    await browser.tabs.executeScript(tabId, {
      file: "finder.js"
    });
    console.log("executed script in each");
  }
}

async function unloadSearch(searchId) {
  let tabIds = tabIdsForSearchId[searchId];
  delete tabIdsForSearchId[searchId];
  await browser.tabs.remove(tabIds);
}

async function search(term, searchId) {
  let tabIds = tabIdsForSearchId[searchId];
  console.log("sending to all tabs", tabIds);
  for (let tabId of tabIds) {
    console.log("sending search to tab", tabId);
    browser.tabs.sendMessage(tabId, {
      "type": "search",
      term,
      searchId,
    }).catch(async (error) => {
      // Let's try it again, this time with the script...
      console.info("Got error sending search, trying again", tabId, String(error));
      await browser.tabs.executeScript(tabId, {
        file: "finder.js"
      });
      await browser.tabs.sendMessage(tabId, {
        "type": "search",
        term,
        searchId,
      });
    });
  }
}

async function sendSearchResult(message) {
  let tabId = sourceTabIdForSearchId[message.searchId];
  console.log("send message", tabId, message.searchId, sourceTabIdForSearchId, message);
  await browser.tabs.sendMessage(tabId, message);
}
