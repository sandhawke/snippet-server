# snippet-server
[![NPM version][npm-image]][npm-url]

Very simple way to share text online, like gist or pastebin. With
simple restful API and pub/sub mechanism.

No formating, no user accounts, no user information, no cookies.  But
we still allow editing by having pages have passwords (bearer
tokens). To modify the text on the page, you need the password.

There is potential for abuse, but:
* page URLs will be ugly/boring (hex only)
* pages will be ugly (simple CSS - maybe monospace)
* we'll use rel=nofollow on all outbound links, so it's no value for SEO
* formatting will be minimal, no images, no user HTML/CSS
* maybe we'll make public the IP address used to edit the page?

So, yes, someone could use one of these servers as a rendezvous point
where they post their secret dangerous URLs or instructions for
illegal activity, but ... I think there are probably much more
appealing alternatives already in place.

----


[npm-image]: https://img.shields.io/npm/v/snippet-server.svg?style=flat-square
[npm-url]: https://npmjs.org/package/snippet-server
