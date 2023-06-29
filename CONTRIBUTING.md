# CONTRIBUTING

## Repository Set-up

1. `corepack enable`
2. `pnpm run bootstrap`

## Local development

cd `cd runner` first.

For example developing the workflow of `./github/workflows/pull-request.yml`, you could find an [open pull request](https://github.com/vitejs/vite/pulls) and run with the PR number:

```bash
pnpm tsx src/cli.ts bench --pull-number=12725 --repeats=3
```

This will run the benchmark process as on GitHub Actions, including

1. Request GitHub API to get the pull request information
2. Clone the Vite repository of source branch and target branch (usually `main`)
3. Build the `vite` packages of source branch and target branch
4. Copy the `vite` packages dist to `${workspaceFolder}/vite`
5. Run the benchmark process
6. Report in terminal

To make the test without the heavy process of cloning and building, you could adding following flags after have running a full process above. Then it will directly re-use the built vite dist without step `2`, `3`, `4`.

```bash
pnpm tsx src/cli.ts bench --pull-number=12725 --repeats=3 --skip-clone --skip-prepare
```

If you encounter GitHub API rate limit, you could add `GITHUB_TOKEN` with you PAT to environment variables to increase the rate limit.
