/**
 * Centralized Configuration for One Assess Assessment Engine
 * 
 * This file contains all hardcoded strings, API settings, and UI constants.
 * Sensitive values (API keys) are pulled from environment variables.
 */

export const CONFIG = {
  // --- APP HOST & URLS ---
  APP: {
    HOST: import.meta.env.VITE_PUBLIC_APP_HOST || 
          import.meta.env.PUBLIC_APP_HOST || 
          window.location.origin,
  },

  // --- FIREBASE & AUTH ---
  FIREBASE: {
    API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  },

  // --- AI & MACHINE LEARNING ---
  AI: {
    // MediaPipe Settings - Using local assets for reliability and CSP compliance
    MEDIAPIPE: {
      POSE_CDN: "/mediapipe", // Local path - assets stored in public/mediapipe/
      POSE_CDN_FALLBACK: "https://cdn.jsdelivr.net/npm/@mediapipe/pose", // CDN fallback
      TIMEOUT_MS: 15000,
      MODEL_COMPLEXITY: 1, // 0=light, 1=full, 2=heavy
      MIN_DETECTION_CONFIDENCE: 0.5,
      MIN_TRACKING_CONFIDENCE: 0.5,
    },
    // Gemini AI Settings
    GEMINI: {
      MODEL_NAME: "gemini-2.5-flash", // Stable Gemini 2.5 Flash (gemini-3-flash-preview requires special access - use gemini-2.5-flash for production)
      BACKEND: "VertexAIBackend", // Internal Firebase AI backend
    },
    // Firebase Cloud Functions
    FUNCTIONS: {
      REQUEST_REPORT_SHARE: "requestReportShare",
      EMAIL_REPORT: "emailReport",
    },
  },

  // --- POSTURE VIEWS ---
  // Capture order: Front → 1/4 turn right → 1/4 turn right → 1/4 turn right
  // Capture sequence: [0: front, 1: side-right, 2: back, 3: side-left]
  // Display order: [front, side-left, back, side-right]
  // Mapping: capture[0]→front, capture[1]→side-right, capture[2]→back, capture[3]→side-left
  POSTURE_VIEWS: [
    { id: 'front', label: 'FRONT', instr: 'Face the camera', captureOrder: 0 },
    { id: 'side-right', label: 'RIGHT SIDE', instr: 'Turn 1/4 to your right', captureOrder: 1 },
    { id: 'back', label: 'BACK', instr: 'Turn 1/4 more to your right', captureOrder: 2 },
    { id: 'side-left', label: 'LEFT SIDE', instr: 'Turn 1/4 more to your right', captureOrder: 3 }
  ] as const,

  // --- COMPANION APP SETTINGS ---
  COMPANION: {
    AUDIO: {
      SHUTTER_URL: "https://www.soundjay.com/mechanical/camera-shutter-click-08.mp3",
      FEEDBACK_INTERVAL_MS: 3000,
      SPEECH_RATE: 1.1,
    },
    POSE_THRESHOLDS: {
      TOO_CLOSE: 0.85, // Body height as % of frame
      TOO_FAR: 0.4,    // Body height as % of frame
      NOT_CENTERED: 0.15, // Max X deviation from center
    },
    ORIENTATION: {
      MAX_DEVIATION_DEG: 4, // Max degrees from vertical
    },
    CAPTURE: {
      COUNTDOWN_SEC: 5,
      SAFETY_TIMEOUT_MS: 30000,
      VIDEO_CONSTRAINTS: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
  },

  // --- POSTURE OVERLAY & RENDERING ---
  POSTURE_OVERLAY: {
    CANVAS_SIZE: {
      WIDTH: 800,
      HEIGHT: 1200,
    },
    TARGET_LANDMARKS: {
      CENTER_X_PCT: 50,
      SHOULDER_Y_PCT: 25,
      HIP_Y_PCT: 50,
      HEAD_Y_PCT: 12, // New target for head alignment
    },
    STYLE: {
      LINE_COLOR: "#00ff00",
      LINE_WIDTH: 4,
      DEVIATION_COLOR: "#ff0000",
      DEVIATION_WIDTH: 3,
      PLACEHOLDER_BG: "#f1f5f9",
    },
  },

  // --- SCORING & ALGORITHMS ---
  SCORING: {
    WEIGHTS: {
      BODY_FAT: 0.45,
      SMM: 0.25,
      VISCERAL: 0.20,
      WHR: 0.10,
    },
    THRESHOLDS: {
      BF_HEALTHY_MIN: 12,
      SMM_RATIO_SCALE: 300,
      VISCERAL_RISK_START: 8,
      WHR_RISK_START: 0.9,
    },
    ROADMAP: {
      WEIGHT_LOSS_KG_PER_WEEK: 0.5,
      MUSCLE_GAIN_KG_PER_WEEK_BEG: 0.25,
      MUSCLE_GAIN_KG_PER_WEEK_INT: 0.15,
      TARGET_BF_MALE: 18,
      TARGET_BF_FEMALE: 25,
      TARGET_SMM_MALE: 33,
      TARGET_SMM_FEMALE: 24,
    },
  },
} as const;

// Strict typing for the configuration
export type AppConfig = typeof CONFIG;

