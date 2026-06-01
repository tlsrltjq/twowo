#!/bin/bash
# end_session.sh
# -----------------------------------------------------------------------------
# 용도: 세션 종료 시 사람이 마무리 체크리스트를 빠르게 확인할 때 쓰는 보조 스크립트.
# Claude Code 자체는 CLAUDE.md 의 "세션 종료 시 필수 작업" 항목으로 동작함.
# 사용법: ./end_session.sh
# -----------------------------------------------------------------------------

set -u
cd "$(dirname "$0")"

STAGE_LINE=$(grep -m1 "지금 단계:" tasks/current.md || true)
STAGE_ID=$(echo "$STAGE_LINE" | sed -E 's/.*지금 단계:[[:space:]]*([0-9]+[a-z]?)단계.*/\1/')
[ "$STAGE_ID" = "$STAGE_LINE" ] && STAGE_ID="?"
STAGE_FILE="tasks/stage-${STAGE_ID}.md"
TODAY=$(date +%Y-%m-%d)

echo ""
echo "================================================"
echo "  세션 종료 — 마무리 작업"
echo "================================================"
echo ""
echo "감지된 현재 단계: ${STAGE_ID}단계 ($STAGE_FILE)"
echo ""
echo "Claude 에게 아래를 붙여넣기:"
echo ""
echo "------------------------------------------------"
echo ""
echo "세션 종료 마무리:"
echo ""
echo "1. tasks/current.md '이전 세션에서 멈춘 곳' 업데이트"
echo "2. CHANGELOG.md 한 줄 추가:"
echo "   ${TODAY} | ${STAGE_ID}단계 | feat/fix/chore: [내용]"
echo ""
echo "(선택) 단계 완료된 경우에만:"
echo "3. HARNESS.md 로드맵 표 아이콘 갱신 제안 + diff 보여주기"
echo ""
echo "------------------------------------------------"
echo ""

echo "[CHANGELOG 마지막 3줄]"
echo "------------------------------------------------"
tail -3 CHANGELOG.md
echo ""

echo "[현재 로드맵 상태]"
echo "------------------------------------------------"
grep -A 15 "## 전체 로드맵" HARNESS.md | head -16
echo ""
echo "================================================"
