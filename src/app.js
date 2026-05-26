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
// INTEGRAÇÃO COM LIBRETRANSLATE (DOCKER)
// ========================================
const LIBRE_URL = 'http://localhost:5000/translate';

async function traduzirComLibreTranslate(texto, source = 'pt', target = 'en') {
    try {
        // Usamos a API do MyMemory com um email de contato para melhorar o limite
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${source}|${target}&de=lenilsonxavier@gmail.com`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.responseData && data.responseData.translatedText) {
            let traducao = data.responseData.translatedText;
            // O MyMemory devolve a frase original se não achar a tradução, prevenimos isso.
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
// MÓDULO DE ENCORAJAMENTO, CORREÇÃO, GRAMÁTICA E PRÁTICA
// ========================================

// Banco de mensagens de incentivo
const mensagensIncentivo = [
  "🌟 Muito bem! Continue assim!",
  "🦉 Você está aprendendo rápido!",
  "💪 Ótimo esforço! Cada palavra nova é um passo à frente.",
  "🎉 Parabéns! Você conseguiu!",
  "✨ That's perfect! Keep going!",
  "🍎 Você é um ótimo aluno!",
  "🌈 Sabia que praticar todo dia faz milagres? Você está no caminho certo!"
];

// Sugestões de prática baseadas no último assunto
let ultimoAssunto = null;
const sugestoesPratica = {
  saudacao: ["Que tal responder 'How are you?' agora?", "Tente dizer 'Good morning!' para mim."],
  traducao: ["Agora tente usar essa palavra em uma frase!", "Você consegue criar uma frase com essa palavra?"],
  verbo: ["Vamos conjugar outro verbo? Ex: 'to have' (ter)", "Tente: 'I have a cat' (Eu tenho um gato)."],
  generico: ["Que tal perguntar 'Como se diz...' para aprender mais?", "Posso te ensinar os números em inglês?"]
};

// Conjugador verbal simples (presente, passado, futuro)
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

// Detector de erros simples em inglês (frases curtas)
function detectarErroIngles(frase) {
  const fraseLower = frase.toLowerCase().trim();
  const palavras = fraseLower.split(/\s+/);
  // Verbo no passado com yesterday/last
  if (palavras.includes("yesterday") || palavras.includes("last")) {
    const verboIndex = palavras.findIndex(p => p === "go" || p === "eat" || p === "play" || p === "run");
    if (verboIndex !== -1 && !palavras[verboIndex].endsWith("ed") && !palavras[verboIndex].match(/went|ate|ran/)) {
      return `Você usou "${palavras[verboIndex]}" com "yesterday". Tente usar o passado: "${conjugarVerbo(palavras[verboIndex], "passado")}". Exemplo: I ${conjugarVerbo(palavras[verboIndex], "passado")} to school yesterday.`;
    }
  }
  // Verbo to be faltando (ex: "She happy")
  if (fraseLower.match(/^(he|she|it)\s+[a-z]+$/) && !fraseLower.includes(" is ") && !fraseLower.includes(" are ")) {
    return 'Dica: use o verbo "to be"! Ex: "She **is** happy".';
  }
  // Falta sujeito (ex: "is happy")
  if (fraseLower.match(/^(am|is|are)\s+/) && !fraseLower.match(/^(i|you|he|she|it|we|they)\s+/)) {
    return 'Dica: não esqueça do sujeito! Ex: "She is happy".';
  }
  return null;
}

// Mini explicação gramatical
function explicarGramatica(tema) {
  const explicacoes = {
    "verb to be": "O verbo TO BE significa SER ou ESTAR. Conjugação: I am, you are, he/she/it is, we are, they are. Ex: I am happy. 🐝",
    "present continuous": "Present Continuous = ação acontecendo agora. Formado por verbo to be + verbo com -ing. Ex: I am **eating** an apple. 🍎",
    "simple past": "Passado simples: verbos regulares terminam em -ed (play → played). Verbos irregulares mudam (go → went). Ex: Yesterday I **played** soccer. ⚽",
    "modal can": "CAN = conseguir/poder. Não muda para he/she (she can). Ex: I can swim. 🏊‍♂️",
    "there is/are": "THERE IS = singular, THERE ARE = plural. Ex: There **is** a cat; There **are** two dogs. 🐶🐶"
  };
  const temaLower = tema.toLowerCase();
  for (let chave in explicacoes) {
    if (temaLower.includes(chave)) return explicacoes[chave];
  }
  return "Claro! Me pergunte sobre verb to be, present continuous, simple past, can, there is/are... 🦉";
}

// Prática guiada (atividades interativas)
let atividadeAtiva = null;

function gerarAtividade() {
  const atividades = [
    { pergunta: "Complete: I ____ a student.", respostaEsperada: "am", dica: "O verbo to be para I é 'am'." },
    { pergunta: "Traduza: 'Eu gosto de gatos'", respostaEsperada: "I like cats", dica: "Use 'I like' + plural." },
    { pergunta: "Passe para o passado: 'I play soccer'", respostaEsperada: "I played soccer", dica: "Acrescente -ed ao verbo." },
    { pergunta: "Complete: She ___ to music every day. (listen/listens)", respostaEsperada: "listens", dica: "He/She/It - acrescenta 's' ou 'es'." }
  ];
  const escolhida = atividades[Math.floor(Math.random() * atividades.length)];
  atividadeAtiva = escolhida;
  return `🎯 Vamos praticar!\n\n${escolhida.pergunta}\n\nMe diga sua resposta! 🦉\n(Dica: ${escolhida.dica})`;
}

function verificarRespostaAtividade(respostaUsuario) {
  if (!atividadeAtiva) return null;
  const respostaNorm = respostaUsuario.toLowerCase().trim();
  const esperadaNorm = atividadeAtiva.respostaEsperada.toLowerCase().trim();
  if (respostaNorm === esperadaNorm) {
    const incentivo = mensagensIncentivo[Math.floor(Math.random() * mensagensIncentivo.length)];
    atividadeAtiva = null;
    return `✅ Correto! ${incentivo}\n\nQue tal outra atividade? Diga "prática" ou "atividade".`;
  } else {
    return `❌ Quase lá! Tente novamente. Dica: ${atividadeAtiva.dica}`;
  }
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
// DETECTOR DE INTENTO (com novas intenções)
// ========================================
function extrairTermoParaTraducao(texto) {
  texto = texto.toLowerCase().trim();
  const padroes = [
    /como se diz\s+(.+?)(?:\s+em inglês|\s+em ingles|$)/i,
    /como se diz\s+(.+)/i,
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

  // Atividade pendente
  if (atividadeAtiva) return "resposta_atividade";

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

  // Conteúdo educativo / curiosidade
  if (
    texto.includes("curiosidade") ||
    texto.includes("piada") ||
    texto.includes("conte algo") ||
    texto.includes("me ensine")
  ) return "conteudo";

  // Explicação gramatical
  if (
    texto.includes("explique") ||
    texto.includes("ensine") ||
    texto.includes("o que é") ||
    texto.includes("como funciona")
  ) return "explicacao";

  // Prática guiada
  if (
    texto.includes("prática") ||
    texto.includes("praticar") ||
    texto.includes("atividade") ||
    texto.includes("vamos praticar")
  ) return "pratica";

  // Conversa social
  if (
    texto.match(/\b(hi|hello|hey|olá|oi)\b/i) ||
    texto.includes("como você está") ||
    texto.includes("how are you") ||
    texto.includes("qual seu nome") ||
    texto.includes("what's your name")
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
// RESPONDEDORES ESPECIALIZADOS (com incentivos)
// ========================================
function pegarAleatorio(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function responderPalavra(texto) {
  const termo = extrairTermoParaTraducao(texto) || texto;
  let traducao = await traduzirComLibreTranslate(termo);
  if (!traducao) traducao = procurarNoDicionario(termo);
  
  if (traducao) {
    const exemplo = procurarExemplo(traducao);
    let resposta = `✨ *${termo}* em inglês é **${traducao}**`;
    if (exemplo) resposta += `\n\n📚 Exemplo:\n${exemplo.english}\n🇧🇷 ${exemplo.portuguese}`;
    const incentivo = "\n\n" + pegarAleatorio(mensagensIncentivo);
    const sugestao = "\n💡 " + sugerirPratica();
    registrarInteracao("traducao", termo);
    return resposta + incentivo + sugestao;
  }
  
  return pegarAleatorio([
    "🦉 Ainda estou aprendendo! ✨\n\nTente soletrar de outra forma?",
    "🌟 Vamos aprender juntos!\n\nDigite: 'Como se diz gato em inglês?'",
    "🍎 Não conheço essa palavra ainda!\n\nPode me dar um exemplo?"
  ]);
}

async function responderFrase(texto) {
  const termo = extrairTermoParaTraducao(texto) || texto;
  let traducao = await traduzirComLibreTranslate(termo);
  if (traducao && traducao !== termo) {
    traducao = traducao.charAt(0).toUpperCase() + traducao.slice(1);
    const incentivo = "\n\n" + pegarAleatorio(mensagensIncentivo);
    const sugestao = "\n💡 " + sugerirPratica();
    registrarInteracao("traducao", termo);
    return `✨ *${termo}*\n➡️ *${traducao}*${incentivo}${sugestao}`;
  }
  
  // Fallback palavra por palavra
  const palavras = termo.toLowerCase().trim().split(/\s+/);
  const mapaFixos = { "eu":"i","você":"you","voce":"you","ele":"he","ela":"she","nós":"we","nos":"we","eles":"they","amo":"love","gosto":"like","quero":"want","tenho":"have","sou":"am","é":"is","esta":"is","está":"is","te":"you","me":"me","uma":"a","um":"a","o":"the","a":"the" };
  const traduzidas = palavras.map(p => {
    p = p.toLowerCase().trim();
    if (!p) return "";
    if (mapaFixos[p]) return mapaFixos[p];
    const semAcento = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let t = ptEn[p] || ptEn[semAcento];
    if (t) {
      t = limparTraducao(t);
      return t.split(/\s+/).pop();
    }
    return p;
  });
  const resultado = traduzidas.filter(Boolean).join(" ");
  if (resultado && resultado !== termo && !resultado.includes("undefined")) {
    const incentivo = "\n\n" + pegarAleatorio(mensagensIncentivo);
    return `✨ ${resultado}${incentivo}`;
  }
  
  return pegarAleatorio([
    "🦉 Ainda estou aprendendo frases completas! ✨\n\nTente uma frase mais simples?",
    "🌟 Vamos aprender palavra por palavra primeiro!\n\nComo se diz 'gato' em inglês?",
    "🎯 Boa tentativa! Tente separar em partes menores.",
    "💪 Aprendendo passo a passo!\n\nPergunte: 'Como se diz [palavra] em inglês?'"
  ]);
}

function responderConhecimento(texto) {
  const conhecimento = buscarConhecimento(texto);
  if (conhecimento) return conhecimento;
  const glossario = buscarGlossario(texto);
  if (glossario) return glossario;
  return pegarAleatorio([
    "🦉 Sabia que?\n\n🐝 O verbo TO BE é: AM, IS, ARE!\nExemplo: I am happy! ✨",
    "🌟 Curiosidade!\n💪 CAN significa habilidade!\nExemplo: I can swim! 🏊‍♂️",
    "📚 Aprender inglês é divertido!\nTente: 'Como se diz...' para aprender novas palavras!"
  ]);
}

function responderSocial(texto) {
  for (const intent of intencoes) {
    for (const regex of intent.padroes) {
      if (regex.test(texto)) {
        let resp = intent.respostas[Math.floor(Math.random() * intent.respostas.length)];
        if (intent.nome === "how_are_you") resp += " E você? How are you today? 😊";
        return resp;
      }
    }
  }
  return pegarAleatorio([
    "👋 Olá estrelinha! ✨\nComo posso ajudar você hoje?",
    "🌟 Oi amigo! Vamos aprender uma palavra nova?",
    "🦉 Olá explorador! Tente: 'Como se diz coruja em inglês?'"
  ]);
}

function responderExplicacao(texto) {
  return explicarGramatica(texto);
}

function responderPratica() {
  return gerarAtividade();
}

function responderRespostaAtividade(resposta) {
  return verificarRespostaAtividade(resposta);
}

function responderCorrecaoIngles(texto) {
  const erro = detectarErroIngles(texto);
  if (erro) {
    return `🦉 **Dica gentil**: ${erro}\n\n${pegarAleatorio(mensagensIncentivo)}`;
  }
  return `🌟 Bom inglês! ${pegarAleatorio(mensagensIncentivo)}\n\nQuer que eu te ensine uma palavra nova? Diga 'Como se diz...'`;
}

function responderElogioIngles(texto) {
  return `🌟 Ótimo! Você está praticando inglês! ${pegarAleatorio(mensagensIncentivo)}\n\nQuer traduzir alguma frase?`;
}

function fallbackPedagogico() {
  return pegarAleatorio([
    "🦉 Estou aprendendo ainda! ✨\nQue tal: 'Como se diz gato em inglês?'",
    "🌟 Vamos aprender juntos!\nTente perguntar outra palavra.",
    "🍎 Exemplo: 'Como se diz maçã em inglês?'",
    "💪 Continue praticando!\nPergunte: 'Como se diz [palavra] em inglês?'"
  ]);
}

// ========================================
// MOTOR PRINCIPAL
// ========================================
async function respostaControlada(pergunta) {
  const tipo = detectarIntento(pergunta);
  
  switch(tipo) {
    case "traducao_palavra": return await responderPalavra(pergunta);
    case "traducao_frase": return await responderFrase(pergunta);
    case "conteudo": return responderConhecimento(pergunta);
    case "explicacao": return responderExplicacao(pergunta);
    case "pratica": return responderPratica();
    case "resposta_atividade": return responderRespostaAtividade(pergunta);
    case "correcao_ingles": return responderCorrecaoIngles(pergunta);
    case "elogio_ingles": return responderElogioIngles(pergunta);
    case "social": return responderSocial(pergunta);
    default: return fallbackPedagogico();
  }
}

// ========================================
// FUNÇÃO PROcurarNoDicionario (FALLBACK)
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
    .replace(/traduz(?:ir)?/g, "")
    .replace(/em inglês/g, "")
    .replace(/em ingles/g, "")
    .replace(/in english/g, "")
    .replace(/\be\b/g, "")
    .replace(/[?.!,:]/g, "")
    .trim();
  console.log("Palavra limpa (fallback):", palavra);
  if (ptEn[palavra]) {
    const traducao = limparTraducao(ptEn[palavra]);
    const exemplo = procurarExemplo(traducao);
    if (exemplo) {
      return `✨ ${palavra} em inglês é ${traducao}\n\n📚 Example:\n${exemplo.english}\n🇧🇷 ${exemplo.portuguese}`;
    }
    return `✨ ${palavra} em inglês é ${traducao}`;
  }
  if (enPt[palavra]) {
    const traducao = limparTraducao(enPt[palavra]);
    const exemplo = procurarExemplo(palavra);
    if (exemplo) {
      return `✨ ${palavra} significa ${traducao}\n\n📚 Example:\n${exemplo.english}\n🇧🇷 ${exemplo.portuguese}`;
    }
    return `✨ ${palavra} significa ${traducao}`;
  }
  const semAcento = palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (ptEn[semAcento]) {
    const traducao = limparTraducao(ptEn[semAcento]);
    return `✨ ${palavra} em inglês é ${traducao}`;
  }
  if (enPt[semAcento]) {
    const traducao = limparTraducao(enPt[semAcento]);
    return `✨ ${palavra} significa ${traducao}`;
  }
  return null;
}

// ========================================
// FUNÇÕES AUXILIARES (glossário, conhecimento)
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
      return `🦉 Encontrei algo sobre:\n\n${pergunta}\n\n✨ Vamos aprender juntos!`;
    }
  }
  return null;
}

// ========================================
// BASE DE CONHECIMENTO A1
// ========================================
const intencoes = [
  { nome: "verb_to_be", padroes: [/verb to be/i, /o que é am is are/i, /verbo ser ou estar/i], respostas: ["🐝 The Verb TO BE is: AM, IS, ARE.\nExample: I am happy! ✨"] },
  { nome: "present_simple_do", padroes: [/present simple/i, /auxiliar do/i, /quando usar do ou does/i], respostas: ["⚙️ Use DO for I, YOU, WE, THEY.\nUse DOES for HE, SHE, IT! 🍕"] },
  { nome: "modal_can", padroes: [/\bcan\b/i, /o que é can/i, /verbo poder/i], respostas: ["💪 CAN means ability!\nExample: I can swim! 🏊‍♂️"] },
  { nome: "there_is_are", padroes: [/there is/i, /there are/i, /verbo haver/i], respostas: ["📍 THERE IS = singular.\nTHERE ARE = plural 🍎"] },
  { nome: "how_much_many", padroes: [/how much/i, /how many/i, /quantos/i], respostas: ["🔢 HOW MANY = countable.\nHOW MUCH = uncountable 💰"] },
  { nome: "greeting", padroes: [/\b(hi|hello|hey|olá|oi)\b/i], respostas: ["👋 Hello little star! ✨", "🌟 Hi friend! How are you today?", "🦉 Hello explorer! Ready to learn?"] },
  { nome: "ask_name_bot", padroes: [/what(?:'s| is) your name/i, /qual.*seu nome/i], respostas: ["🦉 My name is Quinti!", "✨ I'm Quinti, your English owl!", "🌟 You can call me Quinti!"] },
  { nome: "how_are_you", padroes: [/how are you/i, /como você está/i], respostas: ["😊 I'm great! Thanks for asking!", "🌟 I'm happy and ready to learn!", "🦉 I'm doing very well today!"] },
  { nome: "how_old", padroes: [/how old are you/i, /qual sua idade/i], respostas: ["🎈 I don't have an age like humans!", "🦉 I'm always learning every day!"] },
  { nome: "where_are_you_from", padroes: [/where are you from/i, /de onde você é/i], respostas: ["🌍 I'm from the world of learning!", "✨ I come from a magical world of English!"] },
  { nome: "who_are_you", padroes: [/who are you/i, /quem é você/i], respostas: ["🦉 I'm Quinti, your English tutor!", "✨ I'm Quinti! I help children learn English."] },
  { nome: "do_you_like", padroes: [/do you like/i], respostas: ["😊 That sounds interesting!", "🌟 I like learning new things!", "🦉 Tell me more!"] },
  { nome: "favorite", padroes: [/what(?:'s| is) your favorite/i], respostas: ["🐶 I like animals and words!", "🌈 Learning is one of my favorite things!"] },
  { nome: "who_is_she", padroes: [/who is she/i], respostas: ["👧 She is a girl or a woman."] },
  { nome: "who_is_he", padroes: [/who is he/i], respostas: ["👦 He is a boy or a man."] },
  { nome: "what_is_it", padroes: [/what is it/i], respostas: ["📦 It can be an object, animal or thing."] },
  { nome: "what_are_these", padroes: [/what are these/i], respostas: ["📚 These means many things near us!"] },
  { nome: "thanks", padroes: [/\b(thank|thanks|obrigado|obrigada)\b/i], respostas: ["💛 You're welcome! 🌟"] }
];

// ========================================
// MÓDULO DE TEXTO PARA FALA (SPEECH) - CORRIGIDO
// ========================================
let speechEnabled = true;
let vozFeminina = null;

// Função para carregar a melhor voz feminina em português
async function carregarVozFeminina() {
    if (!window.speechSynthesis) return null;
    return new Promise((resolve) => {
        let vozes = window.speechSynthesis.getVoices();
        if (vozes.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                vozes = window.speechSynthesis.getVoices();
                const voz = encontrarMelhorVozFeminina(vozes);
                resolve(voz);
            };
        } else {
            const voz = encontrarMelhorVozFeminina(vozes);
            resolve(voz);
        }
    });
}

function encontrarMelhorVozFeminina(vozes) {
    const prioridades = [
        (v) => v.lang === 'pt-BR' && v.name.toLowerCase().includes('female'),
        (v) => v.lang === 'pt-BR' && v.name.toLowerCase().includes('google'),
        (v) => v.lang === 'pt-BR' && v.name.toLowerCase().includes('maria'),
        (v) => v.lang === 'pt-BR',
        (v) => v.name.toLowerCase().includes('female') && v.lang.startsWith('pt'),
        (v) => v.name.toLowerCase().includes('google') && v.lang.startsWith('pt'),
        (v) => v.name.toLowerCase().includes('female')
    ];
    for (const criterio of prioridades) {
        const encontrada = vozes.find(criterio);
        if (encontrada) return encontrada;
    }
    return vozes.find(v => v.lang.startsWith('pt')) || vozes[0] || null;
}

function falarTexto(texto) {
    if (!speechEnabled) return;
    if (!window.speechSynthesis) return;
    
    let textoLimpo = texto.replace(/[*_`~]/g, '').replace(/[\u{1F600}-\u{1F6FF}]/gu, '');
    
    const utterance = new SpeechSynthesisUtterance(textoLimpo);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1.2;
    
    if (vozFeminina) {
        utterance.voice = vozFeminina;
    }
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

// Inicializa a voz feminina
carregarVozFeminina().then(voz => {
    if (voz) {
        vozFeminina = voz;
        console.log(`✅ Voz feminina carregada: ${voz.name} (${voz.lang})`);
    } else {
        console.warn('⚠️ Nenhuma voz feminina encontrada, usando padrão do sistema.');
    }
});

// ========================================
// UI e EVENTOS
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

// Microfone
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition && btnMic) {
  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onstart = () => { btnMic.textContent = "🔴"; adicionarMensagem("🎤 Estou ouvindo... Speak to me!", "bot"); };
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

// EVENTOS
window.addEventListener("DOMContentLoaded", () => {
  if (btnEnviar) btnEnviar.addEventListener("click", (e) => { e.preventDefault(); enviar(); });
  if (inputPergunta) inputPergunta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } });
  if (btnMic && recognition) btnMic.addEventListener("click", (e) => { e.preventDefault(); try { recognition.start(); } catch (err) { console.log(err); } });
  if (btnSpeaker) btnSpeaker.textContent = speechEnabled ? "🔊" : "🔇";
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
    console.log("🦉 Quinti pronto!");
    const test = await traduzirComLibreTranslate("gato");
    if (test) console.log("✅ LibreTranslate conectado!");
    else console.warn("⚠️ LibreTranslate não respondeu. Usando dicionário local como fallback.");
  } catch (e) {
    console.error(e);
  }
  adicionarMensagem("🦉 Hello!\n\nI am Quinti ✨\n\nReady for English Lessons?\n\n🔊", "bot");
})();
