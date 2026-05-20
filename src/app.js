// ========================================
// IMPORTS
// ========================================

import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import { carregarConhecimento } from "./data/index.js";
import { memory } from "./brain/memory.js";
import { detectarHardware, iniciarFallback, perguntarFallback, isUsandoFallback } from "./fallback.js";
import { verificarWebGPU, getNavegadorInfo, sugerirAcao } from "./webgpu-detector.js";

// ========================================
// CONFIG
// ========================================

// Modelo principal (WebGPU)
const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

// Modelo alternativo para fallback
const MODEL_ID_FALLBACK = "Llama-3.2-1B-Instruct-q3f16_1-MLC";

const MAX_HISTORY = 6;
const MAX_TOKENS = 120;
const TEMPERATURE = 0.7;

// ========================================
// DOM
// ========================================

const chat = document.getElementById("chat");
const inputPergunta = document.getElementById("pergunta");
const btnEnviar = document.getElementById("btnEnviar");
const statusEl = document.getElementById("status");
const progressBar = document.getElementById("progress");

inputPergunta.disabled = true;
btnEnviar.disabled = true;

// ========================================
// ESTADO
// ========================================

let engine = null;
let modeloOk = false;
let modeloPronto = false;
let modoFallback = false;
let hardwareInfo = null;

// ========================================
// MEMÓRIA
// ========================================

memory.chatHistory = memory.chatHistory || [];
memory.learnedWords = memory.learnedWords || [];

// ========================================
// SYSTEM PROMPT (igual ao seu)
// ========================================

const systemPrompt = `[seu system prompt existente - mantenha igual]`;

// ========================================
// UI HELPERS
// ========================================

function atualizarStatus(texto, progresso = null) {
    statusEl.textContent = texto;
    if (progresso !== null) {
        progressBar.style.width = `${progresso * 100}%`;
    }
}

function adicionarMensagem(texto, autor) {
    const div = document.createElement("div");
    div.className = `msg ${autor}`;
    div.textContent = texto;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
}

function mostrarPensando() {
    removerPensando();
    const div = document.createElement("div");
    div.className = "pensando";
    div.id = "pensando";
    div.innerHTML = `<span style="font-size: 32px;">🦉</span><span>Quinti is thinking...</span>`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function removerPensando() {
    const el = document.getElementById("pensando");
    if (el) el.remove();
}

// ========================================
// RESPOSTAS FIXAS (seu código existente)
// ========================================

const respostasFixas = {
    "hello": `👋 Hello, little star!\n\nWhat is YOUR name? ✨`,
    "hi": `🌟 Hi, friend!\n\nHow are you today?`,
    "good night": `🌙 Good night!\n\nSleep well, little star ✨`,
    "boa noite": `🌙 Good night!\n\nDid you learn a new word today? ✨`,
    "bye": `👋 Bye bye!\n\nSee you soon ✨`,
    "tchau": `👋 Bye bye!\n\nKeep practicing English 🌟`,
    "qual é o seu nome": `🦉 My name is Quinti!\n\nWhat is YOUR name? ✨`,
    "what is your name": `🦉 My name is Quinti! ✨`,
    "arte": `🎨 Art means arte!\n\nDo you like drawing? ✨`,
    "matemática": `➕ Math means matemática! ✨`,
    "português": `📚 Portuguese means português! ✨`,
    "bisavô": `👴 Great-grandfather means bisavô ✨`,
    "bisavó": `👵 Great-grandmother means bisavó ✨`,
    "nós somos felizes": `😊 We are happy ✨`,
    "nos somos felizes": `😊 We are happy ✨`,
    "verbo to be": `✨ TO BE means ser ou estar ✨`
};

function buscarGlossario(pergunta) {
    if (!window.conhecimentoGlobal?.glossary) return null;
    const texto = pergunta.toLowerCase().trim();
    const palavras = texto.split(/\s+/);
    
    for (const categoria of Object.values(window.conhecimentoGlobal.glossary)) {
        if (!categoria.words) continue;
        for (const item of categoria.words) {
            if (item.pt && palavras.includes(item.pt.toLowerCase())) {
                return `\n${item.emoji || "✨"}\n${item.en}\nmeans ${item.pt}\n${item.example_en || ""}\n${item.example_pt || ""}\n✨ Can you say "${item.en}" again?\n`;
            }
            if (item.en && palavras.includes(item.en.toLowerCase())) {
                return `\n${item.emoji || "✨"}\n${item.en}\nmeans ${item.pt}\n${item.example_en || ""}\n${item.example_pt || ""}\n✨ Do you like this word?\n`;
            }
        }
    }
    return null;
}

function respostaControlada(pergunta) {
    const texto = pergunta.toLowerCase().trim();
    for (const chave of Object.keys(respostasFixas)) {
        if (texto.includes(chave)) return respostasFixas[chave];
    }
    const glossario = buscarGlossario(pergunta);
    if (glossario) return glossario;
    return null;
}

// ========================================
// INICIAR MODELO COM FALLBACK INTELIGENTE
// ========================================

async function iniciarModelo() {
    // Detectar hardware primeiro
    hardwareInfo = await detectarHardware();
    const webGpuStatus = await verificarWebGPU();
    const navegadorInfo = getNavegadorInfo();
    
    console.log("Hardware:", hardwareInfo);
    console.log("WebGPU:", webGpuStatus);
    console.log("Navegador:", navegadorInfo);
    
    // Decidir qual modo usar
    const usarWebGPU = webGpuStatus.disponivel && hardwareInfo.memory >= 4;
    
    if (!usarWebGPU) {
        const dica = sugerirAcao(navegadorInfo, webGpuStatus);
        if (dica) {
            adicionarMensagem(dica, "bot");
        }
        
        atualizarStatus("⚡ Modo compatível (CPU) - pode ser mais lento", 0);
        return await iniciarModoFallback();
    }
    
    // Tentar WebGPU
    atualizarStatus("🚀 Inicializando Quinti (modo GPU)...", 0);
    return await iniciarModoWebGPU();
}

async function iniciarModoWebGPU() {
    try {
        const loader = adicionarMensagem("🦉 Waking up Quinti...", "bot");
        
        engine = await webllm.CreateMLCEngine(MODEL_ID, {
            initProgressCallback: (p) => {
                loader.textContent = `🦉 ${p.text}`;
                atualizarStatus(p.text, p.progress || 0);
            }
        });
        
        loader.textContent = "✨ Quinti is ready! (Modo Turbo)";
        atualizarStatus("✨ Pronto! Modo acelerado por GPU", 1);
        modeloOk = true;
        modoFallback = false;
        
        return true;
        
    } catch (err) {
        console.warn("WebGPU falhou, tentando fallback:", err);
        adicionarMensagem("🔄 Mudando para modo compatível...", "bot");
        return await iniciarModoFallback();
    }
}

async function iniciarModoFallback() {
    try {
        atualizarStatus("⚡ Modo compatível ativado...", 0.2);
        
        await iniciarFallback((progresso) => {
            atualizarStatus(progresso.text, progresso.progress);
        });
        
        modoFallback = true;
        modeloOk = true;
        atualizarStatus("✨ Quinti está pronto (modo compatível)!", 1);
        
        // Adicionar aviso na UI
        adicionarMensagem(
            "⚡ Quinti está no modo compatível!\n\n" +
            "As respostas podem ser mais lentas neste computador.\n\n" +
            "Para melhor performance, use Chrome ou Edge atualizados! ✨",
            "bot"
        );
        
        return true;
        
    } catch (err) {
        console.error("Fallback também falhou:", err);
        atualizarStatus("❌ Não foi possível carregar o Quinti", 0);
        adicionarMensagem(
            "🌙 Desculpe! Seu navegador não é compatível com o Quinti.\n\n" +
            "Tente usar o Google Chrome ou Microsoft Edge atualizados.",
            "bot"
        );
        return false;
    }
}

// ========================================
// PERGUNTAR (compatível com fallback)
// ========================================

async function perguntarQuinti(userText) {
    memory.chatHistory.push({ role: "user", content: userText });
    const recent = memory.chatHistory.slice(-MAX_HISTORY);
    const messages = [{ role: "system", content: systemPrompt }, ...recent];
    
    removerPensando();
    const bubble = adicionarMensagem("", "bot");
    let fullText = "";
    
    if (modoFallback) {
        // Usar fallback (WASM/CPU)
        await perguntarFallback(messages, (token) => {
            if (typeof token === 'string') {
                fullText = token;
                bubble.textContent = fullText;
                chat.scrollTop = chat.scrollHeight;
            } else {
                fullText += token;
                bubble.textContent = fullText;
                chat.scrollTop = chat.scrollHeight;
            }
        });
    } else {
        // Usar WebGPU (MLC)
        const stream = await engine.chat.completions.create({
            messages,
            temperature: TEMPERATURE,
            max_tokens: MAX_TOKENS,
            top_p: 0.9,
            stream: true
        });
        
        for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content || "";
            if (delta) {
                fullText += delta;
                bubble.textContent = fullText;
                chat.scrollTop = chat.scrollHeight;
            }
        }
    }
    
    if (fullText.trim()) {
        memory.chatHistory.push({ role: "assistant", content: fullText });
    } else {
        bubble.textContent = "✨ Tell me more, little star! ✨";
        memory.chatHistory.push({ role: "assistant", content: bubble.textContent });
    }
    
    return fullText;
}

// ========================================
// ENVIAR (seu código original adaptado)
// ========================================

async function enviar() {
    const texto = inputPergunta.value.trim();
    if (!texto) return;
    
    adicionarMensagem(texto, "user");
    inputPergunta.value = "";
    inputPergunta.disabled = true;
    btnEnviar.disabled = true;
    mostrarPensando();
    
    try {
        const respostaLocal = respostaControlada(texto);
        if (respostaLocal) {
            removerPensando();
            adicionarMensagem(respostaLocal, "bot");
            return;
        }
        
        if (modeloOk) {
            await perguntarQuinti(texto);
        } else {
            removerPensando();
            adicionarMensagem("🦉 Quinti is still waking up!\n\nTry again soon ✨", "bot");
        }
        
    } catch (err) {
        console.error(err);
        removerPensando();
        adicionarMensagem("🌙 Oops! Quinti got sleepy ✨", "bot");
    } finally {
        inputPergunta.disabled = false;
        btnEnviar.disabled = false;
        inputPergunta.focus();
    }
}

// ========================================
// EVENTOS
// ========================================

btnEnviar.addEventListener("click", enviar);
inputPergunta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviar();
    }
});

// ========================================
// BOOT
// ========================================

(async () => {
    adicionarMensagem("🌍 Loading Quinti...", "bot");
    
    try {
        window.conhecimentoGlobal = await carregarConhecimento();
        adicionarMensagem("📚 Knowledge loaded!", "bot");
    } catch (e) {
        console.warn("Knowledge error", e);
    }
    
    await iniciarModelo();
    
    modeloPronto = modeloOk;
    
    if (memory.learnedWords?.length > 0) {
        adicionarMensagem(`🌟 Welcome back!\n\nYou learned:\n${memory.learnedWords.slice(0,5).join(", ")}\n`, "bot");
    }
    
    inputPergunta.disabled = false;
    btnEnviar.disabled = false;
    inputPergunta.focus();
})();
