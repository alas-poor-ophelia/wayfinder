import { useState } from "preact/hooks";
import { ICON_IDS } from "../../../data/icons/registry";
import { Icon } from "../../common/Icon";
import { UI } from "../glyphs";

/* ---------- icon picker (nested in-config modal) -------------------------- */

const ICON_PAGE = 140;

export function IconPicker({
  current,
  onPick,
  onClose,
}: {
  current: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const matches = ICON_IDS.filter((id) => !query || id.includes(query));
  const shown = matches.slice(0, ICON_PAGE);
  return (
    <div class="scrim" onClick={onClose}>
      <div class="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div class="modal__head">
          <div class="modal__titles">
            <div class="modal__title">Choose icon</div>
          </div>
          <button class="iconbtn" onClick={onClose}>
            <UI.x />
          </button>
        </div>
        <div class="modal__body">
          <div class="searchbox" style={{ marginBottom: 8 }}>
            <UI.search />
            <input
              placeholder="Search icons…"
              value={q}
              onInput={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="icongrid">
            {shown.map((id) => (
              <button
                key={id}
                class={id === current ? "is-sel" : ""}
                title={id}
                onClick={() => {
                  onPick(id);
                  onClose();
                }}
              >
                <Icon id={id} />
              </button>
            ))}
          </div>
          <p class="help">
            {matches.length > shown.length
              ? `Showing ${shown.length} of ${matches.length} — refine your search.`
              : `${matches.length} icons. Game-icons.net (CC BY 3.0) via RPG Awesome.`}
          </p>
        </div>
      </div>
    </div>
  );
}
