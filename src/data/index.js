// ========================================
// ARQUIVOS JSON
// ========================================

const arquivosJSON = [

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
