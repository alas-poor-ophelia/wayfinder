import type { RefObject } from "preact";
import { useEffect } from "preact/hooks";

/**
 * Close an anchored overlay panel on any pointerdown (mouse + touch)
 * outside `ref`. The document listener only exists while `active`.
 */
export function useOutsideClose(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onClose: () => void
): void {
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active]);
}
