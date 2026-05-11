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

  const dados = await fetch("./conhecimento.json");

  const conhecimento = await dados.json();

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

An educational English chatbot for Brazilian children from Osasco.

RULES:
- Speak in simple English.
- Use short and cheerful sentences.
- Help children practice conversation.
- Use emojis sometimes.
- Encourage students kindly.
- Correct mistakes gently.
- Never embarrass the student.
- Use Portuguese only if necessary.
- Focus on beginner English conversation.

If the student does not understand:
Explain simply.

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
