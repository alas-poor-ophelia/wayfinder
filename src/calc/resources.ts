/**
 * Resource max-formula evaluation — pure TS, no obsidian imports.
 * A ResourceFormula references one character property (class level,
 * character level, ability score or modifier) and applies
 *   max(minimum, floor(base * multiplier / divisor) + flatBonus).
 * The store recomputes formula pools on every resource sync.
 */

import type {
  AbilityScores,
  FooterFormula,
  ResourceFormula,
} from "../types/character";

export interface ResourceFormulaContext {
  classes: { className: string; level: number }[];
  /** effective ability modifiers (post adjust/drain/damage) */
  mods: AbilityScores;
  /** effective ability scores */
  scores: AbilityScores;
}

function baseValue(formula: ResourceFormula, ctx: ResourceFormulaContext): number {
  switch (formula.source) {
    case "classLevel": {
      const match = (formula.className ?? "").toLowerCase();
      return ctx.classes
        .filter((c) => c.className.toLowerCase().includes(match))
        .reduce((sum, c) => sum + (c.level || 0), 0);
    }
    case "characterLevel":
      return ctx.classes.reduce((sum, c) => sum + (c.level || 0), 0);
    case "abilityMod":
      return ctx.mods[formula.ability ?? "str"] ?? 0;
    case "abilityScore":
      return ctx.scores[formula.ability ?? "str"] ?? 0;
  }
}

export function evaluateResourceFormula(
  formula: ResourceFormula,
  ctx: ResourceFormulaContext
): number {
  const multiplier = formula.multiplier ?? 1;
  const divisor = formula.divisor || 1; // 0 would divide by zero; treat as 1
  const flat = formula.flatBonus ?? 0;
  const minimum = formula.minimum ?? 0;
  const scaled = Math.floor((baseValue(formula, ctx) * multiplier) / divisor) + flat;
  return Math.max(minimum, scaled);
}

/**
 * Compose a live footer string from a FooterFormula, e.g. "3d6 (+6 self)".
 * dice → N via the resource-formula evaluator; dieSize → "NdX"; the
 * parenthetical totals perDieBonus·N + flatBonus, labelled by bonusLabel.
 */
export function evaluateFooterFormula(
  f: FooterFormula,
  ctx: ResourceFormulaContext
): string {
  const n = evaluateResourceFormula(f.dice, ctx);
  const base = f.dieSize ? `${n}d${f.dieSize}` : `${n}`;
  const bonus = (f.perDieBonus ?? 0) * n + (f.flatBonus ?? 0);
  const paren = bonus
    ? ` (${bonus >= 0 ? "+" : ""}${bonus}${f.bonusLabel ? ` ${f.bonusLabel}` : ""})`
    : "";
  const suffix = f.suffix ? ` ${f.suffix}` : "";
  return `${base}${paren}${suffix}`;
}
