import { isDoi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as R from 'fp-ts/Reader'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { type CanRapidReviewEnv, canRapidReview } from '../feature-flags'
import { type Html, fixHeadingLevels, html, plainText, rawHtml, sendHtml } from '../html'
import { addCanonicalLinkHeader, notFound, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import { type Preprint, getPreprint } from '../preprint'
import type { PublicUrlEnv } from '../public-url'
import { preprintReviewsMatch, writeReviewMatch, writeReviewStartMatch } from '../routes'
import { renderDate } from '../time'
import { type GetUserEnv, type User, getUser } from '../user'
import { getForm } from './form'

export const writeReview = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      getUser,
      RM.bindTo('user'),
      RM.bindW(
        'form',
        flow(
          RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
          RM.map(E.right),
          RM.orElseW(error =>
            match(error).with('no-form', flow(E.left, RM.right)).with('form-unavailable', RM.left).exhaustive(),
          ),
        ),
      ),
      RM.ichainW(state =>
        match(state)
          .with(
            { form: P.when(E.isRight) },
            fromMiddlewareK(() => seeOther(format(writeReviewStartMatch.formatter, { id: preprint.id }))),
          )
          .with({ form: P.when(E.isLeft) }, ({ user }) => showStartPage(preprint, user))
          .exhaustive(),
      ),
      RM.orElseW(error =>
        match(error)
          .returnType<
            RM.ReaderMiddleware<
              CanRapidReviewEnv & FathomEnv & GetUserEnv & PhaseEnv & PublicUrlEnv,
              StatusOpen,
              ResponseEnded,
              never,
              void
            >
          >()
          .with('no-session', () => showStartPage(preprint))
          .with('form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showStartPage = (preprint: Preprint, user?: User) =>
  pipe(
    RM.rightReader(startPage(preprint, user)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirstW(() => addCanonicalLinkHeader(writeReviewMatch.formatter, { id: preprint.id })),
    RM.ichainMiddlewareK(sendHtml),
  )

function startPage(preprint: Preprint, user?: User) {
  return pipe(
    user ? canRapidReview(user) : R.of(false),
    R.chainW(canRapidReview =>
      page({
        title: plainText`Write a PREreview`,
        content: html`
          <nav>
            <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
          </nav>

          <main id="main-content">
            <h1>Write a PREreview</h1>

            <article class="preview" tabindex="0" aria-labelledby="preprint-title">
              <header>
                <h2 lang="${preprint.title.language}" dir="${getLangDir(preprint.title.language)}" id="preprint-title">
                  ${preprint.title.text}
                </h2>

                <div class="byline">
                  <span class="visually-hidden">Authored</span> by
                  ${pipe(
                    preprint.authors,
                    RNEA.map(author => author.name),
                    formatList('en'),
                  )}
                </div>

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
                        .with('authorea', () => 'Authorea')
                        .with('biorxiv', () => 'bioRxiv')
                        .with('chemrxiv', () => 'ChemRxiv')
                        .with('eartharxiv', () => 'EarthArXiv')
                        .with('ecoevorxiv', () => 'EcoEvoRxiv')
                        .with('edarxiv', () => 'EdArXiv')
                        .with('engrxiv', () => 'engrXiv')
                        .with('medrxiv', () => 'medRxiv')
                        .with('metaarxiv', () => 'MetaArXiv')
                        .with('osf', () => 'OSF Preprints')
                        .with('philsci', () => 'PhilSci-Archive')
                        .with('preprints.org', () => 'Preprints.org')
                        .with('psyarxiv', () => 'PsyArXiv')
                        .with('research-square', () => 'Research Square')
                        .with('scielo', () => 'SciELO Preprints')
                        .with('science-open', () => 'ScienceOpen Preprints')
                        .with('socarxiv', () => 'SocArXiv')
                        .with('zenodo', () => 'Zenodo')
                        .exhaustive()}
                    </dd>
                  </div>
                  ${match(preprint.id)
                    .with(
                      { type: 'philsci' },
                      id => html`
                        <div>
                          <dt>Item ID</dt>
                          <dd>${id.value}</dd>
                        </div>
                      `,
                    )
                    .with(
                      { value: P.when(isDoi) },
                      id => html`
                        <div>
                          <dt>DOI</dt>
                          <dd class="doi" translate="no">${id.value}</dd>
                        </div>
                      `,
                    )
                    .exhaustive()}
                </dl>
              </header>

              ${preprint.abstract
                ? html`
                    <div lang="${preprint.abstract.language}" dir="${getLangDir(preprint.abstract.language)}">
                      ${fixHeadingLevels(2, preprint.abstract.text)}
                    </div>
                  `
                : ''}
            </article>

            <p>
              You can write a PREreview of
              <cite lang="${preprint.title.language}" dir="${getLangDir(preprint.title.language)}"
                >${preprint.title.text}</cite
              >. A PREreview is a ${!canRapidReview ? 'free-text' : ''} review of a preprint and can vary from a few
              sentences to a lengthy report, similar to a journal-organized peer-review report.
            </p>

            ${user
              ? ''
              : html`
                  <h2>Before you start</h2>

                  <p>We will ask you to log in with your ORCID&nbsp;iD. If you don’t have an iD, you can create one.</p>

                  <details>
                    <summary><span>What is an ORCID&nbsp;iD?</span></summary>

                    <div>
                      <p>
                        An <a href="https://orcid.org/"><dfn>ORCID&nbsp;iD</dfn></a> is a unique identifier that
                        distinguishes you from everyone with the same or similar name.
                      </p>
                    </div>
                  </details>
                `}

            <a href="${format(writeReviewStartMatch.formatter, { id: preprint.id })}" role="button" draggable="false"
              >Start now</a
            >
          </main>
        `,
        skipLinks: [[html`Skip to main content`, '#main-content']],
        type: 'streamline',
        user,
      }),
    ),
  )
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

// https://github.com/DenisFrezzato/hyper-ts/pull/83
const fromMiddlewareK =
  <R, A extends ReadonlyArray<unknown>, B, I, O, E>(
    f: (...a: A) => M.Middleware<I, O, E, B>,
  ): ((...a: A) => RM.ReaderMiddleware<R, I, O, E, B>) =>
  (...a) =>
    RM.fromMiddleware(f(...a))
