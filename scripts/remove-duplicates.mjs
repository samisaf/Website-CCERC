import fs from 'fs';
import path from 'path';


export default function deduplicate(filePathName='public/excluded-results.json') {
  const filePath = path.resolve(filePathName);

  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const publications = JSON.parse(data);

    if (!Array.isArray(publications)) {
      console.error('Invalid JSON: expected an array of publications');
      return;
    }

    const seenIds = new Set();
    const uniquePublications = publications.filter((pub) => {
      if (!pub.id) {
        // Keep entries without an ID, but don't count them for deduplication
        return true;
      }
      if (seenIds.has(pub.id)) {
        return false;
      }
      seenIds.add(pub.id);
      return true;
    });

    const duplicatesRemoved = publications.length - uniquePublications.length;
    
    if (duplicatesRemoved > 0) {
      fs.writeFileSync(filePath, JSON.stringify(uniquePublications, null, 4), 'utf8');
      console.log(`Successfully removed ${duplicatesRemoved} duplicate(s).`);
      console.log(`Original count: ${publications.length}, New count: ${uniquePublications.length}`);
    } else {
      console.log('No duplicates found.');
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
  }
}

deduplicate();
