type TxtLog = {
  name: string
  payload: string
  type: 'txt'
}

type Profile = {
  name: string
  payload: string
  type: 'cpuprofile'
}

// export type Profiles = Record<string, Profile>
// export interface Suite {
//   'build-debug-log.txt': TxtLog
//   'build-cpu.cpuprofile': Profile
//   'dev-start-cold-debug-log.txt': TxtLog
//   'dev-start-cold-cpu.cpuprofile': Profile
//   'dev-start-hot-debug-log.txt': TxtLog
//   'dev-start-hot-cpu.cpuprofile': Profile
// }

export type Suite = Record<string, TxtLog | Profile>

export type SuiteKeys = keyof Suite

export interface CompareItem {
  owner: string
  repo: string
  sha: string
}
