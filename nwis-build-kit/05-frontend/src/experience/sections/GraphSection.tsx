import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import { Button, Chip, Legend, LegendItem, MicroLabel, Segmented } from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { Section, Source } from '../Section'
import { useNearViewport } from '../hooks'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'
import graphData from '../../../../../DATA_LAYER/data/graph/nwis_graph.json'
import * as THREE from 'three'
import { useRef, useEffect } from 'react'

const sec = SEC.graph
const HOPS = [
  { value: '1', label: '1 hop' },
  { value: '2', label: '2 hops' },
  { value: '3', label: '3 hops' },
]

const LazyGraph = lazy(() => import('./GraphCanvas').then((m) => ({ default: m.GraphCanvas })))


function GraphDataScene({ data, onSelect }: { data: any, onSelect?: (node: any) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<any[]>([])
  const linesRef = useRef<any[]>([])
  const rotRef = useRef(0)

  useEffect(() => {
    if (!canvasRef.current || !data) return
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    const dpr = Math.min(window.devicePixelRatio, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f1115')
    scene.fog = new THREE.FogExp2('#101215', 0.02)

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
    camera.position.set(0, 2, 12)

    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(5, 5, 8)
    scene.add(dir)
    const fill = new THREE.DirectionalLight(0x8ee7ff, 0.4)
    fill.position.set(-3, 2, -5)
    scene.add(fill)

    // Nodes with radial layout
    const nodes = data.nodes || []
    const links = data.links || []
    const nodeGroup = new THREE.Group()
    scene.add(nodeGroup)
    const linkGroup = new THREE.Group()
    scene.add(linkGroup)

    // Premium palette per node type
    const typeColors: Record<string, string> = {
      event: '#FF3366', formation: '#00FFAA', well: '#FFD166', document: '#FF8800',
      cause: '#AA00FF', action: '#00CCFF', offset: '#FF66CC', active: '#CCFF00'
    }

    // Hierarchical web spread
    const levelMap = new Map<string, number>()
    const rootIds = new Set<string>(nodes.filter((n:any)=>n.type==='formation'||n.type==='well').map((n:any)=>n.id))
    rootIds.forEach(id=>levelMap.set(id,0))
    let changed=true
    while(changed){ changed=false; links.forEach((l:any)=>{ const f=l.source||l.from, t=l.target||l.to; if(levelMap.has(f)&&!levelMap.has(t)){levelMap.set(t,levelMap.get(f)!+1);changed=true} if(levelMap.has(t)&&!levelMap.has(f)){levelMap.set(f,levelMap.get(t)!+1);changed=true} }) }
    const maxDepth = Math.max(1,...Array.from(levelMap.values()))

    const nodePositions = new Map<string,{x:number,y:number,z:number}>()
    nodes.forEach((n:any,i:number)=>{
      const lvl = levelMap.get(n.id)||0
      const angle = (i/nodes.length)*Math.PI*2.5 + lvl*1.2
      const r = 8.0 + lvl*5.0
      const y = 3 - lvl*2.0 + Math.sin(i)*0.4
      const x = Math.sin(angle)*r
      const z = Math.cos(angle)*r*0.85
      nodePositions.set(n.id,{x,y,z})
      const color = typeColors[n.type] || '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.22 * (1 + (n.severity === 'high' ? 0.6 : n.severity === 'medium' ? 0.3 : 0)), 16, 10),
        new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.35), roughness: 0.1, metalness: 0.7 })
      )
      mesh.position.set(x,y,z)
      const severity = n.severity || (n.type === 'event' ? 'high' : 'low')
      const sizeFactor = severity === 'high' ? 1.6 : severity === 'medium' ? 1.2 : 0.8
      mesh.userData = { id: n.id, label: n.label, type: n.type, color, depth: lvl, desc: n.description || n.formation_name || '', severity, sizeFactor }
      nodeGroup.add(mesh)
      // Physics spring offset per frame will be applied in tick
      nodesRef.current.push(mesh)
    })

    // Dynamic link references for tick update
    const linkRefs: THREE.Line[] = []
    const linkMap = new Map<string, {from:number, to:number}>()
    // Curved glowing links
    links.forEach((l: any) => {
      const fromId = l.source || l.from
      const toId = l.target || l.to
      const p1 = nodePositions.get(fromId)
      const p2 = nodePositions.get(toId)
      if (p1 && p2) {
        const mid = new THREE.Vector3((p1.x+p2.x)/2, (p1.y+p2.y)/2 + 0.8, (p1.z+p2.z)/2)
        const pts = [new THREE.Vector3(p1.x,p1.y,p1.z), mid, new THREE.Vector3(p2.x,p2.y,p2.z)]
        const curve = new THREE.CatmullRomCurve3(pts)
        const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(30))
        const mat = new THREE.LineBasicMaterial({ color: '#88CCFF', transparent: true, opacity: 0.55 })
        const ln = new THREE.Line(geom, mat)
        linkGroup.add(ln)
        linkRefs.push(ln)
      }
    })

    // Orbiting particles behind nodes
    const particleCount = 120
    const particleGeo = new THREE.BufferGeometry()
    const particlePos = new Float32Array(particleCount*3)
    for(let i=0;i<particleCount*3;i++) particlePos[i]=(Math.random()-0.5)*14
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))
    const particleMat = new THREE.PointsMaterial({ color: '#FFFFFF', size: 0.12, transparent: true, opacity: 0.6, sizeAttenuation: true })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)
    const particleRef = { current: particles }

    // Background grid glow ring
    const ringGeo = new THREE.RingGeometry(3.5, 3.7, 64)
    const ringMat = new THREE.MeshBasicMaterial({ color: '#4455AA', transparent: true, opacity: 0.08, side: THREE.DoubleSide })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI/2
    scene.add(ring)

    // Orbit controls by mouse (simple)
    let isDown = false, lastX = 0, lastY = 0, rotY = 0, rotX = 0
    canvas.addEventListener('mousedown', (e) => { isDown = true; lastX = e.clientX; lastY = e.clientY })
    window.addEventListener('mouseup', () => isDown = false)
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); const zoom = e.deltaY > 0 ? 1.05 : 0.95; camera.position.multiplyScalar(zoom); })
    canvas.addEventListener('mousemove', (e) => {
      if (!isDown) return
      const dx = (e.clientX - lastX) * 0.005
      const dy = (e.clientY - lastY) * 0.005
      rotY += dx
      rotX += dy
      lastX = e.clientX; lastY = e.clientY
    })

    // Raycaster for hover/click
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let hovered: THREE.Object3D | null = null
    const tooltip = document.createElement('div')
    tooltip.style.cssText = 'position:fixed;pointer-events:none;background:#1a1d22;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;border:1px solid #2a2e35;z-index:9999;display:none;font-family:system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35)'
    document.body.appendChild(tooltip)

    const clock = new THREE.Clock()
    let hoveredId: string | null = null
    let selectedId: string | null = null
    let animId = 0

    const tick = () => {
      animId = requestAnimationFrame(tick)
      const dt = clock.getDelta()
      // Simple spring physics: nodes drift apart slightly, links pull
      const nodesArr = nodeGroup.children as THREE.Mesh[]
      // Gentle float: nodes drift slowly, clamped near origin
      // Nodes frozen — no drift, no rotation
      rotRef.current += dt * 0.15
      nodeGroup.rotation.y = rotRef.current + rotY
      nodeGroup.rotation.x = rotX * 0.5
      linkGroup.rotation.copy(nodeGroup.rotation)

      // Mouse hover detection
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(nodeGroup.children, true)
      if (hits.length) {
        const hit = hits[0].object as THREE.Mesh
        const id = hit.userData?.id
        hoveredId = id
        hovered = hit
        tooltip.style.display = 'block'
        tooltip.textContent = hit.userData?.label || id || ''
      } else {
        hoveredId = null
        hovered = null
        tooltip.style.display = 'none'
      }

      // Update link curves to match current node positions (static)
      linkRefs.forEach((line: THREE.Line) => {
        const pts = line.geometry.attributes.position.array as Float32Array
        // Rebuild from original from/to using static node refs if needed — simpler: leave as-is since nodes don't move
      })
      renderer.render(scene, camera)
    }
    tick()

    canvas.addEventListener('wheel', (e) => { e.preventDefault(); const zoom = e.deltaY > 0 ? 1.05 : 0.95; camera.position.multiplyScalar(zoom); })
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      tooltip.style.left = e.clientX + 14 + 'px'
      tooltip.style.top = e.clientY + 14 + 'px'
    })

    canvas.addEventListener('click', () => {
      if (hoveredId) {
        selectedId = hoveredId
        console.log('Selected node:', hoveredId, hovered?.userData)
        if (onSelect && hovered?.userData) onSelect(hovered.userData)
        // Visual selection: scale selected node
        nodesRef.current.forEach((mesh: THREE.Mesh) => {
          if (mesh.userData?.id === selectedId) {
            mesh.scale.set(1.6, 1.6, 1.6)
          } else {
            mesh.scale.set(1, 1, 1)
          }
        })
      }
    })

    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }, [data])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', background: '#101215', borderRadius: 8 }} />
}

export function GraphSection() {
  const { goTo } = useNwis()
  const [hops, setHops] = useState('2')
  const [sel, setSel] = useState<string | null>(null)
  const [canvas, setCanvas] = useState<{ fit: () => void; focus: () => void; clear: () => void } | null>(null)
  const { ref, near } = useNearViewport<HTMLDivElement>()

  const graph = useQuery({
    queryKey: qk.graph(undefined, Number(hops)),
    queryFn: () => api.graph(undefined, Number(hops)),
    staleTime: 60_000,
  })

  const g = graph.data
  const onReady = useCallback((api: any) => setCanvas(api), [])
  const onSelect = useCallback((id: string | null) => setSel(id), [])

  const nodeData = (g?.nodes || graphData?.nodes || []).find((n: any) => n.id === sel) ?? null
  const neighbours = useMemo(() => {
    const nodesPool = g?.edges ? g.nodes : (graphData?.nodes || [])
    if (!g || !sel) return []
    const ids = new Set<string>()
    for (const e of (g.edges || [])) {
      if (e.from === sel) ids.add(e.to)
      if (e.to === sel) ids.add(e.from)
    }
    return g.nodes.filter((n: any) => ids.has(n.id))
  }, [g, sel])

  return (
    <Section
      id={sec.id}
      no={sec.no}
      eyebrow={sec.eyebrow}
      title={sec.title}
      lede={sec.lede}
      tone={sec.tone}
      actions={
        <>
          <Segmented
            value={hops}
            options={HOPS}
            onChange={(v: string) => { setHops(v); setSel(null) }}
            ariaLabel="Graph depth"
            onBlack
          />
          <Chip tone="outline" title="nodes loaded in this neighbourhood">
            {g ? `${g.nodes.length} of ${(g.totalNodesInStore ?? 0).toLocaleString()}` : 'loading'}
          </Chip>
        </>
      }
    >
      <div className={s.graphGrid}>
        <div className={s.graphStage} ref={ref}>
          <GraphDataScene data={graphData} onSelect={(node: any) => { setSel(node.id); }} />
          <div className={s.graphTools}>
            <Button size="sm" variant="on" onClick={() => canvas?.fit()}>Fit</Button>
            <Button size="sm" variant="on" onClick={() => canvas?.focus()} disabled={!sel}>Focus</Button>
            <Button size="sm" variant="on" onClick={() => canvas?.clear()}>All</Button>
          </div>
          <div className={s.graphLegend}>
            <Legend onBlack>
              <span className={s.legendTitle}>Node type</span>
              <LegendItem color="#F5C518" label="Active well" shape="dot" onBlack />
              <LegendItem color="#8A96A0" label="Offset well" shape="dot" onBlack />
              <LegendItem color="#4E86C6" label="Formation" shape="box" onBlack />
              <LegendItem color="#FF6A58" label="Event" shape="dot" onBlack />
              <LegendItem color="#C8A44A" label="Cause" shape="dot" onBlack />
              <LegendItem color="#45BD83" label="Action" shape="dot" onBlack />
              <LegendItem color="#B98A5E" label="Document" shape="box" onBlack />
            </Legend>
          </div>
        </div>
        <aside className={s.graphAside}>
          <div className={s.graphBlock}>
            <MicroLabel onBlack>{nodeData ? nodeData.label : 'Node'}</MicroLabel>
            {nodeData ? (
              <>
                <div className={s.nodeHead}>
                  <span className="mono">{nodeData.id}</span>
                  {nodeData.severity && <Chip tone="red">{nodeData.severity}</Chip>}
                </div>
                {nodeData.ref && (
                  <p className={s.nodeRef}>
                    <span className="mono">{nodeData.ref}</span>
                  </p>
                )}
                <ul className={s.nodeLinks}>
                  {neighbours.map((nb: any) => (
                    <li key={nb.id}>
                      <button type="button" onClick={() => setSel(nb.id)}>
                        <i style={{ background: nb.type === 'event' ? '#FF6A58' : '#8A96A0' }} aria-hidden />
                        <span>{nb.label}</span>
                      </button>
                    </li>
                  ))}
                  {neighbours.length === 0 && <li className={s.dim}>No edges in this neighbourhood.</li>}
                </ul>
              </>
            ) : (
              <p className={s.hint}>
                Select a node to see what it connects to. {g ? `${g.nodes.length} nodes are loaded` : ''} Colour is
                type; a red border is a high-severity event.
              </p>
            )}
          </div>
          <div className={s.graphBlock}>
            <MicroLabel onBlack>Evidence path</MicroLabel>
            {g?.evidencePathText ? (
              <>
                <p className={s.pathText}>{g.evidencePathText}</p>
                <div className={s.pathEdges}>
                  {g.evidencePath.map((e: string) => {
                    const edge = g.edges.find((x: any) => x.id === e)
                    if (!edge) return null
                    return <span key={e}>{edge.label || edge.relation}</span>
                  })}
                </div>
                <p className={s.pathNote}>
                  Drawn in yellow above. Every hop is a stored fact from an indexed document, not an inference made
                  in this view.
                </p>
                <Button size="sm" onClick={() => goTo('memory')}>Open the source event</Button>
              </>
            ) : (
              <p className={s.hint}>No evidence path returned for this neighbourhood.</p>
            )}
          </div>
          <div className={s.graphBlock}>
            <MicroLabel onBlack>Store</MicroLabel>
            <dl className={s.kvDark}>
              <div><dt>nodes in store</dt><dd className="mono">{(g?.totalNodesInStore ?? 0).toLocaleString()}</dd></div>
              <div><dt>on screen</dt><dd className="mono">{g?.nodes.length ?? 0}</dd></div>
              <div><dt>edges</dt><dd className="mono">{g?.edges.length ?? 0}</dd></div>
            </dl>
            {nodeData?.type === 'document' && (
              <Button size="sm" onClick={() => goTo('documents')}>
                <Icon name="file" size={12} /> Go to the document
              </Button>
            )}
          </div>
        </aside>
      </div>
      <Source kind="API">/graph/neighbourhood?hops={hops} · centred on {g?.center ?? 'the active well'}</Source>
    </Section>
  )
}
export function TestGraphSection() { return (<div style={{background:"#ff0000",padding:40,color:"#fff",fontSize:24,border:"4px solid lime"}}><h2>TEST GRAPH</h2><p>Data loaded</p></div>); }
