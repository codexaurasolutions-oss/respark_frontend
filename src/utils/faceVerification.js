import * as faceapi from "face-api.js";

const MODEL_URL = "/models/face-api";
const MATCH_THRESHOLD = 0.5;
const MIN_DETECTION_SCORE = 0.5;
const MIN_FACE_RATIO = 0.08;
const MAX_OCCLUSION_RATIO = 0.35;

let modelLoadPromise = null;

const loadImageElement = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("Could not load selfie image for face verification."));
  image.src = source;
});

const toImageElement = async (source) => {
  if (typeof source === "string") {
    return loadImageElement(source);
  }
  const objectUrl = URL.createObjectURL(source);
  try {
    return await loadImageElement(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const loadFaceVerificationModels = async () => {
  if (!modelLoadPromise) {
    modelLoadPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]).catch((err) => {
      modelLoadPromise = null;
      throw err;
    });
  }
  await modelLoadPromise;
};

const validateFaceQuality = (detection, imageWidth, imageHeight) => {
  const box = detection.detection.box;
  const score = detection.detection.score;

  if (score < MIN_DETECTION_SCORE) {
    throw new Error(`Face detection confidence too low (${(score * 100).toFixed(0)}%). Ensure your face is clearly visible and well-lit.`);
  }

  const faceW = box.width;
  const faceH = box.height;
  const faceRatio = (faceW * faceH) / (imageWidth * imageHeight);
  if (faceRatio < MIN_FACE_RATIO) {
    throw new Error("Face is too small in the frame. Move closer to the camera.");
  }

  const landmarks = detection.landmarks;
  if (!landmarks) {
    throw new Error("Could not detect facial features. Ensure your face is clearly visible.");
  }

  const positions = landmarks.positions;
  if (!positions || positions.length < 68) {
    throw new Error("Facial landmark detection incomplete. Ensure your face is not covered.");
  }

  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();
  const mouth = landmarks.getMouth();

  if (!leftEye.length || !rightEye.length || !nose.length || !mouth.length) {
    throw new Error("Could not detect all facial features (eyes, nose, mouth). Remove any obstructions from your face.");
  }

  const eyeCenterX = (leftEye[0].x + rightEye[rightEye.length - 1].x) / 2;
  const eyeCenterY = (leftEye[0].y + rightEye[rightEye.length - 1].y) / 2;
  const noseTip = nose[Math.floor(nose.length / 2)];
  const mouthCenter = mouth[Math.floor(mouth.length / 2)];

  const noseVisible = Math.abs(noseTip.x - eyeCenterX) < faceW * 0.3 &&
                      noseTip.y > eyeCenterY &&
                      noseTip.y < mouthCenter.y;
  if (!noseVisible) {
    throw new Error("Nose is not clearly visible. Remove any obstruction from your face.");
  }

  const mouthVisible = Math.abs(mouthCenter.x - eyeCenterX) < faceW * 0.4 &&
                       mouthCenter.y > noseTip.y;
  if (!mouthVisible) {
    throw new Error("Mouth area is not clearly visible. Remove any hand or object from your face.");
  }

  const leftEyeVisible = leftEye.length >= 3 &&
                         leftEye[0].x > box.x - faceW * 0.1 &&
                         leftEye[leftEye.length - 1].x < box.x + faceW * 1.1;
  const rightEyeVisible = rightEye.length >= 3 &&
                          rightEye[0].x > box.x - faceW * 0.1 &&
                          rightEye[rightEye.length - 1].x < box.x + faceW * 1.1;
  if (!leftEyeVisible || !rightEyeVisible) {
    throw new Error("Both eyes must be visible. Remove sunglasses, hair, or hands from your face.");
  }

  const leftEyeWidth = leftEye[leftEye.length - 1].x - leftEye[0].x;
  const rightEyeWidth = rightEye[rightEye.length - 1].x - rightEye[0].x;
  const eyeWidthRatio = Math.abs(leftEyeWidth - rightEyeWidth) / Math.max(leftEyeWidth, rightEyeWidth, 1);
  if (eyeWidthRatio > 0.6) {
    throw new Error("Face appears angled or partially covered. Face the camera directly.");
  }

  return true;
};

const detectSingleFaceDescriptor = async (source) => {
  await loadFaceVerificationModels();
  const image = await toImageElement(source);
  const detections = await faceapi
    .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: MIN_DETECTION_SCORE }))
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  if (!detections.length) {
    throw new Error("No face detected. Ensure your face is well-lit and centered in the frame.");
  }
  if (detections.length > 1) {
    throw new Error("Only one face should be visible during attendance verification.");
  }

  validateFaceQuality(detections[0], image.naturalWidth || image.width, image.naturalHeight || image.height);

  return detections[0].descriptor;
};

export const ensureSingleFaceInImage = async (source) => {
  await detectSingleFaceDescriptor(source);
  return true;
};

export const compareFaceSources = async ({ enrollmentSource, liveSource }) => {
  if (!enrollmentSource) {
    throw new Error("Attendance biometric is not configured by the salon owner yet.");
  }

  const [enrollmentDescriptor, liveDescriptor] = await Promise.all([
    detectSingleFaceDescriptor(enrollmentSource),
    detectSingleFaceDescriptor(liveSource)
  ]);

  const distance = faceapi.euclideanDistance(enrollmentDescriptor, liveDescriptor);

  return {
    distance,
    threshold: MATCH_THRESHOLD,
    matched: distance <= MATCH_THRESHOLD
  };
};

export const verifyFaceMatch = async ({ enrollmentImageUrl, liveImageBlob }) => {
  if (!enrollmentImageUrl) {
    throw new Error("Attendance biometric is not configured by the salon owner yet.");
  }
  return compareFaceSources({
    enrollmentSource: enrollmentImageUrl,
    liveSource: liveImageBlob
  });
};
