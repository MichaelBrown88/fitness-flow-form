/**
 * Posture Overlay Module
 *
 * This file re-exports from the refactored posture module for backwards compatibility.
 * New code should import directly from '@/lib/posture'.
 */

export {
  // Types
  type PostureView,
  type OverlayOptions,
  type LandmarkData,
  type WireframeOptions,
  type WireframeOnlyOptions,
  type FrontBackAlignments,
  type SideViewAlignments,

  // Constants
  ALIGNMENT_COLORS,
  FRONT_VIEW_CONNECTIONS,
  FRONT_VIEW_LANDMARKS,
  BACK_VIEW_CONNECTIONS,
  BACK_VIEW_LANDMARKS,
  SIDE_LEFT_CONNECTIONS,
  SIDE_LEFT_LANDMARKS,
  SIDE_RIGHT_CONNECTIONS,
  SIDE_RIGHT_LANDMARKS,
  DEBUG_POSE_CONNECTIONS,

  // Canvas operations
  addPostureOverlay,
  addDeviationOverlay,
  generatePlaceholderWithGreenLines,
  cropAndCenterImage,

  // Alignment calculations
  calculateFrontBackAlignments,
  calculateSideViewAlignments,

  // Wireframe rendering
  drawLandmarkWireframe,
  generateWireframeOnly,

  // Deviation rendering
  drawDeviations,

  // Drawing utilities
  getSeverityColor,
  getSeverityPointColor,
  drawControlLine,
  drawAlignmentLine,
  drawLandmarkPoint,
} from '@/lib/posture';
