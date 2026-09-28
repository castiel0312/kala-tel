/**
 * The machine used to live here.
 *
 * It is now built in `src/features/map3d/wellModels.ts`, because the map section stands the same
 * pumping unit on terrain and there is no version of this page that should have two of them. The
 * hero and the map both call one `buildRig`/`buildPumpJack` pair over one set of proportions, one
 * palette and one solved linkage — which is the only way the rig in the hero and the rig on the map
 * can be recognisably the same object.
 *
 * This module stays so the hero's mount keeps its import, and so the move is one line in the diff
 * rather than a rename across the landing page.
 */
export { buildRig, rigMaterials, STROKE_SECONDS, linkageAt } from '../../features/map3d/wellModels'
export type { Linkage, RigMaterials, RigPalette, RigUnit, Vec2 } from '../../features/map3d/wellModels'
