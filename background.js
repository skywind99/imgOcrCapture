// background.js (속도 최적화 버전)

importScripts('tesseract.min.js');


// [추가된 코드] 아이콘 클릭 시 사이드 패널이 열리도록 설정
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// ... (아래는 기존 OCR 최적화 코드 그대로 유지) ...
let worker = null;
let isWorkerReady = false;
// ...

let worker = null;
let isWorkerReady = false;

// 1. "Fast" 버전 언어 데이터 사용 (속도 향상 핵심)
// 일반 데이터보다 용량이 작고 처리 속도가 빠릅니다.
const LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0_fast'; 

async function initTesseract() {
    if (worker) return; // 이미 있으면 패스

    console.log("🚀 OCR 엔진 시동 거는 중...");
    
    // 워커 생성 (경량화 데이터 경로 지정)
    worker = Tesseract.createWorker({
        langPath: LANG_PATH, 
        logger: m => console.log(m) // 디버깅용 로그
    });

    await worker.load();
    await worker.loadLanguage('kor+eng');
    await worker.initialize('kor+eng');
    
    // 인식 속도 향상을 위한 파라미터 설정 (정확도 약간 희생, 속도 증가)
    await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO, 
    });

    isWorkerReady = true;
    console.log("✅ OCR 엔진 준비 완료! (대기 중)");
}

// 브라우저 켜지자마자 미리 로딩 시작 (클릭 시 딜레이 줄임)
initTesseract();


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // OCR 요청 처리
    if (request.action === "performOcr") {
        
        const runOcr = async () => {
            // 만약 아직 로딩 안됐으면 기다림
            if (!isWorkerReady) {
                chrome.runtime.sendMessage({ action: "ocrProgress", text: "⏳ 엔진 예열 중... 잠시만요!" });
                await initTesseract();
            }

            try {
                // 실제 인식 수행
                const { data: { text } } = await worker.recognize(request.dataUrl);
                
                chrome.runtime.sendMessage({ action: "ocrResult", text: text });

            } catch (err) {
                console.error(err);
                chrome.runtime.sendMessage({ action: "ocrError", text: "인식 실패: " + err.message });
            }
        };

        runOcr();
        return true; 
    }

    // 캡처 요청 처리
    if (request.action === "startCapture") {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
             // 캡처 후 바로 OCR 요청으로 넘김
             chrome.runtime.sendMessage({ action: "ocrProgress", text: "📷 캡처 완료! 분석 시작..." });
             
             // 재귀 호출과 비슷하게 OCR 로직 실행
             // (여기서는 메시지를 다시 보내는 방식으로 처리)
             chrome.runtime.onMessage.dispatch({ action: "performOcr", dataUrl: dataUrl }, sender, sendResponse);
        });
    }
});