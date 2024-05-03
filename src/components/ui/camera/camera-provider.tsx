"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

interface CameraProviderProps {
  children: React.ReactNode;
}

interface CameraContextType {
  numberOfCameras: number;
  activeDeviceId: string | undefined;
  images: string[];
  devices: MediaDeviceInfo[];
  playerRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  notSupported: boolean;
  permissionDenied: boolean;
  currentFacingMode: "user" | "environment";
  setNumberOfCameras: React.Dispatch<React.SetStateAction<number>>;
  setActiveDeviceId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setDevices: React.Dispatch<React.SetStateAction<MediaDeviceInfo[]>>;
  addImage: (imageData: string) => void;
  removeImage: (index: number) => void;
  resetImages: () => void;
  initCameraStream: () => Promise<void>;
  takePhoto: () => string | undefined;
  stopStream: () => void;
  setFacingMode: React.Dispatch<React.SetStateAction<"user" | "environment">>;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider = ({ children }: CameraProviderProps) => {
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(
    undefined,
  );
  const [images, setImages] = useState<string[]>([]);
  const [numberOfCameras, setNumberOfCameras] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentFacingMode, setFacingMode] = useState<"user" | "environment">(
    "user",
  );
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [notSupported, setNotSupported] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function fetchDevices() {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );
      setDevices(videoDevices);
    }
     fetchDevices();
  }, []);

  useEffect(() => {
    if (devices.length > 0) {
      setNumberOfCameras(devices.length);
      setActiveDeviceId(devices[0]?.deviceId);
    }
  }, [devices.length]);


  const initCameraStream = async () => {
    stopStream();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera API not available");
      setNotSupported(true);
      return;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: activeDeviceId ? { exact: activeDeviceId } : undefined,
          facingMode: currentFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setStream(newStream);
      if (playerRef.current) {
        playerRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error("Failed to get camera stream", error);
      setPermissionDenied(true);
    }
  };
 

  const takePhoto = (): string | undefined => {
    if (
      !playerRef.current ||
      !canvasRef.current ||
      !playerRef.current?.videoWidth ||
      !playerRef.current?.videoHeight ||
      !canvasRef.current?.getContext("2d") ||
      !containerRef.current?.offsetWidth ||
      !containerRef.current?.offsetHeight
    )
      return;

    const playerWidth = playerRef.current.videoWidth ?? 1280;
    const playerHeight = playerRef.current.videoHeight ?? 720;
    const playerAR = playerWidth / playerHeight;

    const canvasWidth = containerRef?.current?.offsetWidth ?? 1280;
    const canvasHeight = containerRef?.current?.offsetHeight ?? 1280;
    const canvasAR = canvasWidth / canvasHeight;

    let sX, sY, sW, sH;

    if (playerAR > canvasAR) {
      sH = playerHeight;
      sW = playerHeight * canvasAR;
      sX = (playerWidth - sW) / 2;
      sY = 0;
    } else {
      sW = playerWidth;
      sH = playerWidth / canvasAR;
      sX = 0;
      sY = (playerHeight - sH) / 2;
    }

    canvasRef.current.width = sW;
    canvasRef.current.height = sH;

    const context = canvasRef.current.getContext("2d");
    if (context && playerRef?.current) {
      context.drawImage(playerRef.current, sX, sY, sW, sH, 0, 0, sW, sH);
    }

    const imgData = canvasRef.current.toDataURL("image/jpeg");

    return imgData;
  };

 
  const addImage = (imageData: string) => {
    setImages((prevImages) => [...prevImages, imageData]);
  };

  const removeImage = (index: number) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const resetImages = () => {
    setImages([]);
  };

  const stopStream = () => {
       if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);  // Clear the stream state
      if (playerRef.current) {
        playerRef.current.srcObject = null;
      }
      console.log("Camera stream stopped");
    }
  };

  return (
    <CameraContext.Provider
      value={{
        numberOfCameras,
        activeDeviceId,
        images,
        devices,
        playerRef,
        canvasRef,
        containerRef,
        notSupported,
        permissionDenied,
        currentFacingMode,
        setNumberOfCameras,
        setActiveDeviceId,
        setDevices,
        addImage,
        removeImage,
        resetImages,
        initCameraStream,
        takePhoto,
        stopStream,
        setFacingMode,
      }}
    >
      {children}
    </CameraContext.Provider>
  );
};

export const useCamera = () => {
  const context = useContext(CameraContext);
  if (context === undefined) {
    throw new Error("useCamera must be used within a CameraProvider");
  }
  return context;
};
