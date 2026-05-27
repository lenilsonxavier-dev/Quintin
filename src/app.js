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

  // WH-Questions (Mapeamento específico)
  if (
    texto.includes("wh question") ||
    texto.includes("wh-question") ||
    texto.includes("perguntas com wh") ||
    (texto.match(/\b(what|who|where|when|why|how)\b/) && 
     (texto.includes("significa") || texto.includes("traduz") || texto.includes("como usar") || texto.includes("o que é") || texto.includes("o que sao")))
  ) {
    return "wh_questions";
  }

  // Verbos (Mapeamento para busca no data)
  if (texto.includes("verbo") || texto.includes("verbs") || texto.includes("conjugar")) {
    return "verbos";
  }

  // Conteúdo educativo / curiosidade
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

  // Prática guiada
  if (
    texto.includes("prática") ||
    texto.includes("praticar") ||
    texto.includes("atividade") ||
    texto.includes("vamos praticar")
  ) return "pratica";

  // Conversa social (Expandida para camadas conversacionais nível A)
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

// Resposta sobre Verbos usando recursão nos dados locais
function responderVerbos(pergunta) {
  const base = window.conhecimentoGlobal;
  const texto = pergunta.toLowerCase().trim();
  let verbosEncontrados = [];
  
  function buscarVerboRecursivo(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
      const kLower = key.toLowerCase();
      if ((kLower.includes('verb') || kLower.includes('verbo')) && typeof val === 'object') {
        if (Array.isArray(val)) {
          verbosEncontrados.push(...val);
        } else {
          for (const [vName, vData] of Object.entries(val)) {
            if (typeof vData === 'object') {
              verbosEncontrados.push({ nome: vName, ...vData });
            } else {
              verbosEncontrados.push({ nome: vName, traducao: vData });
            }
          }
        }
      } else {
        buscarVerboRecursivo(val);
      }
    }
  }
  
  if (base) {
    buscarVerboRecursivo(base);
  }
  
  if (verbosEncontrados.length > 0) {
    const verboMencionado = verbosEncontrados.find(v => {
      const nome = (v.en || v.name || v.english || v.nome || "").toLowerCase();
      const pt = (v.pt || v.portuguese || v.traducao || "").toLowerCase();
      return (nome && texto.includes(nome)) || (pt && texto.includes(pt));
    });
    
    if (verboMencionado) {
      const en = verboMencionado.en || verboMencionado.name || verboMencionado.english || verboMencionado.nome || "Verbo";
      const pt = verboMencionado.pt || verboMencionado.portuguese || verboMencionado.traducao || "Ação";
      const exEn = verboMencionado.example_en || verboMencionado.ex_en || verboMencionado.ex || verboMencionado.example || "";
      const exPt = verboMencionado.example_pt || verboMencionado.ex_pt || verboMencionado.traducao_ex || "";
      let desc = `✨ Encontrei o verbo *${en}* (${pt}) nos meus arquivos! 🦉\n\n`;
      if (exEn) {
        desc += `📚 Exemplo:\n"${exEn}"\n🇧🇷 (${exPt || "Tradução pendente"})\n\n`;
      }
      desc += "Que tal tentar criar uma frase divertida com ele? 😉";
      return desc;
    }
    
    const listaNomes = verbosEncontrados.slice(0, 5).map(v => {
      const en = v.en || v.name || v.english || v.nome || "";
      const pt = v.pt || v.portuguese || v.traducao || "";
      return `• **${en}** (${pt})`;
    }).filter(Boolean).join("\n");
    
    if (listaNomes) {
      return `📚 Olha só alguns verbos super divertidos que eu encontrei na minha biblioteca:\n\n${listaNomes}\n\nPergunte sobre qualquer um deles ou me diga "prática"! 🦉`;
    }
  }
  
  return `🦉 Eu adoro verbos! Verbos são ações como **run** (correr), **play** (brincar) e **eat** (comer).\n\nQual dessas ações você quer aprender hoje? Me pergunte! 🌟`;
}

// Respostas para WH-Questions no nível A
function responderWhQuestions(pergunta) {
  const texto = pergunta.toLowerCase().trim();
  
  if (texto.includes("what")) {
    return `🎨 **WHAT** significa **"O que"** ou **"Qual"**.\n\nUsamos para fazer perguntas sobre coisas, objetos ou ações!\n\n👉 Exemplo:\n* "What is your name?" (Qual é o seu nome?)\n* "What is this?" (O que é isso?)\n\nQue tal tentar me perguntar: *"What is your favorite animal?"* 🐶`;
  }
  if (texto.includes("who")) {
    return `👩‍🏫 **WHO** significa **"Quem"**.\n\nUsamos sempre para perguntar sobre pessoas!\n\n👉 Exemplo:\n* "Who is your teacher?" (Quem é seu professor?)\n* "Who is she?" (Quem é ela?)\n\nMe diga: *Who is your favorite superhero?* 🦸‍♂️`;
  }
  if (texto.includes("where")) {
    return `🗺️ **WHERE** significa **"Onde"**.\n\nUsamos para perguntar sobre lugares e localizações!\n\n👉 Exemplo:\n* "Where are you from?" (De onde você é?)\n* "Where is my book?" (Onde está meu livro?)\n\nMe pergunte: *"Where is Quinti?"* 🦉`;
  }
  if (texto.includes("when")) {
    return `📅 **WHEN** significa **"Quando"**.\n\nUsamos para perguntar sobre o tempo, datas ou momentos especiais!\n\n👉 Exemplo:\n* "When is your birthday?" (Quando é seu aniversário?)\n* "When do you study?" (Quando você estuda?)\n\nVocê sabe responder: *When is your birthday?* 🎂`;
  }
  if (texto.includes("why")) {
    return `❓ **WHY** significa **"Por que"** (para fazer perguntas).\n\nUsamos para saber o motivo de algo. E a resposta quase sempre começa com **Because** (Porque)!\n\n👉 Exemplo:\n* "Why are you happy?" (Por que você está feliz?)\n* Resposta: "Because I like English!" (Porque eu gosto de inglês!)\n\nWhy are you studying English today? 😊`;
  }
  if (texto.includes("how")) {
    return `🌟 **HOW** significa **"Como"** ou **"Quanto"** (dependendo de como usamos).\n\nUsamos para saber o estado, modo ou a idade!\n\n👉 Exemplo:\n* "How are you?" (Como você está?)\n* "How old are you?" (Quantos anos você tem?)\n\nLet's practice! Responda para mim: *How are you today?* 😊`;
  }

  return `🦉 **As "WH- Questions" são palavras mágicas usadas para fazer perguntas em inglês!** 🌟\n\nOlha só a nossa lista de ouro:\n\n1️⃣ **What** (O que / Qual) ➡️ Coisas e ações\n2️⃣ **Who** (Quem) ➡️ Pessoas\n3️⃣ **Where** (Onde) ➡️ Lugares\n4️⃣ **When** (Quando) ➡️ Tempo/datas\n5️⃣ **Why** (Por que) ➡️ Motivo (Responda com *Because*!)\n6️⃣ **How** (Como) ➡️ Modo ou idade\n\nQual delas você quer praticar hoje? Escolha uma ou tente me fazer uma pergunta! 😊`;
}

function responderConhecimento(texto) {
  const base = window.conhecimentoGlobal;
  const textoLower = texto.toLowerCase().trim();
  let curiosidadesEncontradas = [];
  
  function buscarCuriosidadesRecursivo(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
      const kLower = key.toLowerCase();
      if ((kLower.includes('curios') || kLower.includes('trivia') || kLower.includes('fact') || kLower.includes('dica') || kLower.includes('piada')) && typeof val === 'object') {
        if (Array.isArray(val)) {
          curiosidadesEncontradas.push(...val);
        } else {
          for (const [cName, cData] of Object.entries(val)) {
            if (typeof cData === 'object') {
              curiosidadesEncontradas.push({ titulo: cName, ...cData });
            } else {
              curiosidadesEncontradas.push({ fato: cData });
            }
          }
        }
      } else {
        buscarCuriosidadesRecursivo(val);
      }
    }
  }
  
  if (base) {
    buscarCuriosidadesRecursivo(base);
  }
  
  if (curiosidadesEncontradas.length > 0) {
    let fatoEscolhido = curiosidadesEncontradas.find(c => {
      const stringified = JSON.stringify(c).toLowerCase();
      return textoLower.split(/\s+/).some(p => p.length > 3 && stringified.includes(p));
    });
    
    if (!fatoEscolhido) {
      fatoEscolhido = curiosidadesEncontradas[Math.floor(Math.random() * curiosidadesEncontradas.length)];
    }
    
    if (fatoEscolhido) {
      const titulo = fatoEscolhido.titulo || fatoEscolhido.title || "Curiosidade Espetacular! 🌟";
      const fato = fatoEscolhido.fato || fatoEscolhido.fact || fatoEscolhido.text || fatoEscolhido.curiosidade || JSON.stringify(fatoEscolhido);
      return `🦉 **${titulo}**\n\n${fato}\n\nQue legal, né? Quer aprender outra curiosidade ou prefere praticar inglês? 💪`;
    }
  }

  const conhecimento = buscarConhecimento(texto);
  if (conhecimento) return conhecimento;
  const glossario = buscarGlossario(texto);
  if (glossario) return glossario;
  
  return pegarAleatorio([
    "🦉 Sabia que?\n\n🐝 O verbo TO BE é: AM, IS, ARE!\nExemplo: I am happy! ✨",
    "🌟 Curiosidade!\n💪 CAN significa habilidade!\nExemplo: I can swim! 🏊‍♂️",
    "📚 Aprender inglês é divertido!\nTente: 'Como se diz...' para aprender novas palavras!",
    "🌈 Sabia que na Inglaterra o chá é uma tradição super importante? Eles amam beber chá com leite! ☕"
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
    case "wh_questions": return responderWhQuestions(pergunta);
    case "verbos": return responderVerbos(pergunta);
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
  { nome: "thanks", padroes: [/\b(thank|thanks|obrigado|obrigada)\b/i], respostas: ["💛 You're welcome! 🌟"] },
  
  // Camadas Conversacionais adicionais (Kids Level A)
  { nome: "animals", padroes: [/\b(animal|animals|dog|cat|lion|monkey|pet|coruja|pets)\b/i], respostas: ["🦁 I love animals! My favorite animal is the owl (coruja) 🦉. What is your favorite animal? A dog 🐶, a cat 🐱, or a lion 🦁?"] },
  { nome: "colors", padroes: [/\b(color|colors|blue|red|green|yellow|pink|black|white)\b/i], respostas: ["🎨 Colors make the world beautiful! My favorite color is blue 💙. What about you? What's your favorite color?"] },
  { nome: "family", padroes: [/\b(family|mother|father|brother|sister|mom|dad|parent|parents)\b/i], respostas: ["👨‍👩‍👧‍👦 Family is very important! Do you have a big or small family? Tell me about your brother, sister, mom or dad!"] },
  { nome: "feelings", padroes: [/\b(happy|sad|tired|hungry|angry|feeling|feelings|sick|excited)\b/i], respostas: ["😊 How do you feel today? I am super happy (feliz) today! Are you happy, sad, or tired?"] },
  { nome: "food", padroes: [/\b(food|pizza|apple|chocolate|banana|eat|delicious|ice cream|cookie)\b/i], respostas: ["🍕 Yum! Food is delicious! I love eating red apples 🍎. Do you like pizza, chocolate or ice cream? Let me know!"] },
  { nome: "weather", padroes: [/\b(weather|sunny|rainy|cold|hot|sun|rain|windy|cloudy)\b/i], respostas: ["☀️ The weather is always interesting! Is it sunny (ensolarado), rainy (chuvoso), or cold (frio) where you are today?"] }
];

// ========================================
// MÓDULO DE VOZ (COM TOGGLER FUNCIONAL)
// ========================================
let speechEnabled = true;
let vozFeminina = null;

// Função para alternar o estado e o ícone
function toggleSpeaker() {
    speechEnabled = !speechEnabled;
    const btn = document.getElementById("btnSpeaker");
    if (btn) {
        btn.textContent = speechEnabled ? "🔊" : "🔇";
        console.log(`🦉 Voz ${speechEnabled ? "ativada" : "desativada"}`);
    }
}

// Configura o evento de clique (garantindo que o botão já existe)
document.addEventListener("DOMContentLoaded", () => {
    const btnSpeaker = document.getElementById("btnSpeaker");
    if (btnSpeaker) {
        btnSpeaker.addEventListener("click", toggleSpeaker);
        btnSpeaker.textContent = speechEnabled ? "🔊" : "🔇";
        console.log("✅ Botão alto-falante configurado");
    } else {
        console.warn("⚠️ Botão #btnSpeaker não encontrado");
    }
});

// Carrega a melhor voz feminina disponível
async function carregarVozFeminina() {
    if (!window.speechSynthesis) return null;
    return new Promise((resolve) => {
        const obterVoz = () => {
            const vozes = window.speechSynthesis.getVoices();
            if (vozes.length === 0) {
                setTimeout(obterVoz, 50);
                return;
            }
            resolve(encontrarMelhorVozFeminina(vozes));
        };
        obterVoz();
    });
}

function encontrarMelhorVozFeminina(vozes) {
    const prioridades = [
        (v) => v.lang === 'pt-BR' && v.name.toLowerCase().includes('female'),
        (v) => v.lang === 'pt-BR' && v.name.toLowerCase().includes('google'),
        (v) => v.lang === 'pt-BR' && v.name.toLowerCase().includes('maria'),
        (v) => v.lang === 'pt-BR',
        (v) => v.name.toLowerCase().includes('female') && v.lang.startsWith('pt')
    ];
    for (const test of prioridades) {
        const found = vozes.find(test);
        if (found) return found;
    }
    return vozes.find(v => v.lang.startsWith('pt')) || null;
}

// Função que fala (só executa se speechEnabled for true)
function falarTexto(texto) {
    if (!speechEnabled) {
        console.log("🔇 Voz desligada – não vou falar");
        return;
    }
    if (!window.speechSynthesis) return;

    // Remove emojis e markdown para leitura limpa
    let textoLimpo = texto.replace(/[*_`~#]/g, '').replace(/[\u{1F600}-\u{1F6FF}]/gu, '');
    const utterance = new SpeechSynthesisUtterance(textoLimpo);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1.2;
    if (vozFeminina) utterance.voice = vozFeminina;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

// Inicializa a voz assim que possível
carregarVozFeminina().then(voz => {
    if (voz) {
        vozFeminina = voz;
        console.log(`✅ Voz carregada: ${voz.name} (${voz.lang})`);
    } else {
        console.warn("⚠️ Usando voz padrão do sistema");
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
    else if (event.error === "no-speech") namespace = "🎤 I couldn't hear you.\nNão consegui ouvir você ✨";
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
  const btnSpeaker = document.getElementById("btnSpeaker");
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
