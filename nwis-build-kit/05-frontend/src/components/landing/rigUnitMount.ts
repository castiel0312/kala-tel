import * as THREE from 'three'
import { buildRig, STROKE_SECONDS, type RigUnit } from './rigUnit'
import { machinePalette } from './heroPalette'
import type { RigHandle } from './PumpjackStage'

/**
 * The machine, turning.
 *
 * This is the whole of the third-party embed's job done in-house: a canvas, a camera, four lights
 * and a clock. The renderer, the orthographic camera whose frustum is the canvas in canvas pixels,
 * and the dusk lighting are deliberately the same as `pumpjackGlb`'s, so the two paths are
 * interchangeable — a licensed model dropped in at `VITE_NWIS_PUMPJACK_GLB` stands on the same
 * ground line, in the same light, at the same share of the frame, and the rest of the hero cannot
 * tell which one it is looking at.
 *
 * The difference is that this one has no studio behind it, so there is no rectangle to mask and
 * nothing to grade. The machine is lit by the same dusk the sky and the pad are painted in, and
 * the only thing between it and the paper is a contact shadow of its own.
 *
 * ## Where the machine is put
 *
 * By its own bounding box, as any model is, and with one deliberate difference from the licensed
 * path: the machine is centred on the **wellhead**, not on itself. A pumping unit is not
 * symmetrical about anything that matters — its beam is five and a half metres one way and two the
 * other — so centring its box would stand it over its own middle and leave the polished rod hanging
 * in mid-air a metre to one side of the well. The wellhead is at x = 0 in the machine's own
 * coordinates, and that is what goes over the stage's middle.
 *
 * The height is capped by the canvas width as well as by the allowance it is given, because the
 * machine is about as wide as it is tall: on a narrow stage the height has to give way, or the
 * horsehead and the prime mover are both cut off at the edges.
 */

/**
 * The share of the half-canvas either side of the wellhead the machine may take.
 *
 * It is a share of a half, not of the whole, because the machine stands on one side of the
 * wellhead: the wellhead goes over the middle of the canvas and the machine reaches away from it.
 * On a wide stage the height allowance binds long before this does; on a narrow one this is what
 * stops the prime mover being cut off at the edge.
 */
const WIDTH_SHARE = 0.92

export interface MountRigOptions {
  /** The reader has asked for less motion: the machine is drawn once, at rest, and stays there. */
  still: boolean
  onState: (state: 'loading' | 'ready' | 'failed') => void
}

export function mountRig(canvas: HTMLCanvasElement, options: MountRigOptions): RigHandle {
  const { still, onState } = options
  let disposed = false
  let placed = { groundY: 0, height: 0 }
  let drawn = false

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  /** orthographic, and its frustum is the canvas in canvas pixels, for `pumpjackGlb`'s reason */
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000)
  camera.position.set(0, 0, 2000)

  /**
   * Neutral white light, and a much weaker rig than the dusk needed.
   *
   * The hemisphere used to be strong for a specific reason that no longer holds: the machine was a
   * set of dark greys against a dark sky, and when the two are the same value the machine becomes a
   * hole — a quarter of its pixels measured at luminance 8, which is absence, not shadow. The fix
   * was a heavy ambient floor. The stage is now white and the machine is near-black, so the two can
   * no longer collide, and the same floor would do the opposite: it would lift the shadowed steel
   * off the black and wash the signal yellow toward cream. So the fill comes down hard and the key
   * stays square and white.
   *
   * The pad lamp survives only because the front of the machine faces the reader and a fully flat
   * front reads as a silhouette of a machine rather than as a machine; it is white now, and dim
   * enough to be a fill. There is no lamp pool on the ground any more — that is the contact
   * shadow's job, and it is one flat ellipse.
   */
  const lights = new THREE.Group()
  const hemi = new THREE.HemisphereLight(0xffffff, 0xdcddd7, 0.72)
  const key = new THREE.DirectionalLight(0xffffff, 1.18)
  key.position.set(-0.55, 0.42, 0.72)
  const rim = new THREE.DirectionalLight(0xffffff, 0.5)
  rim.position.set(0.62, 0.26, -0.7)
  const pad = new THREE.PointLight(0xffffff, 0.85, 0, 2)
  pad.position.set(0, 0.03, 0.26)
  lights.add(hemi, key, rim, pad)
  scene.add(lights)

  /**
   * The hero's machine, in the hero's colours.
   *
   * The same `buildRig` the map's neighbour uses, given this stage's palette: black and yellow, on
   * white, under white light. The map calls it with no palette and gets the dusk values it has always
   * had, which is the point of the seam — one set of proportions and one solved linkage, two jobs.
   */
  const rig: RigUnit = buildRig(machinePalette)
  scene.add(rig.root)

  let theta = 0
  let hover = 0
  let hoverTo = 0

  const draw = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w < 8 || h < 8) return
    renderer.setSize(w, h, false)
    camera.left = -w / 2
    camera.right = w / 2
    camera.top = h / 2
    camera.bottom = -h / 2
    camera.updateProjectionMatrix()

    rig.setPhase(theta)
    hover += (hoverTo - hover) * 0.16
    rig.setHover(hover)
    renderer.render(scene, camera)
  }

  const place = (groundY: number, height: number) => {
    if (disposed || height <= 0) return
    placed = { groundY, height }
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w < 8 || h < 8) return
    const size = rig.box.getSize(new THREE.Vector3())
    if (size.y <= 0) return
    /**
     * The width is fitted to the machine's *reach from the wellhead*, not to its box: the horsehead
     * hangs a metre behind the wellhead and the prime mover stands eight metres in front of it, so
     * the room the machine needs is on one side of the canvas' middle only. Fitting the box instead
     * would give it a metre of canvas on the empty side and take a metre off its height.
     */
    const reach = Math.max(Math.abs(rig.box.min.x), Math.abs(rig.box.max.x))
    const wide = reach > 0 ? (w * WIDTH_SHARE * 0.5) / reach : height / size.y
    const scale = Math.min(height / size.y, wide)
    rig.root.scale.setScalar(scale)
    /**
     * The base on the ground line, and nothing in x: the machine is authored with its wellhead at
     * x = 0, so leaving the root at the origin *is* putting the wellhead over the middle of the
     * canvas. The ground line is `groundY` px from the top and the camera's +y is up, so it is
     * `h / 2 - groundY` in world units. Depth is only a near/far question, so the machine is just
     * centred in it.
     */
    rig.root.position.set(0, h / 2 - groundY - rig.box.min.y * scale, -(rig.box.min.z + size.z / 2) * scale)
    /** the lights are authored in a unit of the machine's own height, so they follow it */
    lights.scale.setScalar(height)
    pad.distance = height * 0.9
    draw()
    /**
     * The stage lifts its own drawn wellhead the moment the machine is ready, so `ready` waits for
     * a frame that has the machine in it rather than for a canvas that exists. Announced once.
     */
    if (!drawn) {
      drawn = true
      onState('ready')
    }
  }

  /**
   * The clock.
   *
   * Driven off the same performance timeline as the rest of the hero rather than accumulated per
   * frame, so a slow frame costs the machine a little position rather than a little speed. It runs
   * only while the canvas is on screen, for the same reason the section's scene does: a pumpjack
   * turning behind a scrolled-past hero is a fan that nobody asked for.
   */
  let raf = 0
  let start = 0
  let watch: IntersectionObserver | null = null

  const pump = () => {
    if (raf) return
    if (!start) start = performance.now()
    const loop = (now: number) => {
      if (disposed) return
      theta = ((now - start) / 1000 / STROKE_SECONDS) * Math.PI * 2
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
  }

  const stop = () => {
    if (!raf) return
    cancelAnimationFrame(raf)
    raf = 0
  }

  if (still) {
    /** a machine at rest is not a machine switched off, so it is drawn once, mid-stroke */
    theta = Math.PI * 0.35
  } else {
    /**
     * The observer is the authority for whether the machine is turning, and it decides on its
     * first callback — so it is started rather than waited for, and stopped by the observer if the
     * canvas turns out to be off screen. `pump` is idempotent while a loop is running, so the two
     * agreeing is not a second clock.
     */
    watch = new IntersectionObserver(([entry]) => {
      if (!entry || disposed) return
      if (entry.isIntersecting) pump()
      else stop()
    })
    watch.observe(canvas)
    pump()
  }

  const ro = new ResizeObserver(() => place(placed.groundY, placed.height))
  ro.observe(canvas)

  /** the pointer is the canvas's own, so a hover over the sky does not answer the wellhead */
  const onEnter = (): void => {
    hoverTo = 1
  }
  const onLeave = (): void => {
    hoverTo = 0
  }
  canvas.addEventListener('pointerenter', onEnter)
  canvas.addEventListener('pointerleave', onLeave)

  /**
   * The machine is the stage's own rectangle, so the stage places it as soon as it is mounted —
   * which is why there is no placement guess in here. It is told the ground line and a height, and
   * it remembers them so its own resize observer can put the machine back on the ground line when
   * the canvas changes size underneath it.
   */
  return {
    place,
    dispose() {
      disposed = true
      stop()
      watch?.disconnect()
      ro.disconnect()
      canvas.removeEventListener('pointerenter', onEnter)
      canvas.removeEventListener('pointerleave', onLeave)
      scene.remove(rig.root)
      rig.dispose()
      lights.clear()
      renderer.dispose()
    },
  }
}
