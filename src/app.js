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
// DADOS DE CONHECIMENTO GLOBAL
// ========================================
let conhecimentoGlobal = null;

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
// FUNÇÃO CORRETA DE LIMPEZA
// ========================================
function limparTexto(texto) {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

// ========================================
// BUSCA EM BASES DE CONHECIMENTO
// ========================================

// Buscar em todas as bases de conhecimento carregadas
function buscarEmConhecimentoGlobal(pergunta) {
  if (!conhecimentoGlobal) return null;
  
  const texto = pergunta.toLowerCase().trim();
  
  // Percorre todas as categorias do conhecimento
  for (const [categoriaNome, categoria] of Object.entries(conhecimentoGlobal)) {
    if (!categoria || typeof categoria !== 'object') continue;
    
    // Se for um array
    if (Array.isArray(categoria)) {
      for (const item of categoria) {
        const resposta = buscarMatchEmItem(item, texto, categoriaNome);
        if (resposta) return resposta;
      }
    } 
    // Se for um objeto com propriedades específicas
    else if (categoria.items || categoria.phrases || categoria.words) {
      const colecao = categoria.items || categoria.phrases || categoria.words;
      if (Array.isArray(colecao)) {
        for (const item of colecao) {
          const resposta = buscarMatchEmItem(item, texto, categoriaNome);
          if (resposta) return resposta;
        }
      }
    }
  }
  
  return null;
}

function buscarMatchEmItem(item, texto, categoria) {
  // Verifica campos comuns em todos os JSONs
  const camposParaBuscar = [
    'pergunta', 'question', 'en', 'pt', 'english', 'portuguese',
    'phrase', 'response', 'answer', 'name', 'title', 'word'
  ];
  
  for (const campo of camposParaBuscar) {
    const valor = item[campo];
    if (valor && typeof valor === 'string') {
      const valorLower = valor.toLowerCase();
      if (texto.includes(valorLower) || valorLower.includes(texto)) {
        // Tenta encontrar uma resposta apropriada
        if (item.resposta) return item.resposta;
        if (item.answer) return item.answer;
        if (item.response) return item.response;
        if (item.example) return item.example;
        if (item.pt && item.en) return `✨ ${item.en} = ${item.pt}`;
        if (item.english && item.portuguese) return `✨ ${item.english} = ${item.portuguese}`;
        
        // Resposta genérica baseada na categoria
        return gerarRespostaGenerica(item, categoria);
      }
    }
  }
  
  return null;
}

function gerarRespostaGenerica(item, categoria) {
  const emoji = item.emoji || "📚";
  
  if (item.en && item.pt) {
    return `${emoji} ${item.en}\n\n🇧🇷 ${item.pt}\n\n${item.example_en ? `📖 Example: ${item.example_en}` : ''}`;
  }
  
  if (item.phrase && item.translation) {
    return `${emoji} ${item.phrase}\n\n🇧🇷 ${item.translation}`;
  }
  
  if (item.question && item.answer) {
    return `❓ ${item.question}\n\n✨ ${item.answer}`;
  }
  
  return null;
}

// ========================================
// SISTEMA DE DIÁLOGO CONVERSACIONAL COMPLETO
// ========================================

function responderConversacao(texto) {
  const textoLimpo = limparTexto(texto);
  
  // 1. WHAT'S YOUR NAME?
  if (texto.match(/\b(what('s| is) your name|qual seu nome|como se chama|seu nome)\b/i)) {
    return pegarAleatorio([
      "🦉 My name is Quinti! ✨\n\nI'm your English learning friend!",
      "🌟 I'm Quinti! I help kids learn English in a fun way!",
      "📚 My name is Quinti! Nice to meet you! What's your name?"
    ]);
  }
  
  // 2. WHERE ARE YOU FROM?
  if (texto.match(/\b(where are you from|de onde voce e|de onde você é|origem)\b/i)) {
    return pegarAleatorio([
      "🌍 I'm from the magical world of English learning! ✨",
      "🏰 I come from Quinti's Island, a special place where words come alive!",
      "📚 I was created to help children learn English anywhere in the world!"
    ]);
  }
  
  // 3. HOW OLD ARE YOU?
  if (texto.match(/\b(how old are you|qual sua idade|quantos anos voce tem|sua idade)\b/i)) {
    return pegarAleatorio([
      "🎂 I'm timeless! But if I had an age, I'd be 7 years old - just like a curious kid! ✨",
      "📚 I'm forever young in the world of learning! Age is just a number!",
      "🌟 I was born when you started learning English! So I'm as old as your journey!"
    ]);
  }
  
  // 4. HOW ARE YOU?
  if (texto.match(/\b(how are you|como voce esta|como você está|como vai|tudo bem)\b/i)) {
    return pegarAleatorio([
      "😊 I'm fantastic! Ready to learn English with you! How are you today?",
      "🌟 I'm super happy! Teaching English makes me joyful! ✨",
      "🦉 I'm doing great! Thanks for asking! Want to learn a new word?"
    ]);
  }
  
  // 5. WHO ARE YOU?
  if (texto.match(/\b(who are you|quem e voce|quem é você|o que voce e)\b/i)) {
    return pegarAleatorio([
      "🦉 I'm Quinti, your friendly English tutor! I make learning fun! ✨",
      "📚 I'm a magical owl who loves teaching English to children!",
      "🌟 I'm your English learning companion! Ask me anything!"
    ]);
  }
  
  // 6. WHO IS SHE? / WHO IS HE?
  if (texto.match(/\bwho is she\b/i)) {
    return pegarAleatorio([
      "👧 'She' is used for girls and women.\n\nExample: She is my sister. 👧\nShe is a teacher. 👩‍🏫",
      "✨ SHE = feminine pronoun\n\n📖 Examples:\n- She is happy\n- She likes pizza\n- She can dance"
    ]);
  }
  
  if (texto.match(/\bwho is he\b/i)) {
    return pegarAleatorio([
      "👦 'He' is used for boys and men.\n\nExample: He is my brother. 👦\nHe is a doctor. 👨‍⚕️",
      "✨ HE = masculine pronoun\n\n📖 Examples:\n- He is strong\n- He plays soccer\n- He can run fast"
    ]);
  }
  
  // 7. WHAT IS IT?
  if (texto.match(/\bwhat is it\b/i)) {
    return pegarAleatorio([
      "📦 'It' is used for objects, animals, and things!\n\nExample: It is a book. 📚\nIt is a cat. 🐱",
      "✨ IT = neutral pronoun\n\nUse IT for:\n- Objects (It's a table)\n- Animals (It's a dog)\n- Ideas (It's fun)"
    ]);
  }
  
  // 8. WHAT ARE THESE / THOSE?
  if (texto.match(/\bwhat are these\b/i)) {
    return "📚 'These' is for things NEAR us (plural)!\n\nExample: These are pencils ✏️\nThese are my friends 👫";
  }
  
  if (texto.match(/\bwhat are those\b/i)) {
    return "🌟 'Those' is for things FAR from us (plural)!\n\nExample: Those are stars ⭐\nThose are mountains 🏔️";
  }
  
  // 9. HOW MUCH IS THIS? / HOW MUCH DOES IT COST?
  if (texto.match(/\bhow much (is this|does it cost|is it)\b/i)) {
    return pegarAleatorio([
      "💰 Asking about price?\n\n'How much is it?' = 'Quanto custa?'\n\nExample: How much is this book? 📚",
      "💵 Use 'How much' for prices!\n\nExample:\n- How much is the toy? 🧸\n- It's 10 dollars."
    ]);
  }
  
  // 10. WHOSE IS THIS? / WHOSE...
  if (texto.match(/\bwhose\b/i)) {
    return pegarAleatorio([
      "🔑 'Whose' shows possession!\n\nExample:\n- Whose book is this? 📚\n- It's Maria's book!\n\n👤 Use 's for people!",
      "✨ WHOSE = de quem\n\nExamples:\n- Whose pen is this? ✒️\n- Whose bag is that? 🎒\n- Whose turn is it? 🎮"
    ]);
  }
  
  // 11. WHERE IS...?
  if (texto.match(/\bwhere is\b|\bwhere are\b/i)) {
    return pegarAleatorio([
      "📍 Asking for location!\n\n'Where is' = singular\n'Where are' = plural\n\nExample: Where is the bathroom? 🚻",
      "🗺️ Use 'where' for places!\n\nExamples:\n- Where is my pencil? ✏️\n- Where are my friends? 👫"
    ]);
  }
  
  // 12. WHY...?
  if (texto.match(/\bwhy\b/i)) {
    return pegarAleatorio([
      "❓ 'Why' asks for reasons!\n\nAnswer with 'because'!\n\nExample:\nQ: Why are you happy?\nA: Because I'm learning English! ✨",
      "🤔 WHY = por que\n\nStructure:\nWhy + auxiliary + subject + verb?\n\nExample: Why do you like English?"
    ]);
  }
  
  // 13. WHEN...?
  if (texto.match(/\bwhen\b/i)) {
    return pegarAleatorio([
      "📅 'When' asks about time!\n\nExamples:\n- When is your birthday? 🎂\n- When do you study? 📚",
      "⏰ WHEN = quando\n\nAnswer with time expressions:\n- At 8 AM\n- On Monday\n- In the morning"
    ]);
  }
  
  // 14. WHICH...?
  if (texto.match(/\bwhich\b/i)) {
    return pegarAleatorio([
      "🤔 'Which' asks for choices!\n\nExample:\n- Which color do you like? 🎨\n- Which book is yours? 📚",
      "✅ Use 'which' with options!\n\nExample: Which one is better? 👈 vs 👉"
    ]);
  }
  
  return null;
}

// ========================================
// DETECTOR DE INTENÇÃO MELHORADO
// ========================================
function ehPedidoTraducao(texto) {
  const textoLimpo = limparTexto(texto);
  
  return (
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
  termo = termo.replace(/\s+em inglês$/i, '');
  termo = termo.replace(/\s+em ingles$/i, '');
  termo = termo.replace(/\s+in english$/i, '');
  
  console.log("🔍 Termo extraído:", termo);
  return termo || textoOriginal;
}

function detectarIntento(texto) {
  const textoLimpo = limparTexto(texto);
  const textoOriginal = texto;

  // PRIORIDADE 1: Conversação (deve vir antes das traduções)
  if (responderConversacao(textoOriginal)) {
    return "conversacao";
  }

  // PRIORIDADE 2: Conhecimento Global (origem do inglês, verbos, etc)
  const conhecimento = buscarEmConhecimentoGlobal(textoOriginal);
  if (conhecimento) {
    return "conhecimento_global";
  }

  // PRIORIDADE 3: Frases especiais
  if (FRASES_ESPECIAIS[textoLimpo]) {
    return "traducao_frase_especial";
  }

  // PRIORIDADE 4: Traduções
  if (ehPedidoTraducao(textoOriginal)) {
    const termo = extrairTermoParaTraducao(textoOriginal);
    const termoLimpo = limparTexto(termo);
    
    if (FRASES_ESPECIAIS[termoLimpo]) {
      return "traducao_frase_especial";
    }
    
    if (termo && termo.includes(" ")) {
      return "traducao_frase";
    }
    
    return "traducao_palavra";
  }

  // PRIORIDADE 5: Conteúdo educativo
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

  return "chat";
}

// ========================================
// TRADUÇÃO DE FRASES
// ========================================
function traduzirFrase(frase) {
  const fraseLimpa = limparTexto(frase);
  
  if (FRASES_ESPECIAIS[fraseLimpa]) {
    return FRASES_ESPECIAIS[fraseLimpa];
  }
  
  const palavras = fraseLimpa.split(" ");
  
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
    
    if (mapaFixos[palavra]) {
      return mapaFixos[palavra];
    }
    
    const traducao = ptEn[palavra];
    if (traducao) {
      const traducaoLimpa = limparTraducao(traducao);
      return traducaoLimpa.split(" ")[0];
    }
    
    return palavra;
  });
  
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

function responderConversacaoWrapper(texto) {
  const resposta = responderConversacao(texto);
  if (resposta) return resposta;
  return null;
}

function responderConhecimentoGlobalWrapper(texto) {
  const resposta = buscarEmConhecimentoGlobal(texto);
  if (resposta) return resposta;
  return null;
}

function responderPalavra(texto) {
  const termo = extrairTermoParaTraducao(texto) || texto;
  const traducao = procurarNoDicionario(termo);
  
  if (traducao) return traducao;
  
  return pegarAleatorio([
    "🦉 I'm still learning! ✨\n\nCan you try spelling it differently?",
    "🌟 Let's learn together!\n\nTry: 'How do you say gato in English?'",
    "🍎 I don't know that word yet!\n\nCan you show me an example?"
  ]);
}

function responderFrase(texto) {
  const termo = extrairTermoParaTraducao(texto) || texto;
  const termoLimpo = limparTexto(termo);
  
  if (FRASES_ESPECIAIS[termoLimpo]) {
    return `✨ ${FRASES_ESPECIAIS[termoLimpo]}`;
  }
  
  const traducaoCompleta = traduzirFrase(termo);
  
  if (traducaoCompleta && traducaoCompleta !== termo && !traducaoCompleta.includes("undefined")) {
    return `✨ ${traducaoCompleta}`;
  }
  
  return pegarAleatorio([
    "🦁 Let me help you!\n\nTry separating: 'Como se diz [palavra] em inglês?'",
    "🌟 Great question!\n\nLet's learn word by word first.\n\nWhich word do you want to know?",
    "📚 Learning complete sentences takes practice!\n\nTry asking about one word at a time. 💪"
  ]);
}

function responderFraseEspecial(texto) {
  const textoLimpo = limparTexto(texto);
  
  if (FRASES_ESPECIAIS[textoLimpo]) {
    return `✨ ${FRASES_ESPECIAIS[textoLimpo]}`;
  }
  
  const termo = extrairTermoParaTraducao(texto);
  const termoLimpo = limparTexto(termo);
  
  if (FRASES_ESPECIAIS[termoLimpo]) {
    return `✨ ${FRASES_ESPECIAIS[termoLimpo]}`;
  }
  
  return responderFrase(texto);
}

function responderConteudo(texto) {
  return pegarAleatorio([
    "🦉 Did you know?\n\n🐝 The Verb TO BE is: AM, IS, ARE!\n\nExample: I am happy! ✨",
    "🌟 Fun fact!\n\n💪 CAN means ability!\n\nExample: I can swim! 🏊‍♂️",
    "📚 Learning English is fun!\n\nTry using 'How do you say...' to learn new words!",
    "🌍 The English language has over 1 million words! That's a lot to learn! ✨",
    "📖 'Hello' comes from the word 'holla' which means 'stop' in old German! 🤯"
  ]);
}

function fallbackPedagogico() {
  return pegarAleatorio([
    "🦉 I'm still learning! ✨\n\nHow do you say 'cat' in English?",
    "🌟 Let's learn together!\n\nCan you try another word?",
    "🍎 Try: 'How do you say apple in English?'",
    "💪 Keep practicing!\n\nAsk me: 'Como se diz [palavra] em inglês?'"
  ]);
}

// ========================================
// MOTOR PRINCIPAL
// ========================================
function respostaControlada(pergunta) {
  const tipo = detectarIntento(pergunta);
  
  switch(tipo) {
    case "conversacao":
      return responderConversacaoWrapper(pergunta);
      
    case "conhecimento_global":
      return responderConhecimentoGlobalWrapper(pergunta);
      
    case "traducao_frase_especial":
      return responderFraseEspecial(pergunta);
      
    case "traducao_palavra":
      return responderPalavra(pergunta);
      
    case "traducao_frase":
      return responderFrase(pergunta);
      
    case "conteudo":
      return responderConteudo(pergunta);
      
    default:
      return fallbackPedagogico();
  }
}

// ========================================
// FUNÇÃO ORIGINAL PROcurarNoDicionario
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

  if (ptEn[palavra]) {
    const traducao = limparTraducao(ptEn[palavra]);
    const exemplo = procurarExemplo(traducao);

    if (exemplo) {
      return `✨ ${palavra} em inglês é ${traducao}\n\n📚 Example:\n${exemplo.english}\n\n🇧🇷 ${exemplo.portuguese}`;
    }
    return `✨ ${palavra} em inglês é ${traducao}`;
  }

  if (enPt[palavra]) {
    const traducao = limparTraducao(enPt[palavra]);
    const exemplo = procurarExemplo(palavra);

    if (exemplo) {
      return `✨ ${palavra} significa ${traducao}\n\n📚 Example:\n${exemplo.english}\n\n🇧🇷 ${exemplo.portuguese}`;
    }
    return `✨ ${palavra} significa ${traducao}`;
  }

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

function procurarExemplo(palavra) {
  if (!exemplos || exemplos.length === 0) return null;
  return exemplos.find(ex => 
    ex.english?.toLowerCase().includes(palavra.toLowerCase()) ||
    ex.portuguese?.toLowerCase().includes(palavra.toLowerCase())
  );
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
    conhecimentoGlobal = await carregarConhecimento();
    console.log("📚 Conhecimento Global carregado:", Object.keys(conhecimentoGlobal || {}));
    
    const dicts = await carregarDicionarios();
    enPt = dicts.EN_PT;
    ptEn = dicts.PT_EN;
    await carregarExemplos();
    
    atualizarStatus("✅ Quinti is Ready!", 1);
    console.log("🦉 Quinti pronto!");
    console.log("🗣️ Sistema conversacional ativo!");
  } catch (e) {
    console.error("Erro na inicialização:", e);
  }

  adicionarMensagem(
    "🦉 Hello! I'm Quinti! ✨\n\nI can:\n• Teach you English words\n• Answer your questions\n• Have conversations with you!\n\nWhat would you like to learn today?",
    "bot"
  );
})();
