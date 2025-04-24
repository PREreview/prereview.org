import { type Doi, isDoi, parse } from 'doi-ts'
import { Array, Option, flow, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { getInput, invalidE } from '../form.js'
import * as FptsToEffect from '../FptsToEffect.js'
import type { SupportedLocale } from '../locales/index.js'
import { type DoesPreprintExistEnv, doesPreprintExist } from '../preprint.js'
import { type PageResponse, RedirectResponse } from '../response.js'
import { writeReviewMatch } from '../routes.js'
import { type IndeterminatePreprintId, fromUrl, parsePreprintDoi } from '../types/preprint-id.js'
import { failureMessage } from './failure-message.js'
import { notAPreprintPage } from './not-a-preprint-page.js'
import { createPage } from './review-a-preprint.js'
import { createUnknownPhilsciPreprintPage } from './unknown-philsci-preprint-page.js'
import { createUnknownPreprintWithDoiPage } from './unknown-preprint-with-doi-page.js'
import { unsupportedDoiPage } from './unsupported-doi-page.js'
import { unsupportedUrlPage } from './unsupported-url-page.js'

export const reviewAPreprint = (state: {
  body: unknown
  locale: SupportedLocale
  method: string
}): RT.ReaderTask<DoesPreprintExistEnv, PageResponse | RedirectResponse> =>
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
    E.fromOption(() => D.error(url, 'PreprintUrl'))(
      pipe(
        fromUrl(url),
        Array.match({
          onEmpty: Option.none,
          onNonEmpty: ([head, ...tail]) => (tail.length === 0 ? Option.some(head) : Option.none()),
        }),
      ),
    ),
  ),
)

const WhichPreprintD = pipe(
  D.struct({
    preprint: D.union(DoiD, PreprintUrlD),
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
    RTE.chainFirstW(preprint =>
      pipe(doesPreprintExist(preprint), RTE.chainEitherKW(E.fromPredicate(identity, () => unknownPreprintE(preprint)))),
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
    .with({ _tag: 'philsci' }, preprint => createUnknownPhilsciPreprintPage(preprint, locale))
    .with({ value: P.when(isDoi) }, preprint => createUnknownPreprintWithDoiPage(preprint, locale))
    .exhaustive()
}
