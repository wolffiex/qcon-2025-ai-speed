import * as readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("=== Simple Readline Demo ===");
console.log("\nStandard readline shortcuts:");
console.log("   • Ctrl+A/E           - Start/end of line");
console.log("   • Ctrl+F/B, Alt+F/B  - Forward/back char/word");
console.log("   • Ctrl+K/U           - Kill to end/start of line");
console.log("   • Ctrl+W, Alt+D      - Delete word before/after");
console.log("   • Ctrl+Y, Alt+Y      - Yank killed text, yank-pop (cycle)");
console.log("   • Ctrl+R, Alt+</>/. - Search history, first/last/repeat");
console.log("")

rl.question("What is your favorite animal? ", (animal) => {
  rl.question(`What do you like about ${animal}? `, (_preference) => {
    console.log("Thanks for taking our survey! ")
    rl.close();
  });
});
