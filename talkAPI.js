function talk (conn, db) {
  const url = obj => {
    return conn.siteurl + '/' + obj.id + '?version=' + obj.version
  }
  const write = obj => {
    conn.send(url(obj))
  }

  conn.onMatch('send all new version URLs', () => {
    conn.log('send all new')

    db.on('new', write)
    db.on('updated', write)

    conn.on('close', () => {
      conn.log('unlistening')
      db.removeListener('new', write)
      db.removeListener('updated', write)
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
