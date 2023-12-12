import { isDoi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../html'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { type GetPreprintEnv, type Preprint, getPreprint } from '../preprint'
import { PageResponse, RedirectResponse, StreamlinePageResponse } from '../response'
import { preprintReviewsMatch, writeReviewMatch, writeReviewStartMatch } from '../routes'
import { renderDate } from '../time'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import type { User } from '../user'
import { type FormStoreEnv, getForm } from './form'
import { ensureUserIsNotAnAuthor } from './user-is-author'

export const writeReview = ({
  id,
  user,
}: {
  id: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<GetPreprintEnv & FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse> =>
  pipe(
    getPreprint(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS(
            'user',
            pipe(RTE.fromNullable('no-session' as const)(user), RTE.chainEitherKW(ensureUserIsNotAnAuthor(preprint))),
          ),
          RTE.bindW(
            'form',
            flow(
              ({ user }) => getForm(user.orcid, preprint.id),
              RTE.map(E.right),
              RTE.orElseW(error =>
                match(error).with('no-form', flow(E.left, RTE.right)).with('form-unavailable', RTE.left).exhaustive(),
              ),
            ),
          ),
          RTE.matchW(
            error =>
              match(error)
                .with({ type: 'is-author' }, () => ownPreprintPage(preprint))
                .with('no-session', () => startPage(preprint))
                .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage)
                .exhaustive(),
            state =>
              match(state)
                .with({ form: P.when(E.isRight) }, () =>
                  RedirectResponse({ location: format(writeReviewStartMatch.formatter, { id: preprint.id }) }),
                )
                .with({ form: P.when(E.isLeft) }, ({ user }) => startPage(preprint, user))
                .exhaustive(),
          ),
        ),
    ),
  )

function startPage(preprint: Preprint, user?: User) {
  return StreamlinePageResponse({
    title: plainText`Write a PREreview`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
    `,
    main: html`
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
                  .with('osf-preprints', () => 'OSF Preprints')
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

        ${
          preprint.abstract
            ? html`
                <div lang="${preprint.abstract.language}" dir="${getLangDir(preprint.abstract.language)}">
                  ${fixHeadingLevels(2, preprint.abstract.text)}
                </div>
              `
            : ''
        }
      </article>

      <p>
        You can write a PREreview of
        <cite lang="${preprint.title.language}" dir="${getLangDir(preprint.title.language)}"
        >${preprint.title.text}</cite
        >. A PREreview is a review of a preprint and can vary from a few sentences to a lengthy report, similar to a
        journal-organized peer-review report.
      </p>

      ${
        user
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
            `
      }

      <a href="${format(writeReviewStartMatch.formatter, { id: preprint.id })}" role="button" draggable="false"
      >Start now</a
      >
      </main>
    `,
    canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
  })
}

function ownPreprintPage(preprint: Preprint) {
  return PageResponse({
    status: Status.Forbidden,
    title: plainText`Sorry, you can’t review your own preprint`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
    `,
    main: html`
      <h1>Sorry, you can’t review your own preprint</h1>

      <p>If you’re not an author, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
    `,
    canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
  })
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
