/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override for the planner's placement model. See src/lib/groq.ts. */
  readonly VITE_GROQ_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
