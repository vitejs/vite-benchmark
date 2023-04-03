# performance-compare
Benchmarks for Farm, Webpack, Vite, Rspack and Turbopack.
> Using Turbopack's bench cases (1000 React components), see https://turbo.build/pack/docs/benchmarks

|                     | **Startup**  | **HMR (Root)**  | **HMR (Leaf)**  |
| ------------------- | ------- | ----- | --- |
| Webpack      | 8050ms   | 363ms | 279ms |
| Vite      | 3712ms   | 37ms | 25ms |
| Turbopack   | 2476ms | 7ms | 13ms |
| Rspack   | 414ms | 300ms | 288ms |
| Farm    | 439ms | 8ms | 12ms  |

![xx](./assets/benchmark.png)


Run benchmarks:
```bash
node benchmark.mjs
```
You will see something like:
```txt
bright@bright-MS-7D17:~/opensource/performance-compare$ node benchmark.mjs

Rspack  startup time: 417ms
Turbopack  startup time: 2440.673095703125ms
Webpack  startup time: 7968ms
Vite  startup time: 3712ms
Farm  startup time: 430ms
Turbopack  Root HMR time: 7ms
Farm  Root HMR time: 7ms
Vite  Root HMR time: 42ms
Rspack  Root HMR time: 298ms
Webpack  Root HMR time: 451ms
Farm  Leaf HMR time: 10ms
Turbopack  Leaf HMR time: 11ms
Vite  Leaf HMR time: 22ms
Webpack  Leaf HMR time: 284ms
Rspack  Leaf HMR time: 303ms
```

If you want to start the project with the specified tool, try:
```bash
pnpm i # install dependencies

pnpm run start:farm # Start Farm
pnpm run start:vite # Start Vite with babel
pnpm run start:vite-swc # Start Vite with SWC
pnpm run start:webpack # Start Webpack with babel
pnpm run start:webpack-swc # Start Webpack with SWC
pnpm run start:turbopack # Start Turbopack
pnpm run start:rspack # Start Rspack
pnpm run start:parcel # Start parcel
```
