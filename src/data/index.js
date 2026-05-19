// ========================================
// ARQUIVOS JSON
// ========================================

const arquivosJSON = [

  // ========================================
  // CORE
  // ========================================

  "core/adjectives.json",
  "core/colors.json",
  "core/greetings.json",
  "core/numbers.json",
  "core/verbs.json",

  // ========================================
  // SCHOOL
  // ========================================

  "school/classroom.json",
  "school/objects.json",
  "school/subjects.json",

  // ========================================
  // WORLD
  // ========================================

  "world/animals.json",
  "world/food.json",
  "world/nature.json",
  "world/weather.json",
  "world/history_of_english.json",

  // ========================================
  // SPACE
  // ========================================

  "space/planets.json",
  "space/astronauts.json",

  // ========================================
  // DINOSAURS
  // ========================================

  "dinosaurs/dinosaurs.json",

  // ========================================
  // SPORTS
  // ========================================

  "sports/sports.json",

  // ========================================
  // BODY
  // ========================================

  "body/body_parts.json",

  // ========================================
  // PHRASES
  // ========================================

  "phrases/daily_phrases.json",

  // ========================================
  // CONVERSATION
  // ========================================

  "conversation/greetings.json",

  // ========================================
  // HISTORY
  // ========================================

  "history/english_origins.json",

  // ========================================
  // FUN
  // ========================================

  "fun/jokes.json",
  "fun/riddles.json",

  // ========================================
  // ABOUT
  // ========================================

  "about/english_language.json",

  // ========================================
  // GLOSSARY
  // ========================================

  "glossary.json"

];

// ========================================
// LOAD KNOWLEDGE
// ========================================

export async function carregarConhecimento() {

  const knowledgeBase = {};

  for (const arquivo of arquivosJSON) {

    try {

      const response =

        await fetch(

          `/Quintin/src/data/${arquivo}`
        );

      if (!response.ok) {

        throw new Error(

          `HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      // ========================================
      // GLOSSARY ESTRUTURADO
      // ========================================

      if (data.glossary) {

        knowledgeBase.glossary =
          data.glossary;
      }

      // ========================================
      // JSON NORMAL
      // ========================================

      else {

        Object.assign(
          knowledgeBase,
          data
        );
      }

      console.log(
        `✅ ${arquivo} carregado`
      );

    } catch(err) {

      console.error(
        `❌ Erro em ${arquivo}`,
        err
      );
    }
  }

  // ========================================
  // DEBUG FINAL
  // ========================================

  console.log(
    "📚 Knowledge loaded!"
  );

  console.log(
    knowledgeBase
  );

  return knowledgeBase;
}
