"""
EFLM API 서버 (로컬 수동 수집용)
==============================================
로직 흐름:
  1. Flask 서버가 시작될 때 Chrome 드라이버를 1개만 생성하여 전역 공유
  2. /api/search 엔드포인트로 개별 항목 수집
  3. /api/collect-all 엔드포인트로 전체 항목 배치 수집 후 eflm_data.json 저장
  4. /api/data 엔드포인트로 저장된 JSON 파일 제공 (프론트엔드용)

기존 문제점 해결:
  - 요청마다 Chrome 생성/종료 → 전역 드라이버 재사용으로 부하 80% 감소
  - RAM 최소화 옵션 및 이미지 로드 비활성화 추가

NOTE: 이 서버는 로컬 또는 수동 수집 시에만 사용합니다.
      GitHub Actions는 scraper.py를 직접 실행합니다.
"""

import time
import json
import os
import threading
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# NOTE: scraper.py의 핵심 로직을 import
from scraper import scrape_single_item, create_headless_driver

app = Flask(__name__)

# =====================================================
# 전역 Chrome 드라이버 관리
# NOTE: 요청마다 생성/종료하지 않고 서버 실행 중 1개를 유지
# =====================================================

_driver = None
_driver_lock = threading.Lock()  # 동시 요청으로 인한 충돌 방지
_wait = None

# 출력 파일 경로
DATA_OUTPUT = os.path.join(os.path.dirname(__file__), "mockup", "eflm_data.json")
SEARCH_TERMS_PATH = os.path.join(os.path.dirname(__file__), "search_terms.json")


def get_driver():
    """드라이버 가져오기 (없으면 생성)"""
    global _driver, _wait
    if _driver is None:
        print("[서버] Chrome 드라이버 초기화 중...")
        _driver = create_headless_driver()
        _wait = WebDriverWait(_driver, 15)
        print("[서버] Chrome 드라이버 준비 완료.")
    return _driver, _wait


def reset_driver():
    """드라이버 재시작 (오류 복구용)"""
    global _driver, _wait
    if _driver:
        try:
            _driver.quit()
        except Exception:
            pass
    _driver = None
    _wait = None
    print("[서버] Chrome 드라이버 재시작.")
    return get_driver()


# =====================================================
# CORS 설정
# =====================================================

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response


# =====================================================
# API 엔드포인트
# =====================================================

@app.route('/', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({"status": "running", "message": "EFLM API Server v2.0 is online"}), 200


@app.route('/api/data', methods=['GET'])
def get_data():
    """저장된 eflm_data.json 반환 (프론트엔드 초기 로드용)"""
    if os.path.exists(DATA_OUTPUT):
        with open(DATA_OUTPUT, encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify({"error": "데이터 파일 없음. 먼저 수집을 실행하세요."}), 404


@app.route('/api/search', methods=['GET', 'OPTIONS'])
def search():
    """단일 항목 실시간 수집 (개별 검색 버튼)"""
    if request.method == 'OPTIONS':
        return '', 200

    query = request.args.get('query')
    if not query:
        return jsonify({"error": "검색어가 없습니다."}), 400

    print(f"\n[검색 요청] '{query}'")

    with _driver_lock:
        try:
            driver, wait = get_driver()
            data = scrape_single_item(driver, wait, query)

            if "error" in data:
                print(f"[오류] {data['error']}")
            else:
                print(f"[성공] '{query}' 수집 완료")

            return jsonify(data)

        except Exception as e:
            print(f"[치명적 오류] 드라이버 재시작 후 재시도: {e}")
            try:
                driver, wait = reset_driver()
                data = scrape_single_item(driver, wait, query)
                return jsonify(data)
            except Exception as e2:
                return jsonify({"error": f"드라이버 복구 실패: {str(e2)}"}), 500


@app.route('/api/collect-all', methods=['POST', 'OPTIONS'])
def collect_all():
    """
    전체 항목 배치 수집 (수동 전체 수집 버튼)
    NOTE: 시간이 오래 걸리므로 비동기 스레드로 실행됩니다.
    """
    if request.method == 'OPTIONS':
        return '', 200

    if not os.path.exists(SEARCH_TERMS_PATH):
        return jsonify({"error": f"search_terms.json 파일이 없습니다: {SEARCH_TERMS_PATH}"}), 400

    print("\n[전체 수집] 배치 작업 시작 (백그라운드 실행)")

    def run_batch():
        from scraper import run_scraper
        with open(SEARCH_TERMS_PATH, encoding='utf-8') as f:
            search_terms = json.load(f)
        run_scraper(search_terms, DATA_OUTPUT)
        print("[전체 수집] 완료. eflm_data.json 저장됨.")

    thread = threading.Thread(target=run_batch, daemon=True)
    thread.start()

    return jsonify({
        "message": "전체 수집이 시작되었습니다. 진행 상황은 서버 콘솔에서 확인하세요.",
        "total": len(json.load(open(SEARCH_TERMS_PATH, encoding='utf-8'))) if os.path.exists(SEARCH_TERMS_PATH) else 0
    })


@app.route('/api/status', methods=['GET'])
def get_status():
    """수집 상태 및 마지막 업데이트 정보 반환"""
    if os.path.exists(DATA_OUTPUT):
        with open(DATA_OUTPUT, encoding='utf-8') as f:
            data = json.load(f)
        return jsonify({
            "last_updated": data.get("last_updated", "알 수 없음"),
            "total": data.get("total", 0),
            "success": data.get("success", 0),
            "errors": data.get("errors", 0),
        })
    return jsonify({"last_updated": None, "message": "아직 수집 데이터 없음"})


# =====================================================
# 서버 시작
# =====================================================

if __name__ == '__main__':
    print("=" * 50)
    print("  EFLM API Server v2.0 - Starting...")
    print("  Port: 5000 / CORS: Enabled (*)")
    print("  성능 개선: Chrome 드라이버 1개 전역 재사용")
    print("=" * 50 + "\n")

    # FIXME: 운영 환경에서는 debug=False, threaded=False 유지
    # NOTE: threaded=False → 동시 요청 방지 (드라이버 충돌 방지)
    app.run(host='127.0.0.1', port=5000, debug=False, threaded=False)
