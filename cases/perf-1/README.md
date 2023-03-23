> https://github.com/vitejs/vite/issues/6030

# vite-2.7-slow

Vite 2.7.x is much slower than vite 2.6.14. This example repository contains a couple of the dependencies that we use to illustrate the performance difference.

## Steps to reproduce

1. `npm i`
2. `npm run dev -- --force`

> Use --force to always start without the cache

## To switch to vite 2.6.14 for comparison, run:

`npm i -D vite@2.6.14`

## Results in seconds on Windows 10

2.6.14: 12, 7, 7, 6, 6  
2.7.1: 46, 47, 46, 47, 48

2.7 is about 6.2 times slower.

## Results on Ubuntu 20.04 in WSL2

2.6.14: 3, 4, 4, 4, 4  
2.7.1: 7, 7, 8, 8, 6

2.7 is about 1.9 times slower.

> Times rounded to nearest second.
