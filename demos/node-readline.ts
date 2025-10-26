import * as readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("=== Simple Readline Demo ===");
console.log("Type your name and press Enter\n");

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
