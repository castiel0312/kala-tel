`WellRiskPanel` loads and downsamples a well's trajectory, event, and paged timeseries data, then presents an interactive risk profile by measured depth; the presentational `WellRiskGauge` accepts a precomputed profile. Import either from this folder's `index.ts`. Risk scores are heuristic decision support, not a validated safety system.

```tsx
import { WellRiskPanel } from "./components/well-risk";

<WellRiskPanel wellId={wellId} />
```
