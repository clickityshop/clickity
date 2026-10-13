(() => {
  const favicon = document.querySelector('link[rel~="icon"]');
  if (!favicon) {
    throw new Error("The page is missing its favicon link.");
  }

  const seasonalIcons = [
    { start: "10-26", end: "10-31", href: "assets/halloween-favicon.svg" },
  ];

  function updateFavicon() {
    const now = new Date();
    const date = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const season = seasonalIcons.find(({ start, end }) => start <= end
      ? date >= start && date <= end
      : date >= start || date <= end);

    favicon.href = season ? season.href : "assets/favicon.svg";

    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    window.setTimeout(updateFavicon, tomorrow.getTime() - now.getTime());
  }

  updateFavicon();
})();
