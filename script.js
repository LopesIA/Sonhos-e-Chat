// --- CONFIGURAÇÃO SOCKET.IO (CHAT REAL) ---
// Se estiver rodando localmente, use 'http://localhost:3000'
// Se estiver no Render, deixe vazio ou use a URL do Render
const socket = io(); 

// --- DADOS DO USUÁRIO (Armazenados no Navegador) ---
let user = JSON.parse(localStorage.getItem('guiaSonhosUser')) || {
    id: 'user_' + Math.floor(Math.random() * 99999),
    nome: 'Místico ' + Math.floor(Math.random() * 100),
    avatar: 'https://i.pravatar.cc/150?img=12',
    molduras: ['moldura_0'], // Começa com a primeira
    baloes: ['balao_0'],     // Começa com o primeiro
    molduraEquipada: 'moldura_0',
    balaoEquipado: 'balao_0'
};

// --- CONFIGURAÇÃO DE CORES E NOMES ---
// 10 Cores para Molduras e Balões
const CORES = [
    { nome: "Rubi", hex: "#FF0040", glow: "#FF0040" },       // 0
    { nome: "Laranja Solar", hex: "#FF8000", glow: "#FF8000" }, // 1
    { nome: "Ouro Imperial", hex: "#FFD700", glow: "#FFD700" }, // 2
    { nome: "Esmeralda", hex: "#00FF40", glow: "#00FF40" },     // 3
    { nome: "Ciano Místico", hex: "#00FFFF", glow: "#00FFFF" }, // 4
    { nome: "Safira", hex: "#0040FF", glow: "#0040FF" },        // 5
    { nome: "Ametista", hex: "#8000FF", glow: "#8000FF" },      // 6
    { nome: "Magenta Astral", hex: "#FF00BF", glow: "#FF00BF" },// 7
    { nome: "Luz Divina", hex: "#FFFFFF", glow: "#FFFFFF" },    // 8
    { nome: "Sombra", hex: "#444444", glow: "#000000" }         // 9
];

// Gera CSS Dinâmico e Banco de Dados de Itens
const ITENS = { molduras: {}, baloes: {} };

function gerarCosmeticos() {
    const styleTag = document.getElementById('estilos-dinamicos');
    let css = '';

    CORES.forEach((cor, i) => {
        // --- MOLDURAS (Simples, Coroa, Asas) ---
        // Aqui simplifiquei para 1 tipo por cor para facilitar a loja, 
        // mas você pode expandir para 30 se quiser (10 de cada tipo).
        // Vamos fazer o "Supremo" (Asa + Coroa) como padrão pois é mais bonito.
        
        const idMoldura = `moldura_${i}`;
        ITENS.molduras[idMoldura] = { 
            id: idMoldura, 
            nome: `Moldura ${cor.nome}`, 
            cor: cor.hex,
            classe: `frame-${i}` 
        };

        // CSS da Moldura
        css += `
            .frame-${i} { 
                border: 2px solid #fff; 
                box-shadow: 0 0 10px ${cor.hex}, inset 0 0 5px ${cor.hex}; 
                position: relative;
            }
            .frame-${i}::after { 
                content: '👑'; position: absolute; top: -15px; left: 50%; transform: translateX(-50%); font-size: 14px; text-shadow: 0 0 5px ${cor.hex}; 
            }
            /* Efeito de Asa simplificado via CSS Gradient */
            .frame-${i}::before {
                content: ''; position: absolute; z-index: -1;
                top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 140%; height: 60%;
                background: radial-gradient(ellipse at center, ${cor.hex} 0%, transparent 70%);
                opacity: 0.5; filter: blur(5px);
            }
        `;

        // --- BALÕES ---
        const idBalao = `balao_${i}`;
        ITENS.baloes[idBalao] = {
            id: idBalao,
            nome: `Balão ${cor.nome}`,
            cor: cor.hex,
            classe: `bubble-${i}`
        };

        // CSS do Balão
        css += `
            .bubble-${i} {
                border: 1px solid ${cor.hex};
                background: linear-gradient(135deg, rgba(20,20,20,0.9), rgba(${parseInt(cor.hex.slice(1,3),16)}, ${parseInt(cor.hex.slice(3,5),16)}, ${parseInt(cor.hex.slice(5,7),16)}, 0.2));
                box-shadow: 0 0 5px ${cor.hex};
                color: #fff;
            }
        `;
    });

    styleTag.innerHTML = css;
}

// --- FUNÇÕES DE NAVEGAÇÃO ---
function mudarAba(abaId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`tab-${abaId}`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (abaId === 'perfil') carregarInventario();
    if (abaId === 'loja') carregarLoja();
}

// --- LÓGICA DO ORÁCULO (IA) ---
async function consultarOraculoIA() {
    const input = document.getElementById('dreamInput');
    const sonho = input.value.trim();
    if (!sonho) return;

    const resultDiv = document.getElementById('dreamResult');
    const loading = document.getElementById('loadingOraculo');
    const textOutput = document.getElementById('resultText');

    resultDiv.classList.remove('hidden');
    textOutput.innerHTML = '';
    loading.classList.remove('hidden');

    try {
        // Chama seu Backend
        const response = await fetch('/api/interpretar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sonho })
        });

        const data = await response.json();
        loading.classList.add('hidden');
        
        // Efeito de digitação
        let i = 0;
        const txt = data.interpretacao || "O oráculo está em silêncio...";
        const speed = 30;
        
        function typeWriter() {
            if (i < txt.length) {
                textOutput.innerHTML += txt.charAt(i) === '\n' ? '<br>' : txt.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            }
        }
        typeWriter();

    } catch (error) {
        loading.classList.add('hidden');
        textOutput.innerText = "Erro ao conectar com o mundo espiritual. Tente novamente.";
    }
}

// --- LÓGICA DO CHAT REAL (SOCKET.IO) ---

// 1. Receber histórico ao entrar
socket.on('historico', (msgs) => {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    msgs.forEach(msg => adicionarMensagemNaTela(msg));
});

// 2. Receber nova mensagem em tempo real
socket.on('nova_mensagem', (msg) => {
    adicionarMensagemNaTela(msg);
});

// 3. Receber aviso de limpeza
socket.on('chat_limpo', (msg) => {
    document.getElementById('chatMessages').innerHTML = 
    `<div class="system-msg">${msg.texto}</div>`;
});

function enviarMensagemSocket() {
    const input = document.getElementById('chatInput');
    const texto = input.value.trim();
    if (!texto) return;

    const msgData = {
        uid: user.id,
        nome: user.nome,
        avatar: user.avatar,
        texto: texto,
        moldura: user.molduraEquipada,
        balao: user.balaoEquipado
    };

    socket.emit('mensagem_enviada', msgData);
    input.value = '';
}

function adicionarMensagemNaTela(msg) {
    const container = document.getElementById('chatMessages');
    const isMe = msg.uid === user.id;
    
    const divRow = document.createElement('div');
    divRow.className = `msg-row ${isMe ? 'mine' : ''}`;

    // Pega classes CSS dos itens
    const classeMoldura = ITENS.molduras[msg.moldura]?.classe || '';
    const classeBalao = ITENS.baloes[msg.balao]?.classe || '';

    // HTML da Mensagem
    divRow.innerHTML = `
        <div class="msg-avatar-container ${classeMoldura}" onclick="verPerfilOutro('${msg.nome}', '${msg.avatar}')">
            <img src="${msg.avatar}" class="msg-avatar">
        </div>
        <div class="msg-content">
            <span class="msg-name">${msg.nome}</span>
            <div class="msg-bubble ${classeBalao}">
                ${msg.texto}
            </div>
        </div>
    `;

    container.appendChild(divRow);
    container.scrollTop = container.scrollHeight;
}

// --- PERFIL E INVENTÁRIO ---
function salvarUser() {
    localStorage.setItem('guiaSonhosUser', JSON.stringify(user));
    document.getElementById('headerUserId').innerText = user.id.substring(0,8);
    document.getElementById('inputNomePerfil').value = user.nome;
    document.getElementById('imgAvatar').src = user.avatar;
    atualizarPreviewPerfil();
}

function salvarNome() {
    user.nome = document.getElementById('inputNomePerfil').value;
    salvarUser();
}

function trocarFoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            user.avatar = e.target.result;
            salvarUser();
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function atualizarPreviewPerfil() {
    const wrapper = document.getElementById('meuAvatarWrapper');
    const balaoPreview = document.getElementById('previewBalaoPerfil');
    
    // Reseta classes
    wrapper.className = 'profile-pic-wrapper';
    balaoPreview.className = 'perfil-balao-preview';

    // Aplica novas
    if (user.molduraEquipada) wrapper.classList.add(ITENS.molduras[user.molduraEquipada].classe);
    if (user.balaoEquipado) balaoPreview.classList.add(ITENS.baloes[user.balaoEquipado].classe);
}

function carregarInventario() {
    const gridM = document.getElementById('gridMoldurasAdquiridas');
    const gridB = document.getElementById('gridBaloesAdquiridos');
    gridM.innerHTML = ''; 
    gridB.innerHTML = '';

    // Molduras
    user.molduras.forEach(id => {
        const item = ITENS.molduras[id];
        if(!item) return;
        const div = document.createElement('div');
        div.className = `item-card ${user.molduraEquipada === id ? 'equipped' : ''}`;
        div.innerHTML = `<div class="item-preview ${item.classe}"></div><span class="item-name">${item.nome}</span>`;
        div.onclick = () => { user.molduraEquipada = id; salvarUser(); carregarInventario(); };
        gridM.appendChild(div);
    });

    // Balões
    user.baloes.forEach(id => {
        const item = ITENS.baloes[id];
        if(!item) return;
        const div = document.createElement('div');
        div.className = `item-card ${user.balaoEquipado === id ? 'equipped' : ''}`;
        div.innerHTML = `<div class="item-preview ${item.classe}" style="border-radius:5px;"></div><span class="item-name">${item.nome}</span>`;
        div.onclick = () => { user.balaoEquipado = id; salvarUser(); carregarInventario(); };
        gridB.appendChild(div);
    });
}

// --- LOJA E SORTEIO ---
function carregarLoja() {
    // Lista TODAS as molduras
    const lojaM = document.getElementById('lojaMoldurasTodas');
    lojaM.innerHTML = '';
    Object.values(ITENS.molduras).forEach(item => {
        const tenho = user.molduras.includes(item.id);
        lojaM.innerHTML += `
            <div class="item-card ${tenho ? 'owned' : 'locked'}">
                <div class="item-preview ${item.classe}"></div>
                <span class="item-name">${item.nome}</span>
                <span class="item-status">${tenho ? 'Adquirido' : 'Bloqueado'}</span>
            </div>
        `;
    });

    // Lista TODOS os balões
    const lojaB = document.getElementById('lojaBaloesTodos');
    lojaB.innerHTML = '';
    Object.values(ITENS.baloes).forEach(item => {
        const tenho = user.baloes.includes(item.id);
        lojaB.innerHTML += `
            <div class="item-card ${tenho ? 'owned' : 'locked'}">
                <div class="item-preview ${item.classe}" style="border-radius:5px;"></div>
                <span class="item-name">${item.nome}</span>
                <span class="item-status">${tenho ? 'Adquirido' : 'Bloqueado'}</span>
            </div>
        `;
    });
}

function assistirAnuncio() {
    const btn = document.querySelector('.btn-watch');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⏳ Assistindo... (3s)";

    setTimeout(() => {
        // Sorteio
        const tipo = Math.random() > 0.5 ? 'moldura' : 'balao';
        const listaDB = tipo === 'moldura' ? ITENS.molduras : ITENS.baloes;
        const chaves = Object.keys(listaDB);
        const sorteada = chaves[Math.floor(Math.random() * chaves.length)];
        const item = listaDB[sorteada];

        // Adiciona ao usuário
        const listaUser = tipo === 'moldura' ? user.molduras : user.baloes;
        let msg = "";
        
        if (!listaUser.includes(sorteada)) {
            listaUser.push(sorteada);
            msg = `🎉 Parabéns! Você ganhou: ${item.nome}!`;
        } else {
            msg = `🌟 Você tirou ${item.nome} (Repetido). Tente novamente amanhã!`;
        }
        
        salvarUser();
        carregarLoja(); // Atualiza visual da loja
        alert(msg);

        btn.textContent = originalText;
        btn.disabled = false;
    }, 3000);
}

// --- MODAIS ---
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }
function verPerfilOutro(nome, avatar) {
    document.getElementById('outroNome').innerText = nome;
    document.getElementById('outroAvatarWrapper').innerHTML = `<img src="${avatar}">`;
    document.getElementById('modalPerfilOutro').style.display = 'flex';
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    gerarCosmeticos();
    salvarUser(); // Garante carga inicial
    
    setTimeout(() => {
        document.getElementById('loadingOverlay').style.display = 'none';
    }, 1500);
});