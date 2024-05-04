"use client";
import { createContext, useContext, useRef, useState } from "react";
import { defaultErrorMessages } from "./camera-types";

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

  setNumberOfCameras: React.Dispatch<React.SetStateAction<number>>;
  setActiveDeviceId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setDevices: React.Dispatch<React.SetStateAction<MediaDeviceInfo[]>>;
  addImage: (imageData: string) => void;
  removeImage: (index: number) => void;
  resetImages: () => void;
  initCameraStream: () => Promise<void>;
  takePhoto: () => string | undefined;
  stopStream: () => void;
  switchCamera: () => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider = ({ children }: CameraProviderProps) => {
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(
    undefined,
  );
  const [images, setImages] = useState<string[]>([]);
  const [numberOfCameras, setNumberOfCameras] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const playerRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [notSupported, setNotSupported] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const initCameraStream = async () => {
    stopStream();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera API not available");
      setNotSupported(true);
      return;
    }

    try {
      navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            deviceId: activeDeviceId ? { exact: activeDeviceId } : undefined,
            width: { min: 640, ideal: 1920 },
            height: { min: 400, ideal: 1080 },
            aspectRatio: { ideal: 1.7777777778 },
          },
        })
        .then((stream: MediaStream) => {
          setStream(handleSuccess(stream));
          if (playerRef.current) {
            playerRef.current.srcObject = stream;
          }
        })
        .catch((error: Error) => {
          handleError(error);
        });
    } catch (error) {
      console.error("Failed to get camera stream", error);
      setPermissionDenied(true);
    }
  };
  const handleError = (error: Error) => {
    console.error(error);

    //https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    if (error.name === "PermissionDeniedError") {
      setPermissionDenied(true);
    } else {
      setNotSupported(true);
    }
  };

  const handleSuccess = (stream: MediaStream) => {
    navigator.mediaDevices.enumerateDevices().then((mediaDevice) => {
      const devices = mediaDevice.filter((i) => i.kind === "videoinput");
      setNumberOfCameras(devices.length);
      setDevices(devices);
      if (!activeDeviceId) {
        setActiveDeviceId(devices[0]?.deviceId);
      }
    });

    return stream;
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
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setStream(null);
      if (playerRef.current) {
        playerRef.current.srcObject = null;
      }
      console.log("Camera stream stopped");
    }
  };

  const switchCamera = () => {
    if (numberOfCameras < 1) {
      throw new Error(defaultErrorMessages.noCameraAccessible);
    }
    const nextDevice = devices.find(
      (device) => device.deviceId !== activeDeviceId,
    );
    if (nextDevice) {
      setActiveDeviceId(nextDevice.deviceId);
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

        setNumberOfCameras,
        setActiveDeviceId,
        setDevices,
        addImage,
        removeImage,
        resetImages,
        initCameraStream,
        takePhoto,
        stopStream,

        switchCamera,
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
