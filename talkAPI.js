const db = require('./db')

function talk (conn) {
  const url = obj => {
    return conn.siteurl + '/' + obj.id + '?version=' + obj.version
  }
  const write = obj => {
    conn.send(url(obj))
  }

  conn.onMatch('send all new version URLs', () => {
    conn.log('send all new')

    db.events.on('new', write)
    db.events.on('updated', write)

    conn.on('close', () => {
      conn.log('unlistening')
      db.events.removeListener('new', write)
      db.events.removeListener('updated', write)
    })
  })

  conn.onMatch('send all URLs', async () => {
    await db.each(obj => {
        write(obj)
    }, (id, ver) => {
      conn.log('latest for %o is %o', id, ver)
    })
    conn.send('<done>')
  })
}

module.exports = { talk }
