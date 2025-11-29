// Tesseract.js 및 코어 스크립트 로드
importScripts("tesseract.js", "tesseract-core.js");

// Tesseract Worker 초기화
let worker = null;

async function initializeWorker() {
    // Tesseract.js 설정 및 언어 팩 로드
    worker = Tesseract.createWorker({
        langPath: 'langs', // 언어 팩 경로 지정
    });
    await worker.load();
    await worker.loadLanguage('eng+kor'); // 영어 및 한국어 로드
    await worker.initialize('eng+kor');
}

initializeWorker(); 

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. 이미지 데이터 OCR 요청 처리
    if (message.action === "performOcr" && worker) {
        (async () => {
            const { data: { text } } = await worker.recognize(message.dataUrl);
            
            // 결과를 팝업으로 다시 전송
            chrome.runtime.sendMessage({ action: "ocrResult", text: text });
        })();
        return true; // 비동기 응답을 위해 true 반환
    }

    // 2. 캡처 시작 요청 (Content Script 삽입)
    if (message.action === "startCapture") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                });
            }
        });
    }

    // 3. 클립보드 붙여넣기 요청 (GitHub 코드는 ContextMenus 사용)
    if (message.action === "pasteImage") {
        // 클립보드 처리는 일반적으로 권한 문제로 인해 Content Script를 통해 처리됩니다.
        // 또는 임시 Contenteditable 요소를 사용하여 Paste 이벤트를 잡습니다.
        // GitHub 코드에서는 Content Script를 삽입하여 처리하는 방식이 일반적입니다.
        // [TODO: Paste 로직 Content Script 호출로 구현]
    }
});
// background.js
importScripts('tesseract.min.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "performOcr") {
        
        // 1. OCR 시작
        Tesseract.recognize(
            request.dataUrl,
            'kor+eng', // 한국어 + 영어
            { 
                // 2. 진행 상황 로그 찍기 (여기가 핵심!)
                logger: m => {
                    console.log(m); // 서비스 워커 콘솔에 출력
                    
                    // 팝업창으로 상태 메시지 전송 (로딩 바 역할)
                    if (m.status === 'recognizing text') {
                        chrome.runtime.sendMessage({ 
                            action: "ocrProgress", 
                            text: `🔍 텍스트 분석 중... ${(m.progress * 100).toFixed(0)}%` 
                        });
                    } else if (m.status.includes('loading')) {
                        chrome.runtime.sendMessage({ 
                            action: "ocrProgress", 
                            text: `📥 언어 데이터 다운로드 중...` 
                        });
                    }
                }
            }
        ).then(({ data: { text } }) => {
            // 3. 완료 시 결과 전송
            chrome.runtime.sendMessage({ action: "ocrResult", text: text });
        }).catch(err => {
            // 4. 에러 발생 시 전송
            console.error(err);
            chrome.runtime.sendMessage({ action: "ocrError", text: "에러 발생! 콘솔을 확인하세요." });
        });
    }
    return true; // 비동기 응답 허용
});
