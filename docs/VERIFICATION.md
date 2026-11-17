# Release verification — November 17, 2026

## Checks completed locally

| Check | Result |
|---|---|
| TypeScript and production Vite build | Passed |
| Simulation tests | 10 passed |
| Browser regression suites | 2 passed |
| Desktop home, instructions and runner selection | Passed at 1440 × 1024 |
| Desktop practice, movement, pulse and leave flow | Passed |
| Mobile layout and touch-control visibility | Passed at 390 × 844; no horizontal overflow |
| Internet signaling and WebRTC between independent contexts | Passed; host SHEENA and guest RIVAL |
| Room joining, readiness and shared countdown | Passed |
| Host movement visible on guest | Passed |
| Guest pulse accepted and cooldown displayed | Passed |
| Actual match clock advanced to results | Passed |
| Both participants ready and begin a rematch | Passed |
| Host disconnect recovery | Passed |
| Browser page errors | None in tested flows |
| Runtime dependency audit | Zero production vulnerabilities |

The optional Browser plugin is absent from this session. Primary inspection used the required gstack browser, and automated multi-context regression tests used Playwright with the existing Chromium 1234 executable. No browser installation was required. Tests do not disable browser security.

## Visual fidelity review

The original full-screen concept and rendered screenshots were opened with `view_image`. Desktop, mobile home, mobile arena, online host/guest and results were inspected. Native concept size is 1536 × 1024; initial implementation review used 1440 × 1024 and the final release also captures the native dimensions.

| Comparison | Implementation and decision |
|---|---|
| Composition | Left live entry form, right generated floating-temple artwork; same cinematic hierarchy |
| Typography | Ivory condensed italic title, geometric readable UI, locally bundled fonts; title expanded to better match concept weight |
| Palette | Dark aubergine, amber primary actions, turquoise/orange/violet/lime runners retained |
| Artwork | Matching temple asset and custom runner atlas; compressed to WebP |
| Form anatomy | Callsign, four runner choices, primary create action, divider, join code and practice link |
| Motion and feedback | Selected runner, connection status, countdown, pulse charge, events, glow and rematches are interactive |
| Responsive adaptation | One-column phone entry, large touch targets, actual pointer-capture joystick and pulse button |
| Gameplay adaptation | Intentional live 3D geometry and overview camera instead of a static concept screenshot; described in DESIGN.md |

Above-the-fold copy was checked against DESIGN.md. Functional copy was extended for errors, accessibility and explicit practice-bot labeling. Runner names, optional helper copy, disabled join state and the title diamond are deliberate refinements rather than fake data.

## Boundaries

- Browser viewport emulation was tested; no physical phone on a different network has been independently tested in this session.
- Public signaling and STUN are third-party dependencies; restrictive NAT/firewalls can require a different network. No TURN relay is provisioned.
- Browser host must remain online and active. No host migration, ranked anti-cheat service or account system is claimed.
- npm audit reports a picomatch ReDoS advisory through build-only development dependencies. The published static application contains none of those build tools. No patched picomatch release was available in the inspected npm catalog; no forced downgrade or unreviewed dependency patch was applied.

## Public release

Deployment URL and production verification are appended after GitHub Pages completes. Source and screenshots remain reproducible from the repository and test commands.
