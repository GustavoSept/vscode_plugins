export function convertFlowbiteImports(text: string): string {
  const importRegex = /^[ \t]*import\s*\{([\s\S]*?)\}\s*from\s*["']flowbite-svelte-icons["'];?/gm;
  return text.replace(importRegex, (match, importsBlock) => {
    const names = importsBlock
      .split(',')
      .map((n: string) => n.trim())
      .filter(Boolean);
    const indentMatch = match.match(/^([ \t]*)import/);
    const indent = indentMatch ? indentMatch[1] : '';
    return names
      .map(
        (name: string) =>
          `${indent}import ${name} from 'flowbite-svelte-icons/${name}.svelte';`
      )
      .join('\n');
  });
}
