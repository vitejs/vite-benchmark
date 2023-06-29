# vite-benchmark

Benchmarking for Vite. This project is still in development.

## Usage

### Run benchmark for a pull request

Go to https://github.com/vitejs/vite-benchmark/actions/workflows/pull-request.yml and click `Run workflow`.

### Run benchmark for specific commits / refs

Go to https://github.com/vitejs/vite-benchmark/actions/workflows/compare.yml and click `Run workflow`.

## TODO

- [ ] Cache for build dist to speed up CI
- [ ] Measure HMR speed
- [ ] Add more benchmark cases
- [ ] Generate and upload cpuprofile and debug log
- [ ] Cron job to measure perf of last N days on main branch
