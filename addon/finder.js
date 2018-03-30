browser.runtime.onMessage.addListener((message) => {
  if (message.type === "search") {
    search(message.term, message.searchId);
  }
});

// var just in case this file gets included twice...
var BLOCK_DISPLAYS = {
  "block": true,
  "table": true,
  "flex": true,
  "grid": true,
  "list-item": true,
}

function isBlockElement(el) {
  return !!BLOCK_DISPLAYS[getComputedStyle(el).display];
}

function isAncestorOfOne(el, elements) {
  for (let element of elements) {
    if (isAncestor(el, element)) {
      return true;
    }
  }
  return false;
}

function isAncestor(el, maybeChild) {
  let start = maybeChild;
  while (maybeChild) {
    if (el === maybeChild) {
      return true;
    }
    maybeChild = maybeChild.parentNode;
  }
  return false;
}

function search(term, searchId) {
  let results = [];
  let elements = Array.from(document.querySelectorAll("*"));
  elements.reverse();
  for (let element of elements) {
    if (!isBlockElement(element)) {
      continue;
    }
    if (element.textContent.includes(term)) {
      if (isAncestorOfOne(element, results)) {
        continue;
      }
      results.push(element);
    }
  }
  let sendResults = results.map(e => captureResultInformation(e, term));
  browser.runtime.sendMessage({
    type: "searchResult",
    title: document.title,
    documentUrl: location.href,
    results: sendResults,
    searchId,
  });
}

function captureResultInformation(element, term) {
  let snapshot = screenshotElement(element);
  return {
    snapshot,
    textContent: element.textContent,
  };
}

function screenshotElement(element) {
  let box = element.getBoundingClientRect();
  return screenshotBox(box);
}

function screenshotBox(box) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = box.width * window.devicePixelRatio;
  canvas.height = box.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.drawWindow(window, box.left, box.top, box.width, box.height, "#fff");
  return {
    url: canvas.toDataURL(),
    height: box.height,
    width: box.width,
  };
}

console.log("finder loaded", location.href);
