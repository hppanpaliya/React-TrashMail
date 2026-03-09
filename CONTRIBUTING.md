# Contributing

Thanks for contributing to React-TrashMail.

## Local setup

1. Install dependencies:
   - `cd mailserver && yarn install`
   - `cd react && yarn install`
2. Copy environment files:
   - `cp mailserver/.env.example mailserver/.env`
   - `cp react/.env.example react/.env`
3. Start services:
   - Backend: `cd mailserver && yarn start`
   - Frontend: `cd react && yarn start`

## Quality checks

Run these checks before opening a PR:

- Backend: `cd mailserver && yarn format:check && yarn test --runInBand`
- Frontend: `cd react && yarn format:check && yarn lint && yarn test --watchAll=false && yarn build`

## Pull request guidelines

- Keep changes focused and small.
- Use Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`, `chore:`).
- Add or update tests when behavior changes.
- Update docs when config, scripts, or workflows change.
