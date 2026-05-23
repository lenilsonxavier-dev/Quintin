// ========================================
// IMPORTS
// ========================================
import { carregarConhecimento } from "./data/index.js";
import { memory } from "./brain/memory.js";

// ========================================
// CONFIGURAÇÃO
// ========================================
const MAX_HISTORY = 6;

// ========================================
// DOM
// ========================================
const chat =
  document.getElementById("chat");

const inputPergunta =
  document.getElementById("pergunta");

const btnEnviar =
  document.getElementById("btnEnviar");

const progressBar =
  document.getElementById("progress");

const btnMic =
  document.getElementById("btnMic");

const statusEl =
  document.getElementById("status");

// ========================================
// UI HELPERS
// ========================================
function atualizarStatus(
  texto,
  progresso = null
) {

  if (statusEl) {
    statusEl.textContent =
      texto;
  }

  if (
    progresso !== null &&
    progressBar
  ) {
    progressBar.style.width =
      `${progresso * 100}%`;
  }
}

function adicionarMensagem(texto, autor) {

  const div =
    document.createElement("div");

  div.className =
    `msg ${autor}`;

  div.textContent =
    texto;

  chat.appendChild(div);

  chat.scrollTop =
    chat.scrollHeight;

  memory.chatHistory.push({
    role: autor,
    content: texto,
    timestamp:
      new Date().toISOString()
  });

  if (
    memory.chatHistory.length >
    MAX_HISTORY * 2
  ) {
    memory.chatHistory =
      memory.chatHistory.slice(
        -MAX_HISTORY * 2
      );
  }

  return div;
}

function mostrarPensando() {

  removerPensando();

  const div =
    document.createElement("div");

  div.className =
    "pensando";

  div.id =
    "pensando";

  div.innerHTML =
    `<span style="font-size:32px;">🦉</span>
     <span>Quinti is thinking...</span>`;

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

function falar(texto) {

  if (
    !window.speechSynthesis
  ) return;

  const cleanText =
    texto.replace(
      /[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g,
      ""
    );

  const utter =
    new SpeechSynthesisUtterance(
      cleanText
    );

  utter.lang =
    "en-US";

  utter.rate =
    0.82;

  speechSynthesis.speak(
    utter
  );
}

function similarity(a, b) {

  const levenshtein =
    (a, b) => {

      const matrix =
        Array.from(
          {
            length:
              a.length + 1
          },
          () => []
        );

      for (
        let i = 0;
        i <= a.length;
        i++
      ) {
        matrix[i][0] = i;
      }

      for (
        let j = 0;
        j <= b.length;
        j++
      ) {
        matrix[0][j] = j;
      }

      for (
        let i = 1;
        i <= a.length;
        i++
      ) {

        for (
          let j = 1;
          j <= b.length;
          j++
        ) {

          matrix[i][j] =
            Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] +
                (
                  a[i - 1] ===
                  b[j - 1]
                ? 0
                : 1
                )
            );
        }
      }

      return matrix[a.length][b.length];
    };

  const maxLen =
    Math.max(
      a.length,
      b.length
    );

  return maxLen === 0
    ? 1.0
    : 1.0 -
      levenshtein(a, b) /
      maxLen;
}

// ========================================
// BASE DE CONHECIMENTO A1 - INTENÇÕES
// ========================================
const intencoes = [
  // --- GRAMÁTICA A1 ---
  {
    nome: "verb_to_be",
    padroes: [/verb to be/i, /o que é am is are/i, /verbo ser ou estar/i],
    respostas: ["🐝 The Verb TO BE is: AM, IS, ARE. It means 'ser' or 'estar'.\nExample: I am happy! (Eu sou/estou feliz) ✨"]
  },
  {
    nome: "present_simple_do",
    padroes: [/present simple/i, /auxiliar do/i, /quando usar do ou does/i],
    respostas: ["⚙️ Use DO for I, YOU, WE, THEY. Use DOES for HE, SHE, IT. \nExample: Do you like pizza? 🍕"]
  },
  {
    nome: "modal_can",
    padroes: [/\bcan\b/i, /o que é can/i, /verbo poder/i],
    respostas: ["💪 CAN means ability (conseguir/poder). \nExample: I CAN swim! (Eu consigo nadar) 🏊‍♂️"]
  },
  {
    nome: "there_is_are",
    padroes: [/there is/i, /there are/i, /verbo haver/i, /verbo ter existe/i],
    respostas: ["📍 THERE IS (singular) and THERE ARE (plural) mean 'há' or 'existe'. \nExample: There is an apple. There are two apples. 🍎🍎"]
  },
  {
    nome: "possessives",
    padroes: [/'s/i, /posse/i, /possessives/i, /my your his her/i],
    respostas: ["🔑 Possessives show ownership! MY (meu), YOUR (seu), HIS (dele), HER (dela).\nExample: This is my book! 📚"]
  },
  {
    nome: "comparatives",
    padroes: [/comparative/i, /superlative/i, /maior que/i, /mais que/i],
    respostas: ["⚖️ Add -ER for comparatives: Tall -> TALLER (mais alto). \nAdd -EST for superlatives: Tall -> TALLEST (o mais alto)! 🦒"]
  },
  {
    nome: "past_simple",
    padroes: [/past simple/i, /passado/i, /was were/i, /did/i],
    respostas: ["🔙 Past Simple is for yesterday! Use WAS/WERE for 'to be' and DID for questions.\nExample: I was at home. Did you play? 🎮"]
  },
  {
    nome: "prepositions",
    padroes: [/in on at/i, /preposições/i, /prepositions/i],
    respostas: ["📍 IN (dentro/meses), ON (em cima/dias), AT (lugares específicos/horas).\nExample: At 5 o'clock. On Monday. In June. 📅"]
  },
  {
    nome: "how_much_many",
    padroes: [/how much/i, /how many/i, /quantos/i],
    respostas: ["🔢 HOW MANY for things we count (apples). HOW MUCH for things we don't count (water/money)! 💰"]
  },

  // --- CONVERSAÇÃO (GREETINGS/IDENTITY) ---
  {
    nome: "greeting",
    padroes: [/\b(hi|hello|hey|olá|oi)\b/i],
    respostas: ["👋 Hello, little star! What's your name? ✨", "🌟 Hi friend! How are you today?"]
  },
  {
    nome: "ask_name_bot",
    padroes: [/what(?:'s| is) your name/i, /qual.*seu nome/i],
    respostas: ["🦉 My name is Quinti! I'm your English tutor owl ✨"]
  },
  {
    nome: "thanks",
    padroes: [/\b(thank|thanks|obrigado|obrigada)\b/i],
    respostas: ["💛 You're welcome! (De nada!) 🌟"]
  }
];

const conversaPuxadores = [
  "🦉 Tell me: Can you swim? (I can swim!) 🏊‍♂️",
  "🌟 What are you doing now? (Present Continuous!) ✍️",
  "✨ Do you have a dog or a cat? 🐶🐱",
  "🍎 Is there an apple in your house? (There is/There are)"
];

// ========================================
// MOTOR DE RESPOSTAS
// ========================================

function buscarGlossario(pergunta) {

  if (!window.conhecimentoGlobal?.glossary) {
    return null;
  }

  const texto =
    pergunta.toLowerCase().trim();

  for (
    const categoria of Object.values(
      window.conhecimentoGlobal.glossary
    )
  ) {

    if (!categoria.words) continue;

    for (
      const item of categoria.words
    ) {

      const en =
        item.en?.toLowerCase() || "";

      const pt =
        item.pt?.toLowerCase() || "";

      if (
        texto.includes(en) ||
        texto.includes(pt)
      ) {

        falar(item.en);

        return `
${item.emoji || "✨"} ${item.en}

${item.en} means ${item.pt}

${item.example_en || ""}

${item.example_pt || ""}
`;
      }
    }
  }

  return null;
}


// ========================================
// BUSCA EM TODA BASE DE CONHECIMENTO
// ========================================

function buscarConhecimento(
  pergunta
) {

  const texto =
    pergunta.toLowerCase();

  const base =
    window.conhecimentoGlobal;

  if (!base) return null;

  for (
    const [nomeCategoria, categoria]
    of Object.entries(base)
  ) {

    if (
      !categoria ||
      typeof categoria !== "object"
    ) {
      continue;
    }

    // percorre tudo do JSON
    const itens =
      JSON.stringify(categoria)
        .toLowerCase();

    // procura palavras-chave
    if (
      itens.includes(texto)
    ) {

      // retorna um resumo amigável
      return `
🦉 I found something about:

${pergunta}

✨ Let's learn together!

(Category: ${nomeCategoria})
`;
    }
  }

  return null;
}


function respostaControlada(
  pergunta
) {

  const texto =
    pergunta.trim();

  // ========================================
  // INTENÇÕES A1
  // ========================================

  for (
    const intent of intencoes
  ) {

    for (
      const regex of intent.padroes
    ) {

      if (
        regex.test(texto)
      ) {

        return intent.respostas[
          Math.floor(
            Math.random() *
            intent.respostas.length
          )
        ];
      }
    }
  }

  // ========================================
  // GLOSSÁRIO
  // ========================================

  const glossario =
    buscarGlossario(texto);

  if (glossario) {
    return glossario;
  }

  // ========================================
  // BASE DE CONHECIMENTO
  // ========================================

  const conhecimento =
    buscarConhecimento(texto);

  if (conhecimento) {
    return conhecimento;
  }

  // ========================================
  // FALLBACK
  // ========================================

  return `
🌟 I'm learning!

${conversaPuxadores[
  Math.floor(
    Math.random() *
    conversaPuxadores.length
  )
]}
`;
}

// ========================================
// MICROFONE
// ========================================
const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition && btnMic) {

  recognition =
    new SpeechRecognition();

  recognition.lang =
    "pt-BR";

  recognition.continuous =
    false;

  recognition.interimResults =
    false;

  recognition.maxAlternatives =
    1;

  recognition.onstart =
    () => {

      btnMic.textContent =
        "🔴";

      adicionarMensagem(
        "🎤 Estou ouvindo... Speak to me!",
        "bot"
      );
    };

  recognition.onend =
    () => {

      btnMic.textContent =
        "🎤";
    };

  recognition.onresult =
    (event) => {

      const texto =
        event.results[0][0]
          .transcript;

      inputPergunta.value =
        texto;

      enviar();
    };

  recognition.onerror =
    (event) => {

      console.log(
        "MIC ERROR:",
        event.error
      );

      let mensagem =
        "🎤 Microphone error!";

      if (
        event.error ===
        "not-allowed"
      ) {

        mensagem =
          "🎤 Please allow microphone access.\nPermita acesso ao microfone ✨";
      }

      else if (
        event.error ===
        "no-speech"
      ) {

        mensagem =
          "🎤 I couldn't hear you.\nNão consegui ouvir você ✨";
      }

      else if (
        event.error ===
        "audio-capture"
      ) {

        mensagem =
          "🎤 No microphone detected.\nNenhum microfone encontrado ✨";
      }

      adicionarMensagem(
        mensagem,
        "bot"
      );

      btnMic.textContent =
        "🎤";
    };
}
// ========================================
// CHAT & EVENTOS
// ========================================

async function enviar() {

  const texto =
    inputPergunta?.value?.trim();

  if (!texto) return;

  adicionarMensagem(
    texto,
    "user"
  );

  inputPergunta.value =
    "";

  mostrarPensando();

  await new Promise(
    r => setTimeout(r, 500)
  );

  removerPensando();

  const resp =
    respostaControlada(
      texto
    );

  adicionarMensagem(
    resp,
    "bot"
  );

  falar(resp);
}


// ========================================
// EVENTOS
// ========================================

window.addEventListener(
  "DOMContentLoaded",
  () => {

    // BOTÃO ENVIAR
    if (btnEnviar) {

      btnEnviar.addEventListener(
        "click",
        (e) => {

          e.preventDefault();

          enviar();
        }
      );
    }

    // ENTER
    if (inputPergunta) {

      inputPergunta.addEventListener(
        "keydown",
        (e) => {

          if (
            e.key === "Enter" &&
            !e.shiftKey
          ) {

            e.preventDefault();

            enviar();
          }
        }
      );
    }

    // MICROFONE
    if (
      btnMic &&
      recognition
    ) {

      btnMic.addEventListener(
        "click",
        (e) => {

          e.preventDefault();

          try {

            recognition.start();

          } catch(err) {

            console.log(
              err
            );
          }
        }
      );
    }
  }
);

// ========================================
// INICIALIZAÇÃO
// ========================================
(async () => {

  atualizarStatus(
    "🌍 Loading Quinti A1...",
    0.5
  );

  try {

    window.conhecimentoGlobal =
      await carregarConhecimento();

    atualizarStatus(
      "✅ Quinti Ready!",
      1
    );

  } catch (e) {

    console.error(e);
  }

  adicionarMensagem(
`🦉 Hello!

I am Quinti ✨

Ready for English A1?`,
    "bot"
  );

})();
