/**
 * Centralized Configuration for One Assess
 * 
 * This file contains all hardcoded strings, API settings, and UI constants.
 * Sensitive values (API keys) are pulled from environment variables.
 */

export const CONFIG = {
  /**
   * Gemini Live voice framing for posture Companion / guided capture. Default off; set `VITE_ENABLE_GEMINI_LIVE=true` for device QA.
   */
  ENABLE_GEMINI_LIVE: import.meta.env.VITE_ENABLE_GEMINI_LIVE === 'true',

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
    /**
     * Callable HTTPS region (must match deployed `syncPublicRoadmapMirror` etc.).
     * Override with `VITE_FIREBASE_FUNCTIONS_REGION` if functions are not in `us-central1`.
     */
    FUNCTIONS_REGION: (() => {
      const r = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION;
      return typeof r === 'string' && r.trim() !== '' ? r.trim() : 'us-central1';
    })(),
  },

  // --- AI & MACHINE LEARNING ---
  AI: {
    MEDIAPIPE: {
      /** Pin to installed `@mediapipe/tasks-vision` — update TASKS_WASM_BASE when bumping the package. */
      TASKS_VISION_PACKAGE_VERSION: '0.10.34',
      TASKS_WASM_BASE:
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm',
      /** Full model; legacy `full.pose_landmarker/.../latest/...` path 404s as of 2026 — use current bucket layout. */
      POSE_LANDMARKER_MODEL_URL:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
      TIMEOUT_MS: 15000,
      LIVE_POSE_TARGET_FPS: 7,
      /** Stricter than MediaPipe defaults (0.5): reduce low-light / occlusion hallucinations for clinical posture. */
      MIN_POSE_DETECTION_CONFIDENCE: 0.7,
      MIN_POSE_PRESENCE_CONFIDENCE: 0.7,
      MIN_TRACKING_CONFIDENCE: 0.75,
    },
    GEMINI: {
      MODEL_NAME: (() => {
        const v = import.meta.env.VITE_GEMINI_MODEL;
        return typeof v === 'string' && v.trim() !== '' ? v.trim() : 'gemini-2.5-flash';
      })(),
      BACKEND: "VertexAIBackend", // Internal Firebase AI backend
      /** Posture narrative after MediaPipe metrics — 3.x-class default; override with VITE_GEMINI_POSTURE_FEEDBACK_MODEL if your project uses a different ID. */
      POSTURE_FEEDBACK_MODEL_NAME: (() => {
        const v = import.meta.env.VITE_GEMINI_POSTURE_FEEDBACK_MODEL;
        return typeof v === 'string' && v.trim() !== '' ? v.trim() : 'gemini-3-flash-preview';
      })(),
      // Use VITE_GEMINI_LIVE_MODEL to override framing guide (Gemini Live).
      LIVE_MODEL_NAME: (() => {
        const v = import.meta.env.VITE_GEMINI_LIVE_MODEL;
        return typeof v === 'string' && v.trim() !== '' ? v.trim() : 'gemini-3.1-flash-live-preview';
      })(),
      /** Gemini Live prebuilt voice; override with VITE_GEMINI_LIVE_VOICE_NAME after auditioning Chirp voices. */
      LIVE_VOICE_NAME: (() => {
        const v = import.meta.env.VITE_GEMINI_LIVE_VOICE_NAME;
        return typeof v === 'string' && v.trim() !== '' ? v.trim() : 'Aoede';
      })(),
      LIVE_FRAME_INTERVAL_MS: 1000,
      /**
       * Safety net: if the model neither calls capture_now nor speaks the transcription trigger,
       * fire capture after this many ms while a view is armed (logged). 0 = disabled.
       */
      LIVE_CAPTURE_FALLBACK_MS: 12000,
    },
    // Firebase Cloud Functions
    FUNCTIONS: {
      REQUEST_REPORT_SHARE: "requestReportShare",
      EMAIL_REPORT: "emailReport",
    },
  },

  // --- POSTURE VIEWS ---
  // Enforced sequence: Front → quarter turn right → left profile → quarter turn right → back → quarter turn right → right profile
  POSTURE_VIEWS: [
    {
      id: 'front',
      label: 'FRONT',
      instr:
        'Face the camera. Position yourself so your body fills the guide box from head to toe — not tiny in the distance, not cropped.',
      captureOrder: 0,
    },
    {
      id: 'side-left',
      label: 'LEFT SIDE',
      instr:
        'Slowly turn a quarter turn to your right from the front until your left side faces the camera. Stay in profile; your body should fill the guide box.',
      captureOrder: 1,
    },
    {
      id: 'back',
      label: 'BACK',
      instr:
        'Turn another quarter turn to your right so your back faces the camera. Full body fills the guide box.',
      captureOrder: 2,
    },
    {
      id: 'side-right',
      label: 'RIGHT SIDE',
      instr:
        'One more quarter turn to your right so your right side faces the camera. Profile view; body fills the guide box.',
      captureOrder: 3,
    },
  ] as const,

  // --- COMPANION APP SETTINGS ---
  COMPANION: {
    AUDIO: {
      FEEDBACK_INTERVAL_MS: 4000,
      SPEECH_RATE: 0.92,
    },
    POSE_THRESHOLDS: {
      /**
       * Full-body scale: average ankle Y minus nose Y (MediaPipe normalized 0–1).
       * Target band ~70–80% of frame height for clinical repeatability.
       */
      USER_SCALE_OPTIMAL_MIN: 0.6,
      USER_SCALE_OPTIMAL_MAX: 0.88,
      NOT_CENTERED: 0.15, // Max X deviation from center (ignored for side views in live pose gate)
      /**
       * Per-landmark visibility floor for structural anchors (shoulders, hips, ankles).
       * Used with live preview, still capture gate, and posture processing — not a global average.
       */
      STRUCTURAL_ANCHOR_MIN_VISIBILITY: 0.7,
    },
    ORIENTATION: {
      MAX_DEVIATION_DEG: 4, // Max degrees from vertical
      /**
       * Posture QR companion + guided panel: do not block Gemini / capture on gyro “upright”.
       * Gyro is noisy on some devices; framing is still guided by voice + MediaPipe.
       */
      POSTURE_RELAX_UPRIGHT: true,
      /** When POSTURE_RELAX_UPRIGHT is false, portrait stability time (ms). */
      STABLE_VERTICAL_MS_POSTURE: 400,
      STABLE_VERTICAL_MS_BODYCOMP: 450,
    },
    /** Posture companion / guided capture — user-visible strings (i18n later). */
    VOICE_GUIDE: {
      START_BUTTON: 'Start voice guide',
      READY_HINT:
        'Camera and motion are on. Tap below to connect the AI guide first — on some mobile browsers this keeps the live session stable while system permission dialogs appear.',
      NOT_CONNECTED_BEFORE_SCAN:
        'Voice guide is not connected. Please tap Try again before starting the scan.',
      CONNECTING_VOICE_GUIDE: 'Connecting voice guide…',
      NOT_CONNECTED_USE_TRY_AGAIN: 'Voice guide is not connected. Tap Try again above before starting the scan.',
      LANDMARK_REJECT_SPEAK:
        "I couldn't quite see your full body that time. Step back a little so I can see you head to toe, then hold still and we'll try again.",
      /**
       * Shown on Companion posture flow — SOP for parallax: camera height + vertical matter more than code can infer.
       */
      POSTURE_CAMERA_HEIGHT_SOP:
        'Place the camera at about waist height, perfectly vertical in portrait — not overhead or on the floor — for repeatable posture scans.',
      /** Shown above “Enable camera” on posture flows (short line). */
      PERMISSION_WAIST_HEIGHT_HINT:
        'Set the phone at about waist height and vertical before you continue — it makes framing much easier.',
      /** Legacy TTS between views when Gemini Live is off. */
      POSTURE_QUARTER_TURN_RIGHT: 'Nice one. Slowly turn a quarter turn to your right.',
    },
    CAPTURE: {
      COUNTDOWN_SEC: 5,
      SAFETY_TIMEOUT_MS: 30000,
      /** Delay after each posture Gemini capture before arming the next view (matches bodycomp turn spacing). */
      POSTURE_GEMINI_NEXT_VIEW_MS: 3000,
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

