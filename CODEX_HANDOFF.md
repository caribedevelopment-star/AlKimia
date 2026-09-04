# CODEX HANDOFF — Al.Kim.ia

## Misión

Al.Kim.ia es una experiencia interactiva cinematográfica y continua para navegador. No es una colección de demos WebGL ni un juego convencional: recorre el encuentro, el amor, el miedo, el daño, la caída, la responsabilidad, la aceptación y la transformación.

La fecha objetivo del regalo es el **12 de septiembre de 2026**. El libro físico *El alquimista* es la última escena fuera de la pantalla; la web no debe representar su entrega.

## Repositorio y producción

- Repositorio único: `caribedevelopment-star/AlKimia`.
- Rama de producción: `main`.
- Proyecto Vercel existente: `al.kim.ia`.
- URL canónica: <https://al-kim-ia-v5.vercel.app>.
- No crear otro repositorio ni otro proyecto de Vercel.
- No presentar como canónica una URL inmutable de un deployment anterior.

## Arco definitivo implementado

La experiencia tiene 16 escenas internas, pero el usuario nunca ve títulos ni números de escena:

1. **Concierto / despertar** — Ale y Kim se reconocen entre miles; el ruido exterior se atenúa.
2. **Habitación / intimidad** — aparece el mundo compartido y la cercanía cotidiana.
3. **Portal / sombras** — la inseguridad de Ale deforma la habitación y abre el portal.
4. **Desierto / miedo** — primer reconocimiento explícito del daño, sin romantizarlo.
5. **Nieve / distancia** — silencio, incertidumbre y congelación progresiva del paisaje.
6. **Campo verde / reliquias** — Aquarius, bicicleta, quesadilla y micrófono activan memorias; el campo gana vida.
7. **Lavanda / revelación** — el campo se transforma orgánicamente y empieza a perder gravedad.
8. **Ascensión** — ambos ascienden; aparecen grietas blancas en Ale, todavía como falsa transformación.
9. **Caída** — Ale cae solo a través de fragmentos de memoria; Kim permanece arriba.
10. **Tormenta / consecuencia** — forzar el avance empeora la tormenta; la calma comienza cuando deja de luchar.
11. **Disculpa** — Ale permanece solo y asume el daño; no hay rescate ni consuelo de Kim.
12. **Aceptación** — amanece porque Ale acepta lo que no puede controlar, no porque haya sido perdonado.
13. **Transformación real** — la luz nace dentro del pecho de Ale y lo lleva lentamente de negro a blanco con cicatrices.
14. **Reencuentro** — dos entes blancos se miran a distancia; no hay beso, abrazo ni resolución obligatoria.
15. **La esfera / el tesoro** — los recuerdos orbitan entre ambos sin convertirse en un objeto que alguien posea.
16. **Big Bang / epílogo** — la esfera colapsa, llega el silencio y nace un universo; los dos entes se deshacen por separado en partículas. Termina con “Feliz cumpleaños, Kim.” y un `AL.KIM.IA` pequeño.

## Reglas narrativas absolutas

- Los diálogos definitivos viven en `story.js` y se muestran literalmente. No reescribir, resumir, embellecer ni añadir citas.
- El único texto repetido deliberadamente es el fragmento de responsabilidad del desierto, retomado en la disculpa.
- No mostrar títulos como “ESCENA”, “DESIERTO” o “ASCENSIÓN”. Los nombres existen solo como estado interno y para preview local.
- Kim no rescata a Ale, no provoca su transformación y no funciona como premio.
- Ale cae y atraviesa tormenta, disculpa, aceptación y transformación solo.
- No hay fusión de los personajes en el final. Sus partículas entran por separado en el nuevo universo.
- El blanco final representa comprensión y transformación, no un “final feliz” ni una reconciliación confirmada.
- No justificar el daño ni convertir la disculpa en manipulación emocional.

## Personajes

**Ale** empieza negro: miedo, ego, inseguridad, culpa y necesidad de control. Mantiene una luz interior casi imperceptible; tras la tormenta se transforma lentamente en carbón, grafito, gris, plata y blanco. El resultado conserva fisuras y memoria.

**Kim** permanece blanca: claridad, bondad, vulnerabilidad, confianza y libertad. Tiene presencia propia; no es santa, ángel, personaje pasivo ni recompensa.

Ambos deben sentirse como entes abstractos, escultóricos, orgánicos, suaves y emocionalmente legibles, no humanoides genéricos.

## Arquitectura actual

- `runtime.js`: escena Three.js única, estados narrativos, entidades, cámaras, interacción, clima, partículas, audio generativo, adaptación de calidad y previews locales.
- `story.js`: orden canónico de las 16 escenas y todos los diálogos literales.
- `index.html` y `styles.css`: entrada, narración editorial, feedback de reliquias y epílogo, sin títulos visibles de escena.
- `app.js`: arranque del runtime.
- `sw.js`: caché de producción, incluido `story.js`.

El recorrido debe seguir sintiéndose como una sola obra. Las transiciones transforman el espacio existente: concierto → interior, habitación → portal, arena → nieve, deshielo → campo, verde → lavanda, ascensión → caída, impacto → tormenta, calma → amanecer y esfera → Big Bang.

## Deuda de fidelidad visual conocida

Los dos binarios fuente autoritativos no están actualmente en el repositorio ni en el workspace:

- `ESCENA 1.glb`
- `PERSONAJE.glb`

La narrativa completa puede probarse con la geometría procedural actual, pero esa geometría no debe presentarse como el pase final de fidelidad del estadio ni de los entes. Cuando estén disponibles los binarios exactos:

1. Cargar ambos con `GLTFLoader`.
2. Preservar escala, silueta, nodos, transformaciones y separación de materiales.
3. Integrarlos dentro de la dirección artística existente; no montar un renderer alternativo ni sustituir la obra por una demo genérica.
4. Usar el personaje fuente para los héroes; reservar instancing o LOD simplificado para la multitud lejana.
5. Validar orientación, materiales, cámara y rendimiento antes del siguiente push a producción.

El baseline limpio anterior a los experimentos de Scene 1 es `f40dcd224c39ae81079bad16764bf30a2ca5fea7`. Consultar el historial de forma selectiva; no descartar el runtime actual ni cambios válidos del usuario.

## Prioridad del siguiente pulido

La historia completa tiene prioridad sobre el detalle ornamental. Después, pulir en este orden:

1. Fidelidad de personajes con `PERSONAJE.glb`.
2. Fidelidad del concierto con `ESCENA 1.glb`, multitud, iluminación, humo y cámaras.
3. Campo, flores, colinas, cielo, clima y lavanda ascendente.
4. Caída, tormenta, disculpa y Big Bang.
5. Transiciones, cámaras y arco sonoro.
6. Mobile/Safari, rendimiento y carga.

No aceptar como final una escena que funciona pero se ve barata, una transición que parece cambio de nivel o un personaje cuya silueta no corresponde al asset fuente.

## QA antes de producción

Antes de empujar a `main` y dejar que el proyecto Vercel existente despliegue:

- recorrer las 16 escenas en navegador;
- comprobar que `ENTER` funciona y el audio se activa tras interacción;
- verificar que los cuatro recuerdos del campo se pueden obtener;
- confirmar que Kim no aparece en tormenta, disculpa, aceptación ni transformación;
- confirmar distancia en reencuentro y ausencia de fusión en Big Bang;
- comprobar todos los textos contra `story.js` y su legibilidad móvil;
- revisar carga de assets, consola y service worker;
- probar desktop y un viewport iPhone/Safari con calidad adaptativa;
- verificar la URL canónica de producción después del deploy.

## Límites permanentes

- No crear otro proyecto de Vercel.
- No migrar esta entrega a Unreal.
- No reemplazar escenas por demos Three.js genéricas.
- No simplificar el héroe de forma que cambie su silueta cuando esté disponible el GLB fuente.
- No aplanar el estadio con un único material genérico.
- No convertir el final en reconciliación obligatoria, rescate o fusión.
- No usar bloom, partículas o música sin intención narrativa.
