import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const chat = document.getElementById("chat");

let memoria = [];

function adicionarMensagem(texto, classe) {

  const div = document.createElement("div");

  div.className = "msg " + classe;

  div.innerText = texto;

  chat.appendChild(div);

  chat.scrollTop = chat.scrollHeight;
}

const engine = new webllm.MLCEngine();

async function iniciar() {

  adicionarMensagem("Loading Quinti 🌍...", "bot");

  await engine.reload("Qwen2.5-0.5B-Instruct-q4f16_1-MLC");

  adicionarMensagem("Hello! I'm Quinti 🌍", "bot");

  const arquivos = [

  "./dados/greetings.json",
  "./dados/colors.json",
  "./dados/wild_animals.json",
  "./dados/sea_animals.json",
  "./dados/farm_animals.json",
  "./dados/foods.json",
  "./dados/school_objects.json",
  "./dados/days_of_week.json",
  "./dados/months_of_year.json",
  "./dados/ordinal_numbers.json",
  "./dados/commemorative_dates.json",
  "./dados/birthday_expressions.json",
  "./dados/hours.json",
  "./dados/daily_routine.json",
  "./dados/small_dialogues.json",
  "./dados/clothes.json",
  "./dados/weather.json",
  "./dados/halloween.json",
  "./dados/seasons.json"

];

let conhecimento = {};

for (const arquivo of arquivos) {

  const resposta = await fetch(arquivo);

  const json = await resposta.json();

  conhecimento = {
    ...conhecimento,
    ...json
  };

}

  window.enviar = async function () {

    const input = document.getElementById("pergunta");

    const pergunta = input.value.trim();

    if (!pergunta) return;

    adicionarMensagem(pergunta, "user");

    memoria.push({
      role: "user",
      content: pergunta
    });

    input.value = "";

    let contexto = "";

    for (const chave in conhecimento) {

      if (pergunta.toLowerCase().includes(chave.toLowerCase())) {

        contexto += conhecimento[chave] + "\n";
      }
    }

    const resposta = await engine.chat.completions.create({

      messages: [

         {
  role: "system",
 content: `
You are Quinti 🌍

You are a friendly bilingual English-Portuguese teacher for Brazilian children aged 10.

IMPORTANT:
- Always answer like a warm elementary school teacher.
- Never answer like an AI assistant manual.
- Never describe yourself as a chatbot or artificial intelligence.
- Always stay in character as Quinti.

MAIN GOAL:
Help children communicate in English with confidence.

RULES:
- Use simple English.
- Use short sentences.
- Use cheerful language.
- Use emojis sometimes.
- Encourage children kindly.
- Correct mistakes gently.
- Never embarrass students.
- Focus on communication first.

TRANSLATION:
- Translate Portuguese to English when asked.
- Translate English to Portuguese when asked.
- Give clear and direct translations.

EXAMPLES:

User:
Como se diz verão em inglês?

Answer:
Verão em inglês é:
Summer ☀️

Example:
I like summer.
Eu gosto do verão.

---

User:
I dream i speak english

Answer:
Great! 🌟

Correct sentence:
"I dream of speaking English."

Portuguese:
"Eu sonho em falar inglês."

---

User:
Quinti how are you?

Answer:
I'm great today! 🌍✨
How are you?

---

VERB TEACHING:
- Teach simple verb conjugation.
- Prefer present tense.
- Use examples from daily life.

If something is incorrect:
- Correct kindly.
- Explain simply.

Never invent meanings.
If unsure, say:
"Let's learn this together 🌱"

Context:
${contexto}

},

        ...memoria

      ]

    });

    const texto = resposta.choices[0].message.content;

    adicionarMensagem(texto, "bot");

    memoria.push({
      role: "assistant",
      content: texto
    });

  };

}

iniciar();
