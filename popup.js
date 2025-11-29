document.addEventListener('DOMContentLoaded', () => {
    const statusMsg = document.getElementById('status-msg');
    const resultArea = document.getElementById('ocr-result');

    function showStatus(msg) { statusMsg.innerText = msg; }

    // 공통 이미지 처리 함수
    function processImage(dataUrl) {
        showStatus("⏳ 텍스트 추출 중...");
        resultArea.value = "처리 중입니다. 잠시만 기다려주세요...";
        
        chrome.runtime.sendMessage({ action: "performOcr", dataUrl: dataUrl });
    }

    // 1. 파일 업로드
    document.getElementById('upload-file').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', (e) => {
        if (e.target.files[0]) readFile(e.target.files[0]);
    });

    // 2. 스크린샷 찍기
    document.getElementById('capture-screen').addEventListener('click', () => {
        showStatus("📷 화면 캡처 중...");
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
            if (chrome.runtime.lastError) {
                alert("캡처 오류: " + chrome.runtime.lastError.message);
                showStatus("❌ 캡처 실패");
                return;
            }
            processImage(dataUrl);
        });
    });

    // 3. 클립보드 (클릭 시 입력창에 포커스)
    const pasteCard = document.getElementById('paste-clipboard');
    pasteCard.addEventListener('click', () => {
        resultArea.value = "";
        resultArea.placeholder = "이곳을 클릭했으니, 이제 Ctrl+V를 눌러 이미지를 붙여넣으세요!";
        resultArea.focus();
        showStatus("⌨️ Ctrl+V를 누르세요");
    });

    // 붙여넣기 감지 (전역)
    window.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        let foundImage = false;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                readFile(blob);
                foundImage = true;
                break;
            }
        }
        if (!foundImage) showStatus("⚠️ 이미지가 아닙니다.");
    });

    // 4. 드래그 앤 드롭
    const dropZone = document.getElementById('drag-drop');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false); // 전체 화면 방지
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        if (files[0]) readFile(files[0]);
    });

    // 파일 -> DataURL 변환 헬퍼
    function readFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 가능합니다.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => processImage(e.target.result);
        reader.readAsDataURL(file);
    }

    // 결과 수신
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "ocrResult") {
            resultArea.value = msg.text;
            showStatus("✅ 완료!");
        }
    });
});
