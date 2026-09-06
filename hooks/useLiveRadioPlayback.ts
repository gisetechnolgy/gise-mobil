import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";

import { applyRadioAudioSession } from "../lib/audioSession";

async function safelyUnloadSound(s: Audio.Sound): Promise<void> {
  try {
    await s.stopAsync();
  } catch {
    /* yayın dururken kesinti */
  }
  try {
    await s.unloadAsync();
  } catch {
    /* zaten unload */
  }
}

/**
 * Canlı yayın — `expo-av` (Expo Go ile aynı yerleşik yol; EAS ipa’da expo-audio stream’i sessiz kesebiliyordu).
 */
export function useLiveRadioPlayback(streamUrl: string | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isTogglingRef = useRef(false);

  const clearPlaybackState = useCallback(() => {
    setIsPlaying(false);
    setIsBuffering(false);
  }, []);

  useEffect(() => {
    return () => {
      const s = soundRef.current;
      soundRef.current = null;
      if (s) void safelyUnloadSound(s);
      clearPlaybackState();
    };
  }, [clearPlaybackState]);

  useEffect(() => {
    if (!streamUrl) {
      const s = soundRef.current;
      soundRef.current = null;
      clearPlaybackState();
      if (s) void safelyUnloadSound(s);
    }
  }, [streamUrl, clearPlaybackState]);

  const toggle = useCallback(async () => {
    if (isTogglingRef.current || !streamUrl) return;
    isTogglingRef.current = true;
    try {
      if (soundRef.current) {
        const s = soundRef.current;
        soundRef.current = null;
        clearPlaybackState();
        await safelyUnloadSound(s);
        return;
      }

      setIsBuffering(true);
      await applyRadioAudioSession();

      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true, isLooping: false },
        (status) => {
          if (!status.isLoaded) {
            if ("error" in status && status.error) {
              console.warn("[useLiveRadioPlayback] load error:", status.error);
              soundRef.current = null;
              clearPlaybackState();
            }
            return;
          }
          if (status.isPlaying) {
            soundRef.current = sound;
            setIsPlaying(true);
            setIsBuffering(false);
          }
        },
        false,
      );

      const initial = await sound.getStatusAsync();
      if (initial.isLoaded && initial.isPlaying) {
        soundRef.current = sound;
        setIsPlaying(true);
        setIsBuffering(false);
      }
    } catch (e) {
      soundRef.current = null;
      clearPlaybackState();
      console.warn("[useLiveRadioPlayback] createAsync / session failed:", e);
    } finally {
      isTogglingRef.current = false;
    }
  }, [streamUrl, clearPlaybackState]);

  return { isPlaying, isBuffering, toggle };
}
