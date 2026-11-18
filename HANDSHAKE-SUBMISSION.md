# RELIC RIOT — 3D Multiplayer Arena Heist

**Live game:** https://icandi40.github.io/relic-riot/

**Source:** https://github.com/Icandi40/relic-riot

## Project description

RELIC RIOT is a browser-based 3D multiplayer arena game created by Sheena Lindsey-Smith with AI-assisted development. Two to four players join from separate devices using a room code or invitation link. Players compete to capture a glowing relic, evade opponents' pulse attacks, and deliver it to changing shrines. The highest score after three minutes wins.

The game includes an original floating-temple environment, four selectable runners, desktop and touch controls, an interactive rules guide, optional synthesized sound, a shared lobby, synchronized countdown and scoring, detailed match recaps, rematches, and a clearly labeled practice mode with a bot. An optional Relic Surge makes the final 30 seconds worth double points, with a shared warning and changing shrine effects. Device-local career challenges award Relic Shards to unlock cosmetic cloak, trail and crown effects. Quick-message presets connect the crew without adding free-form chat.

## Skills demonstrated

- Translating a project brief into a focused, playable product with explicit rules and acceptance criteria.
- Three.js rendering, original 3D geometry, shadows, bloom, animation, camera projection and efficient instanced scenery.
- TypeScript game-state modeling and a host-authoritative simulation separated from rendering and networking.
- Real WebRTC multiplayer with internet signaling, bounded input messages, connection handling and synchronized snapshots.
- Responsive React interfaces, keyboard and touch input, focus-managed instructions and accessible feedback.
- Pure reward and progression logic, idempotent match receipts, validated local persistence, and cosmetic fairness.
- Iterative debugging with 27 simulation/career regression tests and three automated browser suites.
- Reproducible builds, pinned dependencies, readable formatted source, Git history and automated GitHub Pages deployment.

## One concrete debugging example

Browser testing exposed an intermittent pulse failure. A short pulse input could be replaced by a later movement packet before the simulation consumed it. The fix latches a valid action until the next simulation tick while still enforcing cooldown and stun rules. A regression test reproduces that message sequence and verifies exactly one pulse is accepted. This is documented engineering iteration, rather than a claim that the first generated build was finished.

A stronger multiplayer test later exposed movement packets being discarded when rendering blocked the main thread. The simulation now measures input age from the host's monotonic receipt time and integrates a new packet once with bounded movement. An injectable clock makes the stalled-frame case reproducible in a unit test. Already-consumed stale input stops. The renderer also reduces decorative effects after sustained low frame rate. Completed standings are frozen so a departed player cannot rewrite the winner or reward.

## How to try it

Open the live URL. Select **Practice Run** to learn the controls immediately. For the multiplayer requirement, one player creates a room and shares **Copy Invite** with another person on a separate device. Both select **I'm Ready**, and the host starts the match. Rules and controls are available through **How to Play**.

## Scope and limitations

This is a casual invite-based game. The host keeps the room running and must leave their game tab open and active. Public signaling and library-default connection services are external dependencies; restrictive networks may require another connection. Automated testing uses isolated browser contexts and mobile viewport emulation. A physical phone-and-computer test on different networks should be recorded separately rather than implied by browser emulation.
