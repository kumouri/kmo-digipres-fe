import type { HttpHandler } from "msw";

// Backend handlers are added in phase 2 (auth) and grow per phase as endpoints
// come online. See `.claude/plans/init-kmo-digipres-fe-as-the-declarative-candle.md`
// for the phasing.
export const handlers: HttpHandler[] = [];
