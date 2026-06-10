// Security WEB-02 helper: compute the CSP sha256 hash of the inline no-flash
// theme script in index.html, so script-src can allow-list it without a nonce
// (a <meta> CSP cannot use nonces). Run `npm run csp:hash` after editing the
// inline script and paste the printed value into the script-src directive.
//
// It strips HTML comments first so the CSP comment (which references script
// tags in prose) is never mistaken for the real inline script.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(here, "..", "index.html");
const html = readFileSync(htmlPath, "utf8");

// Remove comments, then grab the first <script>…</script> with no attributes
// (the inline theme script — module/src scripts carry attributes).
const noComments = html.replace(/<!--[\s\S]*?-->/g, "");
const open = "<script>";
const close = "</" + "script>"; // split literal to avoid a stray closing tag
const start = noComments.indexOf(open);
const end = noComments.indexOf(close, start);
if (start === -1 || end === -1) {
  console.error("Could not locate the inline <script> block in index.html");
  process.exit(1);
}
// IMPORTANT: the browser's CSP hash is computed over the script's text content
// as the HTML parser sees it, which normalizes CRLF -> LF. On a Windows checkout
// index.html may have CRLF line endings, so we MUST normalize before hashing or
// the computed hash won't match what the browser enforces.
const body = noComments.slice(start + open.length, end).replace(/\r\n/g, "\n");
const hash = "sha256-" + createHash("sha256").update(body, "utf8").digest("base64");
console.log(hash);
console.log(
  "\nPaste into the script-src directive in index.html as: 'script-src' ... '" +
    hash +
    "'",
);
