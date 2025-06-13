import { execFileSync, execSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import pLimit from "p-limit";
import ProgressBar from "progress";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

interface Podcast {
  title: string;
  releaseDate: string;
  downloadLink: string;
}

// parse command line arguments
const argv = yargs(hideBin(process.argv))
  .usage(
    "Usage: $0 <json-file> [options]\n\nDownloads podcasts from a JSON file with optional filtering and parallel processing.",
  )
  .options({
    input: {
      alias: "i",
      describe:
        "JSON file containing podcast information (title, releaseDate, downloadLink)",
      type: "string",
      default: "podcasts.json",
    },
    "download-dir": {
      alias: "d",
      describe: "Directory where podcast files will be saved",
      type: "string",
      default: "downloads",
    },
    filter: {
      alias: "f",
      describe: "Case-insensitive regex pattern to filter podcast titles",
      type: "string",
    },
    parallel: {
      alias: "p",
      describe: "Number of podcasts to download simultaneously",
      type: "number",
      default: 8,
    },
    force: {
      describe: "Overwrite existing files instead of skipping them",
      type: "boolean",
      default: false,
    },
    "dry-run": {
      alias: "n",
      describe: "Do not download anything, just print the URLs",
      type: "boolean",
      default: false,
    },
    convert: {
      alias: "c",
      describe:
        "Convert the downloaded files to M4A (AAC) to save space (requires ffmpeg)",
      type: "boolean",
      default: false,
    },
  })
  .example(
    "$0 -i podcasts.json",
    "Download all podcasts to the default directory",
  )
  .example(
    "$0 -i podcasts.json -d my-podcasts",
    "Download to a custom directory",
  )
  .example(
    '$0 -i podcasts.json -f "Märchen"',
    'Download only podcasts with "Märchen" in the title',
  )
  .example(
    "$0 -i podcasts.json -p 5 --force",
    "Download 5 podcasts at once, overwriting existing files",
  )
  .epilogue("For more information, check the README.md file")
  .help()
  .alias("help", "h")
  .version(false)
  .wrap(null)
  .parseSync();

// sanitize filename to be safe for filesystem
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\?%*:|"<>]/g, "-") // replace invalid chars with dash
    .replace(/\s+/g, "_"); // replace spaces with underscore
}

// check if file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(
  url: string,
  outputPath: string,
  force: boolean,
  dryRun: boolean,
): Promise<boolean> {
  // skip if file exists and not forcing
  if (!force && (await fileExists(outputPath))) {
    return false; // file skipped
  }

  if (dryRun) {
    console.log(`Would download ${url} to ${outputPath}`);
    return false;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }

  const body = response.body;
  if (!body) {
    throw new Error(`No response body from ${url}`);
  }

  await pipeline(
    // @ts-expect-error Types between Web Streams and Node.js streams are not perfectly compatible
    Readable.fromWeb(body),
    createWriteStream(outputPath),
  );

  return true; // file downloaded
}

async function convertToM4A(
  inputPath: string,
  dryRun: boolean,
  force: boolean,
): Promise<boolean> {
  const outputPath = inputPath.replace(/\.mp3$/, ".m4a");

  if (!force && (await fileExists(outputPath))) {
    return false; // file skipped
  }

  // 96 kBit/s is plenty for the podcast
  if (dryRun) {
    console.log(`Would convert ${inputPath} to ${outputPath}`);
  } else {
    execFileSync("ffmpeg", [
      "-i", inputPath,
      "-c:a", "aac",
      "-b:a", "96k",
      outputPath
    ]);
  }

  return true; // file converted
}

async function main() {
  try {
    // read and parse JSON file
    const jsonContent = await readFile(argv.input, "utf-8");
    let podcasts: Podcast[] = JSON.parse(jsonContent);

    // check if ffmpeg is installed
    try {
      execSync("ffmpeg -version");
    } catch (error) {
      console.error("ffmpeg is not installed");
      process.exit(1);
    }

    // apply filter if specified
    if (argv.filter) {
      const filterRegex = new RegExp(argv.filter, "i");
      podcasts = podcasts.filter((p) => filterRegex.test(p.title));
      console.log(
        `Filtered to ${podcasts.length} podcasts matching "${argv.filter}"`,
      );
    }

    if (podcasts.length === 0) {
      console.log("No podcasts to download");
      return;
    }

    // ensure download directory exists
    const absoluteDownloadDir = resolve(argv["download-dir"]);
    await mkdir(absoluteDownloadDir, { recursive: true });

    // setup progress bar
    const progressBar = new ProgressBar(
      "[:bar] :current/:total :percent :etas :status :file",
      {
        complete: "=",
        incomplete: " ",
        width: 30,
        total: podcasts.length,
      },
    );

    // setup concurrency limit
    const limit = pLimit(argv.parallel);

    // create download tasks
    const downloadTasks = podcasts.map((podcast) => {
      return limit(async () => {
        const filename = `${sanitizeFilename(podcast.title)}.mp3`;
        const outputPath = join(absoluteDownloadDir, filename);

        try {
          const wasDownloaded = await downloadFile(
            podcast.downloadLink,
            outputPath,
            argv.force,
            argv["dry-run"],
          );
          if (argv.convert) {
            const wasConverted = await convertToM4A(
              outputPath,
              argv["dry-run"],
              argv.force,
            );
            progressBar.tick({
              file: filename,
              status: wasConverted ? "converted" : "skipped",
            });
          } else {
            progressBar.tick({
              file: filename,
              status: wasDownloaded ? "downloaded" : "skipped",
            });
          }
        } catch (error) {
          console.error(`\nFailed to download ${podcast.title}:`, error);
        }
      });
    });

    // wait for all downloads to complete
    await Promise.all(downloadTasks);

    console.log("\nDownloads complete!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
