import http from 'http'
import handler from 'serve-handler'

const server = http.createServer(async (request, response) => {
  await handler(request, response, { public: 'static' })
})

server.listen(3000)
