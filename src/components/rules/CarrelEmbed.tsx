import { useEffect, useRef } from "preact/hooks";
import type { CarrelApi, CarrelReferenceHandle } from "../../types/carrel-api";

/** Hosts Carrel's references board (mounted via its public API) inside the
 *  MiniSheet References tab. Mounts once; swaps the character in place when the
 *  active character changes. */
export function CarrelEmbed({
  api,
  characterId,
}: {
  api: CarrelApi;
  characterId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<CarrelReferenceHandle | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    handle.current = api.mountReferences(ref.current, {
      characterId,
      mode: "sidebar",
    });
    return () => {
      handle.current?.unmount();
      handle.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; characterId changes are handled by the effect below
  }, []);

  useEffect(() => {
    handle.current?.setCharacter(characterId);
  }, [characterId]);

  return <div class="ms-carrel-embed" ref={ref} />;
}
