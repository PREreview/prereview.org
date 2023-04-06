import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as I from 'fp-ts/Identity'
import { Option } from 'fp-ts/Option'
import { Reader } from 'fp-ts/Reader'
import { Lazy, flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import { getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import {
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
} from '../routes'
import { User, getUserFromSession } from '../user'
import { Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.doi)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handleAuthorsForm).otherwise(showAuthorsForm)),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
          )
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

const showAuthorsForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) =>
    authorsForm(preprint, {
      moreAuthors: E.right(form.moreAuthors),
      moreAuthorsApproved: E.right(form.moreAuthorsApproved),
    }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAuthorsErrorForm = (preprint: Preprint) =>
  flow(
    fromReaderK((form: AuthorsForm) => authorsForm(preprint, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleAuthorsForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(body =>
      pipe(
        I.Do,
        I.let('moreAuthors', () => pipe(MoreAuthorsFieldD.decode(body), E.mapLeft(missingE))),
        I.let('moreAuthorsApproved', ({ moreAuthors }) =>
          match(moreAuthors)
            .with({ right: 'yes' }, () => pipe(MoreAuthorsApprovedFieldD.decode(body), E.mapLeft(missingE)))
            .otherwise(() => E.right(undefined)),
        ),
        E.right,
      ),
    ),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('moreAuthors', fields.moreAuthors),
        E.apS('moreAuthorsApproved', fields.moreAuthorsApproved),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.doi)),
    RM.bindTo('form'),
    RM.ichainMiddlewareKW(state =>
      match(state)
        .with({ form: { moreAuthors: 'yes' } }, () =>
          seeOther(format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })),
        )
        .otherwise(flow(({ form }) => form, redirectToNextForm(preprint.doi))),
    ),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ moreAuthors: P.any }, showAuthorsErrorForm(preprint))
        .exhaustive(),
    ),
  )

const MoreAuthorsFieldD = pipe(
  D.struct({
    moreAuthors: D.literal('yes', 'yes-private', 'no'),
  }),
  D.map(get('moreAuthors')),
)

const MoreAuthorsApprovedFieldD = pipe(
  D.struct({
    moreAuthorsApproved: D.literal('yes'),
  }),
  D.map(get('moreAuthorsApproved')),
)

type AuthorsForm = {
  readonly moreAuthors: E.Either<MissingE, 'yes' | 'yes-private' | 'no' | undefined>
  readonly moreAuthorsApproved: E.Either<MissingE, 'yes' | undefined>
}

function authorsForm(preprint: Preprint, form: AuthorsForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Did you review this preprint with anyone else? – PREreview of “${
      preprint.title
    }”`,
    content: html`
      <nav>
        <a href="${format(writeReviewPersonaMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.moreAuthors)
                      ? html`
                          <li>
                            <a href="#more-authors-no">
                              ${match(form.moreAuthors.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select yes if you reviewed the preprint with someone else',
                                )
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                    ${E.isLeft(form.moreAuthorsApproved)
                      ? html`
                          <li>
                            <a href="#more-authors-approved-yes">
                              ${match(form.moreAuthorsApproved.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Confirm that the other authors have read and approved the PREreview',
                                )
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.moreAuthors) ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                aria-describedby="more-authors-tip"
                ${rawHtml(
                  E.isLeft(form.moreAuthors) ? 'aria-invalid="true" aria-errormessage="more-authors-error"' : '',
                )}
              >
                <legend>
                  <h1>Did you review this preprint with anyone&nbsp;else?</h1>
                </legend>

                <p id="more-authors-tip" role="note">
                  This can include people who contributed to the discussion or wrote the review.
                </p>

                ${E.isLeft(form.moreAuthors)
                  ? html`
                      <div class="error-message" id="more-authors-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.moreAuthors.left)
                          .with({ _tag: 'MissingE' }, () => 'Select yes if you reviewed the preprint with someone else')
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="moreAuthors"
                        id="more-authors-no"
                        type="radio"
                        value="no"
                        ${match(form.moreAuthors)
                          .with({ right: 'no' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>No, I reviewed it alone</span>
                    </label>
                  </li>
                  <li>
                    <label>
                      <input
                        name="moreAuthors"
                        type="radio"
                        value="yes-private"
                        ${match(form.moreAuthors)
                          .with({ right: 'yes-private' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Yes, but they don’t want to be listed as authors</span>
                    </label>
                  </li>
                  <li>
                    <label>
                      <input
                        name="moreAuthors"
                        type="radio"
                        value="yes"
                        aria-controls="more-authors-yes-control"
                        ${match(form.moreAuthors)
                          .with({ right: 'yes' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Yes, and some or all want to be listed as authors</span>
                    </label>
                    <div class="conditional" id="more-authors-yes-control">
                      <div ${rawHtml(E.isLeft(form.moreAuthorsApproved) ? 'class="error"' : '')}>
                        ${E.isLeft(form.moreAuthorsApproved)
                          ? html`
                              <div class="error-message" id="more-authors-approved-error">
                                <span class="visually-hidden">Error:</span>
                                ${match(form.moreAuthorsApproved.left)
                                  .with(
                                    { _tag: 'MissingE' },
                                    () => 'Confirm that the other authors have read and approved the PREreview',
                                  )
                                  .exhaustive()}
                              </div>
                            `
                          : ''}

                        <label>
                          <input
                            name="moreAuthorsApproved"
                            id="more-authors-approved-yes"
                            type="checkbox"
                            value="yes"
                            ${match(form.moreAuthorsApproved)
                              .with({ right: 'yes' }, () => 'checked')
                              .with({ right: undefined }, () => '')
                              .with(
                                { left: { _tag: 'MissingE' } },
                                () => html`aria-invalid="true" aria-errormessage="more-authors-approved-error"`,
                              )
                              .exhaustive()}
                          />
                          <span>They have read and approved the PREreview</span>
                        </label>
                      </div>
                    </div>
                  </li>
                </ol>
              </fieldset>
            </conditional-inputs>
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/80
function chainOptionKW<E2>(
  onNone: Lazy<E2>,
): <A, B>(
  f: (a: A) => Option<B>,
) => <R, I, E1>(ma: RM.ReaderMiddleware<R, I, I, E1, A>) => RM.ReaderMiddleware<R, I, I, E1 | E2, B> {
  return f => RM.ichainMiddlewareKW((...a) => M.fromOption(onNone)(f(...a)))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/83
const fromMiddlewareK =
  <R, A extends ReadonlyArray<unknown>, B, I, O, E>(
    f: (...a: A) => M.Middleware<I, O, E, B>,
  ): ((...a: A) => RM.ReaderMiddleware<R, I, O, E, B>) =>
  (...a) =>
    RM.fromMiddleware(f(...a))

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
