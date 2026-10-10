// npm run art:check: validate every vehicle, wheel, accessory and brand against the art rules.
// Exits 1 on errors. Warnings are printed but don't fail.
import { loadArtLibrary, validateLibrary } from './library-fs';

const lib = loadArtLibrary();
const results = validateLibrary(lib);
let errors = 0;
for (const { name, report } of results) {
  if (!report.errors.length && !report.warnings.length) {
    console.log(`ok    ${name}`);
    continue;
  }
  for (const e of report.errors) console.log(`ERROR ${name}: ${e}`);
  for (const w of report.warnings) console.log(`warn  ${name}: ${w}`);
  errors += report.errors.length;
}
console.log(`\n${results.length} files checked, ${errors} error(s).`);
process.exit(errors ? 1 : 0);
