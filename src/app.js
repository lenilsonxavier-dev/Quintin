// ========================================
// IMPORTS
// ========================================
import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import { carregarConhecimento } from "./data/index.js";
import { memory } from "./memory.js";

// ========================================
// CONFIG
// ========================================
const MODEL_ID = "Qwen2.5-3B-Instruct-q4f16_1-MLC"; // melhor multilíngue que Llama 3.2 1B
const MAX_HISTORY = 6;   // últimas N mensagens enviadas ao modelo
const MAX_TOKENS  = 200; // espaço pra resposta completa
const TEMPERATURE = 0.75;

// ========================================
// DOM
// ========================================
const chat          = document.getElementById("chat");
const inputPergunta = document.getElementById("pergunta");
const btnEnviar     = document.getElementById("enviar");

inputPergunta.disabled = true;
btnEnviar.disabled = true;

// ========================================
// ESTADO
// ========================================
let engine = null;
let modeloOk = false;
let modeloPronto = false;

memory.chatHistory = memory.chatHistory || [];
memory.learnedWords = memory.learnedWords || [];

// ========================================
// SYSTEM PROMPT (few-shot + tom positivo)
// ========================================
const systemPrompt = `You are Quinti, a magical purple owl from outer space who teaches English to children aged 6 to 10.

PERSONALITY
- Warm, playful, patient, SUPER encouraging.
- Use celebrations: "Wonderful!", "You're a star!", "Amazing!".
- Sprinkle emojis: 🦉✨⭐🌙🚀🌈🎉🍎🐱.

TEACHING STYLE
- ALWAYS reply in English, even if the child writes in another language.
- If the child uses another language, gently translate the key word, then continue in simple English.
- Short, simple sentences. One idea per message.
- Use vocabulary kids know: animals, toys, colors, food, family, school, dinosaurs, space, superheroes.
- After teaching a word, ask ONE small fun follow-up question.
- Turn lessons into mini-games: "I spy", rhymes, guessing animals, silly stories.
- Praise effort. If the child makes a mistake, model the correct version kindly:
  "Almost! We say: I HAVE a dog. Try it! 🌟"
- Sometimes repeat the keyword in BIG letters: "cat... CAT... 🐱".

SAFETY
- Never discuss scary, violent, romantic, political, or adult topics.
- If a question is off-topic, gently steer back to a fun English game.

EXAMPLES

Child: oi
Quinti: Hi, little star! 🌟 In English we say "HELLO"! Can you say HELLO back to me? 🦉✨

Child: eu gosto de gato
Quinti: Yay! 🐱 In English: "I LIKE CATS!" Cats say MEOW. What color is YOUR cat? 🌈

Child: vamos brincar
Quinti: YES! Let's play! 🎉 I spy with my little eye... something BLUE in the sky! What is it? ☁️✨

Child: i has a dog
Quinti: Almost, superstar! ⭐ We say: "I HAVE a dog!" 🐶 Try it! What's your dog's name?

Now greet the child warmly and invite them to play a tiny English game.`;

// ========================================
// UI HELPERS
// ========================================
function adicionarMensagem(texto, autor) {
  const div = document.createElement("div");
  div.className = `msg ${autor}`;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

// ========================================
// CARREGAR MODELO
// ========================================
async function iniciarModelo() {
  const loader = adicionarMensagem("🦉 Waking up Quinti...", "bot");

  engine = await webllm.CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (p) => {
      loader.textContent = `🦉 ${p.text}`;
    },
  });

  loader.textContent = "✨ Quinti is ready!";
  modeloOk = true;
}

// ========================================
// PERGUNTAR AO MODELO (com streaming)
// ========================================
async function perguntarQuinti(userText) {
  // monta histórico curto
  memory.chatHistory.push({ role: "user", content: userText });
  const recent = memory.chatHistory.slice(-MAX_HISTORY);

  const messages = [
    { role: "system", content: systemPrompt },
    ...recent,
  ];

  // bubble vazio que vai sendo preenchido
  const bubble = adicionarMensagem("…", "bot");
  let fullText = "";

  const stream = await engine.chat.completions.create({
    messages,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    top_p: 0.9,
    frequency_penalty: 0.3,
    presence_penalty: 0.3,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content || "";
    if (delta) {
      fullText += delta;
      bubble.textContent = fullText;
      chat.scrollTop = chat.scrollHeight;
    }
  }

  memory.chatHistory.push({ role: "assistant", content: fullText });

  // aprende palavras-chave simples (heurística leve)
  const newWords = userText
    .toLowerCase()
    .match(/\b[a-z]{3,}\b/g) || [];
  for (const w of newWords) {
    if (!memory.learnedWords.includes(w)) memory.learnedWords.push(w);
  }

  return fullText;
}

// ========================================
// HANDLER
// ========================================
async function enviar() {
  const texto = inputPergunta.value.trim();
  if (!texto) return;

  adicionarMensagem(texto, "user");
  inputPergunta.value = "";
  inputPergunta.disabled = true;
  btnEnviar.disabled = true;

  try {
    if (modeloOk) {
      await perguntarQuinti(texto);
    } else {
      adicionarMensagem("🦉 Quinti is still waking up... try again in a moment! ✨", "bot");
    }
  } catch (err) {
    console.error(err);
    adicionarMensagem("Oops! 🌙 Quinti got sleepy. Try again! ✨", "bot");
  } finally {
    inputPergunta.disabled = false;
    btnEnviar.disabled = false;
    inputPergunta.focus();
  }
}

btnEnviar.addEventListener("click", enviar);
inputPergunta.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    enviar();
  }
});

// ========================================
// BOOT
// ========================================
(async () => {
  try {
    await carregarConhecimento();
  } catch (e) {
    console.warn("⚠️ Knowledge load skipped", e);
  }

  try {
    await iniciarModelo();
  } catch (err) {
    console.warn("⚠️ WebLLM disabled", err);
  }

  modeloPronto = modeloOk;

  if (memory.learnedWords?.length > 0) {
    adicionarMensagem(
      `🌟 Welcome back! You learned: ${memory.learnedWords.slice(0, 5).join(", ")}`,
      "bot"
    );
  }

  inputPergunta.disabled = false;
  btnEnviar.disabled = false;
  inputPergunta.focus();
})();
