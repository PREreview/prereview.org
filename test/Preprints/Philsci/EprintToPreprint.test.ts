import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Effect, pipe, Schema } from 'effect'
import { Philsci } from '../../../src/ExternalApis/index.js'
import { rawHtml } from '../../../src/html.js'
import { PhilsciPreprintId, Preprint } from '../../../src/Preprints/index.js'
import * as _ from '../../../src/Preprints/Philsci/EprintToPreprint.js'
import { Orcid } from '../../../src/types/index.js'
import * as EffectTest from '../../EffectTest.js'

test.each([
  {
    response: 'eprint-pittpreprint',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Imagination is extremely important for science, yet very little is known about how scientists actually use it. Are scientists taught to imagine? What do they value imagination for? How do social and disciplinary factors shape it? How is the labor of imagining distributed? These questions should be high priority for anyone who studies or practices science, and this paper argues that the best methods for addressing them are qualitative. I summarize a few preliminary findings derived from recent interview-based and observational qualitative studies that I have performed. These finding include: (i) imagination is only valued for use in addressing maximally specific problems, and only when all else fails; (ii) younger scientists and scientists who are members of underrepresented groups express less positive views about imagination in general, and have less confidence in their own imaginations; (iii) while scientists seem to employ various epistemological frameworks to evaluate imaginings, overall they appear to be epistemic consequentialists about imagination, and this holds also for their evaluations of the tools they use to extend the power of their imaginations. I close by discussing the epistemic and ethical consequences of these findings, and then suggesting a few research avenues that could be explored next as we move forward in the study of scientific imagination.</p>',
        ),
      },
      authors: [{ name: 'Michael T. Stuart', orcid: Orcid.Orcid('0000-0002-4165-2641') }],
      id: new PhilsciPreprintId({ value: 23254 }),
      posted: 2024,
      title: {
        language: 'en',
        text: rawHtml('The Qualitative Study of Scientific Imagination'),
      },
      url: new URL('https://philsci-archive.pitt.edu/id/eprint/23254'),
    }),
  },
  {
    response: 'eprint-pittpreprint-no-date',
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>The publication of the EPR paper in 1935 prompted Heisenberg to draft a manuscript on the question of the completability of quantum mechanics (which was published only posthumously). We give here the English translation of this manuscript with a brief introduction and bibliography.</p>',
        ),
      },
      authors: [{ name: 'Elise Crull' }, { name: 'Guido Bacciagaluppi' }],
      id: new PhilsciPreprintId({ value: 8590 }),
      posted: Temporal.PlainDate.from('2011-05-04'),
      title: {
        language: 'en',
        text: rawHtml(
          'Translation of: W. Heisenberg, ‘Ist eine deterministische Ergänzung der Quantenmechanik möglich?’',
        ),
      },
      url: new URL('https://philsci-archive.pitt.edu/id/eprint/8590'),
    }),
  },
])('can parse an Eprint ($response)', ({ response, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Philsci/Samples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Philsci.Eprint))),
      Effect.andThen(_.EprintToPreprint),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test.each(['eprint-other', 'eprint-published-article'])(
  'returns a specific error for non-Preprint record (%s)',
  response =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        FileSystem.FileSystem,
        Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Philsci/Samples/${response}.json`)),
        Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Philsci.Eprint))),
        Effect.andThen(_.EprintToPreprint),
        Effect.flip,
      )

      expect(actual._tag).toStrictEqual('NotAPreprint')
    }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)
