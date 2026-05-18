import { CreateMLCEngine }
from "https://esm.sh/@mlc-ai/web-llm";

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
// MEMÓRIA PERSISTENTE
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
// ELEMENTOS DA UI
// ========================================

const chat =
  document.getElementById("chat");

let engine = null;

let modeloPronto = false;

// ========================================
// ESTADO EMOCIONAL
// ========================================

memory.friendshipLevel =
  memory.friendshipLevel || 1;

memory.totalMessages =
  memory.totalMessages || 0;

// ========================================
// BASE DE CONHECIMENTO
// ========================================

let conhecimentoGlobal = {};

// ========================================
// MODELO WEBLLM
// ========================================

const MODEL_NAME =
  "Llama-3.2-1B-Instruct-q4f16_1-MLC";

// ========================================
// PROMPT DINÂMICO
// ========================================

const systemPrompt = `
You are ${personality.name},
a magical English teacher owl
for Brazilian children.

PERSONALITY:
- ${personality.style}

RULES:
${personality.rules.map(
  rule => `- ${rule}`
).join("\n")}

IMPORTANT:
- Always answer in a fun way
- Keep answers short
- Use emojis
- Encourage the child
- Ask playful questions
- Never refuse translations
- Be warm and magical
- Build emotional connection
- Remember previous learning
`;

// ========================================
// PALAVRAS DE TEMA
// ========================================

const animalWords = [
  "dog",
  "cat",
  "lion",
  "bird",
  "cow",
  "fish",
  "horse",
  "tiger",
  "monkey",
  "snake"
];

// ========================================
// CONTEXTO DOS JSONS
// ========================================

function buscarContextoLocal(pergunta) {

  const lower =
    pergunta.toLowerCase();

  const resultados = [];

  for (
    const [en, pt]
    of Object.entries(conhecimentoGlobal)
  ) {

    if (

      lower.includes(
        en.toLowerCase()
      )

      ||

      lower.includes(
        String(pt).toLowerCase()
      )

    ) {

      resultados.push(
        `${en} = ${pt}`
      );

      // ========================================
      // MEMÓRIA DE PALAVRAS
      // ========================================

      if (
        !memory.learnedWords.includes(en)
      ) {

        memory.learnedWords.push(en);

        // limite
        if (
          memory.learnedWords.length > 100
        ) {

          memory.learnedWords.shift();
        }

        salvarMemoria();
      }

      // ========================================
      // TEMA FAVORITO
      // ========================================

      if (
        animalWords.includes(
          en.toLowerCase()
        )
      ) {

        memory.favoriteTheme =
          "animals";

        salvarMemoria();
      }

      if (
        resultados.length >= 6
      ) break;
    }
  }

  return resultados;
}

// ========================================
// INICIAR WEBLLM
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
    "🦉 Quinti is opening his magical books...",
    "bot"
  );

  const progressDiv =
    document.createElement("div");

  progressDiv.className =
    "progress";

  chat.appendChild(progressDiv);

  try {

    engine =
      await CreateMLCEngine(

        MODEL_NAME,

        {

          initProgressCallback:
            (progress) => {

            const percent =
              Math.round(

                (progress.progress || 0)
                * 100
              );

            progressDiv.innerText =

              `${progress.text || "Loading..."}

(${percent}%)`;

            if (percent === 100) {

              setTimeout(() => {

                progressDiv.remove();

              }, 1000);
            }
          }
        }
      );

    adicionarMensagem(
      "✅ Quinti is ready 🌍",
      "bot"
    );

    return true;

  } catch (err) {

    console.error(err);

    adicionarMensagem(
      `❌ ${err.message}`,
      "bot"
    );

    return false;
  }
}

// ========================================
// ENVIAR
// ========================================

window.enviar = async function () {

  const input =
    document.getElementById(
      "pergunta"
    );

  const pergunta =
    input.value.trim();

  if (!pergunta) return;

  // ========================================
  // CONTADOR DE MENSAGENS
  // ========================================

  memory.totalMessages++;

  if (
    memory.totalMessages % 10 === 0
  ) {

    memory.friendshipLevel++;
  }

  salvarMemoria();

  // ========================================
  // DETECTAR MODO
  // ========================================

  const intent =
    detectIntent(pergunta);

  memory.currentMode =
    intent;

  salvarMemoria();

  // ========================================
  // MOSTRAR USUÁRIO
  // ========================================

  adicionarMensagem(
    pergunta,
    "user"
  );

  input.value = "";

  input.disabled = true;

  document.getElementById(
    "btnEnviar"
  ).disabled = true;

  mostrarPensando();

  // ========================================
  // CONTEXTO DOS JSONS
  // ========================================

  const palavrasContexto =
    buscarContextoLocal(pergunta);

  let contextoExtra = "";

  if (
    palavrasContexto.length
  ) {

    contextoExtra =

      "Relevant vocabulary:\n"

      +

      palavrasContexto.join("\n")

      +

      "\n\n";
  }

  // ========================================
  // MEMÓRIA
  // ========================================

  let memoriaExtra = "";

  if (
    memory.learnedWords.length > 0
  ) {

    memoriaExtra =

      `The child already learned:

${memory.learnedWords.join(", ")}

\n\n`;
  }

  // ========================================
  // AMIZADE
  // ========================================

  let amizadeExtra = `

Quinti already knows the child.

Friendship level:
${memory.friendshipLevel}

Total conversations:
${memory.totalMessages}

Be warm and friendly.
`;

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
  // TEMA FAVORITO
  // ========================================

  let temaExtra = "";

  if (
    memory.favoriteTheme
  ) {

    temaExtra =

      `Favorite theme:

${memory.favoriteTheme}

\n\n`;
  }

  // ========================================
  // PROMPT FINAL
  // ========================================

  const mensagemUsuario = `

${contextoExtra}

${memoriaExtra}

${amizadeExtra}

${modoExtra}

${temaExtra}

Child asks:

"${pergunta}"

Quinti, answer in a magical,
friendly and playful way.
`;

  try {

    if (
      !engine ||
      !modeloPronto
    ) {

      throw new Error(
        "Model not loaded."
      );
    }

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

        temperature: 0.7,

        max_tokens: 180
      });

    const texto =

      resposta.choices[0]
      .message.content.trim();

    const respostaFinal =
      texto.slice(0, 600);

    removerPensando();

    adicionarMensagem(
      respostaFinal,
      "bot"
    );

    // ========================================
    // DEBUG
    // ========================================

    console.log(
      "📚 Learned:",
      memory.learnedWords
    );

    console.log(
      "🎮 Mode:",
      memory.currentMode
    );

    console.log(
      "🌈 Theme:",
      memory.favoriteTheme
    );

    console.log(
      "🦉 Friendship:",
      memory.friendshipLevel
    );

  } catch (err) {

    removerPensando();

    console.error(err);

    adicionarMensagem(
      "❌ Quinti got confused 🌪️",
      "bot"
    );

  } finally {

    input.disabled = false;

    document.getElementById(
      "btnEnviar"
    ).disabled = false;

    input.focus();
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

<img src="./img/quintin.png">

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

document

.getElementById("pergunta")

.addEventListener(

  "keypress",

  (e) => {

    if (

      e.key === "Enter"

      &&

      !document.getElementById(
        "btnEnviar"
      ).disabled

    ) {

      enviar();
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

  // ========================================
  // CARREGAR CONHECIMENTO
  // ========================================

  conhecimentoGlobal =
    await carregarConhecimento();

  adicionarMensagem(
    "📚 Knowledge base loaded!",
    "bot"
  );

  const modeloOk =
    await iniciarModelo();

  modeloPronto =
    modeloOk;

  if (!modeloOk) {

    adicionarMensagem(
      "⚠️ Offline mode activated.",
      "bot"
    );

  } else {

    adicionarMensagem(

      personality.greetings[

        Math.floor(

          Math.random()

          *

          personality.greetings.length
        )
      ],

      "bot"
    );

    // ========================================
    // MEMÓRIA DE RETORNO
    // ========================================

    if (
      memory.learnedWords.length > 0
    ) {

      adicionarMensagem(

`🌟 Welcome back!

You already learned:

${memory.learnedWords
  .slice(0,5)
  .join(", ")}`,

        "bot"
      );
    }

    if (
      memory.friendshipLevel > 3
    ) {

      adicionarMensagem(

`🦉 Quinti remembers you!

Friendship level:
${memory.friendshipLevel} ✨`,

        "bot"
      );
    }
  }

  document.getElementById(
    "pergunta"
  ).disabled = false;

  document.getElementById(
    "btnEnviar"
  ).disabled = false;

})();
