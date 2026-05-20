// ========================================
// IMPORTS
// ========================================

import * as webllm
from "https://esm.run/@mlc-ai/web-llm";

import {
  carregarConhecimento
}
from "./data/index.js";

import { memory }
from "./brain/memory.js";

import { personality }
from "./brain/personality.js";

import { detectIntent }
from "./brain/orchestrator.js";

// ========================================
// MODOS
// ========================================

import { teacherMode }
from "./modes/teacherMode.js";

import { gameMode }
from "./modes/gameMode.js";

import { storyMode }
from "./modes/storyMode.js";

// ========================================
// MEMÓRIA
// ========================================

function salvarMemoria() {

  try {

    localStorage.setItem(

      "quintiMemory",

      JSON.stringify(memory)
    );

  } catch(err) {

    console.warn(
      "Memory save failed",
      err
    );
  }
}

// ========================================
// UI
// ========================================

const chat =
  document.getElementById("chat");

const inputPergunta =
  document.getElementById("pergunta");

const btnEnviar =
  document.getElementById("btnEnviar");

// ========================================
// ENGINE
// ========================================

let engine = null;

let modeloPronto = false;

// ========================================
// MEMÓRIA INICIAL
// ========================================

memory.friendshipLevel =
  memory.friendshipLevel || 1;

memory.totalMessages =
  memory.totalMessages || 0;

memory.chatHistory =
  memory.chatHistory || [];

// ========================================
// CONHECIMENTO
// ========================================

let conhecimentoGlobal = {};

// ========================================
// MODELO
// ========================================

const MODEL_NAME =
  "Llama-3.2-1B-Instruct-q4f16_1-MLC";

// ========================================
// SYSTEM PROMPT
// ========================================

const systemPrompt = `

You are ${personality.name},
a magical owl teacher
for Brazilian children.

TEACHING RULES:

- Use short sentences
- Teach one idea at a time
- Use simple English
- Use emojis
- Celebrate effort
- Correct gently
- Ask one playful question
- Prefer glossary knowledge
- Keep responses tiny

STRICT RULES:

- Never speak Spanish
- Never invent facts
- Never create nonsense
- Never be philosophical
- Never write long paragraphs
- Never act romantic
- Focus on English learning

`;

// ========================================
// MICRO RESPOSTAS
// ========================================

function microResposta(texto) {

  texto =
    texto.trim();

  const proibidas = [

    "hola",
    "qué",
    "cómo",
    "amigo",
    "pequeño"

  ];

  for (
    const palavra
    of proibidas
  ) {

    texto =
      texto.replaceAll(
        palavra,
        ""
      );
  }

  if (texto.length > 220) {

    texto =
      texto.slice(0, 220);

    const ultimoPonto =

      texto.lastIndexOf(".");

    if (ultimoPonto > 80) {

      texto =
        texto.slice(
          0,
          ultimoPonto + 1
        );
    }

    texto += " ✨";
  }

  return texto;
}

// ========================================
// DETECTOR DE INTENÇÃO
// ========================================

function detectarIntencao(
  pergunta
) {

  const texto =
    pergunta.toLowerCase();

  // ========================================
  // PIADAS
  // ========================================

  if (

    texto.includes("piada")
    ||
    texto.includes("joke")
    ||
    texto.includes("riddle")

  ) {

    return "joke";
  }

  // ========================================
  // CURIOSIDADES
  // ========================================

  if (

    texto.includes("curiosidade")
    ||
    texto.includes("fact")
    ||
    texto.includes("fato")

  ) {

    return "fact";
  }

  // ========================================
  // HISTÓRIA
  // ========================================

  if (

    texto.includes("origem")
    ||
    texto.includes("história")
    ||
    texto.includes("history")
    ||
    texto.includes("vikings")
    ||
    texto.includes("celtas")
    ||
    texto.includes("romanos")

  ) {

    return "history";
  }

  // ========================================
  // TRADUÇÃO
  // ========================================

  if (

    texto.includes("como se diz")
    ||
    texto.includes("how do you say")
    ||
    texto.includes("significa")
    ||
    texto.includes("o que é")

  ) {

    return "translation";
  }

  return "general";
}

// ========================================
// DETECTAR CATEGORIA
// ========================================

function detectarCategoria(
  palavra
) {

  const p =
    palavra.toLowerCase();

  // ABOUT

  if (

    p.includes("english")
    ||
    p.includes("language")

  ) {

    return "about";
  }

  // BODY

  if (

    p.includes("hand")
    ||
    p.includes("head")
    ||
    p.includes("eye")
    ||
    p.includes("nose")

  ) {

    return "body";
  }

  // CONVERSATION

  if (

    p.includes("hello")
    ||
    p.includes("goodbye")
    ||
    p.includes("how are you")

  ) {

    return "conversation";
  }

  // DINOSAURS

  if (

    p.includes("dinosaur")
    ||
    p.includes("trex")
    ||
    p.includes("triceratops")

  ) {

    return "dinosaurs";
  }

  // FUN

  if (

    p.includes("joke")
    ||
    p.includes("riddle")

  ) {

    return "fun";
  }

  // SCHOOL

  if (

    p.includes("school")
    ||
    p.includes("classroom")
    ||
    p.includes("teacher")

  ) {

    return "school";
  }

  // SPACE

  if (

    p.includes("planet")
    ||
    p.includes("moon")
    ||
    p.includes("space")
    ||
    p.includes("astronaut")

  ) {

    return "space";
  }

  // SPORTS

  if (

    p.includes("soccer")
    ||
    p.includes("basketball")

  ) {

    return "sports";
  }

  // ANIMALS

  if (

    p.includes("cat")
    ||
    p.includes("dog")
    ||
    p.includes("lion")

  ) {

    return "animals";
  }

  // FOOD

  if (

    p.includes("pizza")
    ||
    p.includes("apple")
    ||
    p.includes("banana")

  ) {

    return "food";
  }

  // NATURE

  if (

    p.includes("tree")
    ||
    p.includes("river")
    ||
    p.includes("flower")

  ) {

    return "nature";
  }

  // HISTORY

  if (

    p.includes("vikings")
    ||
    p.includes("celtas")
    ||
    p.includes("romanos")

  ) {

    return "history";
  }

  return "glossary";
}

// ========================================
// BUSCA GLOBAL
// ========================================

function buscarTema(
  pergunta
) {

  const texto =

    pergunta
      .toLowerCase()
      .trim();

  const palavras =

    texto.split(/\s+/);

  // ========================================
  // GLOSSARY
  // ========================================

  if (
    conhecimentoGlobal.glossary
  ) {

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

        // PT

        if (

          item.pt
          &&
          palavras.includes(
            item.pt.toLowerCase()
          )

        ) {

          return {

            palavra:
              item.en,

            categoria:
              "glossary",

            dados: {

              pt: item.pt,

              emoji:
                item.emoji,

              example_en:
                item.example_en,

              example_pt:
                item.example_pt
            }
          };
        }

        // EN

        if (

          item.en
          &&
          palavras.includes(
            item.en.toLowerCase()
          )

        ) {

          return {

            palavra:
              item.en,

            categoria:
              "glossary",

            dados: {

              pt: item.pt,

              emoji:
                item.emoji,

              example_en:
                item.example_en,

              example_pt:
                item.example_pt
            }
          };
        }
      }
    }
  }

  // ========================================
  // OUTROS JSONS
  // ========================================

  for (

    const [key, value]

    of Object.entries(
      conhecimentoGlobal
    )

  ) {

    if (
      key === "glossary"
    ) continue;

    if (

      typeof value !== "object"

    ) continue;

    // ========================================
    // MATCH DA CHAVE
    // ========================================

    if (

      palavras.includes(
        key.toLowerCase()
      )

    ) {

      return {

        palavra: key,

        dados: value,

        categoria:
          detectarCategoria(
            key
          )
      };
    }

    // ========================================
    // MATCH PT
    // ========================================

    if (

      value.pt
      &&
      palavras.includes(
        value.pt.toLowerCase()
      )

    ) {

      return {

        palavra: key,

        dados: value,

        categoria:
          detectarCategoria(
            key
          )
      };
    }

    // ========================================
    // MATCH EN
    // ========================================

    if (

      value.en
      &&
      palavras.includes(
        value.en.toLowerCase()
      )

    ) {

      return {

        palavra: key,

        dados: value,

        categoria:
          detectarCategoria(
            key
          )
      };
    }
  }

  return null;
}

// ========================================
// TEMPLATES POR TEMA
// ========================================

const templates = {

  about: (item) => `

🌍

${item.palavra}

${item.dados.fact || ""}

✨ English is spoken in many countries!

🌎 Do you like learning English?

`,

  body: (item) => `

🖐️

${item.palavra}

significa ${item.dados.pt}

${item.dados.example_en || ""}

👀 Can you point to it?

`,

  conversation: (item) => `

💬

${item.palavra}

${item.dados.pt
  ? `significa ${item.dados.pt}`
  : ""
}

${item.dados.example_en || ""}

😊 Can you say it to me?

`,

  core: (item) => `

✨

${item.palavra}

${item.dados.pt
  ? `significa ${item.dados.pt}`
  : ""
}

${item.dados.example_en || ""}

🌟 Can you repeat the word?

`,

  dinosaurs: (item) => `

🦖

${item.palavra}

${item.dados.fact || ""}

🦕 What is your favorite dinosaur?

`,

  fun: (item) => `

😂

${item.dados.joke || item.dados.riddle || ""}

🎉 Do you want another one?

`,

  phrases: (item) => `

💬

${item.palavra}

${item.dados.example_en || ""}

✨ When do you use this phrase?

`,

  school: (item) => `

🎒

${item.palavra}

significa ${item.dados.pt}

${item.dados.example_en || ""}

📚 What is your favorite subject?

`,

  space: (item) => `

🚀

${item.palavra}

significa ${item.dados.pt}

${item.dados.example_en || ""}

🌙 Would you like to visit space?

`,

  sports: (item) => `

⚽

${item.palavra}

significa ${item.dados.pt}

${item.dados.example_en || ""}

🏀 What sport do you like?

`,

  animals: (item) => `

🐾

${item.palavra}

significa ${item.dados.pt}

${item.dados.example_en || ""}

🐶 What is your favorite animal?

`,

  food: (item) => `

🍎

${item.palavra}

significa ${item.dados.pt}

${item.dados.example_en || ""}

🍕 What food do you like?

`,

  nature: (item) => `

🌳

${item.palavra}

significa ${item.dados.pt}

${item.dados.example_en || ""}

🌿 Do you like nature?

`,

  history: (item) => `

🏰

${item.palavra}

${item.dados.fact || ""}

⚔️ Vikings helped shape English!

📖 Do you like history?

`,

  glossary: (item) => `

${item.dados.emoji || "✨"}

${item.palavra}

significa ${item.dados.pt}

${item.dados.example_en || ""}

${item.dados.example_pt || ""}

✨ Can you say the word again?

`,

  default: (item) => `

✨

${item.palavra}

${item.dados.pt
  ? `significa ${item.dados.pt}`
  : ""
}

${item.dados.example_en || ""}

🌟 Tell me another word!

`
};

// ========================================
// CRIAR TEMPLATE
// ========================================

function criarTemplate(item) {

  if (!item) {

    return null;
  }

  const categoria =

    item.categoria
    ||
    detectarCategoria(
      item.palavra
    );

  const template =

    templates[categoria]
    ||
    templates.default;

  return template(item);
}

// ========================================
// RESPOSTAS CONTROLADAS
// ========================================

function respostaControlada(
  pergunta
) {

  const texto =

    pergunta
      .toLowerCase()
      .trim();

  // ========================================
  // DETECTAR INTENÇÃO
  // ========================================

  const intencao =

    detectarIntencao(
      pergunta
    );

  // ========================================
  // PIADAS
  // ========================================

  if (intencao === "joke") {

    return `

😂

Why did the cat sleep all day?

Because it was CAT-tired! 🐱

`;
  }

  // ========================================
  // CURIOSIDADES
  // ========================================

  if (intencao === "fact") {

    return `

🌟

English has words from
vikings, romans,
and germanic tribes ✨

`;
  }

  // ========================================
  // HISTÓRIA
  // ========================================

  if (intencao === "history") {

    return `

🏰

English began with
Germanic tribes
in Britain ✨

`;
  }

  // ========================================
  // BUSCA GLOBAL
  // ========================================

  const resultado =

    buscarTema(
      pergunta
    );

  if (resultado) {

    return criarTemplate(
      resultado
    );
  }

  // ========================================
  // RESPOSTAS FIXAS
  // ========================================

  const respostasFixas = {

    "hello":

      "👋 Hello significa olá ✨",

    "hi":

      "👋 Hi significa oi ✨",

    "how are you":

      "😊 I'm fine, thank you!",

    "boa noite":

      "🌙 Good night! Did you learn a new English word today? ✨",

    "good night":

      "🌙 Sleep well, little star ✨",

    "você fala espanhol":

      "🌍 Não 😊 Eu ensino inglês ✨"

  };

  if (
    respostasFixas[texto]
  ) {

    return respostasFixas[texto];
  }

  // ========================================
  // FALLBACK
  // ========================================

  if (
    texto.length <= 20
  ) {

    return `

🌟

I am still learning
that word ✨

Can you teach me more?

`;
  }

  return null;
}

// ========================================
// INICIAR MODELO
// ========================================

async function iniciarModelo() {

  if (!navigator.gpu) {

    adicionarMensagem(
      "❌ WebGPU not supported.",
      "bot"
    );

    return false;
  }

  adicionarMensagem(
    "🦉 Quinti is opening magical books...",
    "bot"
  );

  try {

    engine =

      await webllm.CreateMLCEngine(

        MODEL_NAME,

        {
          initProgressCallback:
            (progress) => {

              console.log(
                progress
              );
            }
        }
      );

    adicionarMensagem(
      "✅ Quinti is ready ✨",
      "bot"
    );

    return true;

  } catch(err) {

    console.error(err);

    adicionarMensagem(
      "❌ Model failed.",
      "bot"
    );

    return false;
  }
}

// ========================================
// ENVIAR
// ========================================

window.enviar = async function () {

  const pergunta =
    inputPergunta.value.trim();

  if (!pergunta) return;

  memory.totalMessages++;

  if (
    memory.totalMessages % 10 === 0
  ) {

    memory.friendshipLevel++;
  }

  memory.chatHistory.push({

    role: "user",
    content: pergunta

  });

  if (
    memory.chatHistory.length > 12
  ) {

    memory.chatHistory =

      memory.chatHistory.slice(-12);
  }

  salvarMemoria();

  const intent =
    detectIntent(pergunta);

  memory.currentMode =
    intent;

  salvarMemoria();

  adicionarMensagem(
    pergunta,
    "user"
  );

  inputPergunta.value = "";

  inputPergunta.disabled = true;

  btnEnviar.disabled = true;

  mostrarPensando();

  const respostaLocal =

    respostaControlada(
      pergunta
    );

  // ========================================
  // MODO CONTROLADO
  // ========================================

  if (respostaLocal) {

    removerPensando();

    adicionarMensagem(

      microResposta(
        respostaLocal
      ),

      "bot"
    );

    memory.chatHistory.push({

      role: "assistant",
      content: respostaLocal

    });

    salvarMemoria();

    inputPergunta.disabled =
      false;

    btnEnviar.disabled =
      false;

    inputPergunta.focus();

    return;
  }

  // ========================================
  // FALLBACK SEM MODELO
  // ========================================

  if (!modeloPronto) {

    removerPensando();

    adicionarMensagem(

      "📚 Quinti is using knowledge mode ✨",

      "bot"
    );

    inputPergunta.disabled =
      false;

    btnEnviar.disabled =
      false;

    return;
  }

  // ========================================
  // MODOS
  // ========================================

  let modoExtra = "";

  if (
    memory.currentMode === "teacher"
  ) {

    modoExtra =
      teacherMode(pergunta);
  }

  if (
    memory.currentMode === "game"
  ) {

    modoExtra =
      gameMode(pergunta);
  }

  if (
    memory.currentMode === "story"
  ) {

    modoExtra =
      storyMode(pergunta);
  }

  try {

    const resposta =

      await engine.chat.completions.create({

        messages: [

          {
            role: "system",
            content: systemPrompt
          },

          ...memory.chatHistory

        ],

        temperature: 0.05,

        max_tokens: 40
      });

    const texto =

      resposta.choices[0]
      .message.content.trim();

    const respostaFinal =

      microResposta(texto);

    removerPensando();

    adicionarMensagem(
      respostaFinal,
      "bot"
    );

    memory.chatHistory.push({

      role: "assistant",
      content: respostaFinal

    });

    salvarMemoria();

  } catch(err) {

    removerPensando();

    console.error(err);

    adicionarMensagem(
      "❌ Quinti got confused 🌪️",
      "bot"
    );

  } finally {

    inputPergunta.disabled =
      false;

    btnEnviar.disabled =
      false;

    inputPergunta.focus();
  }
};

// ========================================
// UI
// ========================================

function adicionarMensagem(
  texto,
  classe
) {

  const div =
    document.createElement("div");

  div.className =
    `msg ${classe}`;

  div.innerText =
    texto;

  chat.appendChild(div);

  chat.scrollTop =
    chat.scrollHeight;
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
🧠 Quinti is thinking...
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

  if (el) el.remove();
}

// ========================================
// ENTER
// ========================================

inputPergunta.addEventListener(

  "keydown",

  (e) => {

    if (e.key === "Enter") {

      e.preventDefault();

      if (!btnEnviar.disabled) {

        enviar();
      }
    }
  }
);

// ========================================
// INICIAR
// ========================================

(async function iniciar() {

  adicionarMensagem(
    "🌍 Loading Quinti...",
    "bot"
  );

  conhecimentoGlobal =

    await carregarConhecimento();

  adicionarMensagem(
    "📚 Knowledge loaded!",
    "bot"
  );

  console.log(
    conhecimentoGlobal
  );

  let modeloOk = false;

  try {

    modeloOk =
      await iniciarModelo();

  } catch(err) {

    console.warn(
      "⚠️ WebLLM disabled"
    );
  }

  modeloPronto =
    modeloOk;

  if (

    memory.learnedWords
    &&
    memory.learnedWords.length > 0

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

})();
