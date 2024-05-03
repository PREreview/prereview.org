import { type Doi, isDoi, parse } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { getInput, invalidE } from '../form'
import { type DoesPreprintExistEnv, doesPreprintExist } from '../preprint'
import { type PageResponse, RedirectResponse } from '../response'
import { writeReviewMatch } from '../routes'
import { type IndeterminatePreprintId, fromUrl, parsePreprintDoi } from '../types/preprint-id'
import { failureMessage } from './failure-message'
import { notAPreprintPage } from './not-a-preprint-page'
import { createPage } from './review-a-preprint'
import { createUnknownPhilsciPreprintPage } from './unknown-philsci-preprint-page'
import { createUnknownPreprintWithDoiPage } from './unknown-preprint-with-doi-page'
import { unsupportedDoiPage } from './unsupported-doi-page'
import { unsupportedUrlPage } from './unsupported-url-page'

export const reviewAPreprint = (state: {
  body: unknown
  method: string
}): RT.ReaderTask<DoesPreprintExistEnv, PageResponse | RedirectResponse> =>
  match(state)
    .with({ method: 'POST', body: P.select() }, whichPreprint)
    .otherwise(() => RT.of(createPage(E.right(undefined))))

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
  D.parse(url => E.fromOption(() => D.error(url, 'PreprintUrl'))(fromUrl(url))),
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
      O.chain(input =>
        pipe(
          parse(input),
          O.map(unsupportedDoiE),
          O.altW(() => pipe(O.fromEither(UrlD.decode(input)), O.map(unsupportedUrlE))),
          O.altW(() => O.some(invalidE(input))),
        ),
      ),
      O.getOrElseW(() => invalidE('')),
    ),
  ),
)

const whichPreprint = flow(
  RTE.fromEitherK(parseWhichPreprint),
  RTE.chainFirstW(preprint =>
    pipe(doesPreprintExist(preprint), RTE.chainEitherKW(E.fromPredicate(identity, () => unknownPreprintE(preprint)))),
  ),
  RTE.matchW(
    error =>
      match(error)
        .with({ _tag: 'UnknownPreprintE', actual: P.select() }, createUnknownPreprintPage)
        .with({ _tag: 'UnsupportedDoiE' }, () => unsupportedDoiPage)
        .with({ _tag: 'UnsupportedUrlE' }, () => unsupportedUrlPage)
        .with('not-a-preprint', () => notAPreprintPage)
        .with('unavailable', () => failureMessage)
        .otherwise(flow(E.left, createPage)),
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

function createUnknownPreprintPage(preprint: IndeterminatePreprintId) {
  return match(preprint)
    .with({ type: 'philsci' }, createUnknownPhilsciPreprintPage)
    .with({ value: P.when(isDoi) }, createUnknownPreprintWithDoiPage)
    .exhaustive()
}
