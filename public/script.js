import { getDate } from "./helper/getDate.js";

//grab current tab unique id and url
async function getCurrentTabInfo() {
  console.log("getting most recently used tab");
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  const tabId = tab.id;
  const tabUrl = tab.url;
  return { tabId, tabUrl };
}

document.getElementById("scrape-button").addEventListener("click", async () => {
  console.log("inside extension console");

  const { tabId, tabUrl } = await getCurrentTabInfo();

  // used to check domain name (linkedin, indeed, etc)
  const domain = new URL(tabUrl).hostname;

  // clean url of the job posting, appending to spreadsheet
  const jobUrlWithoutProtocol = tabUrl.split("https://")[1];
  const url = jobUrlWithoutProtocol.split("/?")[0];
  const date = getDate();
  const status = "pending";

  //function/script to be inserted into browser from extension
  function modifyDOM(domain) {
    console.log("script start");

    if (domain == "www.linkedin.com") {
      const salaryParentElement = document.querySelector(".job-details-fit-level-preferences");
      let salary = salaryParentElement?.querySelector("button:first-of-type span.tvm__text--low-emphasis strong")?.innerText;
      if (!salary || !salary.startsWith("$")) {
        salary = "n/a";
      }

      const locationParentElement = document.querySelector(".job-details-jobs-unified-top-card__primary-description-container");
      const location = locationParentElement?.querySelector("span.tvm__text--low-emphasis")?.innerText ?? "n/a";

      const company = document.querySelector(".job-details-jobs-unified-top-card__company-name")?.innerText ?? "n/a";
      const role = document.querySelector(".job-details-jobs-unified-top-card__job-title")?.innerText ?? "n/a";

      return { company, role, location, salary };
    }

    alert("This extension is currently only available for linkedin");
  }

  //go into the browser's current tab to execute javascript
  chrome.scripting
    .executeScript({
      target: { tabId },
      func: modifyDOM,
      args: [domain],
    })
    //return back to extension
    .then(async (results) => {
      console.log("returned from browser tab", results[0].result);
      const { company, role, location, salary } = results[0].result;

      //do not track job if no info is found, send a popup
      if (company == "n/a" && role == "n/a" && location == "n/a" && salary == "n/a") {
        // throw Error("unable to scrape job info")
        alert("unable to scrape job info");
        return;
      }

      const googleScriptsAppEndpoint = "https://script.google.com/macros/s/AKfycbz1NKfwR4VUIo-CMFH_fA2HKf-TeVXyGvmAXWlu11x32nhwz144Lmvi654_fpo-k228nw/exec";
      const data = new URLSearchParams({ date, company, role, location, salary, status, url });

      //try catch will catch run time errors, do not need response/server side error handling
      try {
        // by default, extension fetch is no-cors, so cant send data as json. adding extra line to remove browser error.
        // no-cors means the (browser) javascript will not be able to access the response, so its empty
        await fetch(googleScriptsAppEndpoint, {
          method: "POST",
          body: data,
          mode: "no-cors",
        });
      } catch (error) {
        console.error("error sending fetch request", error);
      }
    });
});
