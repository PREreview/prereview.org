import { Doi, isDoi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { Predicate } from 'fp-ts/Predicate'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { Record, getRecord } from 'zenodo-ts'
import { Html, html, plainText, rawHtml, sendHtml } from './html'
import { handleError } from './http-error'
import { page } from './page'
import { preprintMatch } from './routes'

type Preprint = {
  doi: Doi
  title: Html
}

export interface GetPreprintTitleEnv {
  getPreprintTitle: (doi: Doi) => TE.TaskEither<unknown, Html>
}

const DoiD = D.fromRefinement(isDoi, 'DOI')

const isInCommunity: Predicate<Record> = flow(
  O.fromNullableK(record => record.metadata.communities),
  O.chain(A.findFirst(community => community.id === 'prereview-reviews')),
  O.isSome,
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

const getPreprint = (doi: Doi) =>
  pipe(
    RTE.ask<GetPreprintTitleEnv>(),
    RTE.chainTaskEitherK(({ getPreprintTitle }) =>
      pipe(TE.Do, TE.apS('doi', TE.right(doi)), TE.apS('title', getPreprintTitle(doi))),
    ),
  )

const sendPage = flow(
  createPage,
  M.of,
  M.ichainFirst(() => M.status(Status.OK)),
  M.ichain(sendHtml),
)

export const review = flow(
  RM.fromReaderTaskEitherK(getRecord),
  RM.filterOrElseW(isInCommunity, () => new NotFound()),
  RM.bindTo('review'),
  RM.bindW('preprintDoi', ({ review }) => RM.fromEither(E.fromOption(() => new NotFound())(getReviewedDoi(review)))),
  RM.bindW(
    'preprint',
    RM.fromReaderTaskEitherK(({ preprintDoi }) => getPreprint(preprintDoi)),
  ),
  RM.ichainMiddlewareKW(sendPage),
  RM.orElseMiddlewareK(error =>
    match(error)
      .with({ status: Status.NotFound }, () => handleError(new NotFound()))
      .otherwise(() => showFailureMessage),
  ),
)

const showFailureMessage = pipe(
  M.status(Status.ServiceUnavailable),
  M.ichain(() => pipe(failureMessage(), sendHtml)),
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

function createPage({ preprint, review }: { preprint: Preprint; review: Record }) {
  return page({
    title: plainText`PREeview of '${preprint.title}'`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="back">Back to preprint</a>
      </nav>

      <main>
        <header>
          <h1>PREreview of '${preprint.title}'</h1>

          <ol aria-label="Authors of this PREreview" class="author-list">
            ${review.metadata.creators.map(author => html` <li>${displayAuthor(author)}</li>`)}
          </ol>

          <dl>
            <div>
              <dt>Posted</dt>
              <dd>
                <time datetime="${review.metadata.publication_date.toISOString().slice(0, 10)}">
                  ${review.metadata.publication_date.toLocaleDateString('en', { dateStyle: 'long' })}
                </time>
              </dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd class="doi">${review.metadata.doi}</dd>
            </div>
          </dl>
        </header>

        ${rawHtml(review.metadata.description)}
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
