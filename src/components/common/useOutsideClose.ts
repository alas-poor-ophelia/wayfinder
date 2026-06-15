import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

/**
 * Close an anchored overlay panel on any pointerdown (mouse + touch)
 * outside `ref`. The document listener only exists while `active`.
 */
export function useOutsideClose(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onClose: () => void,
): void {
  // Keep the latest onClose without resubscribing the listener every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCloseRef.current();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active, ref]);
}
