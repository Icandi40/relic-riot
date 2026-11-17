# RELIC RIOT — locked visual and interaction direction

Created for Sheena Lindsey-Smith, November 17, 2026. Implement the selected Image Gen concept in `design/concept.png`.

## Reference lock

Primary: original generated full game-home concept, floating temple in violet clouds, ivory italic condensed display lettering and amber actions. Gameplay references reviewed: Poki's Smash Karts (short matches and immediate rematches), Obby Roads (readable stylized environments), and Vortelli's Pizza (friendly joining). Refero live styles were unavailable without a paid subscription; used its bundled typography, motion and anti-slop craft references. No paid upgrade.

## Tokens

- Ink/background #12101e, elevated surface #21192f, border #665077.
- Ivory text #fff3dd; muted lavender #b9aac8; action/relic #ffc449.
- Runner accents turquoise #44ded1, orange #ff9454, violet #b88bff, lime #b8e365.
- Display: Barlow Condensed 900 italic; UI: Rajdhani 500/600/700.
- Broad cinematic canvas, compact useful controls, chamfered outlines, restrained 12px radii. No generic marketing sections or metric cards.

## Copy and surfaces

Header: RELIC RIOT; HOW TO PLAY; sound control. Home: RELIC / RIOT; Grab the relic. Steal the spotlight.; A fast, fiercely friendly arena heist. Outrun your rivals. Deliver the relic. Own the round.; 2–4 players; 3-minute rounds; Play anywhere; YOUR CALLSIGN; CHOOSE YOUR RUNNER; CREATE ROOM; OR JOIN YOUR CREW; ENTER ROOM CODE; JOIN; PRACTICE RUN; THE SKY TEMPLE; Created by Sheena Lindsey-Smith; GRAB THE RELIC; DODGE THE PULSE; DELIVER TO SCORE.

Lobby: room code and invite link, 2–4 runner slots, ready buttons, host start, leave, connectivity status. Game: scores, clock, objective, ability cooldown, touch joystick, pulse, sound, help, leave. Results: winner or draw, individual scores, rematch, leave. Instructions: three rules, keyboard/touch controls, host presence requirement. Friendly actionable errors for inaccessible rooms, full/in-progress rooms, WebGL issues and blocked networks.

## Assets and intentional implementation choices

Generated concept, standalone temple backdrop and runner portrait atlas; copied to this project. HUD, typography and controls stay live HTML. Portraits are decorative; color labels and accessible names carry meaning.

Intentional 3D adaptation: the playable temple and moving runners are original procedural Three.js geometry, not raster sprites. This is required for live three-dimensional lighting, collision and directional animation; it is finished geometric art, not a replacement screenshot or temporary game placeholder. Generated art establishes the coherent design and supplies home and portrait artwork. Game camera favors visibility of the arena over the concept's close cinematic home perspective. Mobile reorganizes the same hierarchy rather than shrinking text.

## Multiplayer and delivery

Browser-hosted authoritative simulation; guests send input only. PeerJS handles signaling and WebRTC data connections. A room host remains online; host departure ends the session. No paid model API or database. This is casual invite-only multiplayer, not a hardened competitive anti-cheat service. Connection errors explain restrictive network limitations. Practice is explicitly labeled and never used to fake a remote player. Deploy a static build to GitHub Pages; retain all source and verification evidence.

## Verification contract

Real input and score simulation tests; two independent browser contexts use internet signaling and exchange actual WebRTC packets. Exercise lobby, readiness, countdown, movement, pickup, pulse, scoring, end, rematch and disconnect. Capture desktop and mobile screenshots, inspect concept/render, check no horizontal overflow or console errors. Physical phone/different-network testing remains separately identified if no physical second device is available.
