const chat = document.getElementById("chat");

let memoria = [];


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
  
    <img src="https://i.imgur.com/oAteJWd.png">

    <span>
      🧠 Quinti está pensando...
    </span>
  
  `;

  chat.appendChild(div);

  chat.scrollTop = chat.scrollHeight;
}


// REMOVE "PENSANDO"
function removerPensando(){

  const pensando =
    document.getElementById("pensando");

  if(pensando){

    pensando.remove();
  }
}


// INICIAR
async function iniciar() {

  // loading inicial
  const loading = document.createElement("div");

  loading.className = "msg bot";

  loading.id = "loading";

  loading.innerText =
    "🌍 Loading Quinti...";

  chat.appendChild(loading);


  // TESTA CONEXÃO COM GPT4ALL
  try{

    await fetch("http://localhost:4891/v1/models");

    document.getElementById("loading").remove();

    adicionarMensagem(
      "🌈 Hello! I'm Quinti!",
      "bot"
    );

  }catch(err){

    document.getElementById("loading").remove();

    adicionarMensagem(
      "❌ GPT4All não está aberto.",
      "bot"
    );

    console.error(err);

    return;
  }


  // JSONS
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

  // CARREGA JSONS
  for (const arquivo of arquivos) {

    const resposta = await fetch(arquivo);

    const json = await resposta.json();

    conhecimento = {
      ...conhecimento,
      ...json
    };

  }


  // FUNÇÃO ENVIAR
  window.enviar = async function () {

    const input =
      document.getElementById("pergunta");

    const pergunta =
      input.value.trim();

    if (!pergunta) return;

    adicionarMensagem(
      pergunta,
      "user"
    );

    memoria.push({
      role: "user",
      content: pergunta
    });

    input.value = "";


    // MOSTRA PENSANDO
    mostrarPensando();


    // CONTEXTO DOS JSONS
    let contexto = "";

    for (const chave in conhecimento) {

      if (
        pergunta
        .toLowerCase()
        .includes(chave.toLowerCase())
      ) {

        contexto += `
Word: ${chave}
Meaning: ${conhecimento[chave]}
`;

      }

    }


    try{

      // GPT4ALL API
      const response = await fetch(

        "http://localhost:4891/v1/chat/completions",

        {

          method:"POST",

          headers:{
            "Content-Type":"application/json"
          },

          body:JSON.stringify({

          model:"Phi-3 Mini Instruct",

            messages:[

              {
                role:"system",

                content:`

You are Quinti 🌍

You are a gentle English teacher
for Brazilian children aged 7.

The children are beginners.

MAIN GOAL:
Teach English slowly and kindly.

RULES:
- Use short answers
- Use simple English
- Use emojis sometimes
- Be playful
- Be patient
- Teach one thing at a time
- Use Portuguese when necessary
- Never give long explanations

GOOD EXAMPLES:

Child:
dog

Answer:
Dog 🐶

Dog = cachorro

Example:
I like dogs.

---

Child:
hello

Answer:
Hello 🌟

Hello = olá

Can you say:
"Hello"?

---

Context:
${contexto}

`
              },

              ...memoria

            ],

            max_tokens:80,

            temperature:0.7

          })

        }

      );


      const resposta =
        await response.json();


      // REMOVE PENSANDO
      removerPensando();


      const texto =
        resposta
        .choices[0]
        .message
        .content;


      adicionarMensagem(
        texto,
        "bot"
      );


      memoria.push({

        role:"assistant",

        content:texto

      });


    }catch(err){

      removerPensando();

      adicionarMensagem(

        "❌ Quinti não conseguiu responder.",

        "bot"

      );

      console.error(err);
    }

  };

}

iniciar();
