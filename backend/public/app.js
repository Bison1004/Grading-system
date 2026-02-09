// ==================== State ====================
var authToken = null;
var currentExamId = null;
var ocrQuestions = [];
var gradingResult = null;
var selectedFiles = [];
var API = '';

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', function() {
  initApp();
});

async function initApp() {
  await checkServer();
  await getGuestToken();

  // 네비게이션 버튼
  document.querySelectorAll('.nav button[data-screen]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      showScreen(this.getAttribute('data-screen'));
    });
  });

  // 홈 - 채점 시작
  document.getElementById('btnStartGrading').addEventListener('click', function() {
    showScreen('upload');
  });

  // 업로드 영역 클릭 → 갤러리
  document.getElementById('uploadZone').addEventListener('click', function() {
    document.getElementById('fileGallery').click();
  });

  // 카메라 버튼
  document.getElementById('btnCamera').addEventListener('click', function() {
    document.getElementById('fileCamera').click();
  });

  // 갤러리 버튼
  document.getElementById('btnGallery').addEventListener('click', function() {
    document.getElementById('fileGallery').click();
  });

  // 카메라 파일 선택
  document.getElementById('fileCamera').addEventListener('change', function(e) {
    handleFileSelect(e.target.files);
    e.target.value = '';
  });

  // 갤러리 파일 선택
  document.getElementById('fileGallery').addEventListener('change', function(e) {
    handleFileSelect(e.target.files);
    e.target.value = '';
  });

  // 업로드 버튼
  document.getElementById('uploadBtn').addEventListener('click', function() {
    uploadImages();
  });

  // 샘플 정답 버튼
  document.getElementById('btnSampleAnswers').addEventListener('click', function() {
    fillSampleAnswers();
  });

  // 채점 버튼
  document.getElementById('btnGrade').addEventListener('click', function() {
    submitGrading();
  });

  // 기록 새로고침
  document.getElementById('btnRefreshHistory').addEventListener('click', function() {
    loadHistory();
  });

  console.log('[App] 초기화 완료');
}

// ==================== API ====================
async function apiFetch(url, options) {
  if (!options) options = {};
  var headers = {};
  if (options.headers) {
    for (var k in options.headers) headers[k] = options.headers[k];
  }
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  var res = await fetch(API + url, {
    method: options.method || 'GET',
    headers: headers,
    body: options.body || undefined,
  });
  var data = await res.json();
  if (!data.success) {
    throw new Error(data.error && data.error.message ? data.error.message : 'API 오류');
  }
  return data;
}

async function checkServer() {
  try {
    var res = await fetch(API + '/health');
    var data = await res.json();
    document.getElementById('statusDot').className = 'dot on';
    document.getElementById('statusText').textContent =
      '서버 연결됨 · AI: ' + data.services.ai + ' · OCR: ' + data.services.ocr;
    return true;
  } catch (e) {
    document.getElementById('statusDot').className = 'dot off';
    document.getElementById('statusText').textContent = '서버 연결 안됨';
    return false;
  }
}

async function getGuestToken() {
  try {
    var data = await apiFetch('/api/v1/auth/guest', { method: 'POST' });
    authToken = data.data.token;
    console.log('[App] 게스트 토큰 OK');
  } catch (e) {
    console.error('[App] 게스트 토큰 실패:', e);
  }
}

// ==================== Navigation ====================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
  });
  document.querySelectorAll('.nav button').forEach(function(b) {
    b.classList.remove('active');
  });
  var el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');

  var screens = ['home', 'upload', 'answers', 'result', 'history'];
  var idx = screens.indexOf(name);
  if (idx >= 0) {
    var btns = document.querySelectorAll('.nav button');
    if (btns[idx]) btns[idx].classList.add('active');
  }
  if (name === 'history') loadHistory();
}

// ==================== File Handling ====================
function handleFileSelect(fileList) {
  if (!fileList || fileList.length === 0) return;
  for (var i = 0; i < fileList.length; i++) {
    if (selectedFiles.length < 10) {
      selectedFiles.push(fileList[i]);
    }
  }
  renderPreviews();
  document.getElementById('uploadBtn').disabled = false;
  document.getElementById('uploadZone').classList.add('has-file');
  toast('📸 ' + selectedFiles.length + '장 선택됨');
}

function renderPreviews() {
  var grid = document.getElementById('previewGrid');
  var countEl = document.getElementById('fileCount');
  grid.innerHTML = '';

  selectedFiles.forEach(function(file, i) {
    var div = document.createElement('div');
    div.className = 'preview-item';

    var img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = 'preview ' + (i + 1);
    div.appendChild(img);

    var btn = document.createElement('button');
    btn.className = 'remove';
    btn.textContent = '✕';
    btn.setAttribute('data-idx', String(i));
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      removeFile(parseInt(this.getAttribute('data-idx')));
    });
    div.appendChild(btn);

    grid.appendChild(div);
  });

  countEl.textContent = selectedFiles.length > 0
    ? '📎 ' + selectedFiles.length + '장 선택됨'
    : '';
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderPreviews();
  if (selectedFiles.length === 0) {
    document.getElementById('uploadBtn').disabled = true;
    document.getElementById('uploadZone').classList.remove('has-file');
  }
}

// ==================== Upload & OCR ====================
async function uploadImages() {
  if (selectedFiles.length === 0) return;

  var progress = document.getElementById('uploadProgress');
  var statusEl = document.getElementById('uploadStatus');
  progress.style.display = 'block';
  document.getElementById('uploadBtn').disabled = true;

  try {
    statusEl.textContent = '📤 이미지 업로드 중...';
    var formData = new FormData();
    selectedFiles.forEach(function(f) {
      formData.append('images', f);
    });
    formData.append('title', document.getElementById('examTitle').value || '영어 시험');

    var uploadData = await apiFetch('/api/v1/exam/upload', {
      method: 'POST',
      body: formData,
    });
    currentExamId = uploadData.data.examId;

    statusEl.textContent = '🔍 OCR 텍스트 인식 중...';
    var ocrData = await apiFetch('/api/v1/ocr/process', {
      method: 'POST',
      body: JSON.stringify({ examId: currentExamId }),
    });

    ocrQuestions = ocrData.data.questions;
    toast('✅ ' + ocrQuestions.length + '개 문항 인식 완료!');
    renderQuestions();
    showScreen('answers');
  } catch (e) {
    toast('❌ ' + e.message, true);
  } finally {
    progress.style.display = 'none';
    document.getElementById('uploadBtn').disabled = selectedFiles.length === 0;
  }
}

// ==================== Questions & Answers ====================
function renderQuestions() {
  var list = document.getElementById('questionList');
  var actions = document.getElementById('answerActions');

  if (ocrQuestions.length === 0) {
    list.innerHTML = '<div class="empty"><div class="icon">📋</div><p>인식된 문항이 없습니다</p></div>';
    actions.style.display = 'none';
    return;
  }

  var totalPoints = ocrQuestions.reduce(function(s, q) { return s + (q.points || 0); }, 0);
  document.getElementById('answersInfo').textContent =
    '총 ' + ocrQuestions.length + '개 문항 · 총점 ' + totalPoints + '점';

  var typeLabel = { multiple_choice: '객관식', short_answer: '단답형', essay: '서술형' };
  var typeClass = { multiple_choice: 'type-mc', short_answer: 'type-sa', essay: 'type-essay' };

  list.innerHTML = ocrQuestions.map(function(q) {
    var answerInput = '';
    if (q.type === 'multiple_choice') {
      answerInput = '<select class="answer-field" data-qnum="' + q.questionNumber + '">' +
        '<option value="">정답 선택</option>' +
        '<option value="1">① 1번</option>' +
        '<option value="2">② 2번</option>' +
        '<option value="3">③ 3번</option>' +
        '<option value="4">④ 4번</option>' +
        '<option value="5">⑤ 5번</option>' +
        '</select>';
    } else {
      var ph = q.type === 'essay' ? '모범답안 입력...' : '정답 입력...';
      answerInput = '<input type="text" class="answer-field" data-qnum="' + q.questionNumber + '" placeholder="' + ph + '" />';
    }

    return '<div class="question-item">' +
      '<div class="question-header">' +
        '<span class="question-num">Q' + q.questionNumber + '</span>' +
        '<span class="question-type ' + (typeClass[q.type] || '') + '">' + (typeLabel[q.type] || q.type) + '</span>' +
        '<span style="font-size:12px; color:var(--text-light);">' + (q.points || 0) + '점</span>' +
      '</div>' +
      '<div style="font-size:14px; color:var(--text); margin-bottom:8px; background:#fff; padding:8px 12px; border-radius:8px;">' +
        '📝 학생 답안: <strong>' + (q.recognizedText || '(비어있음)') + '</strong>' +
      '</div>' +
      '<div class="answer-input">' + answerInput + '</div>' +
    '</div>';
  }).join('');

  actions.style.display = 'block';
}

function fillSampleAnswers() {
  var sampleAnswers = {
    multiple_choice: ['3', '2', '4', '1', '3'],
    short_answer: ['goes', 'beautiful', 'went', 'taller', 'I am a student'],
    essay: ['I study hard because I want to achieve good grades in school and have a bright future.'],
  };
  var counters = { multiple_choice: 0, short_answer: 0, essay: 0 };

  ocrQuestions.forEach(function(q) {
    var field = document.querySelector('.answer-field[data-qnum="' + q.questionNumber + '"]');
    if (!field) return;
    var answers = sampleAnswers[q.type] || [''];
    var idx = counters[q.type] || 0;
    field.value = answers[idx % answers.length] || '';
    counters[q.type] = idx + 1;
  });
  toast('📋 샘플 정답이 입력되었습니다');
}

async function submitGrading() {
  var answerKey = ocrQuestions.map(function(q) {
    var field = document.querySelector('.answer-field[data-qnum="' + q.questionNumber + '"]');
    var val = field ? field.value : '';
    var item = {
      questionNumber: q.questionNumber,
      type: q.type,
      correctAnswer: val,
      points: q.points || 0,
    };
    if (q.type === 'essay') {
      item.keywords = val.split(' ').filter(function(w) { return w.length > 3; }).join(',');
    }
    return item;
  });

  var empty = answerKey.filter(function(a) { return !a.correctAnswer; });
  if (empty.length > 0) {
    if (!confirm(empty.length + '개 문항의 정답이 비어있습니다. 계속하시겠습니까?')) return;
  }

  var progress = document.getElementById('gradingProgress');
  progress.style.display = 'block';

  try {
    var data = await apiFetch('/api/v1/grading/grade', {
      method: 'POST',
      body: JSON.stringify({ examId: currentExamId, answerKey: answerKey }),
    });

    gradingResult = data.data;
    renderResult();
    toast('✅ 채점이 완료되었습니다!');
    showScreen('result');
  } catch (e) {
    toast('❌ 채점 실패: ' + e.message, true);
  } finally {
    progress.style.display = 'none';
  }
}

// ==================== Result ====================
function renderResult() {
  if (!gradingResult) return;
  var s = gradingResult.summary;
  var grade;
  if (s.percentage >= 90) grade = 'A';
  else if (s.percentage >= 80) grade = 'B';
  else if (s.percentage >= 70) grade = 'C';
  else if (s.percentage >= 60) grade = 'D';
  else grade = 'F';

  var html = '<div class="score-card">' +
    '<div class="grade">' + grade + '</div>' +
    '<div class="score">' + s.totalScore + '</div>' +
    '<div class="total">/ ' + s.totalPoints + '점</div>' +
    '<div class="percentage">' + s.percentage + '%</div>' +
  '</div>' +
  '<div class="stat-row">' +
    '<div class="stat-box"><div class="num" style="color:var(--success);">' + s.correctCount + '</div><div class="label">정답</div></div>' +
    '<div class="stat-box"><div class="num" style="color:var(--danger);">' + s.wrongCount + '</div><div class="label">오답</div></div>' +
    '<div class="stat-box"><div class="num" style="color:var(--warning);">' + (s.partialCount || 0) + '</div><div class="label">부분점수</div></div>' +
    '<div class="stat-box"><div class="num">' + s.totalQuestions + '</div><div class="label">전체</div></div>' +
  '</div>';

  if (gradingResult.typeStats) {
    html += '<div class="card"><h3>유형별 통계</h3>';
    var typeLabel = { multiple_choice: '객관식', short_answer: '단답형', essay: '서술형' };
    for (var type in gradingResult.typeStats) {
      var stat = gradingResult.typeStats[type];
      var pct = stat.maxPoints > 0 ? Math.round(stat.points / stat.maxPoints * 100) : 0;
      var color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';
      html += '<div style="margin-bottom:12px;">' +
        '<div style="display:flex; justify-content:space-between; font-size:14px;">' +
          '<span>' + (typeLabel[type] || type) + ' (' + stat.correct + '/' + stat.total + ')</span>' +
          '<span style="font-weight:600;">' + stat.points + '/' + stat.maxPoints + '점</span>' +
        '</div>' +
        '<div class="progress"><div class="progress-bar" style="width:' + pct + '%; background:' + color + ';"></div></div>' +
      '</div>';
    }
    html += '</div>';
  }

  if (gradingResult.details) {
    html += '<div class="card"><h3>문항별 상세</h3></div>';
    gradingResult.details.forEach(function(d) {
      var cls = d.isCorrect ? 'correct' : d.earnedPoints > 0 ? 'partial' : 'wrong';
      var sc = d.isCorrect ? 'var(--success)' : d.earnedPoints > 0 ? 'var(--warning)' : 'var(--danger)';
      html += '<div class="question-item ' + cls + '">' +
        '<div class="question-header">' +
          '<span class="question-num">Q' + d.questionNumber + '</span>' +
          '<span style="font-weight:700; font-size:14px; color:' + sc + ';">' + d.earnedPoints + '/' + d.maxPoints + '점</span>' +
        '</div>' +
        '<div style="font-size:13px; margin-top:4px;">' +
          '<div>학생: <strong>' + (d.studentAnswer || '(없음)') + '</strong></div>' +
          '<div>정답: <strong>' + d.correctAnswer + '</strong></div>' +
          (d.feedback ? '<div style="margin-top:6px; color:var(--text-light); font-size:12px;">💬 ' + d.feedback + '</div>' : '') +
        '</div>' +
      '</div>';
    });
  }

  // 새 시험 버튼 (이벤트 리스너로 바인딩)
  html += '<button class="btn btn-primary" style="margin-top:16px;" id="btnNewExam">🔄 새 시험 채점하기</button>';

  document.getElementById('resultContent').innerHTML = html;

  // 동적으로 추가된 버튼에 이벤트 바인딩
  var newExamBtn = document.getElementById('btnNewExam');
  if (newExamBtn) {
    newExamBtn.addEventListener('click', function() {
      resetAndStart();
    });
  }
}

function resetAndStart() {
  selectedFiles = [];
  ocrQuestions = [];
  gradingResult = null;
  currentExamId = null;
  document.getElementById('previewGrid').innerHTML = '';
  document.getElementById('fileCount').textContent = '';
  document.getElementById('uploadZone').classList.remove('has-file');
  document.getElementById('uploadBtn').disabled = true;
  document.getElementById('fileCamera').value = '';
  document.getElementById('fileGallery').value = '';
  showScreen('upload');
}

// ==================== History ====================
async function loadHistory() {
  var list = document.getElementById('historyList');
  list.innerHTML = '<div class="loading"><div class="spinner"></div><p style="margin-top:12px;">불러오는 중...</p></div>';

  try {
    var data = await apiFetch('/api/v1/grading/history/all');
    if (!data.data || data.data.length === 0) {
      list.innerHTML = '<div class="empty"><div class="icon">📭</div><p>아직 채점 기록이 없습니다</p></div>';
      return;
    }

    list.innerHTML = '';
    data.data.forEach(function(r) {
      var pct = r.percentage || 0;
      var bg = pct >= 90 ? 'var(--success)' : pct >= 70 ? 'var(--primary)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
      var date = r.gradedAt ? new Date(r.gradedAt).toLocaleString('ko-KR') : '';

      var div = document.createElement('div');
      div.className = 'history-item';
      div.setAttribute('data-examid', r.examId);
      div.innerHTML =
        '<div class="history-score" style="background:' + bg + ';">' + Math.round(pct) + '%</div>' +
        '<div class="history-info">' +
          '<div class="title">' + (r.examTitle || '영어 시험') + '</div>' +
          '<div class="detail">' + r.totalScore + '/' + r.totalPoints + '점 · 정답 ' + r.correctCount + '개</div>' +
          '<div class="date">' + date + '</div>' +
        '</div>';
      div.addEventListener('click', function() {
        viewHistoryResult(this.getAttribute('data-examid'));
      });
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = '<div class="empty"><div class="icon">⚠️</div><p>' + e.message + '</p></div>';
  }
}

async function viewHistoryResult(examId) {
  try {
    var data = await apiFetch('/api/v1/grading/' + examId + '/result');
    gradingResult = data.data;
    renderResult();
    showScreen('result');
  } catch (e) {
    toast('❌ 결과 조회 실패: ' + e.message, true);
  }
}

// ==================== Toast ====================
function toast(msg, isError) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.style.background = isError ? 'var(--danger)' : '#1E293B';
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 3000);
}
