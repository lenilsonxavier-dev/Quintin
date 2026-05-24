// ========================================
// IMPORTS
// ========================================
import { carregarConhecimento } from "./data/index.js";
import { memory } from "./brain/memory.js";

// ========================================
// DICIONÁRIOS (Português ↔ Inglês)
// ========================================
let ptEn = {};
let enPt = {};

async function carregarDicionarios() {
  try {

    const [enRes, ptRes] = await Promise.all([
      fetch("./public/data/en_pt.json"),
      fetch("./public/data/pt_en.json")
    ]);

    if (!enRes.ok) {
      throw new Error(`Erro EN_PT: ${enRes.status}`);
    }

    if (!ptRes.ok) {
      throw new Error(`Erro PT_EN: ${ptRes.status}`);
    }

    // Carrega os arrays
    const EN_PT_ARRAY = await enRes.json();
    const PT_EN_ARRAY = await ptRes.json();

    console.log("EN_PT carregado:", EN_PT_ARRAY.length);
    console.log("PT_EN carregado:", PT_EN_ARRAY.length);

    // Converte array -> objeto rápido de busca
    const EN_PT = {};
    const PT_EN = {};

    EN_PT_ARRAY.forEach(item => {
      if (item.english) {
        EN_PT[item.english.toLowerCase()] = item.portuguese;
      }
    });

    PT_EN_ARRAY.forEach(item => {
      if (item.portuguese) {
        PT_EN[item.portuguese.toLowerCase()] = item.english;
      }
    });

    console.log("📚 Dicionários prontos!");

    return { EN_PT, PT_EN };

  } catch (erro) {
    console.error("Erro ao carregar dicionários:", erro);
    return {
      EN_PT: {},
      PT_EN: {}
    };
  }
}
function procurarNoDicionario(texto) {

  texto = texto.toLowerCase().trim();

  console.log("Pergunta:", texto);

  // remove frases comuns
  const palavra = texto
    .replace("o que significa", "")
    .replace("como se diz", "")
    .replace("what means", "")
    .replace("em inglês", "")
    .replace("em ingles", "")
    .replace("in english", "")
    .replace("?", "")
    .trim();

  console.log("Palavra limpa:", palavra);

  // português → inglês
  if (ptEn[palavra]) {
    return `✨ ${palavra} em inglês é ${ptEn[palavra]}`;
  }

  // inglês → português
  if (enPt[palavra]) {
    return `✨ ${palavra} significa ${enPt[palavra]}`;
  }

  return null;
}
function extrairTermoParaTraducao(pergunta) {
  const texto = pergunta.trim();

  const padraoPt1 = /como\s+(?:se\s+)?(?:diz|fala)\s+(.+?)\s+(?:em\s+inglês|in\s+english)/i;
  const padraoPt2 = /traduz(?:ir)?\s+(.+)/i;
  const padraoPt3 = /o\s+que\s+significa\s+(.+)/i;

  const padraoEn1 = /how\s+do\s+(?:i|you)\s+say\s+(.+?)\s+(?:in\s+english|em\s+inglês)/i;
  const padraoEn2 = /what\s+is\s+(.+?)\s+(?:in\s+english|em\s+inglês)/i;

  const todos = [padraoPt1, padraoPt2, padraoPt3, padraoEn1, padraoEn2];

  for (const regex of todos) {
    const match = texto.match(regex);
    if (match && match[1]) {
      let termo = match[1].trim();
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
const chat = document.getElementById("chat");
const inputPergunta = document.getElementById("pergunta");
const btnEnviar = document.getElementById("btnEnviar");
const progressBar = document.getElementById("progress");
const btnMic = document.getElementById("btnMic");
const statusEl = document.getElementById("status");

// ========================================
// UI HELPERS
// ========================================
function atualizarStatus(texto, progresso = null) {
  if (statusEl) statusEl.textContent = texto;
  if (progresso !== null && progressBar) {
    progressBar.style.width = `${progresso * 100}%`;
  }
}

function adicionarMensagem(texto, autor) {
  const div = document.createElement("div");
  div.className = `msg ${autor}`;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  memory.chatHistory.push({
    role: autor,
    content: texto,
    timestamp: new Date().toISOString()
  });

  if (memory.chatHistory.length > MAX_HISTORY * 2) {
    memory.chatHistory = memory.chatHistory.slice(-MAX_HISTORY * 2);
  }

  return div;
}

function mostrarPensando() {
  removerPensando();
  const div = document.createElement("div");
  div.className = "pensando";
  div.id = "pensando";
  div.innerHTML = `<span style="font-size:32px;">🦉</span> <span>Quinti is thinking...</span>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function removerPensando() {
  const el = document.getElementById("pensando");
  if (el) el.remove();
}

function similarity(a, b) {
  const levenshtein = (a, b) => {
    const matrix = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return matrix[a.length][b.length];
  };
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1.0 : 1.0 - levenshtein(a, b) / maxLen;
}

// ========================================
// BASE DE CONHECIMENTO A1 - INTENÇÕES
// ========================================
const intencoes = [
  {
    nome: "verb_to_be",
    padroes: [/verb to be/i, /o que é am is are/i, /verbo ser ou estar/i],
    respostas: ["🐝 The Verb TO BE is: AM, IS, ARE.\nExample: I am happy! ✨"]
  },
  {
    nome: "present_simple_do",
    padroes: [/present simple/i, /auxiliar do/i, /quando usar do ou does/i],
    respostas: ["⚙️ Use DO for I, YOU, WE, THEY.\nUse DOES for HE, SHE, IT! 🍕"]
  },
  {
    nome: "modal_can",
    padroes: [/\bcan\b/i, /o que é can/i, /verbo poder/i],
    respostas: ["💪 CAN means ability!\nExample: I can swim! 🏊‍♂️"]
  },
  {
    nome: "there_is_are",
    padroes: [/there is/i, /there are/i, /verbo haver/i],
    respostas: ["📍 THERE IS = singular.\nTHERE ARE = plural 🍎"]
  },
  {
    nome: "how_much_many",
    padroes: [/how much/i, /how many/i, /quantos/i],
    respostas: ["🔢 HOW MANY = countable.\nHOW MUCH = uncountable 💰"]
  },
  {
    nome: "greeting",
    padroes: [/\b(hi|hello|hey|olá|oi)\b/i],
    respostas: [
      "👋 Hello little star! ✨",
      "🌟 Hi friend! How are you today?",
      "🦉 Hello explorer! Ready to learn?"
    ]
  },
  {
    nome: "ask_name_bot",
    padroes: [/what(?:'s| is) your name/i, /qual.*seu nome/i],
    respostas: [
      "🦉 My name is Quinti!",
      "✨ I'm Quinti, your English owl!",
      "🌟 You can call me Quinti!"
    ]
  },
  {
    nome: "how_are_you",
    padroes: [/how are you/i, /como você está/i],
    respostas: [
      "😊 I'm great! Thanks for asking!",
      "🌟 I'm happy and ready to learn!",
      "🦉 I'm doing very well today!"
    ]
  },
  {
    nome: "how_old",
    padroes: [/how old are you/i, /qual sua idade/i],
    respostas: [
      "🎈 I don't have an age like humans!",
      "🦉 I'm always learning every day!"
    ]
  },
  {
    nome: "where_are_you_from",
    padroes: [/where are you from/i, /de onde você é/i],
    respostas: [
      "🌍 I'm from the world of learning!",
      "✨ I come from a magical world of English!"
    ]
  },
  {
    nome: "who_are_you",
    padroes: [/who are you/i, /quem é você/i],
    respostas: [
      "🦉 I'm Quinti, your English tutor!",
      "✨ I'm Quinti! I help children learn English."
    ]
  },
  {
    nome: "do_you_like",
    padroes: [/do you like/i],
    respostas: [
      "😊 That sounds interesting!",
      "🌟 I like learning new things!",
      "🦉 Tell me more!"
    ]
  },
  {
    nome: "favorite",
    padroes: [/what(?:'s| is) your favorite/i],
    respostas: [
      "🐶 I like animals and words!",
      "🌈 Learning is one of my favorite things!"
    ]
  },
  {
    nome: "who_is_she",
    padroes: [/who is she/i],
    respostas: ["👧 She is a girl or a woman."]
  },
  {
    nome: "who_is_he",
    padroes: [/who is he/i],
    respostas: ["👦 He is a boy or a man."]
  },
  {
    nome: "what_is_it",
    padroes: [/what is it/i],
    respostas: ["📦 It can be an object, animal or thing."]
  },
  {
    nome: "what_are_these",
    padroes: [/what are these/i],
    respostas: ["📚 These means many things near us!"]
  },
  {
    nome: "thanks",
    padroes: [/\b(thank|thanks|obrigado|obrigada)\b/i],
    respostas: ["💛 You're welcome! 🌟"]
  }
];

// ========================================
// FRASES PUXADORAS
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
  if (!window.conhecimentoGlobal?.glossary) return null;
  const texto = pergunta.toLowerCase().trim();
  for (const categoria of Object.values(window.conhecimentoGlobal.glossary)) {
    if (!categoria.words) continue;
    for (const item of categoria.words) {
      const en = item.en?.toLowerCase() || "";
      const pt = item.pt?.toLowerCase() || "";
      if (texto.includes(en) || texto.includes(pt)) {
        return `${item.emoji || "✨"} ${item.en}\n\n${item.en} means ${item.pt}\n\n${item.example_en || ""}\n\n${item.example_pt || ""}`;
      }
    }
  }
  return null;
}

function buscarConhecimento(pergunta) {
  const texto = pergunta.toLowerCase();
  const base = window.conhecimentoGlobal;
  if (!base) return null;
  for (const [nomeCategoria, categoria] of Object.entries(base)) {
    if (!categoria || typeof categoria !== "object") continue;
    const itens = JSON.stringify(categoria).toLowerCase();
    if (itens.includes(texto)) {
      return `🦉 I found something about:\n\n${pergunta}\n\n✨ Let's learn together!`;
    }
  }
  return null;
}

function detectarApresentacao(pergunta) {
  const texto = pergunta.trim();
  const regex = /(?:my name is|meu nome é|i am|eu sou)\s+([a-zA-Záàâãéèêíïóôõúüç]+(?:\s+[a-zA-Záàâãéèêíïóôõúüç]+)?)/i;
  const match = texto.match(regex);
  if (match && match[1]) {
    const nome = match[1].trim();
    return `Nice to meet you, ${nome}! ✨ I'm Quinti, your English tutor. How can I help you today?`;
  }
  return null;
}

// ========================================
// FUNÇÃO PRINCIPAL (única, sem duplicação)
// ========================================
function respostaControlada(pergunta) {
  const texto = pergunta.trim();

  // 1. DICIONÁRIO
  const traducaoExata = procurarNoDicionario(texto);
  if (traducaoExata) return traducaoExata;

  const termo = extrairTermoParaTraducao(texto);
  if (termo) {
    const traducaoNatural = procurarNoDicionario(termo);
    if (traducaoNatural) return traducaoNatural;
  }

  // 2. APRESENTAÇÃO PESSOAL
  const apresentacao = detectarApresentacao(texto);
  if (apresentacao) return apresentacao;

  // 3. INTENÇÕES A1
  for (const intent of intencoes) {
    for (const regex of intent.padroes) {
      if (regex.test(texto)) {
        return intent.respostas[Math.floor(Math.random() * intent.respostas.length)];
      }
    }
  }

  // 4. GLOSSÁRIO
  const glossario = buscarGlossario(texto);
  if (glossario) return glossario;

  // 5. BASE DE CONHECIMENTO
  const conhecimento = buscarConhecimento(texto);
  if (conhecimento) return conhecimento;

  // 6. FALLBACK
  return `🌟 I'm learning!\n\n${conversaPuxadores[Math.floor(Math.random() * conversaPuxadores.length)]}`;
}

// ========================================
// MICROFONE
// ========================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition && btnMic) {
  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    btnMic.textContent = "🔴";
    adicionarMensagem("🎤 Estou ouvindo... Speak to me!", "bot");
  };
  recognition.onend = () => { btnMic.textContent = "🎤"; };
  recognition.onresult = (event) => {
    const texto = event.results[0][0].transcript;
    inputPergunta.value = texto;
    enviar();
  };
  recognition.onerror = (event) => {
    console.log("MIC ERROR:", event.error);
    let mensagem = "🎤 Microphone error!";
    if (event.error === "not-allowed") mensagem = "🎤 Please allow microphone access.\nPermita acesso ao microfone ✨";
    else if (event.error === "no-speech") mensagem = "🎤 I couldn't hear you.\nNão consegui ouvir você ✨";
    else if (event.error === "audio-capture") mensagem = "🎤 No microphone detected.\nNenhum microfone encontrado ✨";
    adicionarMensagem(mensagem, "bot");
    btnMic.textContent = "🎤";
  };
}

// ========================================
// CHAT & EVENTOS
// ========================================
async function enviar() {
  const texto = inputPergunta?.value?.trim();
  if (!texto) return;

  adicionarMensagem(texto, "user");
  inputPergunta.value = "";
  mostrarPensando();
  await new Promise(r => setTimeout(r, 500));
  removerPensando();

  const resp = respostaControlada(texto);
  adicionarMensagem(resp, "bot");
}

// ========================================
// EVENTOS
// ========================================
window.addEventListener("DOMContentLoaded", () => {
  if (btnEnviar) {
    btnEnviar.addEventListener("click", (e) => {
      e.preventDefault();
      enviar();
    });
  }
  if (inputPergunta) {
    inputPergunta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviar();
      }
    });
  }
  if (btnMic && recognition) {
    btnMic.addEventListener("click", (e) => {
      e.preventDefault();
      try { recognition.start(); } catch (err) { console.log(err); }
    });
  }
});

// ========================================
// INICIALIZAÇÃO
// ========================================
(async () => {
  atualizarStatus("🌍 Loading Quinti A1...", 0.5);
  try {
    window.conhecimentoGlobal = await carregarConhecimento();
    await carregarDicionarios();
    atualizarStatus("✅ Quinti is Ready!", 1);
  } catch (e) {
    console.error(e);
  }
  adicionarMensagem("🦉 Hello!\n\nI am Quinti ✨\n\nReady for English Lessons?", "bot");
})();
