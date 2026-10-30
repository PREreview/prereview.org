import { Effect, Option, pipe } from 'effect'
import { createMatchmakingPage, type MatchedWork } from './MatchmakingPage.ts'
import { UrlParams } from '@effect/platform'
import * as Doi from '../../types/Doi.ts'
import { html } from '../../html.ts'
import { PlainDate } from '../../types/Temporal.ts'
import { ScieloPreprintId } from '../../Preprints/index.ts'
import { OrcidId } from '../../types/index.ts'
import { Name } from '../../types/Name.ts'
import { URL } from 'node:url'

const hardcoded = {
  title: {
    language: 'en',
    text: html`State of Knowledge on the Paleoenvironmental Evolution of the Tatuí Continental System during the Early
    Permian of the Paraná Basin`,
  },
  authors: [{ name: Name('Artur Chahud'), orcid: OrcidId.OrcidId('0000-0001-7690-3132') }],
  posted: PlainDate.from('2026-10-26'),
  requested: PlainDate.from('2026-10-26'),
  id: new ScieloPreprintId({
    value: Doi.Doi('10.1590/scielopreprints.17296'),
  }),
  abstract: {
    language: 'en',
    text: html`<p>
      The Tatuí Formation records one of the most complex episodes of paleoenvironmental evolution in the Paraná Basin
      during the Early Permian, representing the transition between the glacial and periglacial conditions inherited
      from the Itararé Group and the establishment of a broad coastal system with a continental predominance. This
      evolution resulted from the interaction among fluvial, deltaic, lacustrine, lagoonal, and marine processes,
      developed over a paleotopographic surface inherited from the Late Paleozoic glaciation, whose compartmentalization
      into topographic lows and high areas controlled the significant faciological heterogeneity of the unit. In the
      depressions, fine-grained deposits associated with low-energy lacustrine and lagoonal environments predominated,
      whereas the elevated compartments acted as sediment source areas, giving rise to higher-competence fluvial systems
      such as the Ibicatu Paleoriver, a high-energy braided system responsible for the deposition of the Ibicatu Facies
      and the sediment supply to a broad progradational deltaic system. Low-energy environments, including ephemeral
      lakes, floodplains, abandoned paleochannels, and brackish lagoons influenced by incursions of the Rio
      Bonito–Palermo Sea, record periods of greater hydrodynamic stability, as evidenced by tidal structures and wave-
      and storm-generated reworking. Recurrent relative sea-level fluctuations promoted the alternation between
      continental and shallow-marine conditions, which is also reflected in the paleontological record. Siltstone
      deposits preserve conchostracans, crustaceans, and actinopterygian fish characteristic of temporary continental
      environments, while ichnofossils, acritarchs, and agglutinated foraminifera document episodes of marine
      connectivity. The Ibicatu Flora, represented by silicified trunks of Tietea and gymnosperms, demonstrates the
      presence of forested areas adjacent to the river channels. Taken together, these records indicate that the Tatuí
      Formation constitutes a transitional depositional system between continental and shallow-marine environments,
      whose evolution was controlled by the paleotopography inherited from the Late Paleozoic glaciation, climatic
      seasonality, and fluctuations of the Rio Bonito–Palermo Sea, configuring an important archive for the
      paleoenvironmental and paleoclimatic reconstruction of the eastern margin of the Paraná Basin.
    </p>`,
  },
  url: new URL('https://doi.org/10.1590/scielopreprints.17296'),
} satisfies MatchedWork

export const MatchmakingPage = Effect.succeed(createMatchmakingPage(Option.none(), []))

export const MatchmakingSubmission = Effect.fn(function* (input: UrlParams.UrlParams) {
  const doi = pipe(input, UrlParams.getLast('doi'), Option.andThen(Doi.parse))

  return yield* Effect.succeed(createMatchmakingPage(doi, [hardcoded]))
})
