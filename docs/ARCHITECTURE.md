# Engineering decisions

## Why Three.js

The project needs real 3D lighting, animation, camera projection and effects in a browser. Three.js supplies rendering rather than gameplay rules. Rendering, simulation and transport are independent modules so a dedicated game server can later reuse the simulation without the renderer or React.

## Authority and timing

`Simulation` owns all mutable match state. It clamps displacement steps to 50 milliseconds, normalizes diagonal inputs, keeps runners inside the arena and outside solid pillars, and ignores movement input older than 350 milliseconds. Clock time remains wall time even when rendering stalls. Pulse range, cooldown, stun and brief protection are enforced on the host. Pickup and delivery decisions are made in the same simulation tick. Snapshots are detached copies, with bounded recent event history for visual effects.

The host publishes snapshots about 20 times per second. The 3D renderer interpolates positions and rotations independently, using requestAnimationFrame. Guests send a limited input stream and action flags. Peer connection identity is bound to the admitted runner; guests cannot select an arbitrary runner ID. Inputs and callsigns are sanitized. A packet budget bounds messages from each guest. Rooms cap at four runners and reject late joiners during a match.

## Why browser-hosted sessions

The user's constraints prioritize finishing a polished playable game without paid upgrades. A browser host plus public signaling avoids provisioning a paid long-running server. It provides real remote multiplayer, with an explicit host-presence requirement. PeerJS's library-default STUN/TURN configuration is preserved, rather than reducing connectivity to STUN-only. It does not provide global anti-cheat guarantees, host migration or universal NAT traversal. Stronger guarantees require an application-controlled relay and/or dedicated server, and are not disguised as completed features.

## Rendering decisions

The 3D scene is the game, not a raster imitation. Original geometric cloaks, masks, limbs, temple slabs, arches, crystals and inlaid rings create a coherent low-poly world. Instancing keeps floor stones and foliage inexpensive. Generated artwork supplies the home backdrop, cloudscape and runner portraits. Shader-based bloom gives the relic and torches luminous emphasis. Sustained low frame rate activates a performance mode with lower render resolution, no shadow maps and no bloom; the arena, gameplay indicators and HTML controls remain. A long suspended-tab gap alone does not trigger this mode. Locally bundled fonts and compressed artwork reduce runtime network dependencies.

## Reliability and accessibility

Connection and handshake timeouts, rejection reasons, departed guest handling, stale input expiration and a host watchdog keep failures visible. Lobby start requires at least two ready runners. Sound defaults off. Controls are live HTML with focus styles; instructions use a focus-managed dialog. Names, numbers, icons and text supplement player colors. Touch controls use pointer capture. Reduced-motion preferences limit decorative animation. Optional fullscreen and browser storage failures do not block playing.

## Replay systems in version 1.1

Each authoritative round gets a unique match ID. The simulation records deliveries separately from points, so Surge cannot inflate delivery statistics or shard rewards. Successful pulse accuracy counts a pulse once even if it hits several runners. Carry time is tracked while a player holds the relic; longest carry resets after a steal or delivery. First delivery is measured in seconds of active match time. Awards require positive statistics and a unique leader.

Completed standings are detached from the active room roster, preserving results and rewards when someone leaves after the finish. Rematch readiness still uses the connected roster and requires two participants. Input expiry uses host receipt timestamps from a monotonic clock. A packet received since the previous tick can be integrated once with at most 50ms displacement, even if rendering blocked before simulation ran. Previously consumed input expires after 350ms without refresh. Unit tests inject a clock; browser integration tests exercise real time and actual movement rather than trusting animation changes.

`career.ts` owns pure reward, challenge and cosmetic transactions. A bounded receipt ledger prevents repeated snapshots and reloads from paying the same match twice. Completed online rounds earn 20 shards, +5 per delivery, +25 for a sole win. Practice, unfinished rounds and unknown players earn none. New arrivals after a completed match return the room to a fresh lobby, preventing rewards for a round they never played. Challenges use cumulative thresholds with increasing tiers. Purchases check ownership and balance; equipment must be owned. Versioned, validated localStorage persists the career; storage failure leaves a playable session with an explicit warning. Progress is local and editable, not a trusted global ranking. There is no real-money currency or new backend.

Cosmetic IDs travel in the room handshake. Gilded changes cloak and mask materials; Starlight adds a bounded nine-point 3D trail; Royal adds crown geometry and a gold nameplate. All share identical simulation mechanics. Cosmetic ownership is local and not server-verified, which is appropriate for a casual visual reward rather than an economy with cash value.

Preset messages use the existing WebRTC channel. The host binds the sender to the admitted connection, accepts only five known keys, enforces a two-second cooldown and retains at most eight messages. The UI shows the two most recent messages briefly. No arbitrary HTML, free-form chat, uploads or microphones are accepted.

Relic Surge is off by default. Only the host can change it in a waiting room; changes clear readiness. It is locked for the active match. The same authoritative remaining clock selects double delivery points at 30 seconds or less. The HUD warns in advance, then marks double points and the active shrine warms to coral. Protocol version 2 uses a separate room prefix so old clients cannot join a new-state room.

## Scope deliberately kept small

One arena, one relic, four shrine positions, one pulse ability, three-minute rounds, 2–4 runners and an explicit practice bot. Local mastery and cosmetic rewards, preset messages and one optional announced event extend that loop. No accounts, free-form public chat, matchmaking, payment flow, season pass or leaderboard service.
