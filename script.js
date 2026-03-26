// =====================================================
// 서버 연결 설정 (로컬 Flask 서버 또는 GitHub Pages 정적 JSON 중 자동 선택)
// NOTE: 로컬 서버 실행 시 → Flask API 사용, GitHub Pages → eflm_data.json fetch
// =====================================================
const SERVER_URL = 'http://127.0.0.1:5000';  // 로컬 Flask 서버 주소
const DATA_JSON_URL = './eflm_data.json';       // GitHub Pages 정적 JSON 경로

/**
 * 앱 시작 시 데이터 로드:
 * 1순위: 로컬 Flask 서버 /api/data
 * 2순위: 정적 eflm_data.json (GitHub Pages 환경)
 * 3순위: script.js에 내장된 sampleData (초기 기본 데이터)
 */
async function loadInitialData() {
    let loaded = false;

    // 1순위: 로컬 Flask 서버 시도
    try {
        const res = await fetch(`${SERVER_URL}/api/data`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
            const json = await res.json();
            if (json.data && Array.isArray(json.data)) {
                // NOTE: 서버에서 불러온 데이터로 sampleData 덮어쓰기
                sampleData.splice(0, sampleData.length, ...json.data);
                console.log(`[데이터 로드] 로컬 서버에서 ${sampleData.length}개 항목 로드 완료`);
                // 마지막 업데이트 날짜를 대시보드에 표시
                if (json.last_updated) {
                    const badge = document.getElementById('eflm-update-time');
                    if (badge) badge.textContent = `마지막 업데이트: ${json.last_updated}`;
                }
                loaded = true;
            }
        }
    } catch (e) {
        console.log('[데이터 로드] 로컬 서버 없음. 정적 JSON 시도...');
    }

    // 2순위: 정적 eflm_data.json (GitHub Pages)
    if (!loaded) {
        try {
            const res = await fetch(DATA_JSON_URL, { signal: AbortSignal.timeout(3000) });
            if (res.ok) {
                const json = await res.json();
                if (json.data && Array.isArray(json.data)) {
                    sampleData.splice(0, sampleData.length, ...json.data);
                    console.log(`[데이터 로드] 정적 JSON에서 ${sampleData.length}개 항목 로드 완료`);
                    loaded = true;
                }
            }
        } catch (e) {
            console.log('[데이터 로드] 정적 JSON 없음. 내장 데이터 사용.');
        }
    }

    // 3순위: 내장 sampleData 그대로 사용 (기본값)
    if (!loaded) {
        console.log(`[데이터 로드] 내장 데이터 사용 (${sampleData.length}개 항목)`);
    }

    // 데이터 로드 후 UI 갱신
    if (typeof renderAllTables === 'function') renderAllTables();
    if (typeof populateItemSelector === 'function') populateItemSelector();
}

/**
 * 전체 수집 버튼 핸들러 (로컬 Flask 서버 /api/collect-all 호출)
 * GitHub Pages에서는 "서버 필요" 안내 표시
 */
async function handleUpdateAll() {
    const btn = document.getElementById('eflm-update-all-btn');
    const loadingEl = document.getElementById('eflm-loading-overlay');
    const loadingText = document.getElementById('eflm-loading-text');

    try {
        // 서버 살아있는지 먼저 확인
        const healthRes = await fetch(`${SERVER_URL}/`, { signal: AbortSignal.timeout(1500) });
        if (!healthRes.ok) throw new Error('서버 응답 없음');
    } catch (e) {
        alert('로컬 Flask 서버(eflm_server.py)가 실행 중이지 않습니다.\n\n터미널에서 먼저 실행하세요:\npython eflm_server.py\n\n(GitHub Pages에서는 GitHub Actions가 매월 자동 수집합니다)');
        return;
    }

    // 전체 수집 요청
    if (btn) btn.disabled = true;
    if (loadingEl) loadingEl.style.display = 'flex';
    if (loadingText) loadingText.textContent = '전체 수집 중... (서버 콘솔에서 진행 상황 확인)';

    try {
        const res = await fetch(`${SERVER_URL}/api/collect-all`, { method: 'POST' });
        const json = await res.json();
        if (loadingText) loadingText.textContent = `수집 시작됨 (총 ${json.total}개 항목). 완료 후 페이지를 새로고침하세요.`;
        console.log('[전체 수집] 서버 응답:', json.message);
    } catch (e) {
        if (loadingEl) loadingEl.style.display = 'none';
        alert('전체 수집 요청 실패: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

// =====================================================
// 초기화 실행
// =====================================================
document.addEventListener('DOMContentLoaded', loadInitialData);

// =====================================================
// 기존 변수 선언 시작
// =====================================================
const TEST_MODE = true; 
const TODAY = new Date('2026-03-25');
let currentUser = { id: 'DMSERV', role: 'admin', name: '심상욱' };
let selectedIndices = new Set();
let globalCategoryFilter = 'All'; 
let adminFilterTestName = 'All';
let previousData = null; // Req 3: 지난 달 데이터 보관용
let sampleData = [
  {
    "test": "HbA1c",
    "search": "Haemoglobin A1c (IFCC)",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": { "cvi": null, "cvg": null },
    "opt": { "cva": null, "bias": null, "te": null, "mau": null },
    "des": { "cva": null, "bias": null, "te": null, "mau": null },
    "min": { "cva": null, "bias": null, "te": null, "mau": null },
    "acn": 99999,
    "lastUpdate": "2025-12-29",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AAGP2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": { "cvi": null, "cvg": null },
    "opt": { "cva": null, "bias": null, "te": null, "mau": null },
    "des": { "cva": null, "bias": null, "te": null, "mau": null },
    "min": { "cva": null, "bias": null, "te": null, "mau": null },
    "acn": 20020,
    "lastUpdate": "2025-11-29",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AAT2",
    "search": "a-1 antitrypsin",
    "category": "Chemistry",
    "status": "done",
    "progress": 60,
    "conf": "high",
    "est": {
      "cvi": 2.5,
      "cvg": 18.1
    },
    "opt": {
      "cva": 3.3,
      "bias": 4.0,
      "te": 6.0,
      "mau": 0.4
    },
    "des": {
      "cva": 4.3,
      "bias": 3.0,
      "te": 23.1,
      "mau": 2.4
    },
    "min": {
      "cva": 8.0,
      "bias": 3.3,
      "te": 21.8,
      "mau": 4.9
    },
    "acn": 20030,
    "lastUpdate": "2025-03-15",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ACET2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 3.2,
      "cvg": 18.0
    },
    "opt": {
      "cva": 2.6,
      "bias": 4.6,
      "te": 12.2,
      "mau": 0.4
    },
    "des": {
      "cva": 6.2,
      "bias": 2.1,
      "te": 23.0,
      "mau": 0.6
    },
    "min": {
      "cva": 5.9,
      "bias": 6.4,
      "te": 27.3,
      "mau": 1.9
    },
    "acn": 20040,
    "lastUpdate": "2025-08-18",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ACP2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 40,
    "conf": "mid",
    "est": {
      "cvi": 2.0,
      "cvg": 7.4
    },
    "opt": {
      "cva": 2.8,
      "bias": 8.8,
      "te": 12.6,
      "mau": 1.0
    },
    "des": {
      "cva": 4.9,
      "bias": 8.2,
      "te": 19.5,
      "mau": 1.7
    },
    "min": {
      "cva": 11.3,
      "bias": 5.3,
      "te": 15.7,
      "mau": 1.5
    },
    "acn": 20050,
    "lastUpdate": "2025-11-29",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ALB2-G",
    "search": "Albumin",
    "category": "Chemistry",
    "status": "working",
    "progress": 69,
    "conf": "mid",
    "est": {
      "cvi": 1.5,
      "cvg": 16.5
    },
    "opt": {
      "cva": 2.8,
      "bias": 8.6,
      "te": 10.7,
      "mau": 0.8
    },
    "des": {
      "cva": 7.8,
      "bias": 2.3,
      "te": 20.9,
      "mau": 2.5
    },
    "min": {
      "cva": 5.9,
      "bias": 15.3,
      "te": 15.6,
      "mau": 2.6
    },
    "acn": 20090,
    "lastUpdate": "2025-10-10",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ALBT2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 44,
    "conf": "high",
    "est": {
      "cvi": 3.7,
      "cvg": 19.1
    },
    "opt": {
      "cva": 3.6,
      "bias": 3.2,
      "te": 5.6,
      "mau": 0.3
    },
    "des": {
      "cva": 5.6,
      "bias": 4.3,
      "te": 10.1,
      "mau": 1.6
    },
    "min": {
      "cva": 11.8,
      "bias": 3.7,
      "te": 21.2,
      "mau": 3.7
    },
    "acn": 20060,
    "lastUpdate": "2025-10-31",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ALBT2C",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.3,
      "cvg": 5.1
    },
    "opt": {
      "cva": 1.8,
      "bias": 5.8,
      "te": 8.0,
      "mau": 0.9
    },
    "des": {
      "cva": 6.7,
      "bias": 8.7,
      "te": 18.0,
      "mau": 1.6
    },
    "min": {
      "cva": 8.8,
      "bias": 16.9,
      "te": 21.6,
      "mau": 3.5
    },
    "acn": 20062,
    "lastUpdate": "2024-12-26",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ALBT2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 67,
    "conf": "high",
    "est": {
      "cvi": 4.0,
      "cvg": 12.1
    },
    "opt": {
      "cva": 3.0,
      "bias": 8.9,
      "te": 8.8,
      "mau": 0.3
    },
    "des": {
      "cva": 3.0,
      "bias": 8.1,
      "te": 17.0,
      "mau": 1.4
    },
    "min": {
      "cva": 9.7,
      "bias": 18.2,
      "te": 37.7,
      "mau": 3.2
    },
    "acn": 20061,
    "lastUpdate": "2026-01-08",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ALP2",
    "search": "Alkaline phosphatase (ALP), liver type",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 6.7,
      "cvg": 17.3
    },
    "opt": {
      "cva": 3.2,
      "bias": 2.3,
      "te": 10.5,
      "mau": 1.1
    },
    "des": {
      "cva": 5.8,
      "bias": 12.6,
      "te": 11.9,
      "mau": 0.5
    },
    "min": {
      "cva": 4.6,
      "bias": 5.2,
      "te": 25.4,
      "mau": 2.9
    },
    "acn": 20110,
    "lastUpdate": "2025-03-08",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ALTP2",
    "search": "Alanine transaminase (ALT)",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 2.6,
      "cvg": 10.5
    },
    "opt": {
      "cva": 4.7,
      "bias": 1.3,
      "te": 5.2,
      "mau": 0.7
    },
    "des": {
      "cva": 2.3,
      "bias": 6.0,
      "te": 14.3,
      "mau": 2.0
    },
    "min": {
      "cva": 5.9,
      "bias": 18.6,
      "te": 16.6,
      "mau": 3.6
    },
    "acn": 20140,
    "lastUpdate": "2026-01-24",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AM1Q2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.9,
      "cvg": 12.1
    },
    "opt": {
      "cva": 4.8,
      "bias": 4.8,
      "te": 13.5,
      "mau": 0.4
    },
    "des": {
      "cva": 6.6,
      "bias": 5.9,
      "te": 14.5,
      "mau": 2.3
    },
    "min": {
      "cva": 10.7,
      "bias": 8.3,
      "te": 27.4,
      "mau": 4.9
    },
    "acn": 20163,
    "lastUpdate": "2025-07-14",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AM1S2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 58,
    "conf": "mid",
    "est": {
      "cvi": 9.1,
      "cvg": 19.3
    },
    "opt": {
      "cva": 4.9,
      "bias": 3.1,
      "te": 6.6,
      "mau": 1.3
    },
    "des": {
      "cva": 5.6,
      "bias": 3.9,
      "te": 21.4,
      "mau": 2.1
    },
    "min": {
      "cva": 7.0,
      "bias": 13.1,
      "te": 29.5,
      "mau": 4.6
    },
    "acn": 20166,
    "lastUpdate": "2024-12-20",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AM3Q2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.5,
      "cvg": 7.1
    },
    "opt": {
      "cva": 2.3,
      "bias": 5.8,
      "te": 6.0,
      "mau": 0.9
    },
    "des": {
      "cva": 4.4,
      "bias": 2.7,
      "te": 11.1,
      "mau": 0.8
    },
    "min": {
      "cva": 4.4,
      "bias": 12.4,
      "te": 36.9,
      "mau": 1.7
    },
    "acn": 20161,
    "lastUpdate": "2025-11-06",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AM3S2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.2,
      "cvg": 12.1
    },
    "opt": {
      "cva": 1.6,
      "bias": 8.4,
      "te": 12.2,
      "mau": 0.3
    },
    "des": {
      "cva": 6.3,
      "bias": 13.8,
      "te": 15.6,
      "mau": 2.3
    },
    "min": {
      "cva": 10.5,
      "bias": 18.2,
      "te": 29.2,
      "mau": 3.4
    },
    "acn": 20164,
    "lastUpdate": "2025-04-17",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AM5Q2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.6,
      "cvg": 15.4
    },
    "opt": {
      "cva": 4.2,
      "bias": 6.2,
      "te": 14.9,
      "mau": 0.4
    },
    "des": {
      "cva": 4.2,
      "bias": 5.3,
      "te": 13.4,
      "mau": 1.0
    },
    "min": {
      "cva": 9.4,
      "bias": 9.2,
      "te": 25.4,
      "mau": 4.0
    },
    "acn": 20162,
    "lastUpdate": "2025-12-07",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AM5QC",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 9.4,
      "cvg": 11.1
    },
    "opt": {
      "cva": 2.3,
      "bias": 2.1,
      "te": 5.2,
      "mau": 0.6
    },
    "des": {
      "cva": 4.1,
      "bias": 11.5,
      "te": 16.5,
      "mau": 2.6
    },
    "min": {
      "cva": 8.3,
      "bias": 15.9,
      "te": 30.7,
      "mau": 4.1
    },
    "acn": 20160,
    "lastUpdate": "2025-06-14",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AM5-QP",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 1.9,
      "cvg": 5.0
    },
    "opt": {
      "cva": 4.4,
      "bias": 4.6,
      "te": 10.1,
      "mau": 0.5
    },
    "des": {
      "cva": 3.8,
      "bias": 7.6,
      "te": 15.1,
      "mau": 1.5
    },
    "min": {
      "cva": 8.4,
      "bias": 9.6,
      "te": 20.4,
      "mau": 4.1
    },
    "acn": 20168,
    "lastUpdate": "2025-12-29",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AM5S2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.6,
      "cvg": 15.6
    },
    "opt": {
      "cva": 2.3,
      "bias": 5.3,
      "te": 8.8,
      "mau": 0.3
    },
    "des": {
      "cva": 5.6,
      "bias": 10.7,
      "te": 13.7,
      "mau": 0.6
    },
    "min": {
      "cva": 8.4,
      "bias": 8.9,
      "te": 16.0,
      "mau": 1.1
    },
    "acn": 20165,
    "lastUpdate": "2025-06-29",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AMIK2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 2.2,
      "cvg": 7.4
    },
    "opt": {
      "cva": 3.8,
      "bias": 6.3,
      "te": 8.1,
      "mau": 0.4
    },
    "des": {
      "cva": 3.0,
      "bias": 4.9,
      "te": 10.8,
      "mau": 1.4
    },
    "min": {
      "cva": 3.6,
      "bias": 11.5,
      "te": 36.0,
      "mau": 3.9
    },
    "acn": 20150,
    "lastUpdate": "2024-11-21",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AMYL2",
    "search": "Amylase",
    "category": "Chemistry",
    "status": "done",
    "progress": 71,
    "conf": "high",
    "est": {
      "cvi": 7.8,
      "cvg": 6.3
    },
    "opt": {
      "cva": 3.7,
      "bias": 2.8,
      "te": 13.7,
      "mau": 1.3
    },
    "des": {
      "cva": 4.5,
      "bias": 2.8,
      "te": 12.6,
      "mau": 1.8
    },
    "min": {
      "cva": 4.1,
      "bias": 6.9,
      "te": 31.6,
      "mau": 3.6
    },
    "acn": 20170,
    "lastUpdate": "2024-12-05",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AMYL2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.9,
      "cvg": 8.3
    },
    "opt": {
      "cva": 3.4,
      "bias": 9.2,
      "te": 14.2,
      "mau": 1.1
    },
    "des": {
      "cva": 3.5,
      "bias": 9.2,
      "te": 10.2,
      "mau": 2.5
    },
    "min": {
      "cva": 3.4,
      "bias": 5.6,
      "te": 33.0,
      "mau": 1.0
    },
    "acn": 20171,
    "lastUpdate": "2025-11-20",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AMYP2",
    "search": "Pancreatic Amylase",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.1,
      "cvg": 16.3
    },
    "opt": {
      "cva": 2.5,
      "bias": 6.8,
      "te": 14.9,
      "mau": 0.9
    },
    "des": {
      "cva": 7.8,
      "bias": 8.6,
      "te": 19.9,
      "mau": 0.7
    },
    "min": {
      "cva": 9.5,
      "bias": 4.8,
      "te": 23.2,
      "mau": 4.7
    },
    "acn": 20180,
    "lastUpdate": "2025-07-22",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AMYP2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 41,
    "conf": "mid",
    "est": {
      "cvi": 3.4,
      "cvg": 7.4
    },
    "opt": {
      "cva": 3.9,
      "bias": 5.1,
      "te": 5.4,
      "mau": 0.3
    },
    "des": {
      "cva": 7.3,
      "bias": 6.3,
      "te": 12.9,
      "mau": 1.8
    },
    "min": {
      "cva": 11.5,
      "bias": 19.3,
      "te": 27.6,
      "mau": 3.0
    },
    "acn": 20181,
    "lastUpdate": "2025-05-13",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "APOAT",
    "search": "Apolipoprotein A1",
    "category": "Chemistry",
    "status": "done",
    "progress": 76,
    "conf": "high",
    "est": {
      "cvi": 4.1,
      "cvg": 14.3
    },
    "opt": {
      "cva": 2.0,
      "bias": 3.2,
      "te": 6.4,
      "mau": 0.9
    },
    "des": {
      "cva": 5.1,
      "bias": 12.7,
      "te": 11.1,
      "mau": 2.9
    },
    "min": {
      "cva": 8.8,
      "bias": 4.7,
      "te": 27.0,
      "mau": 4.4
    },
    "acn": 20190,
    "lastUpdate": "2025-04-13",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "APOBT",
    "search": "Apolipoprotein B",
    "category": "Chemistry",
    "status": "done",
    "progress": 45,
    "conf": "high",
    "est": {
      "cvi": 6.2,
      "cvg": 18.4
    },
    "opt": {
      "cva": 2.7,
      "bias": 6.8,
      "te": 14.3,
      "mau": 0.5
    },
    "des": {
      "cva": 4.7,
      "bias": 11.2,
      "te": 15.0,
      "mau": 1.0
    },
    "min": {
      "cva": 9.4,
      "bias": 18.5,
      "te": 35.5,
      "mau": 1.6
    },
    "acn": 20200,
    "lastUpdate": "2024-12-03",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ASLOT",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 65,
    "conf": "mid",
    "est": {
      "cvi": 5.0,
      "cvg": 8.6
    },
    "opt": {
      "cva": 3.3,
      "bias": 1.5,
      "te": 8.2,
      "mau": 1.0
    },
    "des": {
      "cva": 7.5,
      "bias": 12.2,
      "te": 16.3,
      "mau": 1.9
    },
    "min": {
      "cva": 9.7,
      "bias": 19.5,
      "te": 16.6,
      "mau": 2.0
    },
    "acn": 20210,
    "lastUpdate": "2026-03-16",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ASTP2",
    "search": "Aspartate transaminase (AST)",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.0,
      "cvg": 11.3
    },
    "opt": {
      "cva": 2.0,
      "bias": 3.4,
      "te": 10.3,
      "mau": 1.2
    },
    "des": {
      "cva": 4.5,
      "bias": 7.1,
      "te": 14.4,
      "mau": 2.8
    },
    "min": {
      "cva": 10.2,
      "bias": 4.7,
      "te": 16.0,
      "mau": 2.8
    },
    "acn": 20230,
    "lastUpdate": "2025-08-18",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "AT",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.2,
      "cvg": 9.3
    },
    "opt": {
      "cva": 4.6,
      "bias": 9.7,
      "te": 6.0,
      "mau": 1.4
    },
    "des": {
      "cva": 6.7,
      "bias": 12.9,
      "te": 24.0,
      "mau": 2.4
    },
    "min": {
      "cva": 11.3,
      "bias": 8.3,
      "te": 24.3,
      "mau": 3.2
    },
    "acn": 20240,
    "lastUpdate": "2026-02-22",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "B2MG",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 9.3,
      "cvg": 15.3
    },
    "opt": {
      "cva": 3.9,
      "bias": 2.0,
      "te": 5.5,
      "mau": 0.5
    },
    "des": {
      "cva": 3.9,
      "bias": 9.2,
      "te": 13.0,
      "mau": 0.9
    },
    "min": {
      "cva": 9.4,
      "bias": 17.1,
      "te": 35.2,
      "mau": 3.3
    },
    "acn": 20250,
    "lastUpdate": "2025-08-30",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "B2MGU",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 87,
    "conf": "high",
    "est": {
      "cvi": 5.0,
      "cvg": 10.5
    },
    "opt": {
      "cva": 2.0,
      "bias": 8.5,
      "te": 14.8,
      "mau": 0.7
    },
    "des": {
      "cva": 5.9,
      "bias": 7.6,
      "te": 18.9,
      "mau": 1.3
    },
    "min": {
      "cva": 11.3,
      "bias": 4.0,
      "te": 27.2,
      "mau": 2.2
    },
    "acn": 20251,
    "lastUpdate": "2025-01-08",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BA2QP",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.2,
      "cvg": 15.1
    },
    "opt": {
      "cva": 3.2,
      "bias": 2.1,
      "te": 5.5,
      "mau": 0.8
    },
    "des": {
      "cva": 7.4,
      "bias": 10.9,
      "te": 14.5,
      "mau": 2.6
    },
    "min": {
      "cva": 10.0,
      "bias": 11.9,
      "te": 38.6,
      "mau": 1.4
    },
    "acn": 20264,
    "lastUpdate": "2025-12-08",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BA2QP",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.1,
      "cvg": 6.2
    },
    "opt": {
      "cva": 4.8,
      "bias": 4.7,
      "te": 6.4,
      "mau": 0.2
    },
    "des": {
      "cva": 7.7,
      "bias": 10.1,
      "te": 12.1,
      "mau": 2.3
    },
    "min": {
      "cva": 3.9,
      "bias": 15.9,
      "te": 25.5,
      "mau": 4.9
    }
  },
  {
    "test": "BA2SP",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 1.7,
      "cvg": 19.3
    },
    "opt": {
      "cva": 2.9,
      "bias": 4.8,
      "te": 12.2,
      "mau": 0.9
    },
    "des": {
      "cva": 5.9,
      "bias": 10.2,
      "te": 19.7,
      "mau": 2.1
    },
    "min": {
      "cva": 5.2,
      "bias": 4.9,
      "te": 36.4,
      "mau": 1.2
    },
    "acn": 20261,
    "lastUpdate": "2025-05-26",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BILD2-D",
    "search": "Bilirubin - conjugated (direct)",
    "category": "Chemistry",
    "status": "done",
    "progress": 50,
    "conf": "high",
    "est": {
      "cvi": 4.4,
      "cvg": 6.3
    },
    "opt": {
      "cva": 3.0,
      "bias": 9.7,
      "te": 7.3,
      "mau": 0.6
    },
    "des": {
      "cva": 5.7,
      "bias": 4.6,
      "te": 22.8,
      "mau": 0.8
    },
    "min": {
      "cva": 8.5,
      "bias": 15.2,
      "te": 33.6,
      "mau": 2.4
    },
    "acn": 20300,
    "lastUpdate": "2025-10-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BILD2-J",
    "search": "Bilirubin - conjugated (direct)",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.3,
      "cvg": 5.5
    },
    "opt": {
      "cva": 3.8,
      "bias": 4.2,
      "te": 10.9,
      "mau": 0.5
    },
    "des": {
      "cva": 7.0,
      "bias": 11.9,
      "te": 24.7,
      "mau": 1.0
    },
    "min": {
      "cva": 6.5,
      "bias": 13.5,
      "te": 31.3,
      "mau": 4.1
    },
    "acn": 20301,
    "lastUpdate": "2024-12-23",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BILT3",
    "search": "Bilirubin",
    "category": "Chemistry",
    "status": "done",
    "progress": 26,
    "conf": "high",
    "est": {
      "cvi": 9.5,
      "cvg": 14.8
    },
    "opt": {
      "cva": 1.1,
      "bias": 1.9,
      "te": 5.3,
      "mau": 0.8
    },
    "des": {
      "cva": 2.6,
      "bias": 6.2,
      "te": 17.6,
      "mau": 1.7
    },
    "min": {
      "cva": 8.6,
      "bias": 4.3,
      "te": 38.2,
      "mau": 4.8
    },
    "acn": 20310,
    "lastUpdate": "2025-04-21",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BNZ2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.1,
      "cvg": 6.4
    },
    "opt": {
      "cva": 3.8,
      "bias": 6.0,
      "te": 6.0,
      "mau": 0.5
    },
    "des": {
      "cva": 3.0,
      "bias": 3.3,
      "te": 10.6,
      "mau": 2.3
    },
    "min": {
      "cva": 4.0,
      "bias": 19.6,
      "te": 28.6,
      "mau": 2.6
    },
    "acn": 20287,
    "lastUpdate": "2025-12-17",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BZ1Q2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.5,
      "cvg": 17.4
    },
    "opt": {
      "cva": 3.5,
      "bias": 1.4,
      "te": 11.4,
      "mau": 1.1
    },
    "des": {
      "cva": 2.6,
      "bias": 11.3,
      "te": 20.1,
      "mau": 0.5
    },
    "min": {
      "cva": 10.6,
      "bias": 15.9,
      "te": 31.2,
      "mau": 1.3
    },
    "acn": 20280,
    "lastUpdate": "2025-06-10",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BZ1S2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.7,
      "cvg": 13.2
    },
    "opt": {
      "cva": 1.8,
      "bias": 4.5,
      "te": 7.8,
      "mau": 0.9
    },
    "des": {
      "cva": 7.5,
      "bias": 6.6,
      "te": 21.0,
      "mau": 2.2
    },
    "min": {
      "cva": 5.6,
      "bias": 18.2,
      "te": 19.4,
      "mau": 2.3
    },
    "acn": 20284,
    "lastUpdate": "2025-05-12",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BZ2Q2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.8,
      "cvg": 16.6
    },
    "opt": {
      "cva": 4.5,
      "bias": 1.6,
      "te": 14.5,
      "mau": 1.1
    },
    "des": {
      "cva": 3.7,
      "bias": 9.3,
      "te": 17.1,
      "mau": 2.3
    },
    "min": {
      "cva": 3.0,
      "bias": 19.7,
      "te": 24.2,
      "mau": 4.9
    },
    "acn": 20281,
    "lastUpdate": "2026-02-24",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BZ2S2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.3,
      "cvg": 14.6
    },
    "opt": {
      "cva": 3.9,
      "bias": 3.2,
      "te": 11.6,
      "mau": 1.0
    },
    "des": {
      "cva": 6.9,
      "bias": 14.8,
      "te": 11.5,
      "mau": 2.9
    },
    "min": {
      "cva": 5.6,
      "bias": 3.6,
      "te": 19.8,
      "mau": 1.5
    },
    "acn": 20285,
    "lastUpdate": "2025-03-07",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BZ3Q2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.7,
      "cvg": 18.8
    },
    "opt": {
      "cva": 1.5,
      "bias": 1.9,
      "te": 11.4,
      "mau": 0.2
    },
    "des": {
      "cva": 6.5,
      "bias": 4.8,
      "te": 23.5,
      "mau": 1.6
    },
    "min": {
      "cva": 10.3,
      "bias": 16.1,
      "te": 35.6,
      "mau": 1.4
    },
    "acn": 20282,
    "lastUpdate": "2026-01-26",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BZ3‐QP",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.1,
      "cvg": 8.5
    },
    "opt": {
      "cva": 3.6,
      "bias": 1.6,
      "te": 7.9,
      "mau": 0.4
    },
    "des": {
      "cva": 4.1,
      "bias": 6.2,
      "te": 20.5,
      "mau": 1.0
    },
    "min": {
      "cva": 10.3,
      "bias": 7.7,
      "te": 27.3,
      "mau": 3.1
    },
    "acn": 20288,
    "lastUpdate": "2025-08-04",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BZ3S2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.5,
      "cvg": 13.2
    },
    "opt": {
      "cva": 3.8,
      "bias": 9.5,
      "te": 13.1,
      "mau": 0.8
    },
    "des": {
      "cva": 5.8,
      "bias": 9.8,
      "te": 11.2,
      "mau": 1.1
    },
    "min": {
      "cva": 11.7,
      "bias": 17.4,
      "te": 19.6,
      "mau": 4.3
    },
    "acn": 20286,
    "lastUpdate": "2025-06-03",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "BZQ1C",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.0,
      "cvg": 7.2
    },
    "opt": {
      "cva": 4.3,
      "bias": 10.0,
      "te": 9.3,
      "mau": 0.5
    },
    "des": {
      "cva": 6.3,
      "bias": 13.3,
      "te": 22.4,
      "mau": 1.5
    },
    "min": {
      "cva": 8.5,
      "bias": 14.1,
      "te": 37.8,
      "mau": 1.4
    },
    "acn": 20283,
    "lastUpdate": "2025-01-10",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "C3C-2",
    "search": "Complement 3 (C3)",
    "category": "Chemistry",
    "status": "working",
    "progress": 42,
    "conf": "mid",
    "est": {
      "cvi": 6.3,
      "cvg": 8.4
    },
    "opt": {
      "cva": 4.7,
      "bias": 10.0,
      "te": 10.6,
      "mau": 1.1
    },
    "des": {
      "cva": 4.2,
      "bias": 12.7,
      "te": 16.2,
      "mau": 2.6
    },
    "min": {
      "cva": 6.2,
      "bias": 4.7,
      "te": 15.1,
      "mau": 4.8
    },
    "acn": 20320,
    "lastUpdate": "2026-01-12",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "C4-2",
    "search": "Complement 4 (C4)",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.4,
      "cvg": 19.5
    },
    "opt": {
      "cva": 2.3,
      "bias": 5.9,
      "te": 6.9,
      "mau": 1.1
    },
    "des": {
      "cva": 5.1,
      "bias": 6.6,
      "te": 24.3,
      "mau": 1.8
    },
    "min": {
      "cva": 3.3,
      "bias": 16.2,
      "te": 27.8,
      "mau": 4.1
    },
    "acn": 20330,
    "lastUpdate": "2025-02-04",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CA2",
    "search": "Calcium (Ca)",
    "category": "Chemistry",
    "status": "working",
    "progress": 64,
    "conf": "mid",
    "est": {
      "cvi": 2.9,
      "cvg": 14.1
    },
    "opt": {
      "cva": 2.1,
      "bias": 5.4,
      "te": 9.9,
      "mau": 0.2
    },
    "des": {
      "cva": 6.3,
      "bias": 5.8,
      "te": 17.9,
      "mau": 1.7
    },
    "min": {
      "cva": 9.7,
      "bias": 11.3,
      "te": 27.0,
      "mau": 3.9
    },
    "acn": 20340,
    "lastUpdate": "2025-07-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CA2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 48,
    "conf": "high",
    "est": {
      "cvi": 3.2,
      "cvg": 16.0
    },
    "opt": {
      "cva": 3.2,
      "bias": 6.7,
      "te": 13.3,
      "mau": 0.7
    },
    "des": {
      "cva": 4.6,
      "bias": 9.0,
      "te": 23.3,
      "mau": 1.7
    },
    "min": {
      "cva": 10.8,
      "bias": 19.1,
      "te": 34.6,
      "mau": 3.7
    },
    "acn": 20341,
    "lastUpdate": "2025-06-30",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CARB4",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.9,
      "cvg": 9.2
    },
    "opt": {
      "cva": 1.8,
      "bias": 8.4,
      "te": 8.8,
      "mau": 1.0
    },
    "des": {
      "cva": 5.5,
      "bias": 4.5,
      "te": 10.8,
      "mau": 0.7
    },
    "min": {
      "cva": 6.3,
      "bias": 13.9,
      "te": 29.2,
      "mau": 1.5
    },
    "acn": 20350,
    "lastUpdate": "2025-06-18",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CER",
    "search": "Ceruloplasmin",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.8,
      "cvg": 19.6
    },
    "opt": {
      "cva": 4.6,
      "bias": 6.4,
      "te": 12.5,
      "mau": 1.1
    },
    "des": {
      "cva": 4.4,
      "bias": 12.9,
      "te": 14.5,
      "mau": 1.8
    },
    "min": {
      "cva": 3.5,
      "bias": 7.9,
      "te": 29.7,
      "mau": 3.8
    },
    "acn": 20360,
    "lastUpdate": "2025-11-15",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CHE2-D",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 1.6,
      "cvg": 16.8
    },
    "opt": {
      "cva": 1.6,
      "bias": 2.2,
      "te": 14.1,
      "mau": 1.5
    },
    "des": {
      "cva": 5.1,
      "bias": 4.2,
      "te": 22.8,
      "mau": 1.2
    },
    "min": {
      "cva": 8.4,
      "bias": 18.4,
      "te": 15.5,
      "mau": 2.0
    },
    "acn": 20371,
    "lastUpdate": "2025-02-06",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CHE2-T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.3,
      "cvg": 8.2
    },
    "opt": {
      "cva": 4.5,
      "bias": 5.1,
      "te": 8.8,
      "mau": 0.9
    },
    "des": {
      "cva": 5.3,
      "bias": 10.8,
      "te": 19.0,
      "mau": 1.8
    },
    "min": {
      "cva": 5.6,
      "bias": 18.9,
      "te": 16.7,
      "mau": 2.4
    },
    "acn": 20370,
    "lastUpdate": "2026-03-22",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CHOL2-A",
    "search": "Cholesterol",
    "category": "Chemistry",
    "status": "working",
    "progress": 34,
    "conf": "high",
    "est": {
      "cvi": 2.5,
      "cvg": 11.5
    },
    "opt": {
      "cva": 5.0,
      "bias": 6.2,
      "te": 5.6,
      "mau": 1.4
    },
    "des": {
      "cva": 6.5,
      "bias": 10.7,
      "te": 21.5,
      "mau": 0.7
    },
    "min": {
      "cva": 11.4,
      "bias": 19.2,
      "te": 27.1,
      "mau": 1.6
    },
    "acn": 20410,
    "lastUpdate": "2025-01-25",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CHOL2-I",
    "search": "Cholesterol",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.2,
      "cvg": 12.3
    },
    "opt": {
      "cva": 1.8,
      "bias": 8.1,
      "te": 9.6,
      "mau": 1.2
    },
    "des": {
      "cva": 3.4,
      "bias": 3.7,
      "te": 23.2,
      "mau": 3.0
    },
    "min": {
      "cva": 8.1,
      "bias": 9.4,
      "te": 30.3,
      "mau": 4.5
    },
    "acn": 20411,
    "lastUpdate": "2025-02-25",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CK2",
    "search": "Creatine Kinase",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.3,
      "cvg": 17.5
    },
    "opt": {
      "cva": 2.7,
      "bias": 9.9,
      "te": 8.0,
      "mau": 1.0
    },
    "des": {
      "cva": 7.6,
      "bias": 3.5,
      "te": 13.5,
      "mau": 1.8
    },
    "min": {
      "cva": 10.9,
      "bias": 15.5,
      "te": 33.8,
      "mau": 3.7
    },
    "acn": 20420,
    "lastUpdate": "2026-03-24",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CKMB2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.0,
      "cvg": 13.3
    },
    "opt": {
      "cva": 1.2,
      "bias": 6.7,
      "te": 14.8,
      "mau": 1.4
    },
    "des": {
      "cva": 2.6,
      "bias": 9.2,
      "te": 22.2,
      "mau": 2.8
    },
    "min": {
      "cva": 10.2,
      "bias": 8.3,
      "te": 32.3,
      "mau": 2.5
    },
    "acn": 20430,
    "lastUpdate": "2026-01-25",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CO1Q2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.3,
      "cvg": 12.7
    },
    "opt": {
      "cva": 3.5,
      "bias": 2.6,
      "te": 8.7,
      "mau": 0.7
    },
    "des": {
      "cva": 3.7,
      "bias": 10.2,
      "te": 17.7,
      "mau": 0.7
    },
    "min": {
      "cva": 7.4,
      "bias": 9.9,
      "te": 21.3,
      "mau": 1.5
    },
    "acn": 20450,
    "lastUpdate": "2025-10-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CO1‑QP",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 8.8,
      "cvg": 19.9
    },
    "opt": {
      "cva": 3.3,
      "bias": 7.9,
      "te": 6.4,
      "mau": 0.7
    },
    "des": {
      "cva": 7.4,
      "bias": 7.7,
      "te": 21.2,
      "mau": 2.1
    },
    "min": {
      "cva": 11.5,
      "bias": 18.5,
      "te": 18.4,
      "mau": 1.3
    },
    "acn": 20456,
    "lastUpdate": "2025-01-29",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CO1S2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 8.3,
      "cvg": 18.8
    },
    "opt": {
      "cva": 3.4,
      "bias": 9.5,
      "te": 11.3,
      "mau": 1.1
    },
    "des": {
      "cva": 5.6,
      "bias": 4.7,
      "te": 21.0,
      "mau": 1.6
    },
    "min": {
      "cva": 9.7,
      "bias": 4.6,
      "te": 20.7,
      "mau": 4.1
    },
    "acn": 20452,
    "lastUpdate": "2025-11-05",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CO2-L",
    "search": "Actual bicarbonate",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.5,
      "cvg": 14.2
    },
    "opt": {
      "cva": 2.9,
      "bias": 2.8,
      "te": 7.0,
      "mau": 1.2
    },
    "des": {
      "cva": 3.6,
      "bias": 7.3,
      "te": 23.9,
      "mau": 3.0
    },
    "min": {
      "cva": 10.2,
      "bias": 5.2,
      "te": 22.7,
      "mau": 3.2
    },
    "acn": 20440,
    "lastUpdate": "2025-09-11",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CO3Q2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.0,
      "cvg": 12.3
    },
    "opt": {
      "cva": 2.2,
      "bias": 7.9,
      "te": 11.1,
      "mau": 0.5
    },
    "des": {
      "cva": 4.5,
      "bias": 14.6,
      "te": 21.9,
      "mau": 2.2
    },
    "min": {
      "cva": 4.0,
      "bias": 13.8,
      "te": 26.0,
      "mau": 3.8
    },
    "acn": 20451,
    "lastUpdate": "2025-11-01",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CO3QC",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.5,
      "cvg": 6.8
    },
    "opt": {
      "cva": 1.7,
      "bias": 2.8,
      "te": 7.9,
      "mau": 0.5
    },
    "des": {
      "cva": 5.4,
      "bias": 14.3,
      "te": 17.0,
      "mau": 1.5
    },
    "min": {
      "cva": 10.5,
      "bias": 14.1,
      "te": 39.0,
      "mau": 1.9
    },
    "acn": 20454,
    "lastUpdate": "2025-04-20",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CO3S2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 2.8,
      "cvg": 11.6
    },
    "opt": {
      "cva": 1.3,
      "bias": 3.3,
      "te": 7.6,
      "mau": 0.9
    },
    "des": {
      "cva": 5.7,
      "bias": 12.5,
      "te": 14.5,
      "mau": 2.0
    },
    "min": {
      "cva": 5.7,
      "bias": 5.3,
      "te": 28.6,
      "mau": 4.4
    },
    "acn": 20453,
    "lastUpdate": "2025-12-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CREJ2",
    "search": "Creatinine",
    "category": "Chemistry",
    "status": "done",
    "progress": 21,
    "conf": "mid",
    "est": {
      "cvi": 3.6,
      "cvg": 15.5
    },
    "opt": {
      "cva": 3.0,
      "bias": 3.7,
      "te": 7.8,
      "mau": 0.4
    },
    "des": {
      "cva": 7.7,
      "bias": 2.1,
      "te": 22.3,
      "mau": 0.8
    },
    "min": {
      "cva": 8.0,
      "bias": 8.1,
      "te": 33.4,
      "mau": 5.0
    },
    "acn": 20470,
    "lastUpdate": "2025-09-06",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CREJ2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 22,
    "conf": "high",
    "est": {
      "cvi": 8.8,
      "cvg": 8.2
    },
    "opt": {
      "cva": 1.3,
      "bias": 8.5,
      "te": 9.6,
      "mau": 1.2
    },
    "des": {
      "cva": 3.9,
      "bias": 4.7,
      "te": 17.9,
      "mau": 2.6
    },
    "min": {
      "cva": 7.7,
      "bias": 10.9,
      "te": 17.7,
      "mau": 3.5
    },
    "acn": 20471,
    "lastUpdate": "2026-03-03",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CREP2",
    "search": "Creatinine",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.7,
      "cvg": 7.8
    },
    "opt": {
      "cva": 1.2,
      "bias": 8.2,
      "te": 13.3,
      "mau": 0.3
    },
    "des": {
      "cva": 4.8,
      "bias": 11.8,
      "te": 16.5,
      "mau": 2.6
    },
    "min": {
      "cva": 6.3,
      "bias": 12.4,
      "te": 19.8,
      "mau": 4.5
    },
    "acn": 20460,
    "lastUpdate": "2026-01-14",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CREP2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 32,
    "conf": "mid",
    "est": {
      "cvi": 1.1,
      "cvg": 9.9
    },
    "opt": {
      "cva": 4.2,
      "bias": 5.0,
      "te": 7.4,
      "mau": 1.2
    },
    "des": {
      "cva": 4.7,
      "bias": 8.9,
      "te": 19.1,
      "mau": 1.3
    },
    "min": {
      "cva": 11.0,
      "bias": 17.1,
      "te": 38.9,
      "mau": 3.8
    },
    "acn": 20461,
    "lastUpdate": "2025-12-10",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CRP4",
    "search": "C-reactive protein (CRP)",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.7,
      "cvg": 18.9
    },
    "opt": {
      "cva": 3.6,
      "bias": 2.2,
      "te": 12.5,
      "mau": 1.2
    },
    "des": {
      "cva": 7.5,
      "bias": 7.8,
      "te": 14.2,
      "mau": 2.0
    },
    "min": {
      "cva": 6.1,
      "bias": 3.2,
      "te": 27.1,
      "mau": 1.3
    },
    "acn": 20500,
    "lastUpdate": "2025-08-07",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CRP-HS",
    "search": "C-reactive protein (CRP) - high-sensitive",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 10.0,
      "cvg": 7.1
    },
    "opt": {
      "cva": 3.6,
      "bias": 7.2,
      "te": 7.3,
      "mau": 0.6
    },
    "des": {
      "cva": 6.9,
      "bias": 6.6,
      "te": 20.5,
      "mau": 1.6
    },
    "min": {
      "cva": 10.4,
      "bias": 9.1,
      "te": 26.6,
      "mau": 1.9
    },
    "acn": 20480,
    "lastUpdate": "2025-03-29",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "CYSC2",
    "search": "Cystatin C",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.1,
      "cvg": 10.1
    },
    "opt": {
      "cva": 1.8,
      "bias": 9.5,
      "te": 10.7,
      "mau": 1.0
    },
    "des": {
      "cva": 5.9,
      "bias": 14.7,
      "te": 22.7,
      "mau": 1.7
    },
    "min": {
      "cva": 4.9,
      "bias": 12.1,
      "te": 19.3,
      "mau": 3.7
    },
    "acn": 20510,
    "lastUpdate": "2025-09-29",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "DDI2‑C",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.6,
      "cvg": 16.3
    },
    "opt": {
      "cva": 1.8,
      "bias": 8.1,
      "te": 5.1,
      "mau": 0.6
    },
    "des": {
      "cva": 6.4,
      "bias": 2.7,
      "te": 23.1,
      "mau": 2.7
    },
    "min": {
      "cva": 9.4,
      "bias": 4.4,
      "te": 29.7,
      "mau": 3.1
    },
    "acn": 20530,
    "lastUpdate": "2025-11-14",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "DDI2‑H",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.5,
      "cvg": 19.5
    },
    "opt": {
      "cva": 2.5,
      "bias": 8.5,
      "te": 9.5,
      "mau": 0.9
    },
    "des": {
      "cva": 3.3,
      "bias": 10.8,
      "te": 21.6,
      "mau": 2.2
    },
    "min": {
      "cva": 11.4,
      "bias": 17.1,
      "te": 35.8,
      "mau": 3.9
    },
    "acn": 20531,
    "lastUpdate": "2025-10-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "DIG",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.9,
      "cvg": 10.5
    },
    "opt": {
      "cva": 1.6,
      "bias": 6.1,
      "te": 13.8,
      "mau": 0.4
    },
    "des": {
      "cva": 2.1,
      "bias": 8.4,
      "te": 23.9,
      "mau": 0.5
    },
    "min": {
      "cva": 7.6,
      "bias": 19.5,
      "te": 18.2,
      "mau": 4.0
    },
    "acn": 20540,
    "lastUpdate": "2025-01-10",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ETOH2",
    "search": "Ethanol level",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.2,
      "cvg": 18.4
    },
    "opt": {
      "cva": 4.3,
      "bias": 9.3,
      "te": 8.7,
      "mau": 1.2
    },
    "des": {
      "cva": 6.1,
      "bias": 12.8,
      "te": 19.3,
      "mau": 1.1
    },
    "min": {
      "cva": 5.1,
      "bias": 8.2,
      "te": 18.1,
      "mau": 1.2
    },
    "acn": 20560,
    "lastUpdate": "2025-02-22",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ETOH2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.8,
      "cvg": 11.5
    },
    "opt": {
      "cva": 3.7,
      "bias": 3.0,
      "te": 9.1,
      "mau": 0.9
    },
    "des": {
      "cva": 4.7,
      "bias": 8.0,
      "te": 24.4,
      "mau": 0.9
    },
    "min": {
      "cva": 3.0,
      "bias": 3.9,
      "te": 27.2,
      "mau": 4.9
    },
    "acn": 20561,
    "lastUpdate": "2025-10-22",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "FERR4",
    "search": "Ferritin",
    "category": "Chemistry",
    "status": "done",
    "progress": 45,
    "conf": "mid",
    "est": {
      "cvi": 9.7,
      "cvg": 13.5
    },
    "opt": {
      "cva": 1.5,
      "bias": 3.9,
      "te": 12.0,
      "mau": 0.6
    },
    "des": {
      "cva": 7.4,
      "bias": 10.7,
      "te": 18.2,
      "mau": 1.4
    },
    "min": {
      "cva": 7.1,
      "bias": 10.2,
      "te": 38.3,
      "mau": 4.2
    },
    "acn": 20570,
    "lastUpdate": "2025-10-15",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "FRA",
    "search": "Fructosamine",
    "category": "Chemistry",
    "status": "done",
    "progress": 33,
    "conf": "mid",
    "est": {
      "cvi": 4.9,
      "cvg": 5.3
    },
    "opt": {
      "cva": 4.0,
      "bias": 4.1,
      "te": 7.6,
      "mau": 0.8
    },
    "des": {
      "cva": 7.8,
      "bias": 5.1,
      "te": 18.6,
      "mau": 2.0
    },
    "min": {
      "cva": 8.7,
      "bias": 18.7,
      "te": 23.0,
      "mau": 2.2
    },
    "acn": 20580,
    "lastUpdate": "2025-05-30",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "GENT2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.6,
      "cvg": 10.4
    },
    "opt": {
      "cva": 3.8,
      "bias": 3.3,
      "te": 5.5,
      "mau": 0.7
    },
    "des": {
      "cva": 3.3,
      "bias": 7.4,
      "te": 21.3,
      "mau": 1.4
    },
    "min": {
      "cva": 11.3,
      "bias": 7.8,
      "te": 27.4,
      "mau": 2.5
    },
    "acn": 20590,
    "lastUpdate": "2025-11-01",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "GGT2-I",
    "search": "g-glutamyl transferase activity",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.1,
      "cvg": 19.0
    },
    "opt": {
      "cva": 4.6,
      "bias": 3.3,
      "te": 5.8,
      "mau": 0.3
    },
    "des": {
      "cva": 7.7,
      "bias": 4.7,
      "te": 22.0,
      "mau": 1.6
    },
    "min": {
      "cva": 3.4,
      "bias": 8.8,
      "te": 23.3,
      "mau": 2.8
    },
    "acn": 20600,
    "lastUpdate": "2025-10-23",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "GGT2-S",
    "search": "g-glutamyl transferase activity",
    "category": "Chemistry",
    "status": "done",
    "progress": 56,
    "conf": "high",
    "est": {
      "cvi": 6.6,
      "cvg": 12.7
    },
    "opt": {
      "cva": 3.6,
      "bias": 3.0,
      "te": 12.3,
      "mau": 0.3
    },
    "des": {
      "cva": 6.0,
      "bias": 5.8,
      "te": 15.7,
      "mau": 2.7
    },
    "min": {
      "cva": 7.9,
      "bias": 11.1,
      "te": 24.6,
      "mau": 4.6
    },
    "acn": 20601,
    "lastUpdate": "2025-11-19",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "GLUC3",
    "search": "Glucose",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.5,
      "cvg": 12.7
    },
    "opt": {
      "cva": 2.3,
      "bias": 4.2,
      "te": 12.6,
      "mau": 0.6
    },
    "des": {
      "cva": 4.2,
      "bias": 4.8,
      "te": 23.6,
      "mau": 2.3
    },
    "min": {
      "cva": 6.5,
      "bias": 13.1,
      "te": 37.1,
      "mau": 1.0
    },
    "acn": 20630,
    "lastUpdate": "2026-01-18",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "GLUC3C",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.1,
      "cvg": 10.5
    },
    "opt": {
      "cva": 3.2,
      "bias": 8.2,
      "te": 9.7,
      "mau": 0.7
    },
    "des": {
      "cva": 3.8,
      "bias": 3.1,
      "te": 19.9,
      "mau": 1.6
    },
    "min": {
      "cva": 11.6,
      "bias": 19.9,
      "te": 37.6,
      "mau": 2.6
    },
    "acn": 20632,
    "lastUpdate": "2025-07-20",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "GLUC3U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.0,
      "cvg": 10.9
    },
    "opt": {
      "cva": 3.5,
      "bias": 2.2,
      "te": 8.4,
      "mau": 0.7
    },
    "des": {
      "cva": 3.6,
      "bias": 9.5,
      "te": 10.3,
      "mau": 0.9
    },
    "min": {
      "cva": 6.4,
      "bias": 8.3,
      "te": 18.8,
      "mau": 4.1
    },
    "acn": 20631,
    "lastUpdate": "2025-01-20",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "HAPT2",
    "search": "Haptoglobin",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.5,
      "cvg": 17.7
    },
    "opt": {
      "cva": 1.7,
      "bias": 2.6,
      "te": 8.4,
      "mau": 1.1
    },
    "des": {
      "cva": 6.9,
      "bias": 9.9,
      "te": 20.7,
      "mau": 2.7
    },
    "min": {
      "cva": 9.7,
      "bias": 16.0,
      "te": 36.6,
      "mau": 1.1
    },
    "acn": 20640,
    "lastUpdate": "2025-11-22",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "HCYS",
    "search": "Homocysteine - total (tHcy)",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.8,
      "cvg": 13.1
    },
    "opt": {
      "cva": 2.1,
      "bias": 7.4,
      "te": 11.1,
      "mau": 0.5
    },
    "des": {
      "cva": 2.1,
      "bias": 15.0,
      "te": 21.3,
      "mau": 2.6
    },
    "min": {
      "cva": 7.1,
      "bias": 5.5,
      "te": 30.3,
      "mau": 3.7
    },
    "acn": 20700,
    "lastUpdate": "2026-03-12",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "HDLC4",
    "search": "HDL cholesterol",
    "category": "Chemistry",
    "status": "done",
    "progress": 30,
    "conf": "high",
    "est": {
      "cvi": 3.3,
      "cvg": 9.8
    },
    "opt": {
      "cva": 3.0,
      "bias": 6.2,
      "te": 13.8,
      "mau": 1.1
    },
    "des": {
      "cva": 5.2,
      "bias": 10.6,
      "te": 20.3,
      "mau": 1.1
    },
    "min": {
      "cva": 10.3,
      "bias": 3.4,
      "te": 16.4,
      "mau": 2.0
    },
    "acn": 20710,
    "lastUpdate": "2025-09-13",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGA2",
    "search": "Immunoglobulin A (IgA)",
    "category": "Chemistry",
    "status": "done",
    "progress": 22,
    "conf": "mid",
    "est": {
      "cvi": 9.0,
      "cvg": 8.1
    },
    "opt": {
      "cva": 3.5,
      "bias": 2.2,
      "te": 5.8,
      "mau": 0.6
    },
    "des": {
      "cva": 3.2,
      "bias": 11.1,
      "te": 11.0,
      "mau": 2.3
    },
    "min": {
      "cva": 10.2,
      "bias": 19.6,
      "te": 15.7,
      "mau": 3.1
    },
    "acn": 20720,
    "lastUpdate": "2024-12-14",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGA2-P",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.6,
      "cvg": 5.2
    },
    "opt": {
      "cva": 3.4,
      "bias": 3.1,
      "te": 8.0,
      "mau": 0.8
    },
    "des": {
      "cva": 5.4,
      "bias": 2.3,
      "te": 21.1,
      "mau": 1.9
    },
    "min": {
      "cva": 10.0,
      "bias": 6.5,
      "te": 26.2,
      "mau": 2.2
    },
    "acn": 20721,
    "lastUpdate": "2025-11-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGA-CR",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.9,
      "cvg": 17.0
    },
    "opt": {
      "cva": 1.9,
      "bias": 9.8,
      "te": 8.5,
      "mau": 0.3
    },
    "des": {
      "cva": 2.3,
      "bias": 14.7,
      "te": 17.2,
      "mau": 0.9
    },
    "min": {
      "cva": 6.2,
      "bias": 6.9,
      "te": 37.2,
      "mau": 1.7
    },
    "acn": 20730,
    "lastUpdate": "2025-06-04",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGA-SR",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.2,
      "cvg": 14.0
    },
    "opt": {
      "cva": 1.6,
      "bias": 3.6,
      "te": 8.8,
      "mau": 1.1
    },
    "des": {
      "cva": 3.1,
      "bias": 14.8,
      "te": 17.7,
      "mau": 0.9
    },
    "min": {
      "cva": 6.4,
      "bias": 12.2,
      "te": 16.2,
      "mau": 3.4
    },
    "acn": 20731,
    "lastUpdate": "2025-09-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGG2",
    "search": "Immunoglobulin G (IgG)",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 3.9,
      "cvg": 6.0
    },
    "opt": {
      "cva": 3.2,
      "bias": 7.1,
      "te": 10.5,
      "mau": 1.3
    },
    "des": {
      "cva": 7.9,
      "bias": 7.4,
      "te": 24.3,
      "mau": 1.2
    },
    "min": {
      "cva": 10.1,
      "bias": 13.2,
      "te": 31.4,
      "mau": 2.3
    },
    "acn": 20740,
    "lastUpdate": "2026-02-24",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGG2C",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.1,
      "cvg": 17.1
    },
    "opt": {
      "cva": 3.9,
      "bias": 5.6,
      "te": 11.8,
      "mau": 0.2
    },
    "des": {
      "cva": 5.6,
      "bias": 11.9,
      "te": 17.8,
      "mau": 0.8
    },
    "min": {
      "cva": 10.9,
      "bias": 6.8,
      "te": 22.9,
      "mau": 1.5
    },
    "acn": 20741,
    "lastUpdate": "2025-03-05",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGG2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.6,
      "cvg": 8.4
    },
    "opt": {
      "cva": 1.2,
      "bias": 6.0,
      "te": 13.6,
      "mau": 0.3
    },
    "des": {
      "cva": 5.1,
      "bias": 13.6,
      "te": 13.3,
      "mau": 2.5
    },
    "min": {
      "cva": 5.9,
      "bias": 10.2,
      "te": 24.8,
      "mau": 4.9
    },
    "acn": 20743,
    "lastUpdate": "2025-05-09",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGM2",
    "search": "Immunoglobulin M (IgM)",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.1,
      "cvg": 8.0
    },
    "opt": {
      "cva": 1.2,
      "bias": 6.3,
      "te": 10.3,
      "mau": 1.3
    },
    "des": {
      "cva": 6.6,
      "bias": 14.9,
      "te": 16.0,
      "mau": 1.3
    },
    "min": {
      "cva": 10.5,
      "bias": 13.2,
      "te": 30.8,
      "mau": 1.1
    },
    "acn": 20750,
    "lastUpdate": "2025-01-14",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGM2-P",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 90,
    "conf": "mid",
    "est": {
      "cvi": 1.8,
      "cvg": 12.3
    },
    "opt": {
      "cva": 4.9,
      "bias": 9.9,
      "te": 15.0,
      "mau": 1.2
    },
    "des": {
      "cva": 3.0,
      "bias": 2.8,
      "te": 20.2,
      "mau": 2.2
    },
    "min": {
      "cva": 10.9,
      "bias": 6.4,
      "te": 28.1,
      "mau": 2.3
    },
    "acn": 20751,
    "lastUpdate": "2025-12-04",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGM-CR",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 6.9,
      "cvg": 15.6
    },
    "opt": {
      "cva": 1.6,
      "bias": 4.7,
      "te": 6.3,
      "mau": 0.6
    },
    "des": {
      "cva": 2.9,
      "bias": 14.5,
      "te": 11.2,
      "mau": 1.3
    },
    "min": {
      "cva": 8.8,
      "bias": 13.0,
      "te": 39.5,
      "mau": 4.6
    },
    "acn": 20760,
    "lastUpdate": "2025-04-25",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IGM-SR",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.7,
      "cvg": 8.6
    },
    "opt": {
      "cva": 2.9,
      "bias": 8.5,
      "te": 11.5,
      "mau": 0.2
    },
    "des": {
      "cva": 5.7,
      "bias": 7.3,
      "te": 24.2,
      "mau": 1.1
    },
    "min": {
      "cva": 9.5,
      "bias": 5.4,
      "te": 33.4,
      "mau": 1.7
    },
    "acn": 20761,
    "lastUpdate": "2025-09-18",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "IRON2",
    "search": "Iron",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.3,
      "cvg": 13.9
    },
    "opt": {
      "cva": 2.1,
      "bias": 4.6,
      "te": 5.3,
      "mau": 1.3
    },
    "des": {
      "cva": 4.7,
      "bias": 4.9,
      "te": 24.5,
      "mau": 2.4
    },
    "min": {
      "cva": 9.7,
      "bias": 7.7,
      "te": 38.1,
      "mau": 3.1
    },
    "acn": 20770,
    "lastUpdate": "2025-05-13",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ISE CL",
    "search": "Chloride",
    "category": "Chemistry",
    "status": "done",
    "progress": 38,
    "conf": "high",
    "est": {
      "cvi": 2.2,
      "cvg": 14.3
    },
    "opt": {
      "cva": 1.7,
      "bias": 4.1,
      "te": 12.6,
      "mau": 0.7
    },
    "des": {
      "cva": 7.3,
      "bias": 3.0,
      "te": 17.0,
      "mau": 2.9
    },
    "min": {
      "cva": 10.5,
      "bias": 4.4,
      "te": 28.8,
      "mau": 3.9
    },
    "acn": 29090,
    "lastUpdate": "2025-03-24",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ISE CL-P",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 52,
    "conf": "mid",
    "est": {
      "cvi": 3.0,
      "cvg": 19.6
    },
    "opt": {
      "cva": 1.0,
      "bias": 8.3,
      "te": 12.1,
      "mau": 1.2
    },
    "des": {
      "cva": 4.2,
      "bias": 14.2,
      "te": 23.7,
      "mau": 2.9
    },
    "min": {
      "cva": 7.7,
      "bias": 14.0,
      "te": 16.5,
      "mau": 3.5
    },
    "acn": 29092,
    "lastUpdate": "2025-12-27",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ISE CL-U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.2,
      "cvg": 17.7
    },
    "opt": {
      "cva": 2.3,
      "bias": 5.1,
      "te": 11.3,
      "mau": 0.8
    },
    "des": {
      "cva": 7.3,
      "bias": 10.1,
      "te": 14.2,
      "mau": 1.1
    },
    "min": {
      "cva": 6.5,
      "bias": 13.6,
      "te": 19.8,
      "mau": 2.1
    },
    "acn": 29091,
    "lastUpdate": "2024-12-26",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ISE K",
    "search": "Potassium",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.9,
      "cvg": 12.8
    },
    "opt": {
      "cva": 4.3,
      "bias": 8.2,
      "te": 10.5,
      "mau": 0.8
    },
    "des": {
      "cva": 6.7,
      "bias": 7.3,
      "te": 12.7,
      "mau": 2.3
    },
    "min": {
      "cva": 9.0,
      "bias": 7.7,
      "te": 17.4,
      "mau": 2.9
    },
    "acn": 29080,
    "lastUpdate": "2024-11-19",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ISE K-P",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.4,
      "cvg": 7.2
    },
    "opt": {
      "cva": 2.5,
      "bias": 8.5,
      "te": 11.1,
      "mau": 0.8
    },
    "des": {
      "cva": 2.8,
      "bias": 2.6,
      "te": 13.6,
      "mau": 2.1
    },
    "min": {
      "cva": 11.0,
      "bias": 18.7,
      "te": 31.1,
      "mau": 1.1
    },
    "acn": 29082,
    "lastUpdate": "2025-12-21",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ISE K-U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.7,
      "cvg": 9.6
    },
    "opt": {
      "cva": 1.9,
      "bias": 5.8,
      "te": 5.2,
      "mau": 0.9
    },
    "des": {
      "cva": 4.1,
      "bias": 3.2,
      "te": 15.2,
      "mau": 0.6
    },
    "min": {
      "cva": 11.1,
      "bias": 4.3,
      "te": 16.6,
      "mau": 4.5
    },
    "acn": 29081,
    "lastUpdate": "2025-05-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ISE Na",
    "search": "Sodium",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.6,
      "cvg": 11.2
    },
    "opt": {
      "cva": 2.3,
      "bias": 2.9,
      "te": 12.2,
      "mau": 1.3
    },
    "des": {
      "cva": 3.2,
      "bias": 10.2,
      "te": 12.2,
      "mau": 0.9
    },
    "min": {
      "cva": 11.4,
      "bias": 15.9,
      "te": 16.6,
      "mau": 2.4
    },
    "acn": 29070,
    "lastUpdate": "2026-03-22",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ISE Na-P",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 1.6,
      "cvg": 10.2
    },
    "opt": {
      "cva": 2.0,
      "bias": 5.5,
      "te": 6.2,
      "mau": 0.5
    },
    "des": {
      "cva": 4.1,
      "bias": 13.6,
      "te": 20.5,
      "mau": 0.6
    },
    "min": {
      "cva": 8.2,
      "bias": 13.8,
      "te": 33.0,
      "mau": 4.7
    },
    "acn": 29072,
    "lastUpdate": "2025-03-03",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ISE Na-U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.7,
      "cvg": 13.5
    },
    "opt": {
      "cva": 4.9,
      "bias": 8.9,
      "te": 8.8,
      "mau": 0.2
    },
    "des": {
      "cva": 7.1,
      "bias": 8.6,
      "te": 10.5,
      "mau": 1.2
    },
    "min": {
      "cva": 9.9,
      "bias": 6.2,
      "te": 35.9,
      "mau": 1.7
    },
    "acn": 29071,
    "lastUpdate": "2026-02-01",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "KAPP2",
    "search": "Free kappa light chain",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 8.4,
      "cvg": 14.2
    },
    "opt": {
      "cva": 4.3,
      "bias": 7.9,
      "te": 6.4,
      "mau": 1.1
    },
    "des": {
      "cva": 6.6,
      "bias": 9.4,
      "te": 15.3,
      "mau": 2.2
    },
    "min": {
      "cva": 4.9,
      "bias": 13.8,
      "te": 27.4,
      "mau": 2.6
    },
    "acn": 20780,
    "lastUpdate": "2025-09-21",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "LACT2C",
    "search": "Lactate",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.4,
      "cvg": 17.6
    },
    "opt": {
      "cva": 3.6,
      "bias": 8.7,
      "te": 5.3,
      "mau": 0.2
    },
    "des": {
      "cva": 6.3,
      "bias": 3.3,
      "te": 13.9,
      "mau": 2.8
    },
    "min": {
      "cva": 8.6,
      "bias": 14.8,
      "te": 34.3,
      "mau": 2.5
    },
    "acn": 20790,
    "lastUpdate": "2025-04-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "LACT2P",
    "search": "Lactate",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 8.1,
      "cvg": 13.2
    },
    "opt": {
      "cva": 4.2,
      "bias": 9.0,
      "te": 13.6,
      "mau": 0.8
    },
    "des": {
      "cva": 2.5,
      "bias": 13.6,
      "te": 13.0,
      "mau": 2.9
    },
    "min": {
      "cva": 7.7,
      "bias": 19.8,
      "te": 19.7,
      "mau": 1.7
    },
    "acn": 20791,
    "lastUpdate": "2025-11-13",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "LAMB2",
    "search": "Free lambda light chain",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.9,
      "cvg": 13.4
    },
    "opt": {
      "cva": 3.8,
      "bias": 8.1,
      "te": 9.5,
      "mau": 0.2
    },
    "des": {
      "cva": 5.7,
      "bias": 12.7,
      "te": 19.5,
      "mau": 1.2
    },
    "min": {
      "cva": 6.1,
      "bias": 5.7,
      "te": 36.9,
      "mau": 2.0
    },
    "acn": 20800,
    "lastUpdate": "2025-07-30",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "LDHI2",
    "search": "Lactate dehydrogenase (LDH) activity",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.1,
      "cvg": 12.9
    },
    "opt": {
      "cva": 2.8,
      "bias": 4.7,
      "te": 8.3,
      "mau": 1.4
    },
    "des": {
      "cva": 6.7,
      "bias": 2.3,
      "te": 20.8,
      "mau": 0.6
    },
    "min": {
      "cva": 11.7,
      "bias": 18.9,
      "te": 39.1,
      "mau": 4.4
    },
    "acn": 20810,
    "lastUpdate": "2025-03-21",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "LDHI2P",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.9,
      "cvg": 12.5
    },
    "opt": {
      "cva": 1.5,
      "bias": 8.4,
      "te": 6.5,
      "mau": 1.3
    },
    "des": {
      "cva": 6.8,
      "bias": 5.2,
      "te": 16.3,
      "mau": 0.6
    },
    "min": {
      "cva": 4.6,
      "bias": 4.7,
      "te": 31.7,
      "mau": 1.3
    },
    "acn": 20811,
    "lastUpdate": "2025-09-21",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "LDLC3",
    "search": "LDL Cholesterol",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.0,
      "cvg": 18.7
    },
    "opt": {
      "cva": 4.1,
      "bias": 7.7,
      "te": 5.5,
      "mau": 1.0
    },
    "des": {
      "cva": 2.7,
      "bias": 2.5,
      "te": 12.5,
      "mau": 0.9
    },
    "min": {
      "cva": 6.5,
      "bias": 4.4,
      "te": 37.7,
      "mau": 3.9
    },
    "acn": 20820,
    "lastUpdate": "2026-02-27",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "LI",
    "search": "Lithium level",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.2,
      "cvg": 15.9
    },
    "opt": {
      "cva": 2.2,
      "bias": 4.8,
      "te": 6.2,
      "mau": 0.7
    },
    "des": {
      "cva": 5.5,
      "bias": 7.1,
      "te": 21.4,
      "mau": 1.6
    },
    "min": {
      "cva": 10.7,
      "bias": 10.5,
      "te": 15.4,
      "mau": 3.7
    },
    "acn": 20840,
    "lastUpdate": "2024-12-30",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "LIP",
    "search": "Lipase",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.0,
      "cvg": 13.6
    },
    "opt": {
      "cva": 2.8,
      "bias": 7.6,
      "te": 12.3,
      "mau": 0.5
    },
    "des": {
      "cva": 6.7,
      "bias": 13.9,
      "te": 25.0,
      "mau": 0.6
    },
    "min": {
      "cva": 6.9,
      "bias": 16.3,
      "te": 24.2,
      "mau": 4.7
    },
    "acn": 20850,
    "lastUpdate": "2025-01-14",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "LPA2",
    "search": "Lipoprotein (a)",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.1,
      "cvg": 15.3
    },
    "opt": {
      "cva": 4.0,
      "bias": 9.2,
      "te": 5.4,
      "mau": 0.1
    },
    "des": {
      "cva": 6.5,
      "bias": 3.7,
      "te": 18.9,
      "mau": 2.4
    },
    "min": {
      "cva": 7.8,
      "bias": 19.7,
      "te": 22.8,
      "mau": 3.1
    },
    "acn": 20860,
    "lastUpdate": "2025-04-19",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "MG2",
    "search": "Magnesium",
    "category": "Chemistry",
    "status": "done",
    "progress": 25,
    "conf": "mid",
    "est": {
      "cvi": 1.7,
      "cvg": 16.6
    },
    "opt": {
      "cva": 3.4,
      "bias": 9.0,
      "te": 8.9,
      "mau": 1.3
    },
    "des": {
      "cva": 2.6,
      "bias": 5.0,
      "te": 21.4,
      "mau": 2.4
    },
    "min": {
      "cva": 9.8,
      "bias": 18.3,
      "te": 20.2,
      "mau": 1.4
    },
    "acn": 20890,
    "lastUpdate": "2025-09-17",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "MG2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 9.8,
      "cvg": 16.7
    },
    "opt": {
      "cva": 2.1,
      "bias": 1.5,
      "te": 6.5,
      "mau": 0.5
    },
    "des": {
      "cva": 5.3,
      "bias": 8.1,
      "te": 20.6,
      "mau": 1.9
    },
    "min": {
      "cva": 8.3,
      "bias": 8.1,
      "te": 15.1,
      "mau": 2.9
    },
    "acn": 20891,
    "lastUpdate": "2024-11-23",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "MPA",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.8,
      "cvg": 11.8
    },
    "opt": {
      "cva": 2.9,
      "bias": 3.8,
      "te": 12.4,
      "mau": 1.4
    },
    "des": {
      "cva": 6.1,
      "bias": 5.7,
      "te": 23.2,
      "mau": 0.9
    },
    "min": {
      "cva": 4.6,
      "bias": 13.1,
      "te": 18.4,
      "mau": 3.1
    },
    "acn": 20900,
    "lastUpdate": "2025-09-15",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "NH3L2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.8,
      "cvg": 11.3
    },
    "opt": {
      "cva": 1.4,
      "bias": 8.7,
      "te": 6.3,
      "mau": 0.6
    },
    "des": {
      "cva": 3.4,
      "bias": 9.0,
      "te": 23.0,
      "mau": 2.9
    },
    "min": {
      "cva": 8.3,
      "bias": 13.4,
      "te": 31.3,
      "mau": 1.6
    },
    "acn": 20940,
    "lastUpdate": "2026-01-11",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "NPP2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.2,
      "cvg": 6.3
    },
    "opt": {
      "cva": 4.2,
      "bias": 5.3,
      "te": 8.6,
      "mau": 1.0
    },
    "des": {
      "cva": 3.1,
      "bias": 10.4,
      "te": 23.4,
      "mau": 1.5
    },
    "min": {
      "cva": 4.1,
      "bias": 3.0,
      "te": 28.0,
      "mau": 4.7
    },
    "acn": 20051,
    "lastUpdate": "2025-09-05",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "OP2Q2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.7,
      "cvg": 13.1
    },
    "opt": {
      "cva": 1.7,
      "bias": 9.5,
      "te": 5.1,
      "mau": 1.4
    },
    "des": {
      "cva": 6.8,
      "bias": 4.0,
      "te": 24.4,
      "mau": 2.9
    },
    "min": {
      "cva": 11.3,
      "bias": 19.3,
      "te": 28.3,
      "mau": 4.0
    },
    "acn": 20950,
    "lastUpdate": "2025-01-16",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "OP2S2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 64,
    "conf": "mid",
    "est": {
      "cvi": 6.4,
      "cvg": 12.3
    },
    "opt": {
      "cva": 2.9,
      "bias": 2.1,
      "te": 13.9,
      "mau": 1.2
    },
    "des": {
      "cva": 6.9,
      "bias": 12.8,
      "te": 10.3,
      "mau": 0.6
    },
    "min": {
      "cva": 8.7,
      "bias": 9.3,
      "te": 38.5,
      "mau": 4.1
    },
    "acn": 20951,
    "lastUpdate": "2025-08-04",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "OP3Q2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.4,
      "cvg": 13.1
    },
    "opt": {
      "cva": 3.6,
      "bias": 7.6,
      "te": 13.9,
      "mau": 0.3
    },
    "des": {
      "cva": 4.6,
      "bias": 15.0,
      "te": 21.8,
      "mau": 0.5
    },
    "min": {
      "cva": 7.1,
      "bias": 8.3,
      "te": 19.8,
      "mau": 1.9
    },
    "acn": 20952,
    "lastUpdate": "2025-01-26",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "OP3QC",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.4,
      "cvg": 10.4
    },
    "opt": {
      "cva": 1.8,
      "bias": 2.5,
      "te": 7.7,
      "mau": 1.0
    },
    "des": {
      "cva": 7.4,
      "bias": 2.6,
      "te": 11.0,
      "mau": 1.2
    },
    "min": {
      "cva": 7.1,
      "bias": 4.4,
      "te": 15.6,
      "mau": 4.1
    },
    "acn": 20954,
    "lastUpdate": "2025-12-17",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "OP3S2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.6,
      "cvg": 15.6
    },
    "opt": {
      "cva": 3.0,
      "bias": 7.9,
      "te": 5.9,
      "mau": 0.1
    },
    "des": {
      "cva": 6.6,
      "bias": 12.0,
      "te": 24.7,
      "mau": 1.5
    },
    "min": {
      "cva": 7.4,
      "bias": 18.1,
      "te": 37.4,
      "mau": 1.5
    },
    "acn": 20953,
    "lastUpdate": "2025-07-04",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "PC2QC",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.7,
      "cvg": 13.3
    },
    "opt": {
      "cva": 3.5,
      "bias": 1.2,
      "te": 8.3,
      "mau": 0.5
    },
    "des": {
      "cva": 2.7,
      "bias": 8.8,
      "te": 11.7,
      "mau": 2.5
    },
    "min": {
      "cva": 4.5,
      "bias": 11.6,
      "te": 39.9,
      "mau": 3.5
    },
    "acn": 20962,
    "lastUpdate": "2025-05-29",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "PC2QP",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 9.0,
      "cvg": 18.2
    },
    "opt": {
      "cva": 1.2,
      "bias": 9.7,
      "te": 10.1,
      "mau": 0.9
    },
    "des": {
      "cva": 5.0,
      "bias": 9.6,
      "te": 21.2,
      "mau": 2.1
    },
    "min": {
      "cva": 9.8,
      "bias": 16.0,
      "te": 28.6,
      "mau": 1.1
    },
    "acn": 20960,
    "lastUpdate": "2025-11-11",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "PC2‑QP",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.7,
      "cvg": 9.5
    },
    "opt": {
      "cva": 2.7,
      "bias": 9.8,
      "te": 9.0,
      "mau": 0.6
    },
    "des": {
      "cva": 6.6,
      "bias": 3.3,
      "te": 19.4,
      "mau": 2.3
    },
    "min": {
      "cva": 8.5,
      "bias": 5.1,
      "te": 39.3,
      "mau": 1.2
    },
    "acn": 20963,
    "lastUpdate": "2025-11-17",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "PC2SP",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.0,
      "cvg": 19.0
    },
    "opt": {
      "cva": 3.1,
      "bias": 5.7,
      "te": 7.7,
      "mau": 0.5
    },
    "des": {
      "cva": 6.9,
      "bias": 7.8,
      "te": 11.1,
      "mau": 1.5
    },
    "min": {
      "cva": 7.7,
      "bias": 3.7,
      "te": 31.2,
      "mau": 1.2
    },
    "acn": 20961,
    "lastUpdate": "2025-01-10",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "PHNO2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 3.3,
      "cvg": 12.7
    },
    "opt": {
      "cva": 1.8,
      "bias": 8.2,
      "te": 9.9,
      "mau": 1.1
    },
    "des": {
      "cva": 2.2,
      "bias": 13.8,
      "te": 10.6,
      "mau": 0.6
    },
    "min": {
      "cva": 11.3,
      "bias": 18.0,
      "te": 24.8,
      "mau": 4.0
    },
    "acn": 20970,
    "lastUpdate": "2024-12-30",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "PHNY2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.7,
      "cvg": 8.1
    },
    "opt": {
      "cva": 1.6,
      "bias": 6.0,
      "te": 9.2,
      "mau": 0.2
    },
    "des": {
      "cva": 7.3,
      "bias": 4.0,
      "te": 17.2,
      "mau": 1.1
    },
    "min": {
      "cva": 3.5,
      "bias": 3.4,
      "te": 27.4,
      "mau": 4.4
    },
    "acn": 20980,
    "lastUpdate": "2024-11-28",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "PHOS2",
    "search": "Phosphate",
    "category": "Chemistry",
    "status": "working",
    "progress": 80,
    "conf": "mid",
    "est": {
      "cvi": 6.6,
      "cvg": 13.5
    },
    "opt": {
      "cva": 2.5,
      "bias": 4.0,
      "te": 11.5,
      "mau": 1.5
    },
    "des": {
      "cva": 5.7,
      "bias": 14.8,
      "te": 21.9,
      "mau": 2.9
    },
    "min": {
      "cva": 4.7,
      "bias": 18.0,
      "te": 20.6,
      "mau": 3.2
    },
    "acn": 20990,
    "lastUpdate": "2025-06-10",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "PHOS2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 55,
    "conf": "high",
    "est": {
      "cvi": 1.8,
      "cvg": 18.3
    },
    "opt": {
      "cva": 4.6,
      "bias": 8.9,
      "te": 14.1,
      "mau": 0.5
    },
    "des": {
      "cva": 2.4,
      "bias": 14.8,
      "te": 17.6,
      "mau": 3.0
    },
    "min": {
      "cva": 11.6,
      "bias": 14.4,
      "te": 26.7,
      "mau": 3.5
    },
    "acn": 20991,
    "lastUpdate": "2025-06-15",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "PREA",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.3,
      "cvg": 15.4
    },
    "opt": {
      "cva": 4.4,
      "bias": 5.2,
      "te": 14.1,
      "mau": 0.8
    },
    "des": {
      "cva": 2.1,
      "bias": 3.0,
      "te": 21.6,
      "mau": 0.9
    },
    "min": {
      "cva": 8.9,
      "bias": 4.2,
      "te": 32.4,
      "mau": 3.4
    },
    "acn": 21010,
    "lastUpdate": "2025-06-06",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "RF-II",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 80,
    "conf": "mid",
    "est": {
      "cvi": 10.0,
      "cvg": 15.0
    },
    "opt": {
      "cva": 3.9,
      "bias": 7.4,
      "te": 12.1,
      "mau": 0.1
    },
    "des": {
      "cva": 6.4,
      "bias": 2.2,
      "te": 20.9,
      "mau": 2.2
    },
    "min": {
      "cva": 7.9,
      "bias": 14.0,
      "te": 31.1,
      "mau": 1.9
    },
    "acn": 21040,
    "lastUpdate": "2025-07-22",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "SALI",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 25,
    "conf": "high",
    "est": {
      "cvi": 8.2,
      "cvg": 11.1
    },
    "opt": {
      "cva": 2.0,
      "bias": 8.1,
      "te": 11.6,
      "mau": 1.0
    },
    "des": {
      "cva": 3.7,
      "bias": 9.7,
      "te": 24.1,
      "mau": 2.4
    },
    "min": {
      "cva": 7.5,
      "bias": 7.7,
      "te": 18.7,
      "mau": 2.2
    },
    "acn": 21050,
    "lastUpdate": "2025-11-30",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "STFR",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.7,
      "cvg": 12.5
    },
    "opt": {
      "cva": 3.7,
      "bias": 3.1,
      "te": 12.8,
      "mau": 1.2
    },
    "des": {
      "cva": 7.9,
      "bias": 11.2,
      "te": 21.4,
      "mau": 1.1
    },
    "min": {
      "cva": 11.9,
      "bias": 13.1,
      "te": 29.4,
      "mau": 1.1
    },
    "acn": 21080,
    "lastUpdate": "2024-11-18",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH1Q2 - 150T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 3.1,
      "cvg": 10.8
    },
    "opt": {
      "cva": 4.9,
      "bias": 6.7,
      "te": 7.9,
      "mau": 1.1
    },
    "des": {
      "cva": 3.3,
      "bias": 12.1,
      "te": 20.2,
      "mau": 2.7
    },
    "min": {
      "cva": 3.3,
      "bias": 18.9,
      "te": 21.5,
      "mau": 4.9
    },
    "acn": 21072,
    "lastUpdate": "2025-07-17",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH1Q2 - 850T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 39,
    "conf": "high",
    "est": {
      "cvi": 1.5,
      "cvg": 17.4
    },
    "opt": {
      "cva": 1.0,
      "bias": 1.5,
      "te": 13.6,
      "mau": 1.3
    },
    "des": {
      "cva": 4.5,
      "bias": 7.5,
      "te": 17.4,
      "mau": 2.6
    },
    "min": {
      "cva": 11.4,
      "bias": 8.4,
      "te": 21.0,
      "mau": 5.0
    },
    "acn": 21072,
    "lastUpdate": "2025-04-29",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH1S2 - 150T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 3.6,
      "cvg": 9.6
    },
    "opt": {
      "cva": 3.6,
      "bias": 9.3,
      "te": 7.9,
      "mau": 1.2
    },
    "des": {
      "cva": 7.5,
      "bias": 2.7,
      "te": 13.0,
      "mau": 1.1
    },
    "min": {
      "cva": 7.4,
      "bias": 16.2,
      "te": 28.8,
      "mau": 4.9
    },
    "acn": 21075,
    "lastUpdate": "2025-05-20",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH1S2 - 850T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.1,
      "cvg": 14.0
    },
    "opt": {
      "cva": 3.2,
      "bias": 7.9,
      "te": 8.4,
      "mau": 0.3
    },
    "des": {
      "cva": 5.7,
      "bias": 13.7,
      "te": 15.8,
      "mau": 2.8
    },
    "min": {
      "cva": 9.3,
      "bias": 17.2,
      "te": 30.0,
      "mau": 4.4
    },
    "acn": 21075,
    "lastUpdate": "2025-10-03",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH2Q2 - 150T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.6,
      "cvg": 8.4
    },
    "opt": {
      "cva": 3.2,
      "bias": 3.0,
      "te": 13.4,
      "mau": 0.5
    },
    "des": {
      "cva": 3.3,
      "bias": 2.8,
      "te": 13.7,
      "mau": 0.6
    },
    "min": {
      "cva": 8.3,
      "bias": 8.2,
      "te": 23.5,
      "mau": 3.4
    },
    "acn": 21070,
    "lastUpdate": "2025-06-20",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH2Q2 - 850T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 76,
    "conf": "high",
    "est": {
      "cvi": 1.3,
      "cvg": 18.9
    },
    "opt": {
      "cva": 1.8,
      "bias": 3.4,
      "te": 5.2,
      "mau": 1.3
    },
    "des": {
      "cva": 3.6,
      "bias": 11.8,
      "te": 24.2,
      "mau": 1.5
    },
    "min": {
      "cva": 3.5,
      "bias": 5.8,
      "te": 30.8,
      "mau": 1.6
    },
    "acn": 21070,
    "lastUpdate": "2025-05-24",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH2S2 - 150T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 90,
    "conf": "mid",
    "est": {
      "cvi": 2.4,
      "cvg": 5.3
    },
    "opt": {
      "cva": 4.9,
      "bias": 1.4,
      "te": 13.8,
      "mau": 0.9
    },
    "des": {
      "cva": 4.8,
      "bias": 6.3,
      "te": 20.7,
      "mau": 1.1
    },
    "min": {
      "cva": 3.2,
      "bias": 8.5,
      "te": 19.1,
      "mau": 4.4
    },
    "acn": 21073,
    "lastUpdate": "2026-01-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH2S2 - 850T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.8,
      "cvg": 15.5
    },
    "opt": {
      "cva": 2.2,
      "bias": 4.6,
      "te": 9.0,
      "mau": 1.4
    },
    "des": {
      "cva": 7.3,
      "bias": 9.3,
      "te": 20.4,
      "mau": 2.9
    },
    "min": {
      "cva": 11.0,
      "bias": 3.1,
      "te": 35.2,
      "mau": 3.5
    },
    "acn": 21073,
    "lastUpdate": "2026-01-05",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH5Q2 - 150T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 2.8,
      "cvg": 20.0
    },
    "opt": {
      "cva": 2.9,
      "bias": 2.2,
      "te": 8.8,
      "mau": 0.4
    },
    "des": {
      "cva": 5.3,
      "bias": 12.2,
      "te": 19.7,
      "mau": 0.9
    },
    "min": {
      "cva": 3.6,
      "bias": 19.3,
      "te": 30.4,
      "mau": 4.0
    },
    "acn": 21071,
    "lastUpdate": "2026-02-10",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH5Q2 - 850T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 85,
    "conf": "mid",
    "est": {
      "cvi": 10.0,
      "cvg": 11.4
    },
    "opt": {
      "cva": 4.2,
      "bias": 6.6,
      "te": 6.6,
      "mau": 0.9
    },
    "des": {
      "cva": 3.9,
      "bias": 8.5,
      "te": 23.0,
      "mau": 2.4
    },
    "min": {
      "cva": 9.8,
      "bias": 4.1,
      "te": 16.1,
      "mau": 4.3
    },
    "acn": 21071,
    "lastUpdate": "2025-02-02",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH5QC - 150T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.1,
      "cvg": 12.9
    },
    "opt": {
      "cva": 3.0,
      "bias": 9.7,
      "te": 7.8,
      "mau": 1.5
    },
    "des": {
      "cva": 3.9,
      "bias": 8.2,
      "te": 24.3,
      "mau": 0.8
    },
    "min": {
      "cva": 7.2,
      "bias": 7.8,
      "te": 19.8,
      "mau": 2.8
    },
    "acn": 21076,
    "lastUpdate": "2025-12-31",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH5QC - 850T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.2,
      "cvg": 7.2
    },
    "opt": {
      "cva": 3.4,
      "bias": 2.8,
      "te": 6.7,
      "mau": 0.7
    },
    "des": {
      "cva": 5.5,
      "bias": 4.5,
      "te": 14.5,
      "mau": 2.9
    },
    "min": {
      "cva": 9.8,
      "bias": 9.3,
      "te": 15.0,
      "mau": 4.8
    },
    "acn": 21076,
    "lastUpdate": "2025-12-31",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH5‑QP - 150T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 9.7,
      "cvg": 5.0
    },
    "opt": {
      "cva": 1.1,
      "bias": 6.2,
      "te": 9.1,
      "mau": 1.0
    },
    "des": {
      "cva": 2.9,
      "bias": 14.0,
      "te": 24.6,
      "mau": 2.8
    },
    "min": {
      "cva": 4.4,
      "bias": 10.5,
      "te": 19.6,
      "mau": 3.6
    },
    "acn": 21078,
    "lastUpdate": "2024-11-23",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH5‑QP - 850T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 8.8,
      "cvg": 7.6
    },
    "opt": {
      "cva": 2.4,
      "bias": 2.8,
      "te": 10.3,
      "mau": 1.1
    },
    "des": {
      "cva": 7.4,
      "bias": 12.7,
      "te": 17.4,
      "mau": 0.9
    },
    "min": {
      "cva": 10.2,
      "bias": 18.2,
      "te": 33.5,
      "mau": 3.3
    },
    "acn": 21078,
    "lastUpdate": "2025-12-22",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH5S2 - 150T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 53,
    "conf": "high",
    "est": {
      "cvi": 4.0,
      "cvg": 14.2
    },
    "opt": {
      "cva": 2.8,
      "bias": 1.8,
      "te": 11.4,
      "mau": 0.5
    },
    "des": {
      "cva": 6.2,
      "bias": 10.1,
      "te": 20.5,
      "mau": 0.8
    },
    "min": {
      "cva": 4.4,
      "bias": 16.5,
      "te": 24.8,
      "mau": 1.6
    },
    "acn": 21074,
    "lastUpdate": "2025-08-13",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TH5S2 - 850T",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 75,
    "conf": "mid",
    "est": {
      "cvi": 7.3,
      "cvg": 15.6
    },
    "opt": {
      "cva": 3.0,
      "bias": 2.5,
      "te": 13.1,
      "mau": 0.7
    },
    "des": {
      "cva": 2.0,
      "bias": 4.5,
      "te": 17.6,
      "mau": 2.2
    },
    "min": {
      "cva": 6.3,
      "bias": 19.1,
      "te": 25.1,
      "mau": 3.0
    },
    "acn": 21074,
    "lastUpdate": "2025-10-09",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "THEO2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.1,
      "cvg": 10.7
    },
    "opt": {
      "cva": 2.8,
      "bias": 5.3,
      "te": 5.3,
      "mau": 0.4
    },
    "des": {
      "cva": 7.9,
      "bias": 13.5,
      "te": 17.9,
      "mau": 1.7
    },
    "min": {
      "cva": 10.2,
      "bias": 8.0,
      "te": 20.3,
      "mau": 3.0
    },
    "acn": 21090,
    "lastUpdate": "2025-10-14",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TOBR2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.3,
      "cvg": 14.6
    },
    "opt": {
      "cva": 4.7,
      "bias": 4.2,
      "te": 5.5,
      "mau": 0.4
    },
    "des": {
      "cva": 6.7,
      "bias": 8.0,
      "te": 18.6,
      "mau": 1.2
    },
    "min": {
      "cva": 11.1,
      "bias": 11.1,
      "te": 34.7,
      "mau": 1.5
    },
    "acn": 21100,
    "lastUpdate": "2024-11-22",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TP2",
    "search": "Protein (total)",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 3.4,
      "cvg": 14.9
    },
    "opt": {
      "cva": 1.9,
      "bias": 7.2,
      "te": 11.9,
      "mau": 0.6
    },
    "des": {
      "cva": 7.9,
      "bias": 14.4,
      "te": 23.3,
      "mau": 2.2
    },
    "min": {
      "cva": 8.5,
      "bias": 5.6,
      "te": 30.1,
      "mau": 4.2
    },
    "acn": 21110,
    "lastUpdate": "2024-12-15",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TPC3",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.2,
      "cvg": 15.2
    },
    "opt": {
      "cva": 2.2,
      "bias": 2.0,
      "te": 5.9,
      "mau": 0.8
    },
    "des": {
      "cva": 6.8,
      "bias": 6.2,
      "te": 22.0,
      "mau": 1.9
    },
    "min": {
      "cva": 6.1,
      "bias": 15.3,
      "te": 25.2,
      "mau": 1.9
    },
    "acn": 21123,
    "lastUpdate": "2026-01-24",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TPU3",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 68,
    "conf": "high",
    "est": {
      "cvi": 5.6,
      "cvg": 16.3
    },
    "opt": {
      "cva": 2.7,
      "bias": 4.5,
      "te": 13.0,
      "mau": 0.4
    },
    "des": {
      "cva": 2.7,
      "bias": 3.7,
      "te": 11.5,
      "mau": 2.5
    },
    "min": {
      "cva": 5.1,
      "bias": 19.9,
      "te": 16.7,
      "mau": 2.3
    },
    "acn": 21122,
    "lastUpdate": "2026-01-10",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TRIGL",
    "search": "Triglycerides",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.0,
      "cvg": 14.7
    },
    "opt": {
      "cva": 3.0,
      "bias": 9.9,
      "te": 9.6,
      "mau": 0.6
    },
    "des": {
      "cva": 2.7,
      "bias": 5.5,
      "te": 14.9,
      "mau": 1.7
    },
    "min": {
      "cva": 3.8,
      "bias": 17.8,
      "te": 20.6,
      "mau": 2.6
    },
    "acn": 21130,
    "lastUpdate": "2025-03-01",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "TRSF2",
    "search": "Transferrin",
    "category": "Chemistry",
    "status": "done",
    "progress": 55,
    "conf": "high",
    "est": {
      "cvi": 8.4,
      "cvg": 8.1
    },
    "opt": {
      "cva": 4.9,
      "bias": 9.4,
      "te": 13.1,
      "mau": 0.6
    },
    "des": {
      "cva": 2.1,
      "bias": 6.9,
      "te": 19.0,
      "mau": 0.5
    },
    "min": {
      "cva": 3.8,
      "bias": 18.3,
      "te": 27.6,
      "mau": 1.2
    },
    "acn": 21150,
    "lastUpdate": "2026-03-03",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "UA2",
    "search": "Urate",
    "category": "Chemistry",
    "status": "working",
    "progress": 65,
    "conf": "high",
    "est": {
      "cvi": 5.8,
      "cvg": 12.4
    },
    "opt": {
      "cva": 3.3,
      "bias": 8.6,
      "te": 12.4,
      "mau": 0.8
    },
    "des": {
      "cva": 6.6,
      "bias": 6.6,
      "te": 15.6,
      "mau": 2.1
    },
    "min": {
      "cva": 8.1,
      "bias": 11.3,
      "te": 29.4,
      "mau": 2.3
    },
    "acn": 21170,
    "lastUpdate": "2025-05-10",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "UA2U",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.0,
      "cvg": 13.5
    },
    "opt": {
      "cva": 4.3,
      "bias": 9.2,
      "te": 9.9,
      "mau": 1.4
    },
    "des": {
      "cva": 4.9,
      "bias": 12.2,
      "te": 13.9,
      "mau": 0.8
    },
    "min": {
      "cva": 10.1,
      "bias": 8.7,
      "te": 31.4,
      "mau": 1.8
    },
    "acn": 21171,
    "lastUpdate": "2025-11-07",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "U-BUN",
    "search": "Urea",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.2,
      "cvg": 16.4
    },
    "opt": {
      "cva": 4.3,
      "bias": 9.1,
      "te": 7.3,
      "mau": 1.4
    },
    "des": {
      "cva": 2.9,
      "bias": 3.3,
      "te": 10.1,
      "mau": 1.5
    },
    "min": {
      "cva": 10.4,
      "bias": 19.1,
      "te": 37.8,
      "mau": 3.5
    },
    "acn": 21192,
    "lastUpdate": "2026-01-31",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "UBUNU",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 8.1,
      "cvg": 14.9
    },
    "opt": {
      "cva": 1.8,
      "bias": 2.3,
      "te": 5.0,
      "mau": 0.2
    },
    "des": {
      "cva": 2.1,
      "bias": 2.4,
      "te": 17.8,
      "mau": 1.3
    },
    "min": {
      "cva": 10.8,
      "bias": 8.8,
      "te": 23.9,
      "mau": 4.5
    },
    "acn": 21193,
    "lastUpdate": "2025-05-30",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "UIBC-I",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.6,
      "cvg": 15.8
    },
    "opt": {
      "cva": 2.0,
      "bias": 2.5,
      "te": 5.4,
      "mau": 1.2
    },
    "des": {
      "cva": 7.8,
      "bias": 8.6,
      "te": 16.9,
      "mau": 1.4
    },
    "min": {
      "cva": 3.4,
      "bias": 8.5,
      "te": 32.5,
      "mau": 2.2
    },
    "acn": 21180,
    "lastUpdate": "2024-12-27",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "VALP2",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "done",
    "progress": 64,
    "conf": "mid",
    "est": {
      "cvi": 3.5,
      "cvg": 8.4
    },
    "opt": {
      "cva": 1.7,
      "bias": 9.0,
      "te": 14.2,
      "mau": 0.7
    },
    "des": {
      "cva": 2.4,
      "bias": 7.9,
      "te": 24.8,
      "mau": 2.8
    },
    "min": {
      "cva": 11.7,
      "bias": 6.6,
      "te": 21.5,
      "mau": 2.1
    },
    "acn": 21200,
    "lastUpdate": "2025-07-24",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "VANC3O",
    "search": "검색어 확인 불가",
    "category": "Chemistry",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.5,
      "cvg": 11.4
    },
    "opt": {
      "cva": 1.3,
      "bias": 5.0,
      "te": 14.7,
      "mau": 0.8
    },
    "des": {
      "cva": 3.0,
      "bias": 12.5,
      "te": 17.8,
      "mau": 2.2
    },
    "min": {
      "cva": 3.3,
      "bias": 3.3,
      "te": 16.8,
      "mau": 3.5
    },
    "acn": 21210,
    "lastUpdate": "2026-02-09",
    "biovar": {
      "choice": null,
      "cvi": null,
      "cvg": null,
      "i": null,
      "b": null,
      "te": null
    },
    "tea_sources": {
      "clia": null,
      "wlsh": null,
      "cap": null,
      "aab": null,
      "rcpa": null,
      "api": null
    }
  },
  {
    "test": "ACCP",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.1,
      "cvg": 18.8
    },
    "opt": {
      "cva": 2.8,
      "bias": 7.3,
      "te": 5.4,
      "mau": 0.8
    },
    "des": {
      "cva": 2.7,
      "bias": 11.2,
      "te": 14.1,
      "mau": 2.4
    },
    "min": {
      "cva": 7.3,
      "bias": 19.1,
      "te": 16.0,
      "mau": 3.8
    },
    "acn": 10084,
    "lastUpdate": "2025-08-16"
  },
  {
    "test": "ACOV2",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.1,
      "cvg": 13.6
    },
    "opt": {
      "cva": 4.9,
      "bias": 2.9,
      "te": 14.2,
      "mau": 1.2
    },
    "des": {
      "cva": 4.8,
      "bias": 3.2,
      "te": 23.9,
      "mau": 1.6
    },
    "min": {
      "cva": 8.3,
      "bias": 16.2,
      "te": 32.9,
      "mau": 1.2
    },
    "acn": 10226,
    "lastUpdate": "2025-04-09"
  },
  {
    "test": "ACOV2S",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.0,
      "cvg": 19.6
    },
    "opt": {
      "cva": 4.0,
      "bias": 3.0,
      "te": 10.1,
      "mau": 1.0
    },
    "des": {
      "cva": 3.8,
      "bias": 11.1,
      "te": 20.5,
      "mau": 0.6
    },
    "min": {
      "cva": 10.4,
      "bias": 14.1,
      "te": 31.9,
      "mau": 2.7
    },
    "acn": 10230,
    "lastUpdate": "2025-03-07"
  },
  {
    "test": "ACTB12",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.5,
      "cvg": 17.9
    },
    "opt": {
      "cva": 1.4,
      "bias": 1.9,
      "te": 13.4,
      "mau": 0.9
    },
    "des": {
      "cva": 3.8,
      "bias": 2.7,
      "te": 14.3,
      "mau": 2.1
    },
    "min": {
      "cva": 5.8,
      "bias": 7.3,
      "te": 29.6,
      "mau": 4.9
    },
    "acn": 10152,
    "lastUpdate": "2026-01-12"
  },
  {
    "test": "ACTH",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.0,
      "cvg": 11.2
    },
    "opt": {
      "cva": 2.9,
      "bias": 3.7,
      "te": 9.1,
      "mau": 0.3
    },
    "des": {
      "cva": 2.0,
      "bias": 11.6,
      "te": 16.8,
      "mau": 2.9
    },
    "min": {
      "cva": 7.1,
      "bias": 11.0,
      "te": 28.2,
      "mau": 4.1
    },
    "acn": 10206,
    "lastUpdate": "2025-05-13"
  },
  {
    "test": "AFP",
    "search": "Alphafetoprotein",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.7,
      "cvg": 11.3
    },
    "opt": {
      "cva": 3.6,
      "bias": 7.2,
      "te": 11.4,
      "mau": 1.3
    },
    "des": {
      "cva": 7.2,
      "bias": 3.5,
      "te": 11.0,
      "mau": 2.0
    },
    "min": {
      "cva": 8.4,
      "bias": 17.5,
      "te": 21.1,
      "mau": 1.5
    },
    "acn": 10209,
    "lastUpdate": "2025-06-17"
  },
  {
    "test": "AHAV 2",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 44,
    "conf": "high",
    "est": {
      "cvi": 5.9,
      "cvg": 18.6
    },
    "opt": {
      "cva": 2.9,
      "bias": 9.0,
      "te": 9.1,
      "mau": 0.9
    },
    "des": {
      "cva": 4.6,
      "bias": 9.3,
      "te": 22.8,
      "mau": 1.3
    },
    "min": {
      "cva": 8.8,
      "bias": 7.0,
      "te": 20.1,
      "mau": 4.6
    },
    "acn": 10156,
    "lastUpdate": "2024-12-20"
  },
  {
    "test": "AHAVIGM",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.7,
      "cvg": 8.0
    },
    "opt": {
      "cva": 4.5,
      "bias": 9.8,
      "te": 10.3,
      "mau": 1.3
    },
    "des": {
      "cva": 3.6,
      "bias": 8.4,
      "te": 15.1,
      "mau": 3.0
    },
    "min": {
      "cva": 4.7,
      "bias": 5.4,
      "te": 21.8,
      "mau": 2.4
    },
    "acn": 10162,
    "lastUpdate": "2025-02-10"
  },
  {
    "test": "AHBC 2 ",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 9.5,
      "cvg": 10.8
    },
    "opt": {
      "cva": 1.8,
      "bias": 5.2,
      "te": 14.9,
      "mau": 0.5
    },
    "des": {
      "cva": 6.9,
      "bias": 12.8,
      "te": 17.9,
      "mau": 1.7
    },
    "min": {
      "cva": 3.3,
      "bias": 4.0,
      "te": 21.1,
      "mau": 2.8
    },
    "acn": 10142,
    "lastUpdate": "2025-04-09"
  },
  {
    "test": "AHBCIGM",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.8,
      "cvg": 18.9
    },
    "opt": {
      "cva": 3.0,
      "bias": 6.9,
      "te": 7.1,
      "mau": 0.1
    },
    "des": {
      "cva": 5.9,
      "bias": 11.2,
      "te": 11.0,
      "mau": 2.5
    },
    "min": {
      "cva": 6.5,
      "bias": 11.1,
      "te": 27.6,
      "mau": 4.4
    },
    "acn": 10040,
    "lastUpdate": "2025-06-03"
  },
  {
    "test": "AHBE",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.0,
      "cvg": 12.8
    },
    "opt": {
      "cva": 4.7,
      "bias": 1.3,
      "te": 8.6,
      "mau": 0.8
    },
    "des": {
      "cva": 5.9,
      "bias": 10.7,
      "te": 21.7,
      "mau": 0.7
    },
    "min": {
      "cva": 11.0,
      "bias": 12.7,
      "te": 27.5,
      "mau": 2.0
    },
    "acn": 10033,
    "lastUpdate": "2024-12-01"
  },
  {
    "test": "A‑HBS 2",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.8,
      "cvg": 9.6
    },
    "opt": {
      "cva": 4.8,
      "bias": 8.4,
      "te": 5.7,
      "mau": 0.6
    },
    "des": {
      "cva": 7.1,
      "bias": 8.8,
      "te": 21.4,
      "mau": 1.6
    },
    "min": {
      "cva": 4.0,
      "bias": 4.1,
      "te": 15.8,
      "mau": 4.8
    },
    "acn": 10179,
    "lastUpdate": "2024-12-21"
  },
  {
    "test": "AHCV 2 ",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.4,
      "cvg": 10.4
    },
    "opt": {
      "cva": 3.8,
      "bias": 3.5,
      "te": 11.7,
      "mau": 0.3
    },
    "des": {
      "cva": 6.5,
      "bias": 11.1,
      "te": 16.7,
      "mau": 0.7
    },
    "min": {
      "cva": 10.4,
      "bias": 12.5,
      "te": 39.5,
      "mau": 3.4
    },
    "acn": 10189,
    "lastUpdate": "2026-03-10"
  },
  {
    "test": "AMHP",
    "search": "Antimullerian hormone",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.1,
      "cvg": 8.5
    },
    "opt": {
      "cva": 3.3,
      "bias": 5.9,
      "te": 5.7,
      "mau": 0.2
    },
    "des": {
      "cva": 5.3,
      "bias": 3.1,
      "te": 21.9,
      "mau": 1.2
    },
    "min": {
      "cva": 11.1,
      "bias": 9.8,
      "te": 39.8,
      "mau": 2.6
    },
    "acn": 10158,
    "lastUpdate": "2025-03-14"
  },
  {
    "test": "ATG",
    "search": "Thyroglobulin antibody",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.2,
      "cvg": 12.0
    },
    "opt": {
      "cva": 4.0,
      "bias": 5.8,
      "te": 13.2,
      "mau": 0.5
    },
    "des": {
      "cva": 7.1,
      "bias": 13.4,
      "te": 12.6,
      "mau": 1.8
    },
    "min": {
      "cva": 5.1,
      "bias": 9.2,
      "te": 20.4,
      "mau": 2.6
    },
    "acn": 10202,
    "lastUpdate": "2024-12-12"
  },
  {
    "test": "ATPO",
    "search": "Thyroid peroxidase antibody (TPO)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.7,
      "cvg": 6.1
    },
    "opt": {
      "cva": 4.8,
      "bias": 1.5,
      "te": 8.2,
      "mau": 0.7
    },
    "des": {
      "cva": 6.2,
      "bias": 14.1,
      "te": 15.3,
      "mau": 0.8
    },
    "min": {
      "cva": 8.9,
      "bias": 15.6,
      "te": 27.6,
      "mau": 4.4
    },
    "acn": 10066,
    "lastUpdate": "2025-08-16"
  },
  {
    "test": "ATSHR",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 24,
    "conf": "mid",
    "est": {
      "cvi": 8.0,
      "cvg": 14.3
    },
    "opt": {
      "cva": 2.0,
      "bias": 4.9,
      "te": 10.1,
      "mau": 0.9
    },
    "des": {
      "cva": 3.0,
      "bias": 12.8,
      "te": 21.3,
      "mau": 2.9
    },
    "min": {
      "cva": 11.3,
      "bias": 3.3,
      "te": 28.2,
      "mau": 4.5
    },
    "acn": 10174,
    "lastUpdate": "2026-02-10"
  },
  {
    "test": "B12 2",
    "search": "Cobalamin",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.1,
      "cvg": 9.0
    },
    "opt": {
      "cva": 2.0,
      "bias": 6.7,
      "te": 6.6,
      "mau": 1.2
    },
    "des": {
      "cva": 6.5,
      "bias": 9.8,
      "te": 11.2,
      "mau": 2.0
    },
    "min": {
      "cva": 4.8,
      "bias": 11.2,
      "te": 36.9,
      "mau": 3.4
    },
    "acn": 10088,
    "lastUpdate": "2025-06-03"
  },
  {
    "test": "CA 15-3 2",
    "search": "Cancer antigen 15-3 (CA 15.3)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.6,
      "cvg": 17.9
    },
    "opt": {
      "cva": 4.7,
      "bias": 9.4,
      "te": 5.3,
      "mau": 0.5
    },
    "des": {
      "cva": 4.3,
      "bias": 10.2,
      "te": 21.5,
      "mau": 0.9
    },
    "min": {
      "cva": 9.2,
      "bias": 7.5,
      "te": 23.2,
      "mau": 4.3
    },
    "acn": 10002,
    "lastUpdate": "2025-03-10"
  },
  {
    "test": "CA 19-9",
    "search": "Cancer antigen 19-9 (CA 19-9)",
    "category": "Immunology",
    "status": "done",
    "progress": 45,
    "conf": "mid",
    "est": {
      "cvi": 9.6,
      "cvg": 5.8
    },
    "opt": {
      "cva": 4.3,
      "bias": 5.7,
      "te": 12.0,
      "mau": 0.5
    },
    "des": {
      "cva": 6.9,
      "bias": 6.5,
      "te": 19.7,
      "mau": 2.5
    },
    "min": {
      "cva": 10.7,
      "bias": 12.3,
      "te": 28.3,
      "mau": 3.7
    },
    "acn": 10019,
    "lastUpdate": "2026-03-06"
  },
  {
    "test": "CA 72-4",
    "search": "Cancer antigen 72-4 (CA 72-4)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.5,
      "cvg": 19.3
    },
    "opt": {
      "cva": 1.4,
      "bias": 9.9,
      "te": 11.2,
      "mau": 0.3
    },
    "des": {
      "cva": 4.3,
      "bias": 14.7,
      "te": 20.3,
      "mau": 2.7
    },
    "min": {
      "cva": 7.1,
      "bias": 14.0,
      "te": 16.9,
      "mau": 2.4
    },
    "acn": 10225,
    "lastUpdate": "2026-02-15"
  },
  {
    "test": "CA125 2",
    "search": "Cancer antigen 125 (CA-125)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.5,
      "cvg": 13.8
    },
    "opt": {
      "cva": 3.8,
      "bias": 8.3,
      "te": 5.7,
      "mau": 1.3
    },
    "des": {
      "cva": 4.9,
      "bias": 10.9,
      "te": 11.0,
      "mau": 2.8
    },
    "min": {
      "cva": 3.3,
      "bias": 19.8,
      "te": 18.0,
      "mau": 3.4
    },
    "acn": 10018,
    "lastUpdate": "2024-12-27"
  },
  {
    "test": "CEA",
    "search": "Carcinoembryonic antigen (CEA)",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.1,
      "cvg": 8.3
    },
    "opt": {
      "cva": 1.4,
      "bias": 1.5,
      "te": 6.7,
      "mau": 0.5
    },
    "des": {
      "cva": 5.5,
      "bias": 11.2,
      "te": 12.1,
      "mau": 0.8
    },
    "min": {
      "cva": 11.7,
      "bias": 18.3,
      "te": 18.9,
      "mau": 4.5
    },
    "acn": 10003,
    "lastUpdate": "2025-01-02"
  },
  {
    "test": "CKMB",
    "search": "CK-MB isoenzyme activity",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 8.3,
      "cvg": 12.0
    },
    "opt": {
      "cva": 3.9,
      "bias": 6.4,
      "te": 10.0,
      "mau": 0.7
    },
    "des": {
      "cva": 2.2,
      "bias": 2.5,
      "te": 21.8,
      "mau": 2.7
    },
    "min": {
      "cva": 11.7,
      "bias": 15.1,
      "te": 38.2,
      "mau": 1.9
    },
    "acn": 10041,
    "lastUpdate": "2026-01-21"
  },
  {
    "test": "CKMBST",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.1,
      "cvg": 15.5
    },
    "opt": {
      "cva": 2.2,
      "bias": 8.0,
      "te": 13.9,
      "mau": 0.9
    },
    "des": {
      "cva": 7.8,
      "bias": 3.9,
      "te": 23.6,
      "mau": 1.5
    },
    "min": {
      "cva": 7.1,
      "bias": 9.7,
      "te": 27.0,
      "mau": 2.3
    },
    "acn": 10058,
    "lastUpdate": "2025-03-02"
  },
  {
    "test": "CMVAVI",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.2,
      "cvg": 12.8
    },
    "opt": {
      "cva": 2.2,
      "bias": 4.7,
      "te": 6.6,
      "mau": 0.6
    },
    "des": {
      "cva": 2.7,
      "bias": 13.3,
      "te": 24.0,
      "mau": 2.6
    },
    "min": {
      "cva": 8.2,
      "bias": 15.6,
      "te": 31.9,
      "mau": 4.8
    },
    "acn": 11151,
    "lastUpdate": "2025-01-04"
  },
  {
    "test": "CMVIGG",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 8.1,
      "cvg": 5.7
    },
    "opt": {
      "cva": 3.8,
      "bias": 9.3,
      "te": 11.3,
      "mau": 1.2
    },
    "des": {
      "cva": 3.7,
      "bias": 9.9,
      "te": 15.0,
      "mau": 1.0
    },
    "min": {
      "cva": 6.7,
      "bias": 6.2,
      "te": 21.8,
      "mau": 4.8
    },
    "acn": 10218,
    "lastUpdate": "2025-02-08"
  },
  {
    "test": "CMVIGM",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.0,
      "cvg": 16.3
    },
    "opt": {
      "cva": 1.9,
      "bias": 6.2,
      "te": 5.3,
      "mau": 0.2
    },
    "des": {
      "cva": 2.2,
      "bias": 10.3,
      "te": 22.3,
      "mau": 2.1
    },
    "min": {
      "cva": 3.4,
      "bias": 5.1,
      "te": 28.5,
      "mau": 3.3
    },
    "acn": 10218,
    "lastUpdate": "2026-02-21"
  },
  {
    "test": "CORT 2",
    "search": "Cortisol",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.6,
      "cvg": 17.7
    },
    "opt": {
      "cva": 3.9,
      "bias": 8.9,
      "te": 14.3,
      "mau": 0.8
    },
    "des": {
      "cva": 2.1,
      "bias": 6.0,
      "te": 12.2,
      "mau": 2.5
    },
    "min": {
      "cva": 5.1,
      "bias": 4.4,
      "te": 32.8,
      "mau": 2.8
    },
    "acn": 10042,
    "lastUpdate": "2025-02-13"
  },
  {
    "test": "CORT 2 - Saliva",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.7,
      "cvg": 10.0
    },
    "opt": {
      "cva": 3.8,
      "bias": 4.1,
      "te": 8.1,
      "mau": 0.2
    },
    "des": {
      "cva": 7.6,
      "bias": 7.7,
      "te": 24.3,
      "mau": 0.9
    },
    "min": {
      "cva": 5.3,
      "bias": 13.6,
      "te": 39.8,
      "mau": 1.1
    },
    "acn": 10042,
    "lastUpdate": "2025-07-14"
  },
  {
    "test": "CPEPTID",
    "search": "Proinsulin C-peptide",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 3.5,
      "cvg": 15.1
    },
    "opt": {
      "cva": 2.4,
      "bias": 8.3,
      "te": 15.0,
      "mau": 1.0
    },
    "des": {
      "cva": 2.5,
      "bias": 13.4,
      "te": 21.9,
      "mau": 2.1
    },
    "min": {
      "cva": 9.0,
      "bias": 5.5,
      "te": 18.2,
      "mau": 4.3
    },
    "acn": 10081,
    "lastUpdate": "2025-11-14"
  },
  {
    "test": "CPEPTID - Urine",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 73,
    "conf": "high",
    "est": {
      "cvi": 5.3,
      "cvg": 15.2
    },
    "opt": {
      "cva": 1.5,
      "bias": 7.4,
      "te": 6.2,
      "mau": 0.4
    },
    "des": {
      "cva": 4.1,
      "bias": 9.6,
      "te": 12.1,
      "mau": 1.9
    },
    "min": {
      "cva": 9.3,
      "bias": 6.4,
      "te": 30.7,
      "mau": 3.9
    },
    "acn": 10081,
    "lastUpdate": "2025-11-23"
  },
  {
    "test": "CROSSL",
    "search": "C-terminal cross-linked telopeptide of type I collagen (CTX)",
    "category": "Immunology",
    "status": "working",
    "progress": 87,
    "conf": "mid",
    "est": {
      "cvi": 3.9,
      "cvg": 13.3
    },
    "opt": {
      "cva": 4.2,
      "bias": 2.3,
      "te": 9.9,
      "mau": 1.1
    },
    "des": {
      "cva": 2.0,
      "bias": 2.6,
      "te": 16.4,
      "mau": 2.1
    },
    "min": {
      "cva": 3.7,
      "bias": 12.9,
      "te": 16.3,
      "mau": 2.9
    },
    "acn": 10062,
    "lastUpdate": "2026-03-25"
  },
  {
    "test": "CSA",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.5,
      "cvg": 9.6
    },
    "opt": {
      "cva": 4.9,
      "bias": 7.8,
      "te": 13.8,
      "mau": 0.5
    },
    "des": {
      "cva": 4.8,
      "bias": 5.7,
      "te": 18.6,
      "mau": 2.6
    },
    "min": {
      "cva": 6.7,
      "bias": 8.6,
      "te": 28.5,
      "mau": 2.6
    },
    "acn": 10109,
    "lastUpdate": "2025-04-09"
  },
  {
    "test": "CYFRA",
    "search": "Cyfra21-1",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 6.4,
      "cvg": 13.5
    },
    "opt": {
      "cva": 3.5,
      "bias": 6.1,
      "te": 13.2,
      "mau": 1.0
    },
    "des": {
      "cva": 2.5,
      "bias": 13.6,
      "te": 22.0,
      "mau": 0.5
    },
    "min": {
      "cva": 5.4,
      "bias": 8.5,
      "te": 15.9,
      "mau": 2.1
    },
    "acn": 10030,
    "lastUpdate": "2024-12-13"
  },
  {
    "test": "DHEAS",
    "search": "Dehydroepiandrosterone sulphate (DHEAS)",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.1,
      "cvg": 15.5
    },
    "opt": {
      "cva": 1.3,
      "bias": 7.2,
      "te": 5.9,
      "mau": 0.5
    },
    "des": {
      "cva": 6.3,
      "bias": 10.6,
      "te": 17.6,
      "mau": 1.9
    },
    "min": {
      "cva": 9.9,
      "bias": 13.5,
      "te": 36.5,
      "mau": 1.7
    },
    "acn": 10068,
    "lastUpdate": "2026-02-19"
  },
  {
    "test": "DIGIT ",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 61,
    "conf": "mid",
    "est": {
      "cvi": 3.0,
      "cvg": 12.0
    },
    "opt": {
      "cva": 2.9,
      "bias": 7.2,
      "te": 9.4,
      "mau": 0.8
    },
    "des": {
      "cva": 7.8,
      "bias": 11.8,
      "te": 21.4,
      "mau": 0.8
    },
    "min": {
      "cva": 5.5,
      "bias": 14.2,
      "te": 25.1,
      "mau": 1.1
    },
    "acn": 10063,
    "lastUpdate": "2024-11-21"
  },
  {
    "test": "DIGO ",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.3,
      "cvg": 18.0
    },
    "opt": {
      "cva": 2.2,
      "bias": 1.3,
      "te": 7.9,
      "mau": 0.6
    },
    "des": {
      "cva": 7.4,
      "bias": 4.8,
      "te": 24.8,
      "mau": 2.9
    },
    "min": {
      "cva": 9.9,
      "bias": 5.3,
      "te": 22.8,
      "mau": 3.9
    },
    "acn": 10056,
    "lastUpdate": "2024-11-24"
  },
  {
    "test": "E2 3",
    "search": "Estradiol",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.4,
      "cvg": 6.5
    },
    "opt": {
      "cva": 2.5,
      "bias": 1.7,
      "te": 5.6,
      "mau": 1.5
    },
    "des": {
      "cva": 5.1,
      "bias": 14.0,
      "te": 22.0,
      "mau": 0.8
    },
    "min": {
      "cva": 8.0,
      "bias": 8.1,
      "te": 36.2,
      "mau": 4.1
    },
    "acn": 10100,
    "lastUpdate": "2025-09-09"
  },
  {
    "test": "EVL",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 6.9,
      "cvg": 19.8
    },
    "opt": {
      "cva": 1.5,
      "bias": 7.5,
      "te": 6.6,
      "mau": 0.6
    },
    "des": {
      "cva": 5.4,
      "bias": 5.4,
      "te": 10.5,
      "mau": 2.9
    },
    "min": {
      "cva": 4.7,
      "bias": 18.2,
      "te": 31.8,
      "mau": 4.7
    },
    "acn": 10126,
    "lastUpdate": "2025-01-22"
  },
  {
    "test": "FBHCG",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.7,
      "cvg": 6.7
    },
    "opt": {
      "cva": 3.0,
      "bias": 5.0,
      "te": 9.0,
      "mau": 1.4
    },
    "des": {
      "cva": 6.0,
      "bias": 5.3,
      "te": 15.0,
      "mau": 2.3
    },
    "min": {
      "cva": 3.3,
      "bias": 11.8,
      "te": 29.5,
      "mau": 3.8
    },
    "acn": 10017,
    "lastUpdate": "2025-09-28"
  },
  {
    "test": "FERR",
    "search": "Ferritin",
    "category": "Immunology",
    "status": "done",
    "progress": 21,
    "conf": "high",
    "est": {
      "cvi": 9.1,
      "cvg": 7.1
    },
    "opt": {
      "cva": 4.1,
      "bias": 7.6,
      "te": 13.4,
      "mau": 0.5
    },
    "des": {
      "cva": 3.0,
      "bias": 9.7,
      "te": 11.5,
      "mau": 1.5
    },
    "min": {
      "cva": 7.2,
      "bias": 16.0,
      "te": 35.9,
      "mau": 3.6
    },
    "acn": 10034,
    "lastUpdate": "2025-05-03"
  },
  {
    "test": "FOL",
    "search": "Folate",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.7,
      "cvg": 13.7
    },
    "opt": {
      "cva": 3.8,
      "bias": 8.5,
      "te": 14.0,
      "mau": 0.4
    },
    "des": {
      "cva": 7.6,
      "bias": 4.8,
      "te": 21.4,
      "mau": 2.9
    },
    "min": {
      "cva": 6.2,
      "bias": 3.5,
      "te": 33.4,
      "mau": 3.2
    },
    "acn": 10168,
    "lastUpdate": "2025-05-13"
  },
  {
    "test": "FPSA",
    "search": "Prostate specific antigen (PSA) - free",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.2,
      "cvg": 7.7
    },
    "opt": {
      "cva": 2.5,
      "bias": 9.3,
      "te": 8.0,
      "mau": 0.8
    },
    "des": {
      "cva": 2.4,
      "bias": 2.7,
      "te": 10.8,
      "mau": 2.9
    },
    "min": {
      "cva": 10.5,
      "bias": 15.6,
      "te": 31.1,
      "mau": 1.2
    },
    "acn": 10188,
    "lastUpdate": "2025-03-31"
  },
  {
    "test": "FSH",
    "search": "Follicle stimulating hormone (FSH)",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 3.3,
      "cvg": 6.9
    },
    "opt": {
      "cva": 2.3,
      "bias": 3.6,
      "te": 7.4,
      "mau": 0.3
    },
    "des": {
      "cva": 7.3,
      "bias": 8.8,
      "te": 23.3,
      "mau": 0.6
    },
    "min": {
      "cva": 5.4,
      "bias": 19.4,
      "te": 25.1,
      "mau": 2.0
    },
    "acn": 10207,
    "lastUpdate": "2026-03-19"
  },
  {
    "test": "FT3 3",
    "search": "Triiodothyronine - free (FT3)",
    "category": "Immunology",
    "status": "done",
    "progress": 50,
    "conf": "high",
    "est": {
      "cvi": 10.0,
      "cvg": 9.2
    },
    "opt": {
      "cva": 2.0,
      "bias": 4.6,
      "te": 13.5,
      "mau": 0.9
    },
    "des": {
      "cva": 4.4,
      "bias": 9.5,
      "te": 23.2,
      "mau": 0.5
    },
    "min": {
      "cva": 9.4,
      "bias": 13.7,
      "te": 30.1,
      "mau": 4.8
    },
    "acn": 10220,
    "lastUpdate": "2024-11-12"
  },
  {
    "test": "FT4 4",
    "search": "Thyroxine - free (FT4)",
    "category": "Immunology",
    "status": "done",
    "progress": 21,
    "conf": "mid",
    "est": {
      "cvi": 6.3,
      "cvg": 18.8
    },
    "opt": {
      "cva": 2.7,
      "bias": 8.0,
      "te": 7.4,
      "mau": 0.9
    },
    "des": {
      "cva": 3.9,
      "bias": 14.4,
      "te": 12.7,
      "mau": 0.8
    },
    "min": {
      "cva": 3.8,
      "bias": 15.6,
      "te": 37.0,
      "mau": 1.2
    },
    "acn": 10195,
    "lastUpdate": "2026-01-24"
  },
  {
    "test": "GDF‑15",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 47,
    "conf": "high",
    "est": {
      "cvi": 9.0,
      "cvg": 9.6
    },
    "opt": {
      "cva": 4.7,
      "bias": 9.3,
      "te": 7.9,
      "mau": 0.2
    },
    "des": {
      "cva": 7.5,
      "bias": 10.9,
      "te": 10.4,
      "mau": 0.7
    },
    "min": {
      "cva": 8.4,
      "bias": 10.6,
      "te": 17.4,
      "mau": 2.9
    },
    "acn": 10127,
    "lastUpdate": "2025-05-09"
  },
  {
    "test": "HBEAG",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.6,
      "cvg": 10.6
    },
    "opt": {
      "cva": 1.9,
      "bias": 2.6,
      "te": 5.9,
      "mau": 1.2
    },
    "des": {
      "cva": 3.1,
      "bias": 12.5,
      "te": 11.7,
      "mau": 2.4
    },
    "min": {
      "cva": 5.6,
      "bias": 4.8,
      "te": 22.8,
      "mau": 1.7
    },
    "acn": 10036,
    "lastUpdate": "2026-03-17"
  },
  {
    "test": "HBSAG 2",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.3,
      "cvg": 8.9
    },
    "opt": {
      "cva": 1.5,
      "bias": 3.0,
      "te": 9.8,
      "mau": 0.8
    },
    "des": {
      "cva": 7.3,
      "bias": 4.9,
      "te": 22.8,
      "mau": 1.4
    },
    "min": {
      "cva": 9.0,
      "bias": 16.9,
      "te": 27.4,
      "mau": 2.0
    },
    "acn": 10049,
    "lastUpdate": "2025-03-23"
  },
  {
    "test": "HBSAGQ2",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 37,
    "conf": "mid",
    "est": {
      "cvi": 8.4,
      "cvg": 15.1
    },
    "opt": {
      "cva": 3.5,
      "bias": 9.6,
      "te": 6.2,
      "mau": 1.4
    },
    "des": {
      "cva": 4.6,
      "bias": 6.3,
      "te": 10.6,
      "mau": 2.3
    },
    "min": {
      "cva": 11.5,
      "bias": 15.2,
      "te": 34.3,
      "mau": 3.5
    },
    "acn": 10055,
    "lastUpdate": "2026-02-10"
  },
  {
    "test": "HCG-BETA",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.3,
      "cvg": 18.1
    },
    "opt": {
      "cva": 4.8,
      "bias": 9.7,
      "te": 14.0,
      "mau": 0.6
    },
    "des": {
      "cva": 5.0,
      "bias": 6.5,
      "te": 23.9,
      "mau": 1.8
    },
    "min": {
      "cva": 4.2,
      "bias": 8.0,
      "te": 23.7,
      "mau": 2.5
    },
    "acn": 10072,
    "lastUpdate": "2025-08-22"
  },
  {
    "test": "HCGST",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.6,
      "cvg": 10.5
    },
    "opt": {
      "cva": 2.7,
      "bias": 9.2,
      "te": 9.7,
      "mau": 0.5
    },
    "des": {
      "cva": 4.7,
      "bias": 5.7,
      "te": 22.3,
      "mau": 1.7
    },
    "min": {
      "cva": 5.9,
      "bias": 17.9,
      "te": 27.6,
      "mau": 2.6
    },
    "acn": 10203,
    "lastUpdate": "2025-08-24"
  },
  {
    "test": "HCT",
    "search": "Calcitonin",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 2.8,
      "cvg": 5.1
    },
    "opt": {
      "cva": 2.4,
      "bias": 5.7,
      "te": 13.4,
      "mau": 0.3
    },
    "des": {
      "cva": 7.2,
      "bias": 12.6,
      "te": 19.4,
      "mau": 0.7
    },
    "min": {
      "cva": 6.8,
      "bias": 10.2,
      "te": 23.5,
      "mau": 1.8
    },
    "acn": 10191,
    "lastUpdate": "2026-01-13"
  },
  {
    "test": "HE4",
    "search": "Human epididymis protein 4 (HE4)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.8,
      "cvg": 17.9
    },
    "opt": {
      "cva": 4.9,
      "bias": 6.4,
      "te": 6.4,
      "mau": 1.5
    },
    "des": {
      "cva": 7.3,
      "bias": 6.7,
      "te": 10.2,
      "mau": 1.7
    },
    "min": {
      "cva": 6.6,
      "bias": 19.6,
      "te": 29.3,
      "mau": 4.1
    },
    "acn": 10102,
    "lastUpdate": "2025-07-02"
  },
  {
    "test": "hGH ",
    "search": "Growth hormone releasing hormone (GHRH)",
    "category": "Immunology",
    "status": "working",
    "progress": 28,
    "conf": "high",
    "est": {
      "cvi": 9.8,
      "cvg": 5.9
    },
    "opt": {
      "cva": 2.1,
      "bias": 1.0,
      "te": 8.1,
      "mau": 0.2
    },
    "des": {
      "cva": 4.7,
      "bias": 7.4,
      "te": 20.7,
      "mau": 1.9
    },
    "min": {
      "cva": 11.4,
      "bias": 15.0,
      "te": 37.6,
      "mau": 4.7
    },
    "acn": 10096,
    "lastUpdate": "2025-08-12"
  },
  {
    "test": "HIVDUO",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 3.9,
      "cvg": 6.5
    },
    "opt": {
      "cva": 4.1,
      "bias": 2.1,
      "te": 11.2,
      "mau": 1.0
    },
    "des": {
      "cva": 3.6,
      "bias": 8.8,
      "te": 21.3,
      "mau": 2.2
    },
    "min": {
      "cva": 10.4,
      "bias": 9.5,
      "te": 39.5,
      "mau": 1.7
    },
    "acn": 12018,
    "lastUpdate": "2026-02-13"
  },
  {
    "test": "HSV1",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.1,
      "cvg": 10.7
    },
    "opt": {
      "cva": 1.0,
      "bias": 6.7,
      "te": 13.3,
      "mau": 0.1
    },
    "des": {
      "cva": 2.1,
      "bias": 2.9,
      "te": 15.3,
      "mau": 2.3
    },
    "min": {
      "cva": 10.8,
      "bias": 16.8,
      "te": 38.1,
      "mau": 2.0
    },
    "acn": 10098,
    "lastUpdate": "2025-06-15"
  },
  {
    "test": "HSV2",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 23,
    "conf": "mid",
    "est": {
      "cvi": 8.8,
      "cvg": 10.2
    },
    "opt": {
      "cva": 4.7,
      "bias": 6.8,
      "te": 11.7,
      "mau": 1.2
    },
    "des": {
      "cva": 5.2,
      "bias": 11.7,
      "te": 22.8,
      "mau": 0.5
    },
    "min": {
      "cva": 7.6,
      "bias": 4.0,
      "te": 18.5,
      "mau": 1.2
    },
    "acn": 10099,
    "lastUpdate": "2025-12-10"
  },
  {
    "test": "HTLV",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 6.9,
      "cvg": 13.6
    },
    "opt": {
      "cva": 3.8,
      "bias": 4.1,
      "te": 12.1,
      "mau": 0.3
    },
    "des": {
      "cva": 2.8,
      "bias": 10.2,
      "te": 18.2,
      "mau": 2.0
    },
    "min": {
      "cva": 4.6,
      "bias": 5.4,
      "te": 22.1,
      "mau": 4.7
    },
    "acn": 10219,
    "lastUpdate": "2026-01-16"
  },
  {
    "test": "IGE 2 ",
    "search": "IgE",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.0,
      "cvg": 17.2
    },
    "opt": {
      "cva": 1.4,
      "bias": 8.6,
      "te": 6.2,
      "mau": 0.5
    },
    "des": {
      "cva": 3.7,
      "bias": 10.7,
      "te": 16.6,
      "mau": 1.0
    },
    "min": {
      "cva": 11.5,
      "bias": 15.8,
      "te": 28.0,
      "mau": 3.9
    },
    "acn": 10057,
    "lastUpdate": "2025-11-04"
  },
  {
    "test": "IGF-1",
    "search": "Insulin-like growth factor-1 (IGF-1)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.0,
      "cvg": 8.2
    },
    "opt": {
      "cva": 2.1,
      "bias": 9.8,
      "te": 14.9,
      "mau": 1.0
    },
    "des": {
      "cva": 4.7,
      "bias": 3.9,
      "te": 17.9,
      "mau": 2.9
    },
    "min": {
      "cva": 6.1,
      "bias": 7.5,
      "te": 27.6,
      "mau": 1.2
    },
    "acn": 10116,
    "lastUpdate": "2025-05-16"
  },
  {
    "test": "IGFBP-3",
    "search": "Insulin-like growth factor binding protein 3 (IGFBP-3)",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.3,
      "cvg": 12.2
    },
    "opt": {
      "cva": 1.5,
      "bias": 2.8,
      "te": 5.7,
      "mau": 0.5
    },
    "des": {
      "cva": 5.4,
      "bias": 2.7,
      "te": 15.0,
      "mau": 2.4
    },
    "min": {
      "cva": 4.4,
      "bias": 6.2,
      "te": 25.9,
      "mau": 1.2
    },
    "acn": 10117,
    "lastUpdate": "2024-12-08"
  },
  {
    "test": "IL6",
    "search": "Interleukin-6 (IL6)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.0,
      "cvg": 10.3
    },
    "opt": {
      "cva": 2.0,
      "bias": 6.5,
      "te": 9.1,
      "mau": 0.9
    },
    "des": {
      "cva": 3.7,
      "bias": 8.0,
      "te": 16.3,
      "mau": 2.0
    },
    "min": {
      "cva": 8.8,
      "bias": 15.8,
      "te": 22.2,
      "mau": 3.5
    },
    "acn": 10085,
    "lastUpdate": "2024-12-02"
  },
  {
    "test": "INSULIN",
    "search": "Insulin",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 6.8,
      "cvg": 8.0
    },
    "opt": {
      "cva": 3.8,
      "bias": 8.6,
      "te": 6.2,
      "mau": 1.0
    },
    "des": {
      "cva": 4.0,
      "bias": 11.2,
      "te": 23.8,
      "mau": 2.5
    },
    "min": {
      "cva": 7.5,
      "bias": 4.9,
      "te": 39.3,
      "mau": 4.9
    },
    "acn": 10059,
    "lastUpdate": "2025-04-22"
  },
  {
    "test": "LH",
    "search": "Luteinising hormone (LH)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.1,
      "cvg": 8.2
    },
    "opt": {
      "cva": 4.8,
      "bias": 4.7,
      "te": 12.8,
      "mau": 0.4
    },
    "des": {
      "cva": 2.1,
      "bias": 8.1,
      "te": 18.0,
      "mau": 1.7
    },
    "min": {
      "cva": 11.9,
      "bias": 3.3,
      "te": 19.2,
      "mau": 3.2
    },
    "acn": 10113,
    "lastUpdate": "2025-12-03"
  },
  {
    "test": "MYO",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.7,
      "cvg": 17.1
    },
    "opt": {
      "cva": 2.4,
      "bias": 4.9,
      "te": 13.1,
      "mau": 1.0
    },
    "des": {
      "cva": 7.5,
      "bias": 8.2,
      "te": 14.3,
      "mau": 1.2
    },
    "min": {
      "cva": 8.2,
      "bias": 16.8,
      "te": 22.9,
      "mau": 4.4
    },
    "acn": 10028,
    "lastUpdate": "2025-12-11"
  },
  {
    "test": "MYOST",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 80,
    "conf": "high",
    "est": {
      "cvi": 2.2,
      "cvg": 13.0
    },
    "opt": {
      "cva": 2.4,
      "bias": 7.1,
      "te": 7.8,
      "mau": 0.2
    },
    "des": {
      "cva": 7.7,
      "bias": 7.2,
      "te": 20.5,
      "mau": 0.9
    },
    "min": {
      "cva": 10.3,
      "bias": 6.9,
      "te": 27.2,
      "mau": 3.8
    },
    "acn": 10076,
    "lastUpdate": "2024-12-23"
  },
  {
    "test": "NSE",
    "search": "Neuron specific enolase",
    "category": "Immunology",
    "status": "done",
    "progress": 62,
    "conf": "high",
    "est": {
      "cvi": 1.0,
      "cvg": 6.8
    },
    "opt": {
      "cva": 4.2,
      "bias": 8.7,
      "te": 11.2,
      "mau": 0.7
    },
    "des": {
      "cva": 2.2,
      "bias": 6.2,
      "te": 23.0,
      "mau": 2.1
    },
    "min": {
      "cva": 6.4,
      "bias": 11.9,
      "te": 34.5,
      "mau": 2.4
    },
    "acn": 10073,
    "lastUpdate": "2025-04-15"
  },
  {
    "test": "OSTEOC",
    "search": "Osteocalcin",
    "category": "Immunology",
    "status": "done",
    "progress": 85,
    "conf": "mid",
    "est": {
      "cvi": 7.4,
      "cvg": 11.0
    },
    "opt": {
      "cva": 2.1,
      "bias": 6.2,
      "te": 8.9,
      "mau": 0.7
    },
    "des": {
      "cva": 5.8,
      "bias": 3.4,
      "te": 19.8,
      "mau": 2.4
    },
    "min": {
      "cva": 8.8,
      "bias": 14.7,
      "te": 37.4,
      "mau": 3.4
    },
    "acn": 10060,
    "lastUpdate": "2024-12-13"
  },
  {
    "test": "PAPPA",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 6.4,
      "cvg": 13.9
    },
    "opt": {
      "cva": 2.7,
      "bias": 4.1,
      "te": 11.8,
      "mau": 0.6
    },
    "des": {
      "cva": 2.8,
      "bias": 10.4,
      "te": 24.8,
      "mau": 2.5
    },
    "min": {
      "cva": 9.5,
      "bias": 3.5,
      "te": 15.4,
      "mau": 1.3
    },
    "acn": 10089,
    "lastUpdate": "2025-04-30"
  },
  {
    "test": "PBNPSTX",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.8,
      "cvg": 9.1
    },
    "opt": {
      "cva": 1.8,
      "bias": 2.5,
      "te": 6.8,
      "mau": 0.6
    },
    "des": {
      "cva": 6.4,
      "bias": 13.0,
      "te": 10.1,
      "mau": 2.4
    },
    "min": {
      "cva": 9.9,
      "bias": 3.2,
      "te": 16.2,
      "mau": 4.4
    },
    "acn": 10238,
    "lastUpdate": "2024-12-23"
  },
  {
    "test": "PBNPX",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.6,
      "cvg": 14.6
    },
    "opt": {
      "cva": 1.5,
      "bias": 6.7,
      "te": 14.4,
      "mau": 1.2
    },
    "des": {
      "cva": 4.6,
      "bias": 5.3,
      "te": 24.8,
      "mau": 1.1
    },
    "min": {
      "cva": 7.6,
      "bias": 17.0,
      "te": 15.4,
      "mau": 1.9
    },
    "acn": 10237,
    "lastUpdate": "2025-04-04"
  },
  {
    "test": "PCTX",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.9,
      "cvg": 16.2
    },
    "opt": {
      "cva": 3.6,
      "bias": 7.8,
      "te": 14.9,
      "mau": 0.8
    },
    "des": {
      "cva": 6.0,
      "bias": 14.5,
      "te": 23.4,
      "mau": 2.1
    },
    "min": {
      "cva": 7.4,
      "bias": 11.1,
      "te": 20.6,
      "mau": 1.1
    },
    "acn": 10241,
    "lastUpdate": "2025-03-04"
  },
  {
    "test": "PIVKA",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.4,
      "cvg": 15.3
    },
    "opt": {
      "cva": 2.2,
      "bias": 2.3,
      "te": 9.0,
      "mau": 0.4
    },
    "des": {
      "cva": 4.5,
      "bias": 7.5,
      "te": 24.0,
      "mau": 0.9
    },
    "min": {
      "cva": 8.8,
      "bias": 9.4,
      "te": 19.1,
      "mau": 2.7
    },
    "acn": 10157,
    "lastUpdate": "2025-07-05"
  },
  {
    "test": "PLGF",
    "search": "Placenta growth factor ratio (PlGF)",
    "category": "Immunology",
    "status": "done",
    "progress": 31,
    "conf": "mid",
    "est": {
      "cvi": 2.8,
      "cvg": 9.7
    },
    "opt": {
      "cva": 2.1,
      "bias": 9.0,
      "te": 8.4,
      "mau": 1.3
    },
    "des": {
      "cva": 7.3,
      "bias": 5.9,
      "te": 22.7,
      "mau": 2.9
    },
    "min": {
      "cva": 3.2,
      "bias": 19.2,
      "te": 27.3,
      "mau": 1.1
    },
    "acn": 10038,
    "lastUpdate": "2025-08-29"
  },
  {
    "test": "PRL 2",
    "search": "Prolactin",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 7.6,
      "cvg": 6.7
    },
    "opt": {
      "cva": 1.4,
      "bias": 4.8,
      "te": 9.6,
      "mau": 1.3
    },
    "des": {
      "cva": 2.7,
      "bias": 7.2,
      "te": 10.9,
      "mau": 2.4
    },
    "min": {
      "cva": 6.1,
      "bias": 16.1,
      "te": 28.7,
      "mau": 4.6
    },
    "acn": 10111,
    "lastUpdate": "2024-11-10"
  },
  {
    "test": "PROG 3",
    "search": "Progesterone",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 9.1,
      "cvg": 17.4
    },
    "opt": {
      "cva": 4.1,
      "bias": 5.6,
      "te": 13.8,
      "mau": 0.4
    },
    "des": {
      "cva": 4.3,
      "bias": 8.8,
      "te": 18.2,
      "mau": 2.4
    },
    "min": {
      "cva": 6.7,
      "bias": 5.2,
      "te": 23.7,
      "mau": 3.2
    },
    "acn": 10045,
    "lastUpdate": "2025-04-25"
  },
  {
    "test": "PROGRP",
    "search": "Progastrin-releasing peptide (ProGRP)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 2.5,
      "cvg": 7.5
    },
    "opt": {
      "cva": 1.9,
      "bias": 4.9,
      "te": 10.2,
      "mau": 0.7
    },
    "des": {
      "cva": 2.8,
      "bias": 13.5,
      "te": 18.4,
      "mau": 0.7
    },
    "min": {
      "cva": 6.7,
      "bias": 15.0,
      "te": 39.2,
      "mau": 3.8
    },
    "acn": 10108,
    "lastUpdate": "2025-05-21"
  },
  {
    "test": "PTH",
    "search": "Parathyroid hormone",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 2.2,
      "cvg": 19.6
    },
    "opt": {
      "cva": 1.7,
      "bias": 7.4,
      "te": 8.6,
      "mau": 0.7
    },
    "des": {
      "cva": 4.2,
      "bias": 8.2,
      "te": 21.0,
      "mau": 2.7
    },
    "min": {
      "cva": 7.4,
      "bias": 10.2,
      "te": 38.8,
      "mau": 3.0
    },
    "acn": 10204,
    "lastUpdate": "2026-02-04"
  },
  {
    "test": "PTH - Plasma",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.2,
      "cvg": 14.0
    },
    "opt": {
      "cva": 3.6,
      "bias": 3.4,
      "te": 6.9,
      "mau": 0.6
    },
    "des": {
      "cva": 7.4,
      "bias": 12.3,
      "te": 13.8,
      "mau": 1.1
    },
    "min": {
      "cva": 10.0,
      "bias": 14.8,
      "te": 26.8,
      "mau": 2.7
    },
    "acn": 10204,
    "lastUpdate": "2024-12-24"
  },
  {
    "test": "PTH1‑84",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 8.7,
      "cvg": 10.4
    },
    "opt": {
      "cva": 4.9,
      "bias": 8.1,
      "te": 8.6,
      "mau": 1.0
    },
    "des": {
      "cva": 3.7,
      "bias": 2.9,
      "te": 22.6,
      "mau": 1.4
    },
    "min": {
      "cva": 5.6,
      "bias": 11.6,
      "te": 35.0,
      "mau": 4.1
    },
    "acn": 10101,
    "lastUpdate": "2025-09-02"
  },
  {
    "test": "PTHST",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 1.7,
      "cvg": 7.8
    },
    "opt": {
      "cva": 3.9,
      "bias": 3.5,
      "te": 8.6,
      "mau": 1.2
    },
    "des": {
      "cva": 6.5,
      "bias": 12.4,
      "te": 19.2,
      "mau": 2.8
    },
    "min": {
      "cva": 10.7,
      "bias": 12.6,
      "te": 31.4,
      "mau": 3.9
    },
    "acn": 10205,
    "lastUpdate": "2025-03-12"
  },
  {
    "test": "PTHST - Plasma",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 57,
    "conf": "mid",
    "est": {
      "cvi": 1.3,
      "cvg": 14.5
    },
    "opt": {
      "cva": 3.4,
      "bias": 4.2,
      "te": 11.4,
      "mau": 0.3
    },
    "des": {
      "cva": 7.4,
      "bias": 14.8,
      "te": 16.0,
      "mau": 1.8
    },
    "min": {
      "cva": 11.5,
      "bias": 8.1,
      "te": 23.4,
      "mau": 2.9
    },
    "acn": 10205,
    "lastUpdate": "2026-02-05"
  },
  {
    "test": "RBC‑FOL",
    "search": "Folate red blood cells",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.5,
      "cvg": 15.5
    },
    "opt": {
      "cva": 4.7,
      "bias": 2.8,
      "te": 14.7,
      "mau": 0.2
    },
    "des": {
      "cva": 6.2,
      "bias": 12.7,
      "te": 20.4,
      "mau": 1.0
    },
    "min": {
      "cva": 7.9,
      "bias": 9.1,
      "te": 33.2,
      "mau": 2.7
    },
    "acn": 10169,
    "lastUpdate": "2025-06-15"
  },
  {
    "test": "RUBIGG",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.7,
      "cvg": 6.9
    },
    "opt": {
      "cva": 3.2,
      "bias": 8.4,
      "te": 9.8,
      "mau": 1.4
    },
    "des": {
      "cva": 7.3,
      "bias": 15.0,
      "te": 16.8,
      "mau": 2.6
    },
    "min": {
      "cva": 4.3,
      "bias": 16.0,
      "te": 39.5,
      "mau": 1.4
    },
    "acn": 10024,
    "lastUpdate": "2025-12-01"
  },
  {
    "test": "RUBIGM",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 8.1,
      "cvg": 15.8
    },
    "opt": {
      "cva": 2.4,
      "bias": 5.9,
      "te": 11.8,
      "mau": 1.3
    },
    "des": {
      "cva": 6.8,
      "bias": 12.1,
      "te": 19.6,
      "mau": 1.7
    },
    "min": {
      "cva": 3.2,
      "bias": 15.7,
      "te": 37.6,
      "mau": 3.2
    },
    "acn": 10021,
    "lastUpdate": "2024-11-24"
  },
  {
    "test": "S100",
    "search": "S100 calcium-binding protein B (S100B)",
    "category": "Immunology",
    "status": "done",
    "progress": 82,
    "conf": "high",
    "est": {
      "cvi": 2.2,
      "cvg": 9.8
    },
    "opt": {
      "cva": 2.3,
      "bias": 3.2,
      "te": 14.7,
      "mau": 0.6
    },
    "des": {
      "cva": 7.3,
      "bias": 8.2,
      "te": 19.8,
      "mau": 2.3
    },
    "min": {
      "cva": 5.1,
      "bias": 18.1,
      "te": 37.6,
      "mau": 3.2
    },
    "acn": 10118,
    "lastUpdate": "2024-12-13"
  },
  {
    "test": "SCC",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 71,
    "conf": "high",
    "est": {
      "cvi": 5.2,
      "cvg": 7.1
    },
    "opt": {
      "cva": 1.2,
      "bias": 1.6,
      "te": 8.9,
      "mau": 0.7
    },
    "des": {
      "cva": 7.0,
      "bias": 8.9,
      "te": 10.5,
      "mau": 2.9
    },
    "min": {
      "cva": 3.9,
      "bias": 19.6,
      "te": 38.1,
      "mau": 1.1
    },
    "acn": 10050,
    "lastUpdate": "2025-06-27"
  },
  {
    "test": "SFLT1",
    "search": "Soluble fms-like tyrosine kinase 1 (sFlt-1)",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 1.1,
      "cvg": 11.9
    },
    "opt": {
      "cva": 4.2,
      "bias": 6.1,
      "te": 13.3,
      "mau": 0.6
    },
    "des": {
      "cva": 5.7,
      "bias": 4.4,
      "te": 13.0,
      "mau": 2.8
    },
    "min": {
      "cva": 11.1,
      "bias": 4.3,
      "te": 24.4,
      "mau": 2.2
    },
    "acn": 10046,
    "lastUpdate": "2025-09-01"
  },
  {
    "test": "SHBG",
    "search": "Sexual-hormone-binding-globulin (SHBG)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.0,
      "cvg": 14.8
    },
    "opt": {
      "cva": 4.8,
      "bias": 5.8,
      "te": 13.7,
      "mau": 0.6
    },
    "des": {
      "cva": 7.0,
      "bias": 8.7,
      "te": 22.2,
      "mau": 1.1
    },
    "min": {
      "cva": 10.1,
      "bias": 6.2,
      "te": 23.4,
      "mau": 3.4
    },
    "acn": 10071,
    "lastUpdate": "2025-10-14"
  },
  {
    "test": "SRL",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 54,
    "conf": "high",
    "est": {
      "cvi": 7.1,
      "cvg": 19.8
    },
    "opt": {
      "cva": 2.9,
      "bias": 8.3,
      "te": 14.4,
      "mau": 1.5
    },
    "des": {
      "cva": 5.7,
      "bias": 8.4,
      "te": 21.5,
      "mau": 1.1
    },
    "min": {
      "cva": 9.2,
      "bias": 6.7,
      "te": 21.3,
      "mau": 3.4
    },
    "acn": 10129,
    "lastUpdate": "2025-10-28"
  },
  {
    "test": "SYPHILIS",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 83,
    "conf": "mid",
    "est": {
      "cvi": 8.3,
      "cvg": 17.8
    },
    "opt": {
      "cva": 4.5,
      "bias": 1.4,
      "te": 6.5,
      "mau": 1.4
    },
    "des": {
      "cva": 7.9,
      "bias": 13.2,
      "te": 11.2,
      "mau": 2.4
    },
    "min": {
      "cva": 3.8,
      "bias": 15.7,
      "te": 38.4,
      "mau": 1.8
    },
    "acn": 10212,
    "lastUpdate": "2025-08-27"
  },
  {
    "test": "T UP",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 59,
    "conf": "mid",
    "est": {
      "cvi": 3.9,
      "cvg": 19.7
    },
    "opt": {
      "cva": 3.2,
      "bias": 6.4,
      "te": 10.3,
      "mau": 0.3
    },
    "des": {
      "cva": 4.6,
      "bias": 8.8,
      "te": 13.8,
      "mau": 0.6
    },
    "min": {
      "cva": 3.1,
      "bias": 15.4,
      "te": 30.1,
      "mau": 4.0
    },
    "acn": 10051,
    "lastUpdate": "2026-01-18"
  },
  {
    "test": "T3",
    "search": "Total tri-iodothyronine (T3)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 4.0,
      "cvg": 8.6
    },
    "opt": {
      "cva": 3.7,
      "bias": 2.2,
      "te": 12.2,
      "mau": 1.0
    },
    "des": {
      "cva": 4.5,
      "bias": 7.2,
      "te": 11.5,
      "mau": 2.8
    },
    "min": {
      "cva": 7.0,
      "bias": 17.6,
      "te": 23.9,
      "mau": 1.1
    },
    "acn": 10032,
    "lastUpdate": "2025-07-31"
  },
  {
    "test": "T4",
    "search": "Thyroxine - total (T4)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 6.7,
      "cvg": 19.3
    },
    "opt": {
      "cva": 4.0,
      "bias": 2.1,
      "te": 7.5,
      "mau": 0.2
    },
    "des": {
      "cva": 5.9,
      "bias": 11.1,
      "te": 15.8,
      "mau": 2.8
    },
    "min": {
      "cva": 7.2,
      "bias": 9.5,
      "te": 28.4,
      "mau": 4.8
    },
    "acn": 10120,
    "lastUpdate": "2024-12-06"
  },
  {
    "test": "TCL",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 3.5,
      "cvg": 19.4
    },
    "opt": {
      "cva": 3.8,
      "bias": 3.4,
      "te": 7.3,
      "mau": 0.8
    },
    "des": {
      "cva": 5.7,
      "bias": 2.3,
      "te": 11.9,
      "mau": 1.2
    },
    "min": {
      "cva": 4.2,
      "bias": 6.2,
      "te": 27.8,
      "mau": 2.9
    },
    "acn": 10022,
    "lastUpdate": "2026-02-28"
  },
  {
    "test": "TESTO",
    "search": "Testosterone",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.1,
      "cvg": 7.0
    },
    "opt": {
      "cva": 1.6,
      "bias": 9.6,
      "te": 7.0,
      "mau": 0.4
    },
    "des": {
      "cva": 4.0,
      "bias": 7.6,
      "te": 17.4,
      "mau": 2.7
    },
    "min": {
      "cva": 11.3,
      "bias": 12.8,
      "te": 28.6,
      "mau": 1.8
    },
    "acn": 10020,
    "lastUpdate": "2026-02-10"
  },
  {
    "test": "TG 2",
    "search": "Thyroglobulin",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 9.5,
      "cvg": 7.6
    },
    "opt": {
      "cva": 3.2,
      "bias": 1.4,
      "te": 11.8,
      "mau": 1.4
    },
    "des": {
      "cva": 3.1,
      "bias": 9.7,
      "te": 10.1,
      "mau": 0.9
    },
    "min": {
      "cva": 3.1,
      "bias": 5.7,
      "te": 29.7,
      "mau": 4.7
    },
    "acn": 10215,
    "lastUpdate": "2025-05-01"
  },
  {
    "test": "TNI",
    "search": "Troponin I cardiac- contemporary",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 5.5,
      "cvg": 5.3
    },
    "opt": {
      "cva": 2.2,
      "bias": 1.6,
      "te": 5.8,
      "mau": 0.7
    },
    "des": {
      "cva": 5.3,
      "bias": 7.6,
      "te": 13.3,
      "mau": 0.7
    },
    "min": {
      "cva": 4.3,
      "bias": 16.4,
      "te": 38.0,
      "mau": 4.9
    },
    "acn": 10086,
    "lastUpdate": "2025-11-18"
  },
  {
    "test": "TNIST",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 52,
    "conf": "mid",
    "est": {
      "cvi": 3.8,
      "cvg": 13.7
    },
    "opt": {
      "cva": 1.8,
      "bias": 8.3,
      "te": 12.5,
      "mau": 1.4
    },
    "des": {
      "cva": 3.7,
      "bias": 11.7,
      "te": 14.9,
      "mau": 1.5
    },
    "min": {
      "cva": 10.0,
      "bias": 6.2,
      "te": 25.3,
      "mau": 4.6
    },
    "acn": 10054,
    "lastUpdate": "2025-05-21"
  },
  {
    "test": "TNTHSSTX",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 57,
    "conf": "high",
    "est": {
      "cvi": 1.2,
      "cvg": 14.9
    },
    "opt": {
      "cva": 3.4,
      "bias": 9.1,
      "te": 9.7,
      "mau": 1.2
    },
    "des": {
      "cva": 2.3,
      "bias": 7.5,
      "te": 11.3,
      "mau": 1.2
    },
    "min": {
      "cva": 6.7,
      "bias": 17.8,
      "te": 36.9,
      "mau": 1.5
    },
    "acn": 10240,
    "lastUpdate": "2025-03-02"
  },
  {
    "test": "TNTHSX",
    "search": "Troponin T cardiac - high-sensitive (biweekly-monthly sampling)",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.6,
      "cvg": 9.6
    },
    "opt": {
      "cva": 1.7,
      "bias": 5.9,
      "te": 12.9,
      "mau": 1.3
    },
    "des": {
      "cva": 4.6,
      "bias": 7.7,
      "te": 23.7,
      "mau": 1.8
    },
    "min": {
      "cva": 8.0,
      "bias": 16.4,
      "te": 27.4,
      "mau": 3.6
    },
    "acn": 10239,
    "lastUpdate": "2025-10-07"
  },
  {
    "test": "TOXOAV",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "working",
    "progress": 67,
    "conf": "mid",
    "est": {
      "cvi": 4.2,
      "cvg": 12.0
    },
    "opt": {
      "cva": 3.9,
      "bias": 2.5,
      "te": 10.3,
      "mau": 0.7
    },
    "des": {
      "cva": 6.1,
      "bias": 4.0,
      "te": 17.5,
      "mau": 1.7
    },
    "min": {
      "cva": 11.5,
      "bias": 7.2,
      "te": 18.9,
      "mau": 3.1
    },
    "acn": 12004,
    "lastUpdate": "2026-02-16"
  },
  {
    "test": "TOXOIGG",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 7.4,
      "cvg": 17.0
    },
    "opt": {
      "cva": 1.2,
      "bias": 1.1,
      "te": 14.4,
      "mau": 1.0
    },
    "des": {
      "cva": 5.7,
      "bias": 7.9,
      "te": 20.6,
      "mau": 1.8
    },
    "min": {
      "cva": 5.9,
      "bias": 10.4,
      "te": 16.8,
      "mau": 2.2
    },
    "acn": 10047,
    "lastUpdate": "2024-12-22"
  },
  {
    "test": "TOXOIGM",
    "search": "검색어 확인 불가",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 5.9,
      "cvg": 13.5
    },
    "opt": {
      "cva": 4.4,
      "bias": 10.0,
      "te": 12.7,
      "mau": 1.5
    },
    "des": {
      "cva": 3.6,
      "bias": 2.5,
      "te": 23.6,
      "mau": 0.9
    },
    "min": {
      "cva": 11.4,
      "bias": 14.2,
      "te": 25.3,
      "mau": 4.6
    },
    "acn": 10016,
    "lastUpdate": "2025-06-12"
  },
  {
    "test": "TPSA",
    "search": "Prostate specific antigen (PSA)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "mid",
    "est": {
      "cvi": 9.3,
      "cvg": 10.0
    },
    "opt": {
      "cva": 2.3,
      "bias": 5.1,
      "te": 5.8,
      "mau": 1.0
    },
    "des": {
      "cva": 7.5,
      "bias": 12.1,
      "te": 21.2,
      "mau": 0.6
    },
    "min": {
      "cva": 7.1,
      "bias": 8.7,
      "te": 26.0,
      "mau": 4.8
    },
    "acn": 10185,
    "lastUpdate": "2025-01-31"
  },
  {
    "test": "TSH",
    "search": "Thyroid stimulating hormone (TSH)",
    "category": "Immunology",
    "status": "done",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 3.3,
      "cvg": 20.0
    },
    "opt": {
      "cva": 1.2,
      "bias": 4.1,
      "te": 7.3,
      "mau": 0.8
    },
    "des": {
      "cva": 7.5,
      "bias": 10.5,
      "te": 20.8,
      "mau": 1.2
    },
    "min": {
      "cva": 6.7,
      "bias": 14.0,
      "te": 30.7,
      "mau": 2.7
    },
    "acn": 10172,
    "lastUpdate": "2025-12-30"
  },
  {
    "test": "VITDT 3",
    "search": "25-hydroxy vitamin D3",
    "category": "Immunology",
    "status": "working",
    "progress": 100,
    "conf": "high",
    "est": {
      "cvi": 4.7,
      "cvg": 5.4
    },
    "opt": {
      "cva": 3.4,
      "bias": 2.1,
      "te": 5.7,
      "mau": 0.2
    },
    "des": {
      "cva": 7.0,
      "bias": 11.3,
      "te": 14.4,
      "mau": 2.5
    },
    "min": {
      "cva": 8.7,
      "bias": 11.7,
      "te": 34.6,
      "mau": 1.3
    },
    "acn": 10194,
    "lastUpdate": "2025-07-17"
  },
  {
    "test": "TP1NP",
    "search": "Total P1NP",
    "category": "Immunology",
    "acn": 10119,
    "lastUpdate": "2026-02-12",
    "est": {
      "cvi": "10.0",
      "cvg": "15.0"
    },
    "opt": {
      "cva": "4.0",
      "bias": "5.0",
      "te": "11.6",
      "mau": "0.1"
    },
    "des": {
      "cva": "6.0",
      "bias": "8.0",
      "te": "17.9",
      "mau": "0.2"
    },
    "min": {
      "cva": "9.0",
      "bias": "12.0",
      "te": "26.8",
      "mau": "0.3"
    },
    "biovar": {
      "choice": "Desirable",
      "cvi": "10.0",
      "cvg": "15.0",
      "i": "5.0",
      "b": "7.5",
      "te": "15.8"
    },
    "tea_sources": {
      "clia": "20.0",
      "wlsh": "15.0",
      "cap": "25.0",
      "aab": "30.0",
      "rcpa": "18.0",
      "api": "22.0"
    }
  }
];

function getStatusColor(dateStr) {
    if (!dateStr) return 'gray';
    const updateDate = new Date(dateStr);
    const monthsAgo = (TODAY - updateDate) / (1000 * 60 * 60 * 24 * 30.44);
    if (monthsAgo >= 12) return '#ef4444'; 
    if (monthsAgo >= 6) return '#f59e0b';  
    return '#10b981'; 
}

function updateDashboardStatus() {
    const totalItemsEl = document.getElementById('total-items-count');
    if (totalItemsEl) totalItemsEl.textContent = sampleData.length;
    const statusCountsEl = document.getElementById('update-status-counts');
    if (statusCountsEl) statusCountsEl.textContent = `성공: ${sampleData.length} / 실패: 0`;
    let latestDate = null;
    sampleData.forEach(item => { if (!item.lastUpdate) return; const d = new Date(item.lastUpdate); if (!latestDate || d > latestDate) latestDate = d; });
    const dateStr = latestDate ? latestDate.toISOString().split('T')[0] : '데이터 없음';
    const color = getStatusColor(dateStr);
    const IDs = ['eflm', 'westgard', 'di'];
    IDs.forEach(id => {
        const timeEl = document.getElementById(id + '-update-time');
        const dotEl = document.getElementById(id + '-status-dot');
        const textEl = document.getElementById(id + '-status-text');
        if (timeEl) timeEl.textContent = '마지막 업데이트 날짜: ' + dateStr;
        if (dotEl) dotEl.style.background = color;
        if (textEl) {
            const monthsAgo = (TODAY - (latestDate || TODAY)) / (1000 * 60 * 60 * 24 * 30.44);
            if (monthsAgo >= 12) textEl.textContent = '장기 미갱신 (12개월+)';
            else if (monthsAgo >= 6) textEl.textContent = '갱신 필요 (6개월+)';
            else textEl.textContent = '최신 데이터 유지 중';
        }
    });
}

function openTEaReportModal() { document.getElementById('report-modal').classList.add('active'); }
function closeTEaReportModal() { document.getElementById('report-modal').classList.remove('active'); }

async function generateTEaReport(format = 'excel') {
    const includeEFLM = document.getElementById('export-eflm').checked;
    const includeWestgard = document.getElementById('export-westgard').checked;
    const includeDI = document.getElementById('export-di').checked;
    const selectedData = getFilteredData();
    if (selectedData.length === 0) { alert('선택된 항목이 없습니다. 대시보드에서 항목을 먼저 선택해주세요.'); return; }
    
    if (format === 'html') {
        generateHorizontalHTMLReport(selectedData, { includeEFLM, includeWestgard, includeDI });
        closeTEaReportModal();
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('TEa Report');

    const headers = [['Test Name']];
    const subHeaders = [['Test Name']];
    
    if (includeEFLM) {
        headers[0].push(...Array(15).fill('EFLM Database'));
        subHeaders[0].push('Search Term', 'CVI', 'CVG', 'Optimal CVa', 'Optimal Bias', 'Optimal TE', 'Optimal MAU', 'Desirable CVa', 'Desirable Bias', 'Desirable TE', 'Desirable MAU', 'Minimum CVa', 'Minimum Bias', 'Minimum TE', 'Minimum MAU');
    }
    if (includeWestgard) {
        headers[0].push(...Array(6).fill('Westgard Recommend'));
        subHeaders[0].push('Recommended', 'CVI', 'CVG', 'I', 'B', 'TE');
    }
    if (includeDI) {
        headers[0].push(...Array(6).fill('Data Innovation (TEa Table)'));
        subHeaders[0].push('CLIA', 'WLSH', 'CAP', 'AAB', 'RCPA', 'API');
    }

    worksheet.addRows(headers);
    worksheet.addRows(subHeaders);

    selectedData.forEach(item => {
        const row = [item.test];
        if (includeEFLM) row.push(item.search||'-', item.est?.cvi||'-', item.est?.cvg||'-', item.opt?.cva||'-', item.opt?.bias||'-', item.opt?.te||'-', item.opt?.mau||'-', item.des?.cva||'-', item.des?.bias||'-', item.des?.te||'-', item.des?.mau||'-', item.min?.cva||'-', item.min?.bias||'-', item.min?.te||'-', item.min?.mau||'-');
        if (includeWestgard) { const bv = item.biovar || {}; row.push(bv.choice||'-', bv.cvi||'-', bv.cvg||'-', bv.i||'-', bv.b||'-', bv.te||'-'); }
        if (includeDI) { const tea = item.tea_sources || {}; row.push(tea.clia||'-', tea.wlsh||'-', tea.cap||'-', tea.aab||'-', tea.rcpa||'-', tea.api||'-'); }
        worksheet.addRow(row);
    });

    let currentCol = 2;
    const mergeAndStyle = (count, title, color) => {
        if (count <= 0) return;
        const start = currentCol, end = currentCol + count - 1;
        worksheet.mergeCells(1, start, 1, end);
        const cell = worksheet.getCell(1, start);
        cell.value = title; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        for(let i=start; i<=end; i++) {
            const subCell = worksheet.getCell(2, i);
            subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.replace('FF', 'EE') } };
            subCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            subCell.alignment = { horizontal: 'center' };
        }
        currentCol += count;
    };

    worksheet.mergeCells(1, 1, 2, 1);
    const tnH = worksheet.getCell(1, 1); tnH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; tnH.font = { bold: true }; tnH.alignment = { vertical: 'middle', horizontal: 'center' };

    if (includeEFLM) mergeAndStyle(15, 'EFLM Database', 'FF4C51BF');
    if (includeWestgard) mergeAndStyle(6, 'Westgard Recommend', 'FF38A169');
    if (includeDI) mergeAndStyle(6, 'Data Innovation (TEa Table)', 'FF3182CE');

    worksheet.columns.forEach(column => { column.width = 18; column.eachCell({ includeEmpty: true }, (cell) => { cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E0' } }, left: { style: 'thin', color: { argb: 'FFCBD5E0' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E0' } }, right: { style: 'thin', color: { argb: 'FFCBD5E0' } } }; }); });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `TEa_Report_${new Date().toISOString().split('T')[0]}.xlsx`; link.click();
    closeTEaReportModal();
}

function handleExcelUpload(input) {
    const file = input.files[0]; if (!file) return;
    const statusEl = document.getElementById('upload-status');
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 파일 처리 중...';
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'});
        try { processWorkbook(workbook); statusEl.innerHTML = '<i class="fas fa-check-circle"></i> 업데이트 완료!'; updateDashboardStatus(); refreshAllTabs(); } catch (err) { console.error(err); statusEl.innerHTML = '처리 오류'; }
    };
    reader.readAsArrayBuffer(file);
}

function handleAssaySummary(category, input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array', sheetStubs: true, cellStyles: true});
        const wsName = workbook.SheetNames[0], ws = workbook.Sheets[wsName];
        const excelNames = new Set(), excelACNs = new Set(); if (!ws['!ref']) return;
        const range = XLSX.utils.decode_range(ws['!ref']);
        let visibleRowCount = 0, hiddenRowCount = 0;
        for (let R = range.s.r; R <= range.e.r; ++R) {
            const rowProps = ws['!rows'] ? ws['!rows'][R] : null;
            const isHidden = rowProps && (rowProps.hidden === true || rowProps.hpx === 0 || rowProps.hpt === 0);
            if (isHidden) { hiddenRowCount++; continue; }
            visibleRowCount++;
            const cellC = ws[XLSX.utils.encode_cell({r: R, c: 2})], cellE = ws[XLSX.utils.encode_cell({r: R, c: 4})];
            if (cellC && cellC.v) { const val = String(cellC.v).trim(); if (val && !['Test Name', '검사항목명'].includes(val)) excelNames.add(val); }
            if (cellE && cellE.v) { const val = String(cellE.v).trim(); if (val && !['ACN', '등록번호'].includes(val)) excelACNs.add(val); }
        }
        let matchedCount = 0;
        sampleData.forEach((item, index) => {
            if (item.category === category) {
                if (excelNames.has(String(item.test).trim()) || (item.acn && excelACNs.has(String(item.acn).trim()))) { selectedIndices.add(index); matchedCount++; }
                else selectedIndices.delete(index);
            }
        });
        input.value = ''; refreshAllTabs(); 
        alert(`${category} 분석 완료\n- 보이는 행: ${visibleRowCount-1}개\n- 숨겨진 행: ${hiddenRowCount}개\n- 매칭된 항목: ${matchedCount}개`);
    };
    reader.readAsArrayBuffer(file);
}

function processWorkbook(workbook) {
    const sheets = ['Chemistry', 'Immunology'];
    sheets.forEach(sheetName => {
        const ws = workbook.Sheets[sheetName]; if (!ws) return;
        const jsonData = XLSX.utils.sheet_to_json(ws, {header: 1});
        for (let i = 2; i < jsonData.length; i++) {
            const row = jsonData[i]; if (!row || row.length < 2) continue;
            const testName = row[1], item = sampleData.find(d => d.test === testName);
            if (item) {
                item.acn = row[0]; item.lastUpdate = new Date().toISOString().split('T')[0];
                if (row.length > 17) item.biovar = { choice: row[17], cvi: row[18], cvg: row[19], i: row[20], b: row[21], te: row[22] };
                if (row.length > 23) item.tea_sources = { clia: row[23], wlsh: row[24], cap: row[25], aab: row[26], rcpa: row[27], api: row[28] };
            }
        }
    });
}

// Req 6: 로컬 필터링 로직 추가
function handleLocalFilter() {
    refreshAllTabs();
}

/**
 * Req 6: 필터 조건 반영하여 데이터 필터링
 */
function getFilteredData() {
    const filterTestName = (document.getElementById('filter-test-name')?.value || '').toLowerCase();
    const filterSearchTerm = (document.getElementById('filter-search-term')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('filter-status')?.value || 'All';

    return sampleData.filter((item, index) => {
        // 1. 전체 카테고리/선택 항목 필터
        const isSelected = selectedIndices.has(index);
        const categoryMatch = (globalCategoryFilter === 'All' || item.category === globalCategoryFilter);
        
        if (!isSelected || !categoryMatch) return false;

        // 2. 현재 활성화된 탭 확인
        const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(n => n.classList.contains('active'));
        const activeTab = activeNav?.getAttribute('data-tab');

        // 3. 추가 필터 (EFLM 탭인 경우에만 검색어 및 상태 필터 강화 적용 가능하나, 일단 모든 탭 공통 검색은 허용)
        const nameMatch = !filterTestName || item.test.toLowerCase().includes(filterTestName);
        const termMatch = !filterSearchTerm || (item.search && item.search.toLowerCase().includes(filterSearchTerm));
        
        let statusMatch = (filterStatus === 'All' || activeTab !== 'eflm'); // EFLM 탭이 아니면 상태 필터 무시
        if (!statusMatch) {
            if (filterStatus === 'no-term') statusMatch = (item.search === "검색어 확인 불가");
            else if (filterStatus === 'error') statusMatch = (item.status === "error");
            else statusMatch = (item.status === filterStatus);
        }

        return nameMatch && termMatch && statusMatch;
    });
}
function updateGlobalCategory(newValue) { globalCategoryFilter = newValue; document.querySelectorAll('.category-filter').forEach(f => f.value = newValue); injectAdminTestSelect(); refreshAllTabs(); }

function injectDashboardSelection() {
    const grid = document.getElementById('item-selection-grid'); if (!grid) return; grid.innerHTML = '';
    const filteredForSelection = globalCategoryFilter === 'All' ? sampleData.map((v, i) => ({v, i})) : sampleData.map((v, i) => ({v, i})).filter(d => d.v.category === globalCategoryFilter);
    filteredForSelection.forEach(d => {
        const label = document.createElement('label'); label.className = 'item-checkbox-label';
        label.innerHTML = `<input type="checkbox" ${selectedIndices.has(d.i)?'checked':''} onchange="toggleItem(${d.i}, this.checked)"><span>${d.v.test} <small style="color:var(--text-secondary)">(${d.v.acn||'???'})</small></span>`;
        grid.appendChild(label);
    });
    updateDashboardStatus();
}

function toggleItem(index, isChecked) { if (isChecked) selectedIndices.add(index); else selectedIndices.delete(index); refreshAllTabs(); }
function toggleAllItems(selectAll) { sampleData.forEach((item, index) => { if (globalCategoryFilter === 'All' || item.category === globalCategoryFilter) { if (selectAll) selectedIndices.add(index); else selectedIndices.delete(index); } }); injectDashboardSelection(); refreshAllTabs(); }

function refreshAllTabs() {
    const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(n => n.classList.contains('active')), activeTab = activeNav?.getAttribute('data-tab');
    if (activeTab === 'dashboard') injectDashboardSelection();
    if (activeTab === 'eflm') injectData(); if (activeTab === 'westgard') injectWestgardData(); if (activeTab === 'datainnovation') injectDIData();
    if (activeTab === 'settings' && currentUser.role === 'admin') { injectAdminTestSelect(); injectManageSearchData(); }
}

function injectData() {
    const tableBody = document.getElementById('data-rows'); if (!tableBody) return; tableBody.innerHTML = '';
    
    getFilteredData().forEach(item => {
        const row = document.createElement('tr');
        const est = item.est || {}; const opt = item.opt || {}; const des = item.des || {}; const min = item.min || {};
        
        // Req 5: Status 색상 구분 (정상: done, 검색어 없음: no-term, 에러: error)
        let statusClass = 'pending';
        let statusText = (item.status || 'PENDING').toUpperCase();
        
        if (item.search === "검색어 확인 불가") {
            statusClass = 'no-term';
            statusText = 'NO SEARCH TERM';
        } else if (item.status === 'done') {
            statusClass = 'done';
        } else if (item.status === 'error') {
            statusClass = 'error';
        }

        row.innerHTML = `<td><strong>${item.test}</strong></td><td style="color: var(--text-secondary)">${item.search}</td><td class="metric-value"><span class="estimate-box">${est.cvi ?? ''}</span></td><td class="metric-value"><span class="estimate-box">${est.cvg ?? ''}</span></td><td class="metric-value col-optimal">${opt.cva ?? ''}</td><td class="metric-value col-optimal">${opt.bias ?? ''}</td><td class="metric-value col-optimal">${opt.te ?? ''}</td><td class="metric-value col-optimal">${opt.mau ?? ''}</td><td class="metric-value col-desirable">${des.cva ?? ''}</td><td class="metric-value col-desirable">${des.bias ?? ''}</td><td class="metric-value col-desirable">${des.te ?? ''}</td><td class="metric-value col-desirable">${des.mau ?? ''}</td><td class="metric-value col-minimum">${min.cva ?? ''}</td><td class="metric-value col-minimum">${min.bias ?? ''}</td><td class="metric-value col-minimum">${min.te ?? ''}</td><td class="metric-value col-minimum">${min.mau ?? ''}</td><td><span class="status-label ${statusClass}">${statusText}</span></td><td style="font-size: 0.8rem; color: var(--text-secondary)">${item.lastUpdate || '-'}</td>`;
        tableBody.appendChild(row);
    });
}
function injectWestgardData() {
    const tableBody = document.getElementById('westgard-rows'); if (!tableBody) return; tableBody.innerHTML = '';
    getFilteredData().forEach(item => {
        const row = document.createElement('tr'), bv = item.biovar || {};
        row.innerHTML = `<td><strong>${item.test}</strong></td><td>${bv.choice || '-'}</td><td>${bv.cvi || '-'}</td><td>${bv.cvg || '-'}</td><td>${bv.i || '-'}</td><td>${bv.b || '-'}</td><td>${bv.te || '-'}</td>`;
        tableBody.appendChild(row);
    });
}
function injectDIData() {
    const tableBody = document.getElementById('di-rows'); if (!tableBody) return; tableBody.innerHTML = '';
    getFilteredData().forEach(item => {
        const row = document.createElement('tr'), tea = item.tea_sources || {};
        row.innerHTML = `<td><strong>${item.test}</strong></td><td>${tea.clia || '-'}</td><td>${tea.wlsh || '-'}</td><td>${tea.cap || '-'}</td><td>${tea.aab || '-'}</td><td>${tea.rcpa || '-'}</td><td>${tea.api || '-'}</td>`;
        tableBody.appendChild(row);
    });
}
function injectAdminTestSelect() {
    const select = document.getElementById('admin-test-select'); if (!select) return;
    const currentVal = select.value; select.innerHTML = '<option value="All">-- 전체 항목 선택 --</option>';
    const visibleItems = sampleData.filter(item => globalCategoryFilter === 'All' || item.category === globalCategoryFilter).sort((a,b) => a.test.localeCompare(b.test));
    visibleItems.forEach(item => { const opt = document.createElement('option'); opt.value = item.test; opt.textContent = `${item.acn || '???'} - ${item.test}`; select.appendChild(opt); });
    select.value = visibleItems.find(i=>i.test===currentVal) ? currentVal : 'All';
}
function filterAdminTable(testName) { adminFilterTestName = testName; injectManageSearchData(); }
function resetAdminFilter() { adminFilterTestName = 'All'; if (document.getElementById('admin-test-select')) document.getElementById('admin-test-select').value = 'All'; injectManageSearchData(); }
function injectManageSearchData() {
    const tableBody = document.getElementById('manage-search-rows'); if (!tableBody) return; tableBody.innerHTML = '';
    sampleData.forEach(item => {
        if ((globalCategoryFilter !== 'All' && item.category !== globalCategoryFilter) || (adminFilterTestName !== 'All' && item.test !== adminFilterTestName)) return;
        const row = document.createElement('tr'); row.className = 'admin-edit-row';
        row.innerHTML = `<td><input type="text" class="editable-input admin-acn-input" value="${item.acn||''}" style="width:80px;" data-test="${item.test}"></td><td><strong>${item.test}</strong></td><td><input type="text" class="editable-input admin-search-input" value="${item.search}" data-test="${item.test}"></td>`;
        tableBody.appendChild(row);
    });
}
function saveAdminSettings() {
    const acnInputs = document.querySelectorAll('.admin-acn-input'), searchInputs = document.querySelectorAll('.admin-search-input');
    let count = 0;
    acnInputs.forEach(input => { const testName = input.getAttribute('data-test'), item = sampleData.find(i => i.test === testName); if (item) { item.acn = input.value; count++; } });
    searchInputs.forEach(input => { const testName = input.getAttribute('data-test'), item = sampleData.find(i => i.test === testName); if (item) item.search = input.value; });
    alert(`${count}개 항목의 설정이 저장되었습니다.`); refreshAllTabs();
}

// --- 실시간 수집 로직 ---

async function handleLiveSearch() {
    const input = document.getElementById('eflm-live-search-input');
    const query = input.value.trim();
    if (!query) { alert('검색어를 입력하세요.'); return; }
    
    // "검색어 확인 불가" 처리
    if (query === "검색어 확인 불가") {
        alert('해당 항목은 검색어가 지정되지 않아 수집할 수 없습니다.');
        return;
    }

    const loadingOverlay = document.getElementById('eflm-loading-overlay');
    const loadingText = document.getElementById('eflm-loading-text');
    loadingOverlay.style.display = 'flex';
    loadingText.textContent = `[${query}] 수집 중... (약 10초 소요)`;

    try {
        const response = await fetch(`http://localhost:5000/api/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('서버 로드 실패');
        const result = await response.json();

        if (result.error) {
            alert(`수집 실패: ${result.error}`);
        } else {
            updateDashboardData(result);
            input.value = ''; 
        }
    } catch (err) {
        console.error(err);
        alert('서버에 연결할 수 없습니다. eflm_server.py가 실행 중이며 5000번 포트가 열려 있는지 확인하세요.');
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

async function handleUpdateAll() {
    // 1. 수집 대상 선정 (선택된 항목 중 검색어가 있는 항목)
    const targets = sampleData.filter((item, idx) => 
        selectedIndices.has(idx) && 
        item.search && 
        item.search !== "검색어 확인 불가"
    );

    if (targets.length === 0) {
        alert('수집 가능한 항목이 선택되지 않았습니다. (검색어가 없거나 필터링됨)');
        return;
    }

    // Req 1, 2: 사이트 업데이트 날짜 확인 로직 (시뮬레이션)
    const lastStoredSiteDate = localStorage.getItem('eflm_site_last_update');
    const currentSiteDate = new Date().toISOString().split('T')[0]; // 시뮬레이션: 실제로는 서버에서 가져와야 함

    if (lastStoredSiteDate === currentSiteDate) {
        if (!confirm(`사이트 업데이트 날짜(${currentSiteDate})가 이전과 동일합니다. 그래도 다시 수집하시겠습니까?`)) {
            return;
        }
    }

    if (!confirm(`${targets.length}개 항목에 대해 자동 수집을 시작하시겠습니까?\n(예상 소요 시간: 약 ${targets.length * 10}초)`)) return;

    // 업데이트 시작 전 현재 데이터 백업 (비교용)
    previousData = JSON.parse(JSON.stringify(sampleData));

    const loadingOverlay = document.getElementById('eflm-loading-overlay');
    const loadingText = document.getElementById('eflm-loading-text');
    const progressCount = document.getElementById('eflm-progress-count');
    const progressBarContainer = document.getElementById('eflm-progress-bar-container');
    const progressBar = document.getElementById('eflm-progress-bar');
    const updateAllBtn = document.getElementById('eflm-update-all-btn');

    loadingOverlay.style.display = 'flex';
    progressBarContainer.style.display = 'block';
    updateAllBtn.disabled = true;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        loadingText.textContent = `[${i + 1}/${targets.length}] ${item.test} 수집 중...`;
        progressCount.textContent = `${Math.round((i / targets.length) * 100)}%`;
        progressBar.style.width = `${(i / targets.length) * 100}%`;

        try {
            const response = await fetch(`http://localhost:5000/api/search?query=${encodeURIComponent(item.search)}`);
            const result = await response.json();

            if (!result.error) {
                updateDashboardData(result, false);
                successCount++;
            } else {
                failCount++;
                const idx = sampleData.findIndex(s => s.test === item.test);
                if (idx !== -1) sampleData[idx].status = 'error';
            }
        } catch (err) {
            failCount++;
            const idx = sampleData.findIndex(s => s.test === item.test);
            if (idx !== -1) sampleData[idx].status = 'error';
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }

    // 작업 완료 후 데이터 저장 및 비교
    localStorage.setItem('eflm_site_last_update', currentSiteDate);
    compareAndShowDiffs(); // Req 3: 차이점 계산 및 표시

    loadingText.textContent = "모든 항목 수집 완료!";
    progressCount.textContent = "100%";
    progressBar.style.width = "100%";
    
    alert(`작업이 완료되었습니다.\n성공: ${successCount}\n실패: ${failCount}`);
    
    refreshAllTabs();
    loadingOverlay.style.display = 'none';
    progressBarContainer.style.display = 'none';
    updateAllBtn.disabled = false;
}

function updateDashboardData(newData, shouldRefresh = true) {
    // Req 9: Direct Bilirubin 등 동일 검색어를 가진 모든 항목 동시에 업데이트
    const matchingIndices = sampleData.map((item, idx) => 
        (item.search === newData.search_term || item.test === newData.search_term) ? idx : -1
    ).filter(idx => idx !== -1);
    
    if (matchingIndices.length === 0) {
        // 검색어와 일치하는 항목이 아예 없는 신규 수집 데이터의 경우 최상단 추가
        const newItem = {
            test: newData.search_term,
            search: newData.search_term,
            category: "Chemistry",
            status: "done",
            progress: 100,
            est: newData.est,
            opt: newData.opt,
            des: newData.des,
            min: newData.min,
            lastUpdate: new Date().toISOString().split('T')[0]
        };
        sampleData.unshift(newItem);
    } else {
        matchingIndices.forEach(idx => {
            sampleData[idx] = {
                ...sampleData[idx],
                status: "done",
                progress: 100,
                est: newData.est,
                opt: newData.opt,
                des: newData.des,
                min: newData.min,
                lastUpdate: new Date().toISOString().split('T')[0]
            };
        });
    }

    if (shouldRefresh) {
        refreshAllTabs();
        
        setTimeout(() => {
            const rows = document.querySelectorAll('#data-rows tr');
            rows.forEach(row => {
                if (row.cells[1].textContent === newData.search_term) {
                    row.classList.add('updated-row');
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }, 100);
    }
}

function initTabs() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]'), sections = document.querySelectorAll('.main-section');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); const targetTab = item.getAttribute('data-tab');
            navItems.forEach(nav => nav.classList.remove('active')); item.classList.add('active');
            sections.forEach(section => { section.classList.remove('active'); if (section.id === `${targetTab}-section`) section.classList.add('active'); });
            refreshAllTabs();
        });
    });
}
function initAuth() { const loginOverlay = document.getElementById('login-overlay'); if (TEST_MODE) { if (loginOverlay) loginOverlay.classList.remove('active'); updateUserInfo(); } else { if (loginOverlay) loginOverlay.classList.add('active'); } }
function updateUserInfo() {
    const nameEl = document.getElementById('user-name'), roleEl = document.getElementById('user-role'), avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = currentUser.name; if (roleEl) roleEl.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1); if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0);
    const adminArea = document.getElementById('admin-settings-area'); if (adminArea) { adminArea.style.display = currentUser.role === 'admin' ? 'block' : 'none'; if (currentUser.role === 'admin') injectAdminTestSelect(); }
}
function initTheme() { const themeSwitch = document.getElementById('theme-toggle-switch'); if (themeSwitch) { themeSwitch.checked = false; themeSwitch.addEventListener('change', () => { document.body.classList.toggle('light-theme'); }); } }
document.addEventListener('DOMContentLoaded', () => { 
    // 모든 수치 데이터 초기화 (사용자 요청: 공백 표시를 위해)
    sampleData.forEach(item => {
        item.est = { cvi: null, cvg: null };
        item.opt = { cva: null, bias: null, te: null, mau: null };
        item.des = { cva: null, bias: null, te: null, mau: null };
        item.min = { cva: null, bias: null, te: null, mau: null };
        item.status = "pending";
        item.progress = 0;
    });
    sampleData.forEach((_, i) => selectedIndices.add(i)); 
    initAuth(); 
    initTabs(); 
    initTheme(); 
    injectDashboardSelection(); 
    refreshAllTabs(); 
});

/**
 * Req 3: 현재 데이터와 이전 데이터를 비교하여 변경된 항목 표시
 */
function compareAndShowDiffs() {
    if (!previousData) {
        previousData = JSON.parse(JSON.stringify(sampleData));
        return;
    }

    const diffs = [];
    sampleData.forEach(item => {
        const oldItem = previousData.find(p => p.test === item.test);
        if (!oldItem) return;

        // TE (Desirable) 변경 사항 위주로 비교 (예시)
        if (item.des?.te !== oldItem.des?.te) {
            diffs.push({
                test: item.test,
                oldVal: oldItem.des?.te || 'N/A',
                newVal: item.des?.te || 'N/A',
                type: 'TE (Desirable)'
            });
        }
    });

    const area = document.getElementById('eflm-comparison-area');
    const list = document.getElementById('diff-list');
    
    if (diffs.length > 0 && area && list) {
        list.innerHTML = '';
        diffs.forEach(d => {
            const div = document.createElement('div');
            div.className = 'diff-item';
            div.innerHTML = `<span class="test-name">${d.test}</span> <small>${d.type}:</small> <span class="old-val">${d.oldVal}</span> → <span class="new-val">${d.newVal}</span>`;
            list.appendChild(div);
        });
        area.style.display = 'block';
    }

    // 비교 후 현재 데이터를 이전 데이터로 업데이트
    previousData = JSON.parse(JSON.stringify(sampleData));
}

/**
 * Req 8: HTML 가로 보고서 생성
 */
function generateHorizontalHTMLReport(data, config) {
    let html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <title>TEa 가로 보고서</title>
        <style>
            body { font-family: sans-serif; padding: 20px; color: #1a202c; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e0; padding: 6px 4px; text-align: center; }
            th { background-color: #f7fafc; color: #4a5568; font-weight: 700; }
            .header-group { background-color: #edf2f7; font-weight: bold; font-size: 13px; }
            .test-name { font-weight: bold; background-color: #fcfcfc; text-align: left; padding-left: 10px; }
            h1 { color: #4c51bf; border-bottom: 2px solid #4c51bf; padding-bottom: 10px; }
            .metric-opt { background-color: rgba(76, 81, 191, 0.05); }
            .metric-des { background-color: rgba(76, 81, 191, 0.1); }
            .metric-min { background-color: rgba(76, 81, 191, 0.05); }
        </style>
    </head>
    <body>
        <h1>RDKR TEa finder 가로 보고서</h1>
        <p>생성 일시: ${new Date().toLocaleString()}</p>
        <table>
            <thead>
                <tr class="header-group">
                    <th rowspan="2">Test Name</th>
    `;

    if (config.includeEFLM) html += '<th colspan="15">EFLM Database</th>';
    if (config.includeWestgard) html += '<th colspan="6">Westgard Recommend</th>';
    if (config.includeDI) html += '<th colspan="6">Data Innovation</th>';
    
    html += `</tr><tr class="header-group">`;
    
    if (config.includeEFLM) html += '<th>Search Term</th><th>CVI</th><th>CVG</th><th>Opt CVa</th><th>Opt Bias</th><th>Opt TE</th><th>Opt MAU</th><th>Des CVa</th><th>Des Bias</th><th>Des TE</th><th>Des MAU</th><th>Min CVa</th><th>Min Bias</th><th>Min TE</th><th>Min MAU</th>';
    if (config.includeWestgard) html += '<th>Rec.</th><th>CVI</th><th>CVG</th><th>I</th><th>B</th><th>TE</th>';
    if (config.includeDI) html += '<th>CLIA</th><th>WLSH</th><th>CAP</th><th>AAB</th><th>RCPA</th><th>API</th>';
    
    html += `</tr></thead><tbody>`;

    data.forEach(item => {
        html += `<tr><td class="test-name">${item.test}</td>`;
        if (config.includeEFLM) {
            html += `<td>${item.search||'-'}</td><td>${item.est?.cvi||'-'}</td><td>${item.est?.cvg||'-'}</td>
                     <td class="metric-opt">${item.opt?.cva||'-'}</td><td class="metric-opt">${item.opt?.bias||'-'}</td><td class="metric-opt">${item.opt?.te||'-'}</td><td class="metric-opt">${item.opt?.mau||'-'}</td>
                     <td class="metric-des">${item.des?.cva||'-'}</td><td class="metric-des">${item.des?.bias||'-'}</td><td class="metric-des">${item.des?.te||'-'}</td><td class="metric-des">${item.des?.mau||'-'}</td>
                     <td class="metric-min">${item.min?.cva||'-'}</td><td class="metric-min">${item.min?.bias||'-'}</td><td class="metric-min">${item.min?.te||'-'}</td><td class="metric-min">${item.min?.mau||'-'}</td>`;
        }
        if (config.includeWestgard) {
            const bv = item.biovar || {};
            html += `<td>${bv.choice||'-'}</td><td>${bv.cvi||'-'}</td><td>${bv.cvg||'-'}</td><td>${bv.i||'-'}</td><td>${bv.b||'-'}</td><td>${bv.te||'-'}</td>`;
        }
        if (config.includeDI) {
            const tea = item.tea_sources || {};
            html += `<td>${tea.clia||'-'}</td><td>${tea.wlsh||'-'}</td><td>${tea.cap||'-'}</td><td>${tea.aab||'-'}</td><td>${tea.rcpa||'-'}</td><td>${tea.api||'-'}</td>`;
        }
        html += `</tr>`;
    });

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}
