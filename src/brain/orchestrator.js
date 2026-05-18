export function detectIntent(message) {

  if (message.includes("história")) {
    return "story"
  }

  if (message.includes("jogo")) {
    return "game"
  }

  return "teacher"
}
