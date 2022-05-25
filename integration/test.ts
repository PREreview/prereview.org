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
  server: async ({ fetch, logger }, use) => {
    const server = app({
      clock: SystemClock,
      fetch,
      logger,
      secret: '',
      sessionStore: new Keyv(),
      zenodoApiKey: '',
      zenodoUrl: new URL('http://zenodo.test/'),
    })

    server.listen()

    await use(server)

    server.close()
  },
}

export const test = baseTest.extend(appFixtures)
