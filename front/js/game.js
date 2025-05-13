var board;
var whitePiece;
var brownPiece;
var whitePieceKing;
var brownPieceKing;
var locationSize = 75;

// SCORES
let whiteScore = 0;
let brownScore = 0;

var SQUARES = [];

let selectedPiece = null;

var EMPTY_PIECE = -1;
var WHITE_PIECE = 0;
var BROWN_PIECE = 1;
var WHITE_PIECE_KING = 2;
var BROWN_PIECE_KING = 3;

const PIECES_OBJECTS = [];

// COMEÇA SEMPRE COM O BRANCO
var PLAYER_ONE = 1; // WHITE
var PLAYER_TWO = 2; // BROWN
var PLAYER_TURN = PLAYER_ONE;

var IS_LAST_MOVE_CAPTURE = false;
var pieceInMultipleCapture = null;
var isMultipleCaptureInProgress = false;

var isMultiplayerMode = true;
var currentScene;
var isMyTurn = false;
var myPlayerType;

var turnTimer;
var timeRemaining = 60;
var timerDisplay;

const BOARD = [
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1]
];

function preload() {
    this.load.image('board', 'assets/images/tabuleiro.png');
    this.load.image('piece_white', 'assets/images/peca-branca.png');
    this.load.image('piece_brown', 'assets/images/peca-marrom.png');
    this.load.image('piece_white_king', 'assets/images/peca-branca-rei.png');
    this.load.image('piece_brown_king', 'assets/images/peca-marrom-rei.png');
}

function create() {
    // Guarda a referência à cena atual
    currentScene = this;
    
    this.board = this.add.image(300, 300, 'board');
    this.board.setDisplaySize(600, 600);

    // Configura o tipo de jogador com base nas informações do cliente
    setupMultiplayerMode();
    
    // Inicializa o tabuleiro
    initializeBoard(this);

    // Não mostrar o alerta inicial no modo multiplayer
    if (!isMultiplayerMode) {
        alert("vez do jogador " + PLAYER_TURN);
    } else {
        updateTurnIndicator();
    }
    
    // Configura os listeners para eventos multiplayer
    setupMultiplayerListeners();
}

function update() {
    // Pode ser usado para atualizações contínuas se necessário
}

// Configura o modo multiplayer
function setupMultiplayerMode() {
    if (gameClient && gameClient.playerId) {
        myPlayerType = gameClient.playerId;
        isMyTurn = (myPlayerType === 1 && PLAYER_TURN === PLAYER_ONE) || 
                   (myPlayerType === 2 && PLAYER_TURN === PLAYER_TWO);
        
        // Atualiza a interface para mostrar qual jogador você é
        let playerInfo = document.getElementById('playerInfo');
        if (playerInfo) {
            playerInfo.innerHTML = `Você é o Jogador ${myPlayerType}: ${myPlayerType === 1 ? 'Peças Brancas' : 'Peças Marrons'}`;
        }
        
        // Inicializa referência ao display do temporizador
        timerDisplay = document.getElementById('timer');
    }
}

// Configura os listeners para eventos de WebSocket
function setupMultiplayerListeners() {
    if (!gameClient) return;
    
    // Quando o oponente fizer um movimento
    gameClient.onOpponentMove = (data) => {
        processOpponentMove(data);
    };
    
    // Quando o jogo iniciar
    gameClient.onGameStart = (data) => {
        PLAYER_TURN = PLAYER_ONE; // O jogo sempre começa com o jogador 1 (branco)
        isMyTurn = (myPlayerType === 1);
        updateTurnIndicator();
        startTurnTimer(); // Inicia o temporizador quando o jogo começa
    };
    
    // Quando o tempo acabar
    gameClient.onTimeExpired = (data) => {
        handleTimeExpired(data);
    };
}

// Inicia o temporizador do turno
function startTurnTimer() {
    // Limpa qualquer temporizador existente
    if (turnTimer) {
        clearInterval(turnTimer);
    }
    
    // Reset do temporizador
    timeRemaining = 60;
    updateTimerDisplay();
    
    // Inicia um novo temporizador apenas se for minha vez
    if (isMyTurn) {
        turnTimer = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            
            // Se o tempo acabar
            if (timeRemaining <= 0) {
                clearInterval(turnTimer);
                if (gameClient) {
                    console.log("Tempo esgotado, enviando notificação para o servidor...");
                    gameClient.reportTimeExpired();
                }
            }
        }, 1000);
    }
}

// Atualiza o display visual do temporizador
function updateTimerDisplay() {
    if (timerDisplay) {
        timerDisplay.textContent = `Tempo: ${timeRemaining}s`;
        
        // Adiciona classes CSS baseadas no tempo restante
        timerDisplay.classList.remove('time-warning', 'time-critical');
        if (timeRemaining <= 10) {
            timerDisplay.classList.add('time-critical');
        } else if (timeRemaining <= 20) {
            timerDisplay.classList.add('time-warning');
        }
    }
}

// Lida com o evento de tempo expirado
function handleTimeExpired(data) {
    // Limpa o temporizador atual
    if (turnTimer) {
        clearInterval(turnTimer);
    }
    
    // Verificar se o jogador atual perdeu
    const iLost = data.player === myPlayerType;
    
    // Atualizar o status visual do jogo
    const gameStatusBar = document.getElementById('gameStatusBar');
    if (gameStatusBar) {
        if (iLost) {
            gameStatusBar.textContent = "Seu tempo acabou! Você perdeu a partida.";
            gameStatusBar.style.color = "#ff0000";
        } else {
            gameStatusBar.textContent = "Tempo do oponente acabou! Você venceu a partida.";
            gameStatusBar.style.color = "#00ff00";
        }
    }
    
    // Mostrar resultado visualmente no overlay
    const overlay = document.getElementById('result-overlay');
    const resultMessage = document.getElementById('result-message');
    const countdown = document.getElementById('countdown');
    
    if (overlay && resultMessage && countdown) {
        if (iLost) {
            resultMessage.innerHTML = 'TEMPO ESGOTADO!<br><span style="color: #ff5555">Você Perdeu</span>';
        } else {
            resultMessage.innerHTML = 'TEMPO DO OPONENTE ESGOTADO!<br><span style="color: #55ff55">Você Venceu</span>';
        }
        
        // Mostrar o overlay
        overlay.style.display = 'flex';
        
        // Iniciar contagem regressiva
        let secondsLeft = 5;
        const countdownInterval = setInterval(() => {
            secondsLeft--;
            countdown.textContent = `Voltando ao menu em ${secondsLeft}...`;
            
            if (secondsLeft <= 0) {
                clearInterval(countdownInterval);
                window.location.reload();
            }
        }, 1000);
    }
    
    // Desabilitar todas as interações com o tabuleiro
    disableAllBoardInteractions();
}

// Função auxiliar para desabilitar todas as interações com o tabuleiro
function disableAllBoardInteractions() {
    // Remover a seleção atual
    if (selectedPiece) {
        selectedPiece.pieceImage.clearTint();
        selectedPiece = null;
    }
    
    // Desativar eventos de clique para todas as peças
    for (let line = 0; line < 8; line++) {
        for (let col = 0; col < 8; col++) {
            const piece = BOARD[line][col];
            if (piece && piece.pieceImage) {
                piece.pieceImage.disableInteractive();
            }
        }
    }
}

// Processa o movimento recebido do oponente
function processOpponentMove(data) {
    const { from, to, isMultipleCapture } = data;
    
    // Encontra a peça no tabuleiro baseado nas coordenadas recebidas
    const piece = BOARD[from.y][from.x];
    
    // Simula o movimento na interface
    if (piece && piece.type !== EMPTY_PIECE) {
        // Lógica para mover a peça visualmente
        moveOpponentPiece(piece, to.x, to.y);
        
        // Se for uma captura múltipla, não alterar o turno ainda
        if (isMultipleCapture) {
            // Atualiza a interface para mostrar que o oponente está em captura múltipla
            const gameStatusBar = document.getElementById('gameStatusBar');
            if (gameStatusBar) {
                gameStatusBar.textContent = `Oponente realizando capturas múltiplas...`;
                gameStatusBar.style.color = "red";
            }
            
            return; // Não troca o turno ainda
        }
        
        // Atualiza a vez (isMyTurn)
        isMyTurn = true;
        PLAYER_TURN = (PLAYER_TURN === PLAYER_ONE) ? PLAYER_TWO : PLAYER_ONE;
        
        // Verifica capturas obrigatórias após o movimento do oponente
        // mas apenas para o jogador atual, não para o outro
        const hasCaptures = hasMandatoryCaptures(PLAYER_TURN, true);
        
        updateTurnIndicator();
        
        // Se houver capturas obrigatórias, notificar o jogador
        if (isMyTurn && hasCaptures) {
            // Atualiza a interface para informar capturas obrigatórias
            const gameStatusBar = document.getElementById('gameStatusBar');
            if (gameStatusBar) {
                gameStatusBar.textContent = `Sua vez (Jogador ${myPlayerType}) - Você tem capturas obrigatórias!`;
                gameStatusBar.style.color = "orange";
            }
        }
        
        // Reinicia o temporizador após o movimento do oponente
        startTurnTimer();
    }
}

// Move a peça do oponente visualmente
function moveOpponentPiece(piece, targetX, targetY) {
    let dx = targetX - piece.col;
    let dy = targetY - piece.line;
    
    // Se for captura, remove as peças capturadas
    if (Math.abs(dx) > 1 && Math.abs(dy) > 1) {
        let stepX = dx > 0 ? 1 : -1;
        let stepY = dy > 0 ? 1 : -1;
        
        let capturedX = piece.col + stepX;
        let capturedY = piece.line + stepY;
        
        while (capturedX !== targetX && capturedY !== targetY) {
            let capturedPiece = BOARD[capturedY][capturedX];
            if (capturedPiece.type !== EMPTY_PIECE) {
                capturedPiece.pieceImage.destroy();
                BOARD[capturedY][capturedX] = new Piece(capturedY, capturedX, EMPTY_PIECE, false, null);
                
                // Atualiza pontuação
                if (capturedPiece.type === WHITE_PIECE || capturedPiece.type === WHITE_PIECE_KING) {
                    brownScore++;
                } else {
                    whiteScore++;
                }
            }
            capturedX += stepX;
            capturedY += stepY;
        }
    }
    
    // Guarda a posição antiga
    let oldLine = piece.line;
    let oldCol = piece.col;
    
    // Atualiza as coordenadas da peça
    piece.line = targetY;
    piece.col = targetX;
    
    // Posição na tela
    const locationX = targetX * locationSize + locationSize / 2;
    const locationY = targetY * locationSize + locationSize / 2;
    
    // Verifica se a peça vira rei
    if ((piece.type === WHITE_PIECE && targetY === 7) || (piece.type === BROWN_PIECE && targetY === 0)) {
        piece.pieceImage.destroy();
        
        // Cria o rei
        const kingTexture = piece.type === WHITE_PIECE ? 'piece_white_king' : 'piece_brown_king';
        piece.pieceImage = currentScene.add.image(locationX, locationY, kingTexture);
        piece.pieceImage.setDisplaySize(locationSize, locationSize);
        piece.pieceImage.setInteractive();
        
        // Configura o tipo da peça e marca como rei
        piece.type = piece.type === WHITE_PIECE ? WHITE_PIECE_KING : BROWN_PIECE_KING;
        piece.isKing = true;
        
        // Adiciona evento de clique para o rei
        setupPieceClickEvent(piece);
    } else {
        // Apenas move a peça
        piece.pieceImage.setPosition(locationX, locationY);
    }
    
    // Atualiza o tabuleiro
    BOARD[targetY][targetX] = piece;
    BOARD[oldLine][oldCol] = new Piece(oldLine, oldCol, EMPTY_PIECE, false, null);
    
    // Verifica se há um vencedor
    verifyWinner();
}

// Inicializa o tabuleiro
function initializeBoard(scene) {
    setupEmptyBoard(scene);
    setupWhitePieces(scene);
    setupBrownPieces(scene);
}

// Configura o tabuleiro vazio com eventos
function setupEmptyBoard(scene) {
    for (let linha = 0; linha < 8; linha++) {
        for (let coluna = 0; coluna < 8; coluna++) {
            let square = scene.add.rectangle(
                (coluna * locationSize + locationSize / 2), 
                (linha * locationSize + locationSize / 2)
            );
            square.setInteractive();

            BOARD[linha][coluna] = new Piece(linha, coluna, EMPTY_PIECE, false, null);

            let x = (coluna * locationSize + locationSize / 2);
            let y = (linha * locationSize + locationSize / 2);

            let border = scene.add.graphics();
            border.lineStyle(2, 0xff0000);
            border.strokeRect(x - locationSize / 2, y - locationSize / 2, locationSize, locationSize);
            border.setVisible(false);

            square.on('pointerover', () => {
                border.setVisible(true);
            });

            square.on('pointerout', () => {
                border.setVisible(false);
            });

            square.on('pointerdown', (pointer) => {
                if (!isMultiplayerMode || isMyTurn) {
                    handleSquareClick(pointer, scene);
                } else {
                    // Não é a vez do jogador
                    console.log("Não é sua vez de jogar.");
                }
            });
        }
    }
}

// Função para lidar com o clique em um quadrado
function handleSquareClick(pointer, scene) {
    let x = Math.floor(pointer.x / locationSize);
    let y = Math.floor(pointer.y / locationSize);

    // Verifica se o quadrado de destino é preto
    if ((y + x) % 2 !== 0) {
        let piece = BOARD[y][x];
        
        // Se uma captura múltipla estiver em andamento, apenas a peça que está capturando pode ser movida
        if (isMultipleCaptureInProgress && selectedPiece !== pieceInMultipleCapture) {
            if (piece !== pieceInMultipleCapture) {
                console.log("Você deve continuar a captura com a mesma peça!");
                
                // Selecionar automaticamente a peça que deve continuar capturando
                if (selectedPiece != null) {
                    selectedPiece.pieceImage.clearTint();
                }
                pieceInMultipleCapture.pieceImage.setTint(0xff0000);
                selectedPiece = pieceInMultipleCapture;
                
                return;
            }
        }
        
        if (selectedPiece != null && piece.type === EMPTY_PIECE) {
            // Determina qual jogador está fazendo o movimento baseado no tipo da peça
            const currentPlayerFromPiece = (selectedPiece.type === WHITE_PIECE || selectedPiece.type === WHITE_PIECE_KING) 
                ? PLAYER_ONE 
                : PLAYER_TWO;
                
            // Verifica se o movimento é válido para o modo multiplayer
            const isValidForPlayer = 
                (myPlayerType === 1 && (selectedPiece.type === WHITE_PIECE || selectedPiece.type === WHITE_PIECE_KING)) ||
                (myPlayerType === 2 && (selectedPiece.type === BROWN_PIECE || selectedPiece.type === BROWN_PIECE_KING));
            
            if (!isValidForPlayer) {
                console.log("Você só pode mover suas próprias peças.");
                return;
            }
                
            // Passa o jogador correto baseado no tipo da peça para a validação do movimento
            if (isValidMove(selectedPiece, x, y, currentPlayerFromPiece)) {
                // Guarda informações de posição para enviar ao servidor
                const fromPosition = { x: selectedPiece.col, y: selectedPiece.line };
                const toPosition = { x, y };
                
                let dx = x - selectedPiece.col;
                let dy = y - selectedPiece.line;
                let isCaptureMove = false;

                // Verifica se o movimento é uma captura
                if (Math.abs(dx) > 1 && Math.abs(dy) > 1) {
                    isCaptureMove = true;
                    let stepX = dx > 0 ? 1 : -1;
                    let stepY = dy > 0 ? 1 : -1;

                    let capturedX = selectedPiece.col + stepX;
                    let capturedY = selectedPiece.line + stepY;

                    while (capturedX !== x && capturedY !== y) {
                        let capturedPiece = BOARD[capturedY][capturedX];
                        if (capturedPiece.type !== EMPTY_PIECE && capturedPiece.type !== selectedPiece.type) {
                            capturedPiece.pieceImage.destroy();
                            BOARD[capturedY][capturedX] = new Piece(capturedY, capturedX, EMPTY_PIECE, false, null);

                            if (capturedPiece.type === WHITE_PIECE || capturedPiece.type === WHITE_PIECE_KING) {
                                brownScore++;
                            } else {
                                whiteScore++;
                            }

                            IS_LAST_MOVE_CAPTURE = true;

                            console.log(`White Score: ${whiteScore}, Brown Score: ${brownScore}`);
                        }
                        capturedX += stepX;
                        capturedY += stepY;
                    }
                }

                selectedPiece.pieceImage.clearTint();

                let oldPieceX = selectedPiece.line;
                let oldPieceY = selectedPiece.col;

                selectedPiece.line = y;
                selectedPiece.col = x;

                const locationX = x * locationSize + locationSize / 2;
                const locationY = y * locationSize + locationSize / 2;

                // Verificação para promoção a rei
                if (y === 0 || y === 7) {
                    selectedPiece.pieceImage.destroy();
                    selectedPiece.pieceImage = scene.add.image(locationX, locationY, 
                        selectedPiece.type === WHITE_PIECE ? 'piece_white_king' : 'piece_brown_king');
                    
                    if (selectedPiece.type != WHITE_PIECE_KING || selectedPiece.type != BROWN_PIECE_KING) {
                        createKing(selectedPiece, selectedPiece.type === WHITE_PIECE ? WHITE_PIECE_KING : BROWN_PIECE_KING);
                    }
                } else {
                    selectedPiece.pieceImage.setPosition(locationX, locationY);
                }

                BOARD[y][x] = selectedPiece;
                BOARD[oldPieceX][oldPieceY] = new Piece(oldPieceX, oldPieceY, EMPTY_PIECE, false, null);

                // NOVA LÓGICA PARA CAPTURA MÚLTIPLA
                if (isCaptureMove) {
                    // Verifica se a peça que acabou de capturar pode capturar novamente
                    if (canCapture(selectedPiece)) {
                        isMultipleCaptureInProgress = true;
                        pieceInMultipleCapture = selectedPiece;
                        
                        // Mantém a seleção na peça atual para continuar a captura
                        selectedPiece.pieceImage.setTint(0xff0000);
                        
                        // No modo multiplayer, enviar o movimento parcial para o servidor
                        if (isMultiplayerMode) {
                            // Enviar movimento para o servidor com flag de captura múltipla
                            gameClient.makeMove(fromPosition, toPosition, true);
                            
                            updateTurnIndicator(true); // Atualiza a interface sem trocar o turno
                        }
                        
                        // Notificar o jogador que deve continuar a captura
                        const gameStatusBar = document.getElementById('gameStatusBar');
                        if (gameStatusBar) {
                            gameStatusBar.textContent = "Continue a captura com a mesma peça!";
                            gameStatusBar.style.color = "orange";
                        }
                        
                        return; // Não finaliza o turno ainda
                    }
                }
                
                // Se chegamos aqui, não há mais capturas para a peça atual
                isMultipleCaptureInProgress = false;
                pieceInMultipleCapture = null;

                // No modo multiplayer, enviar o movimento para o servidor
                if (isMultiplayerMode) {
                    // Enviar movimento para o servidor
                    gameClient.makeMove(fromPosition, toPosition, false);
                    
                    // Atualizar a vez
                    isMyTurn = false;
                    PLAYER_TURN = (PLAYER_TURN === PLAYER_ONE) ? PLAYER_TWO : PLAYER_ONE;
                    updateTurnIndicator();
                    
                    // Reinicia o temporizador após fazer um movimento
                    startTurnTimer();
                }

                // Limpa a seleção
                selectedPiece = null;
                
                // Verificação de vencedor
                verifyWinner();
            } else {
                console.log("Movimento inválido: movimento não permitido.");
            }
        }
    } else {
        console.log("Movimento inválido: só é permitido mover para quadrados pretos.");
    }
}

// Configura as peças brancas
function setupWhitePieces(scene) {
    for (var linha = 0; linha < 3; linha++) {
        for (var coluna = 0; coluna < 8; coluna++) {
            if ((linha + coluna) % 2 !== 0) {
                let x = (coluna * locationSize + locationSize / 2);
                let y = (linha * locationSize + locationSize / 2);
                let piece = scene.add.image(x, y, 'piece_white');
                piece.setDisplaySize(locationSize, locationSize);
                piece.setInteractive();

                const pieceObj = new Piece(linha, coluna, WHITE_PIECE, false, piece);
                BOARD[linha][coluna] = pieceObj;

                setupPieceClickEvent(pieceObj);

                SQUARES.push(piece);
            }
        }
    }
}

// Configura as peças marrons
function setupBrownPieces(scene) {
    for (var linha = 5; linha < 8; linha++) {
        for (var coluna = 0; coluna < 8; coluna++) {
            if ((linha + coluna) % 2 !== 0) {
                let x = (coluna * locationSize + locationSize / 2);
                let y = (linha * locationSize + locationSize / 2);
                let piece = scene.add.image(x, y, 'piece_brown');
                piece.setDisplaySize(locationSize, locationSize);
                piece.setInteractive();

                const pieceObj = new Piece(linha, coluna, BROWN_PIECE, false, piece);
                BOARD[linha][coluna] = pieceObj;

                setupPieceClickEvent(pieceObj);

                SQUARES.push(piece);
            }
        }
    }
}

// Configura o evento de clique para uma peça
function setupPieceClickEvent(piece) {
    // Somente configura o evento se a peça tiver uma imagem
    if (!piece.pieceImage) return;
    
    piece.pieceImage.on('pointerdown', (pointer) => {
        if (!isMultiplayerMode || isMyTurn) {
            // Verifica se uma captura múltipla está em andamento
            if (isMultipleCaptureInProgress && piece !== pieceInMultipleCapture) {
                alert("Você deve continuar a captura com a mesma peça!");
                
                // Selecionar automaticamente a peça que deve continuar capturando
                if (selectedPiece != null) {
                    selectedPiece.pieceImage.clearTint();
                }
                pieceInMultipleCapture.pieceImage.setTint(0xff0000);
                selectedPiece = pieceInMultipleCapture;
                
                return;
            }
            
            // Verifica se é a peça do jogador atual no modo multiplayer
            if (isMultiplayerMode) {
                const isWhitePiece = piece.type === WHITE_PIECE || piece.type === WHITE_PIECE_KING;
                const isBrownPiece = piece.type === BROWN_PIECE || piece.type === BROWN_PIECE_KING;
                
                if ((myPlayerType === 1 && !isWhitePiece) || (myPlayerType === 2 && !isBrownPiece)) {
                    console.log("Você só pode mover suas próprias peças.");
                    return;
                }
                
                // Verifica se este jogador tem capturas obrigatórias
                const currentPlayer = myPlayerType === 1 ? PLAYER_ONE : PLAYER_TWO;
                const hasCaptures = hasMandatoryCaptures(currentPlayer, true);
                const canCapturePiece = canCapture(piece);
                
                // Se houver capturas obrigatórias mas esta peça não pode capturar, não permitir a seleção
                if (hasCaptures && !canCapturePiece) {
                    alert("Há capturas obrigatórias disponíveis. Você deve usar uma peça que pode capturar.");
                    return;
                }
            } else {
                if ((piece.type === WHITE_PIECE || piece.type === WHITE_PIECE_KING) && PLAYER_TURN !== PLAYER_ONE) {
                    alert("Vez do jogador 2");
                    return;
                }
                if ((piece.type === BROWN_PIECE || piece.type === BROWN_PIECE_KING) && PLAYER_TURN !== PLAYER_TWO) {
                    alert("Vez do jogador 1");
                    return;
                }
            }
            
            // Limpa seleção anterior
            if (selectedPiece != null) {
                selectedPiece.pieceImage.clearTint();
            }
            
            // Marca a peça como selecionada
            piece.pieceImage.setTint(0xff0000);
            
            let x = Math.floor(pointer.x / locationSize);
            let y = Math.floor(pointer.y / locationSize);
            
            selectedPiece = BOARD[y][x];
        } else {
            console.log("Não é sua vez de jogar.");
        }
    });
}

// Atualiza o indicador de turno na interface
function updateTurnIndicator(multipleCaptureInProgress = false) {
    const gameStatusBar = document.getElementById('gameStatusBar');
    if (gameStatusBar) {
        if (isMyTurn) {
            if (multipleCaptureInProgress) {
                // Status para captura múltipla em andamento
                gameStatusBar.textContent = `Sua vez (Jogador ${myPlayerType}) - Continue a captura com a mesma peça!`;
                gameStatusBar.style.color = "orange";
                return;
            }
            
            // Verifica se há capturas obrigatórias para este jogador
            const hasCaptures = hasMandatoryCaptures(
                myPlayerType === 1 ? PLAYER_ONE : PLAYER_TWO, 
                true
            );
            
            if (hasCaptures) {
                gameStatusBar.textContent = `Sua vez (Jogador ${myPlayerType}) - Você tem capturas obrigatórias!`;
                gameStatusBar.style.color = "orange";
            } else {
                gameStatusBar.textContent = `Sua vez (Jogador ${myPlayerType})`;
                gameStatusBar.style.color = "green";
            }
        } else {
            gameStatusBar.textContent = `Vez do oponente (Jogador ${myPlayerType === 1 ? 2 : 1})`;
            gameStatusBar.style.color = "red";
        }
    }
    
    // Também atualiza o temporizador
    updateTimerDisplay();
}

// Função para criar um rei
function createKing(piece, type) {
    piece.pieceImage.setDisplaySize(locationSize, locationSize);
    piece.pieceImage.setInteractive();
    piece.type = type;
    piece.isKing = true;

    setupPieceClickEvent(piece);
}

// Mantém as funções existentes
function verifyWinner() {
    let whitePiecesInGame = 0;
    let brownPiecesInGame = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (BOARD[i][j].type === WHITE_PIECE || BOARD[i][j].type === WHITE_PIECE_KING) {
                whitePiecesInGame++;
            }
            if (BOARD[i][j].type === BROWN_PIECE || BOARD[i][j].type === BROWN_PIECE_KING) {
                brownPiecesInGame++;
            }
        }
    }

    if (whitePiecesInGame > 0 && brownPiecesInGame == 0) {
        alert("O jogador 1 ganhou!");
        window.location.reload();
    }
    if (brownPiecesInGame > 0 && whitePiecesInGame == 0) {
        alert("O jogador 2 ganhou!");
        window.location.reload();
    }
}

// Modificada para receber o jogador como parâmetro explícito
function isValidMove(piece, targetX, targetY, currentPlayer) {
    let dx = targetX - piece.col;
    let dy = targetY - piece.line;

    // Movimento de uma casa (sem captura)
    if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
        // Verificamos as capturas obrigatórias apenas para o jogador que está movendo,
        // não usando a variável global PLAYER_TURN
        if (hasMandatoryCaptures(currentPlayer, true)) {
            alert("Captura obrigatória disponível. Você deve capturar uma peça.");
            return false;
        }
        
        // Peças brancas só podem mover para baixo (a menos que sejam damas)
        if (piece.type === WHITE_PIECE && dy < 0 && !piece.isKing) {
            return false; // Peça branca não pode mover para trás
        }
        // Peças marrons só podem mover para cima (a menos que sejam damas)
        if (piece.type === BROWN_PIECE && dy > 0 && !piece.isKing) {
            return false;
        }
        return true;
    }

    if (Math.abs(dx) !== Math.abs(dy)) {
        return false;
    }

    if (Math.abs(dx) > 1 && Math.abs(dy) > 1) {
        let stepX = dx > 0 ? 1 : -1;
        let stepY = dy > 0 ? 1 : -1;

        let x = piece.col + stepX;
        let y = piece.line + stepY;

        let capturedPiece = null;

        while (x !== targetX && y !== targetY) {
            let currentPiece = BOARD[y][x];
            if (currentPiece.type !== EMPTY_PIECE) {
                if (capturedPiece !== null) {
                    return false;
                }
                capturedPiece = currentPiece;
            }
            x += stepX;
            y += stepY;
        }

        if (capturedPiece !== null && capturedPiece.type !== piece.type) {
            capturedPiece.pieceImage.setTint(0x00ff00);
            return true;
        }

        if (capturedPiece === null && piece.isKing) {
            return true;
        }
    }

    return false;
}

// Modificada para incluir um parâmetro que controla se deve verificar peças do jogador
function hasMandatoryCaptures(player, checkOnlyForCurrentPlayer = false) {
    // Se estamos no modo multiplayer e apenas verificando para o jogador atual
    if (isMultiplayerMode && checkOnlyForCurrentPlayer) {
        // Determinamos quais tipos de peças pertencem ao jogador atual
        const isPlayerOne = player === PLAYER_ONE;
        const pieceTypes = isPlayerOne 
            ? [WHITE_PIECE, WHITE_PIECE_KING] 
            : [BROWN_PIECE, BROWN_PIECE_KING];
        
        // Verificamos apenas as peças do jogador atual
        for (let line = 0; line < 8; line++) {
            for (let col = 0; col < 8; col++) {
                const piece = BOARD[line][col];
                if (piece.type !== EMPTY_PIECE && pieceTypes.includes(piece.type)) {
                    if (canCapture(piece)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    } else {
        // Comportamento original para o modo não-multiplayer
        for (let line = 0; line < 8; line++) {
            for (let col = 0; col < 8; col++) {
                const piece = BOARD[line][col];
                if (piece.type !== EMPTY_PIECE) {
                    if (player === PLAYER_ONE && (piece.type === WHITE_PIECE || piece.type === WHITE_PIECE_KING)) {
                        if (canCapture(piece)) {
                            return true;
                        }
                    }
                    if (player === PLAYER_TWO && (piece.type === BROWN_PIECE || piece.type === BROWN_PIECE_KING)) {
                        if (canCapture(piece)) {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
}

function canCapture(piece) {
    const directions = [
        { x: -1, y: -1 },
        { x: -1, y: 1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 }
    ];

    const piecesThatCanCapture = [];

    if (piece.isKing) {
        for (let dir of directions) {
            let x = piece.line + dir.x;
            let y = piece.col + dir.y;
            let stop = false;

            if ((x >= 0 && x < 8) && (y >= 0 && y < 8)) {
                while (((x >= 0 && x < 8) && (y >= 0 && y < 8)) && !stop) {
                    const adjacentPiece = BOARD[x][y];

                    const isWhitePiece = piece.type === WHITE_PIECE || piece.type === WHITE_PIECE_KING;
                    const isBrownPiece = piece.type === BROWN_PIECE || piece.type === BROWN_PIECE_KING;
                    const isAdjancetPieceWhite = adjacentPiece.type === WHITE_PIECE || adjacentPiece.type === WHITE_PIECE_KING;
                    const isAdjancetPieceBrown = adjacentPiece.type === BROWN_PIECE || adjacentPiece.type === BROWN_PIECE_KING;

                    if ((isWhitePiece && isAdjancetPieceBrown) || (isBrownPiece && isAdjancetPieceWhite)) {
                        let jumpX = x + dir.x;
                        let jumpY = y + dir.y;
                        if ((jumpX >= 0 && jumpX < 8) && (jumpY >= 0 && jumpY < 8)) {
                            if (BOARD[jumpX][jumpY].type === EMPTY_PIECE) {
                                adjacentPiece.pieceImage.setTint(0x00ff00);
                                piecesThatCanCapture.push(adjacentPiece);
                                // stop = true;
                            }
                            stop = true;
                        } else {
                            stop = true;
                        }
                    } else {
                        x += dir.x;
                        y += dir.y;
                    }
                }
            }
        }
    } else {
        for (let dir of directions) {
            let x = piece.line + dir.x;
            let y = piece.col + dir.y;

            if ((x >= 0 && x < 8) && (y >= 0 && y < 8)) {
                const adjacentPiece = BOARD[x][y];
                if (piece.type !== EMPTY_PIECE) {

                    const isWhitePiece = piece.type === WHITE_PIECE || piece.type === WHITE_PIECE_KING;
                    const isBrownPiece = piece.type === BROWN_PIECE || piece.type === BROWN_PIECE_KING;
                    const isAdjancetPieceWhite = adjacentPiece.type === WHITE_PIECE || adjacentPiece.type === WHITE_PIECE_KING;
                    const isAdjancetPieceBrown = adjacentPiece.type === BROWN_PIECE || adjacentPiece.type === BROWN_PIECE_KING;

                    if ((isWhitePiece && isAdjancetPieceBrown) || (isBrownPiece && isAdjancetPieceWhite)) {
                        let jumpX = x + dir.x;
                        let jumpY = y + dir.y;
                        if ((jumpX >= 0 && jumpX < 8) && (jumpY >= 0 && jumpY < 8)) {
                            if (BOARD[jumpX][jumpY].type === EMPTY_PIECE) {
                                adjacentPiece.pieceImage.setTint(0x00ff00);
                                piecesThatCanCapture.push(adjacentPiece);
                            }
                        }
                    }
                }
            }
        }
    }

    return piecesThatCanCapture.length > 0;
}