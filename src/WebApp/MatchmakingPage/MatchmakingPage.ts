import { html, plainText } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { PageResponse } from '../Response/index.ts'
import * as Routes from '../../routes.ts'

export const createMatchmakingPage = (results: boolean) => {
  return PageResponse({
    title: plainText('Matchmaking'),
    main: html`
      <h1><span ${languageAttributesFor('en')}>Matchmaking</span></h1>

      <form method="post" action="${Routes.Matchmaking}" novalidate="">
        <div>
          <h2>
            <label id="doi-label" for="doi"><span ${languageAttributesFor('en')}>Enter your DOI</span></label>
          </h2>

          <input id="doi" name="doi" type="text" size="60" dir="ltr" spellcheck="false" />
        </div>

        <button><span ${languageAttributesFor('en')}>${results ? 'Update matches' : 'Find matches'}</span></button>
      </form>

      ${
        results
          ? html`
              <h2><span ${languageAttributesFor('en')}>Results</span></h2>

              <ol>
                <li>
                  <article>
                    <header>
                      <h3 ${languageAttributesFor('en')}>
                        State of Knowledge on the Paleoenvironmental Evolution of the Tatuí Continental System during
                        the Early Permian of the Paraná Basin
                      </h3>

                      <div class="byline">
                        <span ${languageAttributesFor('en')}
                          ><span class="visually-hidden">Authored</span> by
                          <a href="/profiles/0000-0001-7690-3132" class="orcid" dir="auto">Artur Chahud</a></span
                        >
                      </div>

                      <dl>
                        <div>
                          <dt><span ${languageAttributesFor('en')}>Requested</span></dt>
                          <dd><time datetime="2026-10-26" ${languageAttributesFor('en')}>October 26, 2026</time></dd>
                        </div>
                        <div>
                          <dt><span ${languageAttributesFor('en')}>Posted</span></dt>
                          <dd><time datetime="2026-10-26" ${languageAttributesFor('en')}>October 26, 2026</time></dd>
                        </div>
                        <div>
                          <dt><span ${languageAttributesFor('en')}>Server</span></dt>
                          <dd>SciELO Preprints</dd>
                        </div>
                        <div>
                          <dt translate="no">DOI</dt>
                          <dd>
                            <a
                              href="https://doi.org/10.1590/scielopreprints.17296"
                              class="doi"
                              dir="auto"
                              translate="no"
                              >10.1590/scielopreprints.17296</a
                            >
                          </dd>
                        </div>
                      </dl>
                    </header>

                    <div ${languageAttributesFor('en')}>
                      <p>
                        The Tatuí Formation records one of the most complex episodes of paleoenvironmental evolution in
                        the Paraná Basin during the Early Permian, representing the transition between the glacial and
                        periglacial conditions inherited from the Itararé Group and the establishment of a broad coastal
                        system with a continental predominance. This evolution resulted from the interaction among
                        fluvial, deltaic, lacustrine, lagoonal, and marine processes, developed over a paleotopographic
                        surface inherited from the Late Paleozoic glaciation, whose compartmentalization into
                        topographic lows and high areas controlled the significant faciological heterogeneity of the
                        unit. In the depressions, fine-grained deposits associated with low-energy lacustrine and
                        lagoonal environments predominated, whereas the elevated compartments acted as sediment source
                        areas, giving rise to higher-competence fluvial systems such as the Ibicatu Paleoriver, a
                        high-energy braided system responsible for the deposition of the Ibicatu Facies and the sediment
                        supply to a broad progradational deltaic system. Low-energy environments, including ephemeral
                        lakes, floodplains, abandoned paleochannels, and brackish lagoons influenced by incursions of
                        the Rio Bonito–Palermo Sea, record periods of greater hydrodynamic stability, as evidenced by
                        tidal structures and wave- and storm-generated reworking. Recurrent relative sea-level
                        fluctuations promoted the alternation between continental and shallow-marine conditions, which
                        is also reflected in the paleontological record. Siltstone deposits preserve conchostracans,
                        crustaceans, and actinopterygian fish characteristic of temporary continental environments,
                        while ichnofossils, acritarchs, and agglutinated foraminifera document episodes of marine
                        connectivity. The Ibicatu Flora, represented by silicified trunks of Tietea and gymnosperms,
                        demonstrates the presence of forested areas adjacent to the river channels. Taken together,
                        these records indicate that the Tatuí Formation constitutes a transitional depositional system
                        between continental and shallow-marine environments, whose evolution was controlled by the
                        paleotopography inherited from the Late Paleozoic glaciation, climatic seasonality, and
                        fluctuations of the Rio Bonito–Palermo Sea, configuring an important archive for the
                        paleoenvironmental and paleoclimatic reconstruction of the eastern margin of the Paraná Basin.
                      </p>
                    </div>
                  </article>
                </li>
              </ol>
            `
          : ''
      }
    `,
    canonical: Routes.Matchmaking,
  })
}
