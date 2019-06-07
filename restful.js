const db = require('./db')
const H = require('escape-html-template-tag')   // H.safe( ) if needed
const { gotUserPost } = require('./user-post')

let streamCounter = 0

const checked = H.safe(' checked="checked"')
  
const attach = (app) => {
  app.get('/', (req, res) => {
    let text = ''
    if (req.query.id) {
      const obj = db.objs.get(req.query.id)
      text = obj.text
    }
    res.send(H`<html>
<head>
<style>
/* from https://developer.mozilla.org/en-US/docs/Learn/HTML/Forms/Your_first_HTML_form */
form {
  /* Just to center the form on the page */
  margin: 0 auto;
  width: 95%;
  /* To see the outline of the form */
  padding: 1em;
  border: 1px solid #CCC;
  border-radius: 0.3em;
}

form div + div {
  margin-top: 1em;
}

label {
  /* To make sure that all labels have the same size and are properly aligned */
  display: inline-block;
  /* width: 90px; */
  text-align: right;
}

input, textarea {
  /* To make sure that all text fields have the same font settings
     By default, textareas have a monospace font */
  font: 1em sans-serif;

  /* To give the same size to all text fields */
  /*  width: 300px; */
  box-sizing: border-box;

  /* To harmonize the look & feel of text field border */
  border: 1px solid #999;
}

input:focus, textarea:focus {
  /* To give a little highlight on active elements */
  border-color: #000;
}

textarea {
  /* To properly align multiline text fields with their labels */
  vertical-align: top;

  /* To give enough room to type some text */
  height: 5em;
  width: 95%;
}

.button {
  /* To position the buttons to the same position of the text fields */
  padding-left: 90px; /* same size as the label elements */
}

button {
  /* This extra margin represent roughly the same space as the space
     between the labels and their text fields */
  margin-left: .5em;
}
</style>
</head>
<body>

<p>This is an installation of <a
href="https://github.com/sandhawke/snippet-server#readme">snippet-server</a>.</p>

<form action="/" method="post">

<p>Use this form for all site content modifications. To
append/replace/delete, you'll need the same bearer token as you provided
during create. There is currently no mechanism for token recovery.</p>

  <div>
    <label for="id">Page ID (URL path, lowercase hex):</label>
    <input type="text" id="id" name="id" value="${req.query.id || ''}">
  </div>

  <div>Select Operation:

    <input type="radio" id="opChoice0"
     name="op" value="create"${req.query.op === 'create' ? checked : ''}>
    <label for="opChoice0">Create</label>

    <input type="radio" id="opChoice1"
     name="op" value="append"${req.query.op === 'append' ? checked : ''}>
    <label for="opChoice1">Append</label>

    <input type="radio" id="opChoice2"
     name="op" value="replace"${req.query.op === 'replace' ? checked : ''}>
    <label for="opChoice2">Replace</label>

    <input type="radio" id="opChoice3"
     name="op" value="delete">
    <label for="opChoice3">Delete</label>
  </div>

  <div>
    <label for="text">Page text (for replace or append):</label>
    <textarea id="text" name="text">${text}</textarea>
  </div>

  <div>
    <label for="text">Bearer Token (20+ chars lowercase hex recommended):</label>
    <input type="password" id="pw" name="pw"></input>
  </div>

  <p>
  <button type="submit">Submit</button>
  </p>

</form>
`)
  })

  app.post('/', async (req, res) => {
    const obj = await gotUserPost(req.body)
    if (typeof obj === 'string') {
      res.status(400).send(obj + '\n')
      return
    }
    console.log('created %o', obj)
    res.redirect(303, '/' + obj.id)
  })

  app.get('/:id', (req, res) => {
    const id = req.params.id
    console.log('looking for %j', id)
    const post = db.objs.get(id)
    if (!post) {
      console.log('no match')
      res.status(404).send('Not found')
      return 
    }
    if (post.deleted) {
      res.status(410).send('Gone (deleted)')
      return
    }
    console.log(post)
    res.format({
      'text/plain': () => {
        res.send(post.text)
      },
      html: () => {
        res.send(H`<html>
<head></head><body>
<div style="border: 1px solid black; padding-left: 1em;">
<p>This page is user-generated content. This site does not maintain accounts or track user identity. See <a href="/">site home page</a>.</p>
<p>If you know the bearer token used for creating this page, you can <a href="/?id=${id}&op=replace">edit it</a></p>
</div>
<pre>${post.text}</pre>
</body></html>`)
      }
    })
  })
}

module.exports = { attach }
