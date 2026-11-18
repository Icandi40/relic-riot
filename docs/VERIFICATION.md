# Release verification

## Version 1.1 — November 18, 2026

TypeScript, production build, formatting, 27 deterministic simulation/career tests and the runtime dependency audit passed locally. `NODE_USE_SYSTEM_CA=1` was used for npm to use the system trust store; certificate verification was retained. The build retains the known Three.js chunk-size advisory.

Two local UI suites passed: desktop/mobile entry, instructions, real pointer joystick movement, pulse, leave, Mastery navigation, challenge claim, cosmetic purchases, persistence and all three 3D cosmetic render paths. Purchase tests use an explicitly isolated save fixture; these are not claimed as earned online progress. Fresh default career and wardrobe screenshots show empty progress and locked items.

The strengthened online run used two independent contexts, real internet signaling and WebRTC. It verified readiness reset after the Surge option changed, guest read-only settings, a named guest preset on the host, actual keyboard movement, pickup and delivery, and the same score on both clients. The real three-minute clock reached Surge and results; the actual sole winner earned 50 shards (20 completion + 5 delivery + 25 win), and career totals showed one match. Both players readied and began a rematch. The final disconnect assertion was invalidated by a test-trace file collision from a second test command sharing its output directory. Production verification uses a separate output directory and is recorded below after completion.

The stalled-frame input regression and immutable completed standings each have deterministic tests. The 3D renderer adapts sustained low frame rate by reducing render resolution and decorative effects. gstack inspection confirmed meaningful content, a clean application console and no horizontal overflow at 320px and 390px widths. Original concept, final home, Mastery, wardrobe, cosmetic render paths and results were opened with `view_image`.

The project still needs a separately recorded physical phone-and-computer check on different networks. Device-local progress can reset when browser data is cleared; no authenticated global ranking or cross-device career is claimed. No new paid infrastructure was provisioned.

### Version 1.1 public release

Deployment and final isolated public browser verification are pending at this checkpoint. The version 1.0 evidence below is retained as historical evidence, not substituted for the updated build.

## Version 1.0 — November 17, 2026

## Checks completed locally

| Check                                                      | Result                                      |
| ---------------------------------------------------------- | ------------------------------------------- |
| TypeScript and production Vite build                       | Passed                                      |
| Simulation tests                                           | 11 passed                                   |
| Browser regression suites                                  | 2 passed                                    |
| Desktop home, instructions and runner selection            | Passed at 1440 × 1024                       |
| Desktop practice, movement, pulse and leave flow           | Passed                                      |
| Mobile layout and touch-control visibility                 | Passed at 390 × 844; no horizontal overflow |
| Internet signaling and WebRTC between independent contexts | Passed; host SHEENA and guest RIVAL         |
| Room joining, readiness and shared countdown               | Passed                                      |
| Host movement visible on guest                             | Passed                                      |
| Guest pulse accepted and cooldown displayed                | Passed                                      |
| Actual match clock advanced to results                     | Passed                                      |
| Both participants ready and begin a rematch                | Passed                                      |
| Host disconnect recovery                                   | Passed                                      |
| Browser page errors                                        | None in tested flows                        |
| Runtime dependency audit                                   | Zero production vulnerabilities             |

The optional Browser plugin is absent from this session. Primary inspection used the required gstack browser, and automated multi-context regression tests used Playwright with the existing Chromium 1234 executable. No browser installation was required. Tests do not disable browser security.

## Visual fidelity review

The original full-screen concept and rendered screenshots were opened with `view_image`. Desktop, mobile home, mobile arena, online host/guest and results were inspected. Native concept size is 1536 × 1024; initial implementation review used 1440 × 1024 and the final release also captures the native dimensions.

| Comparison            | Implementation and decision                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Composition           | Left live entry form, right generated floating-temple artwork; same cinematic hierarchy                                   |
| Typography            | Ivory condensed italic title, geometric readable UI, locally bundled fonts; title expanded to better match concept weight |
| Palette               | Dark aubergine, amber primary actions, turquoise/orange/violet/lime runners retained                                      |
| Artwork               | Matching temple asset and custom runner atlas; compressed to WebP                                                         |
| Form anatomy          | Callsign, four runner choices, primary create action, divider, join code and practice link                                |
| Motion and feedback   | Selected runner, connection status, countdown, pulse charge, events, glow and rematches are interactive                   |
| Responsive adaptation | One-column phone entry, large touch targets, actual pointer-capture joystick and pulse button                             |
| Gameplay adaptation   | Intentional live 3D geometry and overview camera instead of a static concept screenshot; described in DESIGN.md           |

Above-the-fold copy was checked against DESIGN.md. Functional copy was extended for errors, accessibility and explicit practice-bot labeling. Runner names, optional helper copy, disabled join state and the title diamond are deliberate refinements rather than fake data.

## Boundaries

- Browser viewport emulation was tested; no physical phone on a different network has been independently tested in this session.
- Public signaling and library-default STUN/TURN endpoints are third-party dependencies; restrictive NAT/firewalls or unavailable relay services can require a different network. No private TURN relay is provisioned.
- Browser host must remain online and active. No host migration, ranked anti-cheat service or account system is claimed.
- npm audit reports a picomatch ReDoS advisory through build-only development dependencies. The published static application contains none of those build tools. No patched picomatch release was available in the inspected npm catalog; no forced downgrade or unreviewed dependency patch was applied.

## Public release

**Live URL:** https://icandi40.github.io/relic-riot/

**Source:** https://github.com/Icandi40/relic-riot

GitHub Actions built and deployed release `d8dd099` successfully: https://github.com/Icandi40/relic-riot/actions/runs/44155712254.

Both browser suites passed against the deployed site (40.5 seconds), including two independent browser contexts using actual internet signaling and WebRTC, match completion through advancing the real browser clock, and a successful rematch. A release query was used to bypass GitHub Pages' short HTML cache and verify the current deployed bundle. The normal public URL also loaded successfully. Native-size 1536 × 1024 capture, meaningful live content, no horizontal overflow, and a clean application console were verified with gstack. Actual renders were opened with view_image; the selected concept and final home capture were compared directly. No material unrecorded design mismatches remain; the intentional live-geometry and mobile-layout adaptations are described above and in DESIGN.md.

An initial CDN request for a JavaScript chunk returned a transient 503 during propagation; reload recovered. The final HTML includes a visible loading/reload fallback so a failed asset load does not leave an unexplained empty page. A pulse-input race found during browser testing was fixed by latching discrete actions until the simulation tick; its regression test is part of the 11 passing rule tests.

Public screenshots are in `docs/screenshots/`. Local and production verification artifacts used the same test flows; ephemeral browser traces are not committed.
