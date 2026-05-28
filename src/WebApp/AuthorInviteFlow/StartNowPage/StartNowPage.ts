import { html, plainText } from '../../../html.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'

export const renderStartNowPage = () =>
  PageResponse({
    status: StatusCodes.OK,
    title: plainText('Be listed as an author'),
    main: html` <h1>Be listed as an author</h1> `,
  })
