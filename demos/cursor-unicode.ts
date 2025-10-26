// Demo: The Unicode complexity that forced us to go deep

console.log("=== The Unicode Complexity Journey ===\n");

// Problem 1: NFD vs NFC normalization
console.log("📝 Problem 1: Unicode Normalization\n");

const cafeNFC = "café";  // Single codepoint: é = \u00E9
const cafeNFD = "café";  // Two codepoints: e + ́ = \u0065\u0301

console.log(`NFC form: "${cafeNFC}" (${cafeNFC.length} chars)`);
console.log(`NFD form: "${cafeNFD}" (${cafeNFD.length} chars)`);
console.log(`Are they equal? ${cafeNFC === cafeNFD}`);
console.log(`indexOf works? ${cafeNFC.indexOf(cafeNFD) !== -1}`);

console.log("\n💡 Solution: Normalize to NFC on input");
console.log(`   Normalized NFC === Normalized NFD? ${cafeNFC.normalize('NFC') === cafeNFD.normalize('NFC')}`);

// Problem 2: CJK characters have width 2
console.log("\n\n📝 Problem 2: CJK Display Width\n");

const stringWidth = (str: string) => {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0) || 0;
    // Simplified: CJK ranges are roughly 2 columns wide
    if ((code >= 0x3000 && code <= 0x9FFF) ||
        (code >= 0xAC00 && code <= 0xD7AF) ||
        (code >= 0xF900 && code <= 0xFAFF)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
};

const japanese = "東京";
const english = "Tokyo";

console.log(`Japanese: "${japanese}"`);
console.log(`  String length: ${japanese.length} chars`);
console.log(`  Display width: ${stringWidth(japanese)} columns`);
console.log();
console.log(`English: "${english}"`);
console.log(`  String length: ${english.length} chars`);
console.log(`  Display width: ${stringWidth(english)} columns`);

console.log("\n💡 Challenge: Navigate by display column, but edit by string index");

// Problem 3: Grapheme clusters
console.log("\n\n📝 Problem 3: Grapheme Clusters\n");

const family = "👨‍👩‍👧‍👦";
const flag = "🇺🇸";
const emoji = "👍🏽"; // Thumbs up with skin tone

console.log(`Family emoji: ${family}`);
console.log(`  String length: ${family.length} chars`);
console.log(`  Codepoints: ${[...family].length}`);
console.log(`  Visual units: 1 (what user expects)`);

console.log(`\nFlag emoji: ${flag}`);
console.log(`  String length: ${flag.length} chars`);
console.log(`  Codepoints: ${[...flag].length}`);
console.log(`  Visual units: 1 (what user expects)`);

console.log(`\nEmoji with modifier: ${emoji}`);
console.log(`  String length: ${emoji.length} chars`);
console.log(`  Codepoints: ${[...emoji].length}`);
console.log(`  Visual units: 1 (what user expects)`);

// Show what Intl.Segmenter does
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const segments = [...segmenter.segment(family)];

console.log(`\n💡 Intl.Segmenter to the rescue:`);
console.log(`   Grapheme count: ${segments.length} (correct!)`);

// The real challenge
console.log("\n\n🎯 The Real Challenge:\n");

const complexText = "Hello 東京 café 👨‍👩‍👧‍👦!";

console.log(`Text: "${complexText}"`);
console.log(`String length: ${complexText.length}`);
console.log(`Display width: ${stringWidth(complexText)}`);
console.log(`Graphemes: ${[...segmenter.segment(complexText)].length}`);

console.log("\nWhen user presses → we need to:");
console.log("  1. Find next grapheme boundary (not just +1)");
console.log("  2. Account for display width (CJK = 2 cols)");
console.log("  3. Handle soft wrapping (where does line break?)");
console.log("  4. Keep cursor in correct display position");
console.log("  5. Do this fast (< 10ms per keystroke)");

console.log("\n📊 This is why Cursor.ts grew from 333 → 945 lines");
console.log("\n✨ But: We have full control and it works perfectly");
