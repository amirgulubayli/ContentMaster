import type { Platform } from "./types";

export type MediaPolicyResult = {
  ok: boolean;
  reason?: string;
};

export type MediaPolicyInput = {
  platform: Platform;
  imageProvider?: string;
  videoPipeline?: string;
  includesHumanFace?: boolean;
  faceGender?: "male" | "female" | "unknown";
  accountPersonaGender?: "male" | "female" | "neutral";
};

export function validateMediaPolicy(input: MediaPolicyInput): MediaPolicyResult {
  if (input.imageProvider && input.imageProvider.toLowerCase() !== "gemini") {
    return { ok: false, reason: "Gemini is the only allowed image generator." };
  }

  if (input.videoPipeline && input.videoPipeline.toLowerCase() !== "remotion+ffmpeg") {
    return { ok: false, reason: "Video must be created via Remotion + ffmpeg." };
  }

  if (input.includesHumanFace && input.faceGender === "female") {
    return { ok: false, reason: "Female faces are not allowed in AI persona output." };
  }

  if (
    input.accountPersonaGender === "female" &&
    input.includesHumanFace &&
    input.faceGender !== "male"
  ) {
    return {
      ok: false,
      reason: "Female-branded accounts cannot publish visible female AI faces."
    };
  }

  return { ok: true };
}
