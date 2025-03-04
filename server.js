const express = require('express');
const ethers = require('ethers');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public')); // Servir o arquivo index.html

// Configurar o provedor RPC da Monad Testnet
const provider = new ethers.providers.JsonRpcProvider('https://testnet-rpc.monad.xyz/');
const privateKey = 'SEU_PRIVATE_KEY_AQUI'; // Substitua por uma chave privada segura para a carteira faucet
const wallet = new ethers.Wallet(privateKey, provider);

// Endereço da carteira com tokens MON de teste
const faucetAddress = '0x4050feb951B8d87C030959766f636BF93f5Ebca2'; // Endereço do contrato ou carteira com tokens

// Configurações da faucet
const TOKENS_PER_REQUEST = ethers.utils.parseEther('0.05'); // 0.05 MON por solicitação
const DAILY_LIMIT = 1; // Limite de 1 solicitação por endereço por dia
const TASKS_REQUIRED = 4; // Número de tarefas para desbloquear tokens

// Armazenamento simples em memória (substitua por um banco de dados em produção, como MongoDB ou Redis)
let requestHistory = new Map(); // { endereço: { lastRequest: timestamp, requestsToday: count } }

// Função para verificar o limite diário
function checkDailyLimit(address) {
    const now = Date.now();
    const record = requestHistory.get(address) || { lastRequest: 0, requestsToday: 0 };
    
    // Reinicia o contador se passou mais de 24 horas desde a última solicitação
    if (now - record.lastRequest > 24 * 60 * 60 * 1000) {
        record.lastRequest = now;
        record.requestsToday = 0;
    }

    if (record.requestsToday >= DAILY_LIMIT) {
        return false;
    }
    return true;
}

// Função para verificar tarefas sociais (simplificada; ajuste para APIs reais de Twitter/Telegram)
async function verifyTasks(address, tasks) {
    if (tasks.length !== TASKS_REQUIRED) {
        return { success: false, message: 'Complete todas as 4 tarefas.' };
    }

    for (const task of tasks) {
        if (!task.completed) {
            return { success: false, message: `Tarefa pendente: ${task.name}` };
        }
    }

    // Verificar conexão com a Monad Testnet
    try {
        const balance = await provider.getBalance(address);
        if (balance.eq(0)) {
            return { success: false, message: 'Conecte sua carteira à Monad Testnet.' };
        }
    } catch (error) {
        return { success: false, message: 'Endereço de carteira inválido.' };
    }

    // Verificações simuladas para Twitter e Telegram (substitua por APIs reais)
    const twitterTasks = ['followX', 'likePost'];
    const telegramTasks = ['joinTelegram'];

    for (const taskName of twitterTasks) {
        if (tasks.find(t => t.name === taskName)?.completed) {
            // Simulação: verificar follow/like no X (substitua por Twitter API v2)
            if (!confirm(`Verifique se ${address} completou a tarefa ${taskName} no X.`)) {
                return { success: false, message: `Tarefa ${taskName} não verificada no X.` };
            }
        }
    }

    for (const taskName of telegramTasks) {
        if (tasks.find(t => t.name === taskName)?.completed) {
            // Simulação: verificar entrada no Telegram (substitua por Telegram Bot API)
            if (!confirm(`Verifique se ${address} entrou no grupo/canal no Telegram.`)) {
                return { success: false, message: `Tarefa ${taskName} não verificada no Telegram.` };
            }
        }
    }

    return { success: true, message: 'Tarefas verificadas com sucesso!' };
}

// Rota para distribuir tokens
app.post('/api/faucet', async (req, res) => {
    const { address, tasks } = req.body;

    // Verificar endereço e limite diário
    if (!ethers.utils.isAddress(address)) {
        return res.json({ success: false, message: 'Endereço de carteira inválido.' });
    }

    if (!checkDailyLimit(address)) {
        return res.json({ success: false, message: 'Limite diário atingido. Tente novamente em 24 horas.' });
    }

    // Verificar tarefas sociais
    const taskResult = await verifyTasks(address, tasks);
    if (!taskResult.success) {
        return res.json(taskResult);
    }

    try {
        // Enviar tokens MON para o endereço
        const tx = await wallet.sendTransaction({
            to: address,
            value: TOKENS_PER_REQUEST
        });

        await tx.wait();

        // Atualizar histórico de solicitações
        const record = requestHistory.get(address) || { lastRequest: Date.now(), requestsToday: 0 };
        record.requestsToday++;
        requestHistory.set(address, record);

        res.json({ 
            success: true, 
            message: 'Tokens MON enviados com sucesso! 0.05 MON para ' + address,
            txHash: tx.hash 
        });
    } catch (error) {
        res.json({ success: false, message: 'Erro ao enviar tokens: ' + error.message });
    }
});

// Rota para verificar status
app.get('/api/status', (req, res) => {
    const address = req.query.address;
    if (!address || !ethers.utils.isAddress(address)) {
        return res.json({ available: '0.00 MON', network: 'Monad Testnet', contract: '0x4050...bca2' });
    }

    res.json({ 
        available: '0.00 MON', // Atualize com lógica real para saldo disponível
        network: 'Monad Testnet',
        contract: '0x4050feb951B8d87C030959766f636BF93f5Ebca2'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Faucet rodando na porta ${PORT}`));