"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  displayMediaCandidates,
  normalizeMediaInput,
  warmMediaBlob,
} from "@/lib/letsmeet";

const LOAD_TIMEOUT_MS = 2_500;
const MAX_LOAD_MS = 12_000;

/**
 * Resolves profile media URLs with warm-cache support and fast fallback
 * when proxy/upstream hosts fail.
 */
export function useMediaDisplay(photo?: string | null) {
  const normalizedPhoto = useMemo(() => normalizeMediaInput(photo), [photo]);
  const [warmedSrc, setWarmedSrc] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const loadStartedRef = useRef(0);

  const baseCandidates = useMemo(
    () => displayMediaCandidates(normalizedPhoto),
    [normalizedPhoto]
  );

  const candidates = useMemo(() => {
    if (!warmedSrc) return baseCandidates;
    return [warmedSrc, ...baseCandidates.filter((url) => url !== warmedSrc)];
  }, [baseCandidates, warmedSrc]);

  const src = candidates[index] ?? null;

  useEffect(() => {
    setWarmedSrc(null);
    setIndex(0);
    setLoaded(false);
    setFailed(false);
    loadStartedRef.current = Date.now();
    if (!normalizedPhoto) return;

    if (baseCandidates.length === 0) {
      setFailed(true);
      return;
    }

    let cancelled = false;
    void warmMediaBlob(normalizedPhoto).then((url) => {
      if (!cancelled && url) setWarmedSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedPhoto, baseCandidates.length]);

  useEffect(() => {
    if (!warmedSrc) return;
    setIndex(0);
    setLoaded(false);
    setFailed(false);
    loadStartedRef.current = Date.now();
  }, [warmedSrc]);

  const markLoaded = useCallback(() => setLoaded(true), []);

  const tryNext = useCallback(() => {
    setLoaded(false);
    setIndex((i) => {
      if (i + 1 < candidates.length) return i + 1;
      setFailed(true);
      return i;
    });
  }, [candidates.length]);

  const bindImg = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (!node || !src) return;
      if (node.complete && node.naturalWidth > 0) {
        markLoaded();
      }
    },
    [src, markLoaded]
  );

  useLayoutEffect(() => {
    const node = imgRef.current;
    if (!node || !src || loaded || failed) return;
    if (node.complete && node.naturalWidth > 0) {
      markLoaded();
    }
  }, [src, loaded, failed, markLoaded]);

  useEffect(() => {
    if (!src || loaded || failed) return;
    if (src.startsWith("data:") || src.startsWith("blob:")) return;
    const timer = window.setTimeout(() => tryNext(), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [src, loaded, failed, tryNext]);

  useEffect(() => {
    if (!src || loaded || failed) return;
    if (src.startsWith("data:") || src.startsWith("blob:")) return;
    const elapsed = Date.now() - loadStartedRef.current;
    const remaining = Math.max(0, MAX_LOAD_MS - elapsed);
    const timer = window.setTimeout(() => setFailed(true), remaining);
    return () => window.clearTimeout(timer);
  }, [src, loaded, failed, normalizedPhoto]);

  const onLoad = useCallback(() => markLoaded(), [markLoaded]);
  const onError = useCallback(() => tryNext(), [tryNext]);

  return {
    src,
    loaded,
    failed,
    onLoad,
    onError,
    bindImg,
    hasPhoto: Boolean(normalizedPhoto),
  };
}
