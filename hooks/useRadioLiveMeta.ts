import { useEffect, useRef, useState } from "react";
import EventSource from "react-native-sse";
import {
  fetchCageRadioFull,
  resolveNrgAssetUrl,
} from "../lib/radio";

const NOW_PLAYING_POLL_MS = 2000;

export function useRadioLiveMeta() {
  const [loading, setLoading] = useState(true);
  const [radioName, setRadioName] = useState("Radio");
  const [title, setTitle] = useState<string>("—");
  const [artist, setArtist] = useState<string>("—");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const nowPlayingKeyRef = useRef<string>("");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const applyNowPlaying = (full: {
      nowPlaying?: {
        title?: string;
        artist?: string;
        startOn?: string | null;
      } | null;
    }) => {
      const np = full?.nowPlaying ?? null;
      const nextTitle = np?.title ?? "Canlı Yayın";
      const nextArtist = np?.artist ?? " ";
      setTitle(nextTitle);
      setArtist(nextArtist);
      nowPlayingKeyRef.current = `${nextTitle}__${nextArtist}__${np?.startOn ?? ""}`;
    };

    (async () => {
      try {
        setLoading(true);
        const full = await fetchCageRadioFull();
        if (!active) return;

        setRadioName(full?.name ?? "Cage Club Radio");
        applyNowPlaying(full);
        setCoverUrl(resolveNrgAssetUrl(full?.logo));
        setStreamUrl(full?.streamUrlHigh ?? full?.streamUrlLow ?? null);

        timer = setInterval(async () => {
          try {
            const latest = await fetchCageRadioFull();
            if (!active) return;
            const np = latest?.nowPlaying ?? null;
            const nextTitle = np?.title ?? "Canlı Yayın";
            const nextArtist = np?.artist ?? " ";
            const nextKey = `${nextTitle}__${nextArtist}__${np?.startOn ?? ""}`;
            if (nextKey !== nowPlayingKeyRef.current) {
              setTitle(nextTitle);
              setArtist(nextArtist);
              nowPlayingKeyRef.current = nextKey;
            }
          } catch {
            /* noop */
          }
        }, NOW_PLAYING_POLL_MS);
      } catch {
        if (!active) return;
        setRadioName("Radio");
        setTitle("Bağlantı hatası");
        setArtist("—");
        setCoverUrl(null);
        setStreamUrl(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return {
    loading,
    radioName,
    title,
    artist,
    coverUrl,
    streamUrl,
  };
}
