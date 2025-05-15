import * as M from 'hyper-ts/lib/Middleware.js'

export const getMethod = M.gets(c => c.getMethod())
