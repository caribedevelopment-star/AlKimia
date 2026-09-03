# Al.Kim.ia — Codex Instructions

This repository is an active, deadline-driven interactive web experience. Read this file before changing anything.

## Non-negotiable project rules

1. Work ONLY in the existing repository `caribedevelopment-star/AlKimia`.
2. Work ONLY with the existing Vercel project `al.kim.ia` / its existing production alias. DO NOT create another Vercel project.
3. Preserve the project's original cinematic art direction. Do not replace scenes with generic Three.js demos, primitive stadiums, flat materials, or placeholder environments.
4. Do not simplify/decimate the hero characters in a way that changes their silhouette. The uploaded character GLB must remain visually faithful.
5. Do not flatten the stadium/scene into a single generic material. Preserve material separation, lighting language, spatial composition, and the existing concert atmosphere.
6. Mobile matters. Target iPhone/Safari as a first-class runtime, using instancing, LODs, adaptive DPR, reduced far-crowd geometry, and careful post effects.
7. Prefer a beautiful coherent result over adding more features. Do not stop at the first technically functional solution.
8. Before production push: test the scene in-browser, verify assets load, verify ENTER works, verify no console-breaking errors, and verify mobile fallback/performance.
9. Keep the same production URL/project. Never tell the user to use an old immutable deployment URL as the canonical link.

## Deadline

Birthday delivery target: **12 September 2026**. The project must be emotionally complete and stable before then. Feature freeze should happen before final QA.

## Artistic priority order

1. Entes / characters
2. Meadow / flowers / sky / climate
3. Cinematic portal
4. Cameras
5. Ascension
6. Concert polish

For the current task, Scene 1 / concert is the immediate priority.

## Scene 1 intent

The concert is **the encounter**: among a huge crowd, the two main abstract entities find each other. It should feel dense, alive, emotional, monumental and cinematic—not like an empty WebGL test.

The desired visual language is premium, poetic, surreal, melancholic/cinematic, with atmospheric haze, depth, stage light, particles, motion and strong composition. Characters are abstract sculptural 'entes': rounded/chunky/soft, non-human, matte/sculptural rather than conventional humanoids.

## Critical lesson from failed iterations

A previous attempt rebuilt the concert in a separate renderer and simplified the character geometry. The user rejected it because:
- the stadium no longer had the aesthetic of the original concert;
- the character looked wrong/deformed;
- the new code behaved like an overlay/replacement rather than a faithful evolution of the existing scene.

DO NOT repeat that approach.

Correct approach:
- Treat the original concert runtime/art direction as the visual baseline.
- Replace/integrate the intended scene geometry carefully rather than discarding the original visual language.
- Load the actual source character GLB faithfully with GLTFLoader; retain node transforms/materials where useful.
- Add a dense crowd through instancing/cloning/LOD, but keep two hero characters clearly readable.
- Preserve the original camera, stadium feeling, stage lighting and atmosphere unless there is a deliberate visual improvement.

## Technical direction

Runtime is browser-based Three.js/WebGL. The user wants a direct web experience deployed on Vercel, not Unreal for this deadline.

Use:
- `GLTFLoader` for real GLB assets.
- `InstancedMesh` or low-cost LOD silhouettes for crowd scale.
- PBR materials / environment lighting where possible.
- atmospheric fog/haze, particles, subtle bloom/post only where performance allows.
- adaptive quality between desktop and mobile.
- semantic object naming and scene helpers if adding new asset pipelines.

Do not model thousands of people individually. Near crowd may use the real entity mesh; far crowd should use cheaper LOD geometry while preserving the same visual identity.

## Current repository state

The repository contains the original app runtime plus experimental Scene 1 files from prior attempts. `scene1-preserve.js` was created as an augmentation layer to preserve the original concert, but it still relies on packed/simplified geometry and should NOT be treated as the final architecture.

Important: inspect commit history before deleting anything. The last known clean baseline before Scene 1 experiments is commit:
`f40dcd224c39ae81079bad16764bf30a2ca5fea7` (`chore: add production service worker`).

Use git history selectively to recover the original concert implementation and compare against experimental branches/files.

## Source assets

The two authoritative uploaded source files are:
- `ESCENA 1.glb` — new Scene 1 concert/stadium geometry supplied by the user.
- `PERSONAJE.glb` — authoritative character/entity model supplied by the user.

If these binaries are not present in the repo when you start, ask for/upload those exact two files into the Codex workspace before rebuilding Scene 1. Do not substitute the packed `p.*.b64` approximation as the hero source.

## Definition of done for Scene 1

Scene 1 is done when:
- it uses the user's intended concert geometry and faithful character model;
- the stadium still feels like the strong original AlKimia concert aesthetic;
- the venue is densely populated;
- two hero entes are clearly readable and emotionally connected;
- crowd movement feels alive but not comedic;
- lighting/haze/particles/camera feel cinematic;
- no obvious GLB scale/orientation/material errors;
- it runs acceptably on iPhone/Safari;
- the transition to the next memory still works;
- production is pushed to the existing Vercel project only.
