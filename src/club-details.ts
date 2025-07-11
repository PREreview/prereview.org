import { Temporal } from '@js-temporal/polyfill'
import { Array, Equal, flow, type Option, pipe, type Record, Struct } from 'effect'
import { Eq as eqOrcid, Orcid } from 'orcid-id-ts'
import { type Html, html } from './html.js'
import type { ClubId } from './types/club-id.js'
import { EmailAddress } from './types/EmailAddress.js'

import PlainDate = Temporal.PlainDate

export interface Club {
  readonly name: string
  readonly description: Html
  readonly added: PlainDate
  readonly leads: Array.NonEmptyReadonlyArray<{ name: string; orcid: Orcid }>
  readonly contact?: EmailAddress
  readonly joinLink?: URL
}

export const getClubDetails = (id: ClubId) => clubs[id]

export const getClubName = (id: ClubId) => clubs[id].name

export const getClubAddedDate = (id: ClubId) => clubs[id].added

export const getClubByName = (name: string): Option.Option<ClubId> =>
  pipe(
    Struct.keys(clubs),
    Array.findFirst(id => Equal.equals(clubs[id].name, name)),
  )

export const isLeadFor = (orcid: Orcid): ReadonlyArray<ClubId> =>
  pipe(
    Struct.keys(clubs),
    Array.filter(
      flow(
        id => clubs[id].leads,
        Array.some(lead => eqOrcid.equals(lead.orcid, orcid)),
      ),
    ),
  )

export const isAClubLead = (orcid: Orcid): boolean =>
  pipe(
    Struct.keys(clubs),
    Array.some(
      flow(
        id => clubs[id].leads,
        Array.some(lead => eqOrcid.equals(lead.orcid, orcid)),
      ),
    ),
  )

const clubs: Record.ReadonlyRecord<ClubId, Club> = {
  'asapbio-cancer-biology': {
    name: 'ASAPbio Cancer Biology Crowd',
    description: html`
      <p>
        The ASAPbio Cancer Biology Crowd reviews preprints of biochemical, molecular and cellular studies concerning
        cancer.
      </p>
    `,
    added: PlainDate.from('2023-07-31'),
    leads: [
      { name: 'Arpita Ghosh', orcid: Orcid('0009-0003-2106-3270') },
      { name: 'Garima Jain', orcid: Orcid('0000-0002-8079-9611') },
    ],
  },
  'asapbio-cell-biology': {
    name: 'ASAPbio Cell Biology Crowd',
    description: html` <p>The ASAPbio Cell Biology Crowd reviews preprints about cell and molecular biology.</p> `,
    added: PlainDate.from('2024-07-01'),
    leads: [
      { name: 'Arpita Ghosh', orcid: Orcid('0009-0003-2106-3270') },
      { name: 'Anna Oliveras', orcid: Orcid('0000-0002-5880-5245') },
      { name: 'Joseph Biggane', orcid: Orcid('0000-0002-7857-2450') },
    ],
    joinLink: new URL('https://bit.ly/2024_Crowd_review_signup'),
  },
  'asapbio-immunology': {
    name: 'ASAPbio Immunology Crowd',
    description: html` <p>The ASAPbio Immunology Crowd reviews preprints about cellular immunology.</p> `,
    added: PlainDate.from('2024-07-01'),
    leads: [
      { name: 'Rio Sugimura', orcid: Orcid('0000-0001-5701-3628') },
      { name: 'Yanyang Chen', orcid: Orcid('0000-0003-4665-9671') },
      { name: 'Alex To', orcid: Orcid('0000-0001-7872-228X') },
    ],
    joinLink: new URL('https://bit.ly/2024_Crowd_review_signup'),
  },
  'asapbio-meta-research': {
    name: 'ASAPbio Meta-Research Crowd',
    description: html`
      <p>
        The ASAPbio Meta-Research Crowd reviews preprints about the practices, policies and infrastructure of open
        science and scholarship.
      </p>
    `,
    added: PlainDate.from('2023-07-31'),
    leads: [
      { name: 'Jay Patel', orcid: Orcid('0000-0003-1040-3607') },
      { name: 'Stephen Gabrielson', orcid: Orcid('0000-0001-9420-4466') },
      { name: 'Martyn Rittman', orcid: Orcid('0000-0001-9327-3734') },
    ],
    joinLink: new URL('https://bit.ly/2024_Crowd_review_signup'),
  },
  'asapbio-microbiology': {
    name: 'ASAPbio Microbiology Crowd',
    description: html`
      <p>The ASAPbio Microbiology Crowd reviews preprints about microorganisms, fungi and microbiomes.</p>
    `,
    added: PlainDate.from('2024-07-01'),
    leads: [
      { name: 'Corrado Nai', orcid: Orcid('0000-0002-6232-6634') },
      { name: 'Aneth David', orcid: Orcid('0000-0002-1633-297X') },
      { name: 'Femi Arogundade', orcid: Orcid('0000-0002-9222-1817') },
    ],
    joinLink: new URL('https://bit.ly/2024_Crowd_review_signup'),
  },
  'asapbio-metabolism': {
    name: 'ASAPbio Metabolism Crowd',
    description: html`
      <p>
        The ASAPbio Metabolism Crowd reviews preprints about the regulation of metabolic homeostasis and pathophysiology
        of metabolic diseases, from cell biology to integrative physiology.
      </p>
    `,
    added: PlainDate.from('2023-07-27'),
    leads: [
      { name: 'Pablo Ranea-Robles', orcid: Orcid('0000-0001-6478-3815') },
      { name: 'Jonathon Coates', orcid: Orcid('0000-0001-9039-9219') },
    ],
  },
  'asapbio-neurobiology': {
    name: 'ASAPbio Neurobiology Crowd',
    description: html`
      <p>The ASAPbio Neurobiology Crowd reviews preprints that focus on neurodevelopment and neurodegeneration.</p>
    `,
    added: PlainDate.from('2023-07-31'),
    leads: [
      { name: 'Bhargy Sharma', orcid: Orcid('0000-0003-2713-8563') },
      { name: 'Anna Oliveras', orcid: Orcid('0000-0002-5880-5245') },
      { name: 'Ryan John Cubero', orcid: Orcid('0000-0003-0002-1867') },
    ],
  },
  'bimsb-neuroscience': {
    name: 'Biophysics Probing Neuroscience Lab',
    description: html`
      <p>
        We are a young lab part of BIMSB (Berlin Institute for Medical Systems Biology) located in Berlin (Germany). We
        seek to understand how intrinsically disordered proteins (dys)regulate brain metabolism using advanced imaging
        techniques.
      </p>
      <p>
        We want to convert our running journal club into a preprint club with the goal to support open science and
        early-career researchers participation in peer-review processes. We aim to produce 4 preprint reviews a year.
      </p>
    `,
    added: PlainDate.from('2024-07-25'),
    leads: [{ name: 'Anna Oliveras', orcid: Orcid('0000-0002-5880-5245') }],
  },
  biobio: {
    name: 'Open Science Community BioBío (OSCB)',
    description: html`
      <p>
        Open Science Community Biobío is made up of students and scientists, and is the first community in Chile and
        Latin America with the aim of promoting open access, collaboration and transparency of science.
      </p>
      <p>
        One of the community's aspects is promoting objective and non-anonymous peer review, which enriches the work of
        scientists who publish preprints.
      </p>
    `,
    added: PlainDate.from('2024-11-04'),
    leads: [
      { name: 'David Ramírez', orcid: Orcid('0000-0003-0002-1189') },
      { name: 'Carolina Quezada', orcid: Orcid('0000-0002-0260-5754') },
      { name: 'Jessica Valero-Rojas', orcid: Orcid('0000-0003-3391-256X') },
      { name: 'Carlos Zamora-Manzur', orcid: Orcid('0000-0001-7755-4077') },
      { name: 'Myleidi Vera', orcid: Orcid('0000-0002-8469-995X') },
      { name: 'Kevin J. Cobos', orcid: Orcid('0009-0000-5415-2964') },
      { name: 'Laura Pacheco', orcid: Orcid('0009-0007-6163-5172') },
      { name: 'Nicolás Riffo', orcid: Orcid('0000-0003-3433-2014') },
      { name: 'Diego Abarzúa', orcid: Orcid('0009-0007-7372-851X') },
    ],
    joinLink: new URL('https://forms.gle/AJPwDvBzBnCNSC5A7'),
  },
  'biomass-biocatalysis': {
    name: 'Biomass and Biocatalysis Group',
    description: html`
      <p>
        We aim to foster an environment of continuous learning and knowledge-sharing. To this end, we have initiated the
        PrePrint Review Club. The purpose of this club is to encourage the practice of reading, reviewing, and
        formulating constructive comments on preprints. This will not only broaden our knowledge but also refine our
        skills in reviewing subjects that are pertinent to our diverse research projects. We believe this initiative
        will cultivate a deeper understanding and facilitate further advancements in our respective fields of study.
      </p>
    `,
    added: PlainDate.from('2023-10-05'),
    leads: [{ name: 'Ayla Sant’Ana da Silva', orcid: Orcid('0000-0001-8466-9390') }],
  },
  'biopeers-slu': {
    name: 'BioPeers SLU',
    description: html`
      <p>
        We are a team of scientists with a broad range of expertise encompassing structural biology, biochemistry, plant
        biology and cell biology. We are affiliated with the
        <a href="https://www.slu.se/">Swedish University of Agricultural Sciences, Uppsala</a>.
      </p>
      <p>
        BioPeers SLU is a PREreview Club comprising PhD students and postdocs working at Uppsala BioCenter, SLU. The
        club is associated with the weekly <a href="https://www.alyonaminina.org/jc">Journal Club Seminar series</a>.
      </p>
    `,
    added: PlainDate.from('2025-01-30'),
    leads: [
      { name: 'Alyona Minina', orcid: Orcid('0000-0002-2619-1859') },
      { name: 'Alessia Suriano', orcid: Orcid('0009-0004-0588-6645') },
    ],
  },
  'biophysics-leipzig': {
    name: 'Biophysics Leipzig University',
    description: html`
      <p>
        The Institute for Medical Physics and Biophysics counts among the clinical-theoretical institutes of the Medical
        Faculty of Leipzig University. The members of the institute are of diverse origin, hold multidisciplinary
        educational backgrounds and share interdisciplinary research interests. We are using different techniques like
        NMR spectroscopy, mass spectrometry, cell-based assays, electron paramagnetic resonance and much more.
      </p>
      <p>
        This club should develop as a sustainable contribution to the development towards unconfined OpenScience
        practices in the area of publishing and knowledge sharing. At our institute, it should initially give PhD
        students access to the peer review system and educate them in giving adequate feedback on research data.
      </p>
    `,
    added: PlainDate.from('2023-12-15'),
    leads: [
      { name: 'Jenny Leopold', orcid: Orcid('0000-0002-4993-5136') },
      {
        name: 'Benedikt Schwarze',
        orcid: Orcid('0000-0002-5815-8703'),
      },
    ],
    contact: EmailAddress('jenny.leopold@medizin.uni-leipzig.de'),
  },
  bios2: {
    name: 'Computational Biodiversity Science and Services',
    description: html`
      <p>
        BIOS² is a community of early career researchers who are exploring and applying modern-day computational and
        quantitative techniques to address the challenges of biodiversity sciences.
      </p>
      <p>
        The BIOS² PREreview Club is a community of practice where we apply kind peer review principles to advance
        scientific discussions on biodiversity sciences, ecology and biological conservation with respect and fairness.
        We embrace open science values, and so our reviews always consider reproducibility, replicability, FAIR and CARE
        principles, and EDIA in scientific products.
      </p>
    `,
    added: PlainDate.from('2024-08-01'),
    leads: [
      { name: 'Gracielle Higino', orcid: Orcid('0000-0003-2791-8383') },
      { name: 'Timothée Poisot', orcid: Orcid('0000-0002-0735-5184') },
    ],
    joinLink: new URL('https://tally.so/r/wdPM9d'),
  },
  'bloomington-biology': {
    name: 'IU Bloomington Biology',
    description: html`
      <p>
        We are scientists from Indiana University (IU) Bloomington. The IU Bloomington Biology club is associated with
        the graduate course Peer Review in the Life Sciences (BIOL-Z620). Its purpose is to formally teach graduate
        students how to peer review manuscripts in a critical and constructive way, and to promote an open access to
        science, transparency and journal-agnostic evaluation of scientific work.
      </p>
    `,
    added: PlainDate.from('2025-03-24'),
    leads: [{ name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') }],
  },
  cara: {
    name: 'CARA: Critical Analysis of Research Articles Club',
    description: html`
      <p>
        The Biophysics Institute (3. Institute of Physics) at the University of Göttingen has a strong focus on imaging,
        cell mechanics and robotics. Besides doing research, we love to read and discuss science.
      </p>
      <p>
        This Club is the PREreview manifestation of a seminar CARA that Timo teaches every semester at the University of
        Göttingen. We discuss each week two papers on subjects around biophysics with a focus on cell mechanics. To gain
        credits, students need to prepare a peer review of the paper they present, and this club allows them to publish
        this review, thus hopefully helping the authors to improve their preprints.
      </p>
    `,
    added: PlainDate.from('2023-11-17'),
    leads: [{ name: 'Timo Betz', orcid: Orcid('0000-0002-1548-0655') }],
  },
  'elife-ambassadors': {
    name: 'eLife Community Ambassadors',
    description: html`
      <p>
        eLife Ambassadors are a global cohort of early-career researchers dedicated to transforming research culture
        worldwide. We strive to drive change toward open science and responsible research assessment, and advocate for
        equity and integrity in research.
      </p>
      <p>
        eLife Ambassadors are interested in peer review, open science and curating research. Our purpose is to ensure
        Early-Career researchers have a voice and presence in open science, responsible research assessment as well as
        promoting equity and integrity in research.
      </p>
    `,
    added: PlainDate.from('2025-05-13'),
    leads: [{ name: 'Elise Bateman', orcid: Orcid('0009-0008-9450-3341') }],
    contact: EmailAddress('community@elifesciences.org'),
  },
  emerge: {
    name: 'EMERGE, A Matrix for Ethnographic Collaboration and Practice',
    description: html`
      <p>
        EMERGE is a distributed project with ethnography research spaces based in Canada and the United States, with
        collaborators undertaking work around the world. It is supported by a Partnership Development Grant from the
        Social Sciences and Humanities Research Council of Canada.
      </p>
      <p>
        In 2025, EMERGE research spaces are experimenting with open peer review of manuscripts prior to journal
        submission. Looking ahead, we see review of preprints by researchers outside of EMERGE as an avenue for further
        internationalizing the project.
      </p>
    `,
    added: PlainDate.from('2025-01-27'),
    leads: [{ name: 'Marcel LaFlamme', orcid: Orcid('0000-0002-7489-4233') }],
  },
  'etymos-analytica': {
    name: 'Etymos Analytica',
    description: html`<p>A research consortium for students of Government Medical college.</p>`,
    added: PlainDate.from('2024-07-11'),
    leads: [{ name: 'Sidharth Narayanan', orcid: Orcid('0009-0004-6361-5050') }],
    joinLink: new URL('https://forms.gle/nc75moVyEVvJBRqNA'),
  },
  'hhmi-training-pilot': {
    name: 'HHMI Transparent and Accountable Peer Review Training Pilot',
    description: html`
      <p>
        HHMI is a biomedical research organization and philanthropy that supports a vibrant community of researchers,
        educators, students, and professionals. Together, we’re unlocking the fundamentals of biology and building an
        open, inclusive future for science.
      </p>
      <p>
        As part of a newly developed training pilot, participating graduate students and postdocs in HHMI labs will
        learn to conduct peer review in a manner that is constructive and transparent.
      </p>
    `,
    added: PlainDate.from('2023-11-14'),
    leads: [
      { name: 'Anna Hatch', orcid: Orcid('0000-0002-2111-3237') },
      { name: 'Michele Avissar-Whiting', orcid: Orcid('0000-0003-0030-3135') },
    ],
  },
  'iib-mar-del-plata': {
    name: 'IIB-Mar del Plata Argentina',
    description: html`
      <div lang="es-AR" dir="ltr">
        <p>
          Docentes, investigadores y estudiantes de doctorado especializados en bioquímica y biología molecular de
          plantas y microorganismos.
        </p>
        <p>
          Nuestro club revisa preprints con la meta de apoyar el movimiento de ciencia abierta, difundir sus valores y
          entrenar a investigadores jóvenes en la revisión constructiva de artículos científicos.
        </p>
      </div>
    `,
    added: PlainDate.from('2024-11-13'),
    leads: [
      { name: 'Ana María Laxalt', orcid: Orcid('0000-0002-8225-2441') },
      { name: 'Juan Martín D’Ambrosio', orcid: Orcid('0000-0003-2834-1838') },
    ],
  },
  'intersectional-feminist': {
    name: 'Intersectional Feminist Club',
    description: html`
      <p>
        Institute for Globally Distributed Open Research and Education (IGDORE) is a research institute dedicated to
        improving the quality of science and quality of life for scientists, students, and their families.
      </p>
      <p>
        Intersectional feminist perspectives and practices aren't only for women, they are a lens to bridge our own
        internal diverse ways of thinking, knowing, experiencing and feeling. Thus by highlighting how these human
        aspects of our unique identities come together, we can shape the science we know, as it evolves and grows,
        throughout the course of our lived experiences.
      </p>
    `,
    added: PlainDate.from('2024-08-29'),
    leads: [{ name: 'Safieh Shah', orcid: Orcid('0000-0001-5358-9240') }],
    joinLink: new URL(
      'https://docs.google.com/forms/d/e/1FAIpQLSf3JWQg-B_cLuEe84sz3-GJj-J9wHf4CR2kno6i-Tcs6tb5Yg/viewform',
    ),
  },
  'jmir-publications': {
    name: 'JMIR Publications',
    description: html`
      <p>
        <a href="https://jmirpublications.com/">JMIR Publications</a> teamed up with PREreview to expand our innovative
        peer review offerings through
        <a href="https://support.jmir.org/hc/en-us/articles/4408266275099">Live Reviews</a>: topic-centered, interactive
        preprint review calls via a video conference tool such as Zoom.
      </p>
      <p>
        The <a href="https://jmirx.org/">JMIRx series of journals</a> is a groundbreaking “<a
          href="https://www.jmir.org/2019/12/e17578/"
          >superjournal</a
        >” series, which sits on top of preprint servers (eg, medRxiv and bioRxiv) and publishes preprint peer reviews
        and revised versions of record of preprints in indexed journals such as
        <a href="https://xmed.jmir.org/">JMIRx Med</a> (the first PubMed-indexed overlay journal in the world).
        <a href="https://xmed.jmir.org/themes/1147-prereview">#PREreview</a> is one of the communities and sections in
        the journal.
      </p>
      <p>
        PREreview reports can be used in lieu of a formal invited peer review to revise and publish a preprint in a
        JMIRx journal or another <a href="https://planp.science/">Plan P</a>–compatible journal. To learn more about the
        JMIRx project, see our help article
        <a href="https://support.jmir.org/hc/en-us/articles/360034752692-What-is-JMIRx">What is JMIRx?</a> To
        self-nominate a preprint for JMIRx or PREreview live review, please use the
        <a href="https://med.jmirx.org/landing">JMIRx submission form</a> and choose “PREreview” as your peer review
        option.
      </p>
    `,
    added: PlainDate.from('2024-07-11'),
    leads: [
      { name: 'Surya Nedunchezhiyan', orcid: Orcid('0009-0008-3322-2327') },
      { name: 'Tiffany I. Leung', orcid: Orcid('0000-0002-6007-4023') },
    ],
    contact: EmailAddress('ed-support@jmir.org'),
  },
  'language-club': {
    name: 'Language Club',
    description: html`
      <p>
        The Language Club is a community of linguists and language enthusiasts who share a common interest in language
        research and a commitment to open science.
      </p>
      <p>
        Our purpose is to offer timely and constructive peer feedback to authors of preprints in the field of
        linguistics. By doing so, we aim to foster a culture of transparency, collaboration, and responsible research
        practices.
      </p>
    `,
    added: PlainDate.from('2023-09-20'),
    leads: [{ name: 'Miguel Oliveira, Jr.', orcid: Orcid('0000-0002-0866-0535') }],
    joinLink: new URL(
      'https://docs.google.com/forms/d/e/1FAIpQLScamu28Lkm2pBS1n-g0UpMmp8trCeGPVVdAxJ8MIauhlwx7Dw/viewform',
    ),
  },
  'marine-invertebrates': {
    name: 'Biology of Marine Invertebrates & Friends',
    description: html`
      <p>
        We are a department focused on mainly marine larvae and their perception of and reaction to the environment,
        employing both descriptive and experimental methods to better understand behaviour. The main research organism
        is the larva of the marine ragworm <i>Platynereis dumerilii</i>, where the group (stationed in the UK and
        Germany) has acquired a detailed ultrastructural atlas of several stages, traced the connectome and
        experimentally tested some of the many interactions between them.
      </p>
      <p>
        This club aims to review manuscripts dealing with diverse aspects of marine invertebrates (including
        non-metazoan eukaryotes), whichever topic is more or less in our field of expertise and which will inspire our
        research and/or cause us to rethink our approaches. We want the club to serve as a more active journal club of
        preprints between the two locations of our working group, but also to invite ECRs from other groups and with
        expertise in other disciplines to broaden our horizons.
      </p>
    `,
    added: PlainDate.from('2024-02-09'),
    leads: [
      { name: 'Luis Alberto Bezares Calderón', orcid: Orcid('0000-0001-6678-6876') },
      { name: 'Alexandra Kerbl', orcid: Orcid('0000-0002-9454-6359') },
    ],
    contact: EmailAddress('lab239@exeter.ac.uk'),
  },
  neuroden: {
    name: 'Neuroden',
    description: html`
      <p>
        Neuroden is an organization that consists of undergraduate members that have common interest in cognitive
        neuroscience.
      </p>

      <p>
        Our purpose is to provide insightful, constructive peer-review feedback on preprint literature related to
        cognitive neuroscience. Membership to this club is open to undergraduates from any College/University.
      </p>
    `,
    added: PlainDate.from('2024-10-11'),
    leads: [
      { name: 'Ryan Ram', orcid: Orcid('0009-0009-0072-4133') },
      { name: 'Santhosh Diravidamani', orcid: Orcid('0009-0003-1843-7171') },
      { name: 'Hardik Acharya', orcid: Orcid('0009-0005-6748-9888') },
      { name: 'Abbas Saifuddin', orcid: Orcid('0009-0003-9667-6207') },
      { name: 'Hamza Mustafa', orcid: Orcid('0009-0006-0344-5365') },
      { name: 'Ahmed Malik', orcid: Orcid('0009-0006-4040-9021') },
      { name: 'Anu', orcid: Orcid('0009-0005-8341-8545') },
      { name: 'Piyush Peddi', orcid: Orcid('0009-0008-1913-3360') },
      { name: 'Rajesh Karavadi', orcid: Orcid('0009-0005-8589-5628') },
      { name: 'Dhyaan Bannur', orcid: Orcid('0009-0009-3734-0758') },
    ],
    contact: EmailAddress('hsa230003@utdallas.edu'),
  },
  'nsa-utd': {
    name: 'Neuroscience Student Association at UTD',
    description: html`
      <p>
        The Neuroscience Student Association is an organization that provides a place for neuroscience majors at the
        University of Texas at Dallas to gather, meet, share insights and ideas, and help each other.
      </p>
      <p>
        The NSA PREreview club is the hub of NSA’s journal club activities. NSA members may meet in groups to discuss a
        paper and write a PREreview as a group or do the whole process individually.
      </p>
    `,
    added: PlainDate.from('2024-02-09'),
    leads: [
      { name: 'Madison Jiang', orcid: Orcid('0009-0007-1653-0072') },
      { name: 'Safa Adookkattil', orcid: Orcid('0009-0000-1565-8583') },
      { name: 'Emma Unger', orcid: Orcid('0009-0000-6854-2621') },
      { name: 'Mohammad Khan', orcid: Orcid('0009-0007-7940-1964') },
    ],
    contact: EmailAddress('msj220001@utdallas.edu'),
  },
  'open-box-science': {
    name: 'Open Box Science',
    description: html`
      <p>
        <a href="https://openboxscience.org/">Open Box Science (OBS)</a> is a 501(c)(3) nonprofit organization dedicated
        to promoting open science and democratizing scientific training. The OBS grassroots community organizes free
        talks by early-career scientists and is open to all around the world.
      </p>
      <p>
        The OBS PREreview club will provide reviews of selected preprints presented in OBS seminars. The purpose of the
        club is to (i) provide continuous discussion and collaboration to help advance science, and to (ii) provide an
        open platform for training and practice in responsible peer review.
      </p>
    `,
    added: PlainDate.from('2024-01-18'),
    leads: [
      { name: 'Kuan-lin Huang', orcid: Orcid('0000-0002-5537-5817') },
      { name: 'Chih-Chung (Jerry) Lin', orcid: Orcid('0000-0002-0335-9540') },
      { name: 'Eugenio Contreras Castillo', orcid: Orcid('0009-0001-2806-2874') },
      { name: 'Anna Salamero Boix', orcid: Orcid('0000-0002-9821-1396') },
    ],
    joinLink: new URL('https://join.slack.com/t/openboxscience/shared_invite/zt-1cjr8dt6c-hRnnCmmAG8JeRo1271O5aA'),
  },
  'open-science-community-iraqi': {
    name: 'Open Science Community Iraqi (OSCI)',
    description: html`
      <p>
        Open Science Community Iraqi (OSCI) aims to provide a place where newcomers and experienced peers interact,
        inspire each other to embed open science practices and values in their workflows and provide feedback on
        policies, infrastructures, and support services.
      </p>
      <p>
        Open Science Community Iraqi (OSCI) describes an ongoing movement in the way research is performed, researchers
        collaborate, knowledge is shared, and science is organized. It affects the whole research cycle and its
        stakeholders and enhances science by facilitating more transparency, openness, networking, and collaboration.
      </p>
    `,
    added: PlainDate.from('2023-12-20'),
    leads: [{ name: 'Assist. Prof. Dr. Salwan M. Abdulateef', orcid: Orcid('0000-0002-7389-0003') }],
    contact: EmailAddress('ag.salwan.mahmood@uoanbar.edu.iq'),
  },
  'open-science-community-uruguay': {
    name: 'Open Science Community Uruguay (OSCU)',
    description: html`
      <p>
        The founding members of this club are part of the Cellular and Molecular Neurophysiology Department of the
        Instituto de Investigaciones Biológicas Clemente Estable, Montevideo, Uruguay.
      </p>
      <p>We aim to implement a small open peer review community as a way to support open science.</p>
    `,
    added: PlainDate.from('2024-12-12'),
    leads: [
      { name: 'María Constanza Silvera', orcid: Orcid('0009-0006-1396-0432') },
      { name: 'Daniel Prieto', orcid: Orcid('0000-0001-8356-1708') },
      { name: 'Mateo Vidal Panario', orcid: Orcid('0009-0009-3980-7163') },
    ],
    contact: EmailAddress('csilvera@fcien.edu.uy'),
  },
  oxplants: {
    name: 'OxPlants Preprint Club',
    description: html`
      <p>
        The Department of Biology at the University of Oxford conducts pioneering research across all areas of biology,
        driving discoveries that address global scientific challenges.
      </p>
      <p>
        OxPlants Preprint Club brings together DPhil students in plant sciences to discuss innovative preprints,
        fostering critical thinking and collaborative exploration of new research.
      </p>
    `,
    added: PlainDate.from('2024-11-04'),
    leads: [{ name: 'Kornelija Aleksejeva', orcid: Orcid('0009-0004-3328-1862') }],
  },
  prosac: {
    name: 'Proteostasis and Cancer Team INSERM U1242',
    description: html`
      <p>
        The Proteostasis and Cancer team is aiming at characterizing how protein homeostasis (a.k.a. proteostasis)
        control might play a role in cancer development. In particular, the team focuses principally (but not
        exclusively) on the signalling pathways sustaining proteostasis in the Endoplasmic Reticulum (ER), the clinical
        relevance of such mechanisms, and the potential of their therapeutic targeting in solid tumours (mainly brain
        and breast cancers).
      </p>
      <p>
        This club will provide pre-reviews of preprints as part of our team’s journal clubs. We thereby aim to provide
        constructive criticism to the authors while training the students and postdoctoral researchers in our team to
        review articles.
      </p>
    `,
    added: PlainDate.from('2024-07-24'),
    leads: [{ name: 'Elodie Lafont', orcid: Orcid('0000-0003-1978-7491') }],
  },
  'review-curate-network': {
    name: 'Review & Curate Network (RCN)',
    description: html`
      <p>
        The network started as a club with support from the ASAPbio community seed grant (850 USD) project to help
        promote open science and access in Rwanda. However, due to the burning interest in becoming inclusive and
        meeting the needs of a wider scientific community in Africa regarding open science and access, we changed the
        club’s aims and scope. Today, the network, which was initially called the “Rwanda Preprint Club,” is the “Review
        and Curate Network (RCN).”
      </p>
      <p>
        The network aims to foster a collaborative and transparent environment for the evaluation, validation, and
        organization of preprints. By focusing on preprints, the club also aims to accelerate scientific progress,
        allowing for immediate dissemination of findings while maintaining the rigor of traditional Science.
      </p>
    `,
    added: PlainDate.from('2025-01-17'),
    leads: [
      { name: 'Dine Roseline Dzekem', orcid: Orcid('0000-0002-8210-9258') },
      { name: 'Ogunniyi Tolulope', orcid: Orcid('0000-0003-2582-4420') },
    ],
    joinLink: new URL('https://chat.whatsapp.com/EwqcyyjUIR57BZMvwuwIET'),
  },
  'reviewing-dental-articles-club': {
    name: 'Reviewing Dental Articles Club',
    description: html`
      <p>
        The Reviewing Dental Articles Club exists to comprehensively train revolutionary professionals in Health
        Sciences, produce knowledge and technologies and innovations, and develop university extension and exercise
        methodological guidance of study plans and programs for postgraduate courses and modalities.
      </p>
      <p>
        It also exists to help the authors of the stomatology union in improving the writing and publication of articles
        related to this science.
      </p>
    `,
    added: PlainDate.from('2024-03-18'),
    leads: [{ name: 'Alain Manuel Chaple Gil', orcid: Orcid('0000-0002-8571-4429') }],
    contact: EmailAddress('alain.chaple@uautonoma.cl'),
  },
  'rr-id-student-reviewer-club': {
    name: 'RR\\ID Student Reviewer Club',
    description: html`
      <p>
        RR\\ID is an open-access overlay journal that accelerates peer review of important infectious disease-related
        research preprints. RR\\ID aims to prevent the dissemination of false/misleading scientific information and
        accelerate the validation and diffusion of robust findings. RR\\ID aims to increase the application of science
        for the common good, responding to infectious disease challenges throughout the world.
      </p>
      <p>
        As a part of the RR\\ID mentorship and training program in scientific publishing, the RR\\ID Student Reviewer
        Club is a platform for our student community to publish their own reviews of RR\\ID selected preprints. Our
        purpose is to give students the opportunity to analyze and publish reviews of the same preprints that we are
        seeking formal reviews for in the academic community–which enhances the potential for mentorship and
        collaboration.
      </p>
    `,
    added: PlainDate.from('2023-10-04'),
    leads: [{ name: 'Hildy Fong Baker', orcid: Orcid('0000-0002-3836-1966') }],
    contact: EmailAddress('rrid@berkeley.edu'),
  },
  'sg-biofilms-microbiome': {
    name: 'SG Biofilms and Microbiome Club',
    description: html`
      <p>
        <a href="https://scelse.sg/">Singapore Centre for Environmental Life Sciences Engineering (SCELSE)</a> is a
        research centre of excellence hosted by Nanyang Technological University and the National University of
        Singapore.
      </p>
      <p>We are a group at SCELSE who are interested in microbial interactions in biofilms and microbiome.</p>
    `,
    added: PlainDate.from('2024-04-10'),
    leads: [{ name: 'Viduthalai Rasheedkhan Regina', orcid: Orcid('0000-0001-5457-8965') }],
  },
  'snl-semantics': {
    name: 'SNL Semantics',
    description: html`
      <p>
        The Society for the Neurobiology of Language (SNL) is a non-profit organization whose goal is to foster progress
        in understanding the neurobiological basis for language via the interdisciplinary exchange of ideas. The Society
        brings together scientists with different perspectives and methodological approaches to the study of language
        and related systems.
      </p>
      <p>Among the other member-initiated virtual activities, this club aims at providing SNL members:</p>
      <ol>
        <li>the opportunity to get credit for their review work</li>
        <li>a platform where to practice their peer review (and writing) skills</li>
        <li>a way to stay abreast of scientific research on the neurobiology of semantics</li>
      </ol>
    `,
    added: PlainDate.from('2025-02-10'),
    leads: [
      { name: 'Valentina Borghesani', orcid: Orcid('0000-0002-7909-8631') },
      { name: 'Gabriella Liuzzi', orcid: Orcid('0000-0001-8960-5601') },
    ],
  },
  'sun-bioinformatics': {
    name: 'SUN Bioinformatics Journal Club',
    description: html`
      <p>
        The Bioinformatics group is located at the Tygerberg campus of Stellenbosch University and belongs to the
        Faculty of Health and Medical Sciences.
      </p>
      <p>
        The Bioinformatics Journal club intends to provide a platform for the students and different research groups in
        the faculty to present projects, discuss publications and
      </p>
    `,
    added: PlainDate.from('2025-06-09'),
    leads: [
      { name: 'Gian van der Spuy', orcid: Orcid('0000-0002-9067-5903') },
      { name: 'Elizna Maasdorp', orcid: Orcid('0000-0002-3402-169X') },
      { name: 'Abhinav Sharma', orcid: Orcid('0000-0002-6402-6993') },
    ],
  },
  'surrey-microbiology': {
    name: 'University of Surrey Microbiology Journal Club',
    description: html`
      <p>
        The University of Surrey, based in Guildford UK, is a global community of ideas and people, dedicated to
        life-changing education and research.
      </p>
      <p>
        The Microbiology Journal Club, comprising staff and PGR students from the Department of Microbial Sciences,
        meets monthly to discuss a chosen research article.
      </p>
    `,
    added: PlainDate.from('2024-11-13'),
    leads: [{ name: 'Kathleen Dunbar', orcid: Orcid('0009-0009-5970-9296') }],
  },
  'tsl-preprint-club': {
    name: 'TSL Preprint Club',
    description: html`
      <p>
        The Sainsbury Laboratory is an independent research institute renowned for world-leading fundamental discoveries
        in molecular plant-microbe interactions.
      </p>
      <p>TSL Preprint Club brings together TSL scientists from all levels to discuss the most recent preprints.</p>
    `,
    added: PlainDate.from('2023-10-16'),
    leads: [
      { name: 'Daniel Lüdke', orcid: Orcid('0000-0002-0064-0695') },
      { name: 'Andrés Posbeyikian', orcid: Orcid('0000-0002-9368-6659') },
      { name: 'Mauricio Pablo Contreras', orcid: Orcid('0000-0001-6002-0730') },
    ],
  },
}
