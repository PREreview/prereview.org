# prereview.org

The source code for [prereview.fly.dev].

🌱️ This site is under active development and will become [prereview.org].

## Development

### Requirements

- [Node.js]

### Running the app

To build and run the app locally, create a `.env` file (based on [`.env.dist`](.env.dist)) and execute:

```shell
npm ci
npm start
```

You can now access the app at <http://localhost:3000>.

## Operations

Once it passes CI, we deploy every commit on the `main` branch to [prereview.fly.dev], which [Fly.io] hosts.

[fly.io]: https://fly.io/
[node.js]: https://nodejs.org/
[prereview.fly.dev]: https://prereview.fly.dev/
[prereview.org]: https://prereview.org/
