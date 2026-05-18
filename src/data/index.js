const arquivosJSON = [

  "adjetivos.json",
  "animais_fazenda.json",
  "animais_marinhos.json",
  "animais_selvagens.json",
  "aniversario_expressoes.json",
  "clima.json",
  "comidas.json",
  "cores.json",
  "cumprimentos.json",
  "curiosidades_lingua_inglesa.json",
  "datas_cdatas_comemorativas_ingles.json",
  "dias_da_semana.json",
  "estacoes.json",
  "fases_da_vida.json",
  "glossario.json",
  "halloween.json",
  "horas.json",
  "materias_escolares.json",
  "meses_do_ano.json",
  "numeros_ordinais.json",
  "o_que_e_lingua_inglesa.json",
  "objetos_escolares.json",
  "opostos.json",
  "passaros.json",
  "pequenos_dialogos.json",
  "rotinas.json",
  "roupas.json",
  "sinonimos.json",
  "substantivos.json"

];

// ========================================
// CARREGAR BASE DE CONHECIMENTO
// ========================================

export async function carregarConhecimento() {

  const knowledgeBase = {};

  for (const arquivo of arquivosJSON) {

    try {

      // caminho absoluto para GitHub Pages
      const caminho =

        `/Quintin/src/data/${arquivo}`;

      const response =
        await fetch(caminho);

      // verifica erro HTTP
      if (!response.ok) {

        throw new Error(

          `HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      Object.assign(
        knowledgeBase,
        data
      );

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

  console.log(
    "📚 Total carregado:",
    Object.keys(knowledgeBase).length
  );

  return knowledgeBase;
}
