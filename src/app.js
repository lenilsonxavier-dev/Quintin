// ========================================
// IMPORTS
// ========================================

import * as webllm
from "https://esm.run/@mlc-ai/web-llm";

import {
  carregarConhecimento
}
from "./data/index.js";

// ✅ CAMINHO CORRIGIDO
import {
  memory
}
from "./brain/memory.js";

// ========================================
// CONFIG
// ========================================

// 🌟 Qwen conversa MUITO melhor
// que Llama 1B para crianças

const MODEL_ID =
 "Llama-3.2-1B-Instruct-q4f16_1-MLC";

const MAX_HISTORY = 6;

const MAX_TOKENS = 120;

const TEMPERATURE = 0.7;

// ========================================
// DOM
// ========================================

const chat =
  document.getElementById(
    "chat"
  );

const inputPergunta =
  document.getElementById(
    "pergunta"
  );

// ✅ ID CORRIGIDO
const btnEnviar =
  document.getElementById(
    "btnEnviar"
  );

inputPergunta.disabled =
  true;

btnEnviar.disabled =
  true;

// ========================================
// ESTADO
// ========================================

let engine = null;

let modeloOk = false;

let modeloPronto = false;

// ========================================
// MEMÓRIA
// ========================================

memory.chatHistory =
  memory.chatHistory || [];

memory.learnedWords =
  memory.learnedWords || [];

// ========================================
// SYSTEM PROMPT
// ========================================

const systemPrompt = `

You are Quinti,
a magical purple owl
who teaches English
to Brazilian children
aged 6 to 10.

PERSONALITY

- Warm
- Playful
- Patient
- Encouraging

Use emojis:
🦉✨⭐🌙🚀🌈🎉🍎🐱

TEACHING RULES

- ALWAYS reply in English
- If the child uses Portuguese,
  translate the key word
- Use SHORT sentences
- ONE idea per response
- Teach gently
- Ask ONE playful question
- Use animals, toys,
  school, dinosaurs,
  colors, space and games
- Never write long paragraphs

IMPORTANT

- Never speak Spanish
- Never create nonsense
- Never become philosophical
- Never talk about adult topics
- Never generate huge texts

GOOD RESPONSE EXAMPLES

Child: hello
Quinti:
Hello, little star! 🌟
What is YOUR name? 🦉

Child: gato
Quinti:
🐱 Cat means gato!

What color is your cat? 🌈

Child: soccer
Quinti:
⚽ Soccer means futebol!

Do you play soccer? 🌟

Child: moon
Quinti:
🌙 Moon means lua!

Would you like to visit space? 🚀

`;

// ========================================
// UI HELPERS
// ========================================

function adicionarMensagem(
  texto,
  autor
) {

  const div =
    document.createElement("div");

  div.className =
    `msg ${autor}`;

  div.textContent =
    texto;

  chat.appendChild(div);

  chat.scrollTop =
    chat.scrollHeight;

  return div;
}

// ========================================
// PENSANDO
// ========================================

function mostrarPensando() {

  removerPensando();

  const div =
    document.createElement("div");

  div.className =
    "pensando";

  div.id =
    "pensando";

  div.innerHTML = `

<span style="
  font-size: 32px;
">
🦉
</span>

<span>
Quinti is thinking...
</span>

`;

  chat.appendChild(div);

  chat.scrollTop =
    chat.scrollHeight;
}

function removerPensando() {

  const el =
    document.getElementById(
      "pensando"
    );

  if (el) {

    el.remove();
  }
}

// ========================================
// RESPOSTAS FIXAS
// ========================================

const respostasFixas = {

  // greetings

  "hello":

`👋 Hello, little star!

What is YOUR name? ✨`,

  "hi":

`🌟 Hi, friend!

How are you today?`,

  "good night":

`🌙 Good night!

Sleep well, little star ✨`,

  "boa noite":

`🌙 Good night!

Did you learn a new word today? ✨`,

  "bye":

`👋 Bye bye!

See you soon ✨`,

  "tchau":

`👋 Bye bye!

Keep practicing English 🌟`,

  // name

  "qual é o seu nome":

`🦉 My name is Quinti!

What is YOUR name? ✨`,

  "what is your name":

`🦉 My name is Quinti! ✨`,

  // subjects

  "arte":

`🎨 Art means arte!

Do you like drawing? ✨`,

  "matemática":

`➕ Math means matemática! ✨`,

  "português":

`📚 Portuguese means português! ✨`,

  // family

  "bisavô":

`👴 Great-grandfather
means bisavô ✨`,

  "bisavó":

`👵 Great-grandmother
means bisavó ✨`,

  // phrases

  "nós somos felizes":

`😊 We are happy ✨`,

  "nos somos felizes":

`😊 We are happy ✨`,

  // verb

  "verbo to be":

`✨ TO BE means
ser ou estar ✨`

};

// ========================================
// BUSCA NO GLOSSÁRIO
// ========================================

function buscarGlossario(
  pergunta
) {

  if (
    !window.conhecimentoGlobal
      ?.glossary
  ) {

    return null;
  }

  const texto =

    pergunta
      .toLowerCase()
      .trim();

  const palavras =

    texto.split(/\s+/);

  for (

    const categoria of

    Object.values(
      conhecimentoGlobal.glossary
    )

  ) {

    if (
      !categoria.words
    ) continue;

    for (
      const item
      of categoria.words
    ) {

      // PT → EN

      if (

        item.pt
        &&
        palavras.includes(
          item.pt.toLowerCase()
        )

      ) {

        return `

${item.emoji || "✨"}

${item.en}

means ${item.pt}

${item.example_en || ""}

${item.example_pt || ""}

✨ Can you say
"${item.en}" again?

`;
      }

      // EN → PT

      if (

        item.en
        &&
        palavras.includes(
          item.en.toLowerCase()
        )

      ) {

        return `

${item.emoji || "✨"}

${item.en}

means ${item.pt}

${item.example_en || ""}

${item.example_pt || ""}

✨ Do you like this word?

`;
      }
    }
  }

  return null;
}

// ========================================
// RESPOSTA CONTROLADA
// ========================================

function respostaControlada(
  pergunta
) {

  const texto =

    pergunta
      .toLowerCase()
      .trim();

  // ========================================
  // MATCH FLEXÍVEL
  // ========================================

  for (

    const chave of

    Object.keys(
      respostasFixas
    )

  ) {

    if (

      texto.includes(chave)

    ) {

      return respostasFixas[
        chave
      ];
    }
  }

  // ========================================
  // GLOSSÁRIO
  // ========================================

  const glossario =

    buscarGlossario(
      pergunta
    );

  if (glossario) {

    return glossario;
  }

  return null;
}

// ========================================
// CARREGAR MODELO
// ========================================

async function iniciarModelo() {

  const loader =

    adicionarMensagem(

      "🦉 Waking up Quinti...",

      "bot"
    );

  engine =

    await webllm.CreateMLCEngine(

      MODEL_ID,

      {

        initProgressCallback:
          (p) => {

            loader.textContent =

              `🦉 ${p.text}`;
          }
      }
    );

  loader.textContent =

    "✨ Quinti is ready!";

  modeloOk = true;
}

// ========================================
// CHAT COM STREAM
// ========================================

async function perguntarQuinti(
  userText
) {

  memory.chatHistory.push({

    role: "user",

    content: userText

  });

  const recent =

    memory.chatHistory.slice(
      -MAX_HISTORY
    );

  const messages = [

    {
      role: "system",

      content:
        systemPrompt
    },

    ...recent
  ];

  removerPensando();

  const bubble =

    adicionarMensagem(
      "",
      "bot"
    );

  let fullText = "";

  const stream =

    await engine.chat.completions.create({

      messages,

      temperature:
        TEMPERATURE,

      max_tokens:
        MAX_TOKENS,

      top_p: 0.9,

      stream: true
    });

  for await (

    const chunk
    of stream

  ) {

    const delta =

      chunk.choices?.[0]
      ?.delta?.content || "";

    if (delta) {

      fullText += delta;

      bubble.textContent =
        fullText;

      chat.scrollTop =
        chat.scrollHeight;
    }
  }

  memory.chatHistory.push({

    role: "assistant",

    content: fullText

  });

  return fullText;
}

// ========================================
// ENVIAR
// ========================================

async function enviar() {

  const texto =

    inputPergunta.value
      .trim();

  if (!texto) return;

  adicionarMensagem(
    texto,
    "user"
  );

  inputPergunta.value =
    "";

  inputPergunta.disabled =
    true;

  btnEnviar.disabled =
    true;

  mostrarPensando();

  try {

    // ========================================
    // MODO CONTROLADO
    // ========================================

    const respostaLocal =

      respostaControlada(
        texto
      );

    if (respostaLocal) {

      removerPensando();

      adicionarMensagem(

        respostaLocal,

        "bot"
      );

      return;
    }

    // ========================================
    // IA
    // ========================================

    if (modeloOk) {

      await perguntarQuinti(
        texto
      );

    } else {

      removerPensando();

      adicionarMensagem(

`🦉 Quinti is still waking up!

Try again soon ✨`,

        "bot"
      );
    }

  } catch(err) {

    console.error(err);

    removerPensando();

    adicionarMensagem(

`🌙 Oops!

Quinti got sleepy ✨`,

      "bot"
    );

  } finally {

    inputPergunta.disabled =
      false;

    btnEnviar.disabled =
      false;

    inputPergunta.focus();
  }
}

// ========================================
// EVENTS
// ========================================

btnEnviar.addEventListener(
  "click",
  enviar
);

inputPergunta.addEventListener(

  "keydown",

  (e) => {

    if (

      e.key === "Enter"
      &&
      !e.shiftKey

    ) {

      e.preventDefault();

      enviar();
    }
  }
);

// ========================================
// BOOT
// ========================================

(async () => {

  adicionarMensagem(

    "🌍 Loading Quinti...",

    "bot"
  );

  try {

    window.conhecimentoGlobal =

      await carregarConhecimento();

    adicionarMensagem(

      "📚 Knowledge loaded!",

      "bot"
    );

  } catch (e) {

    console.warn(
      "Knowledge error",
      e
    );
  }

  try {

    await iniciarModelo();

  } catch (err) {

    console.warn(
      "⚠️ WebLLM disabled",
      err
    );
  }

  modeloPronto =
    modeloOk;

  if (

    memory.learnedWords
    ?.length > 0

  ) {

    adicionarMensagem(

`🌟 Welcome back!

You learned:

${memory.learnedWords
  .slice(0,5)
  .join(", ")}

`,

      "bot"
    );
  }

  inputPergunta.disabled =
    false;

  btnEnviar.disabled =
    false;

  inputPergunta.focus();

})();
