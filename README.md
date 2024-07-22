# prereview.org

The source code for [prereview.org].

## Development

<details>

<summary>Requirements</summary>

- [Bash]
- [Docker]
- [Docker Compose]
- [GNU Make]
- [intlc]
- [mkcert]
- [Node.js]
- [Git LFS]
- Unix-like operating system

</details>

### Running the app

To build and run the app for development, execute:

```shell
make start
```

You can now access the app at <https://localhost>.

You will also have a `.env` file. This file contains environment variables controlling specific behaviours, including credentials for accessing external services.

## Operations

Once it passes CI, we deploy every commit on the `main` branch to [prereview.org] and [sandbox.prereview.org], which [Fly.io] hosts.

[bash]: https://www.gnu.org/software/bash/
[docker]: https://www.docker.com/
[docker compose]: https://docs.docker.com/compose/
[fly.io]: https://fly.io/
[git lfs]: https://git-lfs.github.com/
[gnu make]: https://www.gnu.org/software/make/
[intlc]: https://github.com/unsplash/intlc
[mkcert]: https://github.com/FiloSottile/mkcert
[node.js]: https://nodejs.org/
[prereview.org]: https://prereview.org/
[sandbox.prereview.org]: https://sandbox.prereview.org/
