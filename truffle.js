var DefaultBuilder = require("truffle-default-builder");

module.exports = {
  build: new DefaultBuilder({
    "index.html": "index.html",
    "app.js": [
      "javascripts/mustache.min.js",
      "javascripts/app.js"
    ],
    "app.css": [
      "stylesheets/pure-min.css",
      "stylesheets/app.css"
    ]
  }),
  rpc: {
    host: "localhost",
    port: 8545
  },
  networks: {
    dev: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    },
    staging: {
      host: "localhost",
      port: 8546,
      network_id: 1337
    },
    ropsten: {
      host: "158.253.8.12",
      port: 8545,
      network_id: 3
    }
  }
};
