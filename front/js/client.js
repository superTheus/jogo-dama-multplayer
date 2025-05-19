class GameClient {
    constructor() {
        this.socket = null;
        this.gameId = null;
        this.playerId = null;
        this.isMyTurn = false;
        this.onGameStart = null;
        this.onOpponentMove = null;
        this.onOpponentJoin = null;
        this.onOpponentLeft = null;
        this.onError = null;
        this.onGameCreated = null; // Novo evento para quando o jogo é criado
        this.onGameJoined = null;  // Novo evento para quando se junta a um jogo
        this.onTimeExpired = null; // Novo evento para quando o tempo acabar
    }

    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(serverUrl);
                
                this.socket.on('connect', () => {
                    console.log('Conectado ao servidor!');
                    resolve();
                });

                this.socket.on('error', (error) => {
                    console.error('Erro de conexão:', error);
                    if (this.onError) this.onError(error);
                    reject(error);
                });

                this.setupListeners();
            } catch (err) {
                console.error('Falha ao conectar:', err);
                reject(err);
            }
        });
    }

    setupListeners() {
        this.socket.on('gameCreated', (data) => {
            this.gameId = data.gameId;
            this.playerId = data.playerId;
            console.log(`Jogo criado: ${this.gameId}, você é o jogador ${this.playerId}`);
            if (this.onGameCreated) this.onGameCreated(data);
        });

        this.socket.on('gameJoined', (data) => {
            this.gameId = data.gameId;
            this.playerId = data.playerId;
            console.log(`Entrou no jogo: ${this.gameId}, você é o jogador ${this.playerId}`);
            if (this.onGameJoined) this.onGameJoined(data);
        });

        this.socket.on('opponentJoined', (data) => {
            console.log(`Oponente entrou: Jogador ${data.playerId}`);
            if (this.onOpponentJoin) this.onOpponentJoin(data);
        });

        this.socket.on('gameStart', (data) => {
            console.log(`Jogo iniciado! Jogador atual: ${data.currentPlayer}`);
            this.isMyTurn = this.playerId === data.currentPlayer;
            if (this.onGameStart) this.onGameStart(data);
        });

        this.socket.on('moveMade', (data) => {
            console.log(`Movimento realizado pelo jogador ${data.player}`);
            this.isMyTurn = this.playerId === data.nextPlayer;
            
            if (data.player !== this.playerId && this.onOpponentMove) {
                this.onOpponentMove(data);
            }
        });

        this.socket.on('opponentLeft', () => {
            console.log('Oponente saiu do jogo');
            if (this.onOpponentLeft) this.onOpponentLeft();
        });

        this.socket.on('error', (data) => {
            console.error('Erro:', data.message);
            if (this.onError) this.onError(data);
        });

        this.socket.on('timeExpired', (data) => {
            console.log(`Tempo expirado para o jogador ${data.player}. Vencedor: Jogador ${data.winner}`);
            if (this.onTimeExpired) this.onTimeExpired(data);
        });
    }

    createGame() {
        this.socket.emit('createGame');
    }

    joinGame(gameId) {
        this.socket.emit('joinGame', gameId);
    }

    makeMove(from, to, isMultipleCapture = false) {
        if (!this.isMyTurn && !isMultipleCapture) {
            console.warn('Não é sua vez de jogar');
            return false;
        }

        this.socket.emit('makeMove', {
            gameId: this.gameId,
            from,
            to,
            player: this.playerId,
            isMultipleCapture // Nova propriedade para indicar captura múltipla
        });
        
        return true;
    }

    cancelGame() {
        if (this.gameId) {
            console.log(`Cancelando o jogo ${this.gameId}`);
            this.socket.emit('cancelGame', {
                gameId: this.gameId
            });
            this.gameId = null;
            this.playerId = null;
            this.isMyTurn = false;
        }
    }

    reportTimeExpired() {
        if (this.gameId) {
            this.socket.emit('timeExpired', {
                gameId: this.gameId,
                player: this.playerId
            });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    getAvailableGames(callback) {
        // Fazer uma requisição HTTP para o servidor para buscar jogos disponíveis
        fetch('http://localhost:3030/games')
            .then(response => response.json())
            .then(data => callback(data))
            .catch(error => {
                console.error('Erro ao buscar jogos:', error);
                callback([]);
            });
    }
}
