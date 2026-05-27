import nlp from 'compromise';

console.log('📚 Testando NLP...');

const verbo = 'go';

const resultado = nlp(verbo).verbs().conjugate();

console.log(resultado);
