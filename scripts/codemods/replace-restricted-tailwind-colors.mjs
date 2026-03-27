/**
 * Replaces slate/zinc/bg-white class fragments targeted by eslint no-restricted-syntax
 * (see eslint.config.js). Run: node scripts/codemods/replace-restricted-tailwind-colors.mjs
 */
import fs from "node:fs";
import path from "node:path";

const roots = ["src/pages", "src/components"];

const REPLACEMENTS = [
  // bg — longest / specific first
  ["hover:bg-zinc-50/50", "hover:bg-muted/50"],
  ["bg-zinc-50/50", "bg-muted/50"],
  ["hover:bg-slate-50/50", "hover:bg-muted/50"],
  ["bg-slate-50/50", "bg-muted/50"],
  ["bg-zinc-900", "bg-foreground"],
  ["bg-slate-900", "bg-foreground"],
  ["hover:bg-slate-800", "hover:bg-foreground/90"],
  ["hover:bg-slate-900", "hover:bg-foreground/90"],
  ["bg-zinc-800/50", "bg-muted/80"],
  ["bg-slate-800", "bg-foreground/90"],
  ["bg-zinc-800", "bg-foreground/90"],
  ["bg-zinc-100", "bg-muted"],
  ["bg-slate-100", "bg-muted"],
  ["hover:bg-zinc-50", "hover:bg-muted/50"],
  ["hover:bg-slate-50", "hover:bg-muted/50"],
  ["bg-zinc-50", "bg-muted/50"],
  ["bg-slate-50", "bg-muted/50"],
  ["bg-white/80", "bg-background/80"],
  ["bg-white", "bg-background"],
  // text
  ["hover:text-slate-900", "hover:text-foreground"],
  ["hover:text-slate-600", "hover:text-foreground-secondary"],
  ["text-zinc-900", "text-foreground"],
  ["text-slate-900", "text-foreground"],
  ["text-zinc-800", "text-foreground"],
  ["text-slate-800", "text-foreground"],
  ["text-zinc-700", "text-foreground-secondary"],
  ["text-slate-700", "text-foreground-secondary"],
  ["text-zinc-600", "text-foreground-secondary"],
  ["text-slate-600", "text-foreground-secondary"],
  ["text-zinc-500", "text-muted-foreground"],
  ["text-slate-500", "text-muted-foreground"],
  ["text-zinc-400", "text-muted-foreground"],
  ["text-slate-400", "text-muted-foreground"],
  ["text-zinc-300", "text-muted-foreground/60"],
  ["text-slate-300", "text-muted-foreground/60"],
  // border
  ["hover:border-slate-300", "hover:border-muted-foreground/40"],
  ["hover:border-slate-200", "hover:border-border"],
  ["border-zinc-700", "border-border"],
  ["border-zinc-100", "border-border"],
  ["border-slate-300", "border-border-medium"],
  ["border-slate-200", "border-border"],
  ["border-slate-100", "border-border"],
  ["border-slate-50", "border-border/60"],
  // divide / ring / placeholder
  ["divide-slate-200", "divide-border"],
  ["divide-slate-100", "divide-border"],
  ["ring-slate-200", "ring-border"],
  ["ring-slate-100", "ring-border"],
  ["placeholder-slate-500", "placeholder-muted-foreground"],
  ["placeholder-slate-400", "placeholder-muted-foreground"],
  // gradients (keep neutral)
  ["from-slate-900", "from-foreground"],
  ["to-slate-900", "to-foreground"],
  ["from-slate-100", "from-muted"],
  ["to-slate-100", "to-muted"],
  ["from-zinc-900", "from-foreground"],
  ["to-zinc-900", "to-foreground"],
  // badge / opacity combos (admin cards)
  ["bg-slate-500/15", "bg-muted-foreground/15"],
  ["border-slate-500/30", "border-muted-foreground/30"],
  ["bg-slate-500", "bg-muted-foreground"],
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

let filesChanged = 0;
for (const root of roots) {
  const abs = path.join(process.cwd(), root);
  for (const file of walk(abs)) {
    let s = fs.readFileSync(file, "utf8");
    const orig = s;
    for (const [a, b] of REPLACEMENTS) {
      if (s.includes(a)) s = s.split(a).join(b);
    }
    if (s !== orig) {
      fs.writeFileSync(file, s);
      filesChanged++;
    }
  }
}

console.log(`Updated ${filesChanged} files.`);
