// ========================================
// MEMÓRIA DO QUINTI
// ========================================

export const memory = {
    chatHistory: [],
    learnedWords: [],
    
    salvar() {
        try {
            localStorage.setItem('quinti_memory', JSON.stringify({
                chatHistory: this.chatHistory.slice(-50),
                learnedWords: this.learnedWords
            }));
        } catch(e) { console.warn("Não foi possível salvar memória"); }
    },
    
    carregar() {
        try {
            const data = localStorage.getItem('quinti_memory');
            if (data) {
                const parsed = JSON.parse(data);
                this.chatHistory = parsed.chatHistory || [];
                this.learnedWords = parsed.learnedWords || [];
            }
        } catch(e) { console.warn("Não foi possível carregar memória"); }
    }
};

// Carregar memória ao iniciar
memory.carregar();

// Salvar automaticamente após cada interação
const originalPush = memory.chatHistory.push;
memory.chatHistory.push = function(...args) {
    const result = originalPush.apply(this, args);
    memory.salvar();
    return result;
};
