
import * as assert from 'assert';
import { convertFlowbiteImports } from '../flowbiteImportConverter';

type TestCase = {
  name: string;
  input: string;
  expected: string;
};

const cases: TestCase[] = [
  {
    name: 'single import',
    input: `import { EyeOutline } from 'flowbite-svelte-icons';`,
    expected: `import EyeOutline from 'flowbite-svelte-icons/EyeOutline.svelte';`,
  },
  {
    name: 'multiple imports same line',
    input: `import { StarOutline, StarSolid } from 'flowbite-svelte-icons';`,
    expected: 
      `import StarOutline from 'flowbite-svelte-icons/StarOutline.svelte';\n` +
      `import StarSolid from 'flowbite-svelte-icons/StarSolid.svelte';`,
  },
  {
    name: 'multi-line block import',
    input: 
      `    import { AdjustmentsHorizontalSolid, ArrowLeftToBracketOutline, AwsSolid,\n` +
      `        BarsOutline, BugOutline, DotsVerticalOutline, EditOutline, TrashBinOutline, UsersOutline } from 'flowbite-svelte-icons';`,
    expected:
      `    import AdjustmentsHorizontalSolid from 'flowbite-svelte-icons/AdjustmentsHorizontalSolid.svelte';\n` +
      `    import ArrowLeftToBracketOutline from 'flowbite-svelte-icons/ArrowLeftToBracketOutline.svelte';\n` +
      `    import AwsSolid from 'flowbite-svelte-icons/AwsSolid.svelte';\n` +
      `    import BarsOutline from 'flowbite-svelte-icons/BarsOutline.svelte';\n` +
      `    import BugOutline from 'flowbite-svelte-icons/BugOutline.svelte';\n` +
      `    import DotsVerticalOutline from 'flowbite-svelte-icons/DotsVerticalOutline.svelte';\n` +
      `    import EditOutline from 'flowbite-svelte-icons/EditOutline.svelte';\n` +
      `    import TrashBinOutline from 'flowbite-svelte-icons/TrashBinOutline.svelte';\n` +
      `    import UsersOutline from 'flowbite-svelte-icons/UsersOutline.svelte';`,
  },
  {
    name: 'mixed other imports',
    input: 
      `import fs from 'fs';\n` +
      `import { EyeOutline } from 'flowbite-svelte-icons';\n` +
      `import path from 'path';`,
    expected:
      `import fs from 'fs';\n` +
      `import EyeOutline from 'flowbite-svelte-icons/EyeOutline.svelte';\n` +
      `import path from 'path';`,
  },
  {
    name: 'already default import',
    input: `import EyeOutline from 'flowbite-svelte-icons/EyeOutline.svelte';`,
    expected: `import EyeOutline from 'flowbite-svelte-icons/EyeOutline.svelte';`,
  },
];

describe('convertFlowbiteImports', () => {
  cases.forEach(({ name, input, expected }) => {
    it(`should handle ${name}`, () => {
      const output = convertFlowbiteImports(input);
      assert.strictEqual(output, expected);
    });
  });
});
