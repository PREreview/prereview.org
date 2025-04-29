import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Effect, pipe, Schema, Struct } from 'effect'
import { Orcid } from 'orcid-id-ts'
import { recordToPreprint } from '../../src/Datacite/Preprint.js'
import { Record, ResponseSchema } from '../../src/Datacite/Record.js'
import { rawHtml } from '../../src/html.js'
import { Preprint } from '../../src/preprint.js'
import * as EffectTest from '../EffectTest.js'

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
        { name: 'Gabriela Duarte Bezerra', orcid: Orcid('0000-0002-7472-4621') },
        { name: 'WONESKA RODRIGUES PINHEIRO', orcid: undefined },
      ],
      id: { _tag: 'osf', value: Doi('10.17605/osf.io/eq8bk') },
      posted: Temporal.PlainDate.from({ year: 2023, month: 9, day: 13 }),
      title: {
        language: 'pt',
        text: rawHtml(
          'Teorias De Enfermagem Para Abordagem Familiar De Potenciais Doadores De Órgãos: revisão de escopo',
        ),
      },
      url: new URL('https://osf.io/eq8bk'),
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
        { name: 'Fadzliwati Mohiddin', orcid: Orcid('0000-0002-7332-209X') },
        { name: 'Kabiru Maitama Kura', orcid: Orcid('0000-0001-7863-2604') },
        { name: 'Hartini Mashod', orcid: Orcid('0000-0001-7201-8961') },
        { name: 'Ramatu Abdulkareem Abubakar', orcid: Orcid('0000-0001-6956-9885') },
        { name: 'Noor Maya Salleh', orcid: undefined },
        { name: 'Dr. Faridahwati Mohd. Shamsudin', orcid: undefined },
        { name: 'Shahratul Karmila Rosland', orcid: Orcid('0009-0000-3311-5160') },
      ],
      id: { _tag: 'lifecycle-journal', value: Doi('10.17605/osf.io/bu3rj') },
      posted: Temporal.PlainDate.from({ year: 2025, month: 4, day: 3 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Self-leadership and innovative work behaviors: Testing a parallel mediation model with goal striving and goal generation',
        ),
      },
      url: new URL('https://osf.io/bu3rj'),
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
      authors: [{ name: 'Ian Hussey', orcid: Orcid('0000-0001-8906-7559') }],
      id: { _tag: 'lifecycle-journal', value: Doi('10.17605/osf.io/bmqcw') },
      posted: Temporal.PlainDate.from({ year: 2025, month: 3, day: 9 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Verification of Zhao et al (2023) ‘Effect of Acceptance and Commitment Therapy for depressive disorders: a meta-analysis’',
        ),
      },
      url: new URL('https://osf.io/bmqcw'),
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
      id: { _tag: 'arxiv', value: Doi('10.48550/arxiv.2201.06719') },
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
      id: { _tag: 'zenodo', value: Doi('10.5281/zenodo.7955181') },
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
        { name: 'Louise Bezuidenhout', orcid: Orcid('0000-0003-4328-3963') },
        { name: 'Johanna Havemann', orcid: Orcid('0000-0002-6157-1494') },
      ],
      id: { _tag: 'africarxiv', value: Doi('10.5281/zenodo.4290795') },
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
          "<p>Abstract\n\nAdvancements in mass spectrometry (MS) instrumentation—including higher resolution, faster scan speeds, increased throughput, and improved sensitivity—along with the growing adoption of imaging and ion mobility, have dramatically increased the volume and complexity of data produced in fields like proteomics, metabolomics, and lipidomics. While these technologies unlock new possibilities, they also present significant challenges in data management, storage, and accessibility. Existing formats, such as the XML-based community standards mzML and imzML, struggle to meet the demands of modern MS workflows due to their large file sizes, slow data access, and limited metadata support. Vendor-specific formats, while optimized for proprietary instruments, lack interoperability, comprehensive metadata support and long-term archival reliability.\n\nThis white paper lays the groundwork for mzPeak, a next-generation data format designed to address these challenges and support high-throughput, multi-dimensional MS workflows. By adopting a hybrid model that combines efficient binary storage for numerical data and human-readable metadata storage, mzPeak will reduce file sizes, accelerate data access, and offer a scalable, adaptable solution for evolving MS technologies.\n\nFor researchers, mzPeak will enable faster (random) data access, enhanced interoperability across platforms, and seamless support for complex workflows, including ion mobility and imaging. Its design will ensure data is managed in compliance with regulatory standards, essential for applications such as precision medicine and chemical safety, where long-term data integrity and accessibility are critical.\n\nFor vendors, mzPeak provides a streamlined, open alternative to proprietary formats, reducing the burden of regulatory compliance while aligning with the industry's push for transparency and standardization. By offering a high-performance, interoperable solution, mzPeak positions vendors to meet customer demands for sustainable data management tools which will be able to handle emerging and future data types and workflows.\n\nmzPeak aspires to become the cornerstone of MS data management, empowering researchers, vendors, and developers to innovate and collaborate more effectively. We invite the MS community to join the discussion on PREreview.org and collaborate in developing and adopting mzPeak to meet the challenges of today and tomorrow.</p>",
        ),
      },
      authors: [
        { name: 'Tim Van Den Bossche', orcid: Orcid('0000-0002-5916-2587') },
        { name: 'Samuel Wein', orcid: Orcid('0000-0002-8923-6874') },
        { name: 'Theodore Alexandrov', orcid: Orcid('0000-0001-9464-6125') },
        { name: 'Aivett Bilbao', orcid: Orcid('0000-0003-2985-8249') },
        { name: 'Wout Bittremieux', orcid: Orcid('0000-0002-3105-1359') },
        { name: 'Matt Chambers', orcid: Orcid('0000-0002-7299-4783') },
        { name: 'Eric Deutsch', orcid: Orcid('0000-0001-8732-0928') },
        { name: 'Andrew Dowsey', orcid: Orcid('0000-0002-7404-9128') },
        { name: 'Helge Hecht', orcid: Orcid('0000-0001-6744-996X') },
        { name: 'Joshua Klein', orcid: Orcid('0000-0003-1279-6838') },
        { name: 'Michael Knierman', orcid: Orcid('0000-0001-7427-2269') },
        { name: 'Robert Moritz', orcid: Orcid('0000-0002-3216-9447') },
        { name: 'Elliott J. Price', orcid: Orcid('0000-0001-5691-7000') },
        { name: 'James Shofstahl', orcid: Orcid('0000-0001-5968-1742') },
        { name: 'Julian Uszkoreit', orcid: Orcid('0000-0001-7522-4007') },
        { name: 'Juan Antonio Vizcaino', orcid: Orcid('0000-0002-3905-4335') },
        { name: 'Mingxun Wang', orcid: Orcid('0000-0001-7647-6097') },
        { name: 'Oliver Kohlbacher', orcid: Orcid('0000-0003-1739-4598') },
      ],
      id: { _tag: 'zenodo', value: Doi('10.5281/zenodo.14928694') },
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
])('can parse a DataCite record ($response)', ({ response, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/Datacite/RecordSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(ResponseSchema(Record)))),
      Effect.andThen(Struct.get('data')),
      Effect.andThen(Struct.get('attributes')),
      Effect.andThen(recordToPreprint),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test.each(['osf-file', 'osf-registration', 'zenodo-journal-article'])(
  'returns a specific error for non-Preprint record (%s)',
  response =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        FileSystem.FileSystem,
        Effect.andThen(fs => fs.readFileString(`test/Datacite/RecordSamples/${response}.json`)),
        Effect.andThen(Schema.decodeUnknown(Schema.parseJson(ResponseSchema(Record)))),
        Effect.andThen(Struct.get('data')),
        Effect.andThen(Struct.get('attributes')),
        Effect.andThen(recordToPreprint),
        Effect.flip,
      )

      expect(actual._tag).toStrictEqual('NotAPreprint')
    }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)
