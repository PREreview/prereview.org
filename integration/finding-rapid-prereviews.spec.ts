import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import { RecordsC } from 'zenodo-ts'
import { RapidPrereviewImported } from '../src/Events.ts'
import { BiorxivPreprintId } from '../src/Preprints/index.ts'
import { Doi } from '../src/types/Doi.ts'
import { OrcidId } from '../src/types/OrcidId.ts'
import { Uuid } from '../src/types/uuid.ts'
import { expect, seedEvents, test } from './base.ts'

test.extend(
  seedEvents(
    new RapidPrereviewImported({
      author: {
        persona: 'public',
        orcidId: OrcidId('0000-0002-1825-0097'),
      },
      publishedAt: Temporal.Now.instant(),
      preprintId: new BiorxivPreprintId({ value: Doi('10.1101/2022.02.14.480364') }),
      rapidPrereviewId: Uuid('123e4567-e89b-12d3-a456-426614174000'),
      questions: {
        availableCode: 'yes',
        availableData: 'unsure',
        coherent: 'not applicable',
        dataLink: Option.none(),
        ethics: 'no',
        future: 'yes',
        limitations: 'unsure',
        methods: 'not applicable',
        newData: 'no',
        novel: 'yes',
        peerReview: 'unsure',
        recommend: 'not applicable',
        reproducibility: 'no',
        technicalComments: Option.none(),
        editorialComments: Option.none(),
      },
    }),
  ),
)('can find and view Rapid PREreviews', async ({ fetch, page }) => {
  fetch
    .get('https://api.crossref.org/works/10.1101%2F2022.02.14.480364', {
      body: {
        status: 'ok',
        'message-type': 'work',
        'message-version': '1.0.0',
        message: {
          institution: [{ name: 'bioRxiv' }],
          indexed: { 'date-parts': [[2022, 3, 29]], 'date-time': '2022-03-29T14:21:42Z', timestamp: 1648563702728 },
          posted: { 'date-parts': [[2022, 2, 14]] },
          'group-title': 'Immunology',
          'reference-count': 43,
          publisher: 'Cold Spring Harbor Laboratory',
          'content-domain': { domain: [], 'crossmark-restriction': false },
          'short-container-title': [],
          accepted: { 'date-parts': [[2022, 2, 14]] },
          abstract:
            '<jats:title>Abstract</jats:title><jats:p>BTB domain And CNC Homolog 2 (Bach2) is a transcription repressor that actively participates in T and B lymphocyte development, but it is unknown if Bach2 is also involved in the development of innate immune cells, such as natural killer (NK) cells. Here, we followed the expression of Bach2 during NK cell development, finding that it peaked in CD27<jats:sup>+</jats:sup>CD11b<jats:sup>+</jats:sup> cells and decreased upon further maturation. Bach2 expression positively correlated with that of the transcription factor TCF1 and negatively correlated with genes encoding NK effector molecules as well as genes involved in the cell cycle. Bach2-deficient mice showed increased numbers of terminally differentiated NK cells with increased production of granzymes and cytokines. NK cell-mediated control of tumor metastasis was also augmented in the absence of Bach2. Therefore, Bach2 is a key checkpoint protein regulating NK terminal maturation.</jats:p>',
          DOI: '10.1101/2022.02.14.480364',
          type: 'posted-content',
          created: { 'date-parts': [[2022, 2, 15]], 'date-time': '2022-02-15T03:31:14Z', timestamp: 1644895874000 },
          source: 'Crossref',
          'is-referenced-by-count': 0,
          title: ['The Transcription Factor Bach2 Negatively Regulates Natural Killer Cell Maturation and Function'],
          prefix: '10.1101',
          author: [
            { given: 'Shasha', family: 'Li', sequence: 'first', affiliation: [] },
            { given: 'Michael D.', family: 'Bern', sequence: 'additional', affiliation: [] },
            { given: 'Benpeng', family: 'Miao', sequence: 'additional', affiliation: [] },
            { given: 'Takeshi', family: 'Inoue', sequence: 'additional', affiliation: [] },
            {
              ORCID: 'http://orcid.org/0000-0002-5379-3556',
              'authenticated-orcid': false,
              given: 'Sytse J.',
              family: 'Piersma',
              sequence: 'additional',
              affiliation: [],
            },
            {
              ORCID: 'http://orcid.org/0000-0001-5222-4987',
              'authenticated-orcid': false,
              given: 'Marco',
              family: 'Colonna',
              sequence: 'additional',
              affiliation: [],
            },
            {
              ORCID: 'http://orcid.org/0000-0002-6352-304X',
              'authenticated-orcid': false,
              given: 'Tomohiro',
              family: 'Kurosaki',
              sequence: 'additional',
              affiliation: [],
            },
            {
              ORCID: 'http://orcid.org/0000-0002-0566-7264',
              'authenticated-orcid': false,
              given: 'Wayne M.',
              family: 'Yokoyama',
              sequence: 'additional',
              affiliation: [],
            },
          ],
          member: '246',
          'container-title': [],
          'original-title': [],
          deposited: { 'date-parts': [[2022, 2, 16]], 'date-time': '2022-02-16T15:20:25Z', timestamp: 1645024825000 },
          score: 1,
          resource: { primary: { URL: 'http://biorxiv.org/lookup/doi/10.1101/2022.02.14.480364' } },
          subtitle: [],
          'short-title': [],
          issued: { 'date-parts': [[2022, 2, 14]] },
          'references-count': 43,
          URL: 'http://dx.doi.org/10.1101/2022.02.14.480364',
          relation: {},
          published: { 'date-parts': [[2022, 2, 14]] },
          subtype: 'preprint',
        },
      },
    })
    .get({
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: {
        q: 'metadata.related_identifiers.resource_type.id:"publication-preprint" AND related.identifier:"10.1101/2022.02.14.480364"',
      },
      response: { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    })

  await page.goto('/preprints/doi-10.1101-2022.02.14.480364', { waitUntil: 'commit' })

  await expect(page.getByRole('region', { name: 'Aggregated Rapid PREreviews' })).toBeVisible()
})
