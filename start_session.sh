#!/bin/bash
# start_session.sh
# -----------------------------------------------------------------------------
# 용도: 세션 시작 전 컨텍스트를 사람이 빠르게 훑어볼 때 쓰는 보조 스크립트.
# Claude Code 자체는 CLAUDE.md 만으로 컨텍스트를 자동 로드함 → 이 스크립트는 옵션.
# 사용법: ./start_session.sh
# -----------------------------------------------------------------------------

set -u
cd "$(dirname "$0")"

echo ""
echo "================================================"
echo "  세션 시작 — 커플 앱 프로젝트"
echo "================================================"
echo ""

echo "[HARNESS.md]"
echo "------------------------------------------------"
cat HARNESS.md
echo ""

echo "[현재 작업 컨텍스트: tasks/current.md]"
echo "------------------------------------------------"
cat tasks/current.md
echo ""

# 현재 단계 자동 감지 — "지금 단계: <N> —" 또는 "지금 단계: <Na> —" 형식 지원
STAGE_LINE=$(grep -m1 "지금 단계:" tasks/current.md || true)
# "지금 단계: 3a단계 — ..." 에서 "3a" 추출, "0단계 — ..." 에서 "0" 추출
STAGE_ID=$(echo "$STAGE_LINE" | sed -E 's/.*지금 단계:[[:space:]]*([0-9]+[a-z]?)단계.*/\1/')

if [ -n "$STAGE_ID" ] && [ "$STAGE_ID" != "$STAGE_LINE" ]; then
  STAGE_FILE="tasks/stage-${STAGE_ID}.md"
  if [ -f "$STAGE_FILE" ]; then
    echo "[단계별 상세 계획: $STAGE_FILE]"
    echo "------------------------------------------------"
    cat "$STAGE_FILE"
    echo ""
  else
    echo "!! $STAGE_FILE 파일 없음 — current.md 내용만으로 진행"
    echo ""
  fi
else
  echo "!! current.md 에서 '지금 단계: N단계 — ...' 형식을 못 찾았어요"
  echo ""
fi

echo "================================================"
echo "  Claude 프롬프트 (아래 내용을 그대로 붙여넣기)"
echo "================================================"
echo ""
echo "CLAUDE.md 지시대로 HARNESS.md, tasks/current.md, tasks/stage-${STAGE_ID:-?}.md 읽었어."
echo "현재 단계와 목표를 한 줄로 요약한 뒤 작업 시작해."
echo ""
echo "================================================"
