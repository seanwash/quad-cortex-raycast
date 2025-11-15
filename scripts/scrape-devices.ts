import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import { DEVICE_LIST_URL } from "../lib/constants";

/**
 * Device data structure extracted from the Neural DSP device list page.
 */
interface Device {
  category: string;
  name: string;
  basedOn: string;
}

/**
 * Scrapes the Neural DSP Quad Cortex device list page.
 *
 * HTML Structure:
 * The page uses a React-based div structure (not HTML tables):
 *
 * 1. Category headings: <h2> elements contain the category names
 *    Example: <h2 id="guitar_amps">Guitar amps</h2>
 *
 * 2. Container div: Immediately following each h2 is a container div
 *    Classes: "sc-aabe08f-0 flgqeV"
 *    Example: <div class="sc-aabe08f-0 flgqeV">...</div>
 *
 * 3. Header row: Inside the container, there's a header row (we skip this)
 *    Classes: "sc-edee8d04-0 cyEujK"
 *    Contains column headers: Name, Based on, Added in CorOS, etc.
 *
 * 4. Data rows: Each device is represented as a row div
 *    Classes: "sc-97391185-0 vdqnr"
 *    Example: <div class="sc-97391185-0 vdqnr">...</div>
 *
 * 5. Data cells: Inside each row, cells contain the actual data
 *    Classes: "sc-eb3d5477-0 ijbjQB"
 *    Column order: [Name, Based on, Added in CorOS, Previous name, Updated in CorOS, Replaces]
 *    We only extract the first two columns (Name and Based on)
 *
 * @returns Promise resolving to an array of Device objects
 */
async function scrapeDeviceList(): Promise<Device[]> {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    console.log("Fetching device list page...");
    await page.goto(DEVICE_LIST_URL, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for content to be rendered - the page is JavaScript-rendered
    await page.waitForSelector("h2", { timeout: 10000 }).catch(() => {
      console.warn("No h2 headings found");
    });

    // Additional wait to ensure all content is fully rendered
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Extract data using Puppeteer's evaluate to access the DOM directly
    const extractedDevices = await page.evaluate(() => {
      const results: Array<{ category: string; name: string; basedOn: string }> = [];
      const headings = Array.from(document.querySelectorAll("h2"));

      headings.forEach((heading) => {
        const category = heading.textContent?.trim() || "";
        if (!category) return;

        // Find the container div that follows this h2
        // The container has classes: sc-aabe08f-0 flgqeV
        let current: Element | null = heading.nextElementSibling;

        // Search through siblings until we find the data container or hit the next h2
        while (current && !current.matches("h2")) {
          // Look for data rows with class sc-97391185-0 vdqnr
          // These divs represent individual device entries
          const dataRows = current.querySelectorAll("div.sc-97391185-0.vdqnr");

          if (dataRows.length > 0) {
            // Found the data container for this category
            dataRows.forEach((row) => {
              // Each row contains cells with class sc-eb3d5477-0 ijbjQB
              // Column order: [Name, Based on, Added in CorOS, Previous name, Updated in CorOS, Replaces]
              const cells = Array.from(row.querySelectorAll("div.sc-eb3d5477-0.ijbjQB"));

              if (cells.length >= 2) {
                // Extract Name (first column) and Based on (second column)
                const name = cells[0].textContent?.trim() || "";
                const basedOn = cells[1].textContent?.trim() || "";

                if (name && name.length > 0) {
                  results.push({ category, name, basedOn });
                }
              }
            });
            break; // Found data for this category, move to next heading
          }

          current = current.nextElementSibling;
        }
      });

      return results;
    });

    return extractedDevices;
  } finally {
    await browser.close();
  }
}

/**
 * Main function that orchestrates the scraping and file writing.
 */
async function main() {
  try {
    const devices = await scrapeDeviceList();
    console.log(`Scraped ${devices.length} devices`);

    // Create lib directory if it doesn't exist
    const libDir = path.join(process.cwd(), "lib");
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }

    // Write JSON file
    const outputPath = path.join(libDir, "devices.json");
    fs.writeFileSync(outputPath, JSON.stringify(devices, null, 2), "utf-8");

    console.log(`✅ Successfully wrote ${devices.length} devices to ${outputPath}`);

    // Print summary by category
    const categoryCounts = devices.reduce(
      (acc, device) => {
        acc[device.category] = (acc[device.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log("\nSummary by category:");
    Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} devices`);
      });
  } catch (error) {
    console.error("Error scraping device list:", error);
    process.exit(1);
  }
}

main();
