/**
 * Custom hook: Initializes MediaPipe FaceMesh and draws green landmark dots
 * on a canvas overlay that sits on top of the webcam video feed.
 *
 * Usage:
 *   const { canvasRef, faceDetected } = useFaceMesh(videoRef, active);
 *   - videoRef  : ref to the <video> element (from react-webcam's getCanvas or ref)
 *   - active    : boolean — start/stop the detection loop
 *   - canvasRef : attach to a <canvas> that overlays the video
 */
import { useRef, useEffect, useState, useCallback } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";

export default function useFaceMesh(videoRef, active = true) {
  const canvasRef = useRef(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const faceMeshRef = useRef(null);
  const rafRef = useRef(null);

  // Draw green dots on the canvas for every detected landmark
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current?.video || videoRef.current;
    if (!video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      setFaceDetected(true);
      const landmarks = results.multiFaceLandmarks[0]; // first face
      ctx.fillStyle = "#00ff66";
      for (const point of landmarks) {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      setFaceDetected(false);
    }
  }, [videoRef]);

  useEffect(() => {
    if (!active) {
      setFaceDetected(false);
      return;
    }

    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;

    // Detection loop — sends video frames to FaceMesh ~15fps
    let running = true;
    const detect = async () => {
      if (!running) return;
      const video = videoRef.current?.video || videoRef.current;
      if (video && video.readyState >= 2 && faceMeshRef.current) {
        try {
          await faceMeshRef.current.send({ image: video });
        } catch {
          // ignore transient errors during teardown
        }
      }
      if (running) {
        rafRef.current = requestAnimationFrame(() => setTimeout(detect, 66));
      }
    };
    detect();

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      faceMesh.close();
      faceMeshRef.current = null;
    };
  }, [active, onResults, videoRef]);

  return { canvasRef, faceDetected };
}
