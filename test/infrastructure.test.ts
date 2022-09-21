import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import { isNonEmpty } from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import {
  Record,
  RecordC,
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
      test('from bioRxiv/medRxiv', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.doi(),
            fc.sanitisedHtml(),
            fc.plainDate(),
            fc.constantFrom('bioRxiv', 'medRxiv'),
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
                  abstract: expect.anything(),
                  authors: [
                    { name: 'Xin Liu', orcid: undefined },
                    { name: 'Wojciech Nawrocki', orcid: '0000-0001-5124-3000' },
                    { name: 'Roberta Croce', orcid: '0000-0003-3469-834X' },
                  ],
                  id: {
                    type: server.toLowerCase(),
                    doi: '10.1101/2022.01.13.476201',
                  },
                  language: 'en',
                  posted,
                  title,
                  url: new URL('https://biorxiv.org/lookup/doi/10.1101/2022.01.13.476201'),
                }),
              )
            },
          ),
        )
      })

      test('from SciELO', async () => {
        await fc.assert(
          fc.asyncProperty(fc.doi(), fc.sanitisedHtml(), fc.plainDate(), async (doi, title, posted) => {
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
                  title: [title.toString()],
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
                abstract: expect.anything(),
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
                language: 'es',
                posted,
                title,
                url: new URL('https://preprints.scielo.org/index.php/scielo/preprint/view/4502/version/4765'),
              }),
            )
          }),
        )
      })

      test('when the response is stale', async () => {
        await fc.assert(
          fc.asyncProperty(fc.doi(), fc.sanitisedHtml(), fc.plainDate(), async (doi, title, posted) => {
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
                      title: [title.toString()],
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

            expect(actual).toStrictEqual(E.right(expect.objectContaining({ title })))
            expect(fetch.done()).toBeTruthy()
          }),
        )
      })
    })

    test('when the preprint is not found', async () => {
      await fc.assert(
        fc.asyncProperty(fc.doi(), async doi => {
          const fetch = fetchMock
            .sandbox()
            .getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { status: Status.NotFound })

          const actual = await _.getPreprint(doi)({ fetch })()

          expect(actual).toStrictEqual(E.left(expect.anything()))
        }),
      )
    })

    test('when the preprint cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(fc.doi(), fc.record({ status: fc.integer(), body: fc.string() }), async (doi, response) => {
          const fetch = fetchMock
            .sandbox()
            .getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, response)

          const actual = await _.getPreprint(doi)({ fetch })()

          expect(actual).toStrictEqual(E.left(expect.anything()))
        }),
      )
    })
  })

  describe('getPrereview', () => {
    test('when the PREreview can be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.record({
            doi: fc.preprintDoi(),
            language: fc.languageCode(),
            title: fc.html(),
          }),
          async (id, preprint) => {
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
                postedDate: PlainDate.from('2022-07-05'),
                preprint,
                text: rawHtml('Some text'),
              }),
            )
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint.doi)
          },
        ),
      )
    })

    test('revalidates if the PREreview is stale', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.record({
            doi: fc.preprintDoi(),
            language: fc.languageCode(),
            title: fc.html(),
          }),
          async (id, preprint) => {
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
                postedDate: PlainDate.from('2022-07-05'),
                preprint,
                text: rawHtml('Some text'),
              }),
            )
            expect(fetch.done()).toBeTruthy()
          },
        ),
      )
    })

    test('when the review is not found', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),

          async id => {
            const actual = await _.getPrereview(id)({
              fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
                body: undefined,
                status: Status.NotFound,
              }),
              getPreprintTitle: () => () => Promise.reject('should not be called'),
            })()

            expect(actual).toStrictEqual(E.left(expect.objectContaining({ status: Status.NotFound })))
          },
        ),
      )
    })

    test('when the review text cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.record({
            doi: fc.preprintDoi(),
            language: fc.languageCode(),
            title: fc.html(),
          }),
          fc.integer({ min: 400, max: 599 }),
          async (id, preprint, textStatus) => {
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
          },
        ),
      )
    })

    test('when the review cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),

          async id => {
            const actual = await _.getPrereview(id)({
              fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
                body: undefined,
                status: Status.ServiceUnavailable,
              }),
              getPreprintTitle: () => () => Promise.reject('should not be called'),
            })()

            expect(actual).toStrictEqual(E.left(expect.anything()))
          },
        ),
      )
    })

    test('when the preprint cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), fc.preprintDoi(), fc.anything(), async (id, preprintDoi, error) => {
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
        }),
      )
    })

    test('when the record is not in the community', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),

          fc.preprintDoi(),
          async (id, preprintDoi) => {
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
          },
        ),
      )
    })

    test('when the record does not review a preprint with a preprint DOI', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.oneof(fc.string(), fc.doi()),

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
        ),
      )
    })

    test('when the record does not have a HTML file', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.record({
            doi: fc.preprintDoi(),
            language: fc.languageCode(),
            title: fc.html(),
          }),
          fc
            .array(
              fc.record({
                links: fc.record({
                  self: fc.url(),
                }),
                key: fc.string(),
                type: fc.string().filter(type => type !== 'html'),
                size: fc.integer(),
              }),
              { minLength: 1 },
            )
            .filter(isNonEmpty),
          async (id, preprint, files) => {
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
          },
        ),
      )
    })
  })

  describe('createRecordOnZenodo', () => {
    test('as a public persona', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record<NewPrereview>({
            conduct: fc.constant('yes'),
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
          async (newPrereview, zenodoApiKey, reviewDoi) => {
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
                        creators: [{ name: newPrereview.user.name, orcid: newPrereview.user.orcid }],
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
          },
        ),
      )
    })

    test('as an pseudonym persona', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record<NewPrereview>({
            conduct: fc.constant('yes'),
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
          async (newPrereview, zenodoApiKey, reviewDoi) => {
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
                        creators: [{ name: newPrereview.user.pseudonym }],
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
          },
        ),
      )
    })

    test('Zenodo is unavailable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record<NewPrereview>({
            conduct: fc.constant('yes'),
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
          async (newPrereview, zenodoApiKey, response) => {
            const actual = await _.createRecordOnZenodo(newPrereview)({
              fetch: () => response,
              zenodoApiKey,
            })()

            expect(actual).toStrictEqual(E.left(expect.anything()))
          },
        ),
      )
    })
  })
})
