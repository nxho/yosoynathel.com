import markdownIt from "markdown-it";
import markdownItObsidian from "markdown-it-obsidian";

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
  // Include all files under src (e.g. Film Ratings); Eleventy reads useGitIgnore (capital I).
  eleventyConfig.setUseGitIgnore(false);

  const md = markdownIt({
    html: true,
    linkify: true,
  }).use(markdownItObsidian);

  eleventyConfig.setLibrary("md", md);

  // Format date as YYYY-MM-DD (handles Date objects and date strings)
  eleventyConfig.addNunjucksFilter("dateYYYYMMDD", (date) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  // Film ratings: 0 = thumbs down, 1 = thumbs up, 2 = two thumbs up
  eleventyConfig.addNunjucksFilter("ratingThumbs", (rating) => {
    const r = Number(rating);
    if (r === 0) return "👎";
    if (r === 1) return "👍";
    if (r === 2) return "👍👍";
    return "";
  });

  // Collection: all film ratings (markdown with tags: film + review), sorted by watched date (newest first).
  eleventyConfig.addCollection("filmRatings", (api) => {
    return api.getFilteredByTags("film", "review")
      .filter((entry) => entry.data.title && entry.data.rating != null)
      .sort((a, b) => {
        const d1 = a.data.watched ? new Date(a.data.watched) : new Date(0);
        const d2 = b.data.watched ? new Date(b.data.watched) : new Date(0);
        return d2 - d1;
      });
  });

  // Copy CSS and static assets to output
  eleventyConfig.addPassthroughCopy("src/css");
  // Copy images/assets from synced content (e.g. Obsidian embeds)
  eleventyConfig.addPassthroughCopy("src/content/**/*.png");
  eleventyConfig.addPassthroughCopy("src/content/**/*.jpg");
  eleventyConfig.addPassthroughCopy("src/content/**/*.jpeg");
  eleventyConfig.addPassthroughCopy("src/content/**/*.gif");
  eleventyConfig.addPassthroughCopy("src/content/**/*.webp");
  eleventyConfig.addPassthroughCopy("src/content/**/*.svg");
  eleventyConfig.addPassthroughCopy("src/content/**/*.pdf");

  return {
    dir: {
      input: "src",
      output: "_site",
    },
    // Don't wipe _site on rebuild so Film Rating pages (and other content) aren't removed
    // when watch/serve triggers a rebuild. For a clean build, run `bun run build` after
    // deleting _site, or run build once without --serve.
    cleanOutputDir: false,
  };
};
