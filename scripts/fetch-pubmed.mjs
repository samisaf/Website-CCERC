import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { globby } from 'globby';

const MEMBERS_DIR = 'content/members';
const OUTPUT_FILE = 'scripts/pubmed-results.json';

async function fetchPubMedForAuthor(authorName) {
  // PubMed ESearch API to find IDs
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(authorName)}[Author]&retmode=json&retmax=5`;
  
  try {
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    const ids = searchData.esearchresult.idlist;
    
    if (ids.length === 0) return [];

    // PubMed ESummary API to get details
    const articles = [];
    for (const id of ids) {
      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${id}&retmode=json`;
      const summaryResponse = await fetch(summaryUrl);
      const summaryData = await summaryResponse.json();
      
      const article = summaryData.result?.[id];
      if (article) {
        articles.push({
          id,
          title: article.title,
          authors: article.authors?.map(a => a.name).join(', ') || '',
          source: article.source,
          pubdate: article.pubdate,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
        });
      } else {
        console.warn(`No summary found for ID: ${id}`);
      }
      // Delay between summary calls
      await new Promise(resolve => setTimeout(resolve, 340));
    }
    return articles;
  } catch (error) {
    console.error(`Error fetching for ${authorName}:`, error);
    return [];
  }
}

async function main() {
  const memberFiles = await globby(`${MEMBERS_DIR}/*.md`);
  const allResults = {};

  for (const file of memberFiles) {
    if (file.endsWith('draft-member.md')) continue;
    
    const content = fs.readFileSync(file, 'utf-8');
    const { data: frontmatter } = matter(content);
    
    let name = frontmatter.title.split(',')[0].trim();
    console.log(`Searching for: ${name}`);
    
    const articles = await fetchPubMedForAuthor(name);
    allResults[name] = articles;
    
    // Respect NCBI rate limit (3 requests/sec without API key)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2));
  console.log(`Results saved to ${OUTPUT_FILE}`);
}

main();
