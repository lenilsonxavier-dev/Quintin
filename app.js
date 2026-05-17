const chat = document.getElementById("chat");

let memoria = [];

// ========= CONFIGURAÇÃO WEBLLM LOCAL =========
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

let engine = null;

const MODEL = "Llama-3.2-3B-Instruct-q4f16_1";

// =================================================

// ADICIONA MENSAGENS
function adicionarMensagem(texto, classe) {
  const div = document.createElement("div");
  div.className = "msg " + classe;
  div.innerText = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// MOSTRA "PENSANDO"
function mostrarPensando(){
  removerPensando();
  const div = document.createElement("div");
  div.className = "pensando";
  div.id = "pensando";
  div.innerHTML = `
    <img src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png">
    <span>🧠 Quinti está pensando...</span>
  `;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// REMOVE "PENSANDO"
function removerPensando(){
  const pensando = document.getElementById("pensando");
  if(pensando){
    pensando.remove();
  }
}

// INICIAR (sem teste do Ollama)
async function iniciar() {
  // loading inicial
  const loading = document.createElement("div");
  loading.className = "msg bot";
  loading.id = "loading";
  loading.innerText = "🌍 Loading Quinti...";
  chat.appendChild(loading);

  // ========= LISTA DE ARQUIVOS JSON =========
const arquivos = [
  
  // Conversação
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

  // Vocabulário
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
  
// =========================================

  let conhecimento = {};
  // INICIA WEBLLM
try {
  adicionarMensagem("🧠 Carregando cérebro do Quinti...", "bot");

  engine = new webllm.MLCEngine();

  await engine.reload(MODEL);

  adicionarMensagem("✅ Quinti está pronto!", "bot");

} catch (erro) {
  console.error("Erro WebLLM:", erro);
  adicionarMensagem("❌ Seu navegador não suportou WebLLM.", "bot");
}

  // CARREGA JSONS
  for (const arquivo of arquivos) {
    try {
      const resposta = await fetch(arquivo);
      if (!resposta.ok) continue;
      const json = await resposta.json();
      conhecimento = { ...conhecimento, ...json };
    } catch (e) {
      console.warn(`Erro ao carregar ${arquivo}:`, e);
    }
  }

  // Remove loading e mostra saudação
  const loadingEl = document.getElementById("loading");
  if (loadingEl) loadingEl.remove();

  adicionarMensagem("Hello! I'm Quinti!", "bot");

  // FUNÇÃO ENVIAR (agora usando Groq)
  window.enviar = async function () {
    const input = document.getElementById("pergunta");
    const pergunta = input.value.trim();
    if (!pergunta) return;

    adicionarMensagem(pergunta, "user");
    memoria.push({ role: "user", content: pergunta });
    input.value = "";

    mostrarPensando();

    // CONTEXTO DOS JSONS
    let contexto = "";
    for (const chave in conhecimento) {
      if (pergunta.toLowerCase().includes(chave.toLowerCase())) {
        contexto += `Word: ${chave}\nMeaning: ${conhecimento[chave]}\n`;
      }
    }

    // System prompt (exatamente o mesmo conteúdo, sem duplicações)
    const systemPrompt = `
You are Quinti 🌍
You are ONLY Quinti.
You are NOT an AI assistant.
Never say you are an AI.
Never break character.
Always act like a children's English teacher.

You are a Brazilian elementary English teacher
for children aged 7 to 9.

IMPORTANT RULES:

- Teach basic English only.
- Always answer like a calm teacher.
- Never speak like a teenager.
- Never use slang.
- Never say:
  "Yo"
  "What's up"
  "baby"
  or internet expressions.
- Never invent conversations.
- Never ignore the child's question.
- Always help in Portuguese when necessary.
- Use short answers.
- Teach step by step.
- Use simple vocabulary.
- Use at most 1 emoji sometimes.

VERY IMPORTANT:

If the child asks:
"como se diz X em inglês"
or
"o que é X em inglês"

Always answer in this format:

English word ✨

English word = tradução

Example:
Simple sentence.

GOOD EXAMPLES:

Child:
hello

Answer:
Hello 🌟

Hello = olá

How are you?

---

Child:
Eu quero aprender inglês

Answer:
Yay! 🌈

Vamos aprender juntos!

English = inglês

Hello = olá

Can you say:
"Hello"?

---

Child:
How are you?

Answer:
I am happy 🌈

How are you?
=
Como você está?

---

Child:
dog

Answer:
Dog 🐶

Dog = cachorro

Example:
I like dogs.

---

Child:
i like dogs

Answer:
Great 🌈

"I like dogs"
=
"Eu gosto de cachorros"

IMPORTANT:
Never ask about family.
Never invent personal questions.
Never behave like social media.
Stay focused on English teaching only.
- Stay focused.
- Be educational.
- Be gentle.
- Be child-friendly.
- Never act like social media.
`;

    const userMessage = `
Context (vocabulary that may help):
${contexto || "No specific vocabulary found."}

Child: ${pergunta}
Quinti:
`;

        try {

  const resposta = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userMessage
      }
    ],
    temperature: 0.7,
    max_tokens: 300
  });

  const texto = resposta.choices[0].message.content.trim();

  removerPensando();

  adicionarMensagem(texto, "bot");

  memoria.push({
    role: "assistant",
    content: texto
  });

} catch (err) {

  removerPensando();

  console.error(err);

  adicionarMensagem(
    "❌ Quinti não conseguiu pensar localmente.",
    "bot"
  );
}

iniciar();
