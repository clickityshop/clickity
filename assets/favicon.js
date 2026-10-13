(() => {
  const favicon = document.querySelector('link[rel~="icon"]');
  if (!favicon) {
    throw new Error("The page is missing its favicon link.");
  }
  const logoDot = document.querySelector(".logo .dot");

  const seasonalIcons = [
    { start: "03-01", end: "03-31", href: "assets/st-patricks-favicon.png" },
    { start: "10-01", end: "10-31", href: "assets/halloween-favicon.svg" },
    { start: "12-01", end: "12-31", href: "assets/christmas-favicon.png" },
  ];

  function updateFavicon() {
    const now = new Date();
    const date = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const season = seasonalIcons.find(({ start, end }) => start <= end
      ? date >= start && date <= end
      : date >= start || date <= end);

    const href = season ? season.href : "assets/favicon.svg";
    favicon.href = href;
    favicon.type = href.endsWith(".png") ? "image/png" : "image/svg+xml";
    if (logoDot) {
      logoDot.style.backgroundImage = season ? `url("${href}")` : "none";
    }

    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    window.setTimeout(updateFavicon, tomorrow.getTime() - now.getTime());
  }

  updateFavicon();
})();
