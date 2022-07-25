import { Temporal } from '@js-temporal/polyfill'
import { Doi, hasRegistrant, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { Predicate } from 'fp-ts/Predicate'
import { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { compose } from 'fp-ts/Refinement'
import * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { Record, getRecord } from 'zenodo-ts'
import { Html, html, plainText, sanitizeHtml, sendHtml } from './html'
import { handleError } from './http-error'
import { page } from './page'
import { preprintMatch } from './routes'
import { renderDate } from './time'

import PlainDate = Temporal.PlainDate

type Preprint = {
  doi: Doi<'1101'>
  title: Html
}

export interface GetPreprintTitleEnv {
  getPreprintTitle: (doi: Doi<'1101'>) => TE.TaskEither<unknown, Html>
}

const DoiD = D.fromRefinement(pipe(isDoi, compose(hasRegistrant('1101'))), 'DOI')

const isInCommunity: Predicate<Record> = flow(
  O.fromNullableK(record => record.metadata.communities),
  O.chain(A.findFirst(community => community.id === 'prereview-reviews')),
  O.isSome,
)

const getReviewUrl = flow(
  (record: Record) => record.files,
  RA.findFirst(file => file.type === 'html'),
  O.map(get('links.self')),
)

const getReviewText = flow(
  RTE.fromOptionK(() => ({ status: Status.NotFound }))(getReviewUrl),
  RTE.chainW(flow(F.Request('GET'), F.send)),
  RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'no text'),
  RTE.chainTaskEitherK(F.getText(identity)),
  RTE.map(sanitizeHtml),
)

const getReviewedDoi = flow(
  O.fromNullableK((record: Record) => record.metadata.related_identifiers),
  O.chain(
    A.findFirst(
      identifier =>
        identifier.relation === 'reviews' &&
        identifier.scheme === 'doi' &&
        identifier.resource_type === 'publication-preprint',
    ),
  ),
  O.chainEitherK(flow(get('identifier'), DoiD.decode)),
)

const getPreprint = (doi: Doi<'1101'>) =>
  pipe(
    RTE.ask<GetPreprintTitleEnv>(),
    RTE.chainTaskEitherK(({ getPreprintTitle }) =>
      pipe(TE.Do, TE.apS('doi', TE.right(doi)), TE.apS('title', getPreprintTitle(doi))),
    ),
  )

const sendPage = flow(
  fromReaderK(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

export const review = flow(
  RM.fromReaderTaskEitherK(getRecord),
  RM.filterOrElseW(isInCommunity, () => new NotFound()),
  RM.bindTo('review'),
  RM.bindW('preprintDoi', ({ review }) => RM.fromEither(E.fromOption(() => new NotFound())(getReviewedDoi(review)))),
  RM.bind(
    'reviewText',
    RM.fromReaderTaskEitherK(({ review }) => getReviewText(review)),
  ),
  RM.bindW(
    'preprint',
    RM.fromReaderTaskEitherK(({ preprintDoi }) => getPreprint(preprintDoi)),
  ),
  RM.ichainW(sendPage),
  RM.orElseW(error =>
    match(error)
      .with({ status: Status.NotFound }, () => handleError(new NotFound()))
      .otherwise(() => showFailureMessage),
  ),
)

const showFailureMessage = pipe(
  RM.rightReader(failureMessage()),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainMiddlewareK(sendHtml),
)

function failureMessage() {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main>
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to show the PREreview now.</p>

        <p>Please try again later.</p>
      </main>
    `,
  })
}

function createPage({ preprint, review, reviewText }: { preprint: Preprint; review: Record; reviewText: Html }) {
  return page({
    title: plainText`PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="back">Back to preprint</a>
      </nav>

      <main>
        <header>
          <h1>PREreview of “${preprint.title}”</h1>

          <ol aria-label="Authors of this PREreview" class="author-list">
            ${review.metadata.creators.map(author => html` <li>${displayAuthor(author)}</li>`)}
          </ol>

          <dl>
            <div>
              <dt>Posted</dt>
              <dd>${renderDate(PlainDate.from(review.metadata.publication_date.toISOString().split('T')[0]))}</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd class="doi">${review.metadata.doi}</dd>
            </div>
          </dl>
        </header>

        ${reviewText}
      </main>
    `,
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="https://orcid.org/${orcid}">${name}</a>`
  }

  return name
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
