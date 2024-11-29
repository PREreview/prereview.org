import { StatusCodes } from 'http-status-codes'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'

export const createPageNotFound = (): PageResponse =>
  PageResponse({
    status: StatusCodes.NOT_FOUND,
    title: plainText`Page not found`,
    main: html`
      <h1>Page not found</h1>

      <p>If you typed the web address, check it is correct.</p>

      <p>If you pasted the web address, check you copied the entire address.</p>

      <p>
        If the web address is correct or you selected a link or button, please
        <a href="mailto:help@prereview.org">get in touch</a>.
      </p>
    `,
  })
