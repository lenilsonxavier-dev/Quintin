// ========================================
// IMPORTS (se estiver usando módulos, adapte para seu fluxo)
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
const chat = document.getElementById("chat");
const inputPergunta = document.getElementById("pergunta");
const btnEnviar = document.getElementById("btnEnviar");
const statusEl = document.getElementById("status");
const progressBar = document.getElementById("progress");
const btnMic = document.getElementById("btnMic");
const starsEl = document.getElementById("stars"); // ⭐ contador
const streakEl = document.getElementById("streak"); // 🔥 sequência
const learnedListEl = document.getElementById("learnedList"); // lista de palavras
const glossaryContainer = document.getElementById("glossary");
const quizContainer = document.getElementById("quizContainer");

// ========================================
// ESTADO GLOBAL
// ========================================
let modeloOk = true;
let ouvindo = false;
let stars = 0;
let streak = 0;
let learnedWords = [];
let quizWord = null;
let quizOptions = [];
let quizAnswered = false;

// ========================================
// MEMÓRIA (integração com o módulo fornecido)
// ========================================
memory.chatHistory = memory.chatHistory || [];
memory.learnedWords = memory.learnedWords || [];
learnedWords = [...memory.learnedWords];
stars = parseInt(localStorage.getItem("quinti_stars") || "0", 10);
streak = parseInt(localStorage.getItem("quinti_streak") || "0", 10);

// ========================================
// UI HELPERS
// ========================================
function atualizarStatus(texto, progresso = null) {
  statusEl.textContent = texto;
  if (progresso !== null) {
    progressBar.style.width = `${progresso * 100}%`;
  }
}

function adicionarMensagem(texto, autor) {
  const div = document.createElement("div");
  div.className = `msg ${autor}`;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  // Guarda no histórico
  memory.chatHistory.push({ role: autor, content: texto, timestamp: new Date().toISOString() });
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
  div.innerHTML = `<span style="font-size:32px;">🦉</span><span>Quinti is thinking...</span>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function removerPensando() {
  const el = document.getElementById("pensando");
  if (el) el.remove();
}

// Atualiza visores de progresso
function atualizarProgresso() {
  starsEl.textContent = stars;
  streakEl.textContent = streak;
  localStorage.setItem("quinti_stars", stars.toString());
  localStorage.setItem("quinti_streak", streak.toString());
  memory.learnedWords = [...learnedWords];
}

function exibirListaAprendidas() {
  learnedListEl.innerHTML = "";
  if (learnedWords.length === 0) {
    learnedListEl.innerHTML = "<li>Nenhuma palavra estudada ainda</li>";
    return;
  }
  learnedWords.forEach(word => {
    const li = document.createElement("li");
    li.textContent = `⭐ ${word}`;
    li.onclick = () => falar(word);
    learnedListEl.appendChild(li);
  });
}

// ========================================
// VOZ (TTS)
// ========================================
function falar(texto) {
  if (!window.speechSynthesis) return;
  const cleanText = texto.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.lang = "en-US";
  utter.rate = 0.82;
  speechSynthesis.speak(utter);
}

// ========================================
// DISTÂNCIA DE LEVENSHTEIN (para avaliar pronúncia)
// ========================================
function levenshtein(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  const matrix = Array.from({ length: an + 1 }, () => new Array(bn + 1));
  for (let i = 0; i <= an; i++) matrix[i][0] = i;
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[an][bn];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - levenshtein(a, b) / maxLen;
}

// ========================================
// RESPOSTAS FIXAS (mantidas)
// ========================================
const respostasFixas = {
  "hello": `👋 Hello, little star!\n\nWhat is YOUR name? ✨`,
  "hi": `🌟 Hi, friend!\n\nHow are you today? ✨`,
  "good night": `🌙 Good night!\n\nSleep well, little star ✨`,
  "boa noite": `🌙 Good night!\n\nDid you learn a new word today? ✨`,
  "bye": `👋 Bye bye!\n\nSee you soon ✨`,
  "tchau": `👋 Bye bye!\n\nKeep practicing English 🌟`,
  "qual é o seu nome": `🦉 My name is Quinti!\n\nWhat is YOUR name? ✨`,
  "what is your name": `🦉 My name is Quinti! ✨`,
  "arte": `🎨 Art means arte!\n\nDo you like drawing? ✨`,
  "matemática": `➕ Math means matemática! ✨`,
  "português": `📚 Portuguese means português! ✨`,
  "bisavô": `👴 Great-grandfather means bisavô ✨`,
  "bisavó": `👵 Great-grandmother means bisavó ✨`,
  "nós somos felizes": `😊 We are happy ✨`,
  "nos somos felizes": `😊 We are happy ✨`,
  "verbo to be": `✨ TO BE means ser ou estar ✨`,
};

// ========================================
// GLOSSÁRIO (usando dados carregados)
// ========================================
function buscarGlossario(pergunta) {
  if (!window.conhecimentoGlobal?.glossary) return null;
  const texto = pergunta.toLowerCase().trim();
  const palavras = texto.split(/\s+/);
  for (const categoria of Object.values(window.conhecimentoGlobal.glossary)) {
    if (!categoria.words) continue;
    for (const item of categoria.words) {
      if (item.pt && palavras.includes(item.pt.toLowerCase())) {
        if (!learnedWords.includes(item.en)) {
          learnedWords.push(item.en);
          atualizarProgresso();
          exibirListaAprendidas();
        }
        falar(item.en);
        return `${item.emoji || "✨"} **${item.en}** means **${item.pt}**!\n\n🌟 *"${item.example_en}"* (${item.example_pt})\n\n✨ Can you say "${item.en}" again? 🔊`;
      }
      if (item.en && palavras.includes(item.en.toLowerCase())) {
        if (!learnedWords.includes(item.en)) {
          learnedWords.push(item.en);
          atualizarProgresso();
          exibirListaAprendidas();
        }
        falar(item.en);
        return `${item.emoji || "✨"} **${item.en}** means **${item.pt}**!\n\n🌟 *"${item.example_en}"* (${item.example_pt})\n\n✨ Do you like this word? 🦉`;
      }
    }
  }
  return null;
}

// ========================================
// QUIZ (com múltiplas opções usando glossário)
// ========================================
function gerarQuiz() {
  if (!window.conhecimentoGlobal?.glossary) return;
  const categorias = Object.keys(window.conhecimentoGlobal.glossary);
  const catAleatoria = categorias[Math.floor(Math.random() * categorias.length)];
  const words = window.conhecimentoGlobal.glossary[catAleatoria].words;
  if (words.length < 2) return;
  quizWord = words[Math.floor(Math.random() * words.length)];
  // Cria 4 opções: 1 correta + 3 erradas
  const optionsSet = new Set();
  optionsSet.add(quizWord.en);
  let safety = 0;
  while (optionsSet.size < 4 && safety < 100) {
    const randCat = categorias[Math.floor(Math.random() * categorias.length)];
    const randWord = window.conhecimentoGlobal.glossary[randCat].words[Math.floor(Math.random() * window.conhecimentoGlobal.glossary[randCat].words.length)];
    if (randWord.en) optionsSet.add(randWord.en);
    safety++;
  }
  quizOptions = Array.from(optionsSet).sort(() => Math.random() - 0.5);
  quizAnswered = false;
  // Exibe o quiz na interface
  quizContainer.innerHTML = `
    <div class="quiz-card">
      <span class="quiz-emoji">${quizWord.emoji || "❓"}</span>
      <p>What is the English word for:</p>
      <h3>${quizWord.pt}</h3>
      <div class="quiz-options">
        ${quizOptions.map(opt => `<button class="quiz-opt" onclick="responderQuiz('${opt}')">${opt}</button>`).join("")}
      </div>
      <div id="quizFeedback"></div>
    </div>
  `;
}

window.responderQuiz = function(opcao) {
  if (quizAnswered || !quizWord) return;
  quizAnswered = true;
  const isCorrect = opcao.toLowerCase() === quizWord.en.toLowerCase();
  const feedbackEl = document.getElementById("quizFeedback");
  if (isCorrect) {
    streak++;
    const bonus = streak >= 3 ? 20 : 10;
    stars += bonus;
    feedbackEl.innerHTML = `🎉 Correct! +${bonus} stars!`;
    falar(`Great! ${quizWord.en}`);
  } else {
    streak = 0;
    feedbackEl.innerHTML = `💪 The correct answer is "${quizWord.en}". Keep trying!`;
    falar(`Let's try again. The word is ${quizWord.en}`);
  }
  atualizarProgresso();
  // Destaca visualmente
  document.querySelectorAll(".quiz-opt").forEach(btn => {
    btn.disabled = true;
    if (btn.textContent.toLowerCase() === quizWord.en.toLowerCase()) {
      btn.classList.add("correct");
    } else if (btn.textContent === opcao && !isCorrect) {
      btn.classList.add("wrong");
    }
  });
};

// ========================================
// PRÁTICA DE PRONÚNCIA (Mic + similaridade)
// ========================================
function iniciarPronuncia(palavraAlvo) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    adicionarMensagem("🎤 Voice recognition not supported.", "bot");
    return;
  }
  const rec = new SpeechRec();
  rec.lang = "en-US";
  rec.maxAlternatives = 1;
  rec.onstart = () => {
    btnMic.textContent = "🔴";
    adicionarMensagem(`🎤 Say "${palavraAlvo}" now...`, "bot");
  };
  rec.onend = () => {
    btnMic.textContent = "🎤";
  };
  rec.onresult = (event) => {
    const dito = event.results[0][0].transcript;
    const cleanDito = dito.toLowerCase().trim();
    const cleanAlvo = palavraAlvo.toLowerCase().trim();
    const sim = similarity(cleanDito, cleanAlvo);
    let resposta = "";
    if (cleanDito === cleanAlvo || sim >= 0.9) {
      stars += 15;
      streak++;
      resposta = `🏆 PERFECT! You said "${palavraAlvo}" correctly! +15 stars!`;
    } else if (sim >= 0.65) {
      stars += 5;
      resposta = `👍 Close! You said "${dito}". +5 stars for effort!`;
    } else {
      resposta = `🗣️ You said "${dito}". Let's try again: "${palavraAlvo}"`;
    }
    adicionarMensagem(resposta, "bot");
    atualizarProgresso();
    falar(palavraAlvo);
  };
  rec.onerror = (e) => {
    adicionarMensagem("🎤 Microphone error. Check permissions.", "bot");
  };
  rec.start();
}

// ========================================
// MOTOR PRINCIPAL DE RESPOSTAS
// ========================================
function respostaControlada(pergunta) {
  const texto = pergunta.toLowerCase().trim();
  for (const chave of Object.keys(respostasFixas)) {
    if (texto.includes(chave)) return respostasFixas[chave];
  }
  if (texto.includes("quiz") || texto.includes("jogo")) {
    gerarQuiz();
    return "🎮 Quiz generated! Answer below.";
  }
  const glossario = buscarGlossario(pergunta);
  if (glossario) return glossario;
  // Fallback
  return `🌟 I am still learning that word.\nCan you teach me more? ✨`;
}

// ========================================
// ENVIAR MENSAGEM DO CHAT
// ========================================
async function enviar() {
  const texto = inputPergunta.value.trim();
  if (!texto) return;
  adicionarMensagem(texto, "user");
  inputPergunta.value = "";
  inputPergunta.disabled = true;
  btnEnviar.disabled = true;
  mostrarPensando();
  try {
    await new Promise(resolve => setTimeout(resolve, 400));
    removerPensando();
    const resposta = respostaControlada(texto);
    adicionarMensagem(resposta, "bot");
    falar(resposta);
  } catch (err) {
    console.error(err);
    removerPensando();
    adicionarMensagem("🌙 Oops! Quinti got sleepy ✨", "bot");
  } finally {
    inputPergunta.disabled = false;
    btnEnviar.disabled = false;
    inputPergunta.focus();
  }
}

// ========================================
// GLOSSÁRIO INTERATIVO (popula categorias)
// ========================================
function popularGlossario() {
  if (!window.conhecimentoGlobal?.glossary) return;
  const categorias = Object.entries(window.conhecimentoGlobal.glossary);
  let html = '<div class="glossary-tabs">';
  categorias.forEach(([id, cat], idx) => {
    html += `<button class="tab-btn ${idx === 0 ? 'active' : ''}" onclick="selecionarCategoria('${id}')">${cat.title}</button>`;
  });
  html += '</div><div id="wordList" class="word-list"></div>';
  glossaryContainer.innerHTML = html;
  if (categorias.length > 0) {
    selecionarCategoria(categorias[0][0]);
  }
}

window.selecionarCategoria = function(catId) {
  const cat = window.conhecimentoGlobal.glossary[catId];
  if (!cat) return;
  const listEl = document.getElementById("wordList");
  if (!listEl) return;
  listEl.innerHTML = cat.words.map(item => `
    <div class="word-card" onclick="handleCardClick('${item.en}', '${item.pt}')">
      <span class="emoji">${item.emoji || "✨"}</span>
      <strong>${item.en}</strong>
      <small>${item.pt}</small>
      <div class="card-actions">
        <button class="speak-btn" onclick="event.stopPropagation(); falar('${item.en}')">🔊</button>
        <button class="practice-btn" onclick="event.stopPropagation(); iniciarPronuncia('${item.en}')">🎙️</button>
      </div>
    </div>
  `).join("");
  // Destaca botão ativo
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = [...document.querySelectorAll(".tab-btn")].find(btn => btn.textContent === cat.title);
  if (activeBtn) activeBtn.classList.add("active");
};

window.handleCardClick = function(en, pt) {
  adicionarMensagem(`📖 ${pt} → ${en}`, "user");
  const glossResp = buscarGlossario(pt);
  if (glossResp) {
    adicionarMensagem(glossResp, "bot");
  }
};

// ========================================
// MICROFONE PARA DITADO (chat por voz)
// ========================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  let recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    btnMic.textContent = "🔴";
    adicionarMensagem("🎤 Listening...", "bot");
  };
  recognition.onend = () => {
    btnMic.textContent = "🎤";
  };
  recognition.onresult = (event) => {
    const texto = event.results[0][0].transcript;
    inputPergunta.value = texto;
    enviar();
  };
  recognition.onerror = (event) => {
    let msg = "🎤 Microphone error!";
    if (event.error === "not-allowed") msg = "🎤 Please allow microphone access.";
    else if (event.error === "no-speech") msg = "🎤 I couldn't hear you.";
    else if (event.error === "network") msg = "🌐 Network error.";
    adicionarMensagem(msg, "bot");
  };
  window.voiceRecognition = recognition;
}

btnMic.addEventListener("click", () => {
  if (window.voiceRecognition) {
    window.voiceRecognition.start();
  } else {
    adicionarMensagem("🎤 Voice not supported!", "bot");
  }
});

// ========================================
// INICIALIZAÇÃO
// ========================================
(async () => {
  atualizarStatus("🌍 Loading Quinti Lite...", 0.3);
  adicionarMensagem("🌍 Loading Quinti Lite...", "bot");

  try {
    window.conhecimentoGlobal = await carregarConhecimento();
    atualizarStatus("📚 Knowledge loaded!", 1);
    adicionarMensagem("📚 Knowledge loaded!", "bot");
  } catch (e) {
    console.warn("Knowledge error", e);
    window.conhecimentoGlobal = { glossary: {} };
  }

  // Mensagem de boas-vindas
  adicionarMensagem(`🦉 Hello! I am Quinti Lite ✨\nLet's learn English together!`, "bot");

  // Popula glossário interativo
  popularGlossario();

  // Atualiza progresso visual
  atualizarProgresso();
  exibirListaAprendidas();

  inputPergunta.disabled = false;
  btnEnviar.disabled = false;
  inputPergunta.focus();

  console.log("QUINTI OK (Enhanced)");
})();
