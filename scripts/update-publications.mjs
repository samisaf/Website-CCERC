import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const PUBMED_RESULTS_FILE = 'scripts/pubmed-results.json';
const PUBLICATIONS_FILE = 'content/publications.md';

function formatPublication(pub) {
  // PubMed authors are usually like "Safadi S, Amirahmadi R"
  // The goal is to format it similar to the existing style:
  // "Safadi, S., Acho, M., ... \"Title.\" Source (Date): Details."
  
  return `- ${pub.authors}. "${pub.title}" ${pub.source} (${pub.pubdate}). ${pub.url}`;
}

async function updatePublications() {
  if (!fs.existsSync(PUBMED_RESULTS_FILE)) {
    console.error(`Error: ${PUBMED_RESULTS_FILE} not found.`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(PUBMED_RESULTS_FILE, 'utf8');
  const results = JSON.parse(rawData);

  // Use a Map to deduplicate by PubMed ID
  const uniquePubs = new Map();

  for (const member in results) {
    const pubs = results[member];
    pubs.forEach(pub => {
      // If the same ID exists, we keep the first one found (or we could merge if needed, 
      // but for PubMed they should be identical)
      if (!uniquePubs.has(pub.id)) {
        uniquePubs.set(pub.id, pub);
      }
    });
  }

  // Convert to array and sort by pubdate (roughly, descending)
  const pubList = Array.from(uniquePubs.values()).sort((a, b) => {
    // Basic year-based sort for simplicity
    const yearA = parseInt(a.pubdate.match(/\d{4}/)?.[0] || '0');
    const yearB = parseInt(b.pubdate.match(/\d{4}/)?.[0] || '0');
    return yearB - yearA;
  });

  const formattedPubs = pubList.map(formatPublication).join('\n\n');

  if (!fs.existsSync(PUBLICATIONS_FILE)) {
      console.error(`Error: ${PUBLICATIONS_FILE} not found.`);
      process.exit(1);
  }

  const fileContent = fs.readFileSync(PUBLICATIONS_FILE, 'utf8');
  const { data, content } = matter(fileContent);

  // Update the date in frontmatter to today's date
  const today = new Date().toISOString().split('T')[0];
  data.date = today;

  const newContent = matter.stringify(`\n${formattedPubs}\n`, data);

  fs.writeFileSync(PUBLICATIONS_FILE, newContent);
  console.log(`Successfully updated ${PUBLICATIONS_FILE} with ${pubList.length} publications and set date to ${today}.`);
}

updatePublications().catch(err => {
  console.error('An error occurred:', err);
  process.exit(1);
});
