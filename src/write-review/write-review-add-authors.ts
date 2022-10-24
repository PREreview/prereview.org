import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { canAddAuthors } from '../feature-flags'
import { MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import {
  writeReviewAddAuthorMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewChangeAuthorMatch,
  writeReviewMatch,
  writeReviewRemoveAuthorMatch,
} from '../routes'
import { NonEmptyString } from '../string'
import { User, getUserFromSession } from '../user'
import { Form, getForm, saveForm, showNextForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewAddAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW(
        'canAddAuthors',
        fromReaderK(({ user }) => canAddAuthors(user)),
      ),
      RM.bindW(
        'form',
        RM.fromReaderTaskK(({ user }) => getForm(user.orcid, preprint.doi)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with(
            { canAddAuthors: true, form: { moreAuthors: 'yes', otherAuthors: P.optional([]) } },
            fromMiddlewareK(() => seeOther(format(writeReviewAddAuthorMatch.formatter, { doi: preprint.doi }))),
          )
          .with({ canAddAuthors: true, form: { moreAuthors: 'yes' }, method: 'POST' }, handleAddAuthorsForm)
          .with({ canAddAuthors: true, form: { moreAuthors: 'yes' } }, showAddAuthorsForm)
          .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, handleCannotAddAuthorsForm)
          .with({ form: { moreAuthors: 'yes' } }, showCannotAddAuthorsForm)
          .otherwise(() => notFound),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showAddAuthorsForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) =>
    addAuthorsForm(preprint, form.otherAuthors ?? [], { anotherAuthor: E.right(undefined) }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAddAuthorsErrorForm = (preprint: Preprint, form: Form) =>
  flow(
    fromReaderK((thisForm: AddAuthorsForm) => addAuthorsForm(preprint, form.otherAuthors ?? [], thisForm)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const showCannotAddAuthorsForm = flow(
  fromReaderK(({ preprint }: { preprint: Preprint }) => cannotAddAuthorsForm(preprint)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const handleAddAuthorsForm = ({ form, preprint }: { form: Form; preprint: Preprint }) =>
  pipe(
    RM.decodeBody(body => E.right({ anotherAuthor: pipe(AnotherAuthorFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('anotherAuthor', fields.anotherAuthor),
        E.mapLeft(() => fields),
      ),
    ),
    RM.ichainMiddlewareKW(state =>
      match(state)
        .with({ anotherAuthor: 'yes' }, () =>
          seeOther(format(writeReviewAddAuthorMatch.formatter, { doi: preprint.doi })),
        )
        .with({ anotherAuthor: 'no' }, () => showNextForm(preprint.doi)(form))
        .exhaustive(),
    ),
    RM.orElseW(showAddAuthorsErrorForm(preprint, form)),
  )

const handleCannotAddAuthorsForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.of({ otherAuthors: [] }),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
    RM.orElseW(() => showCannotAddAuthorsForm({ preprint })),
  )

const AnotherAuthorFieldD = pipe(
  D.struct({
    anotherAuthor: D.literal('yes', 'no'),
  }),
  D.map(get('anotherAuthor')),
)

type AddAuthorsForm = {
  readonly anotherAuthor: E.Either<MissingE, 'yes' | 'no' | undefined>
}

function addAuthorsForm(preprint: Preprint, authors: ReadonlyArray<{ name: NonEmptyString }>, form: AddAuthorsForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Do you need to add another author? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.anotherAuthor)
                      ? html`
                          <li>
                            <a href="#another-author-no">
                              ${match(form.anotherAuthor.left)
                                .with({ _tag: 'MissingE' }, () => 'Select yes if you need to add another author')
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <h1>You have added ${authors.length} other author${authors.length !== 1 ? 's' : ''}</h1>

          <ol class="summary-list">
            ${authors.map(
              ({ name }, index) => html`
                <li>
                  <span>${name}</span>
                  <a
                    href="${format(writeReviewChangeAuthorMatch.formatter, {
                      doi: preprint.doi,
                      index,
                    })}"
                    >Change<span class="visually-hidden"> ${name}</span></a
                  >
                  <a
                    href="${format(writeReviewRemoveAuthorMatch.formatter, {
                      doi: preprint.doi,
                      index,
                    })}"
                    >Remove<span class="visually-hidden"> ${name}</span></a
                  >
                </li>
              `,
            )}
          </ol>

          <div ${rawHtml(E.isLeft(form.anotherAuthor) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.anotherAuthor) ? 'aria-invalid="true" aria-errormessage="another-author-error"' : '',
              )}
            >
              <legend>
                <h2>Do you need to add another&nbsp;author?</h2>
              </legend>

              ${E.isLeft(form.anotherAuthor)
                ? html`
                    <div class="error-message" id="another-author-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.anotherAuthor.left)
                        .with({ _tag: 'MissingE' }, () => 'Select yes if you need to add another author')
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="anotherAuthor"
                      id="another-author-no"
                      type="radio"
                      value="no"
                      ${match(form.anotherAuthor)
                        .with(E.right('no' as const), () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>No</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="anotherAuthor"
                      type="radio"
                      value="yes"
                      ${match(form.anotherAuthor)
                        .with(E.right('yes' as const), () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Yes</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
  })
}

function cannotAddAuthorsForm(preprint: Preprint) {
  return page({
    title: plainText`Add more authors – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })}" novalidate>
          <h1>Add more authors</h1>

          <p>Unfortunately, we’re unable to add more authors now.</p>

          <p>Once you have posted your PREreview, please let us know their details, and we’ll add them.</p>

          <p>We’ll remind you to do this.</p>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
  })
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
