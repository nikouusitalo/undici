const net = require('node:net')
const { test } = require('tap')
const { Client, errors } = require('..')

test('https://github.com/mcollina/undici/issues/268', (t) => {
  t.plan(2)

  const server = net.createServer(socket => {
    socket.write('HTTP/1.1 200 OK\r\n')
    socket.write('Transfer-Encoding: chunked\r\n\r\n')
    setTimeout(() => {
      socket.write('1\r\n')
      socket.write('\n\r\n')
      setTimeout(() => {
        socket.write('1\r\n')
        socket.write('\n\r\n')
      }, 500)
    }, 500)
  })
  t.teardown(server.close.bind(server))

  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`)
    t.teardown(client.destroy.bind(client))

    client.request({
      method: 'GET',
      path: '/nxt/_changes?feed=continuous&heartbeat=5000',
      headersTimeout: 1e3
    }, (err, data) => {
      t.error(err)
      data.body
        .resume()
      setTimeout(() => {
        t.ok(true, 'pass')
        data.body.on('error', () => {})
      }, 2e3)
    })
  })
})

test('parser fail', (t) => {
  t.plan(2)

  const server = net.createServer(socket => {
    socket.write('HTT/1.1 200 OK\r\n')
  })
  t.teardown(server.close.bind(server))

  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`)
    t.teardown(client.destroy.bind(client))

    client.request({
      method: 'GET',
      path: '/'
    }, (err, data) => {
      t.ok(err)
      t.ok(err instanceof errors.HTTPParserError)
    })
  })
})

test('split header field', (t) => {
  t.plan(2)

  const server = net.createServer(socket => {
    socket.write('HTTP/1.1 200 OK\r\nA')
    setTimeout(() => {
      socket.write('SD: asd,asd\r\n\r\n\r\n')
    }, 100)
  })
  t.teardown(server.close.bind(server))

  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`)
    t.teardown(client.destroy.bind(client))

    client.request({
      method: 'GET',
      path: '/'
    }, (err, data) => {
      t.error(err)
      t.equal(data.headers.asd, 'asd,asd')
      data.body.destroy().on('error', () => {})
    })
  })
})

test('split header value', (t) => {
  t.plan(2)

  const server = net.createServer(socket => {
    socket.write('HTTP/1.1 200 OK\r\nASD: asd')
    setTimeout(() => {
      socket.write(',asd\r\n\r\n\r\n')
    }, 100)
  })
  t.teardown(server.close.bind(server))

  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`)
    t.teardown(client.destroy.bind(client))

    client.request({
      method: 'GET',
      path: '/'
    }, (err, data) => {
      t.error(err)
      t.equal(data.headers.asd, 'asd,asd')
      data.body.destroy().on('error', () => {})
    })
  })
})
