import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { RigHandle } from './PumpjackStage'

/**
 * The pumpjack, rendered by us, when an authorised model of it exists.
 *
 * The Sketchfab embed is the default because it is a published model with a published author. It
 * is also a third-party document we do not control: it paints its own studio, it frames the model
 * to a camera somebody else stored, and it grades nothing. A `.glb` we are licensed to use removes
 * all three problems at once — no studio to hide, no framing to fight, and the machine lit by the
 * same dusk the sky and the pad are painted in — so the stage accepts one at
 * `VITE_NWIS_PUMPJACK_GLB` and asks for nothing else to change.
 *
 * Placement is by bounding box rather than by any stored camera, because a bounding box is a
 * property of the file: the base of the box is put on the ground line, the middle of it is put
 * over the stage's middle, and its height is cut to the same share of the frame the embedded rig
 * gets, so swapping the model in cannot quietly shrink the hero.
 *
 * The camera is orthographic and its frustum is the canvas in canvas pixels — one world unit is one
 * pixel — for the same reason the section's is orthographic: the ground line has to be a place on
 * the screen, not a place a perspective divides in two, and a model of unknown size has to land on
 * it exactly.
 */

export function mountGlbRig(
  canvas: HTMLCanvasElement,
  src: string,
  onState: (state: 'loading' | 'ready' | 'failed') => void,
): RigHandle {
  let disposed = false
  let placed = { groundY: 0, height: 0 }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000)
  camera.position.set(0, 0, 2000)

  /** dusk on a lit pad: a low warm key, a cool sky fill, a rim off the horizon, and the pad lamps */
  const lights = new THREE.Group()
  const hemi = new THREE.HemisphereLight(0x2b2d27, 0x0a0b0b, 1.1)
  const key = new THREE.DirectionalLight(0xfff1d2, 1.6)
  key.position.set(-0.55, 0.42, 0.72)
  const rim = new THREE.DirectionalLight(0x9dc2d6, 0.75)
  rim.position.set(0.62, 0.26, -0.7)
  const pad = new THREE.PointLight(0xffd27a, 3.2, 0, 2)
  pad.position.set(0, 0.03, 0.26)
  lights.add(hemi, key, rim, pad)
  scene.add(lights)

  const root = new THREE.Group()
  scene.add(root)

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
    renderer.render(scene, camera)
  }

  const place = (groundY: number, height: number) => {
    if (disposed || height <= 0) return
    placed = { groundY, height }
    if (!root.children.length) {
      draw()
      return
    }
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    if (size.y <= 0) return
    const scale = height / size.y
    root.scale.setScalar(scale)
    /** the box has to be asked again in the units the model is now in, not the ones it was loaded in */
    const scaled = new THREE.Box3(
      box.min.clone().multiplyScalar(scale),
      box.max.clone().multiplyScalar(scale),
    )
    const centre = scaled.getCenter(new THREE.Vector3())
    root.position.set(-centre.x, groundY - scaled.min.y, -centre.z)
    /** the lights are authored in a unit of the machine's own height, so they follow any model */
    lights.scale.setScalar(height)
    pad.distance = height * 0.9
    draw()
  }

  const loader = new GLTFLoader()
  loader.load(
    src,
    (gltf) => {
      if (disposed) return
      root.add(gltf.scene)
      gltf.scene.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.castShadow = false
        mesh.frustumCulled = false
        const material = mesh.material
        /** rigs are often authored inside-out; showing both faces costs nothing and saves a hole */
        if (Array.isArray(material)) material.forEach((m) => (m.side = THREE.DoubleSide))
        else material.side = THREE.DoubleSide
      })
      onState('ready')
      place(placed.groundY, placed.height)
    },
    undefined,
    () => !disposed && onState('failed'),
  )

  const ro = new ResizeObserver(() => place(placed.groundY, placed.height))
  ro.observe(canvas)

  return {
    place,
    dispose() {
      disposed = true
      ro.disconnect()
      root.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.geometry.dispose()
        const material = mesh.material
        for (const m of Array.isArray(material) ? material : [material]) {
          for (const value of Object.values(m as unknown as Record<string, unknown>)) {
            if (value && typeof value === 'object' && 'isTexture' in value) (value as THREE.Texture).dispose()
          }
          m.dispose()
        }
      })
      lights.clear()
      renderer.dispose()
    },
  }
}
