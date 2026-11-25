import "./main.css";

const form = document.querySelector("#search-form");
const engineSelect = document.querySelector("#search-engine");
const addressInput = document.querySelector("#address");
const newTabButton = document.querySelector("#new-tab");
const tabsElement = document.querySelector("#tabs");
const pagesElement = document.querySelector("#pages");
const statusElement = document.querySelector("#status");
const homeSearchForm = document.querySelector("#home-search-form");
const homeEngineSelect = document.querySelector("#home-search-engine");
const homeAddressInput = document.querySelector("#home-address");
const homeStatusElement = document.querySelector("#home-status");
const homePage = document.querySelector("#home-page");
const browserPage = document.querySelector("#browser-page");
const viewButtons = [...document.querySelectorAll(".nav-item")];
const brandHomeButton = document.querySelector("#brand-home");
const tabs = new Map();

let controller;
let scramjetUtils;
let activeTabId = null;
let nextTabId = 1;

for (const control of [...form.elements, ...homeSearchForm.elements]) {
  control.disabled = true;
}

newTabButton.disabled = true;

function getWispUrl() {
  if (import.meta.env.VITE_WISP_URL) {
    return import.meta.env.VITE_WISP_URL;
  }

  const url = new URL("/wisp/", location.origin);
  url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return url.href;
}

function searchUrl(query, engine = engineSelect.value) {
  const encoded = encodeURIComponent(query);
  return engine === "duckduckgo"
    ? `https://duckduckgo.com/?q=${encoded}`
    : `https://www.bing.com/search?q=${encoded}`;
}

function resolveAddress(value, engine = engineSelect.value) {
  const input = value.trim();
  if (!input) {
    throw new TypeError("Enter a search or URL.");
  }

  if (/^https?:\/\//i.test(input)) {
    return new URL(input).href;
  }

  const looksLikeUrl =
    !/\s/.test(input) &&
    /^(localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(?:\/.*)?$/i.test(input);
  if (looksLikeUrl) {
    return new URL(`https://${input}`).href;
  }

  return searchUrl(input, engine);
}

function setStatus(message) {
  statusElement.textContent = message;
}

function setHomeStatus(message) {
  homeStatusElement.textContent = message;
}

function showPage(view) {
  const isHome = view === "home";
  homePage.hidden = !isHome;
  browserPage.hidden = isHome;

  for (const button of viewButtons) {
    button.setAttribute(
      "aria-current",
      button.dataset.view === view ? "page" : "false",
    );
  }
}

function openInBrowser(url) {
  showPage("browser");
  const activeTab = tabs.get(activeTabId);
  if (activeTab) {
    navigate(activeTab, url);
  } else {
    addTab(url);
  }
}

function activateTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  activeTabId = tabId;
  for (const [id, item] of tabs) {
    const active = id === tabId;
    item.page.classList.toggle("active", active);
    item.selectButton.setAttribute("aria-selected", String(active));
  }

  addressInput.value = tab.url;
}

function updateTabUrl(tab, url) {
  tab.url = url;
  const title = tabTitle(url, tab.number);
  tab.selectButton.textContent = title;
  tab.closeButton.setAttribute("aria-label", `Close ${title}`);
  if (tab.id === activeTabId) {
    addressInput.value = url;
  }
}

function tabTitle(url, number) {
  try {
    return new URL(url).hostname || `Tab ${number}`;
  } catch {
    return `Tab ${number}`;
  }
}

function navigate(tab, url) {
  setStatus("");
  try {
    tab.frame.go(url);
    updateTabUrl(tab, url);
  } catch (error) {
    setStatus(`Could not open page: ${error.message}`);
  }
}

function closeTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  const tabIds = [...tabs.keys()];
  const tabIndex = tabIds.indexOf(tabId);
  tabs.delete(tabId);
  const frameIndex = controller.frames.indexOf(tab.frame);
  if (frameIndex !== -1) {
    controller.frames.splice(frameIndex, 1);
  }
  tab.container.remove();
  tab.page.remove();

  if (tabId !== activeTabId) return;

  const nextTabId = tabIds[tabIndex + 1] ?? tabIds[tabIndex - 1];
  if (nextTabId !== undefined) {
    activateTab(nextTabId);
  } else {
    activeTabId = null;
    addressInput.value = "";
    setStatus("");
    showPage("home");
  }
}

function addTab(url = searchUrl("")) {
  const id = nextTabId++;
  const number = id;
  const container = document.createElement("div");
  container.className = "tab";

  const selectButton = document.createElement("button");
  selectButton.className = "tab-select";
  selectButton.type = "button";
  selectButton.setAttribute("role", "tab");
  selectButton.setAttribute("aria-selected", "false");
  selectButton.textContent = `Tab ${number}`;
  selectButton.addEventListener("click", () => activateTab(id));

  const closeButton = document.createElement("button");
  closeButton.className = "tab-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", `Close Tab ${number}`);
  closeButton.textContent = "×";
  closeButton.addEventListener("click", () => closeTab(id));

  const page = document.createElement("iframe");
  page.className = "page";
  page.title = `Browser tab ${number}`;

  container.append(selectButton, closeButton);
  tabsElement.append(container);
  pagesElement.append(page);

  const tab = {
    id,
    number,
    container,
    selectButton,
    closeButton,
    page,
    frame: null,
    url,
  };
  tabs.set(id, tab);
  tab.frame = controller.createFrame(page, {
    plugins: [
      new scramjetUtils.UrlWatcherPlugin((nextUrl) => updateTabUrl(tab, nextUrl)),
      new scramjetUtils.CatchEscapedLinksPlugin(
        (escapedUrl) =>
          new URL(`/?goto=${encodeURIComponent(escapedUrl.href)}`, location.origin),
      ),
    ],
  });

  activateTab(id);
  navigate(tab, url);
}

homeSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    setHomeStatus("");
    openInBrowser(
      resolveAddress(homeAddressInput.value, homeEngineSelect.value),
    );
  } catch (error) {
    setHomeStatus(error.message);
  }
});

for (const shortcut of document.querySelectorAll(".shortcut-card")) {
  shortcut.addEventListener("click", () => {
    setHomeStatus("");
    openInBrowser(shortcut.dataset.url);
  });
}

for (const button of viewButtons) {
  button.addEventListener("click", () => showPage(button.dataset.view));
}

brandHomeButton.addEventListener("click", () => showPage("home"));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const url = resolveAddress(addressInput.value);
    const activeTab = tabs.get(activeTabId);
    if (activeTab) {
      navigate(activeTab, url);
    } else {
      addTab(url);
    }
  } catch (error) {
    setStatus(error.message);
  }
});

newTabButton.addEventListener("click", () => {
  try {
    showPage("browser");
    addTab();
  } catch (error) {
    setStatus(`Could not open a new tab: ${error.message}`);
  }
});

async function start() {
  showPage("home");
  setHomeStatus("Starting browser...");
  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser does not support service workers.");
  }

  const [
    { default: LibcurlClient },
    { defaultConfigDev },
    { Controller },
    utilities,
  ] = await Promise.all([
    import("@mercuryworkshop/libcurl-transport"),
    import("@mercuryworkshop/scramjet"),
    import("@mercuryworkshop/scramjet-controller"),
    import("@mercuryworkshop/scramjet-utils"),
  ]);
  scramjetUtils = utilities;

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const serviceWorker =
    navigator.serviceWorker.controller ?? registration.active;

  if (!serviceWorker) {
    throw new Error("Scramjet's service worker did not become active.");
  }

  controller = new Controller({
    serviceworker: serviceWorker,
    transport: new LibcurlClient({ wisp: getWispUrl() }),
    scramjetConfig: defaultConfigDev,
  });
  await controller.wait();

  const params = new URLSearchParams(location.search);
  const escapedUrl = params.get("goto");
  if (escapedUrl) {
    history.replaceState(null, "", location.pathname);
  }

  if (escapedUrl) {
    showPage("browser");
    addTab(resolveAddress(escapedUrl));
  }
  for (const control of [...form.elements, ...homeSearchForm.elements]) {
    control.disabled = false;
  }
  newTabButton.disabled = false;
  setHomeStatus("");
  setStatus("");
}

start().catch((error) => {
  console.error("Browser startup failed:", error);
  setHomeStatus(`Browser could not start: ${error.message}`);
  setStatus(`Browser could not start: ${error.message}`);
});
