require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve os arquivos do site

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// --- 1. CONFIGURAÇÃO DA IA (GEMINI) ---
// Você precisará pegar uma chave gratuita em: https://makersuite.google.com/app/apikey
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "SUA_CHAVE_AQUI_SE_RODAR_LOCAL");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- 2. MEMÓRIA DO CHAT ---
let chatMessages = []; // As mensagens ficam aqui

// --- 3. ENDPOINT DA IA (INTERPRETAÇÃO) ---
app.post('/api/interpretar', async (req, res) => {
    try {
        const { sonho } = req.body;
        if (!sonho) return res.status(400).json({ error: 'Sonho não informado' });

        const prompt = `
        Aja como um Oráculo Místico antigo e sábio. 
        Interprete o seguinte sonho de forma curta, enigmática mas aconselhadora: "${sonho}".
        Use emojis místicos. Não seja repetitivo. Dê um conselho prático no final.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ interpretacao: text });
    } catch (error) {
        console.error("Erro na IA:", error);
        res.status(500).json({ error: "O oráculo está nebuloso... Tente novamente." });
    }
});

// --- 4. ENDPOINT DE LIMPEZA (CRONJOB) ---
// O UptimeRobot vai acessar: https://seu-app.onrender.com/api/limpar-chat
app.get('/api/limpar-chat', (req, res) => {
    chatMessages = []; // Zera o array
    
    // Avisa a todos conectados que o chat foi limpo
    io.emit('chat_limpo', { 
        texto: "✨ O universo completou um ciclo. As mensagens foram levadas pelo vento...", 
        sistema: true 
    });

    console.log("Chat limpo pelo CronJob às " + new Date().toISOString());
    res.send("Limpeza Espiritual Concluída.");
});

// --- 5. SOCKET.IO (CHAT REAL) ---
io.on('connection', (socket) => {
    console.log('Um espírito se conectou:', socket.id);

    // Envia histórico recente ao entrar
    socket.emit('historico', chatMessages);

    // Recebe mensagem
    socket.on('mensagem_enviada', (data) => {
        // Guarda na memória
        const novaMsg = {
            id: Date.now(),
            ...data,
            timestamp: new Date()
        };
        
        chatMessages.push(novaMsg);
        
        // Limita a 100 mensagens para não estourar memória do servidor grátis
        if (chatMessages.length > 100) chatMessages.shift();

        // Envia para TODOS
        io.emit('nova_mensagem', novaMsg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🔮 Portal Místico aberto na porta ${PORT}`);
});