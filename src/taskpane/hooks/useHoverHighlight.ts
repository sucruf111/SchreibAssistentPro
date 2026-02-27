import { useRef, useCallback } from "react";
import { highlightTextInDocument } from "../services/wordApi";

/** Debounced hover-to-highlight: call onMouseEnter(text) / onMouseLeave() on correction cards. */
export function useHoverHighlight() {
  var timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  var onMouseEnter = useCallback(function (text: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(function () {
      highlightTextInDocument(text).catch(function () {
        // silently ignore — text may no longer exist in document
      });
    }, 150);
  }, []);

  var onMouseLeave = useCallback(function () {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { onMouseEnter: onMouseEnter, onMouseLeave: onMouseLeave };
}
