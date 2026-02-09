# 자동채점/해설 백엔드 표준 패키지 (노코드 연동용)

이 폴더는 다음을 바로 적용할 수 있도록 묶은 "표준 산출물"입니다.

- 01_rule_types.json: 루브릭 룰 타입 15종 스펙(필드/예시 포함)
- 02_rubric_templates.json: 중고등 영어 시험에 바로 쓰는 루브릭 템플릿 20개
- 03_example_exam.json: 예시 시험(메타)
- 04_example_questions.json: 예시 문항(좌표/루브릭 연결 포함)
- 05_example_answer_keys.json: 객관식/주관식 정답키 예시
- 06_flatten_spec.json: 노코드(Glide/Thunkable) 표시 최적화 결과 포맷

## 적용 방법(요약)
1) 교사가 문항 등록 시: Question.grading.rubricId로 템플릿 또는 커스텀 루브릭을 연결
2) 채점 워커는:
   - answer_key로 1차 채점(정확 매칭)
   - rubric.scoring.rules로 부분점수/감점 계산
   - explanation_ko/tips_ko 생성(룰 메시지 + 학생답 비교 기반)
3) /result 응답은 06_flatten_spec.json 형태로 반환하면 노코드 UI가 가장 편합니다.


## 실행 데모
- `demo_runner/grade_demo.py` 실행(파이썬 필요): 표준 JSON이 채점에 어떻게 쓰이는지 확인할 수 있습니다.
