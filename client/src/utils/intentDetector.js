/**
 * Intent Detector — detects product creation commands from voice transcriptions
 *
 * Uses layered detection:
 * 1. Flexible keyword + action combos (covers natural speech)
 * 2. Command pattern regex
 * 3. General build catch-all
 */

// Action verbs — stems that indicate creation intent
const ACTION_STEMS = [
  'cre', 'hac', 'gener', 'constru', 'desarroll', 'program', 'mont',
  'create', 'build', 'make', 'develop', 'generate', 'code',
  'quiero', 'necesito', 'quisiera', 'me gustaria', 'me gustaría',
  'solicit', 'pid', 'encarg', 'prepar', 'diseñ', 'disen',
  'request', 'prepare', 'design',
];

// Product targets
const PRODUCT_TARGETS = [
  'web', 'webapp', 'web app', 'sitio web', 'página web', 'pagina web', 'website',
  'saas', 'plataforma', 'aplicación', 'aplicacion', 'app',
  'tienda', 'ecommerce', 'e-commerce', 'shop', 'store',
  'juego', 'game', 'videojuego',
  'curso', 'course', 'clase', 'tutorial',
  'automatizacion', 'automatización', 'automation', 'bot',
  'landing', 'corporativa', 'portafolio', 'portfolio',
  'documento', 'presentacion', 'presentación', 'ppt', 'powerpoint',
  'blog', 'foro', 'dashboard', 'panel',
];

/**
 * Detect if text contains a product creation intent
 */
export function detectProductIntent(text) {
  if (!text || text.trim().length < 5) {
    return { detected: false, type: null, command: null, confidence: 0 };
  }

  const normalized = text.toLowerCase().trim();

  // Check for action verb + product target combination
  const hasAction = ACTION_STEMS.some(stem => normalized.includes(stem));
  const hasProduct = PRODUCT_TARGETS.some(target => normalized.includes(target));

  if (!hasAction || !hasProduct) {
    return { detected: false, type: null, command: null, confidence: 0 };
  }

  // Determine project type
  let type = 'create_webapp'; // default
  if (normalized.includes('saas') || normalized.includes('plataforma')) type = 'create_saas';
  else if (normalized.includes('tienda') || normalized.includes('ecommerce') || normalized.includes('shop') || normalized.includes('store')) type = 'create_ecommerce';
  else if (normalized.includes('juego') || normalized.includes('game') || normalized.includes('videojuego')) type = 'create_game';
  else if (normalized.includes('curso') || normalized.includes('course') || normalized.includes('tutorial')) type = 'create_course';
  else if (normalized.includes('automatiz') || normalized.includes('bot')) type = 'create_automation';
  else if (normalized.includes('corporativa') || normalized.includes('landing')) type = 'create_corporate';
  else if (normalized.includes('documento') || normalized.includes('presentacion') || normalized.includes('ppt')) type = 'create_document';

  // Calculate confidence based on match quality
  let confidence = 0.7;
  if (hasAction && hasProduct) confidence = 0.85;
  // Stronger patterns get higher confidence
  const strongPatterns = [
    /(?:crea|haz|genera|construye|create|build|make|generate)\s+(?:una|un)\s+/i,
    /(?:quiero|necesito|quisiera|solicito|pido|encargo)\s+(?:que\s+)?(?:crees|hagas|generes|construyas)\s+(?:una|un)\s+/i,
    /(?:me\s+)?(?:puedes|podr[ií]as)\s+(?:crear|hacer|generar|construir|desarrollar|solicitar|pedir)\s+(?:una|un)\s+/i,
    /(?:solicit[éeoa]|pid[oae]|encarg[oae])\s+(?:una|un)\s+/i,
  ];
  if (strongPatterns.some(p => p.test(normalized))) confidence = 0.95;

  return {
    detected: true,
    type,
    command: text.trim(),
    confidence,
    matchedBy: 'combo',
  };
}

/**
 * Extract a clean project description from the command
 */
export function extractProjectPrompt(command) {
  let cleaned = command
    .replace(/^(?:crea|haz|genera|construye|create|build|make|generate|develop|desarrolla|programa|monta)\s+(?:una|un|me)?\s*/i, '')
    .replace(/^(?:quiero|necesito|me gustaría|quisiera|solicito|pido|encargo)\s+(?:que\s+)?(?:crees|hagas|generes|construyas|desarrolles|programes)?\s*(?:una|un)?\s*/i, '')
    .replace(/^(?:me\s+)?(?:puedes|podrías|podrias)\s+(?:crear|hacer|generar|construir|desarrollar|programar|solicitar|pedir)\s+(?:una|un)?\s*/i, '')
    .replace(/\b(?:por favor|please|gracias|thanks)\b/gi, '')
    .trim();

  if (cleaned.length < 5) cleaned = command.trim();
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned;
}

/**
 * Classify user message
 */
export function classifyMessage(text) {
  const intent = detectProductIntent(text);
  if (intent.detected) {
    return {
      isProductCommand: true,
      intent,
      prompt: extractProjectPrompt(text),
    };
  }
  return { isProductCommand: false, intent: null, prompt: null };
}
