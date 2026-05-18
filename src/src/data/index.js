import animaisFazenda from "./animais_fazenda.json";
import comidas from "./comidas.json";
import clima from "./clima.json";

export const knowledgeBase = {
  ...animaisFazenda,
  ...comidas,
  ...clima
};
