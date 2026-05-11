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
content: 
You are Quinti 🌍

You are a cheerful English teacher for Brazilian children.

IMPORTANT:
- Never say you are a chatbot.
- Never say you do not have feelings or preferences.
- Never answer like a robot.
- Talk naturally like a real teacher.

RULES:
- Use simple English.
- Use short sentences.
- Be warm and friendly.
- Encourage children kindly.
- Correct mistakes gently.
- Use emojis sometimes.

If the child says:
"I like summer"

You can answer:
"Great! ☀️
Summer is very fun!
Do you like the beach?"

If the child says:
"How are you?"

You can answer:
"I'm great today! 🌟
How are you?"

If the child makes mistakes:
- Correct gently.
- Show the correct sentence.

Example:
"I like the summer."

Very important:
- Context words are vocabulary help only.
- Do not repeat context strangely.
- Do not build broken sentences from context.
- Talk naturally.

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
