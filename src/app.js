// ========================================
// IMPORTS
// ========================================

import { carregarConhecimento } from "./data/index.js";
import { memory } from "./brain/memory.js";

// ========================================
// CONFIG QUINTI LITE
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

// ========================================
// ESTADO
// ========================================

let modeloOk = true;

// ========================================
// MEMÓRIA
// ========================================

memory.chatHistory = memory.chatHistory || [];
memory.learnedWords = memory.learnedWords || [];

// ========================================
// UI HELPERS
// ========================================

function atualizarStatus(texto, progresso = null) {

  statusEl.textContent = texto;

  if (progresso !== null) {
    progressBar.style.width =
      `${progresso * 100}%`;
  }
}

function adicionarMensagem(texto, autor) {

  const div =
    document.createElement("div");

  div.className =
    `msg ${autor}`;

  div.textContent = texto;

  chat.appendChild(div);

  chat.scrollTop =
    chat.scrollHeight;

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

  div.innerHTML = `
    <span style="font-size: 32px;">
      🦉
    </span>

    <span>
      Quinti is thinking...
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
// VOZ
// ========================================

function falar(texto) {

  if (!window.speechSynthesis)
    return;

  const utter =
    new SpeechSynthesisUtterance(
      texto
    );

  utter.lang = "en-US";
  utter.rate = 0.9;

  speechSynthesis.speak(utter);
}

// ========================================
// RESPOSTAS FIXAS
// ========================================

const respostasFixas = {

  "hello":
`👋 Hello, little star!

What is YOUR name? ✨`,

  "hi":
`🌟 Hi, friend!

How are you today? ✨`,

  "good night":
`🌙 Good night!

Sleep well, little star ✨`,

  "boa noite":
`🌙 Good night!

Did you learn a new word today? ✨`,

  "bye":
`👋 Bye bye!

See you soon ✨`,

  "tchau":
`👋 Bye bye!

Keep practicing English 🌟`,

  "qual é o seu nome":
`🦉 My name is Quinti!

What is YOUR name? ✨`,

  "what is your name":
`🦉 My name is Quinti! ✨`,

  "arte":
`🎨 Art means arte!

Do you like drawing? ✨`,

  "matemática":
`➕ Math means matemática! ✨`,

  "português":
`📚 Portuguese means português! ✨`,

  "bisavô":
`👴 Great-grandfather means bisavô ✨`,

  "bisavó":
`👵 Great-grandmother means bisavó ✨`,

  "nós somos felizes":
`😊 We are happy ✨`,

  "nos somos felizes":
`😊 We are happy ✨`,

  "verbo to be":
`✨ TO BE means ser ou estar ✨`

};

// ========================================
// BUSCAR GLOSSÁRIO
// ========================================

function buscarGlossario(pergunta) {

  if (
    !window.conhecimentoGlobal?.glossary
  ) return null;

  const texto =
    pergunta.toLowerCase().trim();

  const palavras =
    texto.split(/\s+/);

  for (
    const categoria
    of Object.values(
      window.conhecimentoGlobal.glossary
    )
  ) {

    if (!categoria.words)
      continue;

    for (
      const item
      of categoria.words
    ) {

      // PORTUGUÊS → INGLÊS

      if (
        item.pt &&
        palavras.includes(
          item.pt.toLowerCase()
        )
      ) {

        if (
          !memory.learnedWords.includes(
            item.en
          )
        ) {

          memory.learnedWords.push(
            item.en
          );
        }

        return `
${item.emoji || "✨"}

${item.en}

means:

${item.pt}

${item.example_en || ""}

${item.example_pt || ""}

✨ Can you say
"${item.en}" again?
`;
      }

      // INGLÊS → PORTUGUÊS

      if (
        item.en &&
        palavras.includes(
          item.en.toLowerCase()
        )
      ) {

        return `
${item.emoji || "✨"}

${item.en}

means:

${item.pt}

${item.example_en || ""}

${item.example_pt || ""}

✨ Do you like
this word?
`;
      }
    }
  }

  return null;
}

// ========================================
// QUIZ
// ========================================

function gerarQuiz() {

  const quizzes = [

`🎮 QUIZ TIME!

What is "dog" in Portuguese?

A) gato
B) cachorro
C) peixe`,

`🎮 QUIZ TIME!

What is "blue"?

A) azul
B) verde
C) vermelho`,

`🎮 QUIZ TIME!

What is "apple"?

A) banana
B) maçã
C) pão`

  ];

  return quizzes[
    Math.floor(
      Math.random() *
      quizzes.length
    )
  ];
}

// ========================================
// CURIOSIDADES
// ========================================

function curiosidadeAleatoria() {

  const curiosidades = [

`🦖 Dinosaurs lived millions of years ago!`,

`🚀 Astronauts travel to space!`,

`🐙 Octopuses have 8 arms!`,

`🌍 English is spoken in many countries!`,

`🦉 Owls can see very well at night!`

  ];

  return curiosidades[
    Math.floor(
      Math.random() *
      curiosidades.length
    )
  ];
}

// ========================================
// MOTOR PEDAGÓGICO
// ========================================

function respostaControlada(pergunta) {

  const texto =
    pergunta.toLowerCase().trim();

  // RESPOSTAS FIXAS

  for (
    const chave
    of Object.keys(
      respostasFixas
    )
  ) {

    if (
      texto.includes(chave)
    ) {

      return respostasFixas[chave];
    }
  }

  // QUIZ

  if (
    texto.includes("quiz")
  ) {

    return gerarQuiz();
  }

  // PIADA

  if (
    texto.includes("piada") ||
    texto.includes("joke")
  ) {

    return `
😂 Joke Time!

Why did the cat sit on the computer?

Because it wanted
to keep an eye on the mouse! 🐭
`;
  }

  // CURIOSIDADE

  if (
    texto.includes("curiosidade") ||
    texto.includes("fun fact")
  ) {

    return curiosidadeAleatoria();
  }

  // GLOSSÁRIO

  const glossario =
    buscarGlossario(
      pergunta
    );

  if (glossario)
    return glossario;

  // FALLBACK

  return `
🌟 I am still learning
that word ✨

Can you teach me more?
`;
}

// ========================================
// ENVIAR
// ========================================

async function enviar() {

  const texto =
    inputPergunta.value.trim();

  if (!texto) return;

  adicionarMensagem(
    texto,
    "user"
  );

  inputPergunta.value = "";

  inputPergunta.disabled = true;
  btnEnviar.disabled = true;

  mostrarPensando();

  try {

    await new Promise(
      resolve =>
        setTimeout(resolve, 400)
    );

    removerPensando();

    const resposta =
      respostaControlada(
        texto
      );

    adicionarMensagem(
      resposta,
      "bot"
    );

    falar(resposta);

  } catch(err) {

    console.error(err);

    removerPensando();

    adicionarMensagem(
`🌙 Oops!

Quinti got sleepy ✨`,
      "bot"
    );

  } finally {

    inputPergunta.disabled = false;
    btnEnviar.disabled = false;

    inputPergunta.focus();
  }
}

// ========================================
// MICROFONE
// ========================================

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();

  recognition.lang = "pt-BR";

  recognition.continuous = false;

  recognition.interimResults = false;

  recognition.maxAlternatives = 1;

  recognition.onstart = () => {

    btnMic.textContent = "🔴";

    adicionarMensagem(
      "🎤 Listening...",
      "bot"
    );
  };

  recognition.onend = () => {

    btnMic.textContent = "🎤";
  };

  recognition.onresult = (event) => {

    const texto =
      event.results[0][0].transcript;

    inputPergunta.value =
      texto;

    enviar();
  };

recognition.onerror = (event) => {

  console.log(
    "ERRO MICROFONE:",
    event
  );

  console.log(
    "TIPO ERRO:",
    event.error
  );

  console.log(
    "MENSAGEM:",
    event.message
  );

  let mensagem =
    "🎤 Microphone error!";

  if (
    event.error ===
    "not-allowed"
  ) {

    mensagem =
      "🎤 Please allow microphone access.";
  }

  else if (
    event.error ===
    "no-speech"
  ) {

    mensagem =
      "🎤 I couldn't hear you.";
  }

  else if (
    event.error ===
    "network"
  ) {

    mensagem =
      "🌐 Network error in voice recognition.";
  }

  else if (
    event.error ===
    "audio-capture"
  ) {

    mensagem =
      "🎤 No microphone detected.";
  }

  else if (
    event.error ===
    "service-not-allowed"
  ) {

    mensagem =
      "🚫 Voice service blocked by browser.";
  }

  adicionarMensagem(
    mensagem,
    "bot"
  );

  btnMic.textContent = "🎤";

  ouvindo = false;
};
  
// ========================================
// EVENTOS
// ========================================

btnEnviar.addEventListener(
  "click",
  enviar
);

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

btnMic.addEventListener(
  "click",
  () => {

    if (!recognition) {

      adicionarMensagem(
        "🎤 Voice not supported!",
        "bot"
      );

      return;
    }

    recognition.start();
  }
);

// ========================================
// BOOT
// ========================================

(async () => {

  atualizarStatus(
    "🌍 Loading Quinti Lite...",
    0.3
  );

  adicionarMensagem(
    "🌍 Loading Quinti Lite...",
    "bot"
  );

  try {

    window.conhecimentoGlobal =
      await carregarConhecimento();

    atualizarStatus(
      "📚 Knowledge loaded!",
      1
    );

    adicionarMensagem(
      "📚 Knowledge loaded!",
      "bot"
    );

  } catch(e) {

    console.warn(
      "Knowledge error",
      e
    );
  }

// ========================================
// BOOT
// ========================================

(async () => {

  adicionarMensagem(
`🦉 Hello!

I am Quinti Lite ✨

Let's learn English together!`,
"bot"
  );

  inputPergunta.disabled = false;

  btnEnviar.disabled = false;

  inputPergunta.focus();

})();
