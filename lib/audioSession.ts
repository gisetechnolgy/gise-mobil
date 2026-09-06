import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "expo-av";

/**
 * Canlı radyo için ses oturumu (expo-av).
 * EAS / kendi native binary’de expo-audio ile stream davranışı farklı olabiliyor; tek stack.
 */
export async function applyRadioAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  });
}
