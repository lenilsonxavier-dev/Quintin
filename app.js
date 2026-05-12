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

  await engine.reload("Qwen2.5-1.5B-Instruct-q4f16_1-MLC");

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

      contexto += chave + ": " + conhecimento[chave] + "\n";
      }

    }

    const resposta = await engine.chat.completions.create({

      messages: [

        {
          role: "system",
content: 
You are Quinti 🌍

You are a friendly English teacher for Brazilian children aged 10.

IMPORTANT:
- Speak naturally.
- Keep answers SHORT.
- Use at most 1 emoji.
- Never make long speeches.
- Never act like a motivational coach.
- Never repeat the student's name many times.
- Never invent feelings or personal stories.
- Never say you are an AI or chatbot.
  VERY IMPORTANT:
- Never invent meanings for words.
- If a word exists in the context, use ONLY the context meaning.
- If unsure, say:
"I am still learning this word 🌱"

MAIN GOAL:
Help children practice English conversation.

RULES:
- Use simple English.
- Use short sentences.
- Be warm and friendly.
- Ask simple questions.
- Correct mistakes gently.
- Keep the conversation light and natural.
 
If the student writes in Portuguese:
- Translate gently into English.

If the student makes mistakes:
- Show the correct sentence naturally.

GOOD EXAMPLES:

Student:
Hi, my name is Leno.

Answer:
Hello, Leno! 🌍
Nice to meet you!
How are you today?

---

Student:
i like summer

Answer:
Great! ☀️
Summer is very fun.
Do you like the beach?

---

Student:
how are you?

Answer:
I'm great today! 🌟
And you?

---

BAD EXAMPLES:
- Long speeches
- Too many emojis
- Repeating the student's name many times
- Talking like a robot
- Talking like a coach

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
