# Solana Poll Web Application

Solana blockchain-based polling application where users can create polls, cast votes on polls, view poll results and share polls. 

This is a pure web3 application - meaning there is no intermediate database involved. All of the poll data is stored on blockchain.

## Solana on-chain program (smart contract)

- The program is deployed on Solana `devnet` cluster.

## Wallet integration

BlockPoll allows users to connect with multiple wallets - Eg: Solflare, Sollet, Phantom, etc. Users will have to connect their wallet for following operations:

- Create Poll
- Cast Vote on poll

---

## Build and Run

- ## Web application

    Requires [NodeJs](https://nodejs.org/en/).

    ### Install dependencies

    ```sh
    $ yarn install
    ```

    ### Start development server

    ```sh
    $ yarn dev
    ```

    ### Environment variables

    The application requires following environment variables:

    - `NEXT_PUBLIC_PROGRAM_ID` - BlockPoll on-chain program address.

    Create a new file `.env.local` in application root and add `NEXT_PUBLIC_PROGRAM_ID=<blockpoll_program_address>` to it.

    Eg: `NEXT_PUBLIC_PROGRAM_ID=EoDZ9sR4bW1AE1Qme3UA1Yn1n6SWSDUzeawyYeBzkxbY`


- ## Rust program

    Requires [Rust](https://www.rust-lang.org/) and [solana-cli](https://docs.solana.com/cli/install-solana-cli-tools) installed.

    ### Compile code

    ```sh
    $ yarn program:build
    ```

    ### Deploy

    ```sh
    $ yarn program:deploy
    ```

    ### Run tests

    ```sh
    $ yarn program:test
    ```
