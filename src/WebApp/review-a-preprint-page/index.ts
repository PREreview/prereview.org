import { type Doi, isDoi, parse } from 'doi-ts'
import { Array, Option, flow, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { getInput, invalidE } from '../../form.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type ResolvePreprintIdEnv, resolvePreprintId } from '../../preprint.ts'
import { type IndeterminatePreprintId, fromUrl, parsePreprintDoi } from '../../Preprints/index.ts'
import { FptsToEffect } from '../../RefactoringUtilities/index.ts'
import { type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { writeReviewMatch } from '../../routes.ts'
import { failureMessage } from './failure-message.ts'
import { notAPreprintPage } from './not-a-preprint-page.ts'
import { createPage } from './review-a-preprint.ts'
import { createUnknownPhilsciPreprintPage } from './unknown-philsci-preprint-page.ts'
import { createUnknownPreprintWithDoiPage } from './unknown-preprint-with-doi-page.ts'
import { unsupportedDoiPage } from './unsupported-doi-page.ts'
import { unsupportedUrlPage } from './unsupported-url-page.ts'

export const reviewAPreprint = (state: {
  body: unknown
  locale: SupportedLocale
  method: string
}): RT.ReaderTask<ResolvePreprintIdEnv, PageResponse | RedirectResponse> =>
  match(state)
    .with({ method: 'POST', body: P.select() }, whichPreprint(state.locale))
    .otherwise(() => RT.of(createPage(E.right(undefined), state.locale)))

const UrlD = pipe(
  D.string,
  D.parse(s =>
    pipe(
      E.tryCatch(
        () => new URL(s.trim()),
        () => D.error(s, 'URL'),
      ),
      E.filterOrElse(
        url => url.protocol === 'http:' || url.protocol === 'https:',
        () => D.error(s, 'URL'),
      ),
    ),
  ),
)

const DoiD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'DOI'))(parsePreprintDoi(s))),
)

const PreprintUrlD = pipe(
  UrlD,
  D.parse(url =>
    pipe(
      fromUrl(url),
      Array.match({
        onEmpty: () => D.failure(url, 'PreprintUrl'),
        onNonEmpty: D.success,
      }),
    ),
  ),
)

const WhichPreprintD: D.Decoder<unknown, Array.NonEmptyReadonlyArray<IndeterminatePreprintId>> = pipe(
  D.struct({
    preprint: D.union(pipe(DoiD, D.map(Array.of)), PreprintUrlD),
  }),
  D.map(form => form.preprint),
)

const parseWhichPreprint = flow(
  WhichPreprintD.decode,
  E.mapLeft(
    flow(
      getInput('preprint'),
      Option.flatMap(input =>
        pipe(
          FptsToEffect.option(parse(input)),
          Option.map(unsupportedDoiE),
          Option.orElse(() =>
            pipe(Option.getRight(FptsToEffect.either(UrlD.decode(input))), Option.map(unsupportedUrlE)),
          ),
          Option.orElseSome(() => invalidE(input)),
        ),
      ),
      Option.getOrElse(() => invalidE('')),
    ),
  ),
)

const whichPreprint = (locale: SupportedLocale) =>
  flow(
    RTE.fromEitherK(parseWhichPreprint),
    RTE.chainW(preprint =>
      pipe(
        resolvePreprintId(...preprint),
        RTE.mapLeft(error =>
          match(error)
            .with({ _tag: 'PreprintIsNotFound' }, () => unknownPreprintE(Array.headNonEmpty(preprint)))
            .otherwise(identity),
        ),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with({ _tag: 'UnknownPreprintE', actual: P.select() }, preprint =>
            createUnknownPreprintPage(preprint, locale),
          )
          .with({ _tag: 'UnsupportedDoiE' }, () => unsupportedDoiPage(locale))
          .with({ _tag: 'UnsupportedUrlE' }, () => unsupportedUrlPage(locale))
          .with({ _tag: 'NotAPreprint' }, () => notAPreprintPage(locale))
          .with({ _tag: 'PreprintIsUnavailable' }, () => failureMessage(locale))
          .otherwise(form => createPage(E.left(form), locale)),
      preprint => RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint }) }),
    ),
  )

interface UnknownPreprintE {
  readonly _tag: 'UnknownPreprintE'
  readonly actual: IndeterminatePreprintId
}

interface UnsupportedDoiE {
  readonly _tag: 'UnsupportedDoiE'
  readonly actual: Doi
}

interface UnsupportedUrlE {
  readonly _tag: 'UnsupportedUrlE'
  readonly actual: URL
}

const unknownPreprintE = (actual: IndeterminatePreprintId): UnknownPreprintE => ({
  _tag: 'UnknownPreprintE',
  actual,
})

const unsupportedDoiE = (actual: Doi): UnsupportedDoiE => ({
  _tag: 'UnsupportedDoiE',
  actual,
})

const unsupportedUrlE = (actual: URL): UnsupportedUrlE => ({
  _tag: 'UnsupportedUrlE',
  actual,
})

function createUnknownPreprintPage(preprint: IndeterminatePreprintId, locale: SupportedLocale) {
  return match(preprint)
    .with({ _tag: 'PhilsciPreprintId' }, preprint => createUnknownPhilsciPreprintPage(preprint, locale))
    .with({ value: P.when(isDoi) }, preprint => createUnknownPreprintWithDoiPage(preprint, locale))
    .exhaustive()
}
