"""
EFLM 데이터 스크래퍼 (서버리스 배포용)
==============================================
로직 흐름:
  1. Chrome 드라이버 1개를 생성하여 전체 루프에서 재사용 (핵심 성능 개선)
  2. 검색어 목록을 순회하며 biologicalvariation.eu 에서 데이터 수집
  3. 결과를 mockup/eflm_data.json 에 저장 (프론트엔드가 직접 읽음)
  4. GitHub Actions에서 자동 실행되거나, 로컬에서 수동 실행 가능

사용법:
  - 전체 수집: python scraper.py
  - 특정 검색어 테스트: python scraper.py --test "Glucose"
  - 결과 저장 경로 지정: python scraper.py --output path/to/data.json
"""

import time
import json
import argparse
import os
import sys
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# =====================================================
# 설정 상수
# =====================================================

# NOTE: 스크래핑 대상 URL
BASE_URL = "https://biologicalvariation.eu/api/search/by_analyte"

# NOTE: 요청 간 딜레이 (초) - 서버 부하 방지 및 IP 차단 예방
REQUEST_DELAY = 1.5

# NOTE: Selenium 최대 대기 시간 (초)
WAIT_TIMEOUT = 15

# NOTE: 기본 출력 파일 경로 (GitHub Pages 루트에 저장)
DEFAULT_OUTPUT = os.path.join(os.path.dirname(__file__), "eflm_data.json")


# =====================================================
# 헬퍼 함수
# =====================================================

def to_float(value_text):
    """텍스트를 float로 변환, 실패 시 원본 반환"""
    try:
        return float(value_text)
    except (ValueError, TypeError):
        return value_text


def safe_click(driver, element):
    """표준 클릭 실패 시 JavaScript 클릭으로 폴백"""
    try:
        element.click()
    except Exception:
        driver.execute_script("arguments[0].click();", element)


def create_headless_driver():
    """
    RAM 및 CPU 최적화된 Headless Chrome 드라이버 생성
    NOTE: GitHub Actions 및 로컬 환경 모두에서 사용 가능
    """
    options = webdriver.ChromeOptions()
    options.add_argument('--headless=new')          # 최신 headless 모드
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage') # GitHub Actions 환경 필수
    options.add_argument('--disable-gpu')
    options.add_argument('--disable-extensions')
    options.add_argument('--disable-images')        # 이미지 로드 비활성화 (속도 향상)
    options.add_argument('--window-size=1280,800')
    options.add_argument('--memory-pressure-off')
    options.add_argument('--js-flags=--max-old-space-size=256') # 메모리 제한
    options.add_argument(
        'user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    # NOTE: GitHub Actions 환경에서는 시스템 Chrome 사용, 로컬은 자동 다운로드
    if os.environ.get('CI'):
        # GitHub Actions: 시스템 chromedriver 사용 (workflow에서 설치)
        driver = webdriver.Chrome(options=options)
    else:
        # 로컬: webdriver_manager 자동 다운로드
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)

    return driver


# =====================================================
# 핵심 스크래핑 함수 (드라이버 재사용)
# =====================================================

def scrape_single_item(driver, wait, search_term):
    """
    드라이버 1개를 받아서 단일 항목을 스크래핑합니다.
    NOTE: 드라이버를 매번 생성/종료하지 않고 재사용함 - 핵심 성능 개선 포인트
    """
    try:
        # 1단계: 검색 URL 이동
        full_url = f"{BASE_URL}?format=html&query={search_term}"
        driver.get(full_url)
        wait.until(EC.visibility_of_element_located((By.TAG_NAME, "body")))

        # 2단계: 결과 없음 확인
        no_results = driver.find_elements(By.XPATH, "//*[contains(text(), 'No Meta-Analysis Results')]")
        if no_results:
            return {"error": "No Meta-Analysis Results found"}

        # 3단계: 목록 페이지에서 항목 선택
        try:
            WebDriverWait(driver, 2).until(EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(text(), 'Analytical Performance Specification')]")
            ))
        except Exception:
            # 목록 페이지로 판단 - 해당 항목 버튼 클릭
            try:
                match_btn = wait.until(EC.element_to_be_clickable(
                    (By.XPATH, f"//button[normalize-space()='{search_term}']")
                ))
                safe_click(driver, match_btn)
            except Exception:
                try:
                    main_term = search_term.split('(')[0].strip()
                    match_btn = wait.until(EC.element_to_be_clickable(
                        (By.XPATH, f"//button[normalize-space()='{main_term}']")
                    ))
                    safe_click(driver, match_btn)
                except Exception:
                    try:
                        buttons = driver.find_elements(By.XPATH, "//div[@id='analyte_list']//button")
                        if buttons:
                            safe_click(driver, buttons[0])
                        else:
                            return {"error": "Search list match failed"}
                    except Exception:
                        return {"error": "Search list match failed"}

        # 4단계: 상세 페이지 팝업 열기
        spec_btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(), 'Analytical Performance Specification')]")
        ))
        safe_click(driver, spec_btn)
        wait.until(EC.visibility_of_element_located((By.XPATH, "//div[@class='modal-content']")))

        # 5단계: CVI, CVG 추출
        cvi_el = wait.until(EC.presence_of_element_located((
            By.XPATH, "//div[@class='modal-content']//label[contains(text(), 'Within-subject')]/following-sibling::input[1]"
        )))
        cvg_el = wait.until(EC.presence_of_element_located((
            By.XPATH, "//div[@class='modal-content']//label[contains(text(), 'Between-subject')]/following-sibling::input[1]"
        )))
        cvi_val = cvi_el.get_attribute("value")
        cvg_val = cvg_el.get_attribute("value")

        # 6단계: Calculate 클릭 후 결과 대기
        calc_btn = driver.find_element(By.XPATH, "//div[@class='modal-content']//button[contains(text(), 'Calculate')]")
        safe_click(driver, calc_btn)
        wait.until(EC.visibility_of_element_located((By.XPATH, "//div[@class='modal-content']//table")))
        time.sleep(0.5)  # NOTE: 계산 완료 후 짧은 대기

        # 7단계: 테이블 데이터 파싱
        results = {}
        rows = driver.find_elements(By.XPATH, "//div[@class='modal-content']//table//tr")
        for row in rows:
            cells = row.find_elements(By.TAG_NAME, "td")
            if len(cells) >= 5:
                row_type = cells[0].text.strip().lower()
                if "minimum" in row_type:
                    results["min"] = [to_float(c.text) for c in cells[1:5]]
                elif "desirable" in row_type:
                    results["des"] = [to_float(c.text) for c in cells[1:5]]
                elif "optimal" in row_type:
                    results["opt"] = [to_float(c.text) for c in cells[1:5]]

        if not all(k in results for k in ["opt", "des", "min"]):
            return {"error": "Failed to parse final data table"}

        return {
            "search_term": search_term,
            "update_date": datetime.now().strftime("%Y-%m-%d"),
            "est":  {"cvi": to_float(cvi_val), "cvg": to_float(cvg_val)},
            "opt": {"cva": results["opt"][0], "bias": results["opt"][1], "te": results["opt"][2], "mau": results["opt"][3]},
            "des": {"cva": results["des"][0], "bias": results["des"][1], "te": results["des"][2], "mau": results["des"][3]},
            "min": {"cva": results["min"][0], "bias": results["min"][1], "te": results["min"][2], "mau": results["min"][3]},
        }

    except Exception as e:
        return {"error": str(e)}


# =====================================================
# 메인 실행 함수
# =====================================================

def run_scraper(search_terms_with_meta, output_path=DEFAULT_OUTPUT):
    """
    전체 수집 실행 함수
    search_terms_with_meta: [{"test": "Glucose", "search": "Glucose", "category": "Chemistry", ...}, ...]
    """
    print(f"\n{'='*50}")
    print(f"  EFLM Scraper 시작 - 총 {len(search_terms_with_meta)}개 항목")
    print(f"  출력 경로: {output_path}")
    print(f"{'='*50}\n")

    driver = None
    results = []
    success_count = 0
    error_count = 0

    try:
        print("Chrome 드라이버 초기화 중...")
        # FIXME: 네트워크가 느린 환경에서는 WAIT_TIMEOUT을 늘릴 것
        driver = create_headless_driver()
        wait = WebDriverWait(driver, WAIT_TIMEOUT)
        print("드라이버 준비 완료. 스크래핑 시작.\n")

        for i, item in enumerate(search_terms_with_meta):
            test_name = item.get("test", "Unknown")
            search_term = item.get("search", "")

            print(f"[{i+1}/{len(search_terms_with_meta)}] '{test_name}' 처리 중... (검색어: '{search_term}')")

            # 검색어가 없거나 확인 불가인 경우 스킵
            if not search_term or search_term.strip() in ["", "검색어 확인 불가"]:
                print(f"  → 검색어 없음, 스킵")
                # 기존 데이터 유지 (상태는 no-term)
                item_result = {**item, "status": "no-term"}
                results.append(item_result)
                continue

            # 스크래핑 실행 (드라이버 재사용)
            data = scrape_single_item(driver, wait, search_term)

            if "error" in data:
                print(f"  → 오류: {data['error']}")
                item_result = {**item, "status": "error", "lastUpdate": datetime.now().strftime("%Y-%m-%d")}
                error_count += 1
            else:
                print(f"  → 성공 (CVI={data['est']['cvi']}, CVG={data['est']['cvg']})")
                item_result = {
                    **item,
                    "status": "done",
                    "lastUpdate": data["update_date"],
                    "est":  data["est"],
                    "opt": data["opt"],
                    "des": data["des"],
                    "min": data["min"],
                }
                success_count += 1

            results.append(item_result)

            # NOTE: 요청 간 딜레이 - 서버 부하 방지
            time.sleep(REQUEST_DELAY)

    except Exception as e:
        print(f"\n!!! 치명적 오류 발생: {e}")

    finally:
        if driver:
            driver.quit()
            print("\nChrome 드라이버 종료 완료.")

    # 결과 JSON 저장
    output_data = {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total": len(results),
        "success": success_count,
        "errors": error_count,
        "data": results,
    }

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"  완료: 성공 {success_count}개 / 오류 {error_count}개")
    print(f"  저장 위치: {output_path}")
    print(f"{'='*50}\n")

    return output_data


# =====================================================
# 테스트 모드 / CLI 엔트리포인트
# =====================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EFLM 데이터 스크래퍼")
    parser.add_argument("--test", type=str, help="단일 검색어 테스트 모드")
    parser.add_argument("--output", type=str, default=DEFAULT_OUTPUT, help="결과 JSON 저장 경로")
    args = parser.parse_args()

    if args.test:
        # 단일 항목 테스트
        print(f"테스트 모드: '{args.test}' 검색")
        test_items = [{"test": args.test, "search": args.test, "category": "Test", "acn": 0}]
        run_scraper(test_items, args.output)
    else:
        # TODO: 실제 배포 시 여기에 전체 검색어 목록 로드 로직 추가
        # 예: extracted_data.js 또는 별도 JSON에서 항목 목록 읽기
        print("전체 수집 모드 실행")
        print("NOTE: search_terms.json 파일에서 항목 목록을 읽습니다.")

        search_terms_path = os.path.join(os.path.dirname(__file__), "search_terms.json")
        if not os.path.exists(search_terms_path):
            print(f"오류: '{search_terms_path}' 파일이 없습니다.")
            print("GitHub Actions에서는 이 파일이 레포지토리에 포함되어야 합니다.")
            sys.exit(1)

        with open(search_terms_path, encoding="utf-8") as f:
            search_terms = json.load(f)

        run_scraper(search_terms, args.output)
