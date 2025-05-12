class GameManager {
  constructor() {
    this.games = {};
  }
  
  createGame(playerId) {
    const gameId = this.generateGameId();
    this.games[gameId] = {
      id: gameId,
      player1: playerId,
      player2: null,
      currentPlayer: 1,
      board: this.initializeBoard(),
      status: 'waiting' // waiting, playing, finished
    };
    return gameId;
  }
  
  joinGame(gameId, playerId) {
    if (this.games[gameId] && !this.games[gameId].player2) {
      this.games[gameId].player2 = playerId;
      this.games[gameId].status = 'playing';
      return true;
    }
    return false;
  }
  
  makeMove(gameId, from, to) {
    const game = this.games[gameId];
    if (!game) return false;
    
    // Atualizar o tabuleiro baseado no movimento
    // Esta é uma implementação simplificada - você precisará adaptar
    // de acordo com a lógica do seu jogo
    
    // Alternar o jogador atual
    game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
    
    return true;
  }
  
  endGame(gameId, removeImmediately = false) {
    if (this.games[gameId]) {
      this.games[gameId].status = 'finished';
      
      // Se for solicitada a remoção imediata (caso de cancelamento)
      if (removeImmediately) {
        delete this.games[gameId];
        console.log(`Jogo ${gameId} removido imediatamente`);
      } else {
        // Remoção com delay (para casos de jogo terminado normalmente)
        setTimeout(() => {
          delete this.games[gameId];
        }, 60000); // Remove após 1 minuto
      }
    }
  }
  
  getGame(gameId) {
    return this.games[gameId];
  }
  
  getGamesByPlayer(playerId) {
    return Object.keys(this.games).filter(gameId => {
      const game = this.games[gameId];
      return game.player1 === playerId || game.player2 === playerId;
    });
  }
  
  getAvailableGames() {
    return Object.values(this.games)
      .filter(game => game.status === 'waiting')
      .map(game => ({
        id: game.id,
        status: game.status
      }));
  }
  
  initializeBoard() {
    // Criar uma representação do tabuleiro inicial
    // Isso é uma simplificação - adapte conforme seu modelo de dados atual
    const board = Array(8).fill(null).map(() => Array(8).fill(-1));
    
    // Configurar peças brancas (primeiras 3 linhas em posições alternadas)
    for (let linha = 0; linha < 3; linha++) {
      for (let coluna = 0; coluna < 8; coluna++) {
        if ((linha + coluna) % 2 !== 0) {
          board[linha][coluna] = 0; // WHITE_PIECE
        }
      }
    }
    
    // Configurar peças marrons (últimas 3 linhas em posições alternadas)
    for (let linha = 5; linha < 8; linha++) {
      for (let coluna = 0; coluna < 8; coluna++) {
        if ((linha + coluna) % 2 !== 0) {
          board[linha][coluna] = 1; // BROWN_PIECE
        }
      }
    }
    
    return board;
  }
  
  generateGameId() {
    return Math.random().toString(36).substring(2, 9);
  }
}

module.exports = { GameManager };
