import { ProvenanceTag } from '../components/kit'
import { useNwis } from './useNwis'
import { SECTIONS } from './sections'
import s from './experience.module.css'

/** The last thing on the page: who built it, what the numbers are, and how to get back. */
export function Footer() {
  const { goTo, well } = useNwis()

  return (
    <footer className={s.footer} id="colophon" aria-label="About this system">
      <div className={s.footerInner}>
        <div>
          <div className={s.footerBrand}>
            <span className={s.brandMark} aria-hidden />
            <b>NWIS</b>
          </div>
          <p className={s.footerNote}>
            Neighbourhood Well Intelligence System. A continuous read on one active well, assembled from every
            well report the operation has ever filed. Built for Oil India Limited · SIH26121.
          </p>
          <p className={s.footerAttribution}>
            Terrain, imagery and geocoding by Mapbox · Deck.gl for the subsurface layers · Cytoscape.js for the
            knowledge graph.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <ProvenanceTag kind="LIVE" label="eRTMAC live feed" />
            <ProvenanceTag kind="HISTORICAL" label="1,284 documents" />
            <ProvenanceTag kind="DERIVED" label={`active ${well.data?.id ?? '—'}`} />
          </div>
        </div>

        <nav className={s.footerLinks} aria-label="All sections">
          {SECTIONS.map((sec) => (
            <a
              key={sec.id}
              className={s.footerLink}
              href={`#${sec.id}`}
              onClick={(e) => {
                e.preventDefault()
                goTo(sec.id)
              }}
            >
              <span>{sec.no}</span>
              {sec.nav}
            </a>
          ))}
        </nav>
      </div>

      <div className={s.footerBase}>
        <div className={s.footerBaseRow}>
          <span>Figures are demo values · probability is a posterior, not a promise</span>
          <span>Every number on this page is traceable to a source document</span>
        </div>
      </div>
    </footer>
  )
}
