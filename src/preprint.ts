import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import { sequenceS } from 'fp-ts/Apply'
import * as I from 'fp-ts/Identity'
import { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { LanguageCode } from 'iso-639-1'
import { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { get } from 'spectacles-ts'
import textClipper from 'text-clipper'
import { match } from 'ts-pattern'
import { Uuid } from 'uuid-ts'
import { Html, html, plainText, rawHtml, sendHtml } from './html'
import { movedPermanently, notFound, serviceUnavailable } from './middleware'
import { page } from './page'
import { PreprintId } from './preprint-id'
import { preprintMatch, reviewMatch, writeReviewMatch } from './routes'
import { renderDate } from './time'

import PlainDate = Temporal.PlainDate

export type Preprint = {
  abstract?: {
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
  language?: LanguageCode
  text: Html
}

type RapidPrereview = {
  author: {
    name: string
    orcid?: Orcid
  }
  questions: {
    availableCode: 'yes' | 'unsure' | 'na' | 'no'
    availableData: 'yes' | 'unsure' | 'na' | 'no'
    coherent: 'yes' | 'unsure' | 'na' | 'no'
    ethics: 'yes' | 'unsure' | 'na' | 'no'
    future: 'yes' | 'unsure' | 'na' | 'no'
    limitations: 'yes' | 'unsure' | 'na' | 'no'
    methods: 'yes' | 'unsure' | 'na' | 'no'
    newData: 'yes' | 'unsure' | 'na' | 'no'
    novel: 'yes' | 'unsure' | 'na' | 'no'
    peerReview: 'yes' | 'unsure' | 'na' | 'no'
    recommend: 'yes' | 'unsure' | 'na' | 'no'
    reproducibility: 'yes' | 'unsure' | 'na' | 'no'
  }
}

export interface GetPreprintEnv {
  getPreprint: (doi: PreprintId['doi']) => TE.TaskEither<'not-found' | 'unavailable', Preprint>
}

export interface GetPreprintDoiFromUuidEnv {
  getPreprintDoiFromUuid: (uuid: Uuid) => TE.TaskEither<'not-found' | 'unavailable', PreprintId['doi']>
}

export interface GetPrereviewsEnv {
  getPrereviews: (id: PreprintId) => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

export interface GetRapidPrereviewsEnv {
  getRapidPrereviews: (id: PreprintId) => TE.TaskEither<'unavailable', ReadonlyArray<RapidPrereview>>
}

const sendPage = flow(
  fromReaderK(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const getPreprint = (doi: PreprintId['doi']) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprint }: GetPreprintEnv) => getPreprint(doi)))

const getPreprintDoiFromUuid = (uuid: Uuid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getPreprintDoiFromUuid }: GetPreprintDoiFromUuidEnv) => getPreprintDoiFromUuid(uuid)),
  )

const getPrereviews = (id: PreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereviews }: GetPrereviewsEnv) => getPrereviews(id)))

const getRapidPrereviews = (id: PreprintId) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getRapidPrereviews }: GetRapidPrereviewsEnv) => getRapidPrereviews(id)),
  )

export const preprint = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.chainReaderTaskEitherKW(preprint =>
    sequenceS(RTE.ApplyPar)({
      preprint: RTE.right<GetRapidPrereviewsEnv & GetPrereviewsEnv, never, Preprint>(preprint),
      rapidPrereviews: getRapidPrereviews(preprint.id),
      reviews: getPrereviews(preprint.id),
    }),
  ),
  RM.ichainW(sendPage),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => showFailureMessage)
      .exhaustive(),
  ),
)

export const redirectToPreprint = flow(
  RM.fromReaderTaskEitherK(getPreprintDoiFromUuid),
  RM.ichainMiddlewareK(doi => movedPermanently(format(preprintMatch.formatter, { doi }))),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
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
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to show the preprint and its PREreviews now.</p>

        <p>Please try again later.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}

function createPage({
  preprint,
  reviews,
  rapidPrereviews,
}: {
  preprint: Preprint
  reviews: ReadonlyArray<Prereview>
  rapidPrereviews: ReadonlyArray<RapidPrereview>
}) {
  return page({
    title: plainText`PREreviews of “${preprint.title.text}”`,
    content: html`
      <h1 class="visually-hidden">
        PREreviews of “<span lang="${preprint.title.language}" dir="${getLangDir(preprint.title.language)}"
          >${preprint.title.text}</span
        >”
      </h1>

      <aside id="preprint-details" tabindex="0" aria-label="Preprint details">
        <article aria-labelledby="preprint-title">
          <header>
            <h2 lang="${preprint.title.language}" dir="${getLangDir(preprint.title.language)}" id="preprint-title">
              ${preprint.title.text}
            </h2>

            <p class="byline">
              <span class="visually-hidden">Authored</span> by
              ${pipe(preprint.authors, RNEA.map(displayAuthor), formatList('en'))}
            </p>

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
                    .with('arxiv', () => 'arXiv')
                    .with('biorxiv', () => 'bioRxiv')
                    .with('chemrxiv', () => 'ChemRxiv')
                    .with('eartharxiv', () => 'EarthArXiv')
                    .with('ecoevorxiv', () => 'EcoEvoRxiv')
                    .with('edarxiv', () => 'EdArXiv')
                    .with('engrxiv', () => 'engrXiv')
                    .with('medrxiv', () => 'medRxiv')
                    .with('metaarxiv', () => 'MetaArXiv')
                    .with('osf', () => 'OSF Preprints')
                    .with('psyarxiv', () => 'PsyArXiv')
                    .with('research-square', () => 'Research Square')
                    .with('scielo', () => 'SciELO Preprints')
                    .with('science-open', () => 'ScienceOpen Preprints')
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

          ${preprint.abstract
            ? html`
                <h3>Abstract</h3>

                <div lang="${preprint.abstract.language}" dir="${getLangDir(preprint.abstract.language)}">
                  ${preprint.abstract.text}
                </div>
              `
            : ''}

          <a href="${preprint.url.href}" class="button">Read the preprint</a>
        </article>
      </aside>

      <main id="prereviews">
        ${pipe(
          rapidPrereviews,
          RA.matchW(() => '', showRapidPrereviews),
        )}

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
      <article aria-labelledby="prereview-${review.id}-title">
        <header>
          <h3 class="visually-hidden" id="prereview-${review.id}-title">
            PREreview by ${review.authors[0].name} ${review.authors.length > 1 ? 'et al.' : ''}
          </h3>

          <p class="byline">
            <span class="visually-hidden">Authored</span> by
            ${pipe(review.authors, RNEA.map(get('name')), formatList('en'))}
          </p>
        </header>

        <div ${review.language ? html`lang="${review.language}" dir="${getLangDir(review.language)}"` : ''}>
          ${rawHtml(textClipper(review.text.toString(), 300, { html: true, maxLines: 5 }))}
        </div>

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

function showRapidPrereviews(rapidPrereviews: ReadonlyNonEmptyArray<RapidPrereview>): Html {
  return html`
    <h2>${rapidPrereviews.length} Rapid PREreview${rapidPrereviews.length !== 1 ? 's' : ''}</h2>

    <p class="byline">
      <span class="visually-hidden">Authored</span> by
      ${pipe(rapidPrereviews, RNEA.map(flow(get('author'), displayAuthor)), formatList('en'))}
    </p>

    <details>
      <summary>Where can I fill out a Rapid PREreview?</summary>

      <div>
        <p>
          We haven’t yet added the form to the new version of PREreview as we’re looking to improve how Rapid PREreviews
          work; if you could help, please <a href="mailto:contact@prereview.org">get in touch</a>.
        </p>
      </div>
    </details>

    <div role="region" aria-labelledby="rapid-prereviews-caption" tabindex="0">
      <table>
        <caption id="rapid-prereviews-caption" class="visually-hidden">
          Aggregated Rapid PREreviews
        </caption>
        <thead>
          <tr>
            <th scope="col"><span class="visually-hidden">Question</span></th>
            <th scope="col">Yes</th>
            <th scope="col">Unsure</th>
            <th scope="col">N/A</th>
            <th scope="col">No</th>
          </tr>
        </thead>
        <tbody>
          ${pipe(
            [
              'novel',
              'future',
              'reproducibility',
              'methods',
              'coherent',
              'limitations',
              'ethics',
              'newData',
              'availableData',
              'availableCode',
              'recommend',
              'peerReview',
            ] as ReadonlyNonEmptyArray<keyof RapidPrereview['questions']>,
            RNEA.map(
              flow(
                I.bindTo('question'),
                I.bind('answers', ({ question }) => ({
                  yes: countRapidPrereviewResponses(rapidPrereviews, question, 'yes'),
                  unsure: countRapidPrereviewResponses(rapidPrereviews, question, 'unsure'),
                  na: countRapidPrereviewResponses(rapidPrereviews, question, 'na'),
                  no: countRapidPrereviewResponses(rapidPrereviews, question, 'no'),
                })),
              ),
            ),
            RNEA.map(
              ({ question, answers }) => html`
                <tr>
                  <th scope="row">${displayRapidPrereviewQuestion(question)}</th>
                  <td>
                    ${(answers.yes / rapidPrereviews.length).toLocaleString('en', {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td>
                    ${(answers.unsure / rapidPrereviews.length).toLocaleString('en', {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td>
                    ${(answers.na / rapidPrereviews.length).toLocaleString('en', {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td>
                    ${(answers.no / rapidPrereviews.length).toLocaleString('en', {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                </tr>
              `,
            ),
          )}
        </tbody>
      </table>
    </div>
  `
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="https://orcid.org/${orcid}" class="orcid">${name}</a>`
  }

  return name
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}

function displayRapidPrereviewQuestion(question: keyof RapidPrereview['questions']): Html {
  return match(question)
    .with('availableCode', () => html`Is the code used in the manuscript available?`)
    .with('availableData', () => html`Are the data used in the manuscript available?`)
    .with('coherent', () => html`Are the principal conclusions supported by the data and analysis?`)
    .with('ethics', () => html`Have the authors adequately discussed ethical concerns?`)
    .with('future', () => html`Are the results likely to lead to future research?`)
    .with('limitations', () => html`Does the manuscript discuss limitations?`)
    .with('methods', () => html`Are the methods and statistics appropriate for the analysis?`)
    .with('newData', () => html`Does the manuscript include new data?`)
    .with('novel', () => html`Are the findings novel?`)
    .with('peerReview', () => html`Do you recommend this manuscript for peer review?`)
    .with('recommend', () => html`Would you recommend this manuscript to others?`)
    .with('reproducibility', () => html`Is sufficient detail provided to allow reproduction of the study?`)
    .exhaustive()
}

function countRapidPrereviewResponses<Q extends keyof RapidPrereview['questions']>(
  rapidPrereviews: ReadonlyArray<RapidPrereview>,
  question: Q,
  response: RapidPrereview['questions'][Q],
) {
  return rapidPrereviews.reduce(
    (total, rapidPrereview) => total + (rapidPrereview.questions[question] === response ? 1 : 0),
    0,
  )
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
