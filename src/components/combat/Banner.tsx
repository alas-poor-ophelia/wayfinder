import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface BannerProps {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
}

/** Banner image (masked) + character swap button, sitting behind the content top. */
export function Banner({ plugin, store, character }: BannerProps) {
  const others = store.data.value.characters.filter((c) => c.id !== character.id);
  const next = others[0];

  let src: string | null = null;
  if (character.bannerImage) {
    const file = plugin.app.vault.getFileByPath(character.bannerImage);
    src = file
      ? plugin.app.vault.getResourcePath(file)
      : character.bannerImage; // allow raw URLs
  }

  return (
    <div class="ms-banner-area">
      {src && (
        <div class="ms-banner">
          <img class="ms-banner__img" src={src} alt="" />
        </div>
      )}
      {next && (
        <button
          // the button wears the sigil of the character you'd swap TO
          class={`ms-swap ms-swap--${next.characterType === "pc" ? "star" : "fox"}`}
          aria-label={`Swap to ${next.name}`}
          onClick={() => store.setActiveCharacter(next.id)}
        />
      )}
    </div>
  );
}
