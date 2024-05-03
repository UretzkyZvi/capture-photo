"use client";
import React, { useEffect, useImperativeHandle } from "react";
import { useCamera } from "@/components/ui/camera/camera-provider"; // Adjust import path as necessary
import { cn } from "@/lib/utils";
import { CameraProps, defaultErrorMessages } from "./camera-types";

export const CameraView = React.forwardRef<unknown, CameraProps>(
  (
    {
      facingMode = "user",
      errorMessages = defaultErrorMessages,
      videoReadyCallback = () => null,
    },
    ref,
  ) => {
    const {
      playerRef,
      canvasRef,
      containerRef,
      numberOfCameras,
      notSupported,
      permissionDenied,
      currentFacingMode,
      activeDeviceId,
      initCameraStream,
      takePhoto,
      stopStream,
      setFacingMode,
    } = useCamera();

    // Ensures that the facing mode is set appropriately from the props
    useEffect(() => {
      setFacingMode(facingMode);
    }, [facingMode, setFacingMode]);

    useImperativeHandle(ref, () => ({
      takePhoto,
      switchCamera: () => {
        if (numberOfCameras < 1) {
          throw new Error(errorMessages.noCameraAccessible);
        }
        const newFacingMode =
          currentFacingMode === "user" ? "environment" : "user";
        setFacingMode(newFacingMode);
        return newFacingMode;
      },
      stopCamera: stopStream,
    }));

    useEffect(() => {
      if (numberOfCameras > 0 || activeDeviceId) {
        async function init() {
          await initCameraStream();
        }
        init();
      }
    }, [numberOfCameras, activeDeviceId]);

    return (
      <div
        ref={containerRef}
        className="min-h-[calc(100vh_-_theme(spacing.16))] bg-muted"
      >
        <div className="absolute left-0 top-0 h-svh w-full">
          {notSupported && (
            <div className="p-10">{errorMessages.noCameraAccessible}</div>
          )}
          {permissionDenied && (
            <div className="p-10">{errorMessages.permissionDenied}</div>
          )}
          <video
            className={cn(`z-0 h-svh w-full transform object-cover`, {
              "rotate-180": currentFacingMode === "user",
              "rotate-0": currentFacingMode === "environment",
            })}
            ref={playerRef}
            id="video"
            muted={true}
            autoPlay={true}
            playsInline={true}
            onLoadedData={videoReadyCallback}
          ></video>
          <canvas className="hidden" ref={canvasRef} />
        </div>
      </div>
    );
  },
);

CameraView.displayName = "CameraView";
