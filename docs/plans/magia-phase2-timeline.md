# Fase 2: Timeline Histórica Completa — El Gran Libro de la Magia

> **Para Hermes Agent:** Implementar era por era usando subagentes de investigación + escritura. Cada era es una tarea independiente con formato y plantilla fija.

**Objetivo:** Construir la línea temporal interactiva más completa sobre historia de la magia, con contenido extenso, imágenes generadas por IA y navegación fluida.

**Arquitectura:** Página HTML standalone dentro del proyecto. Cada era tendrá su sección expandible con contenido deep. Sistema de datos JSON como fuente de verdad.

**Tech Stack:** HTML + CSS vanilla (premium), JavaScript vanilla, imágenes generadas con ComfyUI JuggernautXL.

---

## Estructura de contenidos por era

Cada era incluirá:

### Plantilla fija (OBLIGATORIO):

```
1. HEADER: Título, año, imagen de fondo
2. INTRO: 150-250 palabras de introducción histórica
3. CONTEXTO HISTÓRICO: 100-150 palabras sobre la época
4. PERSONAJES CLAVE: 3-5 personas con nombre, descripción corta
5. HITOS / EVENTOS: 4-6 eventos con año y descripción
6. TRUCOS O EFECTOS: 3-5 efectos/ilusiones representativos con explicación
7. INFLUENCIA EN MAGIA MODERNA: 80-120 palabras
8. DATO CURIOSO: Un dato sorprendente
9. IMAGEN: Prompt para generación con IA
```

### Librería de prompts para generar imágenes de cada era

Cada era necesita al menos 1 imagen representativa. Usar JuggernautXL v9, 1024x1024.

---

## Las 10 eras y sus tareas

### Tarea 1: Chamanes y Rituales (40,000 a.C. - 3,000 a.C.)
Investigar: Magia paleolítica, chamanes siberianos, pinturas rupestres como rituales mágicos, el chamán como primer "mago", uso de plantas alucinógenas, trances, curaciones espirituales.

### Tarea 2: Egipto Antiguo (3,000 a.C. - 500 a.C.)
Investigar: Sacerdotes-magos egipcios, Papiro Westcar (trucos más antiguos documentados), Dedi el mago (decapitación de animales), ilusiones con agua y fuego en templos, los "misterios" de Isis y Osiris.

### Tarea 3: Grecia y Roma (500 a.C. - 400 d.C.)
Investigar: Herón de Alejandría (autómatas, puertas automáticas), templos griegos con mecanismos ocultos, oráculos como ilusionismo, la primera bola de cristal, magia callejera en el Imperio Romano.

### Tarea 4: Edad Media y Trovadores (400 - 1500)
Investigar: Trovadores y juglares como magos callejeros, alquimia y su magia visual, la Inquisición y magia como herejía, Grimorios, el manuscrito Voynich, Reginald Scot y "The Discoverie of Witchcraft" (primer libro que expone trucos).

### Tarea 5: Renacimiento y Alquimia (1500 - 1780)
Investigar: John Dee (ocultista, matemático, espía), la crisis del escepticismo, Isaac Newton y la alquimia, autómatas del siglo XVIII (El Turco ajedrecista), ferias ambulantes y saltimbanquis.

### Tarea 6: Ilusionismo Clásico (1780 - 1900)
Investigar: Jean-Eugène Robert-Houdin (padre del ilusionismo moderno), su teatro en París, la levitación de Robert-Houdin, el árbol de la seda, John Henry Anderson (El Mago del Norte), Alexander Herrmann, los hermanos Davenport y el espiritismo, Maskelyne y Cooke desenmascarando médiums.

### Tarea 7: Era Houdini y Escapismo (1900 - 1930)
Investigar: Harry Houdini (biografía, escapes famosos, muerte), Bess Houdini, el desafío chino del water tortura, la camisa de fuerza, la lucha contra los espiritistas, Howard Thurston (el mago americano), Harry Kellar, Chung Ling Soo (muerte en escena), Dante.

### Tarea 8: Edad de Oro de la Magia (1930 - 1970)
Investigar: Dai Vernon (El Profesor, el mago de los magos), Slydini y el close-up, Cardini (magia elegante sin palabras), Blackstone, Richiardi Jr. (ilusión de la motosierra), John Scarne (cartomagia y juegos), la magia en el cine, fundación de la FISM.

### Tarea 9: Magia Televisiva y Moderna (1970 - 2000)
Investigar: David Copperfield (especiales de TV, desaparición de la Estatua de la Libertad), el show de televisión "The Amazing World of Magic", Doug Henning (magia hippie psicodélica), Siegfried & Roy, Penn & Teller (magia cómica y desmitificadora), Juan Tamariz (teoría, La Vía Mágica, El Ardid), René Lavand (magia con una mano, poesía).

### Tarea 10: Era Digital y Contemporánea (2000 - Actualidad)
Investigar: David Blaine (Street Magic, resistencias extremas), Criss Angel (Mindfreak, TV reality), Derren Brown (mentalismo teatral, hipnosis, psicología), Dynamo (magia urbana, Walking on Water), Shin Lim (cartomagia, campeón AGT), la magia en YouTube/TikTok, magia con IA, el futuro del ilusionismo.

---

## Especificaciones técnicas HTML

### Página de timeline
- `historia.html` dentro del proyecto
- Diseño oscuro + dorados (misma paleta que home)
- Navegación vertical con scroll
- Cada era es una sección de alto completo (100vh min)
- Fondo de imagen generada por era con overlay oscuro
- Indicador de progreso lateral
- Animaciones de entrada (fadeIn, slideUp)
- Navegación rápida entre eras (flechas teclado + botones)

### Datos
- `data/timeline.json` con contenido estructurado de todas las eras
- Cargado dinámicamente por JS

---

## Ejecución con subagentes

Cada era se investiga y escribe individualmente con el siguiente proceso:

```
1. Subagente investiga la era → escribe contenido completo siguiendo plantilla
2. Revisión de contenido (yo)
3. Generar imagen para la era con ComfyUI
4. Integrar en timeline.json
5. Marcar era como completa
```

**Instrucciones para subagentes de investigación:**

```
Eres un historiador experto en magia e ilusionismo. Tu tarea es investigar y escribir contenido
EXTENSO y PRECISO sobre una era específica de la historia de la magia.

Debes producir contenido siguiendo EXACTAMENTE esta plantilla:

## [NOMBRE DE LA ERA] ([años])

### Introducción
[150-250 palabras sobre el periodo en general]

### Contexto histórico
[100-150 palabras sobre la sociedad de la época]

### Personajes clave
1. **[Nombre]** - [2 líneas de descripción]
2. **[Nombre]** - [2 líneas]
3. **[Nombre]** - [2 líneas]

### Hitos y eventos
- **[año]** - [Evento y descripción en 1-2 líneas]
- **[año]** - [Evento...]

### Efectos y trucos representativos
1. **[Nombre del efecto]** - [Explicación de qué hacía y cómo engañaba al público]
2. ...

### Influencia en la magia moderna
[80-120 palabras]

### Dato curioso
Un dato auténtico y sorprendente que la mayoría desconoce.

### Prompt para imagen
[Prompt descriptivo para generar imagen de esta era con JuggernautXL]

REGLAS:
- NO inventes hechos históricos. Si no estás seguro, indica "Según algunas fuentes..."
- Los nombres, fechas y lugares deben ser verificables
- El tono debe ser elegante, documental, cinematográfico
- Escribe en español
- Máximo rigor histórico
```

IMPORTANTE: Cada subagente recibe UNA SOLA era para investigar. Las 10 eras son paralelizables (3 subagentes máximo por lote).
