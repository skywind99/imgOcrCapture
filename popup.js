// 주요 이벤트 리스너: 파일 업로드, 캡처, 붙여넣기, 드래그 앤 드롭
document.addEventListener('DOMContentLoaded', () => {
    // 1. 이미지 업로드 처리
    document.getElementById('upload-file').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            // 파일을 base64로 변환 후 OCR 요청
            readFileAsDataURL(file, sendOcrRequest);
        }
    });

    // 2. 스크린샷 캡처 요청 (Content Script를 통해 영역 선택)
    document.getElementById('capture-screen').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "startCapture" });
        window.close(); // 캡처 시작 후 팝업 닫기
    });

    // 3. 클립보드 붙여넣기 요청
    document.getElementById('paste-clipboard').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "pasteImage" });
        window.close(); 
    });
    
    // 4. 드래그 앤 드롭 처리 (popup.html 내에서 직접 처리)
    setupDragAndDrop();

    // OCR 결과 수신 및 표시
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "ocrResult") {
            document.getElementById('ocr-result').value = message.text;
            // 로딩 상태 해제 로직 추가 필요
        }
    });
});

// 파일 읽기 헬퍼 함수
function readFileAsDataURL(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target.result);
    reader.readAsDataURL(file);
}

// OCR 요청을 background.js로 전달
function sendOcrRequest(imageDataUrl) {
    // 로딩 상태 설정 로직 추가 필요
    chrome.runtime.sendMessage({ 
        action: "performOcr", 
        dataUrl: imageDataUrl 
    });
}
