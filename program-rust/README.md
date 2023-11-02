# BlockPoll Solana on-chain program

- The program is deployed on Solana `devnet` cluster.
- Program Address: [GnS5xMqf5NaY7HgbwFneyLNktT8NNNKi4rA2JEmnYdzi](https://explorer.solana.com/address/GnS5xMqf5NaY7HgbwFneyLNktT8NNNKi4rA2JEmnYdzi?cluster=devnet)

---

## Build and deploy

Requires [Rust](https://www.rust-lang.org/) and [solana-cli](https://docs.solana.com/cli/install-solana-cli-tools) installed.

### Compile code

```sh
$ cargo build-bpf --manifest-path=./Cargo.toml --bpf-out-dir=./dist/program
```

### Deploy

```sh
$ solana program deploy dist/program/blockpoll.so
```

### Run tests

```sh
$ cargo test
```
