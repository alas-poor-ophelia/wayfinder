/**
 * Config section barrel. Re-exports the public section components so
 * ConfigSurface (and others) can `import { ... } from "./sections"` unchanged
 * after the split from the former flat sections.tsx into focused modules.
 */
export { BuffsSection } from "./buffs";
export { ClassesSection } from "./classes";
export { AttackBlocksSection, DefenseSection, EnergySection } from "./combat";
export { CharacterActionsSection, IdentitySection } from "./identity";
export { ResourcesSection } from "./resources";
export { RulesSection } from "./rules";
export { SkillsSection } from "./skills";
export { VitalsSection } from "./vitals";
