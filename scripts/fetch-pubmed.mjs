/**
 * @file fetch-pubmed.mjs
 * @description Extracts member data from Markdown files and searches PubMed for their recent publications.
 * 
 * This script performs the following steps:
 * 1. Scans `content/members` for Markdown files and extracts author names from frontmatter.
 * 2. Queries the NCBI PubMed ESearch API to find the most recent publication IDs for each author.
 * 3. Queries the NCBI PubMed ESummary API to fetch details (title, authors, source, date) for each ID.
 * 4. Saves the aggregated results into a JSON file for processing by the publication update script.
 * 
 * NOTE: The script includes artificial delays to respect NCBI's rate limit (3 requests per second without an API key).
 * 
 * Usage: npm run fetch-pubmed
 */

import fs from 'fs';
import matter from 'gray-matter';
import { globby } from 'globby';

// Directory containing member profile Markdown files
const MEMBERS_DIR = 'content/members';
// Destination for the aggregated PubMed search results
const OUTPUT_FILE = 'public/pubmed-results.json';
// Maximum number of publications to fetch per author to keep results manageable
const RETMAX = 5;
/**
 * Searches PubMed for the most recent articles by a given author.
 * 
 * @param {string} authorName - The formatted search term (usually "First Last").
 * @param {number} retmax - The maximum number of publications to retrieve for the author.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of publication objects.
 */
async function fetchPubMedForAuthor(authorName, retmax = RETMAX) {
  // PubMed ESearch API to find IDs
  // We limit to 5 results to keep the search focused and reduce API load.
  const term = encodeURIComponent(authorName);
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${term}[Author]&retmode=json&retmax=${retmax}`;
  console.log(searchUrl);

  try {
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    const ids = searchData.esearchresult.idlist;
    
    // If no articles are found, return an empty list immediately
    if (ids.length === 0) return [];

    // PubMed ESummary API to get detailed metadata for each found ID
    const articles = [];
    for (const id of ids) {
      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${id}&retmode=json`;
      const summaryResponse = await fetch(summaryUrl);
      const summaryData = await summaryResponse.json();
      
      const article = summaryData.result?.[id];
      if (article) {
        // Normalize the PubMed response into our internal publication format
        articles.push({
          id, // PubMed unique identifier
          title: article.title,
          authors: article.authors?.map(a => a.name).join(', ') || '',
          source: article.source, // Journal name
          pubdate: article.pubdate,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
        });
        console.log(`Fetched article ${id}: ${article.title}`);
      } else {
        console.warn(`No summary found for ID: ${id}`);
      }
      
      // Artificial delay (approx 3 requests/sec) to avoid being blocked by NCBI
      await new Promise(resolve => setTimeout(resolve, 340));
    }
    return articles;
  } catch (error) {
    console.error(`Error fetching for ${authorName}:`, error);
    return [];
  }
}

/**
 * Orchestrates the full PubMed extraction process for all members.
 * 1. Reads member Markdown files to extract author names.
 * 2. Fetches recent publications for each author from PubMed.
 * 3. Saves the aggregated results to a JSON file.
 * 
 * @param {string} membersDir - The directory containing member Markdown files.
 * @param {string} outputFile - The path to the output JSON file for results.
 * @returns {Promise<void>} A promise that resolves when the process is complete.
 */
async function main(membersDir = MEMBERS_DIR, outputFile = OUTPUT_FILE) {
  // Find all member files in the content directory
  const memberFiles = await globby(`${membersDir}/*.md`);
  const allResults = {};

  for (const file of memberFiles) {
    // Skip placeholder or draft files
    if (file.endsWith('draft-member.md')) continue;
    
    // Parse frontmatter from the Markdown file
    const content = fs.readFileSync(file, 'utf-8');
    const { data: frontmatter } = matter(content);
    
    // Clean up the name for searching (e.g., remove "MD" or "PhD" from titles)
    let name = frontmatter.title.split(',')[0].trim();
    console.log(`Searching for: ${name}`);
    
    // Perform the PubMed search
    const articles = await fetchPubMedForAuthor(name);
    allResults[name] = articles;
    
    // Respect NCBI rate limit (3 requests/sec without API key) between authors
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Write the results to a JSON file for consumption by other scripts
  fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));
  console.log(`Results successfully saved to ${outputFile}`);
}

// Global execution entry point
main().catch(err => {
  console.error('Fatal error during PubMed fetch:', err);
  process.exit(1);
});
