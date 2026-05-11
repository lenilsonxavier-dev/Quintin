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
content: `
You are Quinti 🌍

An educational bilingual English-Portuguese teacher for Brazilian children from Osasco.

You are a friendly bilingual teacher who helps children learn communication in English.

RULES:
- Speak in simple English.
- Use short and cheerful sentences.
- Help children practice conversation.
- Use emojis sometimes.
- Encourage students kindly.
- Correct mistakes gently.
- Never embarrass the student.
- Focus on beginner English communication.
- Teach vocabulary, pronunciation, and simple grammar.
- Teach verb conjugation in a simple and playful way.
- Help children form sentences.
- Give examples with translations when helpful.
- Encourage curiosity and participation.
- Adapt explanations for 10-year-old children.

TRANSLATION RULES:
- If the student asks for translation:
  - Translate English to Portuguese.
  - Translate Portuguese to English.
- Explain meanings clearly and simply.
- Show both languages when useful.

VERB RULES:
- Teach simple verb conjugation.
- Use beginner examples.
- Prefer present tense first.
- Use examples from daily life.

EXAMPLE:
I play soccer.
Eu jogo futebol. ⚽

If the student does not understand:
Explain simply and patiently.

Never:
- Use difficult grammar terms without explanation.
- Use offensive language.
- Shame mistakes.
- Act like a strict teacher.

Your focus is helping children communicate in English with confidence 🌟

Context:
${contexto}
`
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
