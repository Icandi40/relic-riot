# Panic Protocol review and RELIC RIOT enhancement priorities

Reviewed for Sheena Lindsey-Smith on November 17, 2026. The original comparison was read-only. Sheena subsequently authorized implementation of the recommendations; version 1.1 implements the four adaptations below with original code and artwork. See VERIFICATION.md for release evidence. No competitor code or assets were incorporated.

Source site: https://panic-protocol.victory-1001.chatgpt.site/

Shipped frontend inspected: https://panic-protocol.victory-1001.chatgpt.site/app.js

## Recommendation

Strengthen the reasons to replay RELIC RIOT while retaining its competitive 3D arena. Prioritize an informative match recap, device-local career objectives and cosmetic rewards, and lightweight preset messages. Consider one clearly announced arena event after those foundations. Defer global rankings, public matchmaking and uploaded avatar images until shared infrastructure and score integrity are deliberately designed.

## Findings and verification boundaries

| Feature                           | Evidence observed                                                                                                                                                                        | Boundary                                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cooperative asymmetric play       | The home screen explains that operators see different controls and must relay instructions. Frontend renderers support buttons, switches, numbered dials and incoming/outgoing commands. | A complete multiplayer mission was not played. This is a different genre from RELIC RIOT.                                                                               |
| Open-room discovery               | The directory rendered room cards with host names, occupancy and join actions.                                                                                                           | Cards are server-reported listings; independent player activity and joining were not tested. No existing participant room was joined.                                   |
| Multi-metric global rankings      | Opened the statistics panel; actual ranked rows loaded, with multiple metric tabs and career aggregates.                                                                                 | Score validation, ranking integrity and server-side storage implementation are unknown.                                                                                 |
| Progressive objectives            | Opened the goals panel; tiered objectives, counters and reward amounts rendered.                                                                                                         | Goal completion, reward redemption and progression to the next tier were not exercised.                                                                                 |
| Earned currency and cosmetic shop | Opened the profile panel; reward balance, owned/equipped states, priced avatar choices and a custom-image option rendered.                                                               | Purchases, image upload, moderation and cross-device persistence were not tested. Displayed credits are in-game reward units; no real-money purchase flow was observed. |
| Messaging                         | Shipped source includes room chat, short preset messages, mentions, emoticons, unread indicators and bounded message input.                                                              | Present in frontend code, not exercised in a live room.                                                                                                                 |
| Escalating rounds                 | Shipped source renders three successive round conditions, time-limited commands, stability, a combo display and success/failure states.                                                  | Backend difficulty tuning, command generation and actual gameplay balance were not inspected or playtested.                                                             |
| Reconnection and presence         | Frontend source includes request retries, presence updates, page visibility handling and session restoration paths.                                                                      | Presence cleanup, restored state and host recovery were not tested end to end.                                                                                          |
| Agent-facing integration          | Conditional frontend registration exposes room creation/join tools through model-context APIs.                                                                                           | Tool availability was not verified and none of the page-declared tools were invoked.                                                                                    |

The profile layout was also inspected at 390 × 844, with no horizontal page overflow in that view. This is viewport inspection rather than physical-phone testing.

## Prioritized adaptations

### 1. Rich match recap and useful statistics

Extend RELIC RIOT's existing results screen with deliveries, successful steals, pulses landed, pulse accuracy, time holding the relic and time to first delivery. Add descriptive round awards such as best thief or longest carry, based on recorded events rather than arbitrary labels. Keep deliveries as the match-winning rule.

This makes player decisions legible and shows simulation instrumentation, event modeling and interface design. Existing host events and state provide a starting point, but new counters must be recorded accurately; post-match statistics should not be invented from the final score.

### 2. Progressive objectives and cosmetic mastery

Add a compact profile with challenges such as making three deliveries, landing five steals, completing three matches and earning a first win. Completing an objective can unlock a harder tier and award virtual Relic Shards. Spend these only on cloak variants, trails, nameplates or victory effects. Cosmetic choices must not change movement speed, pulse range or scoring.

Start with local-device persistence and label it honestly. Clearing browser data resets that progress; it is not an authenticated cross-device account. This version needs no paid model API or additional shared service. Account-linked progress can be added later after verifying a suitable backend and its costs.

### 3. Preset communication

Add a small lobby and results message palette: Ready, One more round, Nice steal and GG. Show brief in-match emotes without covering the arena. Send bounded messages through the existing room connection with a rate limit. Free-form chat, microphones and user uploads are unnecessary for this first improvement.

### 4. One announced arena event

Adapt the escalation principle rather than the competitor's cooperative machine mechanic. A proposed Relic Surge could make the last 30 seconds worth double delivery points. Give every player the same advance warning and change the shrine's visual treatment. Clearly teach this rule before starting the round; make it an explicit room option until it is playtested. Retain the same event schedule on the authoritative host.

This is a new RELIC RIOT recommendation, not a feature observed in Panic Protocol. It adds a memorable ending while avoiding several simultaneous hazards or a new game genre.

## Later additions and their dependencies

| Addition                           | Why later                                                                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global leaderboards                | Need trusted score validation, persistent identity, abuse controls and a shared service. Browser-local or host-submitted totals alone are not a secure ranked system. |
| Public room directory              | Needs an opt-in registry, expiry/presence rules, appropriate visibility and connectivity handling. A PeerJS room code is not a global room database.                  |
| Uploaded avatars                   | Adds storage, file validation and moderation concerns while RELIC RIOT already has four original runners.                                                             |
| Additional abilities or co-op mode | Would expand gameplay balance and testing substantially. The strongest near-term opportunity is improving the current loop.                                           |
| Agent-controlled create/join tools | Could demonstrate integration work, but depend on browser/platform support and explicit user action boundaries. They do not replace the core player experience.       |

## Architecture lesson

The inspected frontend's room connection routine fetches state, then schedules another request after 800 ms. Its directory refreshes roughly every 2.5 seconds, and rankings refresh only while that panel is open. This is static source evidence of client behavior, not a complete backend architecture assessment.

RELIC RIOT currently publishes host snapshots around 20 times per second and interpolates the rendered scene independently. Keep that approach for fast movement. A shared backend could later serve profiles, discovery and ranked records without replacing the action transport with slow polling. No claim is made that the other project's backend is more secure, cheaper or more scalable; those details were not available.

## Evidence ledger

- Runtime navigation and visibility, statistics → goals → profile: `ev_71071f4a9352e0a47e00e8b3d1b74404b3269432b7358269dcc207ae3572aceb`. All declared steps completed. The owned Chromium process was terminated after capture.
- Initial controlled home observation: `ev_eaa9f44541654f2356b7826a7030705a0748f53b7ffd5dc9c61369891a236c31`.
- Shipped JavaScript parent analysis: `ev_549ef561768554b50c97873f241a1f9ed7d6c1ff64e8128538581b2584f8bcac`.
- Static summary view: `ev_2d518ac97fdff1d175ba6988f28856a20baba4ff034f4a275e7fea9ee0fe628f`.
- Artifact directory SHA-256: `ba518fd8d6b2a093106c6ebd2a7292184f542cd48c22a5639e6c04f140f9b03a`.
- Static scope: one public JavaScript file, 59,417 bytes, parsed successfully. Application graph coverage is partial, with unresolved semantic relationships. No backend source or server binary was inspected. Static handlers establish implementation candidates, not execution of purchases, missions or reconnection.
- Supporting gstack observations: live public directory, loaded ranking rows, rendered goals, rendered avatar shop, desktop and mobile screenshots. No other participant room was joined, and no purchase, upload or reward claim was submitted.

Comparison status: complete within these boundaries. The competitor's end-to-end mission behavior, reward mutations, backend security, physical-device performance and production costs remain unverified. RELIC RIOT's independent implementation and its tests are documented separately in VERIFICATION.md.
