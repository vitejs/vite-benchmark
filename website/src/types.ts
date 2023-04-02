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
export interface Suite {
  'build-debug-log.txt': TxtLog
  'build-CPU.cpuprofile': Profile
  'dev-prebundle-debug-log.txt': TxtLog
  'dev-prebundle-CPU.cpuprofile': Profile
}

export type SuiteKeys = keyof Suite

export interface CompareItem {
  owner: string
  repo: string
  sha: string
}
