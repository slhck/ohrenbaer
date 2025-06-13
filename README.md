# Ohrenbär Podcast Tools

<div style="text-align: center;">
<img src="logo.png" width="200" height="200">
</div>

A set of tools to scrape and download Ohrenbär podcasts from [ohrenbaer.de](https://www.ohrenbaer.de).

The downloads are freely available to the public, so this tool just automates the process to make it easier to archive them for your own use.

**Contents:**

- [Description](#description)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
  - [Scraping Podcasts](#scraping-podcasts)
  - [Downloading Podcasts](#downloading-podcasts)
- [License](#license)

## Description

This project consists of two main tools:

1. **Podcast Scraper** (`scrape`): Scrapes podcast information from ohrenbaer.de, including titles, release dates, descriptions, and download links.
2. **Podcast Downloader** (`download`): Downloads podcasts from the scraped information, with support for filtering, parallel downloads, and various customization options.

## Requirements

- Node.js (version 20 or higher recommended)
- `yarn` package manager
- Playwright for web scraping

## Installation

Clone the repository:

```bash
git clone https://github.com/slhck/ohrenbaer.git
cd ohrenbaer
```

Install dependencies:

```bash
yarn install
```

Install Playwright browsers:

```bash
npx playwright install chromium
```

## Usage

### Scraping Podcasts

The scraper tool fetches podcast information from ohrenbaer.de and saves it to a JSON file.

```bash
# Basic usage (saves to podcasts.json)
yarn scrape

# Save to a custom file
yarn scrape -o my-podcasts.json

# Run browser in non-headless mode
yarn scrape --no-headless
```

If the JSON file already exists, the scraper will merge the new podcasts with the existing ones. So you can just continue updating the file when you want to.

### Downloading Podcasts

The downloader tool takes the JSON file produced by the scraper and downloads the podcasts.

```bash
# Download all podcasts using default settings to 'downloads'
yarn download

# Download to a custom directory
yarn download -d my-podcasts

# Filter podcasts by title (case-insensitive regex)
yarn download -f "komplette"

# Download only sequentially
yarn download -p 1

# Force overwrite existing files
yarn download --force

# Dry run (preview without downloading)
yarn download --dry-run
```

#### Further Downloader Options

- `-i, --input`: Input JSON file (default: podcasts.json)
- `-d, --download-dir`: Download directory (default: downloads)
- `-f, --filter`: Case-insensitive regex pattern to filter podcast titles
- `-p, --parallel`: Number of parallel downloads (default: 8)
- `--force`: Overwrite existing files
- `-n, --dry-run`: Preview without downloading
- `-h, --help`: Show help information

## License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
