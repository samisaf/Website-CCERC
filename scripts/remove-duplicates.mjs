import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const EXCLUDED_RESULTS_FILE = 'public/excluded-results.json';

/**
 * Reads a JSON file containing an array of publication objects, removes 
 * any duplicate entries based on their 'id' property, and overwrites 
 * the original file with the deduplicated array.
 * * Note: Entries missing an 'id' property are preserved and not considered 
 * for deduplication.
 *
 * @param {string} filePathName - The relative or absolute path to the target JSON file.
 * @returns {void}
 */
export default function removeDuplicates(filePathName) {
  // Resolve the provided path to an absolute path to ensure accurate file targeting
  const filePath = path.resolve(filePathName);

  try {
    // Verify that the file actually exists before attempting to read it
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }

    // Read the file content synchronously and parse it into a JavaScript object
    const data = fs.readFileSync(filePath, 'utf8');
    const publications = JSON.parse(data);

    // Validate that the parsed JSON structure is an array as expected
    if (!Array.isArray(publications)) {
      console.error('Invalid JSON: expected an array of publications');
      return;
    }

    // Initialize a Set to efficiently keep track of unique IDs encountered (O(1) lookup)
    const seenIds = new Set();
    
    // Filter the array to exclude duplicate entries based on the 'id' property
    const uniquePublications = publications.filter((pub) => {
      if (!pub.id) {
        // Keep entries without an ID, but don't track them in the Set
        return true;
      }
      
      // If the ID is already in our Set, it's a duplicate; filter it out
      if (seenIds.has(pub.id)) {
        return false;
      }
      
      // Otherwise, it's a newly encountered ID. Add it to the Set and keep the entry
      seenIds.add(pub.id);
      return true;
    });

    // Calculate how many duplicates were successfully identified and removed
    const duplicatesRemoved = publications.length - uniquePublications.length;
    
    if (duplicatesRemoved > 0) {
      // Overwrite the original file with the new, deduplicated array
      // The 'null, 4' arguments format the JSON string with a 4-space indentation for readability
      fs.writeFileSync(filePath, JSON.stringify(uniquePublications, null, 4), 'utf8');
      
      console.log(`Successfully removed ${duplicatesRemoved} duplicate(s).`);
      console.log(`Original count: ${publications.length}, New count: ${uniquePublications.length}`);
    } else {
      console.log('No duplicates found.');
    }
  } catch (err) {
    // Catch and log any unexpected errors (e.g., malformed JSON syntax, file permission issues)
    console.error(`Error processing ${filePath}:`, err.message);
  }
}

function main() {
  console.log('Removing duplicates from excluded results...');
  removeDuplicates(EXCLUDED_RESULTS_FILE);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}