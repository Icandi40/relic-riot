# Engineering decisions

## Why Three.js

The project needs real 3D lighting, animation, camera projection and effects in a browser. Three.js supplies rendering rather than gameplay rules. Rendering, simulation and transport are independent modules so a dedicated game server can later reuse the simulation without the renderer or React.

## Authority and timing

`Simulation` owns all mutable match state. It clamps displacement steps to 50 milliseconds, normalizes diagonal inputs, keeps runners inside the arena and outside solid pillars, and ignores movement input older than 350 milliseconds. Clock time remains wall time even when rendering stalls. Pulse range, cooldown, stun and brief protection are enforced on the host. Pickup and delivery decisions are made in the same simulation tick. Snapshots are detached copies, with bounded recent event history for visual effects.

The host publishes snapshots about 20 times per second. The 3D renderer interpolates positions and rotations independently, using requestAnimationFrame. Guests send a limited input stream and action flags. Peer connection identity is bound to the admitted runner; guests cannot select an arbitrary runner ID. Inputs and callsigns are sanitized. A packet budget bounds messages from each guest. Rooms cap at four runners and reject late joiners during a match.

## Why browser-hosted sessions

The user's constraints prioritize finishing a polished playable game without paid upgrades. A browser host plus public signaling avoids provisioning a paid long-running server. It provides real remote multiplayer, with an explicit host-presence requirement. It does not provide global anti-cheat guarantees, host migration or universal NAT traversal. Those would require a managed relay and/or dedicated server, and are not disguised as completed features.

## Rendering decisions

The 3D scene is the game, not a raster imitation. Original geometric cloaks, masks, limbs, temple slabs, arches, crystals and inlaid rings create a coherent low-poly world. Instancing keeps floor stones and foliage inexpensive. Generated artwork supplies the home backdrop, cloudscape and runner portraits. Shader-based bloom gives the relic and torches luminous emphasis. Locally bundled fonts and compressed artwork reduce runtime network dependencies.

## Reliability and accessibility

Connection and handshake timeouts, rejection reasons, departed guest handling, stale input expiration and a host watchdog keep failures visible. Lobby start requires at least two ready runners. Sound defaults off. Controls are live HTML with focus styles; instructions use a focus-managed dialog. Names, numbers, icons and text supplement player colors. Touch controls use pointer capture. Reduced-motion preferences limit decorative animation. Optional fullscreen and browser storage failures do not block playing.

## Scope deliberately kept small

One arena, one relic, four shrine positions, one pulse ability, three-minute rounds, 2–4 runners and an explicit practice bot. No accounts, public chat, matchmaking, payment flow, season pass or leaderboard service.
