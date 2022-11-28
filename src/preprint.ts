import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { LanguageCode } from 'iso-639-1'
import { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import textClipper from 'text-clipper'
import { match } from 'ts-pattern'
import { Html, html, plainText, rawHtml, sendHtml } from './html'
import { notFound } from './middleware'
import { page } from './page'
import { PreprintId } from './preprint-id'
import { reviewMatch, writeReviewMatch } from './routes'
import { renderDate } from './time'

import PlainDate = Temporal.PlainDate

export type Preprint = {
  abstract: {
    language: LanguageCode
    text: Html
  }
  authors: ReadonlyNonEmptyArray<{
    name: string
    orcid?: Orcid
  }>
  id: PreprintId
  posted: PlainDate
  title: {
    language: LanguageCode
    text: Html
  }
  url: URL
}

export type Prereview = {
  authors: ReadonlyNonEmptyArray<{ name: string; orcid?: Orcid }>
  id: number
  text: Html
}

export interface GetPreprintEnv {
  getPreprint: (doi: PreprintId['doi']) => TE.TaskEither<'not-found' | 'unavailable', Preprint>
}

export interface GetPrereviewsEnv {
  getPrereviews: (id: PreprintId) => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

const sendPage = flow(
  fromReaderK(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const getPreprint = (doi: PreprintId['doi']) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprint }: GetPreprintEnv) => getPreprint(doi)))

const getPrereviews = (id: PreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereviews }: GetPrereviewsEnv) => getPrereviews(id)))

export const preprint = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.bindTo('preprint'),
  RM.bindW(
    'reviews',
    RM.fromReaderTaskEitherK(({ preprint }) => getPrereviews(preprint.id)),
  ),
  RM.ichainW(sendPage),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => showFailureMessage)
      .exhaustive(),
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

        <p>We’re unable to show the preprint and its PREreviews now.</p>

        <p>Please try again later.</p>
      </main>
    `,
  })
}

function createPage({ preprint, reviews }: { preprint: Preprint; reviews: ReadonlyArray<Prereview> }) {
  return page({
    title: plainText`PREreviews of “${preprint.title.text}”`,
    content: html`
      <h1 class="visually-hidden">
        PREreviews of “<span lang="${preprint.title.language}" dir="${getLangDir(preprint.title.language)}"
          >${preprint.title.text}</span
        >”
      </h1>

      <aside id="preprint-details" tabindex="0" aria-label="Preprint details">
        <article>
          <header>
            <h2 lang="${preprint.title.language}" dir="${getLangDir(preprint.title.language)}">
              ${preprint.title.text}
            </h2>

            <ol aria-label="Authors of this preprint" role="list" class="author-list">
              ${preprint.authors.map(author => html` <li>${displayAuthor(author)}</li>`)}
            </ol>

            <dl>
              <div>
                <dt>Posted</dt>
                <dd>${renderDate(preprint.posted)}</dd>
              </div>
              <div>
                <dt>Server</dt>
                <dd>
                  ${match(preprint.id.type)
                    .with('africarxiv', () => 'AfricArXiv Preprints')
                    .with('biorxiv', () => 'bioRxiv')
                    .with('eartharxiv', () => 'EarthArXiv')
                    .with('medrxiv', () => 'medRxiv')
                    .with('osf', () => 'OSF Preprints')
                    .with('psyarxiv', () => 'PsyArXiv')
                    .with('research-square', () => 'Research Square')
                    .with('scielo', () => 'SciELO Preprints')
                    .with('socarxiv', () => 'SocArXiv')
                    .exhaustive()}
                </dd>
              </div>
              <div>
                <dt>DOI</dt>
                <dd class="doi" translate="no">${preprint.id.doi}</dd>
              </div>
            </dl>
          </header>

          <h3>Abstract</h3>

          <div lang="${preprint.abstract.language}" dir="${getLangDir(preprint.abstract.language)}">
            ${preprint.abstract.text}
          </div>

          <a href="${preprint.url.href}" class="button">Read the preprint</a>
        </article>
      </aside>

      <main id="prereviews">
        <h2>${reviews.length} PREreview${reviews.length !== 1 ? 's' : ''}</h2>

        <a href="${format(writeReviewMatch.formatter, { doi: preprint.id.doi })}" class="button">Write a PREreview</a>

        <ol class="cards">
          ${reviews.map(showReview)}
        </ol>
      </main>
    `,
    skipLinks: [
      [html`Skip to preprint details`, '#preprint-details'],
      [html`Skip to PREreviews`, '#prereviews'],
    ],
    type: 'two-up',
  })
}

function showReview(review: Prereview) {
  return html`
    <li>
      <article>
        <ol aria-label="Authors of this PREreview" role="list" class="author-list">
          ${review.authors.map(author => html` <li>${author.name}</li>`)}
        </ol>

        ${rawHtml(textClipper(review.text.toString(), 300, { html: true, maxLines: 5 }))}

        <a href="${format(reviewMatch.formatter, { id: review.id })}" class="more">
          Read
          <span class="visually-hidden">
            the PREreview by ${review.authors[0].name} ${review.authors.length > 1 ? 'et al.' : ''}
          </span>
        </a>
      </article>
    </li>
  `
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
