# Chess — rule checklist

Game: **Chess** (`/games/chess-queen`)
Rules module: `lib/rules/chess.js` · Tests: `lib/rules/__tests__/chess.test.js`
Server rules: `server/src/chess.rules.ts` (mirror, authoritative for online play)

## Scope

Full FIDE move legality is provided by `chess.js` (castling, en passant, check,
pins, underpromotion). This module owns **game outcome** and **promotion
decisions** so the client and the server agree on how a game ends.

## Pass / fail

| # | Rule | Status | Evidence |
|---|------|--------|----------|
| 1 | Checkmate ends the game with a winner | PASS | `evaluateOutcome` → `checkmate`; Fool's mate verified in browser (modal “Black wins — checkmate”) |
| 2 | Stalemate is a draw | PASS | `evaluateOutcome` → `draw/stalemate` (test) |
| 3 | Insufficient material is a draw | PASS | `evaluateOutcome` → `draw/insufficient` (test) |
| 4 | Threefold repetition is a draw | PASS | `evaluateOutcome` → `draw/repetition` (test) |
| 5 | Fifty-move rule is a draw | PASS | `evaluateOutcome` → `draw/fifty` (test) |
| 6 | Flag fall = loss, unless the opponent cannot possibly mate → draw | PASS | `flagOutcome` + `canSideMate` (tests) |
| 7 | Pawn reaching the last rank must ask for Q/R/B/N | PASS | `needsPromotion` (tests); picker verified in browser → `gxh8=N` |
| 8 | Draw by agreement (online) | PASS | server `respondDraw`; verified two-tab |
| 9 | Resignation ends the game with a winner | PASS | server `resign`; client Resign button |
| 10 | Rematch swaps colours | PASS | server `resetGame`; verified two-tab (board auto-flips) |
| 11 | Online clocks are server-authoritative | PASS | client stops local ticking in online mode; 1 s state push |
| 12 | Clocks do not run before both seats are filled | PASS | `startClock` guard; headless E2E showed 180/180 before join |
| 13 | Time control labels match real durations (3+0 = 3 min) | PASS | `TIME_CONTROLS` base in seconds (180/300/600/900) |
| 14 | Illegal / malformed moves are rejected without crashing | PASS | `makeMove` try/catch; headless E2E “Illegal move” |
| 15 | Promotion move cannot be sent without a piece choice | PASS | client opens picker; server applies `promotion` |
| 16 | Board is actually rendered (64 squares, 32 pieces) | PASS | verified in browser |
| 17 | Board can be flipped, auto-flips to your colour | PASS | verified in browser |
| 18 | Sound respects the `gg:mute` flag | PASS | `playTone` early-returns when muted |
| 19 | Best score in `gg:best:<slug>` | N/A | chess has no score |
| 20 | Ads (interstitial ≥30 s, max 1 / 3 min; rewarded revive) | N/A | no revive in chess; portal-wide ad slots only |

## Known limitations (documented, not hidden)

- The 75-move rule and dead-position claim are not implemented; the 50-move rule
  and insufficient material cover the practical cases.
- Draw offers are accepted/declined only by the opponent (server-enforced).
- Online games are in-memory; a server restart drops live rooms.
- Bot strength comes from Stockfish WASM with a minimax fallback.

## Manual verification (5 steps)

1. Open `/games/chess-queen`. The board must show 32 pieces and “Your move”.
2. Play Fool's mate in **2 Players**: `f2-f3, e7-e5, g2-g4, d8-h4`. A modal must
   appear saying “Black wins — checkmate”.
3. Click **New Game**, then push a pawn to the 8th rank (e.g. `h2-h4 … h6xg7 … gxh8`).
   The “Promote to” picker must appear; choosing ♘ must leave a knight on h8 and
   record `gxh8=N`.
4. Click **Flip Board**: the board must rotate (a8 ↔ h1) and flip back.
5. Online: open two tabs, **Online → Create Room** in tab 1, paste the room id in
   tab 2 → **Join**. Make a move in each tab (state must sync within ~1 s), then
   **Offer Draw → Accept Draw**, then **Rematch → Accept Rematch**: colours must
   swap and clocks reset to 3:00.
