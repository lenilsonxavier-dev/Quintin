const fs = require("fs");
const readline = require("readline");

// ==============================
// CONFIG
// ==============================
const MAX_FRASES = 5000;
const MAX_TAMANHO = 80;

// arquivos
const ENG_FILE = "eng_sentences.tsv";
const POR_FILE = "por_sentences.tsv";
const LINKS_FILE = "links.csv";

// ==============================
// CARREGAR FRASES
// ==============================
async function carregarFrases(arquivo, idioma) {
  const frases = new Map();

  const rl = readline.createInterface({
    input: fs.createReadStream(arquivo),
    crlfDelay: Infinity
  });

  for await (const linha of rl) {
    const partes = linha.split("\t");

    if (partes.length < 3) continue;

    const [id, lang, texto] = partes;

    if (lang !== idioma) continue;

    frases.set(id, texto.trim());
  }

  console.log(`✅ ${idioma}: ${frases.size} frases`);
  return frases;
}

// ==============================
// FILTRO INFANTIL / SIMPLES
// ==============================
function fraseBoa(texto) {
  if (!texto) return false;

  if (texto.length > MAX_TAMANHO) return false;
  if (texto.length < 3) return false;

  // evita lixo
  if (texto.includes("http")) return false;
  if (texto.includes("@")) return false;
  if (texto.includes("www")) return false;

  // frases muito malucas
  if (/[{}[\]<>#$%^*_+=|\\]/.test(texto))
    return false;

  return true;
}

// ==============================
// GERAR EXEMPLOS
// ==============================
async function gerar() {

  console.log("📚 Carregando inglês...");
  const eng = await carregarFrases(
    ENG_FILE,
    "eng"
  );

  console.log("📚 Carregando português...");
  const por = await carregarFrases(
    POR_FILE,
    "por"
  );

  const exemplos = [];

  console.log("🔗 Lendo links...");

  const rl = readline.createInterface({
    input: fs.createReadStream(LINKS_FILE),
    crlfDelay: Infinity
  });

  for await (const linha of rl) {

    const [id1, id2] = linha
      .trim()
      .split(/\s+/);

    const en = eng.get(id1);
    const pt = por.get(id2);

    // tenta invertido
    const en2 = eng.get(id2);
    const pt2 = por.get(id1);

    if (
      en &&
      pt &&
      fraseBoa(en) &&
      fraseBoa(pt)
    ) {
      exemplos.push({
        english: en,
        portuguese: pt
      });
    }

    else if (
      en2 &&
      pt2 &&
      fraseBoa(en2) &&
      fraseBoa(pt2)
    ) {
      exemplos.push({
        english: en2,
        portuguese: pt2
      });
    }

    if (exemplos.length >= MAX_FRASES)
      break;
  }

  fs.writeFileSync(
    "examples.json",
    JSON.stringify(
      exemplos,
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `🎉 ${exemplos.length} frases salvas em examples.json`
  );
}

gerar();
