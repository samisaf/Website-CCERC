/**
 * @file update-publications.mjs
 * @description Processes PubMed search results and updates the website's publications page.
 * 
 * This script performs the following steps:
 * 1. Reads raw PubMed search results from `public/pubmed-results.json`.
 * 2. Loads an exclusion list from `scripts/excluded-results.json` to filter out unwanted articles.
 * 3. Deduplicates publications across all members using PubMed IDs.
 * 4. Sorts the finalized list by publication date (descending by year).
 * 5. Generates a formatted Markdown list.
 * 6. Updates `content/publications.md` with the new list and refreshes the 'date' metadata.
 * 
 * Usage: npm run update-publications
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// File Path Configurations
const PUBMED_RESULTS_FILE = 'public/pubmed-results.json';
const EXCLUDED_RESULTS_FILE = 'public/excluded-results.json';
const PUBLICATIONS_FILE = 'content/publications.md';

/**
 * Formats a single publication object into a Markdown list item.
 * 
 * @param {Object} pub - The publication object from PubMed results.
 * @param {string} pub.authors - Comma-separated author names.
 * @param {string} pub.title - The title of the article.
 * @param {string} pub.source - The journal or source name.
 * @param {string} pub.pubdate - The publication date string.
 * @param {string} pub.url - The PubMed URL.
 * @returns {string} A formatted Markdown string.
 */
function formatPublication(pub) {
  // PubMed authors are usually like "Safadi S, Amirahmadi R"
  // The goal is to format it similar to the existing style:
  // "Safadi, S., Acho, M., ... \"Title.\" Source (Date): Details."
  
  return `- ${pub.authors}. "${pub.title}" ${pub.source} (${pub.pubdate}). ${pub.url}`;
}

/**
 * The main function that orchestrates the publication update process.
 */
async function updatePublications() {
  // 1. Ensure the source data file exists
  if (!fs.existsSync(PUBMED_RESULTS_FILE)) {
    console.error(`Error: ${PUBMED_RESULTS_FILE} not found. Run 'npm run fetch-pubmed' first.`);
    process.exit(1);
  }

  // 2. Parse the PubMed search results
  const rawData = fs.readFileSync(PUBMED_RESULTS_FILE, 'utf8');
  const results = JSON.parse(rawData);

  // 3. Load the exclusion list (optional)
  // This file contains a list of publication objects that should never appear on the site.
  let excludedIds = new Set();
  if (fs.existsSync(EXCLUDED_RESULTS_FILE)) {
    try {
      const excludedRawData = fs.readFileSync(EXCLUDED_RESULTS_FILE, 'utf8');
      const excludedResults = JSON.parse(excludedRawData);
      // Assuming excludedResults is an array of objects with an 'id' property
      excludedResults.forEach(pub => {
        if (pub.id) {
          excludedIds.add(pub.id.toString());
        }
      });
    } catch (e) {
      console.warn(`Warning: Could not parse ${EXCLUDED_RESULTS_FILE}. Proceeding without exclusions.`);
    }
  }

  // 4. Deduplicate across members and filter by exclusion list
  // Uses a Map keyed by PubMed ID to ensure each paper is only listed once.
  const uniquePubs = new Map();

  for (const member in results) {
    const pubs = results[member];
    pubs.forEach(pub => {
      const pubId = pub.id.toString();
      // Only add if it's not already in our map and not in the exclusion list
      if (!uniquePubs.has(pubId) && !excludedIds.has(pubId)) {
        uniquePubs.set(pubId, pub);
      }
    });
  }

  // 5. Convert to array and sort by year (descending)
  const pubList = Array.from(uniquePubs.values()).sort((a, b) => {
    // Extract the first 4 digits (year) from the pubdate string
    const yearA = parseInt(a.pubdate.match(/\d{4}/)?.[0] || '0');
    const yearB = parseInt(b.pubdate.match(/\d{4}/)?.[0] || '0');
    return yearB - yearA; // Newest first
  });

  // 6. Generate the Markdown content block
  const formattedPubs = pubList.map(formatPublication).join('\n\n');

  // 7. Read the existing publications page to preserve its frontmatter
  if (!fs.existsSync(PUBLICATIONS_FILE)) {
      console.error(`Error: ${PUBLICATIONS_FILE} not found.`);
      process.exit(1);
  }

  const fileContent = fs.readFileSync(PUBLICATIONS_FILE, 'utf8');
  const { data, content } = matter(fileContent);

  // 8. Update 'date' in frontmatter to today's date (YYYY-MM-DD)
  // This helps indicate when the list was last refreshed.
  const today = new Date().toISOString().split('T')[0];
  data.date = today;

  // 9. Re-stringifiy the Markdown with the updated frontmatter and new content
  const newContent = matter.stringify(`\n${formattedPubs}\n`, data);

  // 10. Write the finalized content back to the file
  fs.writeFileSync(PUBLICATIONS_FILE, newContent);
  console.log(`Successfully updated ${PUBLICATIONS_FILE} with ${pubList.length} publications and set date to ${today}.`);
}

// Global execution
updatePublications().catch(err => {
  console.error('An unexpected error occurred during execution:', err);
  process.exit(1);
});
