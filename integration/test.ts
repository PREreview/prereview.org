import { Fixtures, PlaywrightTestArgs, PlaywrightTestOptions, test as baseTest } from '@playwright/test'
import { SystemClock } from 'clock-ts'
import fetchMock, { FetchMockSandbox } from 'fetch-mock'
import * as fs from 'fs/promises'
import { Server } from 'http'
import Keyv from 'keyv'
import * as L from 'logger-fp-ts'
import { app } from '../src/app'

import Logger = L.Logger
import LogEntry = L.LogEntry

export { expect } from '@playwright/test'

type AppFixtures = {
  fetch: FetchMockSandbox
  logger: Logger
  port: number
  server: Server
}

const appFixtures: Fixtures<AppFixtures, Record<never, never>, PlaywrightTestArgs & PlaywrightTestOptions> = {
  baseURL: async ({ server }, use) => {
    const address = server.address()

    if (typeof address !== 'object' || address === null) {
      throw new Error('Unable to find a port')
    }

    await use(`http://localhost:${address.port}`)
  },
  fetch: async ({}, use) => {
    await use(fetchMock.sandbox())
  },
  logger: async ({}, use, testInfo) => {
    const logs: Array<LogEntry> = []
    const logger: Logger = entry => () => logs.push(entry)

    await use(logger)

    await fs.writeFile(testInfo.outputPath('server.log'), logs.map(L.ShowLogEntry.show).join('\n'))
  },
  port: async ({}, use, workerInfo) => {
    await use(8000 + workerInfo.workerIndex)
  },
  server: async ({ fetch, logger, port }, use) => {
    const server = app({
      clock: SystemClock,
      fetch,
      formStore: new Keyv(),
      logger,
      oauth: {
        authorizeUrl: new URL('https://oauth.mocklab.io/oauth/authorize'),
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: new URL(`http://localhost:${port}/orcid`),
        tokenUrl: new URL('http://orcid.test/token'),
      },
      publicUrl: new URL(`http://localhost:${port}`),
      secret: '',
      sessionStore: new Keyv(),
      zenodoApiKey: '',
      zenodoUrl: new URL('http://zenodo.test/'),
    })

    server.listen(port)

    await use(server)

    server.close()
  },
}

export const test = baseTest.extend(appFixtures)
