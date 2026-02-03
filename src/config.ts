// Admin Configuration - Easily modify these values to customize the app behavior

export const CATEGORIES = [
    '4010 Svamparna',
    '4020 Träden',
    '4030 Djungeldjuren',
    '4040 Vildfåglarna',
    '4050 Skogslöparna',
    '4060 Utmanarna',
    '4070 Ledare',
    '4080 Styrelse och Kårstämmor',
    '4090 Kårgemensamma aktiviteter',
    '6990 Övriga Kostnader',
    '5010 Underhåll F84',
    '4120 Verksamhetsförbrukning',
    '4510 Verksamhetsinventarier',
    '4130 Demokratiska möten',
    'Renovering, Speca vad under beskrivning',
    '4810 Uppvaktning/Avtackning',
];

export const DRIVING_COST_MULTIPLIER = 2.5; // Cost per km for driving expenses

export const GOOGLE_MAPS_API_KEY = 'AIzaSyAvCBn477nxZotf6M5Xkbf1Vww2XVZt-3s';

// PDF Image Handling Configuration
export const PDF_IMAGE_DPI_THRESHOLD = 300; // DPI threshold - above this we scale down instead of splitting
export const PDF_IMAGE_MIN_SPLIT_PERCENTAGE = 20; // Minimum % of image on next page to justify splitting (otherwise scale down)
export const PDF_IMAGE_OVERLAP_MM = 25; // Overlap in mm when splitting images across pages
export const PDF_IMAGE_MAX_WIDTH_PX = 2400; // Maximum image width in pixels (maintains ~340 DPI at 180mm display width)
export const PDF_IMAGE_JPEG_QUALITY = 0.75; // JPEG compression quality for normal images (0.0-1.0)
export const PDF_IMAGE_JPEG_QUALITY_SPLIT = 0.85; // JPEG compression quality for image chunks (higher to avoid double compression)
export const PDF_IMAGE_CONTRAST_THRESHOLD = 85; // Threshold for detecting high contrast images (use PNG instead of JPEG for text/documents)
