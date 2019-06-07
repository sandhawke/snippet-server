const test = require('tape')
const main = require('.')
const request = require('request-promise-native')
const WebSocket = require('isomorphic-ws')

const now = Date.now()
const run = async () => {
  const server = await main.run({port: 0, dbname: 'test/_db-' + now})
  return server
}
test('start and stop', async (t) => {
  const server = await run()
  const ping = await request(server.siteurl)
  t.ok(ping.match(/installation/))
  await server.stop()
  t.pass()
  t.end()
})

test('db', async (t) => {
  const server = await run()
  await server.stop()
  t.pass()
  t.end()
})

test('db2', async (t) => {
  const server = await run()
  await server.stop()
  t.pass()
  t.end()
})

test('basic post', async (t) => {
  const server = await run()
  const form = {
    id: '001',
    op: 'create',
    text: 'Hello, World!',
    pw: 'pw1'
  }
  const resp = await request.post(
    { uri: server.siteurl, form, followAllRedirects: true })
  t.equal(form.text, resp)
  await server.stop()
  t.pass()
  t.end()
})

test.only('websocket', async(t) => {
  const server = await run()
  const ws = new WebSocket(server.siteurl.replace('http', 'ws'))
  const madeURLs = []
  const gotURLs = []
  ws.onopen = async () => {
    ws.send('send all new version URLs')
    for (let n = 1; n < 5; n++) {
      const form = {
        id: '' + n,
        op: 'create',
        text: 'Hello, World!',
        pw: 'pw1'
      }
      madeURLs.push(server.siteurl + '/' + form.id + '?version=1')
      const resp = await request.post(
        { uri: server.siteurl, form, followAllRedirects: true })
      t.equal(form.text, resp)
    }
    await server.stop()
  }
  ws.onmessage = m => {
    if (m.data.startsWith('http')) {
      gotURLs.push(m.data)
    }
  }
  ws.onclose = () => {
    t.deepEqual(madeURLs, gotURLs)
    t.pass()
    t.end()
  }
})
