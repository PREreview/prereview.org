# prereview.org

The source code for [beta.prereview.org].

🌱️ This site is under active development and will become [prereview.org].

## Development

### Requirements

- [Node.js] v18

### Running the app

To build and run the app locally, create a `.env` file (based on [`.env.dist`](.env.dist)) and execute:

```shell
npm ci
npm start
```

You can now access the app at <http://localhost:3000>.

## Operations

Once it passes CI, we deploy every commit on the `main` branch to [beta.prereview.org] and [sandbox.prereview.org], which [Fly.io] hosts.

[beta.prereview.org]: https://beta.prereview.org/
[fly.io]: https://fly.io/
[node.js]: https://nodejs.org/
[prereview.org]: https://prereview.org/
[sandbox.prereview.org]: https://sandbox.prereview.org/
