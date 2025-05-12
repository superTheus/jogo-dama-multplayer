const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { GameManager } = require('./gameManager');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Gerenciador de jogos
const gameManager = new GameManager();

// Rotas HTTP básicas
app.get('/', (req, res) => {
  res.send('Servidor do Jogo de Damas rodando!');
});

app.get('/games', (req, res) => {
  res.json(gameManager.getAvailableGames());
});

// Configuração do Socket.IO
io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);
  
  // Criar uma nova sala de jogo
  socket.on('createGame', () => {
    const gameId = gameManager.createGame(socket.id);
    socket.join(gameId);
    socket.emit('gameCreated', { gameId, playerId: 1 });
    console.log(`Jogo criado: ${gameId} pelo jogador ${socket.id}`);
  });
  
  // Entrar em um jogo existente
  socket.on('joinGame', (gameId) => {
    const game = gameManager.getGame(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Jogo não encontrado' });
      return;
    }
    
    if (game.player2) {
      socket.emit('error', { message: 'Jogo já está cheio' });
      return;
    }
    
    gameManager.joinGame(gameId, socket.id);
    socket.join(gameId);
    socket.emit('gameJoined', { gameId, playerId: 2 });
    
    // Notificar o outro jogador
    socket.to(gameId).emit('opponentJoined', { playerId: 2 });
    
    // Iniciar o jogo
    io.to(gameId).emit('gameStart', { currentPlayer: 1 });
    console.log(`Jogador ${socket.id} entrou no jogo ${gameId}`);
  });
  
  // Realizar um movimento
  socket.on('makeMove', ({ gameId, from, to, player, isMultipleCapture }) => {
    const game = gameManager.getGame(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Jogo não encontrado' });
      return;
    }
    
    // Verificar se é a vez do jogador (exceto em capturas múltiplas onde o jogador continua)
    if (game.currentPlayer !== player && !isMultipleCapture) {
      socket.emit('error', { message: 'Não é sua vez' });
      return;
    }
    
    // Atualizar o estado do jogo
    // Se for captura múltipla, não altera o jogador atual
    if (!isMultipleCapture) {
      gameManager.makeMove(gameId, from, to);
    }
    
    // Transmitir o movimento para todos na sala
    io.to(gameId).emit('moveMade', {
      from,
      to,
      player,
      nextPlayer: isMultipleCapture ? player : game.currentPlayer, // Mantém o mesmo jogador em caso de captura múltipla
      board: game.board,
      isMultipleCapture // Informa ao cliente se é uma captura múltipla
    });
    
    console.log(`Movimento realizado no jogo ${gameId} por jogador ${player}${isMultipleCapture ? ' (captura múltipla)' : ''}`);
  });
  
  // Cancelar um jogo criado
  socket.on('cancelGame', ({ gameId }) => {
    const game = gameManager.getGame(gameId);
    
    if (game && game.player1 === socket.id) {
      // Passa true como segundo parâmetro para indicar remoção imediata
      gameManager.endGame(gameId, true);
      console.log(`Jogo ${gameId} cancelado e removido pelo criador ${socket.id}`);
    }
  });
  
  // Lidar com o tempo expirado
  socket.on('timeExpired', ({ gameId, player }) => {
    const game = gameManager.getGame(gameId);
    
    if (!game) {
      return;
    }
    
    // Verificar se o jogador que relatou é o jogador atual
    if (game.currentPlayer !== player) {
      return;
    }
    
    // Determinar o vencedor (o outro jogador)
    const winner = player === 1 ? 2 : 1;
    
    console.log(`Tempo expirado: Jogador ${player} perdeu por tempo. Vencedor: Jogador ${winner}`);
    
    // Notificar todos os jogadores sobre o tempo expirado e o vencedor
    io.to(gameId).emit('timeExpired', {
      player,
      winner
    });
    
    // Encerrar o jogo
    gameManager.endGame(gameId);
    
    console.log(`Jogo ${gameId} encerrado. Jogador ${winner} venceu por tempo.`);
  });
  
  // Desconexão
  socket.on('disconnect', () => {
    const gameIds = gameManager.getGamesByPlayer(socket.id);
    
    gameIds.forEach(gameId => {
      const game = gameManager.getGame(gameId);
      if (game) {
        io.to(gameId).emit('opponentLeft');
        gameManager.endGame(gameId);
      }
    });
    
    console.log(`Usuário desconectado: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

