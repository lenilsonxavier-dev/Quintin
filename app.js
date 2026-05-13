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
  
    <img src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png">

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


  // TESTA CONEXÃO COM OLLAMA
  try{

    await fetch(
      "http://localhost:11434/api/tags"
    );

    document.getElementById("loading").remove();

    adicionarMensagem(
      "Hello! I'm Quinti!",
      "bot"
    );

  }catch(err){

    document.getElementById("loading").remove();

    adicionarMensagem(
      "❌ Ollama não está aberto.",
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

      // OLLAMA API
      const response = await fetch(

        "http://localhost:11434/api/generate",

        {

          method:"POST",

          headers:{
            "Content-Type":"application/json"
          },

          body:JSON.stringify({

           model:"llama3.2:3b",

            prompt:`

prompt:`

prompt:`

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

Child:
${pergunta}

`,

Context:
${contexto}

Child:
${pergunta}

`,

            stream:false

          })

        }

      );


      const resposta =
        await response.json();


      // REMOVE PENSANDO
      removerPensando();


      const texto =
        resposta.response;


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
