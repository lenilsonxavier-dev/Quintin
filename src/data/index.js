// ========================================
// ARQUIVOS JSON
// ========================================

const arquivosJSON = [

  // ========================================
  // CORE
  // ========================================

  "core/adjectives.json",
  "core/essential_verbs.json",
  "core/greetings.json",
  "core/nouns.json",
  "core/verbs.json",

  // ========================================
  // ABOUT
  // ========================================

  "about/english_language.json",

  // ========================================
  // BODY
  // ========================================

  "body/body_parts.json",

  // ========================================
  // CONVERSATION
  // ========================================

  "conversation/greetings.json",

  // ========================================
  // DINOSAURS
  // ========================================

  "dinosaurs/dinosaurs.json",

  // ========================================
  // FUN
  // ========================================

  "fun/jokes.json",
  "fun/riddles.json",

  // ========================================
  // PHRASES
  // ========================================

  "phrases/daily_phrases.json",

  // ========================================
  // SCHOOL
  // ========================================

  "school/classroom.json",
  // ========================================
  // SPACE
  // ========================================

  "space/astronauts.json",
  "space/planets.json",

  // ========================================
  // SPORTS
  // ========================================

  "sports/sports.json",

  // ========================================
  // WORLD
  // ========================================

  "world/animals.json",
  "world/food.json",
  "world/history_of_english.json",
  "world/nature.json",

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
      // GLOSSARY
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
        `❌ ${arquivo}`,
        err
      );
    }
  }

  console.log(
    "📚 Knowledge loaded!"
  );

  console.log(
    knowledgeBase
  );

  return knowledgeBase;
}
