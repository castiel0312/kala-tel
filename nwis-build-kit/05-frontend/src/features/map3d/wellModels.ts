import * as THREE from 'three'
import type { WellModel } from './types'

/* ============================================================================
   The surface machines.

   There is one pumping unit in NWIS and it is built here. The landing page's hero
   drives it with a solved four-bar linkage in its own canvas; this section stands the
   same machine on terrain with deck.gl. Two renderers, one object — so the geometry,
   the materials, the proportions and the kinematics are written once, in this file, and
   both views call the same builder. A demo where the map's pump jack is a different
   machine from the hero's is a demo nobody believes.

   The two paths take different things from it:

   - `buildRig()` gives the hero the whole machine *plus* its contact shadow and hover
     ring, and hands back a `setPhase(theta)` the hero drives from its own clock.
   - `buildPumpJack()` gives the map the machine alone — no shadow, no ring, no per-frame
     JS — and bakes the same motion into a glTF `stroke` clip, so ten wells on a map
     cost one animation, not ten solve loops.

   ## Units and axes

   Metres, Y-up, origin on the ground at the wellhead. The wellhead is at x = 0 and the
   machine reaches *away* from it along +x, so a pumping unit is never symmetrical about
   anything that matters: the beam is three and a half metres one way and four and a half
   the other, and centring the model on its own box would leave the polished rod hanging
   in mid-air a metre to the side of the well.

   ## Colour

   The machine's yellow is the product's yellow. It used to be a second, slightly duller
   yellow used only here; the map needs the rigs to be legible as the same signal as the
   halos, the ring and the labels beside them, and two yellows on adjacent rigs in one
   frame is a thing a field hand notices before they notice anything else.
   ========================================================================== */

/** The signal colour, as the map's layers and the hero's machine now both use it. */
export const SIGNAL_YELLOW = 0xf4c400

/** Station of the beam's fixed pivot, and the machine's overall reach along x. */
const SAMSON: Vec2 = { x: 3.5, y: 6.87 }
/** Samson post to horsehead pivot, along the beam at its neutral angle. */
const ARM = SAMSON.x
/** The horsehead face's radius: the whole of the rod's swing. */
const HORSE_R = 0.85
/**
 * The tail the pitmans drive, from the Samson post to the beam's back end. The tail is the
 * *long* arm on a real unit and it is the long one here: the pitmans hang off it and weigh on
 * it, so the beam's swing is the crank's throw over the tail. A short tail with a long throw
 * swings the horsehead metres off the wellhead and the machine stops reading as a pump jack.
 */
const ROCKER = 4.55
const CRANK_R = 0.62
/** The crankshaft, on the gearbox, under the beam's tail. */
const CRANK: Vec2 = { x: SAMSON.x + ROCKER, y: 1.75 }
/**
 * Pitman length, derived rather than written out: it is whatever length closes the loop with
 * the beam level at theta = 0, which is the neutral the whole machine is laid out around.
 */
const PITMAN = Math.hypot(CRANK.x + CRANK_R - (SAMSON.x + ROCKER), CRANK.y - SAMSON.y)
/** Seconds per stroke — a unit of this size runs at roughly nine cycles a minute. */
export const STROKE_SECONDS = 6.4

/** The name of the one animation the map's pump jacks play. */
export const STROKE_CLIP = 'stroke'

/* ------------------------------------------------------------------ linkage --- */

export interface Vec2 {
  x: number
  y: number
}

/**
 * The linkage, solved for a crank angle.
 *
 * The crank pin is a point on a circle; the beam's attachment is a point on two more circles.
 * Their intersection is the answer, and there are always two of them — the machine runs through
 * the one on the crank pin's own side of the Samson post, which the sign below fixes once and for
 * all rather than hoping a branch is taken consistently.
 */
export interface Linkage {
  /** the crank pin */
  pin: Vec2
  /** where the pitman arms meet the beam */
  rocker: Vec2
  /** unit vector from the Samson post towards the horsehead */
  dir: Vec2
  /**
   * The beam's rotation about the Samson post.
   *
   * Nose-up at neutral, and a couple of degrees short of level at each end of the stroke — but
   * that is a consequence of the four lengths above, not a number written down anywhere. The
   * machine's proportions *are* the linkage: change the pitman and the nose angle changes with
   * it, which is what a real beam does and what a hand-keyed rotation cannot.
   */
  tilt: number
  /** the polished rod's carrier bar, in machine space */
  clamp: Vec2
}

function link(theta: number): Linkage {
  const pin = { x: CRANK.x + CRANK_R * Math.cos(theta), y: CRANK.y + CRANK_R * Math.sin(theta) }
  const dx = pin.x - SAMSON.x
  const dy = pin.y - SAMSON.y
  const reach = Math.hypot(dx, dy)
  /** distance from the Samson post to the common chord, and half of the chord */
  const along = (ROCKER * ROCKER - PITMAN * PITMAN + reach * reach) / (2 * reach)
  const half = Math.sqrt(Math.max(0, ROCKER * ROCKER - along * along))
  const ux = dx / reach
  const uy = dy / reach
  const side = pin.y > SAMSON.y ? -1 : 1
  const rocker = {
    x: SAMSON.x + along * ux - side * half * uy,
    y: SAMSON.y + along * uy + side * half * ux,
  }

  const dir = { x: SAMSON.x - rocker.x, y: SAMSON.y - rocker.y }
  const len = Math.hypot(dir.x, dir.y) || 1
  dir.x /= len
  dir.y /= len

  /** the beam's rotation: positive raises the nose, and the horsehead rides the face's centre */
  const tilt = Math.atan2(-dir.y, -dir.x)
  const horse = { x: SAMSON.x + dir.x * ARM, y: SAMSON.y + dir.y * ARM }
  /**
   * Where the carrier bar hangs: the point on the face's arc that lies on the wellhead's own
   * vertical, x = 0 — the face's circle met by the rod's line, on its lower side.
   *
   * Not the arc's lowest point, which is the obvious thing to reach for and is wrong: as the beam
   * rocks, the lowest point slides sideways, and the rod is one rigid vertical, so the difference
   * shows as the rod walking a hand's width off the wellhead over a stroke. On a real unit the
   * carrier bar is what gives: it rides the face back and forth to keep the rod plumb, and this is
   * the point that does that.
   */
  const across = Math.max(-1, Math.min(1, -horse.x / HORSE_R))
  return {
    pin,
    rocker,
    dir,
    tilt,
    clamp: { x: 0, y: horse.y - HORSE_R * Math.sqrt(1 - across * across) },
  }
}

/**
 * The closed form, sampled once so callers interpolate rather than solve sixty times a second.
 * 720 steps over a full turn is under half a degree apart — far finer than a pixel of a 200 px
 * machine. The table is closed at both ends, so a full turn interpolates back onto its own start.
 */
const SAMPLES = 720
const TURN = Math.PI * 2
const TABLE = Array.from({ length: SAMPLES + 1 }, (_, i) => link((i / SAMPLES) * TURN))

/**
 * The linkage at a crank angle, by interpolation.
 *
 * `theta` is wrapped into a single turn twice over rather than once. The clock driving the machine
 * is a running count of seconds, so it arrives here as a large number and eventually as a very
 * large one; a single `% TURN` leaves a value in (−TURN, 2π], which puts the sample index up to
 * `2 × SAMPLES` and off the end of the table.
 */
export function linkageAt(theta: number): Linkage {
  const t = ((((theta % TURN) + TURN) % TURN) as number) / TURN
  const f = t * SAMPLES
  const i = Math.floor(f)
  const k = f - i
  const a = TABLE[i] as Linkage
  const b = TABLE[i + 1] as Linkage
  return {
    pin: { x: a.pin.x + (b.pin.x - a.pin.x) * k, y: a.pin.y + (b.pin.y - a.pin.y) * k },
    rocker: { x: a.rocker.x + (b.rocker.x - a.rocker.x) * k, y: a.rocker.y + (b.rocker.y - a.rocker.y) * k },
    dir: { x: a.dir.x + (b.dir.x - a.dir.x) * k, y: a.dir.y + (b.dir.y - a.dir.y) * k },
    tilt: a.tilt + (b.tilt - a.tilt) * k,
    clamp: { x: a.clamp.x + (b.clamp.x - a.clamp.x) * k, y: a.clamp.y + (b.clamp.y - a.clamp.y) * k },
  }
}

/* ----------------------------------------------------------------- materials --- */

export interface RigMaterials {
  /** Samson post, walking beam, skid: the machine's painted steel. */
  structure: THREE.MeshStandardMaterial
  /** Gearbox, crank arms, the beam's web: the darker machined steel. */
  machine: THREE.MeshStandardMaterial
  /** Counterweights, belt guard, wiper: the parts that weather. */
  rust: THREE.MeshStandardMaterial
  /** The signal yellow. The horsehead's lip and the master valve's handwheel. */
  paint: THREE.MeshStandardMaterial
  /** The polished rod. */
  rod: THREE.MeshStandardMaterial
  /**
   * The flowline: the two runs leaving the tree and the block they end in.
   *
   * Split from `rust` because the hero wants the counterweights in signal yellow, and while they
   * shared a material the flowline would have gone yellow with them — a bright yellow pipe is the
   * one thing in the machine that would have read as a second signal. The default is the colour
   * the flowline already had, so the map rig is untouched by the split.
   */
  flowline: THREE.MeshStandardMaterial
  /**
   * The christmas tree's own stack — the casing head, tubing head, master valve and stuffing box.
   *
   * This is a separate material because the hero needs the wellhead to be a different *value* from
   * the beam it stands under: against a `#1E2021` Samson post, a tree in the same value is a
   * column of black on black and the wellhead — the one part of the machine that says where the
   * oil comes from — disappears into the post behind it. The map rig gets the same mid-grey the
   * tree already was, so its silhouette is unchanged.
   */
  wellhead: THREE.MeshStandardMaterial
  /** Everything is disposed together, because they are created together. */
  dispose(): void
}

/**
 * The five values a caller may override, plus the tree's own.
 *
 * The map passes nothing and is unaffected; the hero passes `MACHINE` from its palette. This is a
 * recolour seam, not a theming system: it exists because the same model is drawn twice at once, in
 * two places with two jobs, and a shared `0x6e746f` cannot be both a dusk silhouette and the black
 * of a line drawing.
 */
export interface RigPalette {
  structure?: number
  machine?: number
  rust?: number
  paint?: number
  rod?: number
  wellhead?: number
  flowline?: number
  /**
   * The two values the hover runs between on the gearbox: `[atRest, hovered]`.
   *
   * This is not a nicety. `setHover` writes `machine.color` on every call rather than nudging it, so
   * whatever pair it holds *is* the machine's colour — a palette that recolours the material and
   * leaves this alone would be undone the moment the pointer came near the rig, and would stay
   * undone while it did. Defaults are the dusk pair, so the map is unaffected.
   */
  hover?: [number, number]
}

/**
 * Fine speckle, so a plate two hundred pixels wide is not one flat value.
 *
 * Only the hero asks for it. A map rig is 26–64 px tall on satellite imagery, where a 128 px
 * roughness map repeated across a ten-metre machine is a texture the GPU has to sample and the
 * eye cannot resolve — and `document.createElement('canvas')` at model-build time is work the
 * map has no reason to make. The colours are identical either way.
 */
function grain(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#b0b0b0'
    ctx.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 2400; i++) {
      const v = 148 + Math.random() * 92
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 1.3, 1.3)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 3)
  return t
}

/**
 * The machine's steel.
 *
 * These are lighter than a machine on its own terms would be. The machine is silhouetted against
 * a dusk sky in the hero, and against muted satellite imagery on the map, and what has to survive
 * both is the *gap* between it and the background: at a quarter of the machine's pixels at
 * luminance 8 it was reading as a hole in the picture rather than as a machine. So the base value
 * is raised and the metalness dropped, because a metal that is nearly half metallic has almost no
 * diffuse term to be lifted and so goes black wherever the key does not hit it square on.
 */
export function rigMaterials(grained = false, palette: RigPalette = {}): RigMaterials {
  const map = grained ? grain() : null
  const structure = new THREE.MeshStandardMaterial({ color: palette.structure ?? 0x6e746f, roughness: 0.74, metalness: 0.22, roughnessMap: map })
  const machine = new THREE.MeshStandardMaterial({ color: palette.machine ?? 0x555b59, roughness: 0.6, metalness: 0.3, roughnessMap: map })
  const rust = new THREE.MeshStandardMaterial({ color: palette.rust ?? 0x7d5942, roughness: 0.95, metalness: 0.08, roughnessMap: map })
  const paint = new THREE.MeshStandardMaterial({ color: palette.paint ?? SIGNAL_YELLOW, roughness: 0.56, metalness: 0.16 })
  const rod = new THREE.MeshStandardMaterial({ color: palette.rod ?? 0xacb0b2, roughness: 0.32, metalness: 0.8 })
  const wellhead = new THREE.MeshStandardMaterial({ color: palette.wellhead ?? 0x555b59, roughness: 0.66, metalness: 0.26, roughnessMap: map })
  const flowline = new THREE.MeshStandardMaterial({ color: palette.flowline ?? 0x7d5942, roughness: 0.95, metalness: 0.08, roughnessMap: map })
  return {
    structure,
    machine,
    rust,
    paint,
    rod,
    wellhead,
    flowline,
    dispose() {
      map?.dispose()
      for (const m of [structure, machine, rust, paint, rod, wellhead, flowline]) m.dispose()
    },
  }
}

/* ------------------------------------------------------------------- builders --- */

/** the axes, as three's component indices, so a swept corner can be offset by axis name */
const AXIS = { x: 0, y: 1, z: 2 } as const
type AxisName = keyof typeof AXIS
const AXES: readonly AxisName[] = ['x', 'y', 'z']

/**
 * A rectangular member swept along one axis through a list of stations.
 *
 * One primitive builds the tapered walking beam, the Samson post legs, the skid, the crank arms,
 * the derrick's legs and bracing, and the wellhead's stack, which is why the whole yard can be
 * re-proportioned by editing a number rather than by re-modelling. `h` is the half-extent on each
 * of the two axes the sweep does not run along, taken in (x, y, z) order.
 */
function sweep(
  axis: AxisName,
  stations: { p: [number, number, number]; h: [number, number] }[],
): THREE.BufferGeometry {
  const pos: number[] = []
  const idx: number[] = []
  const cross = AXES.filter((v) => v !== axis)
  const ia = AXIS[cross[0] as AxisName]
  const ib = AXIS[cross[1] as AxisName]
  /** corners in one winding order: (−a−b) (−a+b) (+a+b) (+a−b) around the cross-section */
  const corner = (st: { p: [number, number, number]; h: [number, number] }, k: number): THREE.Vector3 => {
    const c = new THREE.Vector3(st.p[0], st.p[1], st.p[2])
    c.setComponent(ia, c.getComponent(ia) + (k === 0 || k === 3 ? -1 : 1) * st.h[0])
    c.setComponent(ib, c.getComponent(ib) + (k === 0 || k === 1 ? -1 : 1) * st.h[1])
    return c
  }
  for (const st of stations) {
    for (let k = 0; k < 4; k++) {
      const c = corner(st, k)
      pos.push(c.x, c.y, c.z)
    }
  }
  for (let s = 0; s < stations.length - 1; s++) {
    const a = s * 4
    const b = (s + 1) * 4
    for (let k = 0; k < 4; k++) {
      const j = (k + 1) % 4
      idx.push(a + k, b + k, b + j, a + k, b + j, a + j)
    }
  }
  idx.push(0, 1, 2, 0, 2, 3)
  const last = (stations.length - 1) * 4
  idx.push(last, last + 2, last + 1, last, last + 3, last + 2)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/**
 * A box from its **half**-extents, which is what the pumping unit above is written in.
 *
 * Every one of that machine's numbers was tuned by eye against a canvas, so they stay as they are
 * and the convention is this function's.
 */
function box(h: [number, number, number], mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(h[0] * 2, h[1] * 2, h[2] * 2), mat)
}

/**
 * A box from its **full** size, on a ground plane at y = 0, standing `y` tall.
 *
 * The two newer models are written in this because their numbers are structural rather than
 * eyeballed — a derrick's substructure is 7.2 m across, a marker post is 1.2 m tall — and half of
 * them read as half-extents by mistake, which silently doubles a machine and sinks half of it
 * below the terrain. Naming the convention in the call is cheaper than a comment on every number.
 */
function boxFull(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
}

/** `boxFull`, placed by its base, so a machine stands *on* the ground rather than through it. */
function standing(w: number, h: number, d: number, x: number, z: number, mat: THREE.Material): THREE.Mesh {
  return at(boxFull(w, h, d, mat), [x, h / 2, z])
}

function at<T extends THREE.Object3D>(node: T, p: [number, number, number]): T {
  node.position.set(p[0], p[1], p[2])
  return node
}

/** A round member between two points — a pipe, a rod, a stem. */
function round(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 10): THREE.Mesh {
  const len = a.distanceTo(b)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Math.max(0.001, len), seg, 1), mat)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
  return mesh
}

/** A flat member between two points — a brace, a gusset, a handwheel stem. */
function flat(a: THREE.Vector3, b: THREE.Vector3, w: number, t: number, mat: THREE.Material): THREE.Mesh {
  const len = a.distanceTo(b)
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, t, w), mat)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), b.clone().sub(a).normalize())
  return mesh
}

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z)

/** The annular sector the horsehead's face is cut to. */
function arcPlate(r0: number, r1: number, a0: number, a1: number, depth: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, r1, a0, a1, false)
  shape.absarc(0, 0, r0, a1, a0, true)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 })
  geo.translate(0, 0, -depth / 2)
  return new THREE.Mesh(geo, mat)
}

function ring(r: number, tube: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 20), mat)
}

/* ----------------------------------------------------------------- the machine --- */

/** The parts of the pumping unit that move, by the name the glTF animation addresses them by. */
export interface PumpJackFrame {
  root: THREE.Group
  /** The walking beam, on the Samson post's bearing. Rotates about Z. */
  beam: THREE.Group
  /** Crankshaft, crank arms and counterweights. Rotates about Z, in sync with the beam. */
  crank: THREE.Group
  /** The two pitman arms, from the crank pin to the beam's tail. */
  pitmans: THREE.Mesh[]
  /** The rod's carrier bar, riding the horsehead's face. */
  carrier: THREE.Group
  /** The polished rod, sliding through the stuffing box. */
  rod: THREE.Mesh
  /** Puts the whole linkage at a crank angle. The only place the kinematics are applied. */
  set(theta: number): void
  dispose(): void
}

/**
 * The machine, and nothing else.
 *
 * Every member of a pumping unit is a swept box, so the skid, the Samson post, the beam, the crank
 * and the christmas tree are all the same primitive at different scales. The nodes that move are
 * *named*, because a glTF animation addresses its tracks by node name and an unnamed crank is a
 * crank the animator cannot find.
 */
export function pumpJackFrame(materials: RigMaterials): PumpJackFrame {
  const { structure, machine: steel, rust, paint, rod: rodMat, wellhead, flowline } = materials
  const root = new THREE.Group()
  const garbage: { dispose(): void }[] = []

  const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = root): T => {
    parent.add(node)
    node.traverse((n) => {
      const m = n as THREE.Mesh
      if (m.isMesh) garbage.push(m.geometry)
    })
    return node
  }

  /* ---- the skid ---------------------------------------------------------- */

  for (const z of [-0.62, 0.62]) {
    add(
      new THREE.Mesh(
        sweep('x', [
          { p: [SAMSON.x - 0.6, 0.14, z], h: [0.1, 0.09] },
          { p: [CRANK.x + 1.7, 0.14, z], h: [0.1, 0.09] },
        ]),
        structure,
      ),
    )
  }
  for (const x of [SAMSON.x - 0.4, 4.4, 5.9, 7.4, 8.9, CRANK.x + 1.45]) add(at(box([0.08, 0.05, 0.62], structure), [x, 0.16, 0]))
  /** the plinth the Samson post is bolted to, and the pad the tree is set on */
  add(at(box([0.92, 0.22, 0.4], steel), [SAMSON.x, 0.25, 0]))
  add(at(box([0.8, 0.06, 0.92], structure), [-0.78, 0.07, 0]))
  add(at(box([0.8, 0.05, 0.4], rust), [0.85, 0.06, 0]))

  /* ---- the Samson post --------------------------------------------------- */

  for (const z of [-0.44, 0.44]) {
    add(
      new THREE.Mesh(
        sweep('y', [
          { p: [SAMSON.x, 0.5, z], h: [0.18, 0.08] },
          { p: [SAMSON.x, 3.4, z], h: [0.15, 0.07] },
          { p: [SAMSON.x, 6.45, z], h: [0.13, 0.07] },
        ]),
        structure,
      ),
    )
  }
  for (const y of [1.35, 3.2, 5.0]) add(at(box([0.07, 0.06, 0.44], structure), [SAMSON.x, y, 0]))
  for (const s of [1, -1]) {
    add(flat(V(SAMSON.x, 2.4, 0.44 * s), V(SAMSON.x, 4.4, 0.44 * s), 0.1, 0.05, structure))
  }
  /** the bearing the beam turns in */
  add(at(box([0.19, 0.16, 0.44], steel), [SAMSON.x, SAMSON.y, 0]))
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.96, 12).rotateX(Math.PI / 2), steel), [SAMSON.x, SAMSON.y, 0]))

  /* ---- the gearbox, the crank and the counterbalance --------------------- */

  add(at(box([0.7, 0.48, 0.42], steel), [CRANK.x, 0.92, 0]))
  /** the prime mover and its belt guard: the surface equipment that turns the crank. The motor
      housing is the yellow panel the brief names, and the guard beside it is the counterweight's
      own yellow, so the drive end of the machine carries the colour rather than just the head. */
  add(at(box([0.48, 0.32, 0.34], rust), [CRANK.x + 1.3, 0.64, 0]))
  add(at(box([0.6, 0.32, 0.22], rust), [CRANK.x + 0.6, 1.06, 0]))
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.09, 16).rotateX(Math.PI / 2), paint), [CRANK.x + 1.3, 0.64, 0.38]))

  const crank = add(new THREE.Group(), root)
  crank.name = 'crank'
  crank.position.set(CRANK.x, CRANK.y, 0)
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.2, 12).rotateX(Math.PI / 2), steel), [0, 0, 0]), crank)
  for (const z of [-0.36, 0.36]) {
    add(
      new THREE.Mesh(
        sweep('x', [
          { p: [0, 0, z], h: [0.13, 0.055] },
          { p: [CRANK_R - 0.1, 0, z], h: [0.15, 0.045] },
        ]),
        steel,
      ),
      crank,
    )
    /** the balance weight, opposite the pin — the reason the machine is called balanced */
    add(
      new THREE.Mesh(
        sweep('x', [
          { p: [-(CRANK_R + 0.34), 0, z], h: [0.28, 0.085] },
          { p: [-0.18, 0, z], h: [0.24, 0.06] },
        ]),
        rust,
      ),
      crank,
    )
  }
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.86, 10).rotateX(Math.PI / 2), steel), [CRANK_R, 0, 0]), crank)

  /* ---- the walking beam -------------------------------------------------- */

  const beam = add(new THREE.Group(), root)
  beam.name = 'beam'
  beam.position.set(SAMSON.x, SAMSON.y, 0)
  add(
    new THREE.Mesh(
      sweep('x', [
        { p: [-ARM, 0, 0], h: [0.13, 0.1] },
        { p: [-4.4, 0, 0], h: [0.19, 0.12] },
        { p: [-2.2, 0, 0], h: [0.24, 0.14] },
        { p: [0, 0, 0], h: [0.27, 0.15] },
        { p: [ROCKER, 0, 0], h: [0.21, 0.13] },
        { p: [2.35, 0, 0], h: [0.15, 0.1] },
        { p: [2.45, 0, 0], h: [0.13, 0.1] },
      ]),
      structure,
    ),
    beam,
  )
  /** the web, a shade darker, so the beam reads as an I and not a slab */
  add(at(box([2.1, 0.15, 0.012], steel), [-2.4, 0, 0.138]), beam)
  add(at(box([2.1, 0.15, 0.012], steel), [-2.4, 0, -0.138]), beam)
  add(at(box([0.1, 0.12, 0.24], steel), [ROCKER, 0, 0]), beam)
  /** the horsehead's pivot, the gussets that carry its face, and the face itself */
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 12).rotateX(Math.PI / 2), steel), [-ARM, 0, 0]), beam)
  add(flat(V(-ARM + 0.1, 0.06, 0), V(-ARM + 0.72, 0.2, 0), 0.24, 0.1, structure), beam)
  add(flat(V(-ARM + 0.1, -0.06, 0), V(-ARM + 0.72, -0.16, 0), 0.24, 0.1, structure), beam)
  /**
   * The horsehead is the machine's one large painted panel, and §3 asks for it in the signal yellow.
   *
   * It used to be `structure`, which is a grey that only ever read as a silhouette against a dusk
   * sky. On white that grey is the same value as everything else on the unit, and a yellow band on a
   * grey horsehead — which is what the old `paint` lip was — is an accent on a part the eye has not
   * registered yet. Painting the whole arc and inverting the lip instead is what makes the figure
   * read as a pumping unit in one colour decision rather than in three.
   */
  const face = add(arcPlate(HORSE_R, HORSE_R + 0.24, THREE.MathUtils.degToRad(196), THREE.MathUtils.degToRad(344), 0.2, paint), beam)
  face.position.set(-ARM, 0, 0)
  /** the lip, now the dark accent segment on the yellow panel rather than the yellow on a grey one */
  const lip = add(arcPlate(HORSE_R - 0.03, HORSE_R + 0.07, THREE.MathUtils.degToRad(252), THREE.MathUtils.degToRad(288), 0.24, steel), beam)
  lip.position.set(-ARM, 0, 0)

  /* ---- the pitman arms --------------------------------------------------- */

  const pitmans = Array.from({ length: 2 }, (_, i) => {
    const arm = add(round(V(0, 0, 0), V(0, 1, 0), 0.05, steel))
    arm.name = `pitman${i}`
    return arm
  })

  /* ---- the polished rod and its carrier bar ------------------------------ */

  const carrier = add(new THREE.Group())
  carrier.name = 'carrier'
  add(at(box([0.07, 0.7, 0.05], steel), [0, -0.72, 0]), carrier)
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 12).rotateZ(Math.PI / 2), steel), [0, -0.06, 0]), carrier)
  add(at(box([0.09, 0.08, 0.08], steel), [0, -1.42, 0]), carrier)
  /** one rigid rod, sliding through the stuffing box; only the part above ground is drawn */
  const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 1, 8), rodMat))
  rod.name = 'rod'

  /* ---- the christmas tree ------------------------------------------------ */

  const tree = add(new THREE.Group())
  const stack = (r0: number, r1: number, len: number, y: number, mat: THREE.Material, seg = 14): THREE.Mesh =>
    add(at(new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, seg), mat), [0, y, 0]), tree)
  stack(0.4, 0.4, 0.06, 0.05, wellhead)
  stack(0.3, 0.32, 0.5, 0.33, wellhead) // casing head
  stack(0.35, 0.35, 0.05, 0.56, wellhead) // tubing flange
  stack(0.26, 0.27, 0.42, 0.78, wellhead) // tubing head
  stack(0.3, 0.3, 0.36, 1.17, wellhead) // master valve
  stack(0.22, 0.22, 0.3, 1.5, wellhead) // swab tee
  stack(0.13, 0.15, 0.34, 1.8, wellhead) // stuffing box
  stack(0.19, 0.19, 0.05, 1.95, rust) // wiper
  /** the master valve's handwheel: the one piece of signal yellow on the machine */
  add(at(ring(0.18, 0.026, paint), [0, 1.17, 0.4]), tree)
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.28, 8).rotateX(Math.PI / 2), steel), [0, 1.17, 0.28]), tree)
  for (const sx of [-1, 1]) {
    add(round(V(sx * 0.16, 1.5, 0), V(sx * 0.6, 1.5, 0), 0.095, wellhead), tree)
    add(at(ring(0.11, 0.02, paint), [sx * 0.62, 1.65, 0]), tree)
    add(round(V(sx * 0.28, 0.33, 0), V(sx * 0.7, 0.33, 0), 0.085, wellhead), tree)
  }
  /** the flowline: where the well's production actually leaves the tree */
  add(round(V(0.7, 0.33, 0.26), V(3.1, 0.33, 0.26), 0.07, flowline), tree)
  add(round(V(3.1, 0.33, 0.26), V(3.1, 0.33, -0.85), 0.07, flowline), tree)
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8).rotateX(Math.PI / 2), flowline), [2.2, 0.45, 0.26]), tree)
  add(at(ring(0.12, 0.019, paint), [2.2, 0.56, 0.26]), tree)
  add(at(box([0.32, 0.19, 0.26], flowline), [3.35, 0.2, -0.9]), tree)

  /* ---- the linkage, driven ---------------------------------------------- */

  const set = (theta: number) => {
    const l = linkageAt(theta)
    beam.rotation.z = l.tilt
    crank.rotation.z = theta
    for (let i = 0; i < 2; i++) {
      const z = i === 0 ? -0.16 : 0.16
      const a = V(l.pin.x, l.pin.y, z)
      const b = V(l.rocker.x, l.rocker.y, z)
      const arm = pitmans[i]!
      arm.position.copy(a).add(b).multiplyScalar(0.5)
      arm.scale.set(1, a.distanceTo(b), 1)
      arm.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize())
    }
    /** the carrier bar rides the face and stays vertical under its own weight */
    carrier.position.set(l.clamp.x, l.clamp.y, 0)
    const top = l.clamp.y - 1.5
    rod.scale.set(1, Math.max(0.05, top - 0.03), 1)
    rod.position.set(l.clamp.x, (top + 0.03) / 2, 0)
  }

  set(0)

  return {
    root,
    beam,
    crank,
    pitmans,
    carrier,
    rod,
    set,
    dispose() {
      for (const item of garbage) item.dispose()
    },
  }
}

/**
 * The whole machine, as the hero's canvas drives it: the frame, the contact shadow it stands in,
 * and the ring the wellhead answers with on hover.
 */
export interface RigUnit {
  root: THREE.Group
  /**
   * The machine's own extent, measured from the machine and nothing else.
   *
   * The stage places this rig by its box, as it places a licensed model by its box, so that the
   * ground line and the share of the frame the machine gets are properties of the machine rather
   * than of a frame someone measured once. It is deliberately taken from the machine alone: the
   * contact shadow underneath is 13 m wide and the hover ring is 3 m across, and a box that
   * included them would put the machine a metre and a half out of its own centre.
   */
  box: THREE.Box3
  setPhase(theta: number): void
  /** 0 → resting, 1 → hovered: the wellhead answers and the machine's metal warms */
  setHover(t: number): void
  dispose(): void
}

/**
 * The hero's machine, as a whole: frame, contact shadow and the wellhead's hover ring.
 *
 * `palette` is the recolour seam. The map calls `buildPumpJack`, which passes nothing, so the map's
 * rig keeps the colours it has always had; the hero passes the black-and-yellow line-drawing values
 * from its own palette. No geometry is touched by either.
 */
export function buildRig(palette?: RigPalette): RigUnit {
  const materials = rigMaterials(true, palette)
  const { machine } = materials
  const frame = pumpJackFrame(materials)
  const root = new THREE.Group()
  /** the machine proper, kept apart from the light it stands in so the box stays honest */
  root.add(frame.root)
  const garbage: { dispose(): void }[] = []

  /* ---- the ground it stands in ------------------------------------------ */

  const shadowTex = (() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 256
    const ctx = c.getContext('2d')
    if (ctx) {
      /* The machine's contact shadow, and the only new mark §2 permits. It is not added here: the
         model has always carried one, and the recolour gives it the new stage to sit on. On a dark
         ground a 0.32 peak was the difference between a machine standing on something and a machine
         pasted onto it; on white the same 0.32 grey reads as a dirty smudge, and the shadow's whole
         job now is to say where the skid touches, so it is a tenth of a stop and nothing more. */
      const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 122)
      g.addColorStop(0, 'rgba(8,9,9,0.10)')
      g.addColorStop(0.42, 'rgba(8,9,9,0.05)')
      g.addColorStop(1, 'rgba(8,9,9,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 256, 256)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })()
  garbage.push(shadowTex)
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(13.5, 6.2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.set(2.5, 0.014, 0.5)
  shadow.renderOrder = -2
  root.add(shadow)
  garbage.push(shadow.geometry)

  /** the ring the wellhead answers with on hover, kept off the machine's own materials */
  const glowMat = new THREE.MeshBasicMaterial({ color: SIGNAL_YELLOW, transparent: true, opacity: 0, depthWrite: false })
  garbage.push(glowMat)
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.5, 32), glowMat)
  glow.rotation.x = -Math.PI / 2
  glow.position.set(0, 0.024, 0)
  glow.renderOrder = -1
  root.add(glow)
  garbage.push(glow.geometry)

  const [baseHex, hotHex] = palette?.hover ?? [0x2d3131, 0x3a4040]
  const machineBase = new THREE.Color(baseHex)
  const machineHot = new THREE.Color(hotHex)

  /**
   * The box the mount places by, taken as a union over a whole stroke rather than a snapshot at
   * theta = 0. The rocker walks the beam's tail up and down, so a phase near the top of the stroke
   * stands the tail and the horsehead higher than theta = 0 does, and placing by a single phase
   * lets the machine's crown poke through the headroom it was given.
   */
  const bounds = new THREE.Box3()
  for (let i = 0; i <= 8; i += 1) {
    frame.set((i / 8) * TURN)
    bounds.union(new THREE.Box3().setFromObject(frame.root))
  }
  frame.set(0)

  return {
    root,
    box: bounds,
    setPhase: frame.set,
    setHover(t: number) {
      glowMat.opacity = t * 0.32
      const s = 1 + t * 0.12
      glow.scale.set(s, s, 1)
      machine.color.copy(machineBase).lerp(machineHot, t * 0.5)
    },
    dispose() {
      for (const item of garbage) item.dispose()
      frame.dispose()
      materials.dispose()
      root.clear()
    },
  }
}

/* -------------------------------------------------------------------- the map --- */

/**
 * How tall each machine is, in metres, which is what the label heights and the screen-space
 * sizing are both computed from.
 *
 * These are the models as built above, not round numbers: the derrick's is its `H`, the pumping
 * unit's is the crown of the beam at the top of its stroke. A map label is placed
 * `height × sizeScale` above the ground, so a guess here is a label floating above a rig, and
 * `probe-map3d.mjs` measures the exported GLBs and fails if either drifts from this table.
 */
const MODEL_HEIGHT_M: Record<WellModel, number> = {
  pumpjack: 7.3,
  derrick: 10.2,
  wellhead: 2.1,
}

/** The pumping unit's own height, which is the unit the section's sizing maths is written in. */
export const RIG_HEIGHT_M = MODEL_HEIGHT_M.pumpjack

/**
 * The height of each model, for placing a well's label above its rig.
 *
 * A label is put `MODEL_HEIGHT_M[model] × sizeScale` above the ground, so a wrong entry here is a
 * label either floating over a derrick or buried in its crown. `retainWellModels()` measures every
 * model off its own bounding box and `verify-models.mjs` fails if this table and that measurement
 * disagree — so the numbers cannot drift away from the geometry as the machines are edited.
 */
export { MODEL_HEIGHT_M }

/**
 * One built model: its scenegraph, the clips it plays, and how to let go of it.
 *
 * The dispose is returned rather than hung off `userData` so the lifetime is part of the type. A
 * GLB exporter reads `userData` for its own reasons, and a teardown function sharing that bag with
 * a mechanism is a teardown function somebody will eventually trip over.
 */
export interface BuiltModel {
  group: THREE.Group
  clips: THREE.AnimationClip[]
  dispose(): void
}

/** Every geometry and material a builder made, so the builder can hand back one teardown. */
class Yard {
  readonly geometries: THREE.BufferGeometry[] = []
  readonly materials: THREE.Material[] = []
  readonly textures: THREE.Texture[] = []

  track(object: THREE.Object3D): void {
    object.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return
      this.geometries.push(mesh.geometry)
      const material = mesh.material
      for (const m of Array.isArray(material) ? material : [material]) {
        if (m && !this.materials.includes(m)) this.materials.push(m)
      }
    })
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose()
    for (const m of this.materials) m.dispose()
    for (const t of this.textures) t.dispose()
  }
}

/**
 * The pump jack, as the map wants it: the machine alone, posed at rest, with its motion baked
 * into a glTF clip.
 *
 * No contact shadow and no hover ring. Both are the hero's own lighting effects — a shadow disc on
 * terrain the map has no light model for, and a ring on a machine that is one of ten.
 */
export function buildPumpJack(): BuiltModel {
  const materials = rigMaterials(false)
  const frame = pumpJackFrame(materials)
  const clips = strokeClips(frame)
  const group = new THREE.Group()
  group.name = 'pumpjack'
  group.add(frame.root)
  const yard = new Yard()
  yard.track(group)
  return {
    group,
    clips,
    dispose() {
      frame.dispose()
      yard.dispose()
      materials.dispose()
    },
  }
}

/**
 * The drilling rig: a four-leg lattice mast, a crown block, a substructure and a doghouse.
 *
 * This is the machine over the well that is being drilled, and it is the reason the section decides
 * its models by status rather than drawing a pump jack everywhere. A beam rocking over the hole
 * OIL-WELL-104 is in would say the well is on production when the bit is 156 m of dog-leg above
 * TD — the single most consequential thing this page could get wrong.
 *
 * About 1.4× the pumping unit's height at the same scale, so the family reads as one yard. The
 * lattice is real lattice: four battered legs, horizontal frames at each stage and a diagonal in
 * every bay, which is what makes it read as a derrick rather than as four sticks.
 */
export function buildDerrick(): BuiltModel {
  const structure = new THREE.MeshStandardMaterial({ color: 0xd4d6d1, roughness: 0.68, metalness: 0.24 })
  const sub = new THREE.MeshStandardMaterial({ color: 0x242625, roughness: 0.86, metalness: 0.1 })
  const doghouse = new THREE.MeshStandardMaterial({ color: 0x454845, roughness: 0.82, metalness: 0.12 })
  const paint = new THREE.MeshStandardMaterial({ color: SIGNAL_YELLOW, roughness: 0.56, metalness: 0.16 })

  const group = new THREE.Group()
  group.name = 'derrick'
  const yard = new Yard()
  const add = (mesh: THREE.Mesh): THREE.Mesh => {
    group.add(mesh)
    return mesh
  }

  /* ---- the substructure, the floor the mast is set on -------------------- */

  standing(7.2, 1.8, 7.2, 0, 0, sub)
  standing(4.4, 0.7, 4.4, 0, 0, sub)
  /** the rathole the drill string comes out of, under the travelling block */
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 12), sub), [0, 1.9, 0]))

  /* ---- the mast: four battered legs, braced -------------------------------- */

  const H = 10.2
  const BASE = 1.85
  const TOP = 0.42
  const STAGES = 5
  const FOOT = 1.2
  /** the square's half-width at height fraction `t`: the legs are battered, not parallel */
  const halfAt = (t: number) => BASE + (TOP - BASE) * t
  /** a leg corner, as a signed pair */
  const corner = (c: number, t: number, y: number): THREE.Vector3 => {
    const a = (c / 4) * Math.PI * 2 + Math.PI / 4
    return V(Math.cos(a) * halfAt(t), y, Math.sin(a) * halfAt(t))
  }

  for (let c = 0; c < 4; c += 1) {
    add(
      new THREE.Mesh(
        sweep('y', [
          { p: [corner(c, 0, FOOT).x, FOOT, corner(c, 0, FOOT).z], h: [0.11, 0.11] },
          { p: [corner(c, 1, H).x, H, corner(c, 1, H).z], h: [0.085, 0.085] },
        ]),
        structure,
      ),
    )
  }

  for (let s = 0; s <= STAGES; s += 1) {
    const t = s / STAGES
    const y = FOOT + (H - FOOT) * t
    /**
     * The horizontal frame at each stage: one member per face of the square, each joining two
     * legs. This is the member a `sweep` cannot make — it runs *around* the square rather than
     * along one axis — so it is the straight bar between two points, which is `flat`.
     */
    for (let c = 0; c < 4; c += 1) {
      add(flat(corner(c, t, y), corner(c + 1, t, y), 0.1, 0.1, structure))
    }
    if (s === STAGES) continue
    const t2 = (s + 1) / STAGES
    const y2 = FOOT + (H - FOOT) * t2
    /**
     * And a diagonal in every bay, alternating which way round it runs from stage to stage so
     * the pattern zig-zags. A mast braced the same way in every bay is a crate; the zig-zag is
     * what a derrick looks like from a kilometre away.
     */
    for (let c = 0; c < 4; c += 1) {
      const flip = (s + c) % 2 === 0
      add(flat(corner(flip ? c : c + 1, t, y), corner(flip ? c + 1 : c, t2, y2), 0.07, 0.07, structure))
    }
  }

  /* ---- the crown block, and the doghouse ---------------------------------- */

  /** the travelling block, hung on the masthead sheaves, with its drilling line */
  add(at(boxFull(1.15, 0.42, 0.34, paint), [0, H - 0.55, 0]))
  for (const s of [-1, 1]) {
    add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 14).rotateZ(Math.PI / 2), paint), [s * 0.44, H - 0.42, 0]))
  }
  add(at(boxFull(0.05, 0.55, 0.05, structure), [0, H - 0.06, 0]))
  add(at(boxFull(1.5, 0.14, 1.5, structure), [0, H - 0.02, 0]))

  /** the doghouse: the accommodation at the foot of the mast, where the crew are */
  add(at(boxFull(2.6, 1.25, 2.2, doghouse), [3.4, 0.62, 0]))
  add(at(boxFull(2.8, 0.1, 2.4, structure), [3.4, 1.28, 0]))
  /** the drawworks and the rigger, opposite the doghouse */
  add(at(boxFull(1.3, 0.7, 1.1, sub), [-3.2, 0.35, 0]))

  yard.track(group)
  return { group, clips: [], dispose: () => yard.dispose() }
}

/**
 * A capped wellhead: a christmas tree standing on a slab, with the valves closed and a cap over
 * the top. Two metres, and it is the only thing on this map that is deliberately not a machine.
 */
export function buildWellhead(): BuiltModel {
  const steel = new THREE.MeshStandardMaterial({ color: 0xa3a6a1, roughness: 0.6, metalness: 0.32 })
  const cap = new THREE.MeshStandardMaterial({ color: 0x2a2d2c, roughness: 0.9, metalness: 0.1 })
  const pad = new THREE.MeshStandardMaterial({ color: 0x242625, roughness: 0.94, metalness: 0.04 })

  const group = new THREE.Group()
  group.name = 'wellhead'
  const yard = new Yard()
  const add = (mesh: THREE.Mesh): THREE.Mesh => {
    group.add(mesh)
    return mesh
  }

  add(at(boxFull(0.62, 0.12, 0.62, pad), [0, 0.06, 0]))
  const stack = (r: number, len: number, x: number, y: number, mat: THREE.Material, seg = 12): THREE.Mesh =>
    add(at(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat), [x, y, 0]))
  stack(0.26, 0.44, 0, 0.34, steel) // casing head
  stack(0.3, 0.05, 0, 0.58, steel) // flange
  stack(0.2, 0.38, 0, 0.78, steel) // tubing head
  stack(0.24, 0.32, 0, 1.11, steel) // master valve, closed
  stack(0.16, 0.26, 0, 1.38, steel) // swab tee
  stack(0.1, 0.3, 0, 1.64, steel) // stuffing box, capped
  /**
   * The side outlets, where the well would be tied into a flowline if it were producing. They
   * run out sideways rather than along the stack, so the tree is closed off rather than plumbed.
   */
  for (const s of [-1, 1]) {
    stack(0.075, 0.34, s * 0.3, 1.11, steel, 10)
    add(at(ring(0.1, 0.018, cap), [s * 0.5, 1.11, 0]))
    stack(0.06, 0.26, s * 0.24, 0.42, steel, 10)
  }
  /** the cap: the whole point of the model, and why it is two metres rather than eight */
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.14, 12), cap), [0, 1.85, 0]))
  add(at(boxFull(0.34, 0.05, 0.05, cap), [0, 1.94, 0]))
  /**
   * A marker post, which is what actually identifies an abandoned well from the air — an
   * abandoned well on satellite is a slab and a stick, and the stick is the readable half.
   */
  standing(0.06, 1.2, 0.06, 0.55, 0, cap)
  add(at(boxFull(0.3, 0.18, 0.02, cap), [0.68, 1.28, 0]))

  yard.track(group)
  return { group, clips: [], dispose: () => yard.dispose() }
}

/* ------------------------------------------------------------------ animation --- */

/**
 * The stroke, as a glTF clip.
 *
 * Sampled from the same `set(theta)` the hero drives, rather than authored as two rotation tracks.
 * That is the whole reason the machine can exist in two renderers and be the same machine: there
 * is one kinematic function, and the clip is a recording of it. A hand-authored `beam ±12°, crank
 * 360°` pair would be simpler and would be *wrong* — the beam's real swing is a couple of degrees
 * at this linkage's proportions and nearly all of the rod's travel is the beam's nose rising and
 * falling, which a rotation track cannot express on its own.
 */
function strokeClips(frame: PumpJackFrame, keys = 24): THREE.AnimationClip[] {
  const nodes: THREE.Object3D[] = [frame.beam, frame.crank, ...frame.pitmans, frame.carrier, frame.rod]
  const times: number[] = []
  const tracks: THREE.KeyframeTrack[] = []
  for (let i = 0; i <= keys; i += 1) times.push((i / keys) * STROKE_SECONDS)
  for (const node of nodes) {
    const p: number[][] = []
    const q: number[][] = []
    const s: number[][] = []
    for (let i = 0; i <= keys; i += 1) {
      frame.set((i / keys) * TURN)
      p.push([node.position.x, node.position.y, node.position.z])
      q.push([node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w])
      s.push([node.scale.x, node.scale.y, node.scale.z])
    }
    frame.set(0)
    tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.position`, times, p.flat()))
    tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, q.flat()))
    tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.scale`, times, s.flat()))
  }
  return [new THREE.AnimationClip(STROKE_CLIP, STROKE_SECONDS, tracks)]
}

/* ------------------------------------------------------------------- the glbs --- */

/**
 * One model to a blob URL, so ten wells on a map share one parse.
 *
 * deck.gl's `ScenegraphLayer` loads its scenegraph once and instances it, so a pumping unit is a
 * single GLB however many wells are producing. The alternative — building a `THREE.Group` per well
 * and wrapping it in a `ScenegraphNode` — would be one geometry, one material set and a
 * `GLTFAnimator` per well, and it is the reason the hero's machine cannot be a map layer.
 *
 * The exporter is imported here rather than at the top of the file because the landing page's hero
 * imports this module for `buildRig` and has no use for a glTF writer. Loaded at the top level it
 * would land in the hero's chunk, and the hero is the first thing anyone sees.
 */
export async function toGlbUrl(group: THREE.Group, animations: THREE.AnimationClip[] = []): Promise<string> {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
  const glb = await new GLTFExporter().parseAsync(group, { binary: true, animations })
  return URL.createObjectURL(new Blob([glb as ArrayBuffer], { type: 'model/gltf-binary' }))
}

export interface WellModelUrls {
  pumpjack: string
  derrick: string
  wellhead: string
}

/**
 * What the yard is worth, in triangles, measured off the builders above rather than estimated.
 *
 * This is the perf budget's evidence. Ten rigs on a satellite basemap is a lot of thin steel, and
 * the honest way to know whether that is affordable is to count the geometry once at build time
 * and put the number in front of whoever is looking at the frame time.
 */
export type YardStats = Record<WellModel, { triangles: number; heightM: number; minY: number }>

function measure(model: BuiltModel): { triangles: number; heightM: number; minY: number } {
  const box = new THREE.Box3().setFromObject(model.group)
  /**
   * Height above the ground, where the ground is y = 0. A model whose box reaches below zero is
   * standing *through* the terrain rather than on it, which is a real bug in the builder rather
   * than a number to be quietly absorbed — so `minY` is reported and the check fails on it rather
   * than the height quietly growing to compensate.
   */
  const minY = Number.isFinite(box.min.y) ? Number(box.min.y.toFixed(3)) : 0
  const heightM = Number.isFinite(box.max.y) ? Number((box.max.y - Math.max(0, box.min.y)).toFixed(2)) : 0
  let triangles = 0
  model.group.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    const geometry = mesh.geometry as THREE.BufferGeometry
    const index = geometry.getIndex()
    const count = index ? index.count : geometry.getAttribute('position')?.count ?? 0
    /** a non-indexed strip or a wireframe still costs, so both are read as triangles */
    triangles += Math.round(count / 3)
  })
  return { triangles, heightM, minY }
}

let stats: YardStats | null = null

/** The measured cost of the yard. Null until the models have been built once. */
export function yardStats(): YardStats | null {
  return stats
}

/**
 * The three yard models, built once and memoised.
 *
 * Held by reference count rather than built per mount: the map section can unmount and remount as
 * the reader scrolls (it is lazy for exactly that reason), and re-exporting three GLBs on every
 * remount would put a visible stall between the reader arriving and the rigs appearing. The URLs
 * are revoked when the last holder lets go, so nothing is left alive for the life of the page.
 */
let pending: Promise<WellModelUrls> | null = null
let urls: WellModelUrls | null = null
let holders = 0

export function retainWellModels(): Promise<WellModelUrls> {
  holders += 1
  if (urls) return Promise.resolve(urls)
  if (!pending) {
    pending = (async () => {
      const built: [WellModel, BuiltModel][] = [
        ['pumpjack', buildPumpJack()],
        ['derrick', buildDerrick()],
        ['wellhead', buildWellhead()],
      ]
      try {
        const exported = await Promise.all(
          built.map(async ([name, model]) => [name, await toGlbUrl(model.group, model.clips)] as const),
        )
        const next: Partial<WellModelUrls> = {}
        for (const [name, url] of exported) next[name] = url
        urls = next as WellModelUrls
        const measured: Partial<YardStats> = {}
        for (const [name, model] of built) measured[name] = measure(model)
        stats = measured as YardStats
        return urls
      } finally {
        for (const [, model] of built) model.dispose()
        pending = null
      }
    })()
  }
  return pending
}

export function releaseWellModels(): void {
  holders = Math.max(0, holders - 1)
  if (holders > 0 || !urls) return
  for (const url of Object.values(urls)) URL.revokeObjectURL(url)
  urls = null
}
