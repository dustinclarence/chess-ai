// Chess AI — legal chess rules + negamax search with alpha-beta pruning.

/* ================= Rules engine ================= */
const START = 'rnbqkbnrpppppppp' + '.'.repeat(32) + 'PPPPPPPPRNBQKBNR';
const isWhite = (p) => p !== '.' && p === p.toUpperCase();
const colorOf = (p) => (p === '.' ? null : isWhite(p) ? 'w' : 'b');
const rc = (i) => [i >> 3, i & 7];
const sqName = (i) => 'abcdefgh'[i & 7] + (8 - (i >> 3));

function newGame() {
  return { b: START.split(''), turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0 };
}

const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function attacked(b, sq, by) {
  const [r, c] = rc(sq);
  const W = by === 'w';
  // pawns
  const pr = W ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    const cc = c + dc;
    if (pr >= 0 && pr < 8 && cc >= 0 && cc < 8 && b[pr * 8 + cc] === (W ? 'P' : 'p')) return true;
  }
  for (const [dr, dc] of KN) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === (W ? 'N' : 'n')) return true;
  }
  for (const [dr, dc] of KG) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === (W ? 'K' : 'k')) return true;
  }
  const slide = (dirs, pieces) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = b[rr * 8 + cc];
        if (p !== '.') {
          if (colorOf(p) === by && pieces.includes(p.toLowerCase())) return true;
          break;
        }
        rr += dr; cc += dc;
      }
    }
    return false;
  };
  return slide(DIAG, 'bq') || slide(ORTH, 'rq');
}

function kingSq(b, color) {
  return b.indexOf(color === 'w' ? 'K' : 'k');
}
function inCheck(s, color = s.turn) {
  return attacked(s.b, kingSq(s.b, color), color === 'w' ? 'b' : 'w');
}

function pseudoMoves(s) {
  const { b, turn } = s;
  const moves = [];
  const enemy = turn === 'w' ? 'b' : 'w';
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (colorOf(p) !== turn) continue;
    const [r, c] = rc(i);
    const t = p.toLowerCase();
    const add = (to, extra = {}) => moves.push({ from: i, to, piece: p, cap: b[to], ...extra });
    if (t === 'p') {
      const dir = turn === 'w' ? -1 : 1;
      const startRow = turn === 'w' ? 6 : 1;
      const lastRow = turn === 'w' ? 0 : 7;
      const one = i + dir * 8;
      if (r + dir >= 0 && r + dir < 8 && b[one] === '.') {
        if (r + dir === lastRow) add(one, { promo: turn === 'w' ? 'Q' : 'q' });
        else add(one);
        const two = i + dir * 16;
        if (r === startRow && b[two] === '.') add(two, { double: true });
      }
      for (const dc of [-1, 1]) {
        const cc = c + dc, rr = r + dir;
        if (cc < 0 || cc > 7 || rr < 0 || rr > 7) continue;
        const to = rr * 8 + cc;
        if (colorOf(b[to]) === enemy) {
          if (rr === lastRow) add(to, { promo: turn === 'w' ? 'Q' : 'q' });
          else add(to);
        } else if (to === s.ep) add(to, { ep: true, cap: turn === 'w' ? 'p' : 'P' });
      }
    } else if (t === 'n' || t === 'k') {
      for (const [dr, dc] of t === 'n' ? KN : KG) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const to = rr * 8 + cc;
        if (colorOf(b[to]) !== turn) add(to);
      }
      if (t === 'k') {
        const W = turn === 'w';
        const home = W ? 60 : 4;
        if (i === home && !attacked(b, home, enemy)) {
          if ((W ? s.castle.K : s.castle.k) && b[home + 1] === '.' && b[home + 2] === '.' && !attacked(b, home + 1, enemy) && !attacked(b, home + 2, enemy))
            add(home + 2, { castle: 'K' });
          if ((W ? s.castle.Q : s.castle.q) && b[home - 1] === '.' && b[home - 2] === '.' && b[home - 3] === '.' && !attacked(b, home - 1, enemy) && !attacked(b, home - 2, enemy))
            add(home - 2, { castle: 'Q' });
        }
      }
    } else {
      const dirs = t === 'b' ? DIAG : t === 'r' ? ORTH : [...DIAG, ...ORTH];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const to = rr * 8 + cc;
          if (b[to] === '.') add(to);
          else {
            if (colorOf(b[to]) === enemy) add(to);
            break;
          }
          rr += dr; cc += dc;
        }
      }
    }
  }
  return moves;
}

function makeMove(s, m) {
  const b = s.b.slice();
  const castle = { ...s.castle };
  b[m.to] = m.promo || m.piece;
  b[m.from] = '.';
  if (m.ep) b[m.to + (s.turn === 'w' ? 8 : -8)] = '.';
  if (m.castle) {
    const row = s.turn === 'w' ? 56 : 0;
    if (m.castle === 'K') { b[row + 5] = b[row + 7]; b[row + 7] = '.'; }
    else { b[row + 3] = b[row]; b[row] = '.'; }
  }
  if (m.piece === 'K') castle.K = castle.Q = false;
  if (m.piece === 'k') castle.k = castle.q = false;
  for (const [sq, key] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.from === sq || m.to === sq) castle[key] = false;
  return {
    b,
    turn: s.turn === 'w' ? 'b' : 'w',
    castle,
    ep: m.double ? (m.from + m.to) / 2 : -1,
    half: m.piece.toLowerCase() === 'p' || m.cap !== '.' ? 0 : s.half + 1,
  };
}

function legalMoves(s) {
  return pseudoMoves(s).filter((m) => !inCheck(makeMove(s, m), s.turn));
}

/* ================= Evaluation ================= */
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Piece-square tables from White's point of view (index 0 = a8).
const PST = {
  p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
};

function evaluate(b) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (p === '.') continue;
    const t = p.toLowerCase();
    if (isWhite(p)) score += VAL[t] + PST[t][i];
    else score -= VAL[t] + PST[t][(7 - (i >> 3)) * 8 + (i & 7)];
  }
  return score; // White's point of view, centipawns
}

/* ================= Search ================= */
const MATE = 100000;
let nodes = 0;

function order(moves) {
  return moves.sort((a, b) => (b.cap !== '.' ? VAL[b.cap.toLowerCase()] * 10 - VAL[b.piece.toLowerCase()] : 0) + (b.promo ? 800 : 0) - ((a.cap !== '.' ? VAL[a.cap.toLowerCase()] * 10 - VAL[a.piece.toLowerCase()] : 0) + (a.promo ? 800 : 0)));
}

function negamax(s, depth, alpha, beta, ply) {
  nodes++;
  if (depth === 0) return (s.turn === 'w' ? 1 : -1) * evaluate(s.b);
  const moves = legalMoves(s);
  if (!moves.length) return inCheck(s) ? -MATE + ply : 0;
  if (s.half >= 100) return 0;
  let best = -Infinity;
  for (const m of order(moves)) {
    const v = -negamax(makeMove(s, m), depth - 1, -beta, -alpha, ply + 1);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

function bestMove(s, depth, randomness = 0) {
  nodes = 0;
  const t0 = performance.now();
  let best = null, bestV = -Infinity;
  const scored = [];
  for (const m of order(legalMoves(s))) {
    const v = -negamax(makeMove(s, m), depth - 1, -Infinity, Infinity, 1);
    scored.push({ m, v });
    if (v > bestV) { bestV = v; best = m; }
  }
  if (randomness && scored.length > 1) {
    // Beginner: sometimes pick a reasonable but not best move.
    const ok = scored.filter((x) => x.v >= bestV - randomness);
    best = ok[Math.floor(Math.random() * ok.length)].m;
  }
  return { move: best, score: bestV, nodes, ms: Math.round(performance.now() - t0) };
}

/* ================= Notation ================= */
function san(s, m, after) {
  let str;
  if (m.castle) str = m.castle === 'K' ? 'O-O' : 'O-O-O';
  else {
    const t = m.piece.toUpperCase();
    const capture = m.cap !== '.';
    str = (t === 'P' ? (capture ? sqName(m.from)[0] : '') : t) + (capture ? 'x' : '') + sqName(m.to) + (m.promo ? '=Q' : '');
  }
  if (inCheck(after)) str += legalMoves(after).length ? '+' : '#';
  return str;
}

/* ================= UI ================= */
const VS15 = '︎'; // asks for text-style glyphs instead of emoji
const GLYPH = { k: '♚' + VS15, q: '♛' + VS15, r: '♜' + VS15, b: '♝' + VS15, n: '♞' + VS15, p: '♟' + VS15 };
const NAME = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const $ = (id) => document.getElementById(id);
const boardEl = $('board');

let game, history, sans, human, selected, targets, last, thinking, hintMove;

function start() {
  game = newGame();
  history = [];
  sans = [];
  human = $('side').value;
  selected = -1;
  targets = [];
  last = null;
  hintMove = null;
  thinking = false;
  $('top-name').textContent = 'Computer';
  $('bottom-name').textContent = 'You';
  $('nodes').textContent = '0';
  $('eval').textContent = '0.0';
  $('time').textContent = '0 ms';
  $('evalfill').style.width = '50%';
  render();
  if (game.turn !== human) setTimeout(aiMove, 300);
}

function viewOrder() {
  const idx = [...Array(64).keys()];
  return human === 'w' ? idx : idx.reverse();
}

function render() {
  const check = inCheck(game) ? kingSq(game.b, game.turn) : -1;
  boardEl.replaceChildren(
    ...viewOrder().map((i, n) => {
      const [r, c] = rc(i);
      const p = game.b[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sq ' + ((r + c) % 2 ? 'dark' : 'light');
      btn.dataset.i = i;
      if (last && (i === last.from || i === last.to)) btn.classList.add('last');
      if (i === selected) btn.classList.add('sel');
      if (i === check) btn.classList.add('check');
      if (hintMove && (i === hintMove.from || i === hintMove.to)) btn.classList.add('hint');
      const t = targets.find((m) => m.to === i);
      if (t) btn.classList.add('target', ...(t.cap !== '.' ? ['capture'] : []));
      btn.setAttribute('aria-label', `${sqName(i)}${p !== '.' ? ', ' + (isWhite(p) ? 'white ' : 'black ') + NAME[p.toLowerCase()] : ''}${t ? ', legal move' : ''}`);
      if (p !== '.') {
        const span = document.createElement('span');
        span.className = 'piece ' + (isWhite(p) ? 'w' : 'b');
        span.textContent = GLYPH[p.toLowerCase()];
        span.setAttribute('aria-hidden', 'true');
        btn.append(span);
      }
      // coordinates on the edge squares
      const row = Math.floor(n / 8), col = n % 8;
      if (row === 7) btn.insertAdjacentHTML('beforeend', `<span class="coord coord--file" aria-hidden="true">${sqName(i)[0]}</span>`);
      if (col === 0) btn.insertAdjacentHTML('beforeend', `<span class="coord coord--rank" aria-hidden="true">${sqName(i)[1]}</span>`);
      return btn;
    }),
  );
  renderSide();
}

function renderSide() {
  const moves = legalMoves(game);
  let msg;
  if (!moves.length) msg = inCheck(game) ? (game.turn === human ? 'Checkmate. The computer wins.' : 'Checkmate! You win. 🎉') : 'Stalemate. It is a draw.';
  else if (game.half >= 100) msg = 'Draw by the 50-move rule.';
  else msg = (game.turn === human ? 'Your move' : 'Computer to move') + ` (${game.turn === 'w' ? 'White' : 'Black'})${inCheck(game) ? ' — check!' : '.'}`;
  $('status').textContent = msg;
  $('thinking').hidden = !thinking;

  $('moves').replaceChildren(
    ...sans.reduce((acc, m, i) => {
      if (i % 2 === 0) acc.push(document.createElement('li'));
      acc[acc.length - 1].textContent += (i % 2 ? '  ' : '') + m;
      return acc;
    }, []),
  );
  $('moves').scrollTop = $('moves').scrollHeight;

  // captured pieces
  const count = (str) => [...str].reduce((m, p) => ((m[p] = (m[p] || 0) + 1), m), {});
  const now = count(game.b.join('')), init = count(START);
  const lost = (white) => 'qrbnp'.split('').map((t) => {
    const k = white ? t.toUpperCase() : t;
    return GLYPH[t].repeat(Math.max(0, (init[k] || 0) - (now[k] || 0)));
  }).join('');
  // human captures opponent pieces
  $('bottom-cap').textContent = lost(human !== 'w');
  $('top-cap').textContent = lost(human === 'w');
}

const sqBtn = (i) => boardEl.querySelector(`[data-i="${i}"]`);
let animating = false;

/* Slide the moving piece (and the rook when castling) from its start square to its new square. */
function animateMove(m) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  const slides = [[m.from, m.to]];
  if (m.castle) {
    const row = m.from - (m.from % 8);
    slides.push(m.castle === 'K' ? [row + 7, row + 5] : [row, row + 3]);
  }
  boardEl.querySelectorAll('.target, .sel').forEach((el) => el.classList.remove('target', 'capture', 'sel'));
  const runs = slides.map(([a, b]) => {
    const fromBtn = sqBtn(a), toBtn = sqBtn(b);
    const piece = fromBtn?.querySelector('.piece');
    if (!piece || !toBtn) return Promise.resolve();
    const f = fromBtn.getBoundingClientRect(), t = toBtn.getBoundingClientRect();
    fromBtn.style.zIndex = 5;
    const victim = toBtn.querySelector('.piece');
    victim?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: 120, fill: 'forwards' });
    return piece.animate(
      [{ transform: 'translate(0, 0)' }, { transform: `translate(${t.left - f.left}px, ${t.top - f.top}px)` }],
      { duration: 260, easing: 'cubic-bezier(.35,0,.25,1)', fill: 'forwards' },
    ).finished.catch(() => {});
  });
  return Promise.all(runs);
}

async function play(m) {
  animating = true;
  await animateMove(m);
  animating = false;
  const before = game;
  game = makeMove(game, m);
  history.push({ state: before, last });
  sans.push(san(before, m, game));
  last = m;
  selected = -1;
  targets = [];
  hintMove = null;
  render();
}

function gameOver() {
  return !legalMoves(game).length || game.half >= 100;
}

function aiMove() {
  if (gameOver() || game.turn === human) return;
  thinking = true;
  renderSide();
  setTimeout(() => {
    const lvl = +$('level').value;
    const res = bestMove(game, lvl, lvl === 1 ? 60 : 0);
    thinking = false;
    const whiteEval = (game.turn === 'w' ? 1 : -1) * res.score;
    showInsight(res, whiteEval);
    if (res.move) play(res.move);
  }, 60);
}

function showInsight(res, whiteEval) {
  $('nodes').textContent = res.nodes.toLocaleString();
  $('time').textContent = res.ms + ' ms';
  const pawns = Math.abs(whiteEval) > MATE / 2 ? (whiteEval > 0 ? 'Mate' : '-Mate') : (whiteEval / 100).toFixed(1);
  $('eval').textContent = pawns;
  const pct = Math.abs(whiteEval) > MATE / 2 ? (whiteEval > 0 ? 100 : 0) : 50 + Math.max(-45, Math.min(45, whiteEval / 20));
  $('evalfill').style.width = pct + '%';
}

boardEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.sq');
  if (!btn || thinking || animating || game.turn !== human || gameOver()) return;
  const i = +btn.dataset.i;
  const move = targets.find((m) => m.to === i);
  if (move) {
    play(move).then(() => setTimeout(aiMove, 120));
    return;
  }
  if (colorOf(game.b[i]) === human) {
    selected = i;
    targets = legalMoves(game).filter((m) => m.from === i);
  } else {
    selected = -1;
    targets = [];
  }
  render();
  boardEl.querySelector(`[data-i="${i}"]`)?.focus();
});

$('new').addEventListener('click', start);
$('side').addEventListener('change', start);
$('undo').addEventListener('click', () => {
  if (thinking || animating) return;
  // take back the computer's reply and your move
  let steps = game.turn === human ? 2 : 1;
  while (steps-- > 0 && history.length) {
    const h = history.pop();
    game = h.state;
    last = h.last;
    sans.pop();
  }
  selected = -1;
  targets = [];
  hintMove = null;
  render();
  if (game.turn !== human) setTimeout(aiMove, 200);
});
$('hint').addEventListener('click', () => {
  if (thinking || game.turn !== human || gameOver()) return;
  const res = bestMove(game, 2);
  hintMove = res.move;
  render();
  $('status').textContent = `Hint: try ${san(game, res.move, makeMove(game, res.move))}.`;
});

start();

// Expose for automated tests.
window.__chess = { newGame, legalMoves, makeMove, bestMove, inCheck };
