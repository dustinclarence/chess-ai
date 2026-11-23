# Chess AI

Play chess against a computer opponent. The engine searches ahead with negamax (minimax) and alpha-beta pruning and scores positions with material and piece-square tables.

**Live demo:** https://dustinclarence.github.io/chess-ai/

> **AI-assisted build.** This project was built with the help of an AI coding assistant (Claude) as a learning project for my portfolio.

## Features

- Full legal rules: castling, en passant, promotion (to queen), check, checkmate, stalemate, 50-move rule
- Four difficulty levels (search depth 1 to 4)
- Undo, hint, play as White or Black
- AI insight panel: positions searched, evaluation, search time
- Move generator checked with standard perft counts

## AI techniques

Minimax / negamax, alpha-beta pruning, move ordering, evaluation functions

## Built with

HTML, CSS and vanilla JavaScript. No frameworks, no build step and no external AI service. Everything runs in the browser.

## Run locally

Open `index.html` through any static server, for example:

```bash
npx serve .
```
