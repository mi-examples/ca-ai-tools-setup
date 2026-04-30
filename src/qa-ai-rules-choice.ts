/**
 * Whether to run `@metricinsights/qa-ai-rules init` in the target repo after file generation.
 */
export function parseQaAiRulesArg(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  const v = value.trim().toLowerCase();

  if (v === 'yes' || v === 'true' || v === '1' || v === 'on') {
    return true;
  }

  if (v === 'none' || v === 'no' || v === 'false' || v === '0' || v === 'off') {
    return false;
  }

  throw new Error(
    `Invalid --qa-ai-rules value "${value}". Use "yes" (or yes/true/1/on) to install QA AI rules, ` +
      `or "no" (or none/false/0/off) to skip.`,
  );
}
