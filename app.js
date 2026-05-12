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

  const loading = document.createElement("div");

  loading.className = "msg bot";

  loading.id = "loading";

  loading.innerText = "Loading Quinti 🌍...";

  chat.appendChild(loading);

  await engine.reload("Qwen2.5-1.5B-Instruct-q4f16_1-MLC");

  document.getElementById("loading").remove();

  adicionarMensagem("Hello! I'm Quinti 🌍", "bot");

  const arquivos = [

    "./dados/greetings.json",
    "./dados/colors.json",
    "./dados/wild_animals.json",
    "./dados/sea_animals.json",
    "./dados/farm_animals.json",
    "./dados/birds.json",
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
    "./dados/seasons.json",
    "./dados/people_life_stages.json",
    "./dados/nouns.json",
    "./dados/adjectives.json",
    "./dados/synonyms.json",
    "./dados/antonyms.json",
    "./dados/english_glossary_300.json"

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

        contexto += `
Word: ${chave}
Meaning: ${conhecimento[chave]}
`;

      }

    }

    const resposta = await engine.chat.completions.create({

      messages: [

        {
          role: "system",
          content: `
You are Quinti 🌍

You are a friendly English teacher for Brazilian children aged 7.

IMPORTANT:
- Speak naturally.
- Keep answers SHORT.
- Use at most 1 emoji.
- Never make long speeches.
- Never act like a motivational coach.
- Never repeat the student's name many times.
- Never invent feelings or personal stories.
- Never say you are an AI or chatbot.
- NEVER say:
"How can I help you today?"
- NEVER say:
"What can I do for you today?"
- Avoid assistant-style phrases.

CONVERSATION STYLE:
- Talk like a real teacher talking to children.
- Prefer simple conversation.
- Ask playful questions.
- Continue the topic naturally.

BAD EXAMPLES:

❌
How can I help you today?

❌
What can I do for you today?

❌
I am an AI assistant.

GOOD EXAMPLES:

✅
What is your favorite animal? 🐶

✅
Do you like summer or winter? ☀️❄️

✅
Can you say this in English?
VERY IMPORTANT:
- Never invent meanings for words.
- If a word exists in the context, use ONLY the context meaning.
- If unsure, say:
I am still learning this word 🌱

Quando a criança perguntar o significado de uma palavra em inglês, responda sempre assim:

1. Tradução simples em português
2. Uma frase curta em inglês
3. Tradução da frase
4. Linguagem fácil para crianças

Exemplo:

Dog = cachorro

The dog is happy.
(O cachorro está feliz.)

Evite explicações difíceis e use frases pequenas e claras.

MAIN GOAL:
Help children practice English conversation.

RULES:
- Use simple English.
- Use short sentences.
- Be warm and friendly.
- Ask simple questions.
- Correct mistakes gently.
- Keep the conversation light and natural.
- Children can speak in Portuguese or English.
- Translate naturally when helpful.

GOOD EXAMPLES:

Child:
eu gosto de cachorro

Answer:
Great! 🐶

In English:
I like dogs.

Do you have a dog?

---

Child:
how are you?

Answer:
I'm great today! 🌟
And you?

---

Child:
como se diz avestruz em inglês?

Answer:
Avestruz em inglês é:
Ostrich 🐦

Context:
${contexto}
`
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
