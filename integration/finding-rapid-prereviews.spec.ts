import { RecordsC } from 'zenodo-ts'
import { expect, test } from './base'

test('can find and view Rapid PREreviews', async ({ fetch, page }) => {
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
    .get(
      {
        url: 'http://zenodo.test/api/records/',
        query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.02.14.480364"' },
      },
      { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    )
    .get('http://prereview.test/api/v2/preprints/doi-10.1101-2022.02.14.480364/rapid-reviews', {
      body: {
        data: [
          {
            author: {
              name: 'Madison Dresler',
              orcid: '0000-0001-6647-6392',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'yes',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'yes',
            ynEthics: 'N/A',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'N/A',
            ynAvailableData: 'N/A',
          },
          {
            author: {
              name: 'Darkblue Monkey',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'unsure',
            ynMethods: 'unsure',
            ynCoherent: 'yes',
            ynLimitations: 'unsure',
            ynEthics: 'yes',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'no',
            ynAvailableData: 'no',
          },
          {
            author: {
              name: 'Darkred Gorilla',
            },
            ynNovel: 'unsure',
            ynFuture: 'yes',
            ynReproducibility: 'unsure',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'N/A',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'no',
            ynAvailableData: 'yes',
          },
          {
            author: {
              name: 'Lamis Elkheir',
              orcid: '0000-0002-3516-334X',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'unsure',
            ynMethods: 'unsure',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'N/A',
            ynAvailableData: 'unsure',
          },
          {
            author: {
              name: 'Devanshi Gupta',
              orcid: '0000-0003-4946-401X',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'unsure',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'N/A',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'no',
            ynPeerReview: 'yes',
            ynAvailableCode: 'N/A',
            ynAvailableData: 'N/A',
          },
          {
            author: {
              name: 'Sandhya Prabhakaran',
              orcid: '0000-0002-9537-507X',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'unsure',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'N/A',
            ynAvailableData: 'N/A',
          },
          {
            author: {
              name: 'Suhaila Rahman',
              orcid: '0000-0002-7946-5155',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'unsure',
            ynMethods: 'N/A',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'no',
            ynAvailableData: 'yes',
          },
          {
            author: {
              name: 'Ruchika Bajaj',
              orcid: '0000-0002-9777-0364',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'yes',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'yes',
            ynAvailableData: 'unsure',
          },
          {
            author: {
              name: 'Sepia Gorilla',
            },
            ynNovel: 'unsure',
            ynFuture: 'yes',
            ynReproducibility: 'unsure',
            ynMethods: 'unsure',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'N/A',
            ynAvailableData: 'no',
          },
          {
            author: {
              name: 'Manoj Kumar',
              orcid: '0000-0003-0772-1399',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'no',
            ynMethods: 'unsure',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'unsure',
            ynPeerReview: 'yes',
            ynAvailableCode: 'no',
            ynAvailableData: 'no',
          },
          {
            author: {
              name: 'Vivia Khosasih',
              orcid: '0000-0002-6451-3556',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'unsure',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'yes',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'unsure',
            ynAvailableData: 'unsure',
          },
          {
            author: {
              name: 'Raimi Morufu Olalekan',
              orcid: '0000-0001-5042-6729',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'yes',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'no',
            ynAvailableData: 'no',
          },
          {
            author: {
              name: 'Peren Coskun',
              orcid: '0000-0003-3521-0027',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'unsure',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'N/A',
            ynAvailableData: 'unsure',
          },
          {
            author: {
              name: 'Ali Mussa',
              orcid: '0000-0002-1116-7362',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'yes',
            ynMethods: 'yes',
            ynCoherent: 'no',
            ynLimitations: 'no',
            ynEthics: 'yes',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'yes',
            ynAvailableData: 'yes',
          },
          {
            author: {
              name: 'Nalaka Wijekoon',
              orcid: '0000-0002-3599-5357',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'unsure',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'unsure',
            ynEthics: 'unsure',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'N/A',
            ynAvailableData: 'N/A',
          },
          {
            author: {
              name: 'Sumaya Kambal',
              orcid: '0000-0003-3093-7251',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'yes',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'no',
            ynAvailableData: 'unsure',
          },
          {
            author: {
              name: 'Marioara Chiritoiu-Butnaru',
              orcid: '0000-0003-2064-2003',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'no',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'yes',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'N/A',
            ynAvailableData: 'N/A',
          },
          {
            author: {
              name: 'Emmanuel Boakye',
              orcid: '0000-0003-2043-5952',
            },
            ynNovel: 'yes',
            ynFuture: 'yes',
            ynReproducibility: 'yes',
            ynMethods: 'yes',
            ynCoherent: 'yes',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'yes',
            ynRecommend: 'yes',
            ynPeerReview: 'yes',
            ynAvailableCode: 'no',
            ynAvailableData: 'no',
          },
          {
            author: {
              name: 'Oluwaseun Adeolu Ogundijo',
              orcid: '0000-0002-7888-8279',
            },
            ynNovel: 'unsure',
            ynFuture: 'yes',
            ynReproducibility: 'yes',
            ynMethods: 'yes',
            ynCoherent: 'unsure',
            ynLimitations: 'no',
            ynEthics: 'no',
            ynNewData: 'unsure',
            ynRecommend: 'no',
            ynPeerReview: 'yes',
            ynAvailableCode: 'unsure',
            ynAvailableData: 'unsure',
          },
        ],
      },
    })

  await page.goto('/preprints/doi-10.1101-2022.02.14.480364')

  await page.getByRole('heading', { name: '19 Rapid PREreviews' }).scrollIntoViewIfNeeded()
  await expect(page).toHaveScreenshot()

  await page.getByRole('region', { name: 'Aggregated Rapid PREreviews' }).focus()
  await expect(page).toHaveScreenshot()
})
