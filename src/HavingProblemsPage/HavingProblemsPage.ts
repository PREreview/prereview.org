import { StatusCodes } from 'http-status-codes'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'

export const createHavingProblemsPage = (): PageResponse =>
  PageResponse({
    status: StatusCodes.SERVICE_UNAVAILABLE,
    title: plainText`Sorry, we’re having problems`,
    main: html`
      <h1>Sorry, we’re having problems</h1>

      <p>Please try again later.</p>
    `,
  })
