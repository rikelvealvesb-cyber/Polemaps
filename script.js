// Recursos Avançados (O que falta no Excel)

class NexusFeatures {
    constructor() {
        this.cellHistory = {}; // Armazena histórico para versionamento
    }

    // 1. Função Assíncrona para buscar dados de APIs REST direto na planilha
    async fetchApiData(url, path = '') {
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            // Navega pelo objeto JSON se um path for fornecido (ex: "rates.BRL")
            if (path) {
                return path.split('.').reduce((obj, key) => obj?.[key], data) ?? 'Chave não encontrada';
            }
            return JSON.stringify(data);
        } catch (error) {
            return `Erro API: ${error.message}`;
        }
    }

    // 2. IA / Linguagem Natural para manipulação de dados em lote
    processNaturalLanguageCommand(command, dataRangeValues) {
        const cmd = command.toLowerCase();
        if (cmd.includes('maiusculo') || cmd.includes('maiúsculo')) {
            return dataRangeValues.map(val => String(val).toUpperCase());
        }
        if (cmd.includes('remover espacos')) {
            return dataRangeValues.map(val => String(val).trim());
        }
        return dataRangeValues;
    }

    // 3. Registrar Histórico de Modificação da Célula (Versionamento)
    recordChange(cellId, oldValue, newValue) {
        if (!this.cellHistory[cellId]) {
            this.cellHistory[cellId] = [];
        }
        this.cellHistory[cellId].push({
            oldValue,
            newValue,
            timestamp: new Date().toLocaleTimeString()
        });
    }

    getHistory(cellId) {
        return this.cellHistory[cellId] || [{ msg: 'Nenhum histórico anterior' }];
    }
}

window.nexusFeatures = new NexusFeatures();
