import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import {
  Record,
  RecordC,
  Records,
  RecordsC,
  SubmittedDeposition,
  SubmittedDepositionC,
  UnsubmittedDeposition,
  UnsubmittedDepositionC,
} from 'zenodo-ts'
import { plainText, rawHtml } from '../src/html'
import * as _ from '../src/infrastructure'
import { NewPrereview } from '../src/write-review'
import * as fc from './fc'

import PlainDate = Temporal.PlainDate

describe('infrastructure', () => {
  describe('getPreprint', () => {
    describe('when the preprint can be loaded', () => {
      test.prop([fc.doi(), fc.plainDate()])('from AfricArXiv', async (doi, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          body: {
            status: 'ok',
            'message-type': 'work',
            'message-version': '1.0.0',
            message: {
              indexed: {
                'date-parts': [[2022, 4, 5]],
                'date-time': '2022-04-05T12:39:59Z',
                timestamp: 1649162399284,
              },
              posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              'group-title': 'AfricArXiv',
              'reference-count': 0,
              publisher: 'Center for Open Science',
              license: [
                {
                  start: {
                    'date-parts': [[2019, 9, 10]],
                    'date-time': '2019-09-10T00:00:00Z',
                    timestamp: 1568073600000,
                  },
                  'content-version': 'unspecified',
                  'delay-in-days': 0,
                  URL: 'http://www.gnu.org/licenses/gpl-2.0.txt',
                },
              ],
              'content-domain': { domain: [], 'crossmark-restriction': false },
              'short-container-title': [],
              abstract:
                '<p>The Beninese agricultural sector suffers mainly from a lack of financing. This study, conducted on a random sample of 150 households in Parakou commune, shows that participatory financing with a counterpart in agricultural product is an alternative to financing the production of local farms. Food among the population of Parakou consists mainly of cereals, particularly maize (according to 75% of households surveyed). Non-agricultural households purchase agricultural products according to their purchasing power and the economic situation. This study confirms that people are suffering from social injustice caused by an increase in product prices caused by the agricultural financing activity of loan sharks.  It should be noted that 75% of households are willing to adopt the participatory financing proposed in this article. Households are ready to buy at an average price of 12.172 XOF/Kg.</p>',
              DOI: '10.31730/osf.io/yv9az',
              type: 'posted-content',
              created: {
                'date-parts': [[2019, 9, 10]],
                'date-time': '2019-09-10T12:36:21Z',
                timestamp: 1568118981000,
              },
              source: 'Crossref',
              'is-referenced-by-count': 0,
              title: ['LE FINANCEMENT PARTICIPATIF\u00a0: UNE ALTERNATIVE AU FINANCEMENT AGRICOLE AU BENIN'],
              prefix: '10.31730',
              author: [{ given: 'Abdoul kafid Chabi', family: 'TOKO KOUTOGUI', sequence: 'first', affiliation: [] }],
              member: '15934',
              'container-title': [],
              'original-title': [],
              deposited: {
                'date-parts': [[2019, 9, 10]],
                'date-time': '2019-09-10T12:36:22Z',
                timestamp: 1568118982000,
              },
              score: 1,
              resource: { primary: { URL: 'https://osf.io/yv9az' } },
              subtitle: [],
              'short-title': [],
              issued: { 'date-parts': [[2019, 9, 10]] },
              'references-count': 0,
              URL: 'http://dx.doi.org/10.31730/osf.io/yv9az',
              relation: {},
              published: { 'date-parts': [[2019, 9, 10]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprint(doi)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: expect.stringContaining('<p>The Beninese agricultural sector'),
            },
            authors: [{ name: 'Abdoul kafid Chabi TOKO KOUTOGUI', orcid: undefined }],
            id: {
              type: 'africarxiv',
              doi: '10.31730/osf.io/yv9az',
            },
            posted,
            title: {
              language: 'fr',
              text: expect.stringContaining('LE FINANCEMENT PARTICIPATIF'),
            },
            url: new URL('https://osf.io/yv9az'),
          }),
        )
      })

      test.prop([fc.doi(), fc.sanitisedHtml(), fc.plainDate(), fc.constantFrom('bioRxiv', 'medRxiv')])(
        'from bioRxiv/medRxiv',
        async (doi, title, posted, server) => {
          const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
            body: {
              status: 'ok',
              'message-type': 'work',
              'message-version': '1.0.0',
              message: {
                institution: [{ name: server }],
                indexed: {
                  'date-parts': [[2022, 3, 30]],
                  'date-time': '2022-03-30T20:22:00Z',
                  timestamp: 1648671720584,
                },
                posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
                'group-title': 'Plant Biology',
                'reference-count': 53,
                publisher: 'Cold Spring Harbor Laboratory',
                'content-domain': { domain: [], 'crossmark-restriction': false },
                'short-container-title': [],
                accepted: { 'date-parts': [[2022, 1, 14]] },
                abstract:
                  '<jats:title>Abstract</jats:title><jats:p>Non-photochemical quenching (NPQ) is the process that protects photosynthetic organisms from photodamage by dissipating the energy absorbed in excess as heat. In the model green alga <jats:italic>Chlamydomonas reinhardtii</jats:italic>, NPQ was abolished in the knock-out mutants of the pigment-protein complexes LHCSR3 and LHCBM1. However, while LHCSR3 was shown to be a pH sensor and switching to a quenched conformation at low pH, the role of LHCBM1 in NPQ has not been elucidated yet. In this work, we combine biochemical and physiological measurements to study short-term high light acclimation of <jats:italic>npq5</jats:italic>, the mutant lacking LHCBM1. We show that while in low light in the absence of this complex, the antenna size of PSII is smaller than in its presence, this effect is marginal in high light, implying that a reduction of the antenna is not responsible for the low NPQ. We also show that the mutant expresses LHCSR3 at the WT level in high light, indicating that the absence of this complex is also not the reason. Finally, NPQ remains low in the mutant even when the pH is artificially lowered to values that can switch LHCSR3 to the quenched conformation. It is concluded that both LHCSR3 and LHCBM1 need to be present for the induction of NPQ and that LHCBM1 is the interacting partner of LHCSR3. This interaction can either enhance the quenching capacity of LHCSR3 or connect this complex with the PSII supercomplex.</jats:p>',
                DOI: '10.1101/2022.01.13.476201',
                type: 'posted-content',
                created: {
                  'date-parts': [[2022, 1, 15]],
                  'date-time': '2022-01-15T05:05:41Z',
                  timestamp: 1642223141000,
                },
                source: 'Crossref',
                'is-referenced-by-count': 0,
                title: [title.toString()],
                prefix: '10.1101',
                author: [
                  { given: 'Xin', family: 'Liu', sequence: 'first', affiliation: [] },
                  {
                    ORCID: 'http://orcid.org/0000-0001-5124-3000',
                    'authenticated-orcid': false,
                    given: 'Wojciech',
                    family: 'Nawrocki',
                    sequence: 'additional',
                    affiliation: [],
                  },
                  {
                    ORCID: 'http://orcid.org/0000-0003-3469-834X',
                    'authenticated-orcid': false,
                    given: 'Roberta',
                    family: 'Croce',
                    sequence: 'additional',
                    affiliation: [],
                  },
                ],
                member: '246',
                reference: [
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.1',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1073/pnas.1607695114',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.2',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1105/tpc.112.108274',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.3',
                    'doi-asserted-by': 'crossref',
                    'first-page': '44',
                    DOI: '10.1016/j.bbabio.2009.07.009',
                    'article-title':
                      'Redox and ATP control of photosynthetic cyclic electron flow in Chlamydomonas reinhardtii (I) aerobic conditions',
                    volume: '1797',
                    year: '2010',
                    'journal-title': 'Biochim Biophys Acta',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.4',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1146/annurev.arplant.59.032607.092759',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.5',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1371/journal.pbio.1000577',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.6',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1074/jbc.M111.304279',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.7',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1016/j.bpj.2011.03.049',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.8',
                    'doi-asserted-by': 'crossref',
                    unstructured:
                      'Croce R (2020) Beyond \u2018seeing is believing\u2019: the antenna size of the photosystems in vivo. New Phytol',
                    DOI: '10.1111/nph.16758',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.9',
                    'doi-asserted-by': 'crossref',
                    unstructured:
                      'Croce R , van Amerongen H (2020) Light harvesting in oxygenic photosynthesis: Structural biology meets spectroscopy. Science 369',
                    DOI: '10.1126/science.aay2058',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.10',
                    'doi-asserted-by': 'crossref',
                    'first-page': '1548',
                    DOI: '10.1016/j.bbabio.2013.11.020',
                    'article-title':
                      'Repressible chloroplast gene expression in Chlamydomonas: a new tool for the study of the photosynthetic apparatus',
                    volume: '1837',
                    year: '2014',
                    'journal-title': 'Biochim Biophys Acta',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.11',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1073/pnas.1605380113',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.12',
                    'doi-asserted-by': 'crossref',
                    'first-page': '63',
                    DOI: '10.1016/j.bbabio.2013.07.012',
                    'article-title':
                      'Light-harvesting complex II (LHCII) and its supramolecular organization in Chlamydomonas reinhardtii',
                    volume: '1837',
                    year: '2014',
                    'journal-title': 'Biochim Biophys Acta',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.13',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1111/tpj.12459',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.14',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1105/tpc.002154',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.15',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1186/1471-2148-10-233.',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.16',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1111/tpj.12825',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.17',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1038/nsmb.3068',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.18',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1074/jbc.M111.316729',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.19',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1093/jxb/erw462',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.20',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1073/pnas.54.6.1665',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.21',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1105/tpc.114.124198',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.22',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1073/pnas.0501268102',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.23',
                    'doi-asserted-by': 'crossref',
                    'first-page': '7755',
                    DOI: '10.1021/acs.jpclett.0c02098',
                    'article-title':
                      'Photoprotective Capabilities of Light-Harvesting Complex II Trimers in the Green Alga Chlamydomonas reinhardtii',
                    volume: '11',
                    year: '2020',
                    'journal-title': 'J Phys Chem Lett',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.24',
                    'first-page': '1',
                    'article-title': 'Chlorophyll a fluorescence induction1',
                    volume: '1412',
                    year: '1999',
                    'journal-title': 'Biochim Biophys Acta',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.25',
                    'doi-asserted-by': 'crossref',
                    'first-page': '667',
                    DOI: '10.1016/j.tplants.2018.05.004',
                    'article-title': 'Mechanisms of Photodamage and Protein Turnover in Photoinhibition',
                    volume: '23',
                    year: '2018',
                    'journal-title': 'Trends Plant Sci',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.26',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1038/35000131',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.27',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1021/ja4107463',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.28',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1126/science.1143609',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.29',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1007/s11120-004-2079-2',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.30',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1371/journal.pone.0119211',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.31',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1104/pp.18.01213',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.32',
                    'doi-asserted-by': 'crossref',
                    'first-page': 'eabj0055',
                    DOI: '10.1126/sciadv.abj0055',
                    'article-title':
                      'Molecular origins of induction and loss of photoinhibition-related energy dissipation qI',
                    volume: '7',
                    year: '2021',
                    'journal-title': 'Sci Adv',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.33',
                    'doi-asserted-by': 'crossref',
                    'first-page': '16031',
                    DOI: '10.1038/nplants.2016.31',
                    'article-title':
                      'State transitions redistribute rather than dissipate energy between the two photosystems in Chlamydomonas',
                    volume: '2',
                    year: '2016',
                    'journal-title': 'Nat Plants',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.34',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1111/j.1529-8817.1986.tb02497.x',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.35',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1128/EC.00418-07',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.36',
                    'doi-asserted-by': 'crossref',
                    'first-page': '1177',
                    DOI: '10.1038/s41477-019-0526-5',
                    'article-title': 'Disentangling the sites of non-photochemical quenching in vascular plants',
                    volume: '5',
                    year: '2019',
                    'journal-title': 'Nat Plants',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.37',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1105/tpc.9.8.1369',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.38',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1016/j.pbi.2013.03.011',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.39',
                    'first-page': '4622',
                    'article-title':
                      'Etude cinetique de la reaction photochimique liberant l\u2019oxygene au cours de la photosynthese',
                    volume: '258',
                    year: '1964',
                    'journal-title': 'CR Acad. Sci',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.40',
                    'doi-asserted-by': 'crossref',
                    'first-page': '148038',
                    DOI: '10.1016/j.bbabio.2019.06.010',
                    'article-title': 'Structural analysis and comparison of light-harvesting complexes I and II',
                    volume: '1861',
                    year: '2020',
                    'journal-title': 'Biochim Biophys Acta Bioenerg',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.41',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1038/nature08587',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.42',
                    'doi-asserted-by': 'crossref',
                    unstructured:
                      'Perozeni F , Stella GR , Ballottari M (2018) LHCSR Expression under HSP70/RBCS2 Promoter as a Strategy to Increase Productivity in Microalgae. Int J Mol Sci 19',
                    DOI: '10.3390/ijms19010155',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.43',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1104/pp.16.01310',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.44',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1105/tpc.112.103051',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.45',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1104/pp.15.01935',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.46',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1002/1873-3468.13111',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.47',
                    'doi-asserted-by': 'crossref',
                    'first-page': '379',
                    DOI: '10.1016/j.bbabio.2017.02.015',
                    'article-title':
                      'Interaction between the photoprotective protein LHCSR3 and C2S2 Photosystem II supercomplex in Chlamydomonas reinhardtii',
                    volume: '1858',
                    year: '2017',
                    'journal-title': 'Biochim Biophys Acta Bioenerg',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.48',
                    'doi-asserted-by': 'crossref',
                    'first-page': '1320',
                    DOI: '10.1038/s41477-019-0543-4',
                    'article-title': 'Structural insight into light harvesting for photosystem II in green algae',
                    volume: '5',
                    year: '2019',
                    'journal-title': 'Nat Plants',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.49',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1073/pnas.46.1.83',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.50',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1073/pnas.0509952103',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.51',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1073/pnas.1817796116',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.52',
                    'doi-asserted-by': 'publisher',
                    DOI: '10.1016/B978-0-12-405210-9.00007-2',
                  },
                  {
                    key: '2022011723300405000_2022.01.13.476201v1.53',
                    'doi-asserted-by': 'crossref',
                    unstructured:
                      'Xu P , Chukhutsina VU , Nawrocki WJ , Schansker G , Bielczynski LW , Lu Y , Karcher D , Bock R , Croce R (2020) Photosynthesis without beta-carotene. Elife 9',
                    DOI: '10.7554/eLife.58984',
                  },
                ],
                'container-title': [],
                'original-title': [],
                link: [
                  {
                    URL: 'https://syndication.highwire.org/content/doi/10.1101/2022.01.13.476201',
                    'content-type': 'unspecified',
                    'content-version': 'vor',
                    'intended-application': 'similarity-checking',
                  },
                ],
                deposited: {
                  'date-parts': [[2022, 1, 18]],
                  'date-time': '2022-01-18T07:30:32Z',
                  timestamp: 1642491032000,
                },
                score: 1,
                resource: { primary: { URL: 'http://biorxiv.org/lookup/doi/10.1101/2022.01.13.476201' } },
                subtitle: [],
                'short-title': [],
                issued: { 'date-parts': [[2022, 1, 14]] },
                'references-count': 53,
                URL: 'http://dx.doi.org/10.1101/2022.01.13.476201',
                relation: {},
                published: { 'date-parts': [[2022, 1, 14]] },
                subtype: 'preprint',
              },
            },
          })

          const actual = await _.getPreprint(doi)({ fetch })()

          expect(actual).toStrictEqual(
            E.right({
              abstract: {
                language: 'en',
                text: expect.anything(),
              },
              authors: [
                { name: 'Xin Liu', orcid: undefined },
                { name: 'Wojciech Nawrocki', orcid: '0000-0001-5124-3000' },
                { name: 'Roberta Croce', orcid: '0000-0003-3469-834X' },
              ],
              id: {
                type: server.toLowerCase(),
                doi: '10.1101/2022.01.13.476201',
              },
              posted,
              title: {
                language: 'en',
                text: title,
              },
              url: new URL('https://biorxiv.org/lookup/doi/10.1101/2022.01.13.476201'),
            }),
          )
        },
      )

      test.prop([fc.doi(), fc.plainDate()])('from EarthArXiv', async (doi, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          body: {
            status: 'ok',
            'message-type': 'work',
            'message-version': '1.0.0',
            message: {
              indexed: {
                'date-parts': [[2022, 10, 27]],
                'date-time': '2022-10-27T05:10:07Z',
                timestamp: 1666847407391,
              },
              posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              'group-title': 'Applied Statistics',
              'reference-count': 0,
              publisher: 'California Digital Library (CDL)',
              'content-domain': { domain: [], 'crossmark-restriction': false },
              'short-container-title': [],
              accepted: { 'date-parts': [[2022, 10, 24]] },
              abstract:
                '<jats:p>For many applications in environmental remote sensing, the interpretation of a given measurement depends strongly on what time of year the measurement was taken. This is particularly the case for phenology studies concerned with identifying when plant developmental transitions occur, but it is also true for a wide range of applications including vegetation species classification, crop yield estimation, and more. This study explores the use of Fisher Discriminant Analysis (FDA) as a method for extracting time-resolved information from multivariate environmental time series data. FDA is useful because it can be applied to multivariate input data and, for phenological estimation problems, produces a transformation that is physically interpretable. This work contains both theoretical and applied components. First, we use FDA to demonstrate the time-resolved nature of phenological information. Where curve-fitting and other commonly used data transformations that are sensitive to variation throughout a full time series, we show how FDA identifies application-relevant variation in specific variables at specific points in time. Next, we apply FDA to estimate county-average corn planting dates in the United States corn belt. We find that using multivariate data inputs can reduce prediction RMSE (in days) by 20% relative to models using only univariate inputs. We also compare FDA (which is linear) to nonlinear planting date estimation models based on curve-fitting and random forest estimators. We find that multivariate FDA models significantly improve on univariate curve-fitting and have comparable performance when using the same univariate inputs (despite the linearity of FDA). We also find that FDA-based approaches have lower RMSE than random forest in all configurations. Finally, we interpret FDA coefficients for individual measurements sensitive to vegetation density, land surface temperature, and soil moisture by relating them to physical mechanisms indicative of earlier or later planting.</jats:p>',
              DOI: '10.31223/x5h94p',
              type: 'posted-content',
              created: {
                'date-parts': [[2022, 10, 24]],
                'date-time': '2022-10-24T08:06:26Z',
                timestamp: 1666598786000,
              },
              source: 'Crossref',
              'is-referenced-by-count': 0,
              title: [
                'Fisher Discriminant Analysis for Extracting Interpretable Phenological Information from Multivariate Time Series Data',
              ],
              prefix: '10.31223',
              author: [
                {
                  ORCID: 'http://orcid.org/0000-0003-2637-0029',
                  'authenticated-orcid': false,
                  given: 'Conor',
                  family: 'Doherty',
                  sequence: 'first',
                  affiliation: [],
                },
                { given: 'Meagan', family: 'Mauter', sequence: 'additional', affiliation: [] },
              ],
              member: '29705',
              'container-title': [],
              'original-title': [],
              deposited: {
                'date-parts': [[2022, 10, 26]],
                'date-time': '2022-10-26T08:00:49Z',
                timestamp: 1666771249000,
              },
              score: 1,
              resource: { primary: { URL: 'http://eartharxiv.org/repository/view/4603/' } },
              subtitle: [],
              'short-title': [],
              issued: { 'date-parts': [[2022, 10, 26]] },
              'references-count': 0,
              URL: 'http://dx.doi.org/10.31223/x5h94p',
              relation: {},
              published: { 'date-parts': [[2022, 10, 26]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprint(doi)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: rawHtml(
                '<p>For many applications in environmental remote sensing, the interpretation of a given measurement depends strongly on what time of year the measurement was taken. This is particularly the case for phenology studies concerned with identifying when plant developmental transitions occur, but it is also true for a wide range of applications including vegetation species classification, crop yield estimation, and more. This study explores the use of Fisher Discriminant Analysis (FDA) as a method for extracting time-resolved information from multivariate environmental time series data. FDA is useful because it can be applied to multivariate input data and, for phenological estimation problems, produces a transformation that is physically interpretable. This work contains both theoretical and applied components. First, we use FDA to demonstrate the time-resolved nature of phenological information. Where curve-fitting and other commonly used data transformations that are sensitive to variation throughout a full time series, we show how FDA identifies application-relevant variation in specific variables at specific points in time. Next, we apply FDA to estimate county-average corn planting dates in the United States corn belt. We find that using multivariate data inputs can reduce prediction RMSE (in days) by 20% relative to models using only univariate inputs. We also compare FDA (which is linear) to nonlinear planting date estimation models based on curve-fitting and random forest estimators. We find that multivariate FDA models significantly improve on univariate curve-fitting and have comparable performance when using the same univariate inputs (despite the linearity of FDA). We also find that FDA-based approaches have lower RMSE than random forest in all configurations. Finally, we interpret FDA coefficients for individual measurements sensitive to vegetation density, land surface temperature, and soil moisture by relating them to physical mechanisms indicative of earlier or later planting.</p>',
              ),
            },
            authors: [
              {
                name: 'Conor Doherty',
                orcid: '0000-0003-2637-0029',
              },
              {
                name: 'Meagan Mauter',
                orcid: undefined,
              },
            ],
            id: {
              type: 'eartharxiv',
              doi: '10.31223/x5h94p',
            },
            posted,
            title: {
              language: 'en',
              text: rawHtml(
                'Fisher Discriminant Analysis for Extracting Interpretable Phenological Information from Multivariate Time Series Data',
              ),
            },
            url: new URL('https://eartharxiv.org/repository/view/4603/'),
          }),
        )
      })

      test.prop([fc.doi(), fc.plainDate()])('from EdArXiv', async (doi, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          body: {
            status: 'ok',
            'message-type': 'work',
            'message-version': '1.0.0',
            message: {
              indexed: { 'date-parts': [[2022, 8, 31]], 'date-time': '2022-08-31T01:11:09Z', timestamp: 1661908269867 },
              posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              'group-title': 'EdArXiv',
              'reference-count': 0,
              publisher: 'Center for Open Science',
              license: [
                {
                  start: {
                    'date-parts': [[2022, 5, 16]],
                    'date-time': '2022-05-16T00:00:00Z',
                    timestamp: 1652659200000,
                  },
                  'content-version': 'unspecified',
                  'delay-in-days': 0,
                  URL: 'https://creativecommons.org/licenses/by/4.0/legalcode',
                },
              ],
              'content-domain': { domain: [], 'crossmark-restriction': false },
              'short-container-title': [],
              abstract:
                '<p>Einer ihrer Kernt\u00e4tigkeiten nachkommend, erarbeiten Hochschuldozierende jedesSemester unter Einsatz personeller, zeitlicher und finanzieller Ressourcen eineVielzahl an Lehrkonzepten und Lehr-/Lernmaterialien. Lehrbezogenem Wissensmanagement, d. h. der systematischen, effizienten und nachhaltigen Nutzung von Wissen im Kontext Lehre, wird bis dato h\u00e4ufig wenig Bedeutung beigemessen. Das \u00fcbergreifende Ziel bestand deshalb darin, ein theoriebasiertes und praktikables Reflexionsinstrument zu entwickeln, das es Dozierenden erm\u00f6glicht, ihr p\u00e4dagogisches Arbeitshandeln respektive ihren Umgang mit lehrbezogenem Wissen aus einer wissensmanagementtheoretischen Perspektive in den Blick zu nehmen. In diesem Beitrag beschreiben wir die theoretische Fundierung, die Entwicklung, den Aufbau und wesentliche Einsatzm\u00f6glichkeiten des Instruments (LeWiMa). Es soll Dozierenden dabei helfen, ihr lehrbezogenes Wissensmanagement systematisch zu reflektieren, etwaige  Verbesserungspotenziale, Kompetenz- und Fortbildungsbedarfe zu erkennen und bedarfsorientierte Ma\u00dfnahmen zu ergreifen, durch die sie ihre Lehre mittel- und langfristig effizienter, systematischer, offener und nachhaltiger gestalten k\u00f6nnen.</p>',
              DOI: '10.35542/osf.io/dqw5h',
              type: 'posted-content',
              created: { 'date-parts': [[2022, 5, 16]], 'date-time': '2022-05-16T15:52:23Z', timestamp: 1652716343000 },
              source: 'Crossref',
              'is-referenced-by-count': 0,
              title: [
                'Lehrbezogenes Wissensmanagement in der Hochschullehre: Entwicklung, Beschreibung und Einsatzm\u00f6glichkeiten des Reflexionsinstruments LeWiMa',
              ],
              prefix: '10.35542',
              author: [
                {
                  ORCID: 'http://orcid.org/0000-0002-7065-1306',
                  'authenticated-orcid': true,
                  given: 'Stefan T.',
                  family: 'Siegel',
                  sequence: 'first',
                  affiliation: [],
                },
                { given: 'Astrid', family: 'Krummenauer-Grasser', sequence: 'additional', affiliation: [] },
                { given: 'Christine', family: 'Stahl', sequence: 'additional', affiliation: [] },
              ],
              member: '15934',
              'container-title': [],
              'original-title': [],
              deposited: {
                'date-parts': [[2022, 8, 31]],
                'date-time': '2022-08-31T00:29:16Z',
                timestamp: 1661905756000,
              },
              score: 1,
              resource: { primary: { URL: 'https://osf.io/dqw5h' } },
              subtitle: [],
              'short-title': [],
              issued: { 'date-parts': [[2022, 5, 16]] },
              'references-count': 0,
              URL: 'http://dx.doi.org/10.35542/osf.io/dqw5h',
              relation: {},
              published: { 'date-parts': [[2022, 5, 16]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprint(doi)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'de',
              text: rawHtml(
                '<p>Einer ihrer Kerntätigkeiten nachkommend, erarbeiten Hochschuldozierende jedesSemester unter Einsatz personeller, zeitlicher und finanzieller Ressourcen eineVielzahl an Lehrkonzepten und Lehr-/Lernmaterialien. Lehrbezogenem Wissensmanagement, d. h. der systematischen, effizienten und nachhaltigen Nutzung von Wissen im Kontext Lehre, wird bis dato häufig wenig Bedeutung beigemessen. Das übergreifende Ziel bestand deshalb darin, ein theoriebasiertes und praktikables Reflexionsinstrument zu entwickeln, das es Dozierenden ermöglicht, ihr pädagogisches Arbeitshandeln respektive ihren Umgang mit lehrbezogenem Wissen aus einer wissensmanagementtheoretischen Perspektive in den Blick zu nehmen. In diesem Beitrag beschreiben wir die theoretische Fundierung, die Entwicklung, den Aufbau und wesentliche Einsatzmöglichkeiten des Instruments (LeWiMa). Es soll Dozierenden dabei helfen, ihr lehrbezogenes Wissensmanagement systematisch zu reflektieren, etwaige  Verbesserungspotenziale, Kompetenz- und Fortbildungsbedarfe zu erkennen und bedarfsorientierte Maßnahmen zu ergreifen, durch die sie ihre Lehre mittel- und langfristig effizienter, systematischer, offener und nachhaltiger gestalten können.</p>',
              ),
            },
            authors: [
              {
                name: 'Stefan T. Siegel',
                orcid: '0000-0002-7065-1306',
              },
              {
                name: 'Astrid Krummenauer-Grasser',
                orcid: undefined,
              },
              {
                name: 'Christine Stahl',
                orcid: undefined,
              },
            ],
            id: {
              type: 'edarxiv',
              doi: '10.35542/osf.io/dqw5h',
            },
            posted,
            title: {
              language: 'de',
              text: rawHtml(
                'Lehrbezogenes Wissensmanagement in der Hochschullehre: Entwicklung, Beschreibung und Einsatzmöglichkeiten des Reflexionsinstruments LeWiMa',
              ),
            },
            url: new URL('https://osf.io/dqw5h'),
          }),
        )
      })

      test.prop([fc.doi(), fc.plainDate()])('from OSF', async (doi, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          body: {
            status: 'ok',
            'message-type': 'work',
            'message-version': '1.0.0',
            message: {
              indexed: { 'date-parts': [[2022, 8, 30]], 'date-time': '2022-08-30T22:12:51Z', timestamp: 1661897571277 },
              posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              'group-title': 'Open Science Framework',
              'reference-count': 0,
              publisher: 'Center for Open Science',
              license: [
                {
                  start: {
                    'date-parts': [[2021, 10, 11]],
                    'date-time': '2021-10-11T00:00:00Z',
                    timestamp: 1633910400000,
                  },
                  'content-version': 'unspecified',
                  'delay-in-days': 0,
                  URL: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode',
                },
              ],
              'content-domain': { domain: [], 'crossmark-restriction': false },
              'short-container-title': [],
              abstract:
                '<p>This article takes a look at the state of preservation in Hoi An, which is a world heritage and a famous tourist attraction in central Vietnam.</p>',
              DOI: '10.31219/osf.io/t9gbj',
              type: 'posted-content',
              created: {
                'date-parts': [[2021, 10, 11]],
                'date-time': '2021-10-11T09:19:19Z',
                timestamp: 1633943959000,
              },
              source: 'Crossref',
              'is-referenced-by-count': 0,
              title: ['Quy ho\u1ea1ch di s\u1ea3n: M\u1ed9t g\u00f3c nh\u00ecn t\u1eeb H\u1ed9i An'],
              prefix: '10.31219',
              author: [{ given: 'Tran Duc Hung', family: 'Long', sequence: 'first', affiliation: [] }],
              member: '15934',
              'container-title': [],
              'original-title': [],
              deposited: {
                'date-parts': [[2022, 8, 30]],
                'date-time': '2022-08-30T21:53:41Z',
                timestamp: 1661896421000,
              },
              score: 1,
              resource: { primary: { URL: 'https://osf.io/t9gbj' } },
              subtitle: [],
              'short-title': [],
              issued: { 'date-parts': [[2021, 10, 11]] },
              'references-count': 0,
              URL: 'http://dx.doi.org/10.31219/osf.io/t9gbj',
              relation: {},
              published: { 'date-parts': [[2021, 10, 11]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprint(doi)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: rawHtml(
                '<p>This article takes a look at the state of preservation in Hoi An, which is a world heritage and a famous tourist attraction in central Vietnam.</p>',
              ),
            },
            authors: [
              {
                name: 'Tran Duc Hung Long',
                orcid: undefined,
              },
            ],
            id: {
              type: 'osf',
              doi: '10.31219/osf.io/t9gbj',
            },
            posted,
            title: {
              language: 'vi',
              text: rawHtml('Quy hoạch di sản: Một góc nhìn từ Hội An'),
            },
            url: new URL('https://osf.io/t9gbj'),
          }),
        )
      })

      test.prop([fc.doi(), fc.plainDate()])('from PsyArXiv', async (doi, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          body: {
            status: 'ok',
            'message-type': 'work',
            'message-version': '1.0.0',
            message: {
              indexed: { 'date-parts': [[2022, 8, 30]], 'date-time': '2022-08-30T14:12:52Z', timestamp: 1661868772492 },
              posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              'group-title': 'PsyArXiv',
              'reference-count': 0,
              publisher: 'Center for Open Science',
              license: [
                {
                  start: {
                    'date-parts': [[2017, 1, 24]],
                    'date-time': '2017-01-24T00:00:00Z',
                    timestamp: 1485216000000,
                  },
                  'content-version': 'unspecified',
                  'delay-in-days': 0,
                  URL: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode',
                },
              ],
              'content-domain': { domain: [], 'crossmark-restriction': false },
              'short-container-title': [],
              abstract:
                '<p>We review how often distortions on the cognitive mechanisms underlying the virtuosism of mental athletes, including the frequent link to autistic savants or synesthesia, result from the confusion, misconceptions and even lack of rigor found in scientific literature. We present specific cases were ignorance about the basic training techniques of mental athlete\u2019s world causes serious interpretation and methodological problems. Calculations seem obviously more impressive if they mysteriously pop-out in the air from unexplained virtues of an unexplained brain. The task of cognitive neuroscience is the opposite. It is to find and reveal the trick and seek to unfold which operations (often much more normal than they seem) result in these seemingly extraordinary performances.</p>',
              DOI: '10.31234/osf.io/23akm',
              type: 'posted-content',
              created: { 'date-parts': [[2018, 7, 2]], 'date-time': '2018-07-02T10:43:11Z', timestamp: 1530528191000 },
              source: 'Crossref',
              'is-referenced-by-count': 0,
              title: ['Dazzled by the mystery of mentalism: The cognitive neuroscience of mental athletes'],
              prefix: '10.31219',
              author: [
                { given: 'Andr\u00e9s', family: 'Rieznik', sequence: 'first', affiliation: [] },
                { given: 'Mariano', family: 'Sigman', sequence: 'additional', affiliation: [] },
              ],
              member: '15934',
              'container-title': [],
              'original-title': [],
              deposited: {
                'date-parts': [[2022, 8, 30]],
                'date-time': '2022-08-30T13:49:02Z',
                timestamp: 1661867342000,
              },
              score: 1,
              resource: { primary: { URL: 'https://osf.io/23akm' } },
              subtitle: [],
              'short-title': [],
              issued: { 'date-parts': [[2017, 1, 24]] },
              'references-count': 0,
              URL: 'http://dx.doi.org/10.31234/osf.io/23akm',
              relation: {},
              published: { 'date-parts': [[2017, 1, 24]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprint(doi)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: rawHtml(
                '<p>We review how often distortions on the cognitive mechanisms underlying the virtuosism of mental athletes, including the frequent link to autistic savants or synesthesia, result from the confusion, misconceptions and even lack of rigor found in scientific literature. We present specific cases were ignorance about the basic training techniques of mental athlete\u2019s world causes serious interpretation and methodological problems. Calculations seem obviously more impressive if they mysteriously pop-out in the air from unexplained virtues of an unexplained brain. The task of cognitive neuroscience is the opposite. It is to find and reveal the trick and seek to unfold which operations (often much more normal than they seem) result in these seemingly extraordinary performances.</p>',
              ),
            },
            authors: [
              {
                name: 'Andrés Rieznik',
                orcid: undefined,
              },
              {
                name: 'Mariano Sigman',
                orcid: undefined,
              },
            ],
            id: {
              type: 'psyarxiv',
              doi: '10.31234/osf.io/23akm',
            },
            posted,
            title: {
              language: 'en',
              text: rawHtml('Dazzled by the mystery of mentalism: The cognitive neuroscience of mental athletes'),
            },
            url: new URL('https://osf.io/23akm'),
          }),
        )
      })

      test.prop([fc.doi(), fc.plainDate()])('from Research Square', async (doi, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          body: {
            status: 'ok',
            'message-type': 'work',
            'message-version': '1.0.0',
            message: {
              institution: [{ name: 'Research Square' }],
              indexed: {
                'date-parts': [[2022, 7, 28]],
                'date-time': '2022-07-28T17:43:48Z',
                timestamp: 1659030228294,
              },
              posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              'group-title': 'In Review',
              'reference-count': 0,
              publisher: 'Research Square Platform LLC',
              license: [
                {
                  start: {
                    'date-parts': [[2018, 10, 18]],
                    'date-time': '2018-10-18T00:00:00Z',
                    timestamp: 1539820800000,
                  },
                  'content-version': 'unspecified',
                  'delay-in-days': 0,
                  URL: 'https://creativecommons.org/licenses/by/4.0/',
                },
              ],
              'content-domain': {
                domain: [],
                'crossmark-restriction': false,
              },
              'short-container-title': [],
              accepted: {
                'date-parts': [[2018, 10, 18]],
              },
              abstract:
                '<jats:title>Abstract</jats:title>\n        <jats:p>The evidence base available to trialists to support trial process decisions– e.g. how best to recruit and retain participants, how to collect data or how to share the results with participants – is thin. One way to fill gaps in evidence is to run Studies Within A Trial, or SWATs. These are self-contained research studies embedded within a host trial that aim to evaluate or explore alternative ways of delivering or organising a particular trial process.\nSWATs are increasingly being supported by funders and considered by trialists, especially in the UK and Ireland. At some point, increasing SWAT evidence will lead funders and trialists to ask : given the current body of evidence for a SWAT, do we need a further evaluation in a another host trial? A framework for answering such a question is needed to avoid SWATs themselves contributing to research waste.\nThis paper presents criteria on when enough evidence is available for SWATs that use randomised allocation to compare different interventions.</jats:p>',
              DOI: '10.21203/rs.1.1/v1',
              type: 'posted-content',
              created: {
                'date-parts': [[2018, 10, 22]],
                'date-time': '2018-10-22T18:43:21Z',
                timestamp: 1540233801000,
              },
              source: 'Crossref',
              'is-referenced-by-count': 1,
              title: ['Trial Forge Guidance 2: How to decide if a further Study Within A Trial (SWAT) is needed'],
              prefix: '10.21203',
              author: [
                {
                  ORCID: 'http://orcid.org/0000-0002-7239-7241',
                  'authenticated-orcid': false,
                  given: 'Shaun',
                  family: 'Treweek',
                  sequence: 'first',
                  affiliation: [{ name: 'University of Aberdeen' }],
                },
                {
                  given: 'Simon',
                  family: 'Bevan',
                  sequence: 'additional',
                  affiliation: [
                    {
                      name: 'National Institute for Health Research Evaluation, Trials and Studies Coordinating Centre',
                    },
                  ],
                },
                {
                  given: 'Peter',
                  family: 'Bower',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of Manchester' }],
                },
                {
                  given: 'Matthias',
                  family: 'Briel',
                  sequence: 'additional',
                  affiliation: [{ name: 'University Hospital Basel' }],
                },
                {
                  given: 'Marion',
                  family: 'Campbell',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of Aberdeen' }],
                },
                {
                  given: 'Jacquie',
                  family: 'Christie',
                  sequence: 'additional',
                  affiliation: [{ name: 'GSK Medicines Research Centre' }],
                },
                {
                  given: 'Clive',
                  family: 'Collett',
                  sequence: 'additional',
                  affiliation: [{ name: 'Health Research Authority' }],
                },
                {
                  given: 'Seonaidh',
                  family: 'Cotton',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of Aberdeen' }],
                },
                {
                  given: 'Declan',
                  family: 'Devane',
                  sequence: 'additional',
                  affiliation: [{ name: 'National University of Ireland Galway' }],
                },
                {
                  given: 'Adel El',
                  family: 'Feky',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of Aberdeen' }],
                },
                {
                  given: 'Sandra',
                  family: 'Galvin',
                  sequence: 'additional',
                  affiliation: [{ name: 'National University of Ireland Galway' }],
                },
                {
                  given: 'Heidi',
                  family: 'Gardner',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of Aberdeen' }],
                },
                {
                  given: 'Katie',
                  family: 'Gillies',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of Aberdeen' }],
                },
                {
                  given: 'Kerenza',
                  family: 'Hood',
                  sequence: 'additional',
                  affiliation: [{ name: 'Cardiff University' }],
                },
                {
                  given: 'Jan',
                  family: 'Jansen',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of Alabama at Birmingham' }],
                },
                {
                  given: 'Roberta',
                  family: 'Littleford',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of Dundee' }],
                },
                {
                  given: 'Adwoa',
                  family: 'Parker',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of York' }],
                },
                {
                  given: 'Craig',
                  family: 'Ramsay',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of Aberdeen' }],
                },
                {
                  given: 'Lynne',
                  family: 'Restrup',
                  sequence: 'additional',
                  affiliation: [{ name: 'Public and Patient Representative' }],
                },
                {
                  given: 'Frank',
                  family: 'Sullivan',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of St Andrews' }],
                },
                {
                  given: 'David',
                  family: 'Torgerson',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of York' }],
                },
                {
                  given: 'Liz',
                  family: 'Tremain',
                  sequence: 'additional',
                  affiliation: [
                    {
                      name: 'National Institute for Health Research Evaluation, Trials and Studies Coordinating Centre',
                    },
                  ],
                },
                {
                  given: 'Erik',
                  family: 'von Elm',
                  sequence: 'additional',
                  affiliation: [{ name: 'Lausanne University Hospital' }],
                },
                {
                  given: 'Matthew',
                  family: 'Westmore',
                  sequence: 'additional',
                  affiliation: [
                    {
                      name: 'National Institute for Health Research Evaluation Trials and Studies Coordinating Centre',
                    },
                  ],
                },
                {
                  given: 'Hywel',
                  family: 'Williams',
                  sequence: 'additional',
                  affiliation: [{ name: 'Nottingham University Hospitals NHS Trust' }],
                },
                {
                  given: 'Paula R',
                  family: 'Williamson',
                  sequence: 'additional',
                  affiliation: [{ name: 'University of Liverpool' }],
                },
                {
                  given: 'Mike',
                  family: 'Clarke',
                  sequence: 'additional',
                  affiliation: [{ name: "Queen's University Belfast" }],
                },
              ],
              member: '8761',
              'container-title': [],
              'original-title': [],
              link: [
                {
                  URL: 'https://www.researchsquare.com/article/rs-2/v1',
                  'content-type': 'text/html',
                  'content-version': 'vor',
                  'intended-application': 'text-mining',
                },
                {
                  URL: 'https://www.researchsquare.com/article/rs-2/v1.html',
                  'content-type': 'unspecified',
                  'content-version': 'vor',
                  'intended-application': 'similarity-checking',
                },
              ],
              deposited: {
                'date-parts': [[2022, 7, 28]],
                'date-time': '2022-07-28T17:17:54Z',
                timestamp: 1659028674000,
              },
              score: 1,
              resource: {
                primary: {
                  URL: 'https://www.researchsquare.com/article/rs-2/v1',
                },
              },
              subtitle: [],
              'short-title': [],
              issued: { 'date-parts': [[2018, 10, 18]] },
              'references-count': 0,
              URL: 'http://dx.doi.org/10.21203/rs.1.1/v1',
              relation: {
                'is-preprint-of': [
                  {
                    'id-type': 'doi',
                    id: '10.1186/s13063-019-3980-5',
                    'asserted-by': 'subject',
                  },
                ],
              },
              published: { 'date-parts': [[2018, 10, 18]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprint(doi)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: expect.anything(),
            },
            authors: [
              {
                name: 'Shaun Treweek',
                orcid: '0000-0002-7239-7241',
              },
              {
                name: 'Simon Bevan',
                orcid: undefined,
              },
              {
                name: 'Peter Bower',
                orcid: undefined,
              },
              {
                name: 'Matthias Briel',
                orcid: undefined,
              },
              {
                name: 'Marion Campbell',
                orcid: undefined,
              },
              {
                name: 'Jacquie Christie',
                orcid: undefined,
              },
              {
                name: 'Clive Collett',
                orcid: undefined,
              },
              {
                name: 'Seonaidh Cotton',
                orcid: undefined,
              },
              {
                name: 'Declan Devane',
                orcid: undefined,
              },
              {
                name: 'Adel El Feky',
                orcid: undefined,
              },
              {
                name: 'Sandra Galvin',
                orcid: undefined,
              },
              {
                name: 'Heidi Gardner',
                orcid: undefined,
              },
              {
                name: 'Katie Gillies',
                orcid: undefined,
              },
              {
                name: 'Kerenza Hood',
                orcid: undefined,
              },
              {
                name: 'Jan Jansen',
                orcid: undefined,
              },
              {
                name: 'Roberta Littleford',
                orcid: undefined,
              },
              {
                name: 'Adwoa Parker',
                orcid: undefined,
              },
              {
                name: 'Craig Ramsay',
                orcid: undefined,
              },
              {
                name: 'Lynne Restrup',
                orcid: undefined,
              },
              {
                name: 'Frank Sullivan',
                orcid: undefined,
              },
              {
                name: 'David Torgerson',
                orcid: undefined,
              },
              {
                name: 'Liz Tremain',
                orcid: undefined,
              },
              {
                name: 'Erik von Elm',
                orcid: undefined,
              },
              {
                name: 'Matthew Westmore',
                orcid: undefined,
              },
              {
                name: 'Hywel Williams',
                orcid: undefined,
              },
              {
                name: 'Paula R Williamson',
                orcid: undefined,
              },
              {
                name: 'Mike Clarke',
                orcid: undefined,
              },
            ],
            id: {
              type: 'research-square',
              doi: '10.21203/rs.1.1/v1',
            },
            posted,
            title: {
              language: 'en',
              text: rawHtml('Trial Forge Guidance 2: How to decide if a further Study Within A Trial (SWAT) is needed'),
            },
            url: new URL('https://www.researchsquare.com/article/rs-2/v1'),
          }),
        )
      })

      test.prop([fc.doi(), fc.plainDate()])('from SciELO', async (doi, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          body: {
            status: 'ok',
            'message-type': 'work',
            'message-version': '1.0.0',
            message: {
              indexed: {
                'date-parts': [[2022, 8, 5]],
                'date-time': '2022-08-05T20:13:26Z',
                timestamp: 1659730406209,
              },
              posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              'reference-count': 0,
              publisher: 'FapUNIFESP (SciELO)',
              license: [
                {
                  start: {
                    'date-parts': [[2022, 8, 5]],
                    'date-time': '2022-08-05T00:00:00Z',
                    timestamp: 1659657600000,
                  },
                  'content-version': 'unspecified',
                  'delay-in-days': 0,
                  URL: 'https://creativecommons.org/licenses/by/4.0',
                },
              ],
              'content-domain': { domain: [], 'crossmark-restriction': false },
              'short-container-title': [],
              abstract:
                '<jats:p>El art\u00edculo aborda la extensi\u00f3n universitaria como un proceso formativo en el contexto de la Universidad de Pinar del R\u00edo, Cuba. \u00a0El objetivo estuvo dirigido a su socializar un enfoque reflexivo \u2013 cr\u00edtico acerca del car\u00e1cter formativo de la extensi\u00f3n universitaria fundamentado en cuatro concepciones pedag\u00f3gicas, de las que se presentan sus ejes fundamentales. El estudio se realiz\u00f3 desde el enfoque cualitativo y como m\u00e9todos fundamentales estuvieron el dial\u00e9ctico- materialista como soporte te\u00f3rico, pr\u00e1ctico y metodol\u00f3gico de la investigaci\u00f3n, as\u00ed como te\u00f3ricos como el hist\u00f3rico\u2013l\u00f3gico en correspondencia con cada una de las concepciones dirigidas a la formaci\u00f3n para la promoci\u00f3n de lectura, la formaci\u00f3n de promotores de estilos de vida saludables, la formaci\u00f3n para la labor extensionista del estudiante y la gesti\u00f3n de la extensi\u00f3n en el Departamento Docente. Las conclusiones que se presentan, son de tipo te\u00f3rico y resultan generalizables a contextos universitarios y territoriales de manera general, permitieron corroborar el car\u00e1cter formativo del proceso, dado en la transversalidad, la profesionalizaci\u00f3n, la formaci\u00f3n integral, el Departamento docente, como c\u00e9lula de trabajo extensionista y las relaciones de jerarquizaci\u00f3n, coordinaci\u00f3n, subordinaci\u00f3n entre los diferentes actores universitarios.</jats:p>',
              DOI: '10.1590/scielopreprints.4502',
              type: 'posted-content',
              created: {
                'date-parts': [[2022, 8, 5]],
                'date-time': '2022-08-05T19:53:57Z',
                timestamp: 1659729237000,
              },
              source: 'Crossref',
              'is-referenced-by-count': 0,
              title: ['Systematization about university extension as a process'],
              prefix: '10.1590',
              author: [
                {
                  ORCID: 'http://orcid.org/0000-0003-3232-9372',
                  'authenticated-orcid': false,
                  given: 'Yudit Rovira',
                  family: 'Alvarez',
                  sequence: 'first',
                  affiliation: [],
                },
                { given: 'Ayl\u00e9n Rojas', family: 'Vald\u00e9s', sequence: 'additional', affiliation: [] },
                { given: 'Manuel Vento', family: 'Ruizcalder\u00f3n', sequence: 'additional', affiliation: [] },
                { given: 'Osmani Alvarez', family: 'Bencomo', sequence: 'additional', affiliation: [] },
              ],
              member: '530',
              'container-title': [],
              'original-title': [],
              deposited: {
                'date-parts': [[2022, 8, 5]],
                'date-time': '2022-08-05T19:55:40Z',
                timestamp: 1659729340000,
              },
              score: 1,
              resource: {
                primary: { URL: 'https://preprints.scielo.org/index.php/scielo/preprint/view/4502/version/4765' },
              },
              subtitle: [],
              'short-title': [],
              issued: { 'date-parts': [[2022, 8, 5]] },
              'references-count': 0,
              URL: 'http://dx.doi.org/10.1590/scielopreprints.4502',
              relation: {},
              published: { 'date-parts': [[2022, 8, 5]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprint(doi)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'es',
              text: expect.anything(),
            },
            authors: [
              { name: 'Yudit Rovira Alvarez', orcid: '0000-0003-3232-9372' },
              { name: 'Aylén Rojas Valdés', orcid: undefined },
              { name: 'Manuel Vento Ruizcalderón', orcid: undefined },
              { name: 'Osmani Alvarez Bencomo', orcid: undefined },
            ],
            id: {
              type: 'scielo',
              doi: '10.1590/scielopreprints.4502',
            },
            posted,
            title: {
              language: 'en',
              text: rawHtml('Systematization about university extension as a process'),
            },
            url: new URL('https://preprints.scielo.org/index.php/scielo/preprint/view/4502/version/4765'),
          }),
        )
      })

      test.prop([fc.doi(), fc.plainDate()])('from SocArXiv', async (doi, posted) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          body: {
            status: 'ok',
            'message-type': 'work',
            'message-version': '1.0.0',
            message: {
              indexed: {
                'date-parts': [[2022, 11, 28]],
                'date-time': '2022-11-28T05:27:53Z',
                timestamp: 1669613273003,
              },
              posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
              'group-title': 'SocArXiv',
              'reference-count': 0,
              publisher: 'Center for Open Science',
              license: [
                {
                  start: {
                    'date-parts': [[2022, 11, 26]],
                    'date-time': '2022-11-26T00:00:00Z',
                    timestamp: 1669420800000,
                  },
                  'content-version': 'unspecified',
                  'delay-in-days': 0,
                  URL: 'https://creativecommons.org/licenses/by/4.0/legalcode',
                },
              ],
              'content-domain': { domain: [], 'crossmark-restriction': false },
              'short-container-title': [],
              abstract:
                '<p>The restitution of a S\u00e1mi drum confiscated in 1691 in Karasjok, present-day  Norway, was made in early 2022. This good incorporates historical meaning, culture and own values as well as marks of colonization and inequalities in S\u00e1pmi. It can talk about the long coloniality and racist invisibilization in the far north of Europe and about the historical resistances and current processes for justice andreparation. A bibliographical synthesis is presented on the Eurocentric invention of races operated from the center of Europe in which it aimed particularly at the S\u00e1mi populations, their lands and cultures, with colonial, patriarchal and capacitist demarcations. Possible lines of intervention and reconfiguration of the work on biographical and bibliographical sources that sustain, encourage anddisseminate the incorporation of knowledge inherited and to be passed on by originary cultures with recognition and justice.</p>',
              DOI: '10.31235/osf.io/ny6h2',
              type: 'posted-content',
              created: {
                'date-parts': [[2022, 11, 27]],
                'date-time': '2022-11-27T05:00:33Z',
                timestamp: 1669525233000,
              },
              source: 'Crossref',
              'is-referenced-by-count': 0,
              title: [
                'Um tambor s\u00e1mi restitu\u00eddo: culturas origin\u00e1rias europeias e colonialismo no \u00c1rtico',
              ],
              prefix: '10.31235',
              author: [
                {
                  ORCID: 'http://orcid.org/0000-0003-2069-5631',
                  'authenticated-orcid': true,
                  given: 'Paula',
                  family: 'Sequeiros',
                  sequence: 'first',
                  affiliation: [],
                },
              ],
              member: '15934',
              'container-title': [],
              'original-title': [],
              deposited: {
                'date-parts': [[2022, 11, 27]],
                'date-time': '2022-11-27T05:00:34Z',
                timestamp: 1669525234000,
              },
              score: 1,
              resource: { primary: { URL: 'https://osf.io/ny6h2' } },
              subtitle: [],
              'short-title': [],
              issued: { 'date-parts': [[2022, 11, 26]] },
              'references-count': 0,
              URL: 'http://dx.doi.org/10.31235/osf.io/ny6h2',
              relation: {},
              published: { 'date-parts': [[2022, 11, 26]] },
              subtype: 'preprint',
            },
          },
        })

        const actual = await _.getPreprint(doi)({ fetch })()

        expect(actual).toStrictEqual(
          E.right({
            abstract: {
              language: 'en',
              text: rawHtml(
                '<p>The restitution of a Sámi drum confiscated in 1691 in Karasjok, present-day  Norway, was made in early 2022. This good incorporates historical meaning, culture and own values as well as marks of colonization and inequalities in Sápmi. It can talk about the long coloniality and racist invisibilization in the far north of Europe and about the historical resistances and current processes for justice andreparation. A bibliographical synthesis is presented on the Eurocentric invention of races operated from the center of Europe in which it aimed particularly at the Sámi populations, their lands and cultures, with colonial, patriarchal and capacitist demarcations. Possible lines of intervention and reconfiguration of the work on biographical and bibliographical sources that sustain, encourage anddisseminate the incorporation of knowledge inherited and to be passed on by originary cultures with recognition and justice.</p>',
              ),
            },
            authors: [
              {
                name: 'Paula Sequeiros',
                orcid: '0000-0003-2069-5631',
              },
            ],
            id: {
              type: 'socarxiv',
              doi: '10.31235/osf.io/ny6h2',
            },
            posted,
            title: {
              language: 'pt',
              text: rawHtml('Um tambor sámi restituído: culturas originárias europeias e colonialismo no Ártico'),
            },
            url: new URL('https://osf.io/ny6h2'),
          }),
        )
      })

      test.prop([fc.doi(), fc.plainDate()])('when the response is stale', async (doi, posted) => {
        const fetch = fetchMock
          .sandbox()
          .getOnce(
            (url, { cache }) =>
              url === `https://api.crossref.org/works/${encodeURIComponent(doi)}` && cache === 'force-cache',
            {
              body: {
                status: 'ok',
                'message-type': 'work',
                'message-version': '1.0.0',
                message: {
                  indexed: {
                    'date-parts': [[2022, 8, 5]],
                    'date-time': '2022-08-05T20:13:26Z',
                    timestamp: 1659730406209,
                  },
                  posted: { 'date-parts': [[posted.year, posted.month, posted.day]] },
                  'reference-count': 0,
                  publisher: 'FapUNIFESP (SciELO)',
                  license: [
                    {
                      start: {
                        'date-parts': [[2022, 8, 5]],
                        'date-time': '2022-08-05T00:00:00Z',
                        timestamp: 1659657600000,
                      },
                      'content-version': 'unspecified',
                      'delay-in-days': 0,
                      URL: 'https://creativecommons.org/licenses/by/4.0',
                    },
                  ],
                  'content-domain': { domain: [], 'crossmark-restriction': false },
                  'short-container-title': [],
                  abstract:
                    '<jats:p>El art\u00edculo aborda la extensi\u00f3n universitaria como un proceso formativo en el contexto de la Universidad de Pinar del R\u00edo, Cuba. \u00a0El objetivo estuvo dirigido a su socializar un enfoque reflexivo \u2013 cr\u00edtico acerca del car\u00e1cter formativo de la extensi\u00f3n universitaria fundamentado en cuatro concepciones pedag\u00f3gicas, de las que se presentan sus ejes fundamentales. El estudio se realiz\u00f3 desde el enfoque cualitativo y como m\u00e9todos fundamentales estuvieron el dial\u00e9ctico- materialista como soporte te\u00f3rico, pr\u00e1ctico y metodol\u00f3gico de la investigaci\u00f3n, as\u00ed como te\u00f3ricos como el hist\u00f3rico\u2013l\u00f3gico en correspondencia con cada una de las concepciones dirigidas a la formaci\u00f3n para la promoci\u00f3n de lectura, la formaci\u00f3n de promotores de estilos de vida saludables, la formaci\u00f3n para la labor extensionista del estudiante y la gesti\u00f3n de la extensi\u00f3n en el Departamento Docente. Las conclusiones que se presentan, son de tipo te\u00f3rico y resultan generalizables a contextos universitarios y territoriales de manera general, permitieron corroborar el car\u00e1cter formativo del proceso, dado en la transversalidad, la profesionalizaci\u00f3n, la formaci\u00f3n integral, el Departamento docente, como c\u00e9lula de trabajo extensionista y las relaciones de jerarquizaci\u00f3n, coordinaci\u00f3n, subordinaci\u00f3n entre los diferentes actores universitarios.</jats:p>',
                  DOI: '10.1590/scielopreprints.4502',
                  type: 'posted-content',
                  created: {
                    'date-parts': [[2022, 8, 5]],
                    'date-time': '2022-08-05T19:53:57Z',
                    timestamp: 1659729237000,
                  },
                  source: 'Crossref',
                  'is-referenced-by-count': 0,
                  title: ['Systematization about university extension as a process'],
                  prefix: '10.1590',
                  author: [
                    {
                      ORCID: 'http://orcid.org/0000-0003-3232-9372',
                      'authenticated-orcid': false,
                      given: 'Yudit Rovira',
                      family: 'Alvarez',
                      sequence: 'first',
                      affiliation: [],
                    },
                    { given: 'Ayl\u00e9n Rojas', family: 'Vald\u00e9s', sequence: 'additional', affiliation: [] },
                    { given: 'Manuel Vento', family: 'Ruizcalder\u00f3n', sequence: 'additional', affiliation: [] },
                    { given: 'Osmani Alvarez', family: 'Bencomo', sequence: 'additional', affiliation: [] },
                  ],
                  member: '530',
                  'container-title': [],
                  'original-title': [],
                  deposited: {
                    'date-parts': [[2022, 8, 5]],
                    'date-time': '2022-08-05T19:55:40Z',
                    timestamp: 1659729340000,
                  },
                  score: 1,
                  resource: {
                    primary: {
                      URL: 'https://preprints.scielo.org/index.php/scielo/preprint/view/4502/version/4765',
                    },
                  },
                  subtitle: [],
                  'short-title': [],
                  issued: { 'date-parts': [[2022, 8, 5]] },
                  'references-count': 0,
                  URL: 'http://dx.doi.org/10.1590/scielopreprints.4502',
                  relation: {},
                  published: { 'date-parts': [[2022, 8, 5]] },
                  subtype: 'preprint',
                },
              },
              headers: { 'X-Local-Cache-Status': 'stale' },
            },
          )
          .getOnce(
            (url, { cache }) =>
              url === `https://api.crossref.org/works/${encodeURIComponent(doi)}` && cache === 'no-cache',
            { throws: new Error('Network error') },
          )

        const actual = await _.getPreprint(doi)({ fetch })()

        expect(actual).toStrictEqual(
          E.right(
            expect.objectContaining({
              title: { language: 'en', text: rawHtml('Systematization about university extension as a process') },
            }),
          ),
        )
        expect(fetch.done()).toBeTruthy()
      })
    })

    test.prop([fc.doi()])('when the preprint is not found', async doi => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { status: Status.NotFound })

      const actual = await _.getPreprint(doi)({ fetch })()

      expect(actual).toStrictEqual(E.left('not-found'))
    })

    test.prop([fc.doi(), fc.record({ status: fc.integer(), body: fc.string() })])(
      'when the preprint cannot be loaded',
      async (doi, response) => {
        const fetch = fetchMock.sandbox().getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, response)

        const actual = await _.getPreprint(doi)({ fetch })()

        expect(actual).toStrictEqual(E.left('unavailable'))
      },
    )
  })

  describe('getPrereview', () => {
    test.prop([
      fc.integer(),
      fc.record({
        doi: fc.preprintDoi(),
        language: fc.languageCode(),
        title: fc.html(),
      }),
    ])('when the PREreview can be loaded', async (id, preprint) => {
      const record: Record = {
        conceptdoi: '10.5072/zenodo.1061863' as Doi,
        conceptrecid: 1061863,
        files: [
          {
            links: {
              self: new URL('http://example.com/file'),
            },
            key: 'review.html',
            type: 'html',
            size: 58,
          },
        ],
        id,
        links: {
          latest: new URL('http://example.com/latest'),
          latest_html: new URL('http://example.com/latest_html'),
        },
        metadata: {
          communities: [{ id: 'prereview-reviews' }],
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: '10.5281/zenodo.1061864' as Doi,
          license: {
            id: 'CC-BY-4.0',
          },
          publication_date: new Date('2022-07-05'),
          related_identifiers: [
            {
              scheme: 'doi',
              identifier: preprint.doi,
              relation: 'reviews',
              resource_type: 'publication-preprint',
            },
          ],
          resource_type: {
            type: 'publication',
            subtype: 'article',
          },
          title: 'Title',
        },
      }

      const getPreprintTitle = jest.fn(_ => TE.right(preprint))

      const actual = await _.getPrereview(id)({
        fetch: fetchMock
          .sandbox()
          .getOnce(`https://zenodo.org/api/records/${id}`, {
            body: RecordC.encode(record),
            status: Status.OK,
          })
          .getOnce(
            { url: 'http://example.com/file', functionMatcher: (_, req) => req.cache === 'force-cache' },
            { body: 'Some text' },
          ),
        getPreprintTitle,
      })()

      expect(actual).toStrictEqual(
        E.right({
          authors: [{ name: 'PREreviewer' }],
          doi: '10.5281/zenodo.1061864' as Doi,
          license: 'CC-BY-4.0',
          postedDate: PlainDate.from('2022-07-05'),
          preprint,
          text: rawHtml('Some text'),
        }),
      )
      expect(getPreprintTitle).toHaveBeenCalledWith(preprint.doi)
    })

    test.prop([
      fc.integer(),
      fc.record({
        doi: fc.preprintDoi(),
        language: fc.languageCode(),
        title: fc.html(),
      }),
    ])('revalidates if the PREreview is stale', async (id, preprint) => {
      const record: Record = {
        conceptdoi: '10.5072/zenodo.1061863' as Doi,
        conceptrecid: 1061863,
        files: [
          {
            links: {
              self: new URL('http://example.com/file'),
            },
            key: 'review.html',
            type: 'html',
            size: 58,
          },
        ],
        id,
        links: {
          latest: new URL('http://example.com/latest'),
          latest_html: new URL('http://example.com/latest_html'),
        },
        metadata: {
          communities: [{ id: 'prereview-reviews' }],
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: '10.5281/zenodo.1061864' as Doi,
          license: {
            id: 'CC-BY-4.0',
          },
          publication_date: new Date('2022-07-05'),
          related_identifiers: [
            {
              scheme: 'doi',
              identifier: preprint.doi,
              relation: 'reviews',
              resource_type: 'publication-preprint',
            },
          ],
          resource_type: {
            type: 'publication',
            subtype: 'article',
          },
          title: 'Title',
        },
      }

      const fetch = fetchMock
        .sandbox()
        .getOnce((url, { cache }) => url === `https://zenodo.org/api/records/${id}` && cache === 'force-cache', {
          body: RecordC.encode(record),
          headers: { 'X-Local-Cache-Status': 'stale' },
        })
        .getOnce((url, { cache }) => url === `https://zenodo.org/api/records/${id}` && cache === 'no-cache', {
          throws: new Error('Network error'),
        })
        .getOnce('http://example.com/file', { body: 'Some text' })

      const actual = await _.getPrereview(id)({ fetch, getPreprintTitle: () => TE.right(preprint) })()

      expect(actual).toStrictEqual(
        E.right({
          authors: [{ name: 'PREreviewer' }],
          doi: '10.5281/zenodo.1061864' as Doi,
          license: 'CC-BY-4.0',
          postedDate: PlainDate.from('2022-07-05'),
          preprint,
          text: rawHtml('Some text'),
        }),
      )
      expect(fetch.done()).toBeTruthy()
    })

    test.prop([fc.integer()])('when the review is not found', async id => {
      const actual = await _.getPrereview(id)({
        fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: undefined,
          status: Status.NotFound,
        }),
        getPreprintTitle: () => () => Promise.reject('should not be called'),
      })()

      expect(actual).toStrictEqual(E.left(expect.objectContaining({ status: Status.NotFound })))
    })

    test.prop([
      fc.integer(),
      fc.record({
        doi: fc.preprintDoi(),
        language: fc.languageCode(),
        title: fc.html(),
      }),
      fc.integer({ min: 400, max: 599 }),
    ])('when the review text cannot be loaded', async (id, preprint, textStatus) => {
      const record: Record = {
        conceptdoi: '10.5072/zenodo.1061863' as Doi,
        conceptrecid: 1061863,
        files: [
          {
            links: {
              self: new URL('http://example.com/file'),
            },
            key: 'review.html',
            type: 'html',
            size: 58,
          },
        ],
        id,
        links: {
          latest: new URL('http://example.com/latest'),
          latest_html: new URL('http://example.com/latest_html'),
        },
        metadata: {
          communities: [{ id: 'prereview-reviews' }],
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: '10.5281/zenodo.1061864' as Doi,
          license: {
            id: 'CC-BY-4.0',
          },
          publication_date: new Date('2022-07-05'),
          related_identifiers: [
            {
              scheme: 'doi',
              identifier: preprint.doi,
              relation: 'reviews',
              resource_type: 'publication-preprint',
            },
          ],
          resource_type: {
            type: 'publication',
            subtype: 'article',
          },
          title: 'Title',
        },
      }

      const actual = await _.getPrereview(id)({
        fetch: fetchMock
          .sandbox()
          .getOnce(`https://zenodo.org/api/records/${id}`, {
            body: RecordC.encode(record),
            status: Status.OK,
          })
          .getOnce('http://example.com/file', { status: textStatus }),
        getPreprintTitle: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })

    test.prop([fc.integer()])('when the review cannot be loaded', async id => {
      const actual = await _.getPrereview(id)({
        fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: undefined,
          status: Status.ServiceUnavailable,
        }),
        getPreprintTitle: () => () => Promise.reject('should not be called'),
      })()

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })

    test.prop([fc.integer(), fc.preprintDoi(), fc.anything()])(
      'when the preprint cannot be loaded',
      async (id, preprintDoi, error) => {
        const record: Record = {
          conceptdoi: '10.5072/zenodo.1061863' as Doi,
          conceptrecid: 1061863,
          files: [
            {
              links: {
                self: new URL('http://example.com/file'),
              },
              key: 'review.html',
              type: 'html',
              size: 58,
            },
          ],
          id,
          links: {
            latest: new URL('http://example.com/latest'),
            latest_html: new URL('http://example.com/latest_html'),
          },
          metadata: {
            communities: [{ id: 'prereview-reviews' }],
            creators: [{ name: 'PREreviewer' }],
            description: 'Description',
            doi: '10.5281/zenodo.1061864' as Doi,
            license: {
              id: 'CC-BY-4.0',
            },
            publication_date: new Date('2022-07-05'),
            related_identifiers: [
              {
                scheme: 'doi',
                identifier: preprintDoi,
                relation: 'reviews',
                resource_type: 'publication-preprint',
              },
            ],
            resource_type: {
              type: 'publication',
              subtype: 'article',
            },
            title: 'Title',
          },
        }

        const actual = await _.getPrereview(id)({
          fetch: fetchMock
            .sandbox()
            .getOnce(`https://zenodo.org/api/records/${id}`, {
              body: RecordC.encode(record),
              status: Status.OK,
            })
            .getOnce('http://example.com/file', { body: 'Some text' }),
          getPreprintTitle: () => TE.left(error),
        })()

        expect(actual).toStrictEqual(E.left(error))
      },
    )

    test.prop([fc.integer(), fc.preprintDoi()])('when the record is not in the community', async (id, preprintDoi) => {
      const record: Record = {
        conceptdoi: '10.5072/zenodo.1061863' as Doi,
        conceptrecid: 1061863,
        files: [
          {
            links: {
              self: new URL('http://example.com/file'),
            },
            key: 'review.html',
            type: 'html',
            size: 58,
          },
        ],
        id,
        links: {
          latest: new URL('http://example.com/latest'),
          latest_html: new URL('http://example.com/latest_html'),
        },
        metadata: {
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: '10.5281/zenodo.1061864' as Doi,
          license: {
            id: 'CC-BY-4.0',
          },
          publication_date: new Date('2022-07-05'),
          related_identifiers: [
            {
              scheme: 'doi',
              identifier: preprintDoi,
              relation: 'reviews',
              resource_type: 'publication-preprint',
            },
          ],
          resource_type: {
            type: 'publication',
            subtype: 'article',
          },
          title: 'Title',
        },
      }

      const actual = await _.getPrereview(id)({
        fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        }),
        getPreprintTitle: () => () => Promise.reject('should not be called'),
      })()

      expect(actual).toStrictEqual(E.left(expect.objectContaining({ status: Status.NotFound })))
    })

    test.prop([fc.integer(), fc.preprintDoi(), fc.string()])(
      'when the record does not have a CC-BY-4.0 license',
      async (id, preprintDoi, license) => {
        const record: Record = {
          conceptdoi: '10.5072/zenodo.1061863' as Doi,
          conceptrecid: 1061863,
          files: [
            {
              links: {
                self: new URL('http://example.com/file'),
              },
              key: 'review.html',
              type: 'html',
              size: 58,
            },
          ],
          id,
          links: {
            latest: new URL('http://example.com/latest'),
            latest_html: new URL('http://example.com/latest_html'),
          },
          metadata: {
            communities: [{ id: 'prereview-reviews' }],
            creators: [{ name: 'PREreviewer' }],
            description: 'Description',
            doi: '10.5281/zenodo.1061864' as Doi,
            license: {
              id: license,
            },
            publication_date: new Date('2022-07-05'),
            related_identifiers: [
              {
                scheme: 'doi',
                identifier: preprintDoi,
                relation: 'reviews',
                resource_type: 'publication-preprint',
              },
            ],
            resource_type: {
              type: 'publication',
              subtype: 'article',
            },
            title: 'Title',
          },
        }

        const actual = await _.getPrereview(id)({
          fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
            body: RecordC.encode(record),
            status: Status.OK,
          }),
          getPreprintTitle: () => () => Promise.reject('should not be called'),
        })()

        expect(actual).toStrictEqual(E.left(expect.anything()))
      },
    )

    test.prop([fc.integer(), fc.oneof(fc.string(), fc.doi())])(
      'when the record does not review a preprint with a preprint DOI',
      async (id, identifier) => {
        const record: Record = {
          conceptdoi: '10.5072/zenodo.1061863' as Doi,
          conceptrecid: 1061863,
          files: [
            {
              links: {
                self: new URL('http://example.com/file'),
              },
              key: 'review.html',
              type: 'html',
              size: 58,
            },
          ],
          id,
          links: {
            latest: new URL('http://example.com/latest'),
            latest_html: new URL('http://example.com/latest_html'),
          },
          metadata: {
            communities: [{ id: 'prereview-reviews' }],
            creators: [{ name: 'PREreviewer' }],
            description: 'Description',
            doi: '10.5281/zenodo.1061864' as Doi,
            license: {
              id: 'CC-BY-4.0',
            },
            publication_date: new Date('2022-07-05'),
            related_identifiers: [
              {
                scheme: 'doi',
                identifier,
                relation: 'reviews',
                resource_type: 'publication-preprint',
              },
            ],
            resource_type: {
              type: 'publication',
              subtype: 'article',
            },
            title: 'Title',
          },
        }

        const actual = await _.getPrereview(id)({
          fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
            body: RecordC.encode(record),
            status: Status.OK,
          }),
          getPreprintTitle: () => () => Promise.reject('should not be called'),
        })()

        expect(actual).toStrictEqual(E.left(expect.objectContaining({ status: Status.NotFound })))
      },
    )

    test.prop([
      fc.integer(),
      fc.record({
        doi: fc.preprintDoi(),
        language: fc.languageCode(),
        title: fc.html(),
      }),
      fc.nonEmptyArray(
        fc.record({
          links: fc.record({
            self: fc.url(),
          }),
          key: fc.string(),
          type: fc.string().filter(type => type !== 'html'),
          size: fc.integer(),
        }),
        { minLength: 1 },
      ),
    ])('when the record does not have a HTML file', async (id, preprint, files) => {
      const record: Record = {
        conceptdoi: '10.5072/zenodo.1061863' as Doi,
        conceptrecid: 1061863,
        files,
        id,
        links: {
          latest: new URL('http://example.com/latest'),
          latest_html: new URL('http://example.com/latest_html'),
        },
        metadata: {
          communities: [{ id: 'prereview-reviews' }],
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: '10.5281/zenodo.1061864' as Doi,
          license: {
            id: 'CC-BY-4.0',
          },
          publication_date: new Date('2022-07-05'),
          related_identifiers: [
            {
              scheme: 'doi',
              identifier: preprint.doi,
              relation: 'reviews',
              resource_type: 'publication-preprint',
            },
          ],
          resource_type: {
            type: 'publication',
            subtype: 'article',
          },
          title: 'Title',
        },
      }

      const actual = await _.getPrereview(id)({
        fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        }),
        getPreprintTitle: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })
  })

  describe('getPrereviews', () => {
    test.prop([fc.preprintId()])('when the PREreviews can be loaded', async preprint => {
      const records: Records = {
        hits: {
          hits: [
            {
              conceptdoi: '10.5072/zenodo.1061863' as Doi,
              conceptrecid: 1061863,
              files: [
                {
                  links: {
                    self: new URL('http://example.com/file'),
                  },
                  key: 'review.html',
                  type: 'html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                license: {
                  id: 'CC-BY-4.0',
                },
                publication_date: new Date('2022-07-05'),
                resource_type: {
                  type: 'publication',
                  subtype: 'article',
                },
                title: 'Title',
              },
            },
          ],
        },
      }

      const actual = await _.getPrereviews(preprint)({
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'https://zenodo.org/api/records/',
            query: {
              communities: 'prereview-reviews',
              q: `related.identifier:"${preprint.doi}"`,
              sort: 'mostrecent',
            },
          },
          {
            body: RecordsC.encode(records),
            status: Status.OK,
          },
        ),
      })()

      expect(actual).toStrictEqual(
        E.right([
          {
            authors: [{ name: 'PREreviewer' }],
            id: 1061864,
            text: rawHtml('Description'),
          },
        ]),
      )
    })

    test.prop([fc.preprintId()])('revalidates if the PREreviews are stale', async preprint => {
      const records: Records = {
        hits: {
          hits: [
            {
              conceptdoi: '10.5072/zenodo.1061863' as Doi,
              conceptrecid: 1061863,
              files: [
                {
                  links: {
                    self: new URL('http://example.com/file'),
                  },
                  key: 'review.html',
                  type: 'html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                license: {
                  id: 'CC-BY-4.0',
                },
                publication_date: new Date('2022-07-05'),
                resource_type: {
                  type: 'publication',
                  subtype: 'article',
                },
                title: 'Title',
              },
            },
          ],
        },
      }

      const fetch = fetchMock
        .sandbox()
        .getOnce(
          (url, { cache }) =>
            url ===
              `https://zenodo.org/api/records/?${new URLSearchParams({
                communities: 'prereview-reviews',
                q: `related.identifier:"${preprint.doi}"`,
                size: '100',
                sort: 'mostrecent',
              }).toString()}` && cache === 'force-cache',
          {
            body: RecordsC.encode(records),
            headers: { 'X-Local-Cache-Status': 'stale' },
          },
        )
        .getOnce(
          (url, { cache }) =>
            url ===
              `https://zenodo.org/api/records/?${new URLSearchParams({
                communities: 'prereview-reviews',
                q: `related.identifier:"${preprint.doi}"`,
                size: '100',
                sort: 'mostrecent',
              }).toString()}` && cache === 'no-cache',
          { throws: new Error('Network error') },
        )

      const actual = await _.getPrereviews(preprint)({ fetch })()

      expect(actual).toStrictEqual(
        E.right([
          {
            authors: [{ name: 'PREreviewer' }],
            id: 1061864,
            text: rawHtml('Description'),
          },
        ]),
      )
      expect(fetch.done()).toBeTruthy()
    })

    test.prop([fc.preprintId(), fc.integer({ min: 400, max: 599 })])(
      'when the PREreviews cannot be loaded',
      async (preprint, status) => {
        const actual = await _.getPrereviews(preprint)({
          fetch: fetchMock.sandbox().getOnce(
            {
              url: 'https://zenodo.org/api/records/',
              query: {
                communities: 'prereview-reviews',
                q: `related.identifier:"${preprint.doi}"`,
                sort: 'mostrecent',
              },
            },
            { status },
          ),
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
      },
    )
  })

  describe('createRecordOnZenodo', () => {
    test.prop([
      fc.record<NewPrereview>({
        conduct: fc.constant('yes'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        persona: fc.constant('public'),
        preprint: fc.record({
          doi: fc.preprintDoi(),
          language: fc.languageCode(),
          title: fc.html(),
        }),
        review: fc.html(),
        user: fc.user(),
      }),
      fc.string(),
      fc.doi(),
    ])('as a public persona', async (newPrereview, zenodoApiKey, reviewDoi) => {
      const unsubmittedDeposition: UnsubmittedDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
        },
        metadata: {
          creators: [{ name: newPrereview.user.name, orcid: newPrereview.user.orcid }],
          description: 'Description',
          prereserve_doi: {
            doi: reviewDoi,
          },
          title: 'Title',
          upload_type: 'publication',
          publication_type: 'article',
        },
        state: 'unsubmitted',
        submitted: false,
      }
      const submittedDeposition: SubmittedDeposition = {
        id: 1,
        metadata: {
          creators: [{ name: newPrereview.user.name, orcid: newPrereview.user.orcid }],
          description: 'Description',
          doi: reviewDoi,
          title: 'Title',
          upload_type: 'publication',
          publication_type: 'article',
        },
        state: 'done',
        submitted: true,
      }
      const actual = await _.createRecordOnZenodo(newPrereview)({
        fetch: fetchMock
          .sandbox()
          .postOnce(
            {
              url: 'https://zenodo.org/api/deposit/depositions',
              body: {
                metadata: {
                  upload_type: 'publication',
                  publication_type: 'article',
                  title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                  creators: [
                    { name: newPrereview.user.name, orcid: newPrereview.user.orcid },
                    ...newPrereview.otherAuthors,
                  ],
                  communities: [{ identifier: 'prereview-reviews' }],
                  description: newPrereview.review.toString(),
                  related_identifiers: [
                    {
                      scheme: 'doi',
                      identifier: newPrereview.preprint.doi,
                      relation: 'reviews',
                      resource_type: 'publication-preprint',
                    },
                  ],
                },
              },
            },
            {
              body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
              status: Status.Created,
            },
          )
          .putOnce(
            {
              url: 'http://example.com/bucket/review.html',
              headers: { 'Content-Type': 'text/html' },
              functionMatcher: (_, req) => req.body === newPrereview.review.toString(),
            },
            {
              status: Status.Created,
            },
          )
          .postOnce('http://example.com/publish', {
            body: SubmittedDepositionC.encode(submittedDeposition),
            status: Status.Accepted,
          }),
        zenodoApiKey,
      })()

      expect(actual).toStrictEqual(E.right(reviewDoi))
    })

    test.prop([
      fc.record<NewPrereview>({
        conduct: fc.constant('yes'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        persona: fc.constant('pseudonym'),
        preprint: fc.record({
          doi: fc.preprintDoi(),
          language: fc.languageCode(),
          title: fc.html(),
        }),
        review: fc.html(),
        user: fc.user(),
      }),
      fc.string(),
      fc.doi(),
    ])('as an pseudonym persona', async (newPrereview, zenodoApiKey, reviewDoi) => {
      const unsubmittedDeposition: UnsubmittedDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
        },
        metadata: {
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          prereserve_doi: {
            doi: reviewDoi,
          },
          title: 'Title',
          upload_type: 'publication',
          publication_type: 'article',
        },
        state: 'unsubmitted',
        submitted: false,
      }
      const submittedDeposition: SubmittedDeposition = {
        id: 1,
        metadata: {
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: reviewDoi,
          title: 'Title',
          upload_type: 'publication',
          publication_type: 'article',
        },
        state: 'done',
        submitted: true,
      }
      const actual = await _.createRecordOnZenodo(newPrereview)({
        fetch: fetchMock
          .sandbox()
          .postOnce(
            {
              url: 'https://zenodo.org/api/deposit/depositions',
              body: {
                metadata: {
                  upload_type: 'publication',
                  publication_type: 'article',
                  title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                  creators: [{ name: newPrereview.user.pseudonym }, ...newPrereview.otherAuthors],
                  communities: [{ identifier: 'prereview-reviews' }],
                  description: newPrereview.review.toString(),
                  related_identifiers: [
                    {
                      scheme: 'doi',
                      identifier: newPrereview.preprint.doi,
                      relation: 'reviews',
                      resource_type: 'publication-preprint',
                    },
                  ],
                },
              },
            },
            {
              body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
              status: Status.Created,
            },
          )
          .putOnce(
            {
              url: 'http://example.com/bucket/review.html',
              headers: { 'Content-Type': 'text/html' },
              functionMatcher: (_, req) => req.body === newPrereview.review.toString(),
            },
            {
              status: Status.Created,
            },
          )
          .postOnce('http://example.com/publish', {
            body: SubmittedDepositionC.encode(submittedDeposition),
            status: Status.Accepted,
          }),
        zenodoApiKey,
      })()

      expect(actual).toStrictEqual(E.right(reviewDoi))
    })

    test.prop([
      fc.record<NewPrereview>({
        conduct: fc.constant('yes'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        persona: fc.constantFrom('public', 'pseudonym'),
        preprint: fc.record({
          doi: fc.preprintDoi(),
          language: fc.languageCode(),
          title: fc.html(),
        }),
        review: fc.html(),
        user: fc.user(),
      }),
      fc.string(),
      fc.oneof(
        fc.fetchResponse({ status: fc.integer({ min: 400 }) }).map(response => Promise.resolve(response)),
        fc.error().map(error => Promise.reject(error)),
      ),
    ])('Zenodo is unavailable', async (newPrereview, zenodoApiKey, response) => {
      const actual = await _.createRecordOnZenodo(newPrereview)({
        fetch: () => response,
        zenodoApiKey,
      })()

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })
  })
})
