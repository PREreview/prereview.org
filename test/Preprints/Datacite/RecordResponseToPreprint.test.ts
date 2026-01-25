import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Effect, pipe, Schema } from 'effect'
import { Datacite } from '../../../src/ExternalApis/index.ts'
import { rawHtml } from '../../../src/html.ts'
import { recordToPreprint } from '../../../src/Preprints/Datacite/Preprint.ts'
import {
  AfricarxivFigsharePreprintId,
  AfricarxivUbuntunetPreprintId,
  AfricarxivZenodoPreprintId,
  ArcadiaSciencePreprintId,
  ArxivPreprintId,
  LifecycleJournalPreprintId,
  OsfPreprintId,
  Preprint,
  PsychArchivesPreprintId,
  ZenodoPreprintId,
} from '../../../src/Preprints/index.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import * as EffectTest from '../../EffectTest.ts'

test.each([
  {
    response: 'osf-project',
    expected: Preprint({
      abstract: {
        language: 'pt',
        text: rawHtml(
          '<p>Revisão de Escopo realizada no período de novembro de 2022 a junho de 2023, que objetivou mapear na literatura quais teorias de enfermagem e estruturas conceituais podem contribuir por suas características na abordagem familiar de potenciais doadores. A revisão foi realizada nas bases de dados LILACS, SCOPUS, SciELO, MEDLINE, EMBASE e Web of science, que foram acessadas via Biblioteca Virtual em Saúde e via Pubmed, bem como, na literatura cinzenta, Google acadêmico e na lista de referência dos estudos. A amostra foi composta por 14 estudos, onde foram identificadas 9 Teorias de Enfermagem.</p>',
        ),
      },
      authors: [
        { name: 'Maria Isabel Caetano Da Silva', orcid: undefined },
        { name: 'Eglídia Carla Figueirêdo Vidal', orcid: undefined },
        { name: 'Aline Sampaio Rolim De Sena', orcid: undefined },
        { name: 'Marina Pessoa De Farias Rodrigues', orcid: undefined },
        { name: 'Gabriela Duarte Bezerra', orcid: OrcidId('0000-0002-7472-4621') },
        { name: 'WONESKA RODRIGUES PINHEIRO', orcid: undefined },
      ],
      id: new OsfPreprintId({ value: Doi('10.17605/osf.io/eq8bk') }),
      posted: Temporal.PlainDate.from({ year: 2023, month: 9, day: 13 }),
      title: {
        language: 'pt',
        text: rawHtml(
          'Teorias De Enfermagem Para Abordagem Familiar De Potenciais Doadores De Órgãos: revisão de escopo',
        ),
      },
      url: new URL('https://osf.io/eq8bk/'),
    }),
  },
  {
    response: 'lifecycle-journal-article',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          "<p>Outcomes Report for Kura et al.'s (2025). Self-leadership and innovative work behaviors: Testing a parallel mediation model with goal striving and goal generation.</p>",
        ),
      },
      authors: [
        { name: 'Fadzliwati Mohiddin', orcid: OrcidId('0000-0002-7332-209X') },
        { name: 'Kabiru Maitama Kura', orcid: OrcidId('0000-0001-7863-2604') },
        { name: 'Hartini Mashod', orcid: OrcidId('0000-0001-7201-8961') },
        { name: 'Ramatu Abdulkareem Abubakar', orcid: OrcidId('0000-0001-6956-9885') },
        { name: 'Noor Maya Salleh', orcid: undefined },
        { name: 'Dr. Faridahwati Mohd. Shamsudin', orcid: undefined },
        { name: 'Shahratul Karmila Rosland', orcid: OrcidId('0009-0000-3311-5160') },
      ],
      id: new LifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/bu3rj') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 4, day: 3 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Self-leadership and innovative work behaviors: Testing a parallel mediation model with goal striving and goal generation',
        ),
      },
      url: new URL('https://osf.io/bu3rj/'),
    }),
  },
  {
    response: 'lifecycle-journal-registration',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          "<p>Verification report for Zhao et al.'s (2023) meta-analysis of ACT for depression. Three effect size extraction errors were found, some of which related to confusing SE for SD. A corrected meta-analysis shows an effect size of Hedges’ g = 0.68 - 35% smaller than that reported in the original meta-analysis.</p>",
        ),
      },
      authors: [{ name: 'Ian Hussey', orcid: OrcidId('0000-0001-8906-7559') }],
      id: new LifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/bmqcw') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 3, day: 9 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Verification of Zhao et al (2023) ‘Effect of Acceptance and Commitment Therapy for depressive disorders: a meta-analysis’',
        ),
      },
      url: new URL('https://osf.io/bmqcw/'),
    }),
  },
  {
    response: 'arxiv',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Regarding trapped-ion microwave-frequency standards, we report on the determination of hyperfine splittings and Landé <math><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math> factors of <math><semantics><mrow><msup><mrow></mrow><mrow><mn>111</mn><mo separator="true">,</mo><mn>113</mn></mrow></msup></mrow><annotation encoding="application/x-tex">^{111,113}</annotation></semantics></math>Cd<math><semantics><mrow><msup><mrow></mrow><mo>+</mo></msup></mrow><annotation encoding="application/x-tex">^+</annotation></semantics></math>. The hyperfine splittings of the <math><semantics><mrow><mn>5</mn><mi>p</mi><msup><mtext> </mtext><mn>2</mn></msup><msub><mi>P</mi><mrow><mn>3</mn><mi mathvariant="normal">/</mi><mn>2</mn></mrow></msub></mrow><annotation encoding="application/x-tex">5p~^2P_{3/2}</annotation></semantics></math> state of <math><semantics><mrow><msup><mrow></mrow><mrow><mn>111</mn><mo separator="true">,</mo><mn>113</mn></mrow></msup></mrow><annotation encoding="application/x-tex">^{111,113}</annotation></semantics></math>Cd<math><semantics><mrow><msup><mrow></mrow><mo>+</mo></msup></mrow><annotation encoding="application/x-tex">^+</annotation></semantics></math> ions were measured using laser-induced fluorescence spectroscopy. The Cd<math><semantics><mrow><msup><mrow></mrow><mo>+</mo></msup></mrow><annotation encoding="application/x-tex">^+</annotation></semantics></math> ions were confined in a linear Paul trap and sympathetically cooled by Ca<math><semantics><mrow><msup><mrow></mrow><mo>+</mo></msup></mrow><annotation encoding="application/x-tex">^+</annotation></semantics></math> ions. Furthermore, the hyperfine splittings and Landé <math><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math> factors of the <math><semantics><mrow><mn>5</mn><mi>s</mi><msup><mtext> </mtext><mn>2</mn></msup><msub><mi>S</mi><mrow><mn>1</mn><mi mathvariant="normal">/</mi><mn>2</mn></mrow></msub></mrow><annotation encoding="application/x-tex">5s~^2S_{1/2}</annotation></semantics></math> and <math><semantics><mrow><mn>5</mn><mi>p</mi><msup><mtext> </mtext><mn>2</mn></msup><msub><mi>P</mi><mrow><mn>1</mn><mi mathvariant="normal">/</mi><mn>2</mn><mo separator="true">,</mo><mn>3</mn><mi mathvariant="normal">/</mi><mn>2</mn></mrow></msub></mrow><annotation encoding="application/x-tex">5p~^2P_{1/2,3/2}</annotation></semantics></math> levels of <math><semantics><mrow><msup><mrow></mrow><mrow><mn>111</mn><mo separator="true">,</mo><mn>113</mn></mrow></msup></mrow><annotation encoding="application/x-tex">^{111,113}</annotation></semantics></math>Cd<math><semantics><mrow><msup><mrow></mrow><mo>+</mo></msup></mrow><annotation encoding="application/x-tex">^+</annotation></semantics></math> were calculated with greater accuracy using the multiconfiguration Dirac--Hartree--Fock scheme. The measured hyperfine splittings and the Dirac--Hartree--Fock calculation values were cross-checked, thereby further guaranteeing the reliability of our results. The results provided in this work can improve the signal-to-noise ratio of the clock transition and the accuracy of the second-order Zeeman shift correction, and subsequently the stability and accuracy of the microwave frequency standard based on trapped Cd<math><semantics><mrow><msup><mrow></mrow><mo>+</mo></msup></mrow><annotation encoding="application/x-tex">^+</annotation></semantics></math> ions.</p>',
        ),
      },
      authors: [
        { name: 'J. Z. Han', orcid: undefined },
        { name: 'R. Si', orcid: undefined },
        { name: 'H. R. Qin', orcid: undefined },
        { name: 'N. C. Xin', orcid: undefined },
        { name: 'Y. T. Chen', orcid: undefined },
        { name: 'S. N. Miao', orcid: undefined },
        { name: 'C. Y. Chen', orcid: undefined },
        { name: 'J. W. Zhang', orcid: undefined },
        { name: 'L. J. Wang', orcid: undefined },
      ],
      id: new ArxivPreprintId({ value: Doi('10.48550/arxiv.2201.06719') }),
      posted: Temporal.PlainDate.from({ year: 2022, month: 1, day: 18 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Determination of hyperfine splittings and Landé <math><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math> factors of <math><semantics><mrow><mn>5</mn><mi>s</mi><msup><mtext> </mtext><mn>2</mn></msup><msub><mi>S</mi><mrow><mn>1</mn><mi mathvariant="normal">/</mi><mn>2</mn></mrow></msub></mrow><annotation encoding="application/x-tex">5s~^2S_{1/2}</annotation></semantics></math> and <math><semantics><mrow><mn>5</mn><mi>p</mi><msup><mtext> </mtext><mn>2</mn></msup><msub><mi>P</mi><mrow><mn>1</mn><mi mathvariant="normal">/</mi><mn>2</mn><mo separator="true">,</mo><mn>3</mn><mi mathvariant="normal">/</mi><mn>2</mn></mrow></msub></mrow><annotation encoding="application/x-tex">5p~^2P_{1/2,3/2}</annotation></semantics></math> states of <math><semantics><mrow><msup><mrow></mrow><mrow><mn>111</mn><mo separator="true">,</mo><mn>113</mn></mrow></msup></mrow><annotation encoding="application/x-tex">^{111,113}</annotation></semantics></math>Cd<math><semantics><mrow><msup><mrow></mrow><mo>+</mo></msup></mrow><annotation encoding="application/x-tex">^+</annotation></semantics></math> for a microwave frequency standard',
        ),
      },
      url: new URL('https://arxiv.org/abs/2201.06719'),
    }),
  },
  {
    response: 'zenodo',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>The counting functions of prime pairs are derived. The asymptotic behavior of the prime pair counting functions are also analyzed.</p>',
        ),
      },
      authors: [{ name: 'Keyang Ding', orcid: undefined }],
      id: new ZenodoPreprintId({ value: Doi('10.5281/zenodo.7955181') }),
      posted: Temporal.PlainDate.from({ year: 2023, month: 5, day: 21 }),
      title: {
        language: 'en',
        text: rawHtml('The Counting Functions of Prime Pairs'),
      },
      url: new URL('https://zenodo.org/record/7955181'),
    }),
  },
  {
    response: 'zenodo-africarxiv',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Digital tools that support Open Science practices play a key role in the seamless accumulation, archiving and dissemination of scholarly data, outcomes and conclusions. Despite their integration into Open Science practices, the providence and design of these digital tools are rarely explicitly scrutinized. This means that influential factors, such as the funding models of the parent organizations, their geographic location, and the dependency on digital infrastructures are rarely considered. Suggestions from literature and anecdotal evidence already draw attention to the impact of these factors, and raise the question of whether the Open Science ecosystem can realise the aspiration to become a truly “unlimited digital commons” in its current structure. In an online research approach, we compiled and analysed the geolocation, terms and conditions as well as funding models of 242 digital tools increasingly being used by researchers in various disciplines. Our findings indicate that design decisions and restrictions are biased towards researchers in North American and European scholarly communities. In order to make the future Open Science ecosystem inclusive and operable for researchers in all world regions including Africa, Latin America, Asia and Oceania, those should be actively included in design decision processes. Digital Open Science Tools carry the promise of enabling collaboration across disciplines, world regions and language groups through responsive design. We therefore encourage long term funding mechanisms and ethnically as well as culturally inclusive approaches serving local prerequisites and conditions to tool design and construction allowing a globally connected digital research infrastructure to evolve in a regionally balanced manner.</p>',
        ),
      },
      authors: [
        { name: 'Louise Bezuidenhout', orcid: OrcidId('0000-0003-4328-3963') },
        { name: 'Johanna Havemann', orcid: OrcidId('0000-0002-6157-1494') },
      ],
      id: new AfricarxivZenodoPreprintId({ value: Doi('10.5281/zenodo.4290795') }),
      posted: Temporal.PlainDate.from({ year: 2020, month: 9, day: 3 }),
      title: {
        language: 'en',
        text: rawHtml('The Varying Openness of Digital Open Science Tools'),
      },
      url: new URL('https://zenodo.org/record/4290795'),
    }),
  },
  {
    response: 'zenodo-empty-resource-type',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          "<p>Abstract</p>\n\n<p>Advancements in mass spectrometry (MS) instrumentation—including higher resolution, faster scan speeds, increased throughput, and improved sensitivity—along with the growing adoption of imaging and ion mobility, have dramatically increased the volume and complexity of data produced in fields like proteomics, metabolomics, and lipidomics. While these technologies unlock new possibilities, they also present significant challenges in data management, storage, and accessibility. Existing formats, such as the XML-based community standards mzML and imzML, struggle to meet the demands of modern MS workflows due to their large file sizes, slow data access, and limited metadata support. Vendor-specific formats, while optimized for proprietary instruments, lack interoperability, comprehensive metadata support and long-term archival reliability.</p>\n\n<p>This white paper lays the groundwork for mzPeak, a next-generation data format designed to address these challenges and support high-throughput, multi-dimensional MS workflows. By adopting a hybrid model that combines efficient binary storage for numerical data and human-readable metadata storage, mzPeak will reduce file sizes, accelerate data access, and offer a scalable, adaptable solution for evolving MS technologies.</p>\n\n<p>For researchers, mzPeak will enable faster (random) data access, enhanced interoperability across platforms, and seamless support for complex workflows, including ion mobility and imaging. Its design will ensure data is managed in compliance with regulatory standards, essential for applications such as precision medicine and chemical safety, where long-term data integrity and accessibility are critical.</p>\n\n<p>For vendors, mzPeak provides a streamlined, open alternative to proprietary formats, reducing the burden of regulatory compliance while aligning with the industry's push for transparency and standardization. By offering a high-performance, interoperable solution, mzPeak positions vendors to meet customer demands for sustainable data management tools which will be able to handle emerging and future data types and workflows.</p>\n\n<p>mzPeak aspires to become the cornerstone of MS data management, empowering researchers, vendors, and developers to innovate and collaborate more effectively. We invite the MS community to join the discussion on PREreview.org and collaborate in developing and adopting mzPeak to meet the challenges of today and tomorrow.</p>",
        ),
      },
      authors: [
        { name: 'Tim Van Den Bossche', orcid: OrcidId('0000-0002-5916-2587') },
        { name: 'Samuel Wein', orcid: OrcidId('0000-0002-8923-6874') },
        { name: 'Theodore Alexandrov', orcid: OrcidId('0000-0001-9464-6125') },
        { name: 'Aivett Bilbao', orcid: OrcidId('0000-0003-2985-8249') },
        { name: 'Wout Bittremieux', orcid: OrcidId('0000-0002-3105-1359') },
        { name: 'Matt Chambers', orcid: OrcidId('0000-0002-7299-4783') },
        { name: 'Eric Deutsch', orcid: OrcidId('0000-0001-8732-0928') },
        { name: 'Andrew Dowsey', orcid: OrcidId('0000-0002-7404-9128') },
        { name: 'Helge Hecht', orcid: OrcidId('0000-0001-6744-996X') },
        { name: 'Joshua Klein', orcid: OrcidId('0000-0003-1279-6838') },
        { name: 'Michael Knierman', orcid: OrcidId('0000-0001-7427-2269') },
        { name: 'Robert Moritz', orcid: OrcidId('0000-0002-3216-9447') },
        { name: 'Elliott J. Price', orcid: OrcidId('0000-0001-5691-7000') },
        { name: 'James Shofstahl', orcid: OrcidId('0000-0001-5968-1742') },
        { name: 'Julian Uszkoreit', orcid: OrcidId('0000-0001-7522-4007') },
        { name: 'Juan Antonio Vizcaino', orcid: OrcidId('0000-0002-3905-4335') },
        { name: 'Mingxun Wang', orcid: OrcidId('0000-0001-7647-6097') },
        { name: 'Oliver Kohlbacher', orcid: OrcidId('0000-0003-1739-4598') },
      ],
      id: new ZenodoPreprintId({ value: Doi('10.5281/zenodo.14928694') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 2, day: 26 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Seeking community input for: mzPeak - a modern, scalable, and interoperable mass spectrometry data format for the future',
        ),
      },
      url: new URL('https://zenodo.org/doi/10.5281/zenodo.14928694'),
    }),
  },
  {
    response: 'zenodo-trailing-space',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          "<p>Main Timeline of Updates (Incomplete):</p>\n\n<p>[Created February 2, 2025], (1)The time-entropy mapping ;(2)the multiplicative analytic expression of entropy ; (3)the formula of action in disctret system;(4) the explanation of SEQ's spin-induced parity violation; (5)SEQ-dark matter; SEQ ground state energy-dark energy; (6)whole time-local time definition;the basic physical quantities in SEQ framework; (7)spontaneous entropy increase principle; (8)matter as a part of spacetime, proposed in this paper were uploaded to Zenodo https://doi.org/10.5281/zenodo.14788394 .</p>\n\n<p>[Created March 8, 2025] (1)Our theoretical prediction regarding the magnetic moment difference between positrons and electrons;(2)Gravitation and proper time dilation mechanism, (3)the explanation of the singularity paradox of black holes, (4)Spatial Arrangement Matrix Representation of Electrons with substructure,(5)Derivation of the Inverse Square Law of Gravitation in Discrete Systems,(6)Relationship Between Positron Scarcity and Spin of SEQ Ground State,(7)Mechanism of Equivalent Gravitational Field Generated by Metric Variation Due to Object Motion,(8)Annihilation and Decay of Microscopic Particles,(9)Conjecture on experiment of Muon Decay and other content were formally archived on Zenodo , https://doi.org/10.5281/zenodo.14991700 .</p>\n\n<p>[Created March 14, 2025] (1)The explanation of cosmological constant that corresponds to the ground-state energy of SEQ , (2)dark matter arising from the SEQ density; (3)Gravitational effect of dark matter; (4) representation of Electric Charge; (5)and the table of understanding on general relativity from SEQ framework were updated on https://doi.org/10.5281/zenodo.15026289</p>\n\n<p>[Created March 19, 2025](1)Key work regarding the relationship between mass-gravity-SU(3) color interaction(the role and physical image of The 8 generators of SU(3) mechanism); (2)the origin of mass; (3)the specific mechanism of time dilation, (4)corresponding explanations bridging general relativity and quantum field theory;(5) the definition of whole time, local time,poper time, relative time; (6) the speculative Diagram of Proton's Internal multi-layer Structure with Quarks and Gluons (7)relative time (8)the explanation of wave-particle duality in SEQ framework (9)Quark asymptotic freedom and color confinement originated from nonlinear variations in compression-tensile tensions among SEQs were subsequently uploaded to Zenodo on https://doi.org/10.5281/zenodo.15048612 in the appendix table2.</p>\n\n<p>[Created March 26, 2025 ] the detailed explanation about essence of gravitation-origin of mass- understanding SU(3) were updated on https://doi.org/10.5281/zenodo.15088556 .</p>\n\n<p>[Created April 11, 2025] (1)Detailed Correspondence with Newton's law of universal gravitation and(2) Correspondence with Newton's First Law—the Law of Inertia were uploaded to Zenodo on https://doi.org/10.5281/zenodo.15193461</p>\n\n<p>[Created April 20, 2025](1)Derivation of the Mass-Energy Equation in the SEQ Model(Dimensional Analysis of the Release of Spatial Elastic Potential Energy as Gravitational Waves at Light Speed in section 10.6);(2)Demonstration why matter is part of spacetime---Substantiation of the matter-spacetime unity hypothesis and other content were uploaded to Zenodo on https://doi.org/10.5281/zenodo.15251735</p>\n\n<p>[Created March 23, 2025]Primordial Gravitational Waves as a Viable Explanation of The observation of z=0.5 Gradient Reversal in DESI https://doi.org/10.5281/zenodo.15070645</p>\n\n<p>The preprints versions archived on Zenodo are under the Creative Commons Attribution 4.0 International (CC BY 4.0) license.</p>\n\n<p>When referencing any component of this research, please cite using the specific DOI of the relevant article or the newest version. Thanks.</p>\n\n<p>All upload timestamps are permanently visible in the bottom-right corner of each Zenodo version page - (Technical metadata) .</p>\n\n<p>This model establishes a rigorous time-entropy mapping that promotes:(i) entropy from a phenomenological emergent property to a fundamental dynamical variable governing system evolution;(ii) time from a passive background parameter to an active operator encoding entropic gradient flows.The resulting framework provides analytically tractable indices for characterizing non-equilibrium dynamics.</p>\n\n<p>Core contribution:</p>\n\n<p>3D matrix representation of time and entropy in space</p>\n\n<p>Space transformation-Time-Entropy Mapping Model</p>\n\n<p>Mass-Gravity-SU(3) Triad based on Quantum Field Theory</p>\n\n<p>Time and local time-proper time definition aligning with Relativity</p>\n\n<p>Analytical formula of Action Derives action from SEQ wave conduction</p>\n\n<p>Physical Image of Equivalent Gravitational Field Mechanism</p>\n\n<p>provide an entropy coordinate for computer physics simulation</p>",
        ),
      },
      authors: [{ name: 'Zhi Kai Zou', orcid: OrcidId('0009-0000-4279-1064') }],
      id: new ZenodoPreprintId({ value: Doi('10.5281/zenodo.14788393') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 4, day: 20 }),
      title: {
        language: 'en',
        text: rawHtml('Space-Time-Entropy Mapping and Mass-Gravity-SU(3) Nexus-preprint'),
      },
      url: new URL('https://zenodo.org/doi/10.5281/zenodo.14788393'),
    }),
  },
  {
    response: 'zenodo-no-abstract',
    expected: Preprint({
      abstract: undefined,
      authors: [
        { name: 'Daniel Garside', orcid: OrcidId('0000-0002-4579-003X') },
        { name: 'Joseph Corneli', orcid: OrcidId('0000-0003-1330-4698') },
        { name: 'Jane Fisher', orcid: OrcidId('0000-0002-3780-901X') },
        { name: 'Anna Mavromanoli', orcid: OrcidId('0000-0001-8833-2859') },
        { name: 'Pallab Pradhan', orcid: OrcidId('0000-0002-7862-9998') },
        { name: 'Nick Bearman', orcid: OrcidId('0000-0002-8396-4061') },
      ],
      id: new ZenodoPreprintId({ value: Doi('10.5281/zenodo.15399868') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 5, day: 14 }),
      title: {
        language: 'en',
        text: rawHtml('Envisioning the Future of Research: 10 changes for Open Research'),
      },
      url: new URL('https://zenodo.org/doi/10.5281/zenodo.15399868'),
    }),
  },
  {
    response: 'zenodo-greater-than',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Abstract</p>\n\n<p>The Riemann hypothesis, stating that all nontrivial zeros of the Riemann zeta function have real parts equal to 1/2, is one of the most important conjectures in mathematics. In this paper we prove the Riemann hypothesis by adding an extra unbounded term to the traditional definition, extending its validity to Rez&gt;0. The Stolz-Cesàro theorem is then used to analyse zeta(z)/zeta(-1z) as a ratio of complex sequences. The results are analysed in both halves of the critical strip (0&lt;Rez&lt;1/2, 1/2&lt;Rez&lt;1 ), yielding a contradiction when it is assumed that zeta(z)=0 in either of these halves.</p>',
        ),
      },
      authors: [{ name: 'James Clifton Austin', orcid: OrcidId('0000-0002-6663-3455') }],
      id: new ZenodoPreprintId({ value: Doi('10.5281/zenodo.17326513') }),
      posted: Temporal.PlainDate.from({ year: 2024, month: 12, day: 18 }),
      title: {
        language: 'en',
        text: rawHtml('Nontrivial zeros of the Riemann zeta function'),
      },
      url: new URL('https://zenodo.org/doi/10.5281/zenodo.17326513'),
    }),
  },
  {
    response: 'zenodo-abstract-unknown-language',
    expected: Preprint({
      abstract: undefined,
      authors: [
        { name: 'Raulivan Rodrigo da Silva', orcid: OrcidId('0000-0002-2740-1045') },
        { name: 'Thiago Magela Rodrigues Dias', orcid: OrcidId('0000-0001-5057-9936') },
        { name: 'Washington Luís Ribeiro de Carvalho Segundo', orcid: OrcidId('0000-0003-3635-9384') },
      ],
      id: new ZenodoPreprintId({ value: Doi('10.5281/zenodo.17478561') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 10, day: 29 }),
      title: {
        language: 'pt',
        text: rawHtml('CONJUNTO FERRAMENTAL PYTENTE'),
      },
      url: new URL('https://zenodo.org/doi/10.5281/zenodo.17478561'),
    }),
  },
  {
    response: 'figshare-africarxiv',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Mini review on mechanisms and strategies expressed by <i>A. baumannii</i> to resist biological compounds with antagonistic activity on their growthAcinetobacter baumannii (A. baumannii) has a propensity to develop, acquire and transmit antibiotic resistance-associated genes. This ability has enabled the proliferation of the species in harsh living conditions like the hospital environment. It is well known that a quasi-permanent contact between the bacterium and antibiotics has contributed to the improvement of expressed resistance mechanisms, but also, literature highlights the natural living conditions in which survival strategies have led the species to develop mechanisms and systems to establish their niche, sometimes in very competitive environment. All these mechanisms and strategies which are expressed, sometimes in response to antibiotics exposure or to just sustain viability, have enabled the rise of this bacteria species as a successful nosocomial pathogen. Here we review drug resistance mechanisms and strategies for environmental survival employed by this bacterium to consolidate information relevant for the current search for alternative management of infections caused by A. baumannii.</p>',
        ),
      },
      authors: [
        { name: 'Noel-David NOGBOU' },
        { name: 'Dikwata Thabiso PHOFA' },
        { name: 'Lawrence Chikwela OBI', orcid: OrcidId('0000-0002-0068-2035') },
        { name: 'Andrew Munyalo MUSYOKI', orcid: OrcidId('0000-0002-6577-6155') },
      ],
      id: new AfricarxivFigsharePreprintId({ value: Doi('10.6084/m9.figshare.19064801.v1') }),
      posted: Temporal.PlainDate.from({ year: 2022, month: 1, day: 26 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Revisiting drug resistance mechanisms of a notorious nosocomial pathogen: Acinetobacter baumannii',
        ),
      },
      url: new URL(
        'https://africarxiv.figshare.com/articles/preprint/Revisiting_drug_resistance_mechanisms_of_a_notorious_nosocomial_pathogen_Acinetobacter_baumannii/19064801/1',
      ),
    }),
  },
  {
    response: 'africarxiv',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          "<p>According to the WHO, more than 1 billion individuals globally risk becoming impoverished because their household's out-of-pocket medical expenses account for 10% or more of their income. A shift in health systems towards primary health care (PHC) as a means to achieving universal health coverage (UHC) in low- and middle-income nations is important in preventing 60 million deaths and adding 3.7 years to the average life expectancy. Nigeria, ranked 187th among 191 countries in the WHO health system performance ranking, faces challenges with PHC owing to inadequate health infrastructure, a shortage of healthcare professionals, and weak health systems, impeding its progress toward achieving UHC. In achieving UHC, the country started prioritizing the revitalization of PHC through collaboration, making great strides in improving PHC, with hundreds of facilities being renovated and more healthcare professionals being hired and trained. Recently, almost 10 million children have received diphtheria and tetanus vaccines in Nigeria, and 4.95 million girls aged 9 to 14 in 15 states have received HPV vaccinations to protect them from cervical cancer. To better achieve UHC, Nigeria need to seek for more collaboration from the private sector and also, the brain drain of healthcare workers should be addressed by providing a sustainable working environment. Data availability statement: Data sharing is not applicable to this article as no new data were created or analyzed in this study.</p>",
        ),
      },
      authors: [{ name: 'Yisa Sarah Sokolabe' }, { name: 'Tolulope Ogunniyi' }],
      id: new AfricarxivUbuntunetPreprintId({ value: Doi('10.60763/africarxiv/1533') }),
      posted: Temporal.PlainYearMonth.from({ year: 2024, month: 8 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Primary Healthcare System Strengthening in Nigeria: A means to achieve Universal Health Coverage',
        ),
      },
      url: new URL('https://africarxiv.ubuntunet.net/handle/1/1649'),
    }),
  },
  {
    response: 'psycharchives',
    expected: Preprint({
      abstract: {
        language: 'de',
        text: rawHtml(
          '<p>Das Ziel dieser Arbeit ist es, bewusst und greifbar aufzuzeigen, wie und unter welchen Bedingungen wir unsere inneren Kräfte optimal entfalten können, um eine Antwort auf die Frage zu liefern: Wie können wir als Individuum infinit wachsen? Die Arbeit definiert ein mathematisches Modell, das die Dynamik des individuellen Wachstums aufzeigen soll und beschreibt detailliert und spekulativ die einzelnen dazugehörigen Größen. Es werden hypothetische Verläufe beschrieben: Unter welchen Bedingungen ein Individuum im Laufe der Zeit wächst und regressiert. Die Arbeit schließt mit einem ethischen Dilemma ab, was es bedeutet Mensch zu sein und zu bleiben, der in der Lage ist seine animalischen Triebe zu kontrollieren und wonach wir unser individuelles Wachstum im Kern ein Leben lang ausrichten sollten und für welche von zwei Optionen in dem ethischen Dilemma, sich künstliche Intelligenzen entscheiden würden.</p>',
        ),
      },
      authors: [{ name: 'Philipp Ganster' }],
      id: new PsychArchivesPreprintId({ value: Doi('10.23668/psycharchives.13965') }),
      posted: Temporal.PlainDate.from({ year: 2023, month: 12, day: 12 }),
      title: {
        language: 'de',
        text: rawHtml(
          'Infinit wachsen - Welche Bedingungen müssen wir schaffen, um unser individuelles Wachstum optimal zu fördern?',
        ),
      },
      url: new URL('https://www.psycharchives.org/jspui/handle/20.500.12034/8684.2'),
    }),
  },
  {
    response: 'arcadia-science',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Raman spectroscopy is a non-destructive technique that provides a unique chemical fingerprint based only on the interaction of light with a sample. It’s been used extensively in materials science applications and more recently, in biology. This technique doesn’t require molecular or chemical labeling (it’s “label-free”), making it a potentially useful tool for studying organisms without genetic tools.</p>\n\n<p>We wondered if we could build a Raman spectrometer using open-source protocols and use it to rapidly distinguish samples based on chemical properties in a label-free way, with minimal data processing. We decided to try a hackathon to test this idea — we selected three types of samples (beer, chilis, and algae) and found that the spectra were reproducible and had sufficient dynamic range to do comparative analyses. We were able to use the Raman spectra to differentiate the three types of samples and to distinguish subgroups of samples within a given type. Beer sample spectra varied by alcohol content and by type. Chili pepper data clustered by perceived heat (Scoville units) and color. We could differentiate algae by genetic background. Finally, we found that specific spectral regions correlate with quantitative characteristics of beer (alcohol by volume) and chilis (perceived heat).</p>\n\n<p>Our work highlights the utility and ease of this technique. We hope it will empower scientists to capture the chemical composition of samples and extract a great degree of high-dimensional data from Raman spectra. We imagine this report could also be useful for science educators who want to use the OpenRAMAN resource and our code to run a lab class on Raman spectroscopy. We’d love to know if you try this technique and whether it allows you to distinguish features in a way that isn’t possible or is more difficult using other methods.</p>',
        ),
      },
      authors: [
        { name: 'Prachee Avasthi', orcid: OrcidId('0000-0002-1688-722X') },
        { name: 'Brae M. Bigge', orcid: OrcidId('0000-0002-0907-4597') },
        { name: 'Ben Braverman', orcid: OrcidId('0009-0005-0334-7004') },
        { name: 'Tara Essock-Burns', orcid: OrcidId('0000-0003-4159-6974') },
        { name: 'Ryan Lane', orcid: OrcidId('0000-0002-5887-2069') },
        { name: 'David G. Mets', orcid: OrcidId('0000-0002-0803-0912') },
        { name: 'Austin H. Patton', orcid: OrcidId('0000-0003-1286-9005') },
        { name: 'Ryan York', orcid: OrcidId('0000-0002-1073-1494') },
      ],
      id: new ArcadiaSciencePreprintId({ value: Doi('10.57844/arcadia-085e-3ecf') }),
      posted: 2024,
      title: {
        language: 'en',
        text: rawHtml('Raman spectroscopy enables rapid and inexpensive exploration of biology'),
      },
      url: new URL('https://research.arcadiascience.com/pub/result-easy-raman-spectroscopy'),
    }),
  },
])('can parse a DataCite record ($response)', ({ response, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Datacite/RecordSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Datacite.RecordResponseSchema))),
      Effect.andThen(recordToPreprint),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test.each([
  'africarxiv-journal-article',
  'figshare-africarxiv-journal-article',
  'osf-file',
  'osf-registration',
  'zenodo-journal-article',
])('returns a specific error for non-Preprint record (%s)', response =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Datacite/RecordSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Datacite.RecordResponseSchema))),
      Effect.andThen(recordToPreprint),
      Effect.flip,
    )

    expect(actual._tag).toStrictEqual('NotAPreprint')
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test.each([
  'cdl-ucb-dryad',
  'cdl-ucb',
  'cdl-ucd-dryad',
  'cdl-ucd',
  'cdl-uci-dryad',
  'cdl-uci',
  'cdl-ucla-dryad',
  'cdl-ucm-dryad',
  'cdl-ucm',
  'cdl-ucr-dryad',
  'cdl-ucr',
  'cdl-ucsb-dryad',
  'cdl-ucsc-dryad',
  'cdl-ucsc',
  'cdl-ucsf-dryad',
  'cdl-ucsf',
  'dryad',
  'dryad-alt',
  'dryad-collection',
  'dryad-html',
  'figshare',
])('returns a specific error for an unsupported DOI record (%s)', response =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Datacite/RecordSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Datacite.RecordResponseSchema))),
      Effect.andThen(recordToPreprint),
      Effect.flip,
    )

    expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)
