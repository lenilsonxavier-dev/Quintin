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
let exemplos = [];

// ========================================
// FRASES ESPECIAIS (Tradução completa)
// ========================================
const FRASES_ESPECIAIS = {
   "mamae eu te amo": "Mom, I love you ❤️",
   "eu te amo": "I love you ❤️",
   "bom dia": "Good morning ☀️",
   "boa tarde": "Good afternoon 🌅",
   "boa noite": "Good night 🌙",
   "como vai voce": "How are you? 😊",
   "tudo bem": "Everything is fine ✨",
   "ate logo": "See you later 👋",
   "parabens": "Congratulations 🎉",
   "obrigado": "Thank you 🙏",
   "de nada": "You're welcome 💛"
};

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

    const EN_PT_ARRAY = await enRes.json();
    const PT_EN_ARRAY = await ptRes.json();

    console.log("EN_PT carregado:", EN_PT_ARRAY.length);
    console.log("PT_EN carregado:", PT_EN_ARRAY.length);

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

    enPt = EN_PT;
    ptEn = PT_EN;

    console.log("📚 Dicionários prontos!");
    return { EN_PT, PT_EN };
  } catch (erro) {
    console.error("Erro ao carregar dicionários:", erro);
    return { EN_PT: {}, PT_EN: {} };
  }
}

async function carregarExemplos() {
  try {
    const res = await fetch("./public/data/examples.json");
    exemplos = await res.json();
    console.log(`📚 ${exemplos.length} exemplos carregados`);
  } catch (erro) {
    console.error("Erro ao carregar exemplos:", erro);
  }
}

// ========================================
// FUNÇÃO CORRETA DE LIMPEZA (FIX)
// ========================================
function limparTexto(texto) {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos corretamente
    .replace(/[?.!,:;]/g, '')
    .trim();
}

function limparTraducao(txt) {
  if (!txt) return "";
  return txt
    .replace(/<[^>]*>/g, "")
    .replace(/^.*?:\s*/, "")
    .replace(/\b(n|v|adj|adv|pron)\.\s*/gi, "")
    .split(/[;,]/)[0]
    .trim();
}

function procurarExemplo(palavra) {
  if (!exemplos || exemplos.length === 0) return null;
  return exemplos.find(ex => 
    ex.english?.toLowerCase().includes(palavra.toLowerCase()) ||
    ex.portuguese?.toLowerCase().includes(palavra.toLowerCase())
  );
}

// ========================================
// DETECTOR DE INTENÇÃO MELHORADO (FIX)
// ========================================
function ehPedidoTraducao(texto) {
  const textoLimpo = limparTexto(texto);
  
  return (
    textoLimpo.includes("como se diz") ||
    textoLimpo.includes("como se diz") ||
    textoLimpo.includes("em ingles") ||
    textoLimpo.includes("in english") ||
    textoLimpo.includes("traduz") ||
    textoLimpo.includes("translate") ||
    texto.includes("em inglês") ||
    texto.includes("o que significa") ||
    texto.includes("what means") ||
    texto.includes("how do you say")
  );
}

function extrairTermoParaTraducao(texto) {
  const textoOriginal = texto;
  texto = texto.toLowerCase();
  
  // Remove os padrões de pergunta
  const padroesRemover = [
    /como se diz\s+/i,
    /traduz(?:ir)?\s+/i,
    /o que significa\s+/i,
    /what(?:'s| is)\s+/i,
    /how do you say\s+/i,
    /em inglês\s*/i,
    /em ingles\s*/i,
    /in english\s*/i,
    /\?$/,
    /\.$/
  ];
  
  let termo = texto;
  for (const padrao of padroesRemover) {
    termo = termo.replace(padrao, '');
  }
  
  termo = termo.trim();
  
  // Se ainda tiver palavras como "em inglês" no final, remove
  termo = termo.replace(/\s+em inglês$/i, '');
  termo = termo.replace(/\s+em ingles$/i, '');
  termo = termo.replace(/\s+in english$/i, '');
  
  console.log("🔍 Termo extraído:", termo);
  return termo || textoOriginal;
}

function detectarIntento(texto) {
  const textoLimpo = limparTexto(texto);

  // Verifica frase especial primeiro
  if (FRASES_ESPECIAIS[textoLimpo]) {
    return "traducao_frase_especial";
  }

  // Tradução de palavra ou frase
  if (ehPedidoTraducao(texto)) {
    const termo = extrairTermoParaTraducao(texto);
    
    // Verifica se o termo é uma frase especial
    const termoLimpo = limparTexto(termo);
    if (FRASES_ESPECIAIS[termoLimpo]) {
      return "traducao_frase_especial";
    }
    
    // Verifica se é uma frase (tem espaços)
    if (termo && termo.includes(" ")) {
      return "traducao_frase";
    }
    
    return "traducao_palavra";
  }

  // Conteúdo educativo
  if (
    texto.includes("curiosidade") ||
    texto.includes("atividade") ||
    texto.includes("piada") ||
    texto.includes("conte algo") ||
    texto.includes("me ensine") ||
    texto.includes("explique")
  ) {
    return "conteudo";
  }

  // Conversa social
  if (
    texto.match(/\b(hi|hello|hey|olá|oi)\b/i) ||
    texto.includes("como você está") ||
    texto.includes("how are you") ||
    texto.includes("qual seu nome") ||
    texto.includes("what's your name")
  ) {
    return "social";
  }

  return "chat";
}

// ========================================
// TRADUÇÃO DE FRASES (FIX)
// ========================================
function traduzirFrase(frase) {
  const fraseLimpa = limparTexto(frase);
  
  // Verifica se é uma frase especial
  if (FRASES_ESPECIAIS[fraseLimpa]) {
    return FRASES_ESPECIAIS[fraseLimpa];
  }
  
  const palavras = fraseLimpa.split(" ");
  
  // Mapa de palavras comuns
  const mapaFixos = {
    "eu": "I", "voce": "you", "você": "you", 
    "ele": "he", "ela": "she", "nos": "we", "nós": "we",
    "eles": "they", "elas": "they",
    "me": "me", "te": "you", "se": "yourself",
    "um": "a", "uma": "a", "o": "the", "a": "the",
    "para": "to", "por": "for", "com": "with",
    "e": "and", "ou": "or", "mas": "but",
    "muito": "very", "pouco": "little",
    "bom": "good", "ruim": "bad",
    "grande": "big", "pequeno": "small"
  };
  
  const palavrasTraduzidas = palavras.map(palavra => {
    if (!palavra) return "";
    
    // Verifica no mapa fixo
    if (mapaFixos[palavra]) {
      return mapaFixos[palavra];
    }
    
    // Verifica no dicionário
    const traducao = ptEn[palavra];
    if (traducao) {
      const traducaoLimpa = limparTraducao(traducao);
      // Pega apenas a primeira palavra da tradução
      return traducaoLimpa.split(" ")[0];
    }
    
    return palavra;
  });
  
  // Capitaliza primeira letra
  let resultado = palavrasTraduzidas.join(" ");
  if (resultado) {
    resultado = resultado.charAt(0).toUpperCase() + resultado.slice(1);
  }
  
  return resultado;
}

// ========================================
// RESPONDEDORES ESPECIALIZADOS
// ========================================

function pegarAleatorio(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// RESPONDER PALAVRA
function responderPalavra(texto) {
  const termo = extrairTermoParaTraducao(texto) || texto;
  const traducao = procurarNoDicionario(termo);
  
  if (traducao) return traducao;
  
  // Fallback específico para palavra
  return pegarAleatorio([
    "🦉 I'm still learning! ✨\n\nCan you try spelling it differently?",
    "🌟 Let's learn together!\n\nTry: 'How do you say gato in English?'",
    "🍎 I don't know that word yet!\n\nCan you show me an example?"
  ]);
}

// RESPONDER FRASE (MELHORADO)
function responderFrase(texto) {
  const termo = extrairTermoParaTraducao(texto) || texto;
  const termoLimpo = limparTexto(termo);
  
  // Tenta frase especial primeiro
  if (FRASES_ESPECIAIS[termoLimpo]) {
    return `✨ ${FRASES_ESPECIAIS[termoLimpo]}`;
  }
  
  // Tenta tradução completa
  const traducaoCompleta = traduzirFrase(termo);
  
  // Verifica se a tradução é diferente do original
  if (traducaoCompleta && traducaoCompleta !== termo && !traducaoCompleta.includes("undefined")) {
    return `✨ ${traducaoCompleta}`;
  }
  
  // Fallback para frases complexas
  return pegarAleatorio([
    "🦁 Let me help you!\n\nTry separating: 'Como se diz [palavra] em inglês?'",
    "🌟 Great question!\n\nLet's learn word by word first.\n\nWhich word do you want to know?",
    "📚 Learning complete sentences takes practice!\n\nTry asking about one word at a time. 💪"
  ]);
}

// RESPONDER FRASE ESPECIAL
function responderFraseEspecial(texto) {
  const textoLimpo = limparTexto(texto);
  
  // Tenta encontrar a frase especial diretamente
  if (FRASES_ESPECIAIS[textoLimpo]) {
    return `✨ ${FRASES_ESPECIAIS[textoLimpo]}`;
  }
  
  // Extrai termo e tenta novamente
  const termo = extrairTermoParaTraducao(texto);
  const termoLimpo = limparTexto(termo);
  
  if (FRASES_ESPECIAIS[termoLimpo]) {
    return `✨ ${FRASES_ESPECIAIS[termoLimpo]}`;
  }
  
  // Tenta tradução palavra por palavra como fallback
  return responderFrase(texto);
}

// RESPONDER CONHECIMENTO
function responderConhecimento(texto) {
  const conhecimento = buscarConhecimento(texto);
  if (conhecimento) return conhecimento;
  
  const glossario = buscarGlossario(texto);
  if (glossario) return glossario;
  
  return pegarAleatorio([
    "🦉 Did you know?\n\n🐝 The Verb TO BE is: AM, IS, ARE!\n\nExample: I am happy! ✨",
    "🌟 Fun fact!\n\n💪 CAN means ability!\n\nExample: I can swim! 🏊‍♂️",
    "📚 Learning English is fun!\n\nTry using 'How do you say...' to learn new words!"
  ]);
}

// RESPONDER SOCIAL
function responderSocial(texto) {
  for (const intent of intencoes) {
    for (const regex of intent.padroes) {
      if (regex.test(texto)) {
        return intent.respostas[Math.floor(Math.random() * intent.respostas.length)];
      }
    }
  }
  
  return pegarAleatorio([
    "👋 Hello little star! ✨\n\nHow can I help you today?",
    "🌟 Hi friend!\n\nWould you like to learn a new word?",
    "🦉 Hello explorer!\n\nTry: 'Como se diz coruja em inglês?'"
  ]);
}

// FALLBACK PEDAGÓGICO
function fallbackPedagogico() {
  return pegarAleatorio([
    "🦉 I'm still learning! ✨\n\nHow do you say 'cat' in English?",
    "🌟 Let's learn together!\n\nCan you try another word?",
    "🍎 Try: 'How do you say apple in English?'",
    "💪 Keep practicing!\n\nAsk me: 'Como se diz [palavra] em inglês?'"
  ]);
}

// ========================================
// MOTOR PRINCIPAL (FASE 4)
// ========================================
function respostaControlada(pergunta) {
  const tipo = detectarIntento(pergunta);
  
  switch(tipo) {
    case "traducao_frase_especial":
      return responderFraseEspecial(pergunta);
      
    case "traducao_palavra":
      return responderPalavra(pergunta);
      
    case "traducao_frase":
      return responderFrase(pergunta);
      
    case "conteudo":
      return responderConhecimento(pergunta);
      
    case "social":
      return responderSocial(pergunta);
      
    default:
      return fallbackPedagogico();
  }
}

// ========================================
// FUNÇÃO ORIGINAL PROcurarNoDicionario (REFATORADA)
// ========================================
function procurarNoDicionario(texto) {
  const textoLimpo = limparTexto(texto);
  
  let palavra = textoLimpo
    .replace(/quinti/g, "")
    .replace(/como se diz/g, "")
    .replace(/o que significa/g, "")
    .replace(/what means/g, "")
    .replace(/what is/g, "")
    .replace(/how do you say/g, "")
    .replace(/traduz(?:ir)?/g, "")
    .replace(/em inglês/g, "")
    .replace(/em ingles/g, "")
    .replace(/in english/g, "")
    .replace(/\be\b/g, "")
    .trim();

  console.log("Palavra limpa:", palavra);

  // português -> inglês
  if (ptEn[palavra]) {
    const traducao = limparTraducao(ptEn[palavra]);
    const exemplo = procurarExemplo(traducao);

    if (exemplo) {
      return `✨ ${palavra} em inglês é ${traducao}\n\n📚 Example:\n${exemplo.english}\n\n🇧🇷 ${exemplo.portuguese}`;
    }
    return `✨ ${palavra} em inglês é ${traducao}`;
  }

  // inglês -> português
  if (enPt[palavra]) {
    const traducao = limparTraducao(enPt[palavra]);
    const exemplo = procurarExemplo(palavra);

    if (exemplo) {
      return `✨ ${palavra} significa ${traducao}\n\n📚 Example:\n${exemplo.english}\n\n🇧🇷 ${exemplo.portuguese}`;
    }
    return `✨ ${palavra} significa ${traducao}`;
  }

  // tenta com remoção de acentos (já foi feito pelo limparTexto)
  if (ptEn[palavra]) {
    const traducao = limparTraducao(ptEn[palavra]);
    return `✨ ${texto} em inglês é ${traducao}`;
  }

  if (enPt[palavra]) {
    const traducao = limparTraducao(enPt[palavra]);
    return `✨ ${texto} significa ${traducao}`;
  }

  return null;
}

// ========================================
// FUNÇÕES AUXILIARES
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
    else if (event.error === "no-speech") mensagem = "🎤 I couldn't hear you.\nNÃ£o consegui ouvir você ✨";
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
    const dicts = await carregarDicionarios();
    enPt = dicts.EN_PT;
    ptEn = dicts.PT_EN;
    await carregarExemplos();
    atualizarStatus("✅ Quinti is Ready!", 1);
    console.log("🦉 Quinti pronto!");
  } catch (e) {
    console.error(e);
  }

  adicionarMensagem(
    "🦉 Hello!\n\nI am Quinti ✨\n\nReady for English Lessons?",
    "bot"
  );
})();
