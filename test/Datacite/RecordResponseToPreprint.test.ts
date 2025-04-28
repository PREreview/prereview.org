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

test.each(['osf-file', 'osf-registration'])('returns a specific error for non-Preprint record (%s)', response =>
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
