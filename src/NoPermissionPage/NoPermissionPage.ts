import { StatusCodes } from 'http-status-codes'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'

export const createNoPermissionPage = (): PageResponse =>
  PageResponse({
    status: StatusCodes.FORBIDDEN,
    title: plainText`You do not have permission to view this page`,
    main: html`
      <h1>You do not have permission to view this page</h1>

      <p>If you think you should have access, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
    `,
  })
