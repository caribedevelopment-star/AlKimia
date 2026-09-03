# CODEX HANDOFF — Al.Kim.ia

## What this project is

Al.Kim.ia is an intimate interactive web experience for Kim. It should feel like a short cinematic poem you can walk through, not a conventional game. Target experience length for the birthday build: roughly 5–8 minutes.

The canonical emotional arc is longer and must not be shortened:
1. **Concert / The Encounter** — among thousands, Ale finds Kim and the surrounding noise falls away.
2. **The Room / The Door** — an intimate interior space; opening the portal represents opening himself to feeling.
3. **The Journey / The Growing World** — they cross a landscape that transforms from dry earth to winter, green life and finally lavender as they remain together.
4. **The Meadow / Ascension** — the relationship reaches its luminous height; flowers, matter and both entes lose gravity and rise through the clouds.
5. **The Fracture / The Fall** — the shared form breaks because Ale hurts Kim. Kim remains above while Ale falls into a psychological hell.
6. **The Storm / Her Return** — broken architecture, dead lavender and distorted fragments of earlier memories embody regret. Ale cannot create his own exit. Kim returns through the storm, touches him and makes an exit possible without erasing what happened.
7. **The Reunion** — in a quiet, rainy mirror-water landscape they approach again. Their scars remain visible; the new union is deeper, not a reset to innocence.
8. **Genesis / Big Bang** — suspended rain and fragments of every memory orbit them; both dissolve into one sphere, silence, then an expansion that creates stars and a new universe. End in darkness without a conventional “THE END”.

This is a single-player experience controlling Ale. Kim is an authored narrative companion, not a second networked player. Progress should come from movement, proximity, remaining together and touch—not chapter menus or permanent “next” buttons.

The user explicitly wants the birthday build finished for **12 September 2026**.

## User workflow preference

The user designs/composes in SketchUp and expects Codex to take over most technical web work: Three.js scene integration, materials, environment, crowd systems, cameras, interaction, optimization, transitions, deployment and iteration.

For this deadline, do **not** migrate the experience to Unreal. A future Unreal version is possible, but the birthday build must remain direct-to-web.

## Existing project / deployment

GitHub repository:
`caribedevelopment-star/AlKimia`

Vercel project is the EXISTING Al.Kim.ia project under the user's current Vercel account/team. Do not create a new Vercel project.

Known canonical alias used during the recent work:
`https://al-kim-ia-caribedevelopment-1895s-projects.vercel.app`

There are older immutable deployment URLs such as the historical `...v5-n1y39jnzv...` URL. Do not treat those as the canonical production link because they do not update after new deploys.

## Current Scene 1 problem

The user supplied two 3D files in ChatGPT:
- `ESCENA 1.glb`
- `PERSONAJE.glb`

The request was: Scene 1 concert should use the new concert geometry, be packed with people, and use the uploaded characters.

Several attempts went wrong:

### Failed attempt A
A new concert renderer was mounted above/replacing the original experience. It used reconstructed/simplified geometry and generic materials.

User feedback:
- stadium lost the aesthetic of the original concert;
- character looked wrong;
- it did not feel like the intended replacement of Scene 1.

### Failed attempt B
The character was converted into a custom packed geometry format and used as a simplified mesh. This was technically light but visually unfaithful. The user explicitly rejected the character appearance.

### Partial recovery
Production was reverted toward the original concert baseline. A file `scene1-preserve.js` was created to augment the original renderer rather than replacing it. It adds crowd/hero meshes while preserving the original stadium. This is directionally better but still uses simplified packed geometry and is therefore NOT final.

## Exact design requirement for Scene 1

Do this instead:

1. Recover/inspect the original concert implementation from the clean baseline and current app runtime.
2. Use `ESCENA 1.glb` as the intended Scene 1 geometry, but art-direct it so it preserves/improves the visual identity of the original concert.
3. Use the real `PERSONAJE.glb` through GLTFLoader, preserving its correct proportions/transforms. Do not reconstruct it into a crude custom mesh for hero use.
4. Put two hero entes in a readable emotional focal area so the encounter is obvious.
5. Fill the venue with a dense crowd:
   - nearby crowd: faithful entity mesh / clones / instancing if geometry permits;
   - middle/far crowd: LOD/simplified silhouettes for mobile performance;
   - varied scale, rotation, timing and subtle vertical/side motion;
   - never leave the venue feeling empty.
6. Keep concert lighting cinematic: haze, beams/spotlights, particles, deep blue/violet/silver atmosphere with selective warm highlights.
7. Preserve the feeling of the original stadium instead of applying one flat generic material across the imported model.
8. Make mobile a first-class target.

## Scene 1 art direction

Keywords:
- poetic
- cinematic
- monumental
- surreal
- melancholic but beautiful
- sculptural
- premium 3D
- atmospheric depth
- crowd density
- strong low/immersive camera perspectives

Avoid:
- generic nightclub
- primitive low-poly stadium look
- obvious procedural demo aesthetic
- cartoon crowd motion
- glowing neon everywhere
- standard humanoid NPC look

The entes should feel abstract, soft, chunky/rounded, matte/sculptural and non-human.

## Current priority order across the full project

The user established this order and wants it respected:
1. entes
2. meadow / flowers / sky / climate
3. cinematic portal
4. cameras
5. ascension
6. concert polish

Scene 1 is being handled now because the user supplied new source assets, but once its integration is correct, return to the overall priority list and deadline.

## Birthday production strategy

Do not turn this into an endless open-world build. The birthday version should be a short, controlled interactive cinematic.

Recommended production scope:
- 5–8 minutes total
- scene-based progression
- player interaction when it matters
- camera takeover for cinematic transitions
- feature freeze before final QA
- last day(s): mobile, loading, bugs, sound, transitions, deploy—not new features

## Technical expectations for web visuals

Use Three.js/WebGL in a disciplined way:
- GLB/glTF as main authored geometry.
- Proper PBR materials rather than raw SketchUp/basic materials where possible.
- Environment lighting/HDR or equivalent lighting setup.
- Fog/height-fog approximations.
- Instanced vegetation and crowds.
- Shader wind for flowers/grass later.
- GPU-friendly particles.
- Adaptive DPR and quality settings on mobile.
- LODs / impostors where needed.
- Minimize draw calls and overdraw.
- Post-processing should be subtle and profiled.

The target is not physically accurate offline path tracing. The goal is a high-end stylized realtime web scene with the same artistic identity on desktop and reduced-but-coherent quality on mobile.

## Meadow / later scenes

Once Scene 1 is fixed, the meadow should receive the largest visual investment:
- large procedural flower field / lavender
- thousands of instances, not hand-modelled flowers
- strong wind response
- massive sky
- fog/haze
- changing time/weather states
- particles/petals
- low cinematic cameras
- responsive entity interaction

Possible environmental state progression:
blue → gold → pink → storm → black/stars → white/ascension.

## Portal

Portal is not just a door. It should feel like a cinematic event separating memories. Camera can take over, input can lock temporarily, environment can collapse/change, then control returns seamlessly.

## Ascension

Ascension can be more abstract and technically lighter than the meadow:
- entities rising
- flowers/petals rising
- clouds/fog layers
- particles
- depth/light changes
- changing gravity feeling
- cinematic camera movement

## Important repository history

Clean baseline before recent Scene 1 experiments:
`f40dcd224c39ae81079bad16764bf30a2ca5fea7`

Recent experimental commits exist after that baseline. Inspect history rather than assuming all current Scene 1 files are correct.

Notable experimental artifacts:
- `scene1.js`
- `scene1-hotfix.js` (may exist in history)
- `scene1-preserve.js`
- `assets/scene1/*.b64`

These were created to work around connector limitations. They should not dictate the final asset pipeline.

## What Codex should do first

1. Open repo and read `AGENTS.md` + this file.
2. Inspect `app.js`, original runtime chunks, scene transitions, current `index.html`, service worker and recent git history.
3. Obtain the exact source binaries `ESCENA 1.glb` and `PERSONAJE.glb` in the Codex workspace if they are not already present.
4. Build Scene 1 on a working branch without altering production until verified.
5. Make an in-browser desktop preview first.
6. Validate scale/orientation/materials of both GLBs before adding crowd.
7. Match the original concert's lighting/art direction.
8. Add dense crowd with LOD strategy.
9. Test mobile/Safari and reduce quality adaptively.
10. Only after visual verification: push/merge and deploy to the EXISTING Vercel project.

## User feedback style / iteration

The user will judge visually and quickly. Prioritize screenshots/preview and visible improvement over architecture discussions. When something looks wrong, fix the visual result rather than defending the implementation.

Do not stop at 'it loads'. The standard is: **it looks beautiful and emotionally intentional**.

## Absolute don'ts

- Do not create another Vercel project.
- Do not create a separate unrelated repo.
- Do not replace the existing project with a generic demo.
- Do not use a simplified hero character when the real GLB exists.
- Do not erase the original concert art direction.
- Do not add huge new systems before fixing the core visual experience.
- Do not spend the remaining deadline budget on Unreal migration.
