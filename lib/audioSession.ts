import { setAudioModeAsync } from "expo-audio";

/**
 * Canlı radyo için ses oturumu (expo-audio — SDK 57+; expo-av kaldırıldı).
 */
export async function applyRadioAudioSession(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
    shouldPlayInBackground: true,
    shouldRouteThroughEarpiece: false,
    interruptionMode: "doNotMix",
  });
}
