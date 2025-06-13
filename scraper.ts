import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import ProgressBar from "progress";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

interface Podcast {
  title: string;
  releaseDate: string;
  downloadLink: string;
  description: string;
}

// parse command line arguments
const argv = yargs(hideBin(process.argv))
  .usage(
    "Usage: $0 [options]\n\nScrapes podcasts from ohrenbaer.de and saves them to a JSON file.",
  )
  .options({
    output: {
      alias: "o",
      describe: "Path to save the JSON output file",
      type: "string",
      default: "podcasts.json",
    },
    "no-headless": {
      describe: "Do not run browser in headless mode",
      type: "boolean",
      default: false,
    },
  })
  .example("$0", "Scrape podcasts to podcasts.json")
  .example("$0 -o my-podcasts.json", "Save to a custom JSON file")
  .epilogue(
    "The output file can be used with the downloader tool to fetch the podcasts.",
  )
  .help()
  .alias("help", "h")
  .version(false)
  .wrap(null)
  .parseSync();

async function scrapePodcasts(): Promise<Podcast[]> {
  console.log("Launching browser...");
  const browser = await chromium.launch({
    headless: !argv["no-headless"],
  });

  console.log("Creating new context...");
  const context = await browser.newContext();

  console.log("Creating new page...");
  const page = await context.newPage();

  const podcasts: Podcast[] = [];

  try {
    // Navigate to the page
    await page.goto("https://www.ohrenbaer.de/podcast/podcast.html");

    console.log("Waiting for articles to be visible...");
    // Wait for the articles to be visible
    await page.waitForSelector("article.doctypeaudio");

    // Get all articles on the current page
    const articles = await page.$$("article.doctypeaudio");

    console.log("Found podcasts:", articles.length);

    // Process each podcast
    const progressBar = new ProgressBar(
      "Scraping podcasts [:bar] :current/:total :percent",
      {
        complete: "=",
        incomplete: " ",
        width: 30,
        total: articles.length,
      },
    );

    for (const article of articles) {
      try {
        // Extract title (combining roofline and title)
        const roofline = await article.$eval(
          ".manualteaserroofline",
          (el) => el.textContent || "",
        );
        const titleText = await article.$eval(
          ".manualteasertitle",
          (el) => el.textContent || "",
        );
        const title = `${roofline} - ${titleText}`.trim();

        // Extract description from first p in "manualteasershorttext"
        const description = await article.$eval(
          ".manualteasershorttext",
          (el) => el.textContent || "",
        );

        // Extract date and convert to ISO string
        const dateText = await article.$eval(
          "time",
          (el) => el.getAttribute("datetime") || "",
        );
        const releaseDate = new Date(dateText).toISOString();

        // Extract download link
        const downloadLink = await article.$eval(
          "a.ico_download",
          (el) => el.getAttribute("href") || "",
        );

        if (title && releaseDate && downloadLink) {
          podcasts.push({
            title,
            releaseDate,
            downloadLink,
            description,
          });
        }

        progressBar.tick();
      } catch (articleError) {
        console.error("Error processing podcast:", articleError);
      }
    }

    await browser.close();

    return podcasts;
  } catch (error) {
    console.error("Error running scraper:", error);
    await browser.close();
    return [];
  }
}

async function main() {
  try {
    const podcasts = await scrapePodcasts();
    const outputPath = resolve(argv.output);
    await writeFile(outputPath, JSON.stringify(podcasts, null, 2));
    console.log(
      `Successfully saved ${podcasts.length} podcasts to ${outputPath}`,
    );
  } catch (error) {
    console.error("Failed to save podcasts:", error);
    process.exit(1);
  }
}

// Run the scraper
main();
