class Piece {
    line;
    col;
    type;
    isKing;
    pieceImage;

    constructor(line, col, type, isKing, pieceImage) {
        this.line = line;
        this.col = col;
        this.type = type;
        this.isKing = isKing;
        this.pieceImage = pieceImage;
    }

}