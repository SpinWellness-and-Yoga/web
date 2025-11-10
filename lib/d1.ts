// D1Database type from Cloudflare Workers
export type D1Database = {
  prepare: (query: string) => {
    bind: (...args: any[]) => {
      first: () => Promise<any>;
      all: () => Promise<{ results: any[] }>;
      run: () => Promise<void>;
    };
    first: () => Promise<any>;
    all: () => Promise<{ results: any[] }>;
    run: () => Promise<void>;
  };
};

export function getD1Database(request?: Request): D1Database | null {
  // cloudflare workers runtime - env is available in global scope
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    
    // check for env object first (cloudflare workers standard)
    if (g.env) {
      if (g.env.DATABASE) return g.env.DATABASE;
      if (g.env.DB) return g.env.DB;
    }
    
    // direct global access
    if (g.DATABASE) return g.DATABASE;
    if (g.DB) return g.DB;
  }

  // try request context (opennext cloudflare passes env here)
  if (request) {
    const req = request as any;
    
    // check all possible locations
    if (req.env?.DATABASE) return req.env.DATABASE;
    if (req.env?.DB) return req.env.DB;
    
    if (req.ctx?.env?.DATABASE) return req.ctx.env.DATABASE;
    if (req.ctx?.env?.DB) return req.ctx.env.DB;
    
    if (req.cloudflare?.env?.DATABASE) return req.cloudflare.env.DATABASE;
    if (req.cloudflare?.env?.DB) return req.cloudflare.env.DB;
    
    if (req.runtime?.env?.DATABASE) return req.runtime.env.DATABASE;
    if (req.runtime?.env?.DB) return req.runtime.env.DB;
  }

  return null;
}

