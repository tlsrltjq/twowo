# CI 워크플로

`ci.yml` — push/PR 시 자동 실행:
1. **static-checks** — `tsc --noEmit` + ESLint (병렬 실행 시작점)
2. **unit-tests** — Jest 단위 (mock 기반, `__mocks__/firebase.ts`)
3. **integration-tests** — Firebase Emulator 띄우고 `__tests__/integration/` 실행

세부 정책은 `docs/testing.md` 참조.
