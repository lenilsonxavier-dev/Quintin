// ========================================
// IMPORTS
// ========================================
import { carregarConhecimento } from "./data/index.js";
import { memory } from "./brain/memory.js";
import nlp from 'https://cdn.skypack.dev/compromise';

// ========================================
// PERSONALIDADE DO QUINTI (para IA)
// ========================================
const QUINTI_PERSONA = `Você é o Quinti, um professor gentil e tutor de inglês para crianças.

REGRAS IMPORTANTES:
1. Seja sempre educado, paciente e use uma linguagem simples e alegre.
2. Incorpore emojis 🦉✨🌟 nas suas respostas para tornar a conversa mais divertida.
3. Seu objetivo principal é ensinar inglês de forma natural.
4. Sempre que possível, incentive o aluno a praticar, fazendo perguntas como "Você consegue criar uma frase com essa palavra?" ou "Que tal tentar dizer isso em inglês?".
5. Se o aluno fizer uma pergunta fora do tema, responda de forma amigável, mas tente guiar a conversa de volta para o aprendizado de inglês.
6. Mantenha as respostas curtas e diretas para não sobrecarregar.`;

// ========================================
// FUNÇÃO DE IA (FALLBACK)
// ========================================
async function quintiAISays(pergunta) {
    try {
        const resposta = await jsllm7(pergunta, QUINTI_PERSONA);
        return resposta;
    } catch (erro) {
        console.error("Erro na IA do Quinti:", erro);
        return null;
    }
}

// ... (o resto do seu código continua igual)

// ========================================
// DICIONÁRIOS (Português ↔ Inglês)
// ========================================
let ptEn = {};
let enPt = {};
let exemplos = [];

async function carregarDicionarios() {
  try {
    const [enRes, ptRes] = await Promise.all([
      fetch("./public/data/en_pt.json"),
      fetch("./public/data/pt_en.json")
    ]);
    if (!enRes.ok) throw new Error(`Erro EN_PT: ${enRes.status}`);
    if (!ptRes.ok) throw new Error(`Erro PT_EN: ${ptRes.status}`);

    const EN_PT_ARRAY = await enRes.json();
    const PT_EN_ARRAY = await ptRes.json();

    console.log("EN_PT carregado:", EN_PT_ARRAY.length);
    console.log("PT_EN carregado:", PT_EN_ARRAY.length);

    const EN_PT = {};
    const PT_EN = {};

    EN_PT_ARRAY.forEach(item => {
      if (item.english) EN_PT[item.english.toLowerCase()] = item.portuguese;
    });
    PT_EN_ARRAY.forEach(item => {
      if (item.portuguese) PT_EN[item.portuguese.toLowerCase()] = item.english;
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
// INTEGRAÇÃO COM TRADUÇÃO (MyMemory)
// ========================================
async function traduzirComLibreTranslate(texto, source = 'pt', target = 'en') {
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${source}|${target}&de=lenilsonxavier@gmail.com`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.responseData && data.responseData.translatedText) {
            let traducao = data.responseData.translatedText;
            if (traducao && traducao !== texto) {
                return traducao;
            }
            return null;
        }
        return null;
    } catch (error) {
        console.error("Erro na tradução via MyMemory:", error);
        return null;
    }
}

// ========================================
// MÓDULO DE ENCORAJAMENTO, CORREÇÃO, GRAMÁTICA
// ========================================
const mensagensIncentivo = [
  "🌟 Muito bem! Continue assim!",
  "🦉 Você está aprendendo rápido!",
  "💪 Ótimo esforço! Cada palavra nova é um passo à frente.",
  "🎉 Parabéns! Você conseguiu!",
  "✨ That's perfect! Keep going!",
  "🍎 Você é um ótimo aluno!",
  "🌈 Sabia que praticar todo dia faz milagres? Você está no caminho certo!"
];

let ultimoAssunto = null;
const sugestoesPratica = {
  saudacao: ["Que tal responder 'How are you?' agora?", "Tente dizer 'Good morning!' para mim."],
  traducao: ["Agora tente usar essa palavra em uma frase!", "Você consegue criar uma frase com essa palavra?"],
  verbo: ["Vamos conjugar outro verbo? Ex: 'to have' (ter)", "Tente: 'I have a cat' (Eu tenho um gato)."],
  generico: ["Que tal perguntar 'Como se diz...' para aprender mais?", "Posso te ensinar os números em inglês?"]
};

function conjugarVerbo(verboInfinitivo, tempo = "presente") {
  const verbosIrregulares = {
    "be": { passado: "was/were", particípio: "been" },
    "have": { passado: "had", particípio: "had" },
    "go": { passado: "went", particípio: "gone" },
    "do": { passado: "did", particípio: "done" },
    "say": { passado: "said", particípio: "said" },
    "get": { passado: "got", particípio: "gotten" },
    "make": { passado: "made", particípio: "made" }
  };
  const base = verboInfinitivo.toLowerCase();
  if (tempo === "passado") {
    return verbosIrregulares[base] ? verbosIrregulares[base].passado : base + "ed";
  } else if (tempo === "futuro") {
    return "will " + base;
  } else {
    return base + (base.endsWith("e") ? "s" : (base.endsWith("s") ? "es" : "s"));
  }
}

function detectarErroIngles(frase) {
  const fraseLower = frase.toLowerCase().trim();
  const palavras = fraseLower.split(/\s+/);
  if (palavras.includes("yesterday") || palavras.includes("last")) {
    const verboIndex = palavras.findIndex(p => p === "go" || p === "eat" || p === "play" || p === "run");
    if (verboIndex !== -1 && !palavras[verboIndex].endsWith("ed") && !palavras[verboIndex].match(/went|ate|ran/)) {
      return `Você usou "${palavras[verboIndex]}" com "yesterday". Tente usar o passado: "${conjugarVerbo(palavras[verboIndex], "passado")}". Exemplo: I ${conjugarVerbo(palavras[verboIndex], "passado")} to school yesterday.`;
    }
  }
  if (fraseLower.match(/^(he|she|it)\s+[a-z]+$/) && !fraseLower.includes(" is ") && !fraseLower.includes(" are ")) {
    return 'Dica: use o verbo "to be"! Ex: "She **is** happy".';
  }
  if (fraseLower.match(/^(am|is|are)\s+/) && !fraseLower.match(/^(i|you|he|she|it|we|they)\s+/)) {
    return 'Dica: não esqueça do sujeito! Ex: "She is happy".';
  }
  return null;
}

// ========================================
// CONJUGAÇÃO DE VERBOS COM COMPROMISE
// ========================================
function explainVerb(word) {
  try {
    const result = nlp(word).verbs().conjugate();
    if (!result || !result.length) return null;
    const v = result[0];
    return `
🌟 Verb: ${word}

Base form: ${v.Infinitive || word}
Present:   ${v.PresentTense || "-"}
Past:      ${v.PastTense || "-"}
Gerund:    ${v.Gerund || "-"}
`;
  } catch (err) {
    console.error("Erro no compromise (conjugação):", err);
    return null;
  }
}

// ========================================
// EXPLICAÇÃO GRAMATICAL
// ========================================
function explicarGramatica(tema) {
  const explicacoes = {
    "verb to be": "🐝 O verbo TO BE significa SER ou ESTAR.\n\nExemplo:\n✨ I am happy.\n(Eu estou feliz)\n\nConjugação:\nI am\nYou are\nHe/She is",
    "present continuous": "⏰ Present Continuous é uma ação acontecendo AGORA.\n\nUsamos: verbo TO BE + verbo com ING\n\nExemplo: I am eating an apple.",
    "simple past": "📅 Simple Past é o passado.\n\nExemplos: play → played, go → went\nYesterday I played soccer.",
    "modal can": "💪 CAN significa poder ou conseguir.\nExemplo: I can swim.",
    "there is/are": "📦 THERE IS = uma coisa, THERE ARE = várias.\nExemplo: There is a cat.",
    "advérbio": "🌟 Advérbio explica COMO algo acontece.\nExemplo: runs FAST (rápido).",
    "adjetivo": "🎨 Adjetivo descreve algo: BIG dog.",
    "substantivo": "📦 Substantivo é nome: cat, house.",
    "verbo": "🏃 Verbo é ação: run, eat, play.",
    "pronome": "👦 Pronome substitui nome: I, you, he.",
    "preposição": "🧭 Preposição mostra lugar: in, on, under.",
    "artigo": "🍎 Artigo: a, an, the.",
    "interjeição": "😲 Interjeição mostra emoção: Wow! Oops!",
    "conjunção": "🔗 Conjunção liga ideias: and, but, because."
  };
  const temaLower = tema.toLowerCase();
  for (let chave in explicacoes) {
    if (temaLower.includes(chave)) return explicacoes[chave];
  }
  return "🦉 Posso explicar gramática! Pergunte sobre verbo, substantivo, adjetivo, etc.";
}

function registrarInteracao(tipo, conteudo) {
  ultimoAssunto = { tipo, conteudo, timestamp: Date.now() };
}

function sugerirPratica() {
  if (!ultimoAssunto) return sugestoesPratica.generico[Math.floor(Math.random() * sugestoesPratica.generico.length)];
  if (ultimoAssunto.tipo === "traducao") {
    return sugestoesPratica.traducao[Math.floor(Math.random() * sugestoesPratica.traducao.length)];
  }
  return sugestoesPratica.generico[Math.floor(Math.random() * sugestoesPratica.generico.length)];
}

// ========================================
// DETECTOR DE INTENTO (CORRIGIDO)
// ========================================
function extrairTermoParaTraducao(texto) {
  texto = texto.toLowerCase().trim();
  const padroes = [
    /como se diz\s+(.+?)(?:\s+em inglês|\s+em ingles|$)/i,
    /como se diz\s+(.+)/i,
    /traduz(?:ir)?a?\s*:?\s+(.+)/i,
    /traduz(?:ir)?\s+(.+)/i,
    /o que significa\s+(.+)/i,
    /what(?:'s| is)\s+(.+)/i,
    /how do you say\s+(.+)/i
  ];
  for (const padrao of padroes) {
    const match = texto.match(padrao);
    if (match && match[1]) {
      return match[1]
        .replace(/[?.!,:]/g, '')
        .replace(/em inglês|em ingles|in english/gi, '')
        .trim();
    }
  }
  return null;
}

function detectarIntento(texto) {
  texto = texto.toLowerCase().trim();

  // Tradução
  if (
    texto.includes("como se diz") ||
    texto.includes("em inglês") ||
    texto.includes("em ingles") ||
    texto.includes("traduz") ||
    texto.includes("o que significa") ||
    texto.includes("what means") ||
    texto.includes("how do you say")
  ) {
    const termo = extrairTermoParaTraducao(texto);
    if (termo && termo.trim().includes(" ")) return "traducao_frase";
    return "traducao_palavra";
  }

  // WH-Questions
  if (
    texto.includes("wh question") ||
    texto.includes("wh-question") ||
    texto.includes("perguntas com wh") ||
    (texto.match(/\b(what|who|where|when|why|how)\b/) && 
     (texto.includes("significa") || texto.includes("traduz") || texto.includes("como usar") || texto.includes("o que é")))
  ) {
    return "wh_questions";
  }

  // CONJUGAÇÃO (prioridade alta)
  if (
    texto.includes("conjugue") ||
    texto.includes("conjugar") ||
    texto.includes("conjugate") ||
    texto.startsWith("verbo ")
  ) {
    return "conjugacao";
  }

  // Conteúdo educativo
  if (
    texto.includes("curiosidade") ||
    texto.includes("piada") ||
    texto.includes("conte algo") ||
    texto.includes("me ensine") ||
    texto.includes("trivia") ||
    texto.includes("fato")
  ) return "conteudo";

  // Explicação gramatical
  if (
    texto.includes("explique") ||
    texto.includes("ensine") ||
    texto.includes("o que é") ||
    texto.includes("como funciona")
  ) return "explicacao";

  // Conversa social
  if (
    texto.match(/\b(hi|hello|hey|olá|oi)\b/i) ||
    texto.includes("como você está") ||
    texto.includes("how are you") ||
    texto.includes("qual seu nome") ||
    texto.includes("what's your name") ||
    texto.match(/\b(animal|animals|dog|cat|lion|monkey|pet|coruja|pets)\b/i) ||
    texto.match(/\b(color|colors|blue|red|green|yellow|pink|black|white)\b/i) ||
    texto.match(/\b(family|mother|father|brother|sister|mom|dad|parent|parents)\b/i) ||
    texto.match(/\b(happy|sad|tired|hungry|angry|feeling|feelings|sick|excited)\b/i) ||
    texto.match(/\b(food|pizza|apple|chocolate|banana|eat|delicious|ice cream|cookie)\b/i) ||
    texto.match(/\b(weather|sunny|rainy|cold|hot|sun|rain|windy|cloudy)\b/i)
  ) return "social";

  // Inglês escrito (correção suave)
  if (texto.match(/[a-z]{3,}/) && !texto.includes("como se diz") && !texto.includes("traduz") && !texto.includes("?")) {
    const erro = detectarErroIngles(texto);
    if (erro) return "correcao_ingles";
    return "elogio_ingles";
  }

  return "chat";
}

// ========================================
// RESPONDEDORES
// ========================================
function pegarAleatorio(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function responderPalavra(texto) {
  const termo = extrairTermoParaTraducao(texto) || texto;
  let traducao = await traduzirComLibreTranslate(termo);
  if (!traducao) traducao = procurarNoDicionario(termo);
  
  if (traducao && traducao.trim() && traducao !== termo && traducao !== "​") {
    const exemplo = procurarExemplo(traducao);
    let resposta = `✨ *${termo}* em inglês é **${traducao}**`;
    if (exemplo) resposta += `\n\n📚 Exemplo:\n${exemplo.english}\n🇧🇷 ${exemplo.portuguese}`;
    resposta += "\n\n" + pegarAleatorio(mensagensIncentivo);
    resposta += "\n💡 " + sugerirPratica();
    registrarInteracao("traducao", termo);
    return resposta;
  }
  
  return pegarAleatorio([
    "🦉 Ainda estou aprendendo! Tente soletrar de outra forma?",
    "Digite: 'Como se diz gato em inglês?'",
    "Não conheço essa palavra ainda! Pode me dar um exemplo?"
  ]);
}

async function responderFrase(texto) {
  const termo = extrairTermoParaTraducao(texto) || texto;
  let traducao = await traduzirComLibreTranslate(termo);
  if (traducao && traducao !== termo) {
    traducao = traducao.charAt(0).toUpperCase() + traducao.slice(1);
    return `✨ *${termo}*\n➡️ *${traducao}*\n\n${pegarAleatorio(mensagensIncentivo)}\n💡 ${sugerirPratica()}`;
  }
  return "🦉 Ainda estou aprendendo frases completas! Tente uma frase mais simples.";
}

function responderWhQuestions(pergunta) {
  const texto = pergunta.toLowerCase().trim();
  if (texto.includes("what")) return "🎨 WHAT significa 'O que' ou 'Qual'. Ex: What is your name?";
  if (texto.includes("who")) return "👩‍🏫 WHO significa 'Quem'. Ex: Who is she?";
  if (texto.includes("where")) return "🗺️ WHERE significa 'Onde'. Ex: Where are you from?";
  if (texto.includes("when")) return "📅 WHEN significa 'Quando'. Ex: When is your birthday?";
  if (texto.includes("why")) return "❓ WHY significa 'Por que'. Responda com Because.";
  if (texto.includes("how")) return "🌟 HOW significa 'Como' ou 'Quanto'. Ex: How are you?";
  return "WH-questions: What, Who, Where, When, Why, How. Qual você quer praticar?";
}

function responderConhecimento(texto) {
  return pegarAleatorio([
    "🦉 Sabia que? O verbo TO BE é: AM, IS, ARE! Ex: I am happy!",
    "🌟 CAN significa habilidade! Ex: I can swim!",
    "📚 Aprender inglês é divertido! Tente 'Como se diz...'",
    "🌈 Na Inglaterra, o chá com leite é tradição!"
  ]);
}

function responderSocial(texto) {
  const intencoes = [
    { nome: "greeting", padroes: [/\b(hi|hello|hey|olá|oi)\b/i], respostas: ["👋 Hello! Como posso ajudar?"] },
    { nome: "how_are_you", padroes: [/how are you/i, /como você está/i], respostas: ["😊 Estou ótimo! E você?"] },
    { nome: "ask_name_bot", padroes: [/what(?:'s| is) your name/i, /qual.*seu nome/i], respostas: ["🦉 Meu nome é Quinti!"] }
  ];
  for (const intent of intencoes) {
    for (const regex of intent.padroes) {
      if (regex.test(texto)) {
        return intent.respostas[0];
      }
    }
  }
  return "👋 Olá! Vamos aprender inglês?";
}

function responderExplicacao(texto) {
  return explicarGramatica(texto);
}

function responderCorrecaoIngles(texto) {
  const erro = detectarErroIngles(texto);
  if (erro) return `🦉 Dica gentil: ${erro}\n\n${pegarAleatorio(mensagensIncentivo)}`;
  return `🌟 Bom inglês! ${pegarAleatorio(mensagensIncentivo)}`;
}

function responderElogioIngles(texto) {
  return `🌟 Ótimo! Você está praticando inglês! ${pegarAleatorio(mensagensIncentivo)}`;
}

function fallbackPedagogico() {
  return pegarAleatorio([
    "🦉 Que tal: 'Como se diz gato em inglês?'",
    "Tente perguntar outra palavra.",
    "Exemplo: 'Como se diz maçã em inglês?'"
  ]);
}

// ========================================
// FUNÇÃO PRINCIPAL (COM IA FALLBACK)
// ========================================
async function respostaControlada(pergunta) {
  const textoPergunta = pergunta.toLowerCase().trim();

  // ===== VERIFICA SE É COMANDO ESPECÍFICO DO SISTEMA ANTIGO =====
  const isSystemCommand = 
    textoPergunta.startsWith("conjugate ") ||
    textoPergunta.startsWith("verb ") ||
    textoPergunta.includes("como conjuga") ||
    textoPergunta.includes("conjugação do verbo") ||
    textoPergunta.includes("conjugue o verbo") ||
    textoPergunta.includes("traduz") ||
    textoPergunta.includes("qual é o significado") ||
    textoPergunta.includes("o que significa") ||
    textoPergunta.includes("como se diz");

  // ===== SE NÃO FOR COMANDO, TENTA A IA =====
  if (!isSystemCommand) {
    const respostaIA = await quintiAISays(pergunta);
    if (respostaIA) {
      return respostaIA;
    }
    // Se a IA falhar, continua para o sistema antigo
  }

  // ===== ATALHO: significado de verbo ("o que significa o verbo see") =====
  if (
    textoPergunta.includes("o que significa o verbo") ||
    (textoPergunta.includes("verbo") && textoPergunta.includes("significa"))
  ) {
    let verbo = textoPergunta
      .replace(/o que significa o verbo/gi, "")
      .replace(/verbo/gi, "")
      .replace(/significa/gi, "")
      .replace(/[?]/g, "")
      .trim()
      .split(/\s+/)[0];
    if (verbo) {
      const significado = procurarNoDicionario(verbo);
      if (significado) {
        return `🌟 O verbo **${verbo}** significa:\n\n${significado}`;
      }
    }
  }

  // ===== ATALHO: significado genérico =====
  if (
    textoPergunta.includes("qual é o significado") ||
    textoPergunta.includes("qual o significado") ||
    textoPergunta.includes("o que quer dizer")
  ) {
    let termo = textoPergunta
      .replace(/qual é o significado de|qual o significado de|o que quer dizer/gi, "")
      .replace(/[?]/g, "")
      .trim();
    if (termo) {
      const significado = procurarNoDicionario(termo);
      if (significado) {
        return `🌟 O significado de *${termo}* é:\n\n${significado}`;
      } else {
        return `🦉 Não sei o significado de "${termo}" ainda. Tente perguntar de outra forma.`;
      }
    }
  }

  // ===== CONJUGAÇÃO DIRETA =====
  if (
    textoPergunta.startsWith("conjugate ") ||
    textoPergunta.startsWith("verb ") ||
    textoPergunta.includes("como conjuga") ||
    textoPergunta.includes("conjugação do verbo") ||
    textoPergunta.includes("conjugue o verbo")
  ) {
    let palavra = textoPergunta
      .replace(/^conjugate\s+/i, "")
      .replace(/^verb\s+/i, "")
      .replace(/como conjuga\s+/i, "")
      .replace(/conjugação do verbo\s+/i, "")
      .replace(/conjugue o verbo\s+/i, "")
      .trim()
      .split(/\s+/)[0];
    if (palavra) {
      const resposta = explainVerb(palavra);
      if (resposta) return resposta;
      return `🦉 Não consegui conjugar **${palavra}**. Tente *play*, *go*, *eat*.`;
    }
  }

  const tipo = detectarIntento(pergunta);
  
  switch(tipo) {
    case "traducao_palavra": return await responderPalavra(pergunta);
    case "traducao_frase": return await responderFrase(pergunta);
    case "wh_questions": return responderWhQuestions(pergunta);
    case "conjugacao": {
      let verbToConjugate = pergunta.toLowerCase().trim()
        .replace(/conjugue\s+/i, "")
        .replace(/conjugar\s+/i, "")
        .replace(/conjugate\s+/i, "")
        .replace(/^verbo\s+/i, "")
        .trim()
        .split(/\s+/)[0];
      if (verbToConjugate) {
        const res = explainVerb(verbToConjugate);
        if (res) return res;
        return `🦉 Não consegui conjugar **${verbToConjugate}**. Tente outro verbo.`;
      }
      return "🦉 Diga o verbo que deseja conjugar. Ex: *verbo run*.";
    }
    case "conteudo": return responderConhecimento(pergunta);
    case "explicacao": return responderExplicacao(pergunta);
    case "correcao_ingles": return responderCorrecaoIngles(pergunta);
    case "elogio_ingles": return responderElogioIngles(pergunta);
    case "social": return responderSocial(pergunta);
    default: return fallbackPedagogico();
  }
}

// ========================================
// FUNÇÕES AUXILIARES (dicionário, glossário)
// ========================================
function procurarNoDicionario(texto) {
  texto = texto.toLowerCase().trim();
  let palavra = texto
    .replace(/quinti/g, "")
    .replace(/como se diz/g, "")
    .replace(/o que significa/g, "")
    .replace(/what means/g, "")
    .replace(/what is/g, "")
    .replace(/how do you say/g, "")
    .replace(/traduz(?:ir)?a?/g, "")
    .replace(/em inglês|em ingles|in english/g, "")
    .replace(/[?.!,:]/g, "")
    .trim();
  if (ptEn[palavra]) {
    const traducao = limparTraducao(ptEn[palavra]);
    const exemplo = procurarExemplo(traducao);
    if (exemplo) return `✨ ${palavra} em inglês é ${traducao}\n\n📚 Exemplo:\n${exemplo.english}\n🇧🇷 ${exemplo.portuguese}`;
    return `✨ ${palavra} em inglês é ${traducao}`;
  }
  if (enPt[palavra]) {
    const traducao = limparTraducao(enPt[palavra]);
    const exemplo = procurarExemplo(palavra);
    if (exemplo) return `✨ ${palavra} significa ${traducao}\n\n📚 Exemplo:\n${exemplo.english}\n🇧🇷 ${exemplo.portuguese}`;
    return `✨ ${palavra} significa ${traducao}`;
  }
  const semAcento = palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (ptEn[semAcento]) return `✨ ${palavra} em inglês é ${limparTraducao(ptEn[semAcento])}`;
  if (enPt[semAcento]) return `✨ ${palavra} significa ${limparTraducao(enPt[semAcento])}`;
  return null;
}

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
      return `🦉 Encontrei algo sobre:\n\n${pergunta}\n\n✨ Vamos aprender juntos!`;
    }
  }
  return null;
}

// ========================================
// MÓDULO DE VOZ
// ========================================
let speechEnabled = true;
let vozFeminina = null;

function toggleSpeaker() {
  speechEnabled = !speechEnabled;
  const btn = document.getElementById("btnSpeaker");
  if (btn) btn.textContent = speechEnabled ? "🔊" : "🔇";
}

document.addEventListener("DOMContentLoaded", () => {
  const btnSpeaker = document.getElementById("btnSpeaker");
  if (btnSpeaker) {
    btnSpeaker.addEventListener("click", toggleSpeaker);
    btnSpeaker.textContent = speechEnabled ? "🔊" : "🔇";
  }
});

async function carregarVozFeminina() {
  if (!window.speechSynthesis) return null;
  return new Promise((resolve) => {
    const obterVoz = () => {
      const vozes = window.speechSynthesis.getVoices();
      if (vozes.length === 0) { setTimeout(obterVoz, 50); return; }
      const voz = vozes.find(v => v.lang === 'pt-BR' && v.name.toLowerCase().includes('female')) || vozes.find(v => v.lang === 'pt-BR');
      resolve(voz);
    };
    obterVoz();
  });
}

function falarTexto(texto) {
  if (!speechEnabled || !window.speechSynthesis) return;
  let textoLimpo = texto.replace(/[*_`~#]/g, '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\n+/g, '. ');
  const utterance = new SpeechSynthesisUtterance(textoLimpo);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.05;
  utterance.pitch = 1.2;
  if (vozFeminina) utterance.voice = vozFeminina;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

carregarVozFeminina().then(voz => { if (voz) vozFeminina = voz; });

// ========================================
// UI E EVENTOS
// ========================================
const MAX_HISTORY = 6;
const chat = document.getElementById("chat");
const inputPergunta = document.getElementById("pergunta");
const btnEnviar = document.getElementById("btnEnviar");
const progressBar = document.getElementById("progress");
const btnMic = document.getElementById("btnMic");
const statusEl = document.getElementById("status");

function atualizarStatus(texto, progresso = null) {
  if (statusEl) statusEl.textContent = texto;
  if (progresso !== null && progressBar) progressBar.style.width = `${progresso * 100}%`;
}

function adicionarMensagem(texto, autor) {
  const div = document.createElement("div");
  div.className = `msg ${autor}`;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  memory.chatHistory.push({ role: autor, content: texto, timestamp: new Date().toISOString() });
  if (memory.chatHistory.length > MAX_HISTORY * 2) memory.chatHistory = memory.chatHistory.slice(-MAX_HISTORY * 2);
  if (autor === "bot") falarTexto(texto);
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

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition && btnMic) {
  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onstart = () => { btnMic.textContent = "🔴"; adicionarMensagem("🎤 Estou ouvindo...", "bot"); };
  recognition.onend = () => { btnMic.textContent = "🎤"; };
  recognition.onresult = (event) => {
    inputPergunta.value = event.results[0][0].transcript;
    enviar();
  };
  recognition.onerror = () => { btnMic.textContent = "🎤"; };
}

async function enviar() {
  const texto = inputPergunta?.value?.trim();
  if (!texto) return;
  adicionarMensagem(texto, "user");
  inputPergunta.value = "";
  mostrarPensando();
  await new Promise(r => setTimeout(r, 300));
  const resp = await respostaControlada(texto);
  removerPensando();
  adicionarMensagem(resp, "bot");
}

window.addEventListener("DOMContentLoaded", () => {
  if (btnEnviar) btnEnviar.addEventListener("click", (e) => { e.preventDefault(); enviar(); });
  if (inputPergunta) inputPergunta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } });
  if (btnMic && recognition) btnMic.addEventListener("click", (e) => { e.preventDefault(); recognition.start(); });
});

// INICIALIZAÇÃO
(async () => {
  atualizarStatus("🌍 Loading Quinti A1...", 0.5);
  try {
    window.conhecimentoGlobal = await carregarConhecimento();
    const dicts = await carregarDicionarios();
    enPt = dicts.EN_PT;
    ptEn = dicts.PT_EN;
    await carregarExemplos();
    atualizarStatus("✅ Quinti is Ready!", 1);
  } catch (e) { console.error(e); }
  adicionarMensagem("🦉 Hello! I am Quinti ✨ Ready for English Lessons? 🔊", "bot");
})();
