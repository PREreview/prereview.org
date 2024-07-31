import type * as O from 'fp-ts/lib/Option.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import type * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import * as RR from 'fp-ts/lib/ReadonlyRecord.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { Eq as stringEq } from 'fp-ts/lib/string.js'
import { type Orcid, Eq as eqOrcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { type Html, html } from './html.js'
import type { ClubId } from './types/club-id.js'
import type { EmailAddress } from './types/email-address.js'

export interface Club {
  readonly name: string
  readonly description: Html
  readonly leads: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid: Orcid }>
  readonly contact?: EmailAddress
  readonly joinLink?: URL
}

export const getClubDetails = (id: ClubId) => clubs[id]

export const getClubName = flow(getClubDetails, get('name'))

export const getClubByName = (name: string): O.Option<ClubId> =>
  pipe(RR.keys(clubs), RA.findFirst(flow(getClubDetails, club => stringEq.equals(club.name, name))))

export const isLeadFor = (orcid: Orcid): ReadonlyArray<ClubId> =>
  pipe(
    RR.keys(clubs),
    RA.filter(
      flow(
        getClubDetails,
        get('leads'),
        RA.some(lead => eqOrcid.equals(lead.orcid, orcid)),
      ),
    ),
  )

const clubs: RR.ReadonlyRecord<ClubId, Club> = {
  'asapbio-cancer-biology': {
    name: 'ASAPbio Cancer Biology Crowd',
    description: html`
      <p>
        The ASAPbio Cancer Biology Crowd reviews preprints of biochemical, molecular and cellular studies concerning
        cancer.
      </p>
    `,
    leads: [
      { name: 'Arpita Ghosh', orcid: '0009-0003-2106-3270' as Orcid },
      { name: 'Garima Jain', orcid: '0000-0002-8079-9611' as Orcid },
    ],
  },
  'asapbio-cell-biology': {
    name: 'ASAPbio Cell Biology Crowd',
    description: html` <p>The ASAPbio Cell Biology Crowd reviews preprints about cell and molecular biology.</p> `,
    leads: [
      { name: 'Arpita Ghosh', orcid: '0009-0003-2106-3270' as Orcid },
      { name: 'Anna Oliveras', orcid: '0000-0002-5880-5245' as Orcid },
      { name: 'Joseph Biggane', orcid: '0000-0002-7857-2450' as Orcid },
    ],
    joinLink: new URL('https://bit.ly/2024_Crowd_review_signup'),
  },
  'asapbio-immunology': {
    name: 'ASAPbio Immunology Crowd',
    description: html` <p>The ASAPbio Immunology Crowd reviews preprints about cellular immunology.</p> `,
    leads: [
      { name: 'Rio Sugimura', orcid: '0000-0001-5701-3628' as Orcid },
      { name: 'Yanyang Chen', orcid: '0000-0003-4665-9671' as Orcid },
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
    leads: [
      { name: 'Jay Patel', orcid: '0000-0003-1040-3607' as Orcid },
      { name: 'Stephen Gabrielson', orcid: '0000-0001-9420-4466' as Orcid },
      { name: 'Martyn Rittman', orcid: '0000-0001-9327-3734' as Orcid },
    ],
    joinLink: new URL('https://bit.ly/2024_Crowd_review_signup'),
  },
  'asapbio-microbiology': {
    name: 'ASAPbio Microbiology Crowd',
    description: html`
      <p>The ASAPbio Microbiology Crowd reviews preprints about microorganisms, fungi and microbiomes.</p>
    `,
    leads: [
      { name: 'Corrado Nai', orcid: '0000-0002-6232-6634' as Orcid },
      { name: 'Aneth David', orcid: '0000-0002-1633-297X' as Orcid },
      { name: 'Femi Arogundade', orcid: '0000-0002-9222-1817' as Orcid },
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
    leads: [
      { name: 'Pablo Ranea-Robles', orcid: '0000-0001-6478-3815' as Orcid },
      { name: 'Jonathon Coates', orcid: '0000-0001-9039-9219' as Orcid },
    ],
  },
  'asapbio-neurobiology': {
    name: 'ASAPbio Neurobiology Crowd',
    description: html`
      <p>The ASAPbio Neurobiology Crowd reviews preprints that focus on neurodevelopment and neurodegeneration.</p>
    `,
    leads: [
      { name: 'Bhargy Sharma', orcid: '0000-0003-2713-8563' as Orcid },
      { name: 'Anna Oliveras', orcid: '0000-0002-5880-5245' as Orcid },
      { name: 'Ryan John Cubero', orcid: '0000-0003-0002-1867' as Orcid },
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
    leads: [{ name: 'Anna Oliveras', orcid: '0000-0002-5880-5245' as Orcid }],
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
    leads: [{ name: 'Ayla Sant’Ana da Silva', orcid: '0000-0001-8466-9390' as Orcid }],
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
    leads: [
      { name: 'Jenny Leopold', orcid: '0000-0002-4993-5136' as Orcid },
      {
        name: 'Benedikt Schwarze',
        orcid: '0000-0002-5815-8703' as Orcid,
      },
    ],
    contact: 'jenny.leopold@medizin.uni-leipzig.de' as EmailAddress,
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
    leads: [{ name: 'Timo Betz', orcid: '0000-0002-1548-0655' as Orcid }],
  },
  'etymos-analytica': {
    name: 'Etymos Analytica',
    description: html`<p>A research consortium for students of Government Medical college.</p>`,
    leads: [{ name: 'Sidharth Narayanan', orcid: '0009-0004-6361-5050' as Orcid }],
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
    leads: [
      { name: 'Anna Hatch', orcid: '0000-0002-2111-3237' as Orcid },
      { name: 'Michele Avissar-Whiting', orcid: '0000-0003-0030-3135' as Orcid },
    ],
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
        JMIRx project, see our help article “What is JMIRx?” To self-nominate a preprint for JMIRx or PREreview live
        review, please use the <a href="https://med.jmirx.org/landing">JMIRx submission form</a> and choose “PREreview”
        as your peer review option.
      </p>
    `,
    leads: [
      { name: 'Shaochen (Shawn) Huang', orcid: '0000-0001-6570-0372' as Orcid },
      { name: 'Tiffany I. Leung', orcid: '0000-0002-6007-4023' as Orcid },
    ],
    contact: 'ed-support@jmir.org' as EmailAddress,
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
    leads: [{ name: 'Miguel Oliveira, Jr.', orcid: '0000-0002-0866-0535' as Orcid }],
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
    leads: [
      { name: 'Luis Alberto Bezares Calderón', orcid: '0000-0001-6678-6876' as Orcid },
      { name: 'Alexandra Kerbl', orcid: '0000-0002-9454-6359' as Orcid },
    ],
    contact: 'lab239@exeter.ac.uk' as EmailAddress,
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
    leads: [
      { name: 'Madison Jiang', orcid: '0009-0007-1653-0072' as Orcid },
      { name: 'Safa Adookkattil', orcid: '0009-0000-1565-8583' as Orcid },
      { name: 'Emma Unger', orcid: '0009-0000-6854-2621' as Orcid },
      { name: 'Mohammad Khan', orcid: '0009-0007-7940-1964' as Orcid },
    ],
    contact: 'msj220001@utdallas.edu' as EmailAddress,
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
    leads: [
      { name: 'Kuan-lin Huang', orcid: '0000-0002-5537-5817' as Orcid },
      { name: 'Chih-Chung (Jerry) Lin', orcid: '0000-0002-0335-9540' as Orcid },
      { name: 'Eugenio Contreras Castillo', orcid: '0009-0001-2806-2874' as Orcid },
      { name: 'Anna Salamero Boix', orcid: '0000-0002-9821-1396' as Orcid },
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
    leads: [{ name: 'Assist. Prof. Dr. Salwan M. Abdulateef', orcid: '0000-0002-7389-0003' as Orcid }],
    contact: 'ag.salwan.mahmood@uoanbar.edu.iq' as EmailAddress,
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
    leads: [{ name: 'Elodie Lafont', orcid: '0000-0003-1978-7491' as Orcid }],
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
    leads: [{ name: 'Alain Manuel Chaple Gil', orcid: '0000-0002-8571-4429' as Orcid }],
    contact: 'alain.chaple@uautonoma.cl' as EmailAddress,
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
    leads: [{ name: 'Makayla True', orcid: '0000-0003-3130-7593' as Orcid }],
    joinLink: new URL(
      'https://docs.google.com/forms/d/e/1FAIpQLSdDfGS5BDYvHPX-UB20Z7CVC3uKmmBG0gKZVT2nqI1wxEmLXg/viewform',
    ),
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
    leads: [{ name: 'Viduthalai Rasheedkhan Regina', orcid: '0000-0001-5457-8965' as Orcid }],
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
    leads: [
      { name: 'Daniel Lüdke', orcid: '0000-0002-0064-0695' as Orcid },
      { name: 'Andrés Posbeyikian', orcid: '0000-0002-9368-6659' as Orcid },
      { name: 'Mauricio Pablo Contreras', orcid: '0000-0001-6002-0730' as Orcid },
    ],
  },
}
