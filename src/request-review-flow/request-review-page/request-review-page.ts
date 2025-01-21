import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { html, plainText } from '../../html.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import { preprintReviewsMatch, requestReviewMatch, requestReviewStartMatch } from '../../routes.js'
import type { User } from '../../user.js'

export const requestReviewPage = ({ preprint, user }: { preprint: PreprintTitle; user?: User }) =>
  StreamlinePageResponse({
    title: plainText`Request a PREreview`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back"
        ><span>Back to preprint</span></a
      >
    `,
    main: html`
      <h1>Request a PREreview</h1>

      <p>
        You can request a PREreview of
        <cite dir="${rtlDetect.getLangDir(preprint.language)}" lang="${preprint.language}">${preprint.title}</cite>. A
        PREreview is a review of a preprint and can vary from a few sentences to a lengthy report, similar to a
        journal-organized peer-review report.
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
                  An <a href="https://orcid.org/"><dfn>ORCID&nbsp;iD</dfn></a> is a unique identifier that distinguishes
                  you from everyone with the same or similar name.
                </p>
              </div>
            </details>
          `}

      <a href="${format(requestReviewStartMatch.formatter, { id: preprint.id })}" role="button" draggable="false"
        >Start now</a
      >
    `,
    canonical: format(requestReviewMatch.formatter, { id: preprint.id }),
    allowRobots: false,
  })
