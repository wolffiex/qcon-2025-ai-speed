import * as readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("=== Simple Readline Demo ===");
console.log("\nStandard readline shortcuts:");
console.log("   • Ctrl+A, Ctrl+E     - Start/end of line");
console.log("   • Ctrl+K, Ctrl+U     - Kill to end/start");
console.log("   • Ctrl+W, Alt+D      - Delete word");
console.log("   • Alt+F, Alt+B       - Forward/back word");
console.log("   • ...plus ~20 more operations");
console.log("\nType your name and press Enter (try the shortcuts above!)\n");

rl.question("What is your name? ", (name) => {
  console.log(`\nHello, ${name}!`);

  rl.question("\nWhat's your favorite programming language? ", (language) => {
    console.log(`\n${language} is a great choice!`);

    rl.question("\nHow many years have you been coding? ", (years) => {
      console.log(`\n${years} years of experience - nice!`);
      console.log(`\nThanks for chatting, ${name}!`);

      rl.close();
    });
  });
});
