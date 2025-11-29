// server.js - CÓDIGO FINAL E CORRIGIDO PARA LIMPEZA DO FIRESTORE

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// NOVO: Firebase Admin SDK - OBRIGATÓRIO PARA A LIMPEZA
const admin = require('firebase-admin');

let db; 
let CHAT_COLLECTION; 

// --- CONFIGURAÇÃO FIREBASE ADMIN (Para acesso ao Firestore) ---
// Tenta se conectar usando a variável de ambiente FIREBASE_SERVICE_ACCOUNT
try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        throw new Error("Variável FIREBASE_SERVICE_ACCOUNT não encontrada ou vazia.");
    }

    // A chave JSON completa deve estar na variável de ambiente (string contínua)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();
    // Coleção onde suas mensagens de chat estão salvas. Corrigido para a sua estrutura
    CHAT_COLLECTION = db.collection('artifacts/guia_sonhos_v1/chat'); 
    console.log("✅ Firebase Admin e Firestore conectados.");

} catch (e) {
    console.error("❌ ERRO GRAVE: Firebase Admin não inicializado. Limpeza do chat falhará. Detalhes:", e.message);
    db = null; // Garante que a deleção não será tentada
}

const app = express();
app.use(cors());
app.use(express.json());
// Servindo a pasta 'www' (confirmado pelo usuário)
app.use(express.static('www')); 

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// --- 1. CONFIGURAÇÃO DA IA (GEMINI) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "SUA_CHAVE_AQUI_SE_RODAR_LOCAL");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 

// --- 2. MEMÓRIA DO CHAT (Mantida) ---
let chatMessages = []; 

// --- 3. ENDPOINT DA IA (INTERPRETAÇÃO) ---
app.post('/api/interpretar', async (req, res) => {
    try {
        const { sonho } = req.body;
        if (!sonho) return res.status(400).json({ error: 'Sonho não informado' });

        const prompt = `Aja como um Oráculo Místico antigo e sábio. Interprete o seguinte sonho de forma curta, enigmática mas aconselhadora: "${sonho}". Use emojis místicos. Não seja repetitivo. Dê um conselho prático no final.`;
        
        const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
        const text = result.response.text;

        res.json({ interpretacao: text });
    } catch (error) {
        console.error("Erro na IA:", error);
        res.status(500).json({ error: "O oráculo está nebuloso... Tente novamente." });
    }
});

// --- 4. ENDPOINT DE LIMPEZA (CRONJOB CORRIGIDO) ---
// Este endpoint DELETA as mensagens antigas do FIRESTORE.
app.get('/api/limpar-chat', async (req, res) => {
    const MAX_DELETES = 500; 
    
    try {
        if (!db) {
            // Se a conexão falhou (problema na variável de ambiente)
            console.error("Serviço de Limpeza Falhou: Conexão com Firebase Admin não estabelecida.");
            return res.status(503).send("Serviço de Limpeza Indisponível (Erro de Conexão).");
        }
        
        // 1. Busca as 500 mensagens mais antigas
        const snapshot = await CHAT_COLLECTION
            .orderBy('timestamp') // Ordena pelas mais antigas
            .limit(MAX_DELETES) 
            .get();
        
        if (snapshot.size === 0) {
            console.log("Nenhuma mensagem para limpar no Firestore.");
            return res.send("Limpeza Espiritual Concluída. (Nenhuma mensagem encontrada)");
        }

        // 2. Executa a deleção em Batch (ótimo para performance)
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit(); 
        
        // 3. Avisa os clientes conectados
        io.emit('chat_limpo', { 
            texto: `🧹 ${snapshot.size} mensagens antigas foram levadas pelo vento...`, 
            sistema: true 
        });

        console.log(`Chat limpo pelo CronJob. ${snapshot.size} documentos deletados.`);
        res.send(`Limpeza Espiritual Concluída. ${snapshot.size} mensagens deletadas.`);

    } catch (error) {
        console.error("Erro na limpeza do chat (Firestore):", error);
        res.status(500).send("Erro ao limpar o chat no Firestore.");
    }
});

// --- 5. SOCKET.IO (CHAT REAL) ---
io.on('connection', (socket) => {
    console.log('Um espírito se conectou:', socket.id);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🔮 Portal Místico aberto na porta ${PORT}`);
});