// ========================================
// IMPORTS
// ========================================
import { carregarConhecimento } from "./data/index.js";
import { memory } from "./brain/memory.js";

// ========================================
// DICIONÁRIOS (Português ↔ Inglês)
// ========================================
let ptEn = [];
let enPt = [];

async function carregarDicionarios() {

  try {

    const [ptRes, enRes] =
      await Promise.all([

        fetch("./dictionary/pt_en.json"),
        fetch("./dictionary/en_pt.json")

      ]);

    ptEn =
      await ptRes.json();

    enPt =
      await enRes.json();

    console.log(
      "Dicionários carregados!"
    );

  } catch (erro) {

    console.error(
      "Erro ao carregar dicionários:",
      erro
    );
  }
}

function procurarNoDicionario(texto) {
  const frase = texto.toLowerCase().trim();

  // tenta achar português → inglês
  const pt = ptEn.find(item =>
    item.portuguese?.toLowerCase() === frase
  );

  if (pt) {
    return `🇺🇸 ${pt.portuguese} → ${pt.english}`;
  }

  // tenta achar inglês → português
  const en = enPt.find(item =>
    item.english?.toLowerCase() === frase
  );

  if (en) {
    return `🇧🇷 ${en.english} → ${en.portuguese}`;
  }

  return null;
}

/**
 * Detecta perguntas naturais de tradução e retorna o termo extraído.
 * Ex.: "como fala gato em inglês", "what is casa in english", "traduz cachorro"
 * Retorna o termo limpo ou null se não detectado.
 */
function extrairTermoParaTraducao(pergunta) {
  const texto = pergunta.trim();

  // Padrões português – agora a parte inicial é obrigatória
  const padraoPt1 = /como\s+(?:se\s+)?(?:diz|fala)\s+(.+?)\s+(?:em\s+inglês|in\s+english)/i;
  const padraoPt2 = /traduz(?:ir)?\s+(.+)/i;
  const padraoPt3 = /o\s+que\s+significa\s+(.+)/i;

  // Padrões inglês
  const padraoEn1 = /how\s+do\s+(?:i|you)\s+say\s+(.+?)\s+(?:in\s+english|em\s+inglês)/i;
  const padraoEn2 = /what\s+is\s+(.+?)\s+(?:in\s+english|em\s+inglês)/i;

  const todos = [padraoPt1, padraoPt2, padraoPt3, padraoEn1, padraoEn2];

  for (const regex of todos) {
    const match = texto.match(regex);
    if (match && match[1]) {
      let termo = match[1].trim();
      // Remove aspas extras se existirem
      termo = termo.replace(/^["'`]|["'`]$/g, '').trim();
      if (termo) return termo;
    }
  }
  return null;
}

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

// ❌ FUNÇÃO FALAR REMOVIDA – sem síntese de voz
// (o bloco inteiro foi excluído)

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

  // ========================================
  // GRAMÁTICA A1
  // ========================================

  {
    nome: "verb_to_be",
    padroes: [
      /verb to be/i,
      /o que é am is are/i,
      /verbo ser ou estar/i
    ],
    respostas: [
      "🐝 The Verb TO BE is: AM, IS, ARE.\nExample: I am happy! ✨"
    ]
  },

  {
    nome: "present_simple_do",
    padroes: [
      /present simple/i,
      /auxiliar do/i,
      /quando usar do ou does/i
    ],
    respostas: [
      "⚙️ Use DO for I, YOU, WE, THEY.\nUse DOES for HE, SHE, IT! 🍕"
    ]
  },

  {
    nome: "modal_can",
    padroes: [
      /\bcan\b/i,
      /o que é can/i,
      /verbo poder/i
    ],
    respostas: [
      "💪 CAN means ability!\nExample: I can swim! 🏊‍♂️"
    ]
  },

  {
    nome: "there_is_are",
    padroes: [
      /there is/i,
      /there are/i,
      /verbo haver/i
    ],
    respostas: [
      "📍 THERE IS = singular.\nTHERE ARE = plural 🍎"
    ]
  },

  {
    nome: "how_much_many",
    padroes: [
      /how much/i,
      /how many/i,
      /quantos/i
    ],
    respostas: [
      "🔢 HOW MANY = countable.\nHOW MUCH = uncountable 💰"
    ]
  },

  // ========================================
  // CONVERSAÇÃO A1
  // ========================================

  {
    nome: "greeting",
    padroes: [
      /\b(hi|hello|hey|olá|oi)\b/i
    ],
    respostas: [
      "👋 Hello little star! ✨",
      "🌟 Hi friend! How are you today?",
      "🦉 Hello explorer! Ready to learn?"
    ]
  },

  {
    nome: "ask_name_bot",
    padroes: [
      /what(?:'s| is) your name/i,
      /qual.*seu nome/i
    ],
    respostas: [
      "🦉 My name is Quinti!",
      "✨ I'm Quinti, your English owl!",
      "🌟 You can call me Quinti!"
    ]
  },

  {
    nome: "how_are_you",
    padroes: [
      /how are you/i,
      /como você está/i
    ],
    respostas: [
      "😊 I'm great! Thanks for asking!",
      "🌟 I'm happy and ready to learn!",
      "🦉 I'm doing very well today!"
    ]
  },

  {
    nome: "how_old",
    padroes: [
      /how old are you/i,
      /qual sua idade/i
    ],
    respostas: [
      "🎈 I don't have an age like humans!",
      "🦉 I'm always learning every day!"
    ]
  },

  {
    nome: "where_are_you_from",
    padroes: [
      /where are you from/i,
      /de onde você é/i
    ],
    respostas: [
      "🌍 I'm from the world of learning!",
      "✨ I come from a magical world of English!"
    ]
  },

  {
    nome: "who_are_you",
    padroes: [
      /who are you/i,
      /quem é você/i
    ],
    respostas: [
      "🦉 I'm Quinti, your English tutor!",
      "✨ I'm Quinti! I help children learn English."
    ]
  },

  {
    nome: "do_you_like",
    padroes: [
      /do you like/i
    ],
    respostas: [
      "😊 That sounds interesting!",
      "🌟 I like learning new things!",
      "🦉 Tell me more!"
    ]
  },

  {
    nome: "favorite",
    padroes: [
      /what(?:'s| is) your favorite/i
    ],
    respostas: [
      "🐶 I like animals and words!",
      "🌈 Learning is one of my favorite things!"
    ]
  },

  {
    nome: "who_is_she",
    padroes: [
      /who is she/i
    ],
    respostas: [
      "👧 She is a girl or a woman."
    ]
  },

  {
    nome: "who_is_he",
    padroes: [
      /who is he/i
    ],
    respostas: [
      "👦 He is a boy or a man."
    ]
  },

  {
    nome: "what_is_it",
    padroes: [
      /what is it/i
    ],
    respostas: [
      "📦 It can be an object, animal or thing."
    ]
  },

  {
    nome: "what_are_these",
    padroes: [
      /what are these/i
    ],
    respostas: [
      "📚 These means many things near us!"
    ]
  },

  {
    nome: "thanks",
    padroes: [
      /\b(thank|thanks|obrigado|obrigada)\b/i
    ],
    respostas: [
      "💛 You're welcome! 🌟"
    ]
  }
];

// ========================================
// FRASES PUXADORAS (para o fallback)
// ========================================
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

        // ❌ REMOVIDA a chamada a falar(item.en)

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

      // retorna um resumo amigável, SEM a categoria
      return `
🦉 I found something about:

${pergunta}

✨ Let's learn together!
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
  // 1. DICIONÁRIO (prioridade máxima)
  // ========================================
  // Tenta achar a frase exata
  const traducaoExata = procurarNoDicionario(texto);
  if (traducaoExata) {
    return traducaoExata;
  }

  // Tenta detectar pergunta natural de tradução e extrair o termo
  const termo = extrairTermoParaTraducao(texto);
  if (termo) {
    const traducaoNatural = procurarNoDicionario(termo);
    if (traducaoNatural) {
      return traducaoNatural;
    }
    // Se não encontrou no dicionário, deixa cair para o fallback normal
  }

  // ========================================
  // 2. INTENÇÕES A1
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
  // 3. GLOSSÁRIO
  // ========================================

  const glossario =
    buscarGlossario(texto);

  if (glossario) {
    return glossario;
  }

  // ========================================
  // 4. BASE DE CONHECIMENTO
  // ========================================

  const conhecimento =
    buscarConhecimento(texto);

  if (conhecimento) {
    return conhecimento;
  }

  // ========================================
  // 5. FALLBACK
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
// MICROFONE (mantido normalmente)
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

  // ❌ REMOVIDA a chamada a falar(resp)
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

    // Carrega os dicionários depois do conhecimento principal
    await carregarDicionarios();

    atualizarStatus(
      "✅ Quinti is Ready!",
      1
    );

  } catch (e) {

    console.error(e);
  }

  adicionarMensagem(
`🦉 Hello!

I am Quinti ✨

Ready for English Lessons?`,
    "bot"
  );

})();
