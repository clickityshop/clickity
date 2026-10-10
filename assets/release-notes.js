(function () {
  const storageKey = "clickity-last-seen-commit";
  const dialog = document.createElement("dialog");
  dialog.id = "releaseDialog";
  dialog.className = "release-dialog";
  dialog.setAttribute("aria-labelledby", "releaseHeading");

  const header = document.createElement("div");
  header.className = "release-dialog-head";
  const icon = document.createElement("img");
  icon.src = "assets/favicon.svg";
  icon.alt = "";
  icon.width = 48;
  icon.height = 48;

  const closeButton = document.createElement("button");
  closeButton.className = "btn small alt";
  closeButton.type = "button";
  closeButton.textContent = "Close";
  header.append(icon, closeButton);

  const heading = document.createElement("h2");
  heading.id = "releaseHeading";
  heading.textContent = "Welcome! Here's what changed";

  const highlights = document.createElement("ul");
  highlights.id = "releaseHighlights";
  highlights.className = "release-highlights";
  const summary = document.createElement("p");
  summary.id = "releaseFilesSummary";
  summary.className = "release-files-summary";

  const commitLink = document.createElement("a");
  commitLink.id = "releaseCommitLink";
  commitLink.className = "btn blue";
  commitLink.target = "_blank";
  commitLink.rel = "noopener";
  commitLink.textContent = "See details";

  dialog.append(header, heading, highlights, summary, commitLink);
  document.body.append(dialog);

  function summarizeChanges(files) {
    const changes = new Set();

    files.forEach((file) => {
      const path = file.filename.toLowerCase();
      const patch = file.patch || "";

      if (path === "products.js") {
        changes.add(/colors:\s*\[/.test(patch) && /red/i.test(patch) && /blue/i.test(patch)
          ? "Updated product color options; each product still gets a random color when the shop opens."
          : "Updated the product catalog.");
      } else if (path === "assets/art.js") {
        changes.add("Updated the product illustrations.");
      } else if (path === "assets/styles.css") {
        changes.add("Updated the site's colors and visual styling.");
      } else if (path === "assets/favicon.svg") {
        changes.add("Updated the site favicon.");
      } else if (path === "assets/release-notes.js") {
        changes.add("Updated the welcome popup with a summary of site changes.");
      } else if (path === "assets/app.js") {
        changes.add("Updated the shop and checkout experience.");
      } else if (path === "assets/orders.js" || path === "orders.html") {
        changes.add("Updated the owner orders dashboard.");
      } else if (path === "assets/booth.js" || path === "booth.html") {
        changes.add("Updated the in-person sales booth.");
      } else if (path.endsWith(".md")) {
        changes.add("Updated project documentation.");
      } else if (path.endsWith(".html")) {
        changes.add("Updated site page content or layout.");
      } else if (path.startsWith("worker/")) {
        changes.add("Updated order processing on the server.");
      } else if (/\.(spec|test)\.[cm]?[jt]s$/.test(path)) {
        changes.add("Updated automated tests.");
      } else {
        changes.add("Updated site files.");
      }
    });

    return changes.size ? [...changes] : ["Published site updates."];
  }

  function rememberDismissal() {
    if (!dialog.dataset.commitSha) return;
    try {
      localStorage.setItem(storageKey, dialog.dataset.commitSha);
    } catch (error) {
      console.warn("Could not save the last-seen update.", error);
    }
  }

  dialog.addEventListener("cancel", rememberDismissal);
  closeButton.addEventListener("click", () => {
    rememberDismissal();
    dialog.close();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    rememberDismissal();
    dialog.close();
  });

  fetch("https://api.github.com/repos/clickityshop/clickity/commits/main", {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  })
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);
      return response.json();
    })
    .then((commit) => {
      if (typeof commit.sha !== "string" || !/^[a-f0-9]{40}$/i.test(commit.sha)) {
        throw new Error("GitHub returned an invalid commit ID.");
      }

      let lastSeenCommit = "";
      try {
        lastSeenCommit = localStorage.getItem(storageKey) || "";
      } catch (error) {
        console.warn("Could not read the last-seen update.", error);
      }
      if (lastSeenCommit === commit.sha) return;

      const files = Array.isArray(commit.files) ? commit.files : [];
      const added = files.reduce((total, file) => total + (Number(file.additions) || 0), 0);
      const removed = files.reduce((total, file) => total + (Number(file.deletions) || 0), 0);
      summary.textContent = files.length
        ? `${files.length} file${files.length === 1 ? "" : "s"} changed · +${added} / −${removed} lines`
        : "Site changes are ready.";

      summarizeChanges(files).forEach((change) => {
        const item = document.createElement("li");
        item.textContent = change;
        highlights.append(item);
      });

      dialog.dataset.commitSha = commit.sha;
      commitLink.href = `https://github.com/clickityshop/clickity/commit/${commit.sha}`;
      dialog.showModal();
    })
    .catch((error) => {
      console.warn("Could not load the latest site update.", error);
    });
})();
