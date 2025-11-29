// background.js

importScripts('tesseract.min.js');

// 1. 아이콘 클릭 시 사이드 패널이 열리도록 강제 설정 (이게 없으면 안 열림)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// 2. OCR 엔진 설정 (최적화 버전)
let worker = null;
let isWorkerReady = false;
const LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0_fast'; 

async function initTesseract() {
    if (worker) return;
    try {
        worker = Tesseract.createWorker({
            langPath: LANG_PATH, 
            logger: m => console.log(m)
        });
        await worker.load();
        await worker.loadLanguage('kor+eng');
        await worker.initialize('kor+eng');
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO, 
        });
        isWorkerReady = true;
        console.log("OCR 준비 완료");
    } catch (e) {
        console.error("OCR 초기화 실패:", e);
    }
}
initTesseract();

// 3. 메시지 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "performOcr") {
        const runOcr = async () => {
            if (!isWorkerReady) {
                chrome.runtime.sendMessage({ action: "ocrProgress", text: "⏳ 엔진 로딩 중..." });
                await initTesseract();
            }
            try {
                const { data: { text } } = await worker.recognize(request.dataUrl);
                chrome.runtime.sendMessage({ action: "ocrResult", text: text });
            } catch (err) {
                chrome.runtime.sendMessage({ action: "ocrError", text: "에러: " + err.message });
            }
        };
        runOcr();
        return true; 
    }
    
    if (request.action === "startCapture") {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
             chrome.runtime.sendMessage({ action: "ocrProgress", text: "📷 분석 시작..." });
             chrome.runtime.onMessage.dispatch({ action: "performOcr", dataUrl: dataUrl }, sender, sendResponse);
        });
    }
});
