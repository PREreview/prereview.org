// eslint-disable-next-line import/no-extraneous-dependencies
import { Reactivity } from '@effect/experimental'
import { FetchHttpClient, HttpClient, HttpClientResponse, Url } from '@effect/platform'
import { NodeHttpServer } from '@effect/platform-node'
import type { SqlClient } from '@effect/sql'
import { LibsqlClient } from '@effect/sql-libsql'
import { PgClient } from '@effect/sql-pg'
import {
  test as baseTest,
  expect,
  type Fixtures,
  type PlaywrightTestArgs,
  type PlaywrightTestOptions,
} from '@playwright/test'
import { SystemClock } from 'clock-ts'
import { Doi } from 'doi-ts'
import {
  Config,
  ConfigProvider,
  Effect,
  Logger as EffectLogger,
  Fiber,
  Layer,
  LogLevel,
  Option,
  pipe,
  Redacted,
  Schedule,
} from 'effect'
import fetchMock from 'fetch-mock'
import * as fs from 'fs/promises'
import http from 'http'
import Keyv from 'keyv'
import * as L from 'logger-fp-ts'
import nodemailer from 'nodemailer'
import { type MutableRedirectUri, OAuth2Server } from 'oauth2-mock-server'
import type { BrowserContextOptions, Page } from 'playwright-core'
import { URL } from 'url'
import { Uuid, v4 } from 'uuid-ts'
import {
  EmptyDepositionC,
  InProgressDepositionC,
  RecordC,
  RecordsC,
  SubmittedDepositionC,
  UnsubmittedDepositionC,
  type Record as ZenodoRecord,
} from 'zenodo-ts'
import { AuthorInviteC } from '../src/author-invite.js'
import * as CachingHttpClient from '../src/CachingHttpClient/index.js'
import {
  ContactEmailAddressC,
  UnverifiedContactEmailAddress,
  VerifiedContactEmailAddress,
} from '../src/contact-email-address.js'
import { DeprecatedLoggerEnv, ExpressConfig, SessionSecret } from '../src/Context.js'
import { DeprecatedLogger } from '../src/DeprecatedServices.js'
import { createAuthorInviteEmail } from '../src/email.js'
import { Cloudinary, Ghost, Orcid, Zenodo } from '../src/ExternalApis/index.js'
import * as FeatureFlags from '../src/FeatureFlags.js'
import { rawHtml } from '../src/html.js'
import type {
  AuthorInviteStoreEnv,
  ContactEmailAddressStoreEnv,
  IsOpenForRequestsStoreEnv,
  LanguagesStoreEnv,
  LocationStoreEnv,
  ResearchInterestsStoreEnv,
  ReviewRequestStoreEnv,
  UserOnboardingStoreEnv,
} from '../src/keyv.js'
import { LegacyPrereviewApi } from '../src/legacy-prereview.js'
import { DefaultLocale } from '../src/locales/index.js'
import type { IsUserBlockedEnv } from '../src/log-in/index.js'
import * as Nodemailer from '../src/nodemailer.js'
import { OrcidOauth } from '../src/OrcidOauth.js'
import { BiorxivPreprintId } from '../src/Preprints/index.js'
import * as PrereviewCoarNotify from '../src/prereview-coar-notify/index.js'
import { Program } from '../src/Program.js'
import { PublicUrl } from '../src/public-url.js'
import { SlackApiConfig } from '../src/slack.js'
import * as StatusCodes from '../src/StatusCodes.js'
import * as TemplatePage from '../src/TemplatePage.js'
import { EmailAddress } from '../src/types/EmailAddress.js'
import { NonEmptyString } from '../src/types/NonEmptyString.js'
import { OrcidId } from '../src/types/OrcidId.js'
import type { WasPrereviewRemovedEnv } from '../src/zenodo.js'

export { expect } from '@playwright/test'

interface AppFixtures {
  sqlClientLayer: Layer.Layer<SqlClient.SqlClient, unknown>
  fetch: fetchMock.FetchMockSandbox
  logger: L.Logger
  oauthServer: OAuth2Server
  port: number
  server: Fiber.RuntimeFiber<never>
  updatesLegacyPrereview: (typeof LegacyPrereviewApi.Service)['update']
  formStore: Keyv
  careerStageStore: Keyv
  researchInterestsStore: ResearchInterestsStoreEnv['researchInterestsStore']
  languagesStore: LanguagesStoreEnv['languagesStore']
  locationStore: LocationStoreEnv['locationStore']
  isOpenForRequestsStore: IsOpenForRequestsStoreEnv['isOpenForRequestsStore']
  slackUserIdStore: Keyv
  contactEmailAddressStore: ContactEmailAddressStoreEnv['contactEmailAddressStore']
  isUserBlocked: IsUserBlockedEnv['isUserBlocked']
  wasPrereviewRemoved: WasPrereviewRemovedEnv['wasPrereviewRemoved']
  userOnboardingStore: UserOnboardingStoreEnv['userOnboardingStore']
  authorInviteStore: AuthorInviteStoreEnv['authorInviteStore']
  reviewRequestStore: ReviewRequestStoreEnv['reviewRequestStore']
  canAddMultipleAuthors: (typeof FeatureFlags.FeatureFlags.Service)['canAddMultipleAuthors']
  canLogInAsDemoUser: (typeof FeatureFlags.FeatureFlags.Service)['canLogInAsDemoUser']
  canReviewDatasets: (typeof FeatureFlags.FeatureFlags.Service)['canReviewDatasets']
  nodemailer: typeof Nodemailer.Nodemailer.Service
  emails: Array<nodemailer.SendMailOptions>
}

const appFixtures: Fixtures<AppFixtures, Record<never, never>, PlaywrightTestArgs & PlaywrightTestOptions> = {
  authorInviteStore: async ({}, use) => {
    await use(new Keyv())
  },
  baseURL: async ({ port }, use) => {
    await use(`http://localhost:${port}`)
  },
  canAddMultipleAuthors: async ({}, use) => {
    await use(() => false)
  },
  canLogInAsDemoUser: async ({}, use) => {
    await use(false)
  },
  canReviewDatasets: async ({}, use) => {
    await use(false)
  },
  careerStageStore: async ({}, use) => {
    await use(new Keyv())
  },
  contactEmailAddressStore: async ({}, use) => {
    await use(new Keyv())
  },
  fetch: async ({}, use) => {
    const fetch = fetchMock.sandbox()

    fetch.get(
      {
        url: 'http://prereview.test/api/v2/users/0000-0002-1825-0097',
        headers: { 'X-Api-App': 'app', 'X-Api-Key': 'key' },
      },
      {
        body: {
          data: {
            personas: [
              {
                isAnonymous: true,
                name: 'Orange Panda',
              },
            ],
          },
        },
      },
    )

    fetch.get('http://prereview.test/api/v2/preprints/doi-10.1101-2022.01.13.476201/rapid-reviews', {
      body: { data: [] },
    })

    fetch.get(
      {
        name: 'recent-prereviews',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { size: 5, sort: 'publication-desc', resource_type: 'publication::publication-peerreview' },
      },
      {
        body: RecordsC.encode({
          hits: {
            total: 6,
            hits: [
              {
                conceptdoi: Doi('10.5281/zenodo.7820083'),
                conceptrecid: 7820083,
                files: [
                  {
                    key: 'review.html',
                    links: {
                      self: new URL(
                        'https://zenodo.org/api/files/77ec063f-e37c-4739-8bc5-d7bba268bbd5/review.html/content',
                      ),
                    },
                    size: 2538,
                  },
                ],
                id: 7820084,
                links: {
                  latest: new URL('https://zenodo.org/api/records/7820084'),
                  latest_html: new URL('https://zenodo.org/record/7820084'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  contributors: [{ type: 'ResearchGroup', name: 'ASAPbio Metabolism Crowd' }],
                  creators: [{ name: 'Jaeyoung Oh', orcid: OrcidId('0009-0008-9257-4728') }],
                  description:
                    "<p>The main question that this preprint seeks to answer is whether or not Nirmatrelvir plus ritonavir, used as a treatment for non-hospitalized vaccinated patients, was effective at preventing long COVID symptoms. Overall, the paper found that NMV-r was indeed associated with a reduction in symptoms of long COVID. The findings of this paper are novel, as there has been research conducted on NMV-r's effect on COVID symptoms, but this is the first time its effect on long COVID has been investigated. The results are likely to lead to future research, as the findings are novel and relevant to helping solve a large issue in long COVID. I would say that sufficient detail is provided to allow reproduction of the study. Where the data was taken from and how it was analyzed is described in great detail. I do not have the expertise needed to determine if the methods and statistics are appropriate for the analysis, so I am unsure but they seem logical and is an area that other reviewers could check. The principal conclusions are supported by the data and analysis. The manuscript does discuss limitations. It highlights that there could be significant biases in the data due to differences between the groups receiving and not receiving treatment. The authors claim that they used propensity matching to control for these limitations in the data, but admit that there could still be residual confounding. In addition, the authors also point out that the findings could change depending on the definition of long COVID used. The authors say that their definitions of long COVID may have lacked precision and been too inclusive. The authors say that a more accurate result could be obtained from data from original placebo-controlled trials. The authors have not discussed ethical concerns.  The manuscript does not include new data. It gets its data from the TriNetX Analytics Network. The authors say that more can be found about this database online. I would recommend this manuscript to others due to its novel findings and its potential contributions to finding effective treatments for long COVID. I highly recommend this manuscript for peer review.</p><p>My only concerns with this manuscript would be that the data does not come from placebo-controlled trials and only from electronic health records. However, the authors have already addressed this concern. </p><p>I do not have any competing interests.</p>\n\n    Competing interests\n\n    <p>\n      The author declares that they have no competing interests.\n    </p>",
                  doi: Doi('10.5281/zenodo.7820084'),
                  license: { id: 'cc-by-4.0' },
                  publication_date: new Date('2023-04-12'),
                  related_identifiers: [
                    {
                      identifier: '10.1101/2022.01.13.476201',
                      relation: 'reviews',
                      resource_type: 'publication-preprint',
                      scheme: 'doi',
                    },
                  ],
                  resource_type: {
                    type: 'publication',
                    subtype: 'peerreview',
                  },
                  title:
                    'PREreview of "Incidence of Symptoms Associated with Post-Acute Sequelae of SARS-CoV-2 infection in Non-Hospitalized Vaccinated Patients Receiving Nirmatrelvir-Ritonavir"',
                },
              },
              {
                conceptdoi: Doi('10.5281/zenodo.7747128'),
                conceptrecid: 7747128,
                files: [
                  {
                    key: 'review.html',
                    links: {
                      self: new URL(
                        'https://zenodo.org/api/files/7ff8c56b-1755-40c7-800d-d64b886ae153/review.html/content',
                      ),
                    },
                    size: 7043,
                  },
                ],
                id: 7747129,
                links: {
                  latest: new URL('https://zenodo.org/api/records/7747129'),
                  latest_html: new URL('https://zenodo.org/record/7747129'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  creators: [{ name: 'CJ San Felipe', orcid: OrcidId('0000-0002-2695-5951') }],
                  description:
                    '<p>PTP1b has been an attractive target for drug development due to its essential role in several cellular pathways and diseases such as type 2 diabetes. Focus has been paid to identifying allosteric sites that regulate catalytic activity via altering the dynamics of the active site WPD loop. However, the structural mechanisms underlying the WPD loop opening and closing (which is relatively slow by NMR) remains unclear.\u00a0</p><p>In this paper, the authors sought to identify the structural mechanisms underlying PTP1b loop motion by performing long time scale molecular dynamics (MD) simulations. Starting from existing structures with the WPD loop either open or closed, they are able to derive reasonable estimations of the kinetics of loop opening and closing. They address the question of what structural changes need to occur for the loop to remain open or closed as it fluctuates. Using a random forest approach, they narrow their focus down to the PDFG motifs backbone dihedrals as a set of features sufficient for describing and predicting loop movement between states. The major strength of this paper is reducing the WPD loop conformation (including transient states) down to a set of reaction coordinates in the PDFG motif dihedral angles. Based on this minimum set of features, the committor probabilities provide a strong statistical argument for the transition between open, closed, and transient states along the loop trajectory.</p><p>The major weakness of this paper is that the visualizations describing the PDFG motif switch model are insufficient and confusing and lack an atomic explanation of how these dihedral changes occur in the context of surrounding residues to complement their statistical explanations. This makes it difficult to interpret what the actual transitions look like. We understand that the atomic explanation of this mechanism can be complicated but refer the authors to this paper as an example even though it is a different target and may not be specifically relevant to their work: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1450098/">https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1450098/</a> (Fig 3)</p><p>The reaction coordinates alone do not provide a clear direction for envisioning future experiments. Given that this motif is conserved (as the authors explained), other PTP members likely have different structural environments surrounding the motif which likely affects kinetic rates and thermodynamics.\u00a0</p><p>Major Points:</p><ol><li><p>Previous structural studies of PTP\'s have identified atypical open loop conformations in GLEPP1, STEP, and Lyp: <a href="https://www.sciencedirect.com/science/article/pii/S0092867408015134?via%3Dihub">https://www.sciencedirect.com/science/article/pii/S0092867408015134?via%3Dihub</a> Fig 3A. These loops adopt a novel loop conformation that is more open compared to PTP1B. Further, the presence of catalytic water molecules that are tightly bound in closed states and absent in open states have been suggested to play a role in the closing of the WPD loop.\u00a0</p><ol><li><p>Can the authors provide comments on how the PDFG motif factors into the novel open loop conformation (would the motif dihedrals still predict loop states in these family members)?\u00a0</p></li><li><p>Were water molecules detected in the binding site and do they play a role during loop closure?</p></li><li><p>Is it possible to include within these simulations mixed solvent MD with a PTP1B substrate to explore their roles in the loop transition?</p></li></ol></li><li><p>"We note that although the PD[F/H]G BLAST search did return matches in other protein families, there was not the structural information corresponding to those matches that would be needed to draw further conclusions on the conformational significance of PD[F/H]G motifs in those families." - We feel this is a missed opportunity to at least do some exploration and cataloging using the alphafold structures of these other families.</p></li><li><p>The authors describe the backbone dihedrals of the PDFG motif as being sufficient and necessary for predicting WPD loop conformation but do not mention the side chain conformations. We feel that the explanation and visualization of the side chain conformations in both open and closed states is unclear as there is no analysis of how these transitions and conformations affect the populations and rate movement of the loop.\u00a0</p><ol><li><p>What do the rotamer conformations and transitions look like for the PDFG during open, closed, and transient WPD loop states?\u00a0</p></li><li><p>How do these rotamer conformations affect loop movements and populations within the simulation?\u00a0</p></li></ol></li></ol><p>It would be insightful if the authors could provide an explanation of the rotamer transitions during loop opening and closing. Understanding these structural changes during substrate binding and catalysis could yield targets for drug development.\u00a0</p><p>Minor Points:</p><ol><li><p>Supplementary figures S2, S3, S4, and S5 have little to no information to adequately explain what is being illustrated. The authors should be more clear in describing what these figures represent. A description of axes, experimental set up, and legends would be helpful.\u00a0</p></li><li><p>The observation that loop fluctuations without long term stability unless the PDFG motif switches is reminiscent of the population shuffling model of conformational changes put forward by Colin Smith - <a href="https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201408890">https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201408890</a>. Given the previous NMR data on PTP1B, how does this view alter the interpretation away from a strict two state model?</p></li><li><p>"The free energy estimate from these AWE simulations was \u0394Gclosed-to-open = \u22122.6 \u00b1 0.1 kcal mol-1, indicating that the transition from closed to open states is spontaneous (<a href="https://www.biorxiv.org/content/10.1101/2023.02.28.529746v1.full#F2"><b>Figure 2b</b></a>), a finding that is again consistent with experimental data" We are a bit confused by the language here: is this a thermodynamic or kinetic argument? Secondarily, how do the populations compare to those derived from NMR?</p></li></ol><ol><li><p>As previously discussed in a twitter thread with the authors, the backbone ramachandran regions of the 1SUG structure (closed WPD loop conformation) is not in a region previously known for kinases. It would be helpful if the authors could provide validation that the backbone ramachandran regions of the WPD loop are in agreement with what is known about kinases states and whether this would affect their interpretations.\u00a0</p></li></ol><p><a href="https://twitter.com/RolandDunbrack/status/1632284368650530816">https://twitter.com/RolandDunbrack/status/1632284368650530816</a></p><p>Review by - CJ San Felipe (UCSF) and James Fraser (UCSF)</p>\n\n    Competing interests\n\n    <p>\n      The author declares that they have no competing interests.\n    </p>',
                  doi: Doi('10.5281/zenodo.7747129'),
                  license: { id: 'cc-by-4.0' },
                  publication_date: new Date('2023-03-17'),
                  related_identifiers: [
                    {
                      identifier: '10.1101/2023.02.28.529746',
                      relation: 'reviews',
                      resource_type: 'publication-preprint',
                      scheme: 'doi',
                    },
                    { identifier: '10.5281/zenodo.7747128', relation: 'isVersionOf', scheme: 'doi' },
                  ],
                  resource_type: {
                    type: 'publication',
                    subtype: 'peerreview',
                  },
                  title: 'PREreview of "A conserved local structural motif controls the kinetics of PTP1B catalysis"',
                },
              },
            ],
          },
        }),
      },
    )

    fetch.get('https://api.crossref.org/works/10.1101%2F2023.02.28.529746', {
      body: {
        status: 'ok',
        'message-type': 'work',
        'message-version': '1.0.0',
        message: {
          institution: [{ name: 'bioRxiv' }],
          indexed: { 'date-parts': [[2023, 3, 9]], 'date-time': '2023-03-09T05:34:47Z', timestamp: 1678340087045 },
          posted: { 'date-parts': [[2023, 3, 1]] },
          'group-title': 'Biophysics',
          'reference-count': 46,
          publisher: 'Cold Spring Harbor Laboratory',
          'content-domain': { domain: [], 'crossmark-restriction': false },
          'short-container-title': [],
          accepted: { 'date-parts': [[2023, 3, 1]] },
          abstract:
            '<jats:title>Abstract</jats:title><jats:p>Protein tyrosine phosphatase 1B (PTP1B) is a negative regulator of the insulin and leptin signaling pathways, making it a highly attractive target for the treatment of type II diabetes. For PTP1B to perform its enzymatic function, a loop referred to as the \u201cWPD loop\u201d must transition between open (catalytically incompetent) and closed (catalytically competent) conformations, which have both been resolved by X-ray crystallography. Although prior studies have established this transition as the rate-limiting step for catalysis, the transition mechanism for PTP1B and other PTPs has been unclear. Here we present an atomically detailed model of WPD-loop transitions in PTP1B based on unbiased, long-timescale molecular dynamics simulations and weighted ensemble simulations. We found that a specific WPD-loop region\u2014 the PDFG motif\u2014acted as the key conformational switch, with structural changes to the motif being necessary and sufficient for transitions between long-lived open and closed states of the loop. Simulations starting from the closed state repeatedly visited open states of the loop that quickly closed again unless the infrequent conformational switching of the motif stabilized the open state. The functional role of the PDFG motif is supported by the fact that it (or the similar PDHG motif) is conserved across all PTPs. Bioinformatic analysis shows that the PDFG motif is also conserved, and adopts two distinct conformations, in deiminases, and the related DFG motif is known to function as a conformational switch in many kinases, suggesting that PDFG-like motifs may control transitions between structurally distinct, long-lived conformational states in multiple protein families.</jats:p>',
          DOI: '10.1101/2023.02.28.529746',
          type: 'posted-content',
          created: { 'date-parts': [[2023, 3, 3]], 'date-time': '2023-03-03T17:50:24Z', timestamp: 1677865824000 },
          source: 'Crossref',
          'is-referenced-by-count': 0,
          title: ['A conserved local structural motif controls the kinetics of PTP1B catalysis'],
          prefix: '10.1101',
          author: [
            { given: 'Christine Y.', family: 'Yeh', sequence: 'first', affiliation: [] },
            { given: 'Jesus A.', family: 'Izaguirre', sequence: 'additional', affiliation: [] },
            { given: 'Jack B.', family: 'Greisman', sequence: 'additional', affiliation: [] },
            { given: 'Lindsay', family: 'Willmore', sequence: 'additional', affiliation: [] },
            { given: 'Paul', family: 'Maragakis', sequence: 'additional', affiliation: [] },
            { given: 'David E.', family: 'Shaw', sequence: 'additional', affiliation: [] },
          ],
          member: '246',
          'container-title': [],
          'original-title': [],
          link: [
            {
              URL: 'https://syndication.highwire.org/content/doi/10.1101/2023.02.28.529746',
              'content-type': 'unspecified',
              'content-version': 'vor',
              'intended-application': 'similarity-checking',
            },
          ],
          deposited: { 'date-parts': [[2023, 3, 8]], 'date-time': '2023-03-08T10:27:41Z', timestamp: 1678271261000 },
          score: 1,
          resource: { primary: { URL: 'http://biorxiv.org/lookup/doi/10.1101/2023.02.28.529746' } },
          subtitle: [],
          'short-title': [],
          issued: { 'date-parts': [[2023, 3, 1]] },
          'references-count': 46,
          URL: 'http://dx.doi.org/10.1101/2023.02.28.529746',
          relation: {},
          published: { 'date-parts': [[2023, 3, 1]] },
          subtype: 'preprint',
        },
      },
    })

    fetch.get('https://api.crossref.org/works/10.1101%2F2022.01.13.476201', {
      body: {
        status: 'ok',
        'message-type': 'work',
        'message-version': '1.0.0',
        message: {
          institution: [{ name: 'bioRxiv' }],
          indexed: { 'date-parts': [[2022, 3, 30]], 'date-time': '2022-03-30T20:22:00Z', timestamp: 1648671720584 },
          posted: { 'date-parts': [[2022, 1, 14]] },
          'group-title': 'Plant Biology',
          'reference-count': 53,
          publisher: 'Cold Spring Harbor Laboratory',
          'content-domain': { domain: [], 'crossmark-restriction': false },
          'short-container-title': [],
          accepted: { 'date-parts': [[2022, 1, 14]] },
          abstract:
            '<jats:title>Some title</jats:title><jats:p>Non-photochemical quenching (NPQ) is the process that protects photosynthetic organisms from photodamage by dissipating the energy absorbed in excess as heat. In the model green alga <jats:italic>Chlamydomonas reinhardtii</jats:italic>, NPQ was abolished in the knock-out mutants of the pigment-protein complexes LHCSR3 and LHCBM1. However, while LHCSR3 was shown to be a pH sensor and switching to a quenched conformation at low pH, the role of LHCBM1 in NPQ has not been elucidated yet. In this work, we combine biochemical and physiological measurements to study short-term high light acclimation of <jats:italic>npq5</jats:italic>, the mutant lacking LHCBM1. We show that while in low light in the absence of this complex, the antenna size of PSII is smaller than in its presence, this effect is marginal in high light, implying that a reduction of the antenna is not responsible for the low NPQ. We also show that the mutant expresses LHCSR3 at the WT level in high light, indicating that the absence of this complex is also not the reason. Finally, NPQ remains low in the mutant even when the pH is artificially lowered to values that can switch LHCSR3 to the quenched conformation. It is concluded that both LHCSR3 and LHCBM1 need to be present for the induction of NPQ and that LHCBM1 is the interacting partner of LHCSR3. This interaction can either enhance the quenching capacity of LHCSR3 or connect this complex with the PSII supercomplex.</jats:p>',
          DOI: '10.1101/2022.01.13.476201',
          type: 'posted-content',
          created: { 'date-parts': [[2022, 1, 15]], 'date-time': '2022-01-15T05:05:41Z', timestamp: 1642223141000 },
          source: 'Crossref',
          'is-referenced-by-count': 0,
          title: ['The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>'],
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
          deposited: { 'date-parts': [[2022, 1, 18]], 'date-time': '2022-01-18T07:30:32Z', timestamp: 1642491032000 },
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

    fetch.get('https://api.crossref.org/works/10.1101%2F12345678', {
      body: {
        status: 'ok',
        'message-type': 'work',
        'message-version': '1.0.0',
        message: {
          indexed: { 'date-parts': [[2023, 4, 21]], 'date-time': '2023-04-21T05:37:01Z', timestamp: 1682055421220 },
          publisher: 'Cold Spring Harbor Laboratory',
          institution: [{ name: 'bioRxiv' }],
          'content-domain': { domain: ['psychoceramics.labs.crossref.org'], 'crossmark-restriction': false },
          'published-print': { 'date-parts': [[2008, 8, 14]] },
          abstract:
            '<jats:p>The characteristic theme of the works of Stone is the bridge between culture and society. Several narratives concerning the fatal !aw, and subsequent dialectic, of semioticist class may be found. Thus, Debord uses the term \u2018the subtextual paradigm of consensus\u2019 to denote a cultural paradox. The subject is interpolated into a neocultural discourse that includes sexuality as a totality. But Marx\u2019s critique of prepatriarchialist nihilism states that consciousness is capable of signi"cance. The main theme of Dietrich\u2019s[1]model of cultural discourse is not construction, but neoconstruction. Thus, any number of narratives concerning the textual paradigm of narrative exist. Pretextual cultural theory suggests that context must come from the collective unconscious.</jats:p>',
          DOI: '10.1101/12345678',
          type: 'posted-content',
          subtype: 'preprint',
          created: { 'date-parts': [[2011, 11, 9]], 'date-time': '2011-11-09T14:42:05Z', timestamp: 1320849725000 },
          page: '1-3',
          'update-policy': 'http://dx.doi.org/10.5555/something',
          source: 'Crossref',
          'is-referenced-by-count': 3,
          title: ['Toward a Unified Theory of High-Energy Metaphysics: Silly String Theory'],
          prefix: '10.5555',
          volume: '5',
          'clinical-trial-number': [{ 'clinical-trial-number': 'isrctn12345', registry: '10.18810/isrctn' }],
          author: [
            {
              ORCID: 'http://orcid.org/0000-0002-1825-0097',
              'authenticated-orcid': false,
              suffix: 'Jr.',
              given: 'Josiah',
              family: 'Carberry',
              sequence: 'first',
              affiliation: [{ name: 'Department of Psychoceramics, Brown University' }],
            },
          ],
          member: '7822',
          'container-title': ['Journal of Psychoceramics'],
          'original-title': [],
          language: 'en',
          link: [
            {
              URL: 'http://psychoceramics.labs.crossref.org/10.5555-12345678.html',
              'content-type': 'unspecified',
              'content-version': 'vor',
              'intended-application': 'similarity-checking',
            },
          ],
          deposited: { 'date-parts': [[2023, 4, 20]], 'date-time': '2023-04-20T12:29:52Z', timestamp: 1681993792000 },
          score: 1,
          resource: {
            primary: { URL: 'https://ojs33.crossref.publicknowledgeproject.org/index.php/test/article/view/2' },
          },
          subtitle: [],
          'short-title': [],
          issued: { 'date-parts': [[2008, 8, 13]] },
          URL: 'http://dx.doi.org/10.1101/12345678',
          ISSN: ['0264-3561'],
          'issn-type': [{ value: '0264-3561', type: 'electronic' }],
          published: { 'date-parts': [[2008, 8, 13]] },
        },
      },
    })

    fetch.get('https://api.openalex.org/works/https://doi.org/10.1101/2022.01.13.476201', {
      body: {
        id: 'https://openalex.org/W4206359858',
        doi: 'https://doi.org/10.1101/2022.01.13.476201',
        title: 'The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>',
        display_name: 'The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>',
        publication_year: 2022,
        publication_date: '2022-01-14',
        ids: { openalex: 'https://openalex.org/W4206359858', doi: 'https://doi.org/10.1101/2022.01.13.476201' },
        language: 'en',
        primary_location: {
          is_oa: true,
          landing_page_url: 'https://doi.org/10.1101/2022.01.13.476201',
          pdf_url: 'https://www.biorxiv.org/content/biorxiv/early/2022/01/14/2022.01.13.476201.full.pdf',
          source: {
            id: 'https://openalex.org/S4306402567',
            display_name: 'bioRxiv (Cold Spring Harbor Laboratory)',
            issn_l: null,
            issn: null,
            is_oa: true,
            is_in_doaj: false,
            host_organization: 'https://openalex.org/I2750212522',
            host_organization_name: 'Cold Spring Harbor Laboratory',
            host_organization_lineage: ['https://openalex.org/I2750212522'],
            host_organization_lineage_names: ['Cold Spring Harbor Laboratory'],
            type: 'repository',
          },
          license: 'cc-by-nd',
          license_id: 'https://openalex.org/licenses/cc-by-nd',
          version: 'submittedVersion',
          is_accepted: false,
          is_published: false,
        },
        type: 'preprint',
        type_crossref: 'posted-content',
        indexed_in: ['crossref'],
        open_access: {
          is_oa: true,
          oa_status: 'green',
          oa_url: 'https://www.biorxiv.org/content/biorxiv/early/2022/01/14/2022.01.13.476201.full.pdf',
          any_repository_has_fulltext: true,
        },
        authorships: [
          {
            author_position: 'first',
            author: {
              id: 'https://openalex.org/A5021687717',
              display_name: 'Xin Liu',
              orcid: 'https://orcid.org/0000-0002-6035-6055',
            },
            institutions: [
              {
                id: 'https://openalex.org/I865915315',
                display_name: 'Vrije Universiteit Amsterdam',
                ror: 'https://ror.org/008xxew50',
                country_code: 'NL',
                type: 'education',
                lineage: ['https://openalex.org/I865915315'],
              },
            ],
            countries: ['NL'],
            is_corresponding: false,
            raw_author_name: 'Xin Liu',
            raw_affiliation_strings: [
              'Biophysics of Photosynthesis, Department of Physics and Astronomy, Faculty of Science, Vrije Universiteit Amsterdam',
            ],
          },
          {
            author_position: 'middle',
            author: {
              id: 'https://openalex.org/A5032452784',
              display_name: 'Wojciech J. Nawrocki',
              orcid: 'https://orcid.org/0000-0001-5124-3000',
            },
            institutions: [
              {
                id: 'https://openalex.org/I865915315',
                display_name: 'Vrije Universiteit Amsterdam',
                ror: 'https://ror.org/008xxew50',
                country_code: 'NL',
                type: 'education',
                lineage: ['https://openalex.org/I865915315'],
              },
            ],
            countries: ['NL'],
            is_corresponding: false,
            raw_author_name: 'Wojciech Nawrocki',
            raw_affiliation_strings: [
              'Biophysics of Photosynthesis, Department of Physics and Astronomy, Faculty of Science, Vrije Universiteit Amsterdam',
            ],
          },
          {
            author_position: 'last',
            author: {
              id: 'https://openalex.org/A5036165713',
              display_name: 'Roberta Croce',
              orcid: 'https://orcid.org/0000-0003-3469-834X',
            },
            institutions: [
              {
                id: 'https://openalex.org/I865915315',
                display_name: 'Vrije Universiteit Amsterdam',
                ror: 'https://ror.org/008xxew50',
                country_code: 'NL',
                type: 'education',
                lineage: ['https://openalex.org/I865915315'],
              },
            ],
            countries: ['NL'],
            is_corresponding: true,
            raw_author_name: 'Roberta Croce',
            raw_affiliation_strings: [
              'Biophysics of Photosynthesis, Department of Physics and Astronomy, Faculty of Science, Vrije Universiteit Amsterdam',
            ],
          },
        ],
        countries_distinct_count: 1,
        institutions_distinct_count: 1,
        corresponding_author_ids: ['https://openalex.org/A5036165713'],
        corresponding_institution_ids: ['https://openalex.org/I865915315'],
        apc_list: null,
        apc_paid: null,
        has_fulltext: true,
        fulltext_origin: 'pdf',
        cited_by_count: 0,
        cited_by_percentile_year: { min: 0, max: 67 },
        biblio: { volume: null, issue: null, first_page: null, last_page: null },
        is_retracted: false,
        is_paratext: false,
        primary_topic: {
          id: 'https://openalex.org/T10303',
          display_name: 'Molecular Mechanisms of Photosynthesis and Photoprotection',
          score: 0.9991,
          subfield: { id: 'https://openalex.org/subfields/1312', display_name: 'Molecular Biology' },
          field: {
            id: 'https://openalex.org/fields/13',
            display_name: 'Biochemistry, Genetics and Molecular Biology',
          },
          domain: { id: 'https://openalex.org/domains/1', display_name: 'Life Sciences' },
        },
        topics: [
          {
            id: 'https://openalex.org/T10303',
            display_name: 'Molecular Mechanisms of Photosynthesis and Photoprotection',
            score: 0.9991,
            subfield: { id: 'https://openalex.org/subfields/1312', display_name: 'Molecular Biology' },
            field: {
              id: 'https://openalex.org/fields/13',
              display_name: 'Biochemistry, Genetics and Molecular Biology',
            },
            domain: { id: 'https://openalex.org/domains/1', display_name: 'Life Sciences' },
          },
          {
            id: 'https://openalex.org/T12236',
            display_name: 'Optogenetics in Neuroscience and Biophysics Research',
            score: 0.9974,
            subfield: {
              id: 'https://openalex.org/subfields/2804',
              display_name: 'Cellular and Molecular Neuroscience',
            },
            field: { id: 'https://openalex.org/fields/28', display_name: 'Neuroscience' },
            domain: { id: 'https://openalex.org/domains/1', display_name: 'Life Sciences' },
          },
          {
            id: 'https://openalex.org/T10476',
            display_name: 'Microalgae as a Source for Biofuels Production',
            score: 0.9949,
            subfield: {
              id: 'https://openalex.org/subfields/2105',
              display_name: 'Renewable Energy, Sustainability and the Environment',
            },
            field: { id: 'https://openalex.org/fields/21', display_name: 'Energy' },
            domain: { id: 'https://openalex.org/domains/3', display_name: 'Physical Sciences' },
          },
        ],
        keywords: [
          {
            id: 'https://openalex.org/keywords/photosynthetic-acclimation',
            display_name: 'Photosynthetic Acclimation',
            score: 0.515617,
          },
          {
            id: 'https://openalex.org/keywords/photoinhibition',
            display_name: 'Photoinhibition',
            score: 0.506606,
          },
        ],
        mesh: [],
        locations_count: 1,
        locations: [
          {
            is_oa: true,
            landing_page_url: 'https://doi.org/10.1101/2022.01.13.476201',
            pdf_url: 'https://www.biorxiv.org/content/biorxiv/early/2022/01/14/2022.01.13.476201.full.pdf',
            source: {
              id: 'https://openalex.org/S4306402567',
              display_name: 'bioRxiv (Cold Spring Harbor Laboratory)',
              issn_l: null,
              issn: null,
              is_oa: true,
              is_in_doaj: false,
              host_organization: 'https://openalex.org/I2750212522',
              host_organization_name: 'Cold Spring Harbor Laboratory',
              host_organization_lineage: ['https://openalex.org/I2750212522'],
              host_organization_lineage_names: ['Cold Spring Harbor Laboratory'],
              type: 'repository',
            },
            license: 'cc-by-nd',
            license_id: 'https://openalex.org/licenses/cc-by-nd',
            version: 'submittedVersion',
            is_accepted: false,
            is_published: false,
          },
        ],
        best_oa_location: {
          is_oa: true,
          landing_page_url: 'https://doi.org/10.1101/2022.01.13.476201',
          pdf_url: 'https://www.biorxiv.org/content/biorxiv/early/2022/01/14/2022.01.13.476201.full.pdf',
          source: {
            id: 'https://openalex.org/S4306402567',
            display_name: 'bioRxiv (Cold Spring Harbor Laboratory)',
            issn_l: null,
            issn: null,
            is_oa: true,
            is_in_doaj: false,
            host_organization: 'https://openalex.org/I2750212522',
            host_organization_name: 'Cold Spring Harbor Laboratory',
            host_organization_lineage: ['https://openalex.org/I2750212522'],
            host_organization_lineage_names: ['Cold Spring Harbor Laboratory'],
            type: 'repository',
          },
          license: 'cc-by-nd',
          license_id: 'https://openalex.org/licenses/cc-by-nd',
          version: 'submittedVersion',
          is_accepted: false,
          is_published: false,
        },
        sustainable_development_goals: [
          {
            id: 'https://metadata.un.org/sdg/7',
            display_name: 'Affordable and clean energy',
            score: 0.78,
          },
        ],
        grants: [],
        datasets: [],
        versions: [],
        referenced_works_count: 51,
        referenced_works: [
          'https://openalex.org/W134127689',
          'https://openalex.org/W1568162366',
          'https://openalex.org/W1970526473',
          'https://openalex.org/W1971641754',
          'https://openalex.org/W1981992705',
          'https://openalex.org/W1987833932',
          'https://openalex.org/W1990210189',
          'https://openalex.org/W1991725176',
          'https://openalex.org/W2007011722',
          'https://openalex.org/W2021795499',
          'https://openalex.org/W2033623913',
          'https://openalex.org/W2035922010',
          'https://openalex.org/W2038561546',
          'https://openalex.org/W2056927923',
          'https://openalex.org/W2068737656',
          'https://openalex.org/W2087256582',
          'https://openalex.org/W2100719715',
          'https://openalex.org/W2102005699',
          'https://openalex.org/W2115653568',
          'https://openalex.org/W2135783270',
          'https://openalex.org/W2136928419',
          'https://openalex.org/W2139033039',
          'https://openalex.org/W2142283539',
          'https://openalex.org/W2147645856',
          'https://openalex.org/W2147824138',
          'https://openalex.org/W2153489021',
          'https://openalex.org/W2154318647',
          'https://openalex.org/W2155718235',
          'https://openalex.org/W2162598521',
          'https://openalex.org/W2192671216',
          'https://openalex.org/W2318932191',
          'https://openalex.org/W2322888409',
          'https://openalex.org/W2329635146',
          'https://openalex.org/W2466137595',
          'https://openalex.org/W2548916659',
          'https://openalex.org/W2559868319',
          'https://openalex.org/W2567090989',
          'https://openalex.org/W2594140429',
          'https://openalex.org/W2785996187',
          'https://openalex.org/W2803410790',
          'https://openalex.org/W2807002246',
          'https://openalex.org/W2903221721',
          'https://openalex.org/W2937431129',
          'https://openalex.org/W2950438582',
          'https://openalex.org/W2981360590',
          'https://openalex.org/W2990667593',
          'https://openalex.org/W3036069144',
          'https://openalex.org/W3053643583',
          'https://openalex.org/W3080230089',
          'https://openalex.org/W3088607004',
          'https://openalex.org/W4200265845',
        ],
        related_works: [
          'https://openalex.org/W3041929231',
          'https://openalex.org/W2954423397',
          'https://openalex.org/W2790919553',
          'https://openalex.org/W2774818546',
          'https://openalex.org/W2466776079',
          'https://openalex.org/W2168209773',
          'https://openalex.org/W2047295734',
          'https://openalex.org/W2044250405',
          'https://openalex.org/W165793422',
          'https://openalex.org/W1275557975',
        ],
        ngrams_url: 'https://api.openalex.org/works/W4206359858/ngrams',
        cited_by_api_url: 'https://api.openalex.org/works?filter=cites:W4206359858',
        counts_by_year: [],
        updated_date: '2024-05-10T08:38:37.907082',
        created_date: '2022-01-26',
      },
    })

    fetch.get(
      {
        name: '10.1101/12345678 reviews',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.1101/12345678"' },
      },
      { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    )

    fetch.get('http://prereview.test/api/v2/preprints/doi-10.1101-12345678/rapid-reviews', {
      body: { data: [] },
    })

    fetch.get('http://coar-notify.prereview.test/requests?page=1', {
      body: [
        {
          timestamp: '2024-04-26T08:25:54.526Z',
          preprint: '10.1101/2023.02.28.529746',
          language: 'es',
          fields: ['13', '24'],
          subfields: ['1312', '2403'],
        },
        {
          timestamp: '2024-04-25T10:42:37.213Z',
          preprint: '10.1101/2022.01.13.476201',
          language: 'en',
          fields: ['13', '28', '21'],
          subfields: ['1312', '2804', '2105'],
        },
      ],
    })

    fetch.get('http://coar-notify.prereview.test/requests?page=2', {
      body: [],
    })

    await use(fetch)
  },
  formStore: async ({}, use) => {
    await use(new Keyv())
  },
  isOpenForRequestsStore: async ({}, use) => {
    await use(new Keyv())
  },
  isUserBlocked: async ({}, use) => {
    await use(() => false)
  },
  languagesStore: async ({}, use) => {
    await use(new Keyv())
  },
  locationStore: async ({}, use) => {
    await use(new Keyv())
  },
  logger: async ({}, use, testInfo) => {
    const logs: Array<L.LogEntry> = []
    const logger: L.Logger = entry => () => logs.push(entry)

    await use(logger)

    await fs.writeFile(testInfo.outputPath('server.log'), logs.map(L.ShowLogEntry.show).join('\n'))
  },
  emails: async ({}, use, testInfo) => {
    const emails: Array<nodemailer.SendMailOptions> = []

    await use(emails)

    await fs.writeFile(testInfo.outputPath('emails.json'), JSON.stringify(emails, undefined, 2))
  },
  nodemailer: async ({ emails }, use) => {
    await use(
      nodemailer.createTransport<unknown>({
        name: 'test',
        version: '0.1.0',
        send: (mail, callback) => {
          emails.push(mail.data)
          callback(null, undefined)
        },
      }),
    )
  },
  oauthServer: async ({}, use) => {
    const server = new OAuth2Server()
    server.service.on('beforeAuthorizeRedirect', ({ url }: MutableRedirectUri) => {
      if (!url.searchParams.has('state')) {
        url.searchParams.set('state', '')
      }
    })

    await server.start()

    await use(server)

    await server.stop()
  },
  port: async ({}, use, workerInfo) => {
    await use(8000 + workerInfo.workerIndex)
  },
  researchInterestsStore: async ({}, use) => {
    await use(new Keyv())
  },
  reviewRequestStore: async ({}, use) => {
    await use(new Keyv())
  },
  server: [
    async (
      {
        fetch,
        logger,
        oauthServer,
        port,
        updatesLegacyPrereview,
        formStore,
        careerStageStore,
        contactEmailAddressStore,
        isOpenForRequestsStore,
        isUserBlocked,
        languagesStore,
        locationStore,
        researchInterestsStore,
        reviewRequestStore,
        slackUserIdStore,
        userOnboardingStore,
        wasPrereviewRemoved,
        authorInviteStore,
        nodemailer,
        canAddMultipleAuthors,
        canLogInAsDemoUser,
        canReviewDatasets,
        sqlClientLayer,
      },
      use,
      testInfo,
    ) => {
      const server = pipe(
        Program,
        Layer.launch,
        Effect.provide(NodeHttpServer.layer(() => http.createServer(), { port })),
        Effect.provideService(ExpressConfig, {
          allowSiteCrawlers: true,
          authorInviteStore,
          avatarStore: new Keyv(),
          formStore,
          careerStageStore,
          contactEmailAddressStore,
          isOpenForRequestsStore,
          isUserBlocked,
          languagesStore,
          locationStore,
          orcidOauth: {
            authorizeUrl: new URL('/authorize', oauthServer.issuer.url),
            clientId: 'client-id',
            clientSecret: 'client-secret',
            tokenUrl: new URL('http://orcid.test/token'),
          },
          orcidTokenStore: new Keyv(),
          researchInterestsStore,
          reviewRequestStore,
          scietyListToken: NonEmptyString('secret'),
          sessionCookie: 'session',
          sessionStore: new Keyv(),
          slackOauth: {
            authorizeUrl: new URL('/authorize', oauthServer.issuer.url),
            clientId: 'client-id',
            clientSecret: 'client-secret',
            tokenUrl: new URL('http://slack.test/token'),
          },
          slackUserIdStore,
          userOnboardingStore,
          wasPrereviewRemoved,
        }),
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(
          Layer.mergeAll(
            CachingHttpClient.layerInMemory(),
            FeatureFlags.layer({
              aiReviewsAsCc0: () => false,
              askAiReviewEarly: () => false,
              canAddMultipleAuthors,
              canLogInAsDemoUser,
              canReviewDatasets,
              useCrowdinInContext: false,
            }),
            Nodemailer.layer(nodemailer),
            Layer.succeed(FetchHttpClient.Fetch, fetch as typeof globalThis.fetch),
            Layer.succeed(Ghost.GhostApi, { key: Redacted.make('key') }),
            Layer.succeed(SlackApiConfig, { apiToken: Redacted.make(''), apiUpdate: true }),
            Layer.succeed(Cloudinary.CloudinaryApi, {
              cloudName: 'prereview',
              key: Redacted.make('key'),
              secret: Redacted.make('app'),
            }),
            Layer.succeed(LegacyPrereviewApi, {
              app: 'app',
              key: Redacted.make('key'),
              origin: new URL('http://prereview.test'),
              update: updatesLegacyPrereview,
            }),
            Layer.succeed(Orcid.OrcidApi, {
              origin: new URL('http://api.orcid.test/'),
              token: Option.none(),
            }),
            Layer.succeed(OrcidOauth, {
              authorizeUrl: new URL('/authorize', oauthServer.issuer.url),
              clientId: 'client-id',
              clientSecret: Redacted.make('client-secret'),
              revokeUrl: new URL('http://orcid.test/revoke'),
              tokenUrl: new URL('http://orcid.test/token'),
            }),
            Layer.succeed(PrereviewCoarNotify.PrereviewCoarNotifyConfig, {
              coarNotifyToken: Redacted.make('token'),
              coarNotifyUrl: new URL('http://coar-notify.prereview.test'),
            }),
            Layer.succeed(PublicUrl, new URL(`http://localhost:${port}`)),
            Layer.succeed(SessionSecret, Redacted.make('')),
            Layer.succeed(Zenodo.ZenodoApi, {
              key: Redacted.make('key'),
              origin: new URL('http://zenodo.test/'),
            }),
            TemplatePage.optionsLayer({ fathomId: Option.none(), environmentLabel: Option.none() }),
          ),
        ),
        Effect.provide(sqlClientLayer),
        Effect.tapErrorCause(Effect.logError),
        Effect.provide(EffectLogger.replaceEffect(EffectLogger.defaultLogger, DeprecatedLogger)),
        EffectLogger.withMinimumLogLevel(LogLevel.Debug),
        Effect.provideService(DeprecatedLoggerEnv, { clock: SystemClock, logger }),
        Effect.orDie,
        Effect.withConfigProvider(
          ConfigProvider.orElse(
            ConfigProvider.fromJson({
              DATASET_REVIEWS_LIBSQL_URL: `file:${testInfo.outputPath('dataset-reviews.db')}`,
            }),
            ConfigProvider.fromEnv,
          ),
        ),
      )

      const fiber = Effect.runFork(server)

      await pipe(
        HttpClient.head(`http://localhost:${port}/health`),
        Effect.timeout('50 millis'),
        Effect.andThen(HttpClientResponse.filterStatusOk),
        Effect.retry(Schedule.forever),
        Effect.provide(FetchHttpClient.layer),
        Effect.runPromise,
      )

      await use(fiber)

      await pipe(Fiber.interrupt(fiber), Effect.runPromise)
    },
    { auto: true },
  ],
  slackUserIdStore: async ({}, use) => {
    await use(new Keyv())
  },
  sqlClientLayer: async ({}, use, testInfo) => {
    await use(LibsqlClient.layer({ url: `file:${testInfo.outputPath('database.db')}` }))
  },
  userOnboardingStore: async ({}, use) => {
    await use(new Keyv())
  },
  updatesLegacyPrereview: async ({}, use) => {
    await use(false)
  },
  wasPrereviewRemoved: async ({}, use) => {
    await use(() => false)
  },
}

export const useCockroachDB: Fixtures<
  Pick<AppFixtures, 'sqlClientLayer'>,
  Record<never, never>,
  Pick<AppFixtures, 'sqlClientLayer'>
> = {
  sqlClientLayer: async ({}, use) => {
    await use(
      pipe(
        Config.url('COCKROACHDB_URL'),
        Effect.andThen(url =>
          Effect.gen(function* () {
            const pgClient = yield* PgClient.make({ url: Redacted.make(url.href) })

            const databaseName = `test${v4()().slice(0, 8)}`

            yield* pgClient.unsafe(`CREATE DATABASE ${databaseName}`)

            return Url.setPathname(url, databaseName)
          }),
        ),
        Effect.scoped,
        Effect.provide(Reactivity.layer),
        Effect.andThen(url => PgClient.layer({ url: Redacted.make(url.href) })),
        Layer.unwrapEffect,
      ),
    )
  },
}

export const updatesLegacyPrereview: Fixtures<
  Pick<AppFixtures, 'updatesLegacyPrereview'>,
  Record<never, never>,
  Pick<AppFixtures, 'updatesLegacyPrereview'>
> = {
  updatesLegacyPrereview: async ({}, use) => {
    await use(true)
  },
}

export const isANewUser: Fixtures<Record<never, never>, Record<never, never>, { hasSeenMyDetailsPage: boolean }> = {
  hasSeenMyDetailsPage: async ({}, use) => {
    await use(false)
  },
}

export const canLogIn: Fixtures<
  { hasSeenMyDetailsPage: boolean },
  Record<never, never>,
  Pick<AppFixtures, 'fetch' | 'userOnboardingStore'> & Pick<PlaywrightTestArgs, 'page'>
> = {
  hasSeenMyDetailsPage: async ({}, use) => {
    await use(true)
  },
  page: async ({ fetch, hasSeenMyDetailsPage, page, userOnboardingStore }, use) => {
    fetch.post('http://orcid.test/token', {
      status: StatusCodes.OK,
      body: {
        access_token: 'access-token',
        token_type: 'Bearer',
        name: 'Josiah Carberry',
        orcid: '0000-0002-1825-0097',
        scope: '/authenticate',
      },
    })

    await userOnboardingStore.set('0000-0002-1825-0097', { seenMyDetailsPage: hasSeenMyDetailsPage })

    await use(page)
  },
}

export const canLogInAsDemoUser: Fixtures<
  Record<never, never>,
  Record<never, never>,
  Pick<AppFixtures, 'canLogInAsDemoUser'>
> = {
  canLogInAsDemoUser: async ({}, use) => {
    await use(true)
  },
}

export const userIsBlocked: Fixtures<Record<never, never>, Record<never, never>, Pick<AppFixtures, 'isUserBlocked'>> = {
  isUserBlocked: async ({}, use) => {
    await use(() => true)
  },
}

export const prereviewWasRemoved: Fixtures<
  Record<never, never>,
  Record<never, never>,
  Pick<AppFixtures, 'wasPrereviewRemoved'>
> = {
  wasPrereviewRemoved: async ({}, use) => {
    await use(() => true)
  },
}

export const areLoggedIn: Fixtures<Record<never, never>, Record<never, never>, Pick<PlaywrightTestArgs, 'page'>> = {
  page: async ({ page }, use) => {
    await page.goto('/log-in', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveTitle(/PREreview/)

    await use(page)
  },
}

export const isASlackUser: Fixtures<
  Record<never, never>,
  Record<never, never>,
  Pick<AppFixtures, 'slackUserIdStore' | 'fetch'>
> = {
  fetch: async ({ fetch }, use) => {
    fetch.post('http://slack.test/token', {
      status: StatusCodes.OK,
      body: {
        authed_user: {
          id: 'U0JM',
          access_token: 'access-token',
          token_type: 'user',
          scope: 'users.profile:read,users.profile:write',
        },
      },
    })

    fetch.post('https://slack.com/api/users.profile.set', { status: StatusCodes.OK, body: { ok: true } })

    fetch.post('https://slack.com/api/chat.postMessage', { status: StatusCodes.OK, body: { ok: true } })

    fetch.get('https://slack.com/api/users.profile.get?user=U0JM', {
      body: {
        ok: true,
        profile: {
          real_name: 'jcarberry',
          image_48: 'https://secure.gravatar.com/avatar/00000000000000000000000000000000?s=48&d=mp&f=y',
        },
      },
    })

    await use(fetch)
  },
  slackUserIdStore: async ({ slackUserIdStore }, use) => {
    await use(slackUserIdStore)
  },
}

export const willPublishAReview: Fixtures<
  Pick<AppFixtures, 'fetch'>,
  Record<never, never>,
  Pick<AppFixtures, 'fetch'>
> = {
  fetch: async ({ fetch }, use) => {
    const record = {
      conceptdoi: Doi('10.5072/zenodo.1055805'),
      conceptrecid: 1055805,
      files: [
        {
          links: {
            self: new URL('http://example.com/review.html/content'),
          },
          key: 'review.html',
          size: 58,
        },
      ],
      id: 1055806,
      links: {
        latest: new URL('http://example.com/latest'),
        latest_html: new URL('http://example.com/latest_html'),
      },
      metadata: {
        access_right: 'open',
        communities: [{ id: 'prereview-reviews' }],
        creators: [
          {
            name: 'Josiah Carberry',
            orcid: OrcidId('0000-0002-1825-0097'),
          },
        ],
        description: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>',
        doi: Doi('10.5072/zenodo.1055806'),
        license: { id: 'cc-by-4.0' },
        publication_date: new Date('2022-07-05'),
        related_identifiers: [
          {
            identifier: '10.1101/2022.01.13.476201',
            relation: 'reviews',
            resource_type: 'publication-preprint',
            scheme: 'doi',
          },
          {
            identifier: '10.5072/zenodo.1061863',
            relation: 'isVersionOf',
            scheme: 'doi',
          },
        ],
        resource_type: {
          type: 'publication',
          subtype: 'peerreview',
        },
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
      },
    } satisfies ZenodoRecord

    fetch
      .postOnce('http://zenodo.test/api/deposit/depositions', {
        body: EmptyDepositionC.encode({
          ...record,
          links: {
            bucket: new URL('http://example.com/bucket'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            prereserve_doi: {
              doi: record.metadata.doi,
            },
          },
          state: 'unsubmitted',
          submitted: false,
        }),
        status: StatusCodes.Created,
      })
      .putOnce('http://example.com/self', {
        body: UnsubmittedDepositionC.encode({
          ...record,
          links: {
            bucket: new URL('http://example.com/bucket'),
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            ...record.metadata,
            communities: [{ identifier: 'prereview-reviews' }],
            license: record.metadata.license.id,
            prereserve_doi: {
              doi: record.metadata.doi,
            },
            upload_type: 'publication',
            publication_type: 'peerreview',
          },
          state: 'unsubmitted',
          submitted: false,
        }),
        status: StatusCodes.OK,
      })
      .putOnce('http://example.com/bucket/review.html', {
        status: StatusCodes.Created,
      })
      .postOnce('http://example.com/publish', {
        body: SubmittedDepositionC.encode({
          ...record,
          links: {
            edit: new URL('http://example.com/edit'),
          },
          metadata: {
            ...record.metadata,
            communities: [{ identifier: 'prereview-reviews' }],
            license: record.metadata.license.id,
            upload_type: 'publication',
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }),
        status: StatusCodes.Accepted,
      })
      .getOnce(
        {
          name: 'reload-review',
          url: 'http://zenodo.test/api/records/1055806',
          functionMatcher: (_, req) => req.cache === 'reload',
        },
        { status: StatusCodes.ServiceUnavailable },
      )
      .getOnce(
        {
          name: 'reload-preprint-reviews',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
          functionMatcher: (_, req) => req.cache === 'reload',
        },
        { status: StatusCodes.ServiceUnavailable },
      )
      .postOnce('http://coar-notify.prereview.test/prereviews', { status: StatusCodes.Created })

    await use(fetch)
  },
}

export const willUpdateAReview: Fixtures<Record<never, never>, Record<never, never>, Pick<AppFixtures, 'fetch'>> = {
  fetch: async ({ fetch }, use) => {
    const record = {
      conceptdoi: Doi('10.5072/zenodo.1055805'),
      conceptrecid: 1055805,
      files: [
        {
          links: {
            self: new URL('http://example.com/review.html/content'),
          },
          key: 'review.html',
          size: 58,
        },
      ],
      id: 1055806,
      links: {
        latest: new URL('http://example.com/latest'),
        latest_html: new URL('http://example.com/latest_html'),
      },
      metadata: {
        access_right: 'open',
        communities: [{ id: 'prereview-reviews' }],
        creators: [
          {
            name: 'Josiah Carberry',
            orcid: OrcidId('0000-0002-1825-0097'),
          },
        ],
        description: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>',
        doi: Doi('10.5072/zenodo.1055806'),
        license: { id: 'cc-by-4.0' },
        publication_date: new Date('2022-07-05'),
        related_identifiers: [
          {
            identifier: '10.1101/2022.01.13.476201',
            relation: 'reviews',
            resource_type: 'publication-preprint',
            scheme: 'doi',
          },
          {
            identifier: '10.5072/zenodo.1061863',
            relation: 'isVersionOf',
            scheme: 'doi',
          },
        ],
        resource_type: {
          type: 'publication',
          subtype: 'peerreview',
        },
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
      },
    } satisfies ZenodoRecord

    fetch
      .getOnce(
        { name: 'get-published-deposition', url: 'http://zenodo.test/api/deposit/depositions/1055806' },
        {
          body: SubmittedDepositionC.encode({
            ...record,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              ...record.metadata,
              communities: [{ identifier: 'prereview-reviews' }],
              license: record.metadata.license.id,
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }),
        },
      )
      .postOnce(
        { name: 'unlock-deposition', url: 'http://example.com/edit' },
        {
          body: InProgressDepositionC.encode({
            ...record,
            links: {
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              ...record.metadata,
              communities: [{ identifier: 'prereview-reviews' }],
              license: record.metadata.license.id,
              prereserve_doi: { doi: record.metadata.doi },
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'inprogress',
            submitted: true,
          }),
          status: StatusCodes.Created,
        },
      )
      .putOnce(
        { name: 'update-deposition', url: 'http://example.com/self' },
        {
          body: InProgressDepositionC.encode({
            ...record,
            links: {
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              ...record.metadata,
              communities: [{ identifier: 'prereview-reviews' }],
              license: record.metadata.license.id,
              prereserve_doi: { doi: record.metadata.doi },
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'inprogress',
            submitted: true,
          }),
          status: StatusCodes.OK,
        },
      )
      .postOnce(
        { name: 'publish-updated-deposition', url: 'http://example.com/publish' },
        {
          body: SubmittedDepositionC.encode({
            ...record,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              ...record.metadata,
              communities: [{ identifier: 'prereview-reviews' }],
              license: record.metadata.license.id,
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }),
          status: StatusCodes.Accepted,
        },
      )
      .getOnce(
        {
          name: 'reload-review',
          url: 'http://zenodo.test/api/records/1055806',
          functionMatcher: (_, req) => req.cache === 'reload',
        },
        { status: StatusCodes.ServiceUnavailable },
      )
      .getOnce(
        {
          name: 'reload-preprint-reviews',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
          functionMatcher: (_, req) => req.cache === 'reload',
        },
        { status: StatusCodes.ServiceUnavailable },
      )

    await use(fetch)
  },
}

export const willPublishADatasetReview: Fixtures<
  Pick<AppFixtures, 'fetch'>,
  Record<never, never>,
  Pick<AppFixtures, 'fetch'>
> = {
  fetch: async ({ fetch }, use) => {
    const record = {
      conceptdoi: Doi('10.5072/zenodo.1055805'),
      conceptrecid: 1055805,
      files: [
        {
          links: {
            self: new URL('http://example.com/review.html/content'),
          },
          key: 'review.html',
          size: 58,
        },
      ],
      id: 1055806,
      links: {
        latest: new URL('http://example.com/latest'),
        latest_html: new URL('http://example.com/latest_html'),
      },
      metadata: {
        access_right: 'open',
        communities: [{ id: 'prereview-reviews' }],
        creators: [
          {
            name: 'Josiah Carberry',
            orcid: OrcidId('0000-0002-1825-0097'),
          },
        ],
        description: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>',
        doi: Doi('10.5072/zenodo.1055806'),
        license: { id: 'cc-by-4.0' },
        publication_date: new Date('2022-07-05'),
        related_identifiers: [
          {
            identifier: '10.5061/dryad.wstqjq2n3',
            relation: 'reviews',
            resource_type: 'dataset',
            scheme: 'doi',
          },
          {
            identifier: '10.5072/zenodo.1061863',
            relation: 'isVersionOf',
            scheme: 'doi',
          },
        ],
        resource_type: {
          type: 'publication',
          subtype: 'peerreview',
        },
        title: 'PREreview of "Metadata collected from 500 articles in the field of ecology and evolution"',
      },
    } satisfies ZenodoRecord

    fetch.postOnce('http://zenodo.test/api/deposit/depositions', {
      body: UnsubmittedDepositionC.encode({
        ...record,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
          self: new URL('http://example.com/self'),
        },
        metadata: {
          ...record.metadata,
          communities: [{ identifier: 'prereview-reviews' }],
          license: record.metadata.license.id,
          prereserve_doi: {
            doi: record.metadata.doi,
          },
          related_identifiers: [record.metadata.related_identifiers[0]],
          upload_type: 'publication',
          publication_type: 'peerreview',
        },
        state: 'unsubmitted',
        submitted: false,
      }),
      status: StatusCodes.Created,
    })

    fetch.putOnce('http://example.com/bucket/review.html', {
      status: StatusCodes.Created,
    })

    fetch.getOnce(
      `http://zenodo.test/api/deposit/depositions/${record.id}`,
      {
        body: UnsubmittedDepositionC.encode({
          ...record,
          links: {
            bucket: new URL('http://example.com/bucket'),
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            ...record.metadata,
            communities: [{ identifier: 'prereview-reviews' }],
            license: record.metadata.license.id,
            prereserve_doi: {
              doi: record.metadata.doi,
            },
            related_identifiers: [record.metadata.related_identifiers[0]],
            upload_type: 'publication',
            publication_type: 'peerreview',
          },
          state: 'unsubmitted',
          submitted: false,
        }),
        status: StatusCodes.OK,
      },
      { delay: 100 },
    )

    fetch.postOnce('http://example.com/publish', {
      body: SubmittedDepositionC.encode({
        ...record,
        links: {
          edit: new URL('http://example.com/edit'),
        },
        metadata: {
          ...record.metadata,
          communities: [{ identifier: 'prereview-reviews' }],
          license: record.metadata.license.id,
          upload_type: 'publication',
          publication_type: 'peerreview',
        },
        state: 'done',
        submitted: true,
      }),
      status: StatusCodes.Accepted,
    })

    await use(fetch)
  },
}

export const willPublishAComment: Fixtures<
  Pick<AppFixtures, 'fetch'>,
  Record<never, never>,
  Pick<AppFixtures, 'fetch'>
> = {
  fetch: async ({ fetch }, use) => {
    const record = {
      conceptdoi: Doi('10.5072/zenodo.112360'),
      conceptrecid: 112360,
      files: [
        {
          links: {
            self: new URL('http://example.com/comment.html/content'),
          },
          key: 'comment.html',
          size: 58,
        },
      ],
      id: 112361,
      links: {
        latest: new URL('http://example.com/latest'),
        latest_html: new URL('http://example.com/latest_html'),
      },
      metadata: {
        access_right: 'open',
        communities: [{ id: 'prereview-reviews' }],
        creators: [
          {
            name: 'Josiah Carberry',
            orcid: OrcidId('0000-0002-1825-0097'),
          },
        ],
        description: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>',
        doi: Doi('10.5072/zenodo.112360'),
        license: { id: 'cc-by-4.0' },
        publication_date: new Date('2022-07-05'),
        related_identifiers: [
          {
            identifier: '10.1101/2022.01.13.476201',
            relation: 'references',
            resource_type: 'publication-preprint',
            scheme: 'doi',
          },
          {
            identifier: '10.5072/zenodo.1061864',
            relation: 'references',
            resource_type: 'publication-peerreview',
            scheme: 'doi',
          },
          {
            identifier: '10.5072/zenodo.112360',
            relation: 'isVersionOf',
            scheme: 'doi',
          },
        ],
        resource_type: {
          type: 'publication',
          subtype: 'other',
        },
        title:
          'Comment on a PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
      },
    } satisfies ZenodoRecord

    fetch
      .postOnce('http://zenodo.test/api/deposit/depositions', {
        body: EmptyDepositionC.encode({
          ...record,
          links: {
            bucket: new URL('http://example.com/bucket'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            prereserve_doi: {
              doi: record.metadata.doi,
            },
          },
          state: 'unsubmitted',
          submitted: false,
        }),
        status: StatusCodes.Created,
      })
      .putOnce('http://example.com/self', {
        body: UnsubmittedDepositionC.encode({
          ...record,
          links: {
            bucket: new URL('http://example.com/bucket'),
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            ...record.metadata,
            communities: [{ identifier: 'prereview-reviews' }],
            license: record.metadata.license.id,
            prereserve_doi: {
              doi: record.metadata.doi,
            },
            upload_type: 'publication',
            publication_type: 'other',
          },
          state: 'unsubmitted',
          submitted: false,
        }),
        status: StatusCodes.OK,
      })
      .putOnce('http://example.com/bucket/comment.html', {
        status: StatusCodes.Created,
      })
      .getOnce('http://zenodo.test/api/deposit/depositions/112361', {
        body: UnsubmittedDepositionC.encode({
          ...record,
          links: {
            bucket: new URL('http://example.com/bucket'),
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            ...record.metadata,
            communities: [{ identifier: 'prereview-reviews' }],
            license: record.metadata.license.id,
            prereserve_doi: {
              doi: record.metadata.doi,
            },
            upload_type: 'publication',
            publication_type: 'other',
          },
          state: 'unsubmitted',
          submitted: false,
        }),
        status: StatusCodes.OK,
      })
      .postOnce(
        'http://example.com/publish',
        {
          body: SubmittedDepositionC.encode({
            ...record,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              ...record.metadata,
              communities: [{ identifier: 'prereview-reviews' }],
              license: record.metadata.license.id,
              upload_type: 'publication',
              publication_type: 'other',
            },
            state: 'done',
            submitted: true,
          }),
          status: StatusCodes.Accepted,
        },
        { delay: 100 },
      )
      .getOnce('http://api.orcid.test/v3.0/0000-0002-1825-0097/personal-details', {
        body: {
          name: { 'given-names': { value: 'Josiah' }, 'family-name': { value: 'Carberry' }, 'credit-name': null },
        },
      })

    await use(fetch)
  },
}

export const hasAnUnverifiedEmailAddress: Fixtures<
  Record<never, never>,
  Record<never, never>,
  Pick<AppFixtures, 'contactEmailAddressStore'>
> = {
  contactEmailAddressStore: async ({ contactEmailAddressStore }, use) => {
    await contactEmailAddressStore.set(
      '0000-0002-1825-0097',
      ContactEmailAddressC.encode(
        new UnverifiedContactEmailAddress({
          value: EmailAddress('jcarberry@example.com'),
          verificationToken: Uuid('ff0d6f8e-7dca-4a26-b68b-93f2d2bc3c2a'),
        }),
      ),
    )

    await use(contactEmailAddressStore)
  },
}

export const hasAVerifiedEmailAddress: Fixtures<
  Record<never, never>,
  Record<never, never>,
  Pick<AppFixtures, 'contactEmailAddressStore'>
> = {
  contactEmailAddressStore: async ({ contactEmailAddressStore }, use) => {
    await contactEmailAddressStore.set(
      '0000-0002-1825-0097',
      ContactEmailAddressC.encode(new VerifiedContactEmailAddress({ value: EmailAddress('jcarberry@example.com') })),
    )

    await use(contactEmailAddressStore)
  },
}

export const invitedToBeAnAuthor: Fixtures<
  Record<never, never>,
  Record<never, never>,
  Pick<AppFixtures, 'authorInviteStore' | 'fetch'> &
    Pick<PlaywrightTestArgs, 'page'> &
    Pick<BrowserContextOptions, 'baseURL'>
> = {
  page: async ({ authorInviteStore, baseURL, fetch, page }, use) => {
    const record = {
      conceptdoi: Doi('10.5072/zenodo.1055805'),
      conceptrecid: 1055805,
      files: [
        {
          links: {
            self: new URL('http://example.com/review.html/content'),
          },
          key: 'review.html',
          size: 58,
        },
      ],
      id: 1055806,
      links: {
        latest: new URL('http://example.com/latest'),
        latest_html: new URL('http://example.com/latest_html'),
      },
      metadata: {
        access_right: 'open',
        communities: [{ id: 'prereview-reviews' }],
        creators: [
          {
            name: 'Josiah Carberry',
            orcid: OrcidId('0000-0002-1825-0097'),
          },
        ],
        description: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>',
        doi: Doi('10.5072/zenodo.1055806'),
        license: { id: 'cc-by-4.0' },
        publication_date: new Date('2022-07-05'),
        related_identifiers: [
          {
            identifier: '10.1101/2022.01.13.476201',
            relation: 'reviews',
            resource_type: 'publication-preprint',
            scheme: 'doi',
          },
          {
            identifier: '10.5072/zenodo.1061863',
            relation: 'isVersionOf',
            scheme: 'doi',
          },
        ],
        resource_type: {
          type: 'publication',
          subtype: 'peerreview',
        },
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
      },
    } satisfies ZenodoRecord

    fetch
      .get('http://zenodo.test/api/records/1055806', {
        body: RecordC.encode(record),
      })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })

    await authorInviteStore.set(
      'bec5727e-9992-4f3b-85be-6712df617b9d',
      AuthorInviteC.encode({
        status: 'open',
        emailAddress: EmailAddress('jcarberry@example.com'),
        review: 1055806,
      }),
    )

    const email = createAuthorInviteEmail(
      {
        name: NonEmptyString('Josiah Carberry'),
        emailAddress: EmailAddress('jcarberry@example.com'),
      },
      Uuid('bec5727e-9992-4f3b-85be-6712df617b9d'),
      {
        author: 'Josiah Carberry',
        preprint: {
          id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
          language: 'en',
          title: rawHtml('The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>'),
        },
      },
      DefaultLocale,
    )({ publicUrl: new URL(String(baseURL)) })

    await page.setContent(email.html.toString())

    await use(page)
  },
}

export const canAddMultipleAuthors: Fixtures<
  Record<never, never>,
  Record<never, never>,
  Pick<AppFixtures, 'canAddMultipleAuthors'>,
  Record<never, never>
> = {
  canAddMultipleAuthors: async ({}, use) => {
    await use(() => true)
  },
}

export const canReviewDatasets: Fixtures<
  Record<never, never>,
  Record<never, never>,
  Pick<AppFixtures, 'canReviewDatasets' | 'fetch'>,
  Record<never, never>
> = {
  canReviewDatasets: async ({}, use) => {
    await use(true)
  },
  fetch: async ({ fetch }, use) => {
    fetch.get('http://api.orcid.test/v3.0/0000-0002-1825-0097/personal-details', {
      body: {
        name: { 'given-names': { value: 'Josiah' }, 'family-name': { value: 'Carberry' }, 'credit-name': null },
      },
    })

    await use(fetch)
  },
}

export const test = baseTest.extend(appFixtures)

export const waitForNotBusy = async (page: Page) => {
  await page.waitForLoadState()

  await page.locator('body', { hasNot: page.locator('[aria-busy=true]') }).waitFor()
}
