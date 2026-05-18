import * as webllm from "https://esm.sh/@mlc-ai/web-llm";

import { knowledgeBase } from "./data/index.js";
import { memory } from "./brain/memory.js";
import { personality } from "./brain/personality.js";
import { detectIntent } from "./brain/orchestrator.js";

// =====================================================
// ELEMENTOS DA UI
// =====================================================

const chat = document.getElementById("chat");

let engine = null;
let modeloPronto = false;

// =====================================================
// BASE DE CONHECIMENTO
// =====================================================

const conhecimentoGlobal = knowledgeBase;

// =====================================================
// MODELO WEBLLM
// =====================================================

const MODEL_NAME = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

// =====================================================
// PROMPT DINÂMICO COM PERSONALIDADE
// =====================================================

const systemPrompt = `
You are ${personality.name}, a magical English teacher owl for Brazilian children.

PERSONALITY:
- ${personality.style}

RULES:
${personality.rules.map(rule => `- ${rule}`).join("\n")}

IMPORTANT:
- Always answer in a fun and playful way
- Keep answers short
- Use emojis
- Encourage the child
- Ask playful questions
- Never refuse simple translations
- Always help the child learn English
`;

// =====================================================
// BUSCAR CONTEXTO NOS JSONS
// =====================================================

function buscarContextoLocal(pergunta) {

  const lower = pergunta.toLowerCase();

  const resultados = [];

  for (const [en, pt] of Object.entries(conhecimentoGlobal)) {

    if (
      lower.includes(en.toLowerCase()) ||
      lower.includes(String(pt).toLowerCase())
    ) {

      resultados.push(`${en} = ${pt}`);

      // ============================
      // MEMÓRIA DE PALAVRAS
      // ============================

      if (!memory.learnedWords.includes(en)) {
        memory.learnedWords.push(en);
      }

      // ============================
      // TEMA FAVORITO
      // ============================

      if (
        en.includes("dog") ||
        en.includes("cat") ||
        en.includes("lion") ||
        en.includes("bird")
      ) {
        memory.favoriteTheme = "animals";
      }

      if (resultados.length >= 6) break;
    }
  }

  return resultados;
}

// =====================================================
// INICIAR MODELO
// =====================================================

async function iniciarModelo() {

  if (!navigator.gpu) {

    adicionarMensagem(
      "❌ Seu navegador não suporta WebGPU. Use Chrome ou Edge.",
      "bot"
    );

    return false;
  }

  adicionarMensagem(
    "🧠 Quinti is waking up...",
    "bot"
  );

  const progressDiv = document.createElement("div");

  progressDiv.className = "progress";

  chat.appendChild(progressDiv);

  try {

    engine = await webllm.CreateMLCEngine(
      MODEL_NAME,
      {
        initProgressCallback: (progress) => {

          const percent = Math.round(
            (progress.progress || 0) * 100
          );

          progressDiv.innerText =
            `${progress.text || "Loading..."} (${percent}%)`;

          if (percent === 100) {

            setTimeout(() => {
              progressDiv.remove();
            }, 1000);
          }
        }
      }
    );

    adicionarMensagem(
      "✅ Quinti is ready! 🌍",
      "bot"
    );

    return true;

  } catch (err) {

    console.error(err);

    adicionarMensagem(
      `❌ Error loading model: ${err.message}`,
      "bot"
    );

    return false;
  }
}

// =====================================================
// ENVIAR MENSAGEM
// =====================================================

window.enviar = async function () {

  const input = document.getElementById("pergunta");

  const pergunta = input.value.trim();

  if (!pergunta) return;

  // ============================
  // DETECTAR MODO
  // ============================

  const intent = detectIntent(pergunta);

  memory.currentMode = intent;

  // ============================
  // MOSTRAR USUÁRIO
  // ============================

  adicionarMensagem(pergunta, "user");

  input.value = "";

  input.disabled = true;

  document.getElementById("btnEnviar").disabled = true;

  mostrarPensando();

  // ============================
  // BUSCAR CONTEXTO
  // ============================

  const palavrasContexto = buscarContextoLocal(pergunta);

  let contextoExtra = "";

  if (palavrasContexto.length) {

    contextoExtra =
      "Relevant vocabulary:\n" +
      palavrasContexto.join("\n") +
      "\n\n";
  }

  // ============================
  // MEMÓRIA
  // ============================

  let memoriaExtra = "";

  if (memory.learnedWords.length > 0) {

    memoriaExtra =
      `The child already learned:\n${memory.learnedWords.join(", ")}\n\n`;
  }

  // ============================
  // MODO ATUAL
  // ============================

  let modoExtra = "";

  if (memory.currentMode === "story") {

    modoExtra =
      "Tell the answer like a small magical story.\n\n";
  }

  if (memory.currentMode === "game") {

    modoExtra =
      "Turn the answer into a playful game.\n\n";
  }

  // ============================
  // TEMA FAVORITO
  // ============================

  let temaExtra = "";

  if (memory.favoriteTheme) {

    temaExtra =
      `Favorite theme of the child: ${memory.favoriteTheme}\n\n`;
  }

  // ============================
  // MENSAGEM FINAL
  // ============================

  const mensagemUsuario = `
${contextoExtra}
${memoriaExtra}
${modoExtra}
${temaExtra}

Child asks:
"${pergunta}"

Quinti, answer in a magical and playful way.
`;

  try {

    if (!engine || !modeloPronto) {

      throw new Error("Modelo ainda não carregado.");
    }

    const resposta = await engine.chat.completions.create({

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
      resposta.choices[0].message.content.trim();

    removerPensando();

    adicionarMensagem(texto, "bot");

    // ============================
    // DEBUG DE MEMÓRIA
    // ============================

    console.log(
      "📚 Learned words:",
      memory.learnedWords
    );

    console.log(
      "🎮 Current mode:",
      memory.currentMode
    );

    console.log(
      "🌈 Favorite theme:",
      memory.favoriteTheme
    );

  } catch (err) {

    removerPensando();

    console.error(err);

    adicionarMensagem(
      "❌ Quinti got confused 🌪️ Try again!",
      "bot"
    );

  } finally {

    input.disabled = false;

    document.getElementById("btnEnviar").disabled = false;

    input.focus();
  }
};

// =====================================================
// UI
// =====================================================

function adicionarMensagem(texto, classe) {

  const div = document.createElement("div");

  div.className = `msg ${classe}`;

  div.innerText = texto;

  chat.appendChild(div);

  chat.scrollTop = chat.scrollHeight;
}

// =====================================================
// PENSANDO
// =====================================================

function mostrarPensando() {

  removerPensando();

  const div = document.createElement("div");

  div.className = "pensando";

  div.id = "pensando";

  div.innerHTML = `
    <img src="./img/quintin.png">
    <span>🧠 Quinti is thinking...</span>
  `;

  chat.appendChild(div);

  chat.scrollTop = chat.scrollHeight;
}

function removerPensando() {

  const el = document.getElementById("pensando");

  if (el) el.remove();
}

// =====================================================
// ENTER
// =====================================================

document
  .getElementById("pergunta")
  .addEventListener("keypress", (e) => {

    if (
      e.key === "Enter" &&
      !document.getElementById("btnEnviar").disabled
    ) {

      enviar();
    }
  });

// =====================================================
// INICIALIZAÇÃO
// =====================================================

(async function iniciar() {

  adicionarMensagem(
    "🌍 Loading Quinti's magical brain...",
    "bot"
  );

  adicionarMensagem(
    "📚 Knowledge base loaded!",
    "bot"
  );

  const modeloOk = await iniciarModelo();

  modeloPronto = modeloOk;

  if (!modeloOk) {

    adicionarMensagem(
      "⚠️ Offline mode activated.",
      "bot"
    );

  } else {

    adicionarMensagem(

      personality.greetings[
        Math.floor(
          Math.random() *
          personality.greetings.length
        )
      ],

      "bot"
    );
  }

  document.getElementById("pergunta").disabled = false;

  document.getElementById("btnEnviar").disabled = false;

})();
