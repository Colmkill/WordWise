/**
 * Duplicate Word Detector for WordWise
 * 
 * Run: node scripts/check-duplicates.cjs
 * Or save to file: node scripts/check-duplicates.cjs > duplicates-report.txt
 * 
 * This script scans all word banks and reports:
 * - Words that appear in multiple topics (duplicates)
 * - Which topics share each duplicate word
 */

const fs = require('fs');
const path = require('path');

function findDuplicates() {
  const content = fs.readFileSync(path.join(__dirname, '../src/content/word-banks.ts'), 'utf8');
  
  // Extract the WORD_BANKS object content
  const banksMatch = content.match(/WORD_BANKS:\s*Record<string,\s*string\[]>\s*=\s*\{([\s\S]*?)\};/);
  if (!banksMatch) {
    console.error('❌ Could not find WORD_BANKS in word-banks.ts');
    process.exit(1);
  }

  const banksText = banksMatch[1];
  const wordToConcepts = new Map();
  const conceptToWords = new Map();

  const lines = banksText.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const concept = line.substring(0, colonIdx).trim();
    const wordsStr = line.substring(colonIdx + 1).trim();
    const wordsMatch = wordsStr.match(/\[([^\]]*)\]/);
    if (!wordsMatch) continue;

    const words = wordsMatch[1].split(',')
      .map(w => w.trim().replace(/['"]/g, '').toLowerCase())
      .filter(w => w);

    conceptToWords.set(concept, words);

    for (const word of words) {
      const concepts = wordToConcepts.get(word) || new Set();
      concepts.add(concept);
      wordToConcepts.set(word, concepts);
    }
  }

  // Find all duplicates
  const duplicates = [];
  for (const [word, concepts] of wordToConcepts) {
    if (concepts.size > 1) {
      duplicates.push({
        word,
        concepts: Array.from(concepts).sort(),
        count: concepts.size
      });
    }
  }

  return { duplicates, conceptToWords, totalWords: wordToConcepts.size };
}

// Run and output
const { duplicates, conceptToWords, totalWords } = findDuplicates();

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║          WORDWISE DUPLICATE WORDS REPORT                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`📊 Total unique words across all banks: ${totalWords}`);
console.log(`📊 Total topics: ${conceptToWords.size}\n`);

if (duplicates.length === 0) {
  console.log('✅ No duplicate words found! All words are unique to their topics.');
} else {
  console.log(`⚠️  Found ${duplicates.length} words that appear in multiple topics:\n`);
  
  // Group by count
  const byCount = new Map();
  for (const d of duplicates) {
    const key = d.count > 2 ? '3+' : '2';
    if (!byCount.has(key)) byCount.set(key, []);
    byCount.get(key).push(d);
  }

  // Sort by word for readability
  for (const [count, dups] of byCount) {
    dups.sort((a, b) => a.word.localeCompare(b.word));
    console.log(`\n  Words appearing in ${count} topics:`);
    console.log('  ' + '─'.repeat(60));
    for (const d of dups) {
      console.log(`  "${d.word.padEnd(20)}" → ${d.concepts.join(', ')}`);
    }
  }

  console.log('\n' + '═'.repeat(65));
  console.log('TIP: Intentional cross-topic words (like "shower" in bathroom');
  console.log('     and weather) are expected. Review for unintentional');
  console.log('     duplicates that should be unique to one topic.');
  console.log('═'.repeat(65));
}
