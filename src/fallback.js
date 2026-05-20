// ========================================
// FALLBACK ENGINE - Usando apenas Web-LLM
// Versão que funciona em qualquer navegador
// ========================================

import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// Modelo ultra-leve para fallback (funciona em CPU)
// Este é um modelo pequeno que roda até em computadores fracos
const MODELO_FALLBACK = "Llama-3.2-1B-Instruct-q3f16_1-MLC";

let fallbackEngine = null;
let usandoFallback = false;

// ========================================
// DETECTAR CAPACIDADES DO HARDWARE
// ========================================

export async function detectarHardware() {
    // Verificar se o navegador tem WebGPU (aceleração por placa de vídeo)
    let temWebGPU = false;
    let webGPUFuncional = false;
    
    if ('gpu' in navigator) {
        temWebGPU = true;
        try {
            const adapter = await navigator.gpu.requestAdapter();
            webGPUFuncional = !!adapter;
        } catch(e) {
            webGPUFuncional = false;
        }
    }
    
    // Verificar memória RAM aproximada
    const memoriaRAM = navigator.deviceMemory || 4; // Assume 4GB se não souber
    
    // Verificar número de núcleos de CPU
    const nucleosCPU = navigator.hardwareConcurrency || 2;
    
    // Decidir se deve usar fallback
    const precisaFallback = !webGPUFuncional || memoriaRAM < 4 || nucleosCPU < 4;
    
    return {
        temWebGPU: webGPUFuncional,
        memoriaRAM,
        nucleosCPU,
        precisaFallback,
        recomendacao: precisaFallback ? "fallback" : "webgpu"
    };
}

// ========================================
// INICIAR MODO FALLBACK (apenas CPU)
// ========================================

export async function iniciarFallback(callbackProgresso) {
    if (fallbackEngine) return fallbackEngine;
    
    usandoFallback = true;
    
    callbackProgresso?.({ 
        text: "⚡ Iniciando modo compatível (CPU)...", 
        progress: 0 
    });
    
    try {
        // Criar engine com configurações para CPU
        // O web-llm automaticamente usa WebAssembly se WebGPU não estiver disponível
        const engine = await webllm.CreateMLCEngine(
            MODELO_FALLBACK,
            {
                initProgressCallback: (progresso) => {
                    // Converter o progresso (0-1) para nosso formato
                    const progressoNumerico = typeof progresso.progress === 'number' 
                        ? progresso.progress 
                        : 0;
                    
                    callbackProgresso?.({ 
                        text: `🦉 ${progresso.text}`, 
                        progress: progressoNumerico 
                    });
                }
            }
        );
        
        fallbackEngine = engine;
        callbackProgresso?.({ 
            text: "✨ Quinti está pronto (modo compatível)!", 
            progress: 1 
        });
        
        return fallbackEngine;
        
    } catch (error) {
        console.error("Erro ao iniciar fallback:", error);
        throw new Error(`Não foi possível carregar o Quinti: ${error.message}`);
    }
}

// ========================================
// GERAR RESPOSTA NO MODO FALLBACK
// ========================================

export async function perguntarFallback(messages, callbackToken, maxTokens = 120) {
    if (!fallbackEngine) {
        throw new Error("Fallback não inicializado");
    }
    
    // Configurações mais conservadoras para CPU
    const configuracao = {
        messages: messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        top_p: 0.9,
        stream: true
    };
    
    let respostaCompleta = "";
    
    try {
        const stream = await fallbackEngine.chat.completions.create(configuracao);
        
        for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content || "";
            if (delta) {
                respostaCompleta += delta;
                callbackToken?.(delta);
            }
        }
        
        return respostaCompleta;
        
    } catch (error) {
        console.error("Erro ao gerar resposta no fallback:", error);
        throw error;
    }
}

// ========================================
// VERIFICAR SE ESTÁ USANDO FALLBACK
// ========================================

export function isUsandoFallback() {
    return usandoFallback;
}

// ========================================
// OBTER INFORMAÇÕES DO NAVEGADOR
// ========================================

export function getNavegadorInfo() {
    const userAgent = navigator.userAgent;
    
    let nome = "Outro";
    let versao = "0";
    let suporteWebGPU = false;
    
    if (userAgent.indexOf("Chrome") > -1 && userAgent.indexOf("Edg") === -1) {
        nome = "Chrome";
        const match = userAgent.match(/Chrome\/(\d+)/);
        versao = match ? match[1] : "0";
        suporteWebGPU = parseInt(versao) >= 113;
    } else if (userAgent.indexOf("Firefox") > -1) {
        nome = "Firefox";
        const match = userAgent.match(/Firefox\/(\d+)/);
        versao = match ? match[1] : "0";
        suporteWebGPU = parseInt(versao) >= 118;
    } else if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) {
        nome = "Safari";
        const match = userAgent.match(/Version\/(\d+)/);
        versao = match ? match[1] : "0";
        suporteWebGPU = false; // Safari precisa de flag experimental
    } else if (userAgent.indexOf("Edg") > -1) {
        nome = "Edge";
        const match = userAgent.match(/Edg\/(\d+)/);
        versao = match ? match[1] : "0";
        suporteWebGPU = parseInt(versao) >= 113;
    }
    
    return { nome, versao, suporteWebGPU };
}

// ========================================
// SUGERIR AÇÃO PARA MELHORAR PERFORMANCE
// ========================================

export function sugerirAcao(infoNavegador, precisaFallback) {
    if (!precisaFallback) return null;
    
    const { nome, versao, suporteWebGPU } = infoNavegador;
    
    if (!suporteWebGPU) {
        if (nome === "Chrome" || nome === "Edge") {
            return `💡 Atualize o ${nome} (versão 113+) para ativar o modo turbo!`;
        }
        if (nome === "Firefox") {
            return `💡 Atualize o Firefox (versão 118+) para melhor performance!`;
        }
        if (nome === "Safari") {
            return `💡 Para melhor performance, use Chrome ou Edge neste computador.`;
        }
        return `💡 Para melhor performance, use Chrome ou Edge atualizados.`;
    }
    
    if (infoNavegador.nome === "Safari") {
        return "💡 No Safari, ative 'Experimental WebGPU' no menu Develop para melhorar a velocidade.";
    }
    
    return "⚡ Modo compatível ativado - o Quinti funciona, mas pode ser um pouco mais lento.";
}
