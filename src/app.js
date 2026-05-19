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

STRICT RULES:

- Speak only Portuguese + simple English
- Never speak Spanish
- Never loop responses
- Never invent facts
- Never create nonsense
- Never be philosophical
- Never act romantic
- Keep answers tiny
- Use at most 3 short sentences
- Use emojis
- Focus on English learning
- Prefer educational answers
- Prefer glossary context
- Ask at most ONE playful question
- If unsure, say:
"I don't know yet 🌟"

`;

// ========================================
// MICRO RESPOSTAS
// ========================================

function microResposta(texto) {

  texto =
    texto.trim();

  // remove espanhol

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

  // corta tamanho

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
// DETECTOR DE TEMA
// ========================================

function detectarTema(pergunta) {

  const texto =
    pergunta.toLowerCase();

  // ========================================
  // SPACE
  // ========================================

  if (

    texto.includes("planet")
    ||
    texto.includes("moon")
    ||
    texto.includes("star")
    ||
    texto.includes("astronaut")
    ||
    texto.includes("space")

  ) {

    return "space";
  }

  // ========================================
  // DINOSAURS
  // ========================================

  if (

    texto.includes("dinosaur")
    ||
    texto.includes("t-rex")
    ||
    texto.includes("triceratops")

  ) {

    return "dinosaurs";
  }

  // ========================================
  // SPORTS
  // ========================================

  if (

    texto.includes("soccer")
    ||
    texto.includes("basketball")
    ||
    texto.includes("sport")

  ) {

    return "sports";
  }

  // ========================================
  // BODY
  // ========================================

  if (

    texto.includes("hand")
    ||
    texto.includes("head")
    ||
    texto.includes("eye")
    ||
    texto.includes("body")

  ) {

    return "body";
  }

  // ========================================
  // HISTORY
  // ========================================

  if (

    texto.includes("vikings")
    ||
    texto.includes("celtas")
    ||
    texto.includes("romanos")

  ) {

    return "history";
  }

  return "general";
}

// ========================================
// BUSCA TEMÁTICA
// ========================================

function buscarTema(
  pergunta
) {

  const texto =
    pergunta.toLowerCase();

  for (

    const [key, value]

    of Object.entries(
      conhecimentoGlobal
    )

  ) {

    if (
      typeof value !== "object"
    ) continue;

    if (

      texto.includes(
        key.toLowerCase()
      )

    ) {

      return {

        palavra: key,
        dados: value
      };
    }
  }

  return null;
}

// ========================================
// TEMPLATE EDUCACIONAL
// ========================================

function criarTemplate(item) {

  if (!item) return null;

  const dados =
    item.dados;

  return `

${dados.emoji || "✨"}

${item.palavra}

${dados.pt
  ? `significa ${dados.pt}`
  : ""
}

${dados.fact || ""}

${dados.example || ""}

`;
}

// ========================================
// RESPOSTAS CONTROLADAS
// ========================================

function respostaControlada(pergunta) {

  const texto =
    pergunta.toLowerCase().trim();

  // ========================================
  // GLOSSÁRIO
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

        // PT -> EN

        if (

          item.pt
          &&
          texto.includes(
            item.pt.toLowerCase()
          )

        ) {

          return `

${item.emoji || "✨"}

${item.pt}
em inglês é:

${item.en}

${item.example_en || ""}

`;
        }

        // EN -> PT

        if (

          item.en
          &&
          texto.includes(
            item.en.toLowerCase()
          )

        ) {

          return `

${item.emoji || "✨"}

${item.en}
significa:

${item.pt}

${item.example_pt || ""}

`;
        }
      }
    }
  }

  // ========================================
  // TEMAS
  // ========================================

  const resultadoTema =

    buscarTema(
      pergunta
    );

  if (resultadoTema) {

    return criarTemplate(
      resultadoTema
    );
  }

  // ========================================
  // CONVERSAS FIXAS
  // ========================================

  const respostasFixas = {

    "hello":

      "👋 Hello significa olá ✨",

    "hi":

      "👋 Hi significa oi ✨",

    "how are you":

      "😊 I'm fine, thank you!",

    "você fala espanhol":

      "🌍 Não 😊 Eu ensino inglês e português ✨",

    "cat":

      "🐱 Cat significa gato ✨",

    "dog":

      "🐶 Dog significa cachorro ✨"
  };

  if (
    respostasFixas[texto]
  ) {

    return respostasFixas[texto];
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

  // ========================================
  // MEMÓRIA
  // ========================================

  memory.totalMessages++;

  if (
    memory.totalMessages % 10 === 0
  ) {

    memory.friendshipLevel++;
  }

  salvarMemoria();

  // ========================================
  // INTENT
  // ========================================

  const intent =
    detectIntent(pergunta);

  memory.currentMode =
    intent;

  salvarMemoria();

  // ========================================
  // UI
  // ========================================

  adicionarMensagem(
    pergunta,
    "user"
  );

  inputPergunta.value = "";

  inputPergunta.disabled = true;

  btnEnviar.disabled = true;

  mostrarPensando();

  // ========================================
  // RESPOSTA CONTROLADA
  // ========================================

  const respostaLocal =

    respostaControlada(
      pergunta
    );

  // ========================================
  // 80% CONTROLADO
  // ========================================

  if (respostaLocal) {

    removerPensando();

    adicionarMensagem(

      microResposta(
        respostaLocal
      ),

      "bot"
    );

    inputPergunta.disabled =
      false;

    btnEnviar.disabled =
      false;

    inputPergunta.focus();

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

  // ========================================
  // PROMPT FINAL
  // ========================================

  const mensagemUsuario = `

${modoExtra}

Child asks:

"${pergunta}"

Answer with tiny educational responses.
`;

  try {

    const resposta =

      await engine.chat.completions.create({

        messages: [

          {
            role: "system",
            content: systemPrompt
          },

          {
            role: "user",
            content: mensagemUsuario
          }

        ],

        temperature: 0.1,

        max_tokens: 50
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

  const modeloOk =
    await iniciarModelo();

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
