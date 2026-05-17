import * as webllm from "https://esm.sh/@mlc-ai/web-llm";

const chat = document.getElementById("chat");
let engine = null;
let modeloPronto = false;
let conhecimentoGlobal = {};   // onde ficam os dados dos JSONs

// =====================================================
// 1. LISTA DE ARQUIVOS JSON (no GitHub)
// =====================================================
const arquivosVocabulario = [
  "food_and_drink.json",
  "historia_lingua_inglesa.json",
  "lets_have_fun.json",
  "places_to_go_in_town.json",
  "prepositions_in_on_at.json",
  "pronomes.json",
  "verb_to_be.json",
  "we_are_having_fun.json",
  "where_can_we_buy_clothes.json",
  "where_can_we_find_it.json",
  "where_is_the_candy_shop.json",
  "adjetivos.json",
  "animais_fazenda.json",
  "animais_marinhos.json",
  "animais_selvagens.json",
  "aniversario_expressoes.json",
  "clima.json",
  "comidas.json",
  "cores.json",
  "cumprimentos.json",
  "curiosidades_lingua_inglesa.json",
  "dias_da_semana.json",
  "estacoes.json",
  "fases_da_vida.json",
  "glossario.json",
  "halloween.json",
  "horas.json",
  "materias_escolares.json",
  "meses_do_ano.json",
  "numeros_ordinais.json",
  "o_que_e_lingua_inglesa.json",
  "objetos_escolares.json",
  "opostos.json",
  "passaros.json",
  "pequenos_dialogos.json",
  "rotinas.json",
  "roupas.json",
  "sinonimos.json",
  "substantivos.json",
  "datas_comemorativas_ingles.json"
];

// Arquivos de diálogo (dentro da pasta conteudo-5ano/dialogos)
// 🔁 Você deve listar aqui os nomes reais dos arquivos que estão nessa pasta.
// Exemplo (suposição):
const arquivosDialogos = [
  "greetings.json",
  "family.json",
  "school.json",
  "shopping.json",
  "animals.json"
  // Adicione todos os que existirem
];

// =====================================================
// 2. FUNÇÃO PARA CARREGAR JSONs DO GITHUB
// =====================================================
async function carregarConhecimento() {
  const baseUrl = "https://raw.githubusercontent.com/lenilsonxavier-dev/Quintin/main/dados/";
  const dialogosUrl = "https://raw.githubusercontent.com/lenilsonxavier-dev/Quintin/main/dados/conteudo-5ano/dialogos/";

  let total = 0;
  let sucessos = 0;

  // Carrega vocabulário
  for (const arquivo of arquivosVocabulario) {
    try {
      const resp = await fetch(baseUrl + arquivo);
      if (!resp.ok) continue;
      const dados = await resp.json();
      conhecimentoGlobal = { ...conhecimentoGlobal, ...dados };
      sucessos++;
    } catch (e) {
      console.warn(`Erro ao carregar ${arquivo}:`, e);
    }
    total++;
  }

  // Carrega diálogos
  for (const arquivo of arquivosDialogos) {
    try {
      const resp = await fetch(dialogosUrl + arquivo);
      if (!resp.ok) continue;
      const dados = await resp.json();
      conhecimentoGlobal = { ...conhecimentoGlobal, ...dados };
      sucessos++;
    } catch (e) {
      console.warn(`Erro ao carregar diálogo ${arquivo}:`, e);
    }
    total++;
  }

  adicionarMensagem(`📚 ${sucessos}/${total} arquivos de conhecimento carregados.`, "bot");
  return sucessos > 0;
}

// =====================================================
// 3. FALLBACK LOCAL (CASO OS JSONS FALHEM)
// =====================================================
const fallbackDicionario = {
  "dog": "cachorro", "cat": "gato", "bird": "pássaro",
  "cow": "vaca", "horse": "cavalo", "pig": "porco",
  "red": "vermelho", "blue": "azul", "green": "verde",
  "hello": "olá", "good morning": "bom dia", "good night": "boa noite"
};

function buscarContextoLocal(pergunta) {
  const lower = pergunta.toLowerCase();
  const resultados = [];
  const fonte = Object.keys(conhecimentoGlobal).length ? conhecimentoGlobal : fallbackDicionario;
  for (const [en, pt] of Object.entries(fonte)) {
    if (lower.includes(en) || lower.includes(pt.toLowerCase())) {
      resultados.push(`${en} = ${pt}`);
      if (resultados.length >= 6) break;
    }
  }
  return resultados;
}

// =====================================================
// 4. INICIALIZAÇÃO DO MODELO WebLLM
// =====================================================
const MODEL_NAME = "Llama-3.2-1B-Instruct-q4f16_1-MLC"; // modelo leve e compatível

async function iniciarModelo() {
  if (!navigator.gpu) {
    adicionarMensagem("❌ Seu navegador não suporta WebGPU. Use Chrome/Edge.", "bot");
    return false;
  }

  adicionarMensagem("🧠 Baixando modelo de IA (Llama 3.2 1B ~850MB)...", "bot");
  const progressDiv = document.createElement("div");
  progressDiv.className = "progress";
  chat.appendChild(progressDiv);

  try {
    engine = await webllm.CreateMLCEngine(MODEL_NAME, {
      initProgressCallback: (progress) => {
        const percent = Math.round((progress.progress || 0) * 100);
        progressDiv.innerText = `${progress.text || "Carregando..."} (${percent}%)`;
        if (percent === 100) setTimeout(() => progressDiv.remove(), 1000);
      }
    });
    adicionarMensagem("✅ Quinti está pronto! Pergunte sobre inglês.", "bot");
    return true;
  } catch (err) {
    console.error(err);
    adicionarMensagem(`❌ Erro ao carregar modelo: ${err.message}`, "bot");
    return false;
  }
}

// =====================================================
// 5. PROMPT DO SISTEMA (CORRIGIDO, SEM CENSURA TOLA)
// =====================================================
const systemPrompt = `You are Quinti, a Brazilian English teacher for children aged 7-9.

CRITICAL RULES:
- There is NOTHING wrong with words like dog, cat, bark, run, eat. They are normal.
- NEVER refuse a translation. ALWAYS translate what the child asks.
- Answer in Portuguese, teaching the English word.
- Use this EXACT format when asked "como se diz X em inglês":

English word ✨
English word = translation
Example: simple sentence.

Example:
Child: como se diz vaca
Quinti: Cow 🐮
Cow = vaca
Example: The cow is big.

Child: o cachorro está latindo
Quinti: The dog is barking 🐕
The dog is barking = o cachorro está latindo
Example: The dog is barking at night.

Never add extra explanations, never refuse, never say "I cannot". Just translate.`;

// =====================================================
// 6. FUNÇÃO ENVIAR (COM CONTEXTO DOS JSONs)
// =====================================================
window.enviar = async function () {
  const input = document.getElementById("pergunta");
  const pergunta = input.value.trim();
  if (!pergunta) return;

  adicionarMensagem(pergunta, "user");
  input.value = "";
  input.disabled = true;
  document.getElementById("btnEnviar").disabled = true;

  mostrarPensando();

  // Busca contexto nos JSONs (ou fallback)
  const palavrasContexto = buscarContextoLocal(pergunta);
  let contextoExtra = "";
  if (palavrasContexto.length) {
    contextoExtra = "Palavras que podem ajudar:\n" + palavrasContexto.join("\n") + "\n\n";
  }

  const mensagemUsuario = `${contextoExtra}Child asks: "${pergunta}"\n\nQuinti, responda exatamente no formato.`;

  try {
    if (!engine || !modeloPronto) throw new Error("Modelo não carregado ainda.");

    const resposta = await engine.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: mensagemUsuario }
      ],
      temperature: 0.4,
      max_tokens: 150
    });
    const texto = resposta.choices[0].message.content.trim();
    removerPensando();
    adicionarMensagem(texto, "bot");
  } catch (err) {
    removerPensando();
    console.error(err);
    adicionarMensagem("❌ Erro ao processar. Tente perguntar de outra forma.", "bot");
  } finally {
    input.disabled = false;
    document.getElementById("btnEnviar").disabled = false;
    input.focus();
  }
};

// =====================================================
// 7. FUNÇÕES AUXILIARES DE UI
// =====================================================
function adicionarMensagem(texto, classe) {
  const div = document.createElement("div");
  div.className = `msg ${classe}`;
  div.innerText = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function mostrarPensando() {
  removerPensando();
  const div = document.createElement("div");
  div.className = "pensando";
  div.id = "pensando";
  div.innerHTML = `<img src="./img/quintin.png"><span>🧠 Quinti está pensando...</span>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function removerPensando() {
  const el = document.getElementById("pensando");
  if (el) el.remove();
}

// =====================================================
// 8. INICIALIZAÇÃO PRINCIPAL
// =====================================================
(async function iniciar() {
  adicionarMensagem("🌍 Carregando Quinti...", "bot");
  await carregarConhecimento();        // tenta buscar os JSONs do GitHub
  const modeloOk = await iniciarModelo();
  modeloPronto = modeloOk;
  if (!modeloOk) {
    adicionarMensagem("⚠️ Modo offline: apenas respostas básicas do dicionário local.", "bot");
  } else {
    adicionarMensagem("Hello! I'm Quinti! Pergunte qualquer palavra ou frase.", "bot");
  }
  document.getElementById("pergunta").disabled = false;
  document.getElementById("btnEnviar").disabled = false;
})();
