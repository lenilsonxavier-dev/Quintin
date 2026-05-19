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
      // GLOSSARY STRUCTURE
      // ========================================

      if (data.glossary) {

        knowledgeBase.glossary =
          data.glossary;
      }

      // ========================================
      // NORMAL JSON
      // ========================================

      else {

        Object.assign(
          knowledgeBase,
          data
        );
      }

      console.log(
        `✅ ${arquivo}`
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

  return knowledgeBase;
}
