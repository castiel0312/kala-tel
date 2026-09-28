import * as THREE from 'three'

/**
 * Checks the section's projection without a browser.
 *
 * The whole hero depends on one claim: a point authored in the projection's units lands on
 * the pixel the overlay expects. This projects known points through the same camera and the
 * same cut-space matrix the scene uses, and prints the error in screen pixels.
 */
const PITCH = 22
const W = 800
const H = 450
const sinPitch = Math.sin((PITCH * Math.PI) / 180)
const cosPitch = Math.cos((PITCH * Math.PI) / 180)

const camera = new THREE.OrthographicCamera(0, W, H, 0, -4000, 4000)
camera.position.set(0, 0, 0)
camera.rotation.x = -(PITCH * Math.PI) / 180
camera.updateMatrixWorld(true)
camera.updateProjectionMatrix()

const cut = new THREE.Matrix4().makeScale(1, -1 / cosPitch, -1)
cut.setPosition(0, H / cosPitch, 0)

const toScreen = (sx, sy, d) => {
  const v = new THREE.Vector3(sx, sy, d).applyMatrix4(cut).project(camera)
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]
}

let worst = 0
const check = (label, sx, sy, d, wantX, wantY) => {
  const [x, y] = toScreen(sx, sy, d)
  const ex = Math.abs(x - wantX)
  const ey = Math.abs(y - wantY)
  worst = Math.max(worst, ex, ey)
  console.log(`${label.padEnd(22)} got ${x.toFixed(3).padStart(9)} ${y.toFixed(3).padStart(9)}   want ${wantX.toFixed(3).padStart(9)} ${wantY.toFixed(3).padStart(9)}   err ${ex.toFixed(4)} ${ey.toFixed(4)}`)
}

check('origin', 0, 0, 0, 0, 0)
check('bottom right', W, H, 0, W, H)
check('left edge', 54, 0.098 * H, 0, 54, 0.098 * H)
check('2700 m', 400, 0.222 * H, 0, 400, 0.222 * H)
check('behind 40 px', 400, 0.222 * H, 40, 400, 0.222 * H - 40 * sinPitch)
check('deep rock', 700, 0.9 * H, 0, 700, 0.9 * H)
check('in front of cut', 300, 0.5 * H, -4, 300, 0.5 * H + 4 * sinPitch)

// linearity: a 100 m step must be a constant number of pixels, top to bottom
const axisTop = 0.222 * H
const axisBottom = 0.95 * H
const pxPerM = (axisBottom - axisTop) / 1000
console.log(`\npx per metre: ${pxPerM.toFixed(5)}`)
for (const md of [2700, 3000, 3200, 3400, 3700]) {
  const want = axisTop + (md - 2700) * pxPerM
  check(`md ${md}`, 400, want, 0, 400, want)
}

console.log(`\nworst error: ${worst.toFixed(4)} px`)
process.exit(worst < 0.01 ? 0 : 1)
