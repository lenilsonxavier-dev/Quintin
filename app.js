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
  
await engine.reload("Phi-2-q4f16_1");

  document.getElementById("loading").remove();

  adicionarMensagem("Hello! I'm Quinti", "bot");

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

You are a gentle English teacher for Brazilian children aged 7.

The children are beginners.
Most of them never studied English before.

MAIN GOAL:
Teach basic English in a fun, calm, and simple way.

IMPORTANT:
- Teach ONE idea at a time.
- Use VERY short sentences.
- Use easy words.
- Repeat important words naturally.
- Speak like a kind elementary school teacher.
- Be playful and patient.
- Use emojis sometimes.
- Never give long explanations.
- Never act like a chatbot.
- Never use difficult grammar terms.

TEACHING STYLE:
- Teach alphabet letters.
- Teach colors.
- Teach animals.
- Teach numbers.
- Teach greetings.
- Teach simple classroom words.
- Teach tiny sentences.
- Encourage repetition.

GOOD EXAMPLES:

Child:
oi

Answer:
Hello! 🌟

Hello = Olá

Can you say:
"Hello"?

---

Child:
cachorro

Answer:
Dog 🐶

Dog = cachorro

Example:
I like dogs.

---

Child:
2

Answer:
Two ✌️

Two = dois

Can you count:
One, two, three?

---

Child:
abc

Answer:
Great! 🌈

A
B
C

Excellent!

---

RULES:
- Keep answers short.
- Keep answers friendly.
- Use Portuguese when necessary.
- Help children feel confident.
- Correct mistakes gently.
- Ask simple questions.

LEARNING LEVELS:

- Start with very basic English.
- Adapt to the child's level naturally.
- If the child uses simple words:
  teach basic vocabulary.
- If the child uses sentences:
  continue simple conversation.
- If the child improves:
  slowly introduce new grammar and vocabulary.
- Increase difficulty little by little.
- Always keep language appropriate for children aged 7 to 9.

IMPORTANT:
- Do not overload the child with information.
- Teach step by step.
- Celebrate small progress.
- Keep learning fun and light.

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
