import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";

import { applyRadioAudioSession } from "../lib/audioSession";

type StatusSub = { remove: () => void };

function safelyReleasePlayer(
  player: AudioPlayer,
  subscription: StatusSub | null,
): void {
  try {
    subscription?.remove();
  } catch {
    /* listener zaten kopmuş */
  }
  try {
    player.pause();
  } catch {
    /* yayın dururken kesinti */
  }
  try {
    player.remove();
  } catch {
    /* zaten release */
  }
}

/**
 * Canlı yayın — `expo-audio` (SDK 57; Expo Go + EAS).
 */
export function useLiveRadioPlayback(streamUrl: string | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const subscriptionRef = useRef<StatusSub | null>(null);
  const isTogglingRef = useRef(false);

  const clearPlaybackState = useCallback(() => {
    setIsPlaying(false);
    setIsBuffering(false);
  }, []);

  const releaseCurrent = useCallback(() => {
    const player = playerRef.current;
    const subscription = subscriptionRef.current;
    playerRef.current = null;
    subscriptionRef.current = null;
    if (player) safelyReleasePlayer(player, subscription);
  }, []);

  useEffect(() => {
    return () => {
      releaseCurrent();
      clearPlaybackState();
    };
  }, [releaseCurrent, clearPlaybackState]);

  useEffect(() => {
    if (!streamUrl) {
      releaseCurrent();
      clearPlaybackState();
    }
  }, [streamUrl, releaseCurrent, clearPlaybackState]);

  const toggle = useCallback(async () => {
    if (isTogglingRef.current || !streamUrl) return;
    isTogglingRef.current = true;
    try {
      if (playerRef.current) {
        releaseCurrent();
        clearPlaybackState();
        return;
      }

      setIsBuffering(true);
      await applyRadioAudioSession();

      const player = createAudioPlayer({ uri: streamUrl });
      const subscription = player.addListener(
        "playbackStatusUpdate",
        (status) => {
          setIsPlaying(status.playing);
          setIsBuffering(status.isBuffering);
        },
      );

      playerRef.current = player;
      subscriptionRef.current = subscription;
      player.play();
    } catch (e) {
      releaseCurrent();
      clearPlaybackState();
      console.warn("[useLiveRadioPlayback] create / session failed:", e);
    } finally {
      isTogglingRef.current = false;
    }
  }, [streamUrl, clearPlaybackState, releaseCurrent]);

  return { isPlaying, isBuffering, toggle };
}
