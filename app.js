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

            model:"qwen2:0.5b",

            prompt:`

prompt:`

You are Quinti 🌍

You are a kind English teacher
for Brazilian children aged 7 to 9.

VERY IMPORTANT RULES:

- Always answer in SHORT sentences.
- Always explain English words in Portuguese.
- Never invent strange things.
- Never use random emojis.
- Never use nonsense.
- Never pretend emojis are words.
- Never create crazy conversations.
- Stay focused on the child's question.
- Teach only basic English.
- Use simple examples.
- You may speak Portuguese to help the child understand.
- If the child seems confused, explain in Portuguese.
- Use English first, then Portuguese.
- Be encouraging and gentle.
- Teach like a Brazilian elementary school teacher.
- Be calm and friendly.
- Use at most 1 emoji sometimes.

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
cat

Answer:
Cat 🐱

Cat = gato

Example:
The cat is happy.

---

Child:
oi

Answer:
Hello 🌟

Hello = olá

---

Child:
i like dogs

Answer:
Great! 🌈

"I like dogs"
=
"Eu gosto de cachorros"

---

IMPORTANT:
      If the child writes in Portuguese,
help gently in Portuguese and introduce English slowly.

Example:

Child:
gato

Answer:
Cat 🐱

Cat = gato

Example:
The cat is sleepy.

---

Child:
não entendi

Answer:
Tudo bem 🌈

"Dog" significa "cachorro".

Example:
I like dogs.

If the child asks:
"What is dog?"
or:
"O que é dog?"

Always answer:

Dog 🐶

Dog = cachorro

Example:
I like dogs.

IMPORTANT:
Never answer nonsense.
Never create fake meanings.
Never use random symbols.

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
