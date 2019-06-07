// This has a lot of code in common with flextag-relay, stuff that
// should perhaps be factored out into a flextag-server or something

const WebSocket = require('ws')
const bodyParser = require('body-parser')
const cors = require('cors')
const AppMgr = require('appmgr')
const EventEmitter = require('eventemitter3')
const psdad = require('psdad.js')
const restful = require('./restful')
const squareQuotes = require('square-quotes')
const dbmodule = require('./db')

const talkAPI = require('./talkAPI')
const apis = [ talkAPI ] 

const run = async (config = {}) => {
  const db = await dbmodule.start(config.dbname || 'pages')

  const appmgr = new AppMgr(config)
  appmgr.app.use(cors())
  await appmgr.start()
  const wss = new WebSocket.Server({ server: appmgr.server });
  console.log(`Try:
firefox ${appmgr.siteurl}
wscat -c ${appmgr.siteurl.replace('http', 'ws')}
`)

  appmgr.app.use(bodyParser.json())
  appmgr.app.use(bodyParser.urlencoded({extended: true}))
  restful.attach(appmgr, db)

  let streamCounter = 0
  const  conns = []
  wss.on('connection', ws => {
    const n = streamCounter++
    const handlers = {}
    console.log('stream %d open, ws', n)

    const conn = new EventEmitter()
    conns.push(conn)
    conn._raw = ws
    conn.siteurl = appmgr.siteurl
    conn.send = (first, ...rest) => {
      if (rest.length) throw Error() // best not allow this, I thinkg
      console.log(`stream ${n} snd> %o`, first)
      ws.send(first)
    }
    conn.addHandlers = additions => {
      Object.assign(handlers, additions)
    }
    conn.log = (first, ...rest) => {
      console.log(`stream ${n} log: ${first}`, ...rest)
    }

    const mapper = psdad.mapper()

    const lines = []

    conn.onMatch = (texts, func) => {
      for (const text of asArray(texts)) {
        lines.push(text)
        mapper.addPair({input: func}, text)
      }
    }
    
    const add = (key, value) => {
      lines.push(value)
      mapper.addPair({
        input: (...args) => {
          // not quite sure why I wanted to allow handlers to be changed
          // during processing...  maybe just addpair the handler,
          // processin the .schema after the .talk?
          const handler = handlers[key]
          if (handler) {
            handler(...args)
          } else {
            console.error('ERROR: no handler for schema entry tagged %j', key)
          }
        },
        output: x => x.hasOwnProperty(key)
      }, value)
    }

    add('help', 'help')
    handlers.help = () => {
      conn.send('This service implements the following flextag statements:')
      for (const line of lines) conn.send(' * ' + line)
    }
    conn.send('Connected. Send the message "help" to see implemented statements.')
    
    // make a new mapping from flextags to their handlers for this
    // connection, since the handlers may be different functions (with
    // internal state) for each connection.
    for (const api of apis) {
      // use some normalizeSchema function?
      for (let [key, value] of Object.entries(api.schema || {})) {
        for (let v of asArray(value)) {
          add(key, v)
        }
      }
    }

    for (const api of apis) api.talk(conn, db)
    
    ws.on('message', async (message) => {
      console.log(`stream ${n} <rcv %o`, message)
      if (conn.hijack) {
        // allow a handler to take over the connection and be send the
        // next message
        conn.hijack = null
        conn.hijack(message)
      } else {
        // it would be nice to know if SOMETHING happened, to give a more
        // helpful response conversationally, instead of silence. Maybe mapper
        // can include a counter or something?
        mapper.parse(squareQuotes.convert(message))
      }
    })

    ws.on('close', () => {
      conn.emit('close')
      console.log('stream %d closed', n)
    })
  })

  const realStop = appmgr.stop.bind(appmgr)
  appmgr.stop = async () => {
    await Promise.all(conns.map(x => x._raw.close()))
    await db.close()
    await realStop()
  }
  return appmgr
}

function asArray (x) {
  if (Array.isArray(x)) return x
  return [x]
}

module.exports = { run }

