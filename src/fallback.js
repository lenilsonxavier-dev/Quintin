// ========================================
// NOVO FALLBACK ENGINE - Usando browser-llm-engine
// ========================================

import { createLlmEngine } from 'https://esm.run/browser-llm-engine@0.1.3';

// Modelo ultra-leve para fallback (CPU) - Usando um modelo menor e mais rápido
const FALLBACK_MODEL_URL = 'https://huggingface.co/lm-models/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf';

let fallbackEngine = null;
let usandoFallback = false;

// ... (as funções detectarHardware, verificarWebGPU, etc. permanecem iguais) ...

export async function iniciarFallback(callbackProgresso) {
    if (fallbackEngine) return fallbackEngine;
    
    usandoFallback = true;
    
    callbackProgresso?.({ text: "🔄 Iniciando modo compatível...", progress: 0 });
    
    try {
        // 1. Criar a engine, que já gerencia o wllama pra gente
        const llm = createLlmEngine();
        
        callbackProgresso?.({ text: "📦 Preparando o motor do Quinti (WASM)...", progress: 0.3 });
        
        // 2. Carregar o modelo direto da URL
        //    O download é feito uma vez e fica salvo no cache do navegador!
        await llm.loadModel(FALLBACK_MODEL_URL, {
            progressCallback: ({ loaded, total }) => {
                if (total) {
                    const progress = 0.3 + (loaded / total) * 0.7;
                    callbackProgresso?.({
                        text: `📥 Baixando modelo leve... ${Math.round(progress * 100)}%`,
                        progress
                    });
                }
            },
            // Isso aqui é mágica: usa o sistema de arquivos do navegador pra não baixar de novo
            useCache: true
        });
        
        fallbackEngine = llm;
        callbackProgresso?.({ text: "✨ Quinti está pronto (modo compatível)!", progress: 1 });
        
        return fallbackEngine;
        
    } catch (error) {
        console.error("Erro no fallback com browser-llm-engine:", error);
        throw new Error("Não foi possível carregar o Quinti neste navegador");
    }
}

// ... (as funções isUsandoFallback e getNavegadorInfo permanecem iguais) ...

export async function perguntarFallback(messages, callbackToken) {
    if (!fallbackEngine) {
        throw new Error("Fallback não inicializado");
    }
    
    // O 'browser-llm-engine' já formata o prompt para nós!
    const formattedPrompt = fallbackEngine.formatChat(messages);
    
    let resposta = "";
    
    // A API é super simples: só chamar e ir recebendo os tokens
    await fallbackEngine.createCompletion(formattedPrompt, {
        nPredict: 150,
        sampling: { temp: 0.7 },
        onNewToken: (token) => {
            resposta += token;
            callbackToken?.(token);
        }
    });
    
    // Cleanup básico para manter o padrão Quinti
    let respostaFinal = resposta.trim();
    if (!respostaFinal) {
        respostaFinal = "✨ Tell me more, little star! ✨";
    }
    if (respostaFinal.length > 300) {
        respostaFinal = respostaFinal.substring(0, 300) + "...";
    }
    
    return respostaFinal;
}
