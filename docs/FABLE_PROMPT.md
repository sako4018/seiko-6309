# SEIKO 6309-8060 — THE WATCHMAKER'S LAB
## Fable 5.2 | Interactive 3D Digital Twin

## Project objective
Create a premium, interactive browser-based 3D digital twin of my personal vintage Seiko 5 6309-8060.

IMPORTANT: Use TWO SEPARATE reference sources:
1. EXTERIOR: My uploaded photographs of the exact Seiko 6309-8060. Reproduce this watch's exterior faithfully.
2. INTERIOR: An authentic Seiko 6309 / 6309A movement, using uploaded movement photographs, parts diagrams and service documentation. The internal movement does not need to come from the exact 6309-8060 watch.

The exterior must match my watch. The interior must represent a genuine Seiko 6309-family movement.

## 1. Exact exterior reconstruction
Treat my personal watch photographs as the highest-priority exterior reference.

Reconstruct:
- Original rounded stainless-steel case and proportions.
- Warm ivory / champagne-white dial. It is NOT pure white and NOT dark silver.
- Original dark rectangular hour markers with metallic detailing.
- Original slim metallic hands.
- Seiko 5 dial branding.
- Day/date window at 3 o'clock.
- Original crown and position.
- Original multi-row stainless-steel bracelet and individual links.
- Circular stainless-steel caseback and visible engravings.
- Crystal with realistic reflections.

Do not substitute another Seiko 6309 dial or use a generic Seiko 5 design. Do not modernize, redesign or invent exterior details. If a detail cannot be verified, keep it conservative rather than fabricating it.

## 2. Interior — authentic Seiko Caliber 6309 / 6309A
Use uploaded Seiko 6309A movement photographs and technical documentation.

Model individual 3D components where supported by the references:
- Main plate and bridges.
- Automatic rotor and winding mechanism.
- Mainspring barrel.
- Center, third and fourth wheels.
- Escape wheel.
- Pallet fork.
- Balance wheel and hairspring.
- Screws and jewels.
- Day/date calendar components.

Follow authentic 6309-family architecture. Do not substitute a generic modern automatic movement or mix components from unrelated calibers. Use the parts catalog and service manual to verify names, positions and relationships. If a detail is not established by the references, do not present it as confirmed.

## 3. Mechanical simulation
Create a simplified but mechanically coherent simulation.

Show the energy path:
AUTOMATIC ROTOR → WINDING MECHANISM → MAINSPRING → GEAR TRAIN → ESCAPEMENT → BALANCE WHEEL

Animate:
- Rotor rotation.
- Winding mechanism movement.
- Gear train rotation with consistent directional relationships.
- Escape wheel impulses.
- Pallet fork movement.
- Balance wheel oscillation.
- Hairspring movement.
- Seconds, minute and hour hands.

The 6309 movement operates at 21,600 vibrations per hour. Represent this correctly in the simulation's timing where practical.

Do not animate all parts as unrelated spinning objects. Their motion should communicate how the mechanism works. A simplified visual model is acceptable where a physically exact simulation exceeds the scope. Distinguish simulated behavior from mechanically verified behavior.

## 4. Power reserve
Add an educational power-reserve visualization:
- Simulated winding interaction.
- Power reserve indicator.
- Start, pause and reset.
- Reserve decreasing while running.
- Reserve increasing when wound.

Do not claim physically exact torque or spring behavior unless actually modeled.

## 5. Interactive modes
Create six modes:

WATCH
- Complete watch, 360-degree inspection, zoom and camera reset.

CASE
- Inspect case, crystal, dial, hands, crown, bracelet and caseback.
- Allow the caseback to open or hide to reveal the movement.

MOVEMENT
- Display the complete movement.
- Rotate and zoom.
- Select components.
- Hide or reveal bridges where useful.

EXPLODED VIEW
- Separate components into logical layers.
- Preserve orientation and spatial relationships.
- Provide a 0–100% exploded-view slider.
- Use smooth transitions.

ASSEMBLY
- Reconstruct the movement step by step.
- Return components to correct positions.
- Explain each component's purpose.

SIMULATION
- Start, pause and reset.
- Slow motion and speed control.
- Rotor interaction.
- Power-reserve display.

## 6. Component inspection
Make major components selectable. On selection:
- Highlight the component.
- Display its correct name and function.
- Explain which components it interacts with.
- Show its place in the energy path.

Use accurate terminology from the technical references.

## 7. Day/date
Reproduce the day/date display. Allow the user to advance the displayed day and date and observe the calendar display change. A simplified calendar interaction is acceptable. Do not claim a physically exact calendar mechanism unless its parts and operation have been modeled accurately.

## 8. Visual design
Create a restrained, premium vintage watchmaking laboratory:
- Deep black / graphite background.
- Stainless-steel and metallic surfaces.
- Subtle gold accents.
- Minimal technical labels.
- Professional typography.
- Cinematic but realistic studio lighting.
- PBR materials for brushed steel, polished steel and glass.

The watch itself must remain the visual centerpiece. Avoid excessive futuristic effects.

## 9. Camera and controls
Implement mouse orbit / rotation, scroll zoom, camera reset, smooth camera transitions, front/side/rear presets and close-up component inspection.

All visible controls must work. Do not create placeholder buttons.

## 10. Technical implementation
Use Three.js and WebGL. Use TypeScript if appropriate. Keep geometry, components, animation and UI organized in maintainable modules. Use actual 3D geometry for major mechanical parts; do not use flat images as substitutes for interactive 3D components. Optimize for smooth desktop-browser performance.

## 11. Development order — 48 hours
DAY 1:
1. Analyze every uploaded reference.
2. Reconstruct the exterior watch accurately.
3. Build the principal movement geometry.
4. Implement core mechanical animation.

DAY 2:
5. Implement exploded view.
6. Implement assembly mode.
7. Implement component inspection.
8. Complete interface and lighting.
9. Test interactions and optimize performance.

Prioritize a faithful exterior and a working core movement over modeling every tiny component.

## 12. Reference analysis before modeling
Before development, inspect all uploaded images and documents. Identify:
- Which files are exterior references for my exact watch.
- Which files are interior movement references.
- Which components and positions are verified by the service documentation.
- Which details remain uncertain.

Do not confuse exterior and movement references. Do not begin detailed modeling until the reference analysis is complete.

## 13. Final quality check
Verify that:
- The exterior resembles my uploaded Seiko 6309-8060 photographs.
- The dial retains its warm ivory / champagne-white appearance.
- The original dial layout, hands, markers and day/date position are preserved.
- The bracelet and caseback resemble the references.
- The internal movement is based on authentic Seiko 6309 / 6309A references.
- Core motion is synchronized and mechanically coherent.
- Exploded view and assembly work.
- Component selection and explanations work.
- The application runs smoothly in a browser.

FINAL OBJECTIVE:
Create a premium interactive digital twin of my personal Seiko 6309-8060: exact exterior based on my photographs, combined with an authentic Seiko 6309-family movement inside.
