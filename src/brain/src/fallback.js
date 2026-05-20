// ========================================
// FALLBACK ENGINE - QUINTI
// Suporte para PCs sem WebGPU
// ========================================

import { Wllama } from "https://esm.run/@wllama/wllama";

// Modelo ultra-leve para fallback (CPU)
const FALLBACK_MODEL = "https://huggingface.co/TheBloke/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q3_K_S.gguf";

// Configuração do fallback
let fallbackEngine = null;
let usandoFallback = false;

// ========================================
// DETECTAR CAPACIDADES DO HARDWARE
// ========================================

export async function detectarHardware() {
    const hasWebGPU = 'gpu' in navigator;
    
    // Detectar RAM aproximada
    const memory = navigator.deviceMemory || 4; // GB
    
    // Detectar dispositivo móvel
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    
    // Verificar se WebGPU realmente funciona (alguns navegadores mentem)
    let webGPUFunctiona = false;
    if (hasWebGPU) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            webGPUFunctiona = !!adapter;
        } catch(e) {
            webGPUFunctiona = false;
        }
    }
    
    return {
        hasWebGPU: webGPUFunctiona,
        memory,
        isMobile,
        recomendacao: webGPUFunctiona && memory >= 4 ? "webgpu" : "fallback"
    };
}

// ========================================
// INICIAR MODO FALLBACK (WASM + CPU)
// ========================================

export async function iniciarFallback(callbackProgresso) {
    if (fallbackEngine) return fallbackEngine;
    
    usandoFallback = true;
    
    callbackProgresso?.({ text: "🔄 Modo compatibilidade ativado...", progress: 0 });
    
    try {
        // Criar instância do wllama
        const wllama = new Wllama();
        
        callbackProgresso?.({ text: "📦 Carregando modelo leve para CPU...", progress: 0.3 });
        
        // Inicializar com configurações para CPU
        await wllama.init({
            'n_threads': Math.max(1, (navigator.hardwareConcurrency || 2) - 1), // Deixa 1 core livre
            'n_ctx': 512, // Contexto menor para CPUs fracas
            'n_batch': 256
        });
        
        callbackProgresso?.({ text: "🧠 Carregando cérebro do Quinti (modo leve)...", progress: 0.6 });
        
        // Carregar modelo GGUF
        await wllama.loadModelFromUrl(FALLBACK_MODEL, {
            onProgress: ({ loaded, total }) => {
                const progress = 0.6 + (loaded / total) * 0.4;
                callbackProgresso?.({ text: `📥 Baixando modelo... ${Math.round(progress * 100)}%`, progress });
            }
        });
        
        fallbackEngine = wllama;
        callbackProgresso?.({ text: "✨ Quinti está pronto (modo compatível)!", progress: 1 });
        
        return fallbackEngine;
        
    } catch (error) {
        console.error("Erro no fallback:", error);
        throw new Error("Não foi possível carregar o Quinti neste navegador");
    }
}

// ========================================
// GERAR RESPOSTA NO FALLBACK
// ========================================

export async function perguntarFallback(messages, callbackToken) {
    if (!fallbackEngine) {
        throw new Error("Fallback não inicializado");
    }
    
    // Converter mensagens para formato do wllama
    const promptFormatado = formatarPromptFallback(messages);
    
    // Configurações mais conservadoras para CPU
    const generationConfig = {
        'n_predict': 120,
        'temperature': 0.7,
        'top_p': 0.9,
        'stop': ["\n\n", "User:", "Child:", "Human:"],
        'stream': true,
        'onToken': (token) => {
            callbackToken?.(token);
        }
    };
    
    let resposta = "";
    
    await fallbackEngine.generate(promptFormatado, (partialText) => {
        resposta = partialText;
        callbackToken?.(partialText);
    }, generationConfig);
    
    // Limpeza da resposta (tirar possíveis lixos)
    resposta = limparRespostaFallback(resposta);
    
    return resposta;
}

// ========================================
// FORMATAR PROMPT PARA FALLBACK
// ========================================

function formatarPromptFallback(messages) {
    // Encontrar system prompt
    const systemMsg = messages.find(m => m.role === "system");
    const chatHistory = messages.filter(m => m.role !== "system");
    
    let prompt = systemMsg?.content || "";
    prompt += "\n\n";
    
    for (const msg of chatHistory) {
        if (msg.role === "user") {
            prompt += `Child: ${msg.content}\n`;
        } else if (msg.role === "assistant") {
            prompt += `Quinti: ${msg.content}\n`;
        }
    }
    
    prompt += "Quinti: ";
    
    return prompt;
}

// ========================================
// LIMPAR RESPOSTA DO FALLBACK
// ========================================

function limparRespostaFallback(texto) {
    if (!texto) return "🦉 Oops! Can you say that again? ✨";
    
    // Remover partes indesejadas
    let limpo = texto
        .replace(/Child:.*$/gm, "")
        .replace(/Human:.*$/gm, "")
        .replace(/User:.*$/gm, "")
        .replace(/Quinti:\s*/g, "")
        .trim();
    
    // Garantir que não está vazio
    if (limpo.length === 0) {
        return "✨ Tell me more, little star! ✨";
    }
    
    // Limitar tamanho máximo
    if (limpo.length > 300) {
        limpo = limpo.substring(0, 300) + "...";
    }
    
    return limpo;
}

// ========================================
// VERIFICAR SE ESTÁ USANDO FALLBACK
// ========================================

export function isUsandoFallback() {
    return usandoFallback;
}
