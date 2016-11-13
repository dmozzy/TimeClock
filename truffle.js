module.exports = {
  build: {
    "index.html": "index.html",
    "app.js": [
      "javascripts/mustache.min.js",
      "javascripts/app.js"
    ],
    "app.css": [
      "stylesheets/pure-min.css",
      "stylesheets/app.css"
    ],
    "images/": "images/"
  },
  rpc: {
    host: "localhost",
    port: 8545
  }
};
