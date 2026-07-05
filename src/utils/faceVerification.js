import * as faceapi from "face-api.js";

const MODEL_URL = "/models/face-api";
const MATCH_THRESHOLD = 0.5;

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

const detectSingleFaceDescriptor = async (source) => {
  await loadFaceVerificationModels();
  const image = await toImageElement(source);
  const detections = await faceapi
    .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  if (!detections.length) {
    throw new Error("No face detected. Ensure your face is well-lit and centered in the frame.");
  }
  if (detections.length > 1) {
    throw new Error("Only one face should be visible during attendance verification.");
  }

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
