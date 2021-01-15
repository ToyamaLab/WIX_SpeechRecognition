
// 新規発言を追加するための関数
function addRecordResult(value) {

    // nullや空文の場合はこの処理を中止する
    if (value === null || value === '') return;

    // 新規div要素を作成
    var addText = '<div class="speech-bubble" >';

    // アイコンとバブル表示用の要素のタグを追加
    addText = addText + '<img src="image/op.jpg" alt="写真" class="op-img"><div class="sb-bubble sb-line2 sb-left">';// css

    //メッセージ内容を追加
    addText = addText + value;

    // 各要素のタグを閉じる
    addText = addText + '</div></div>';

    // id=chatListの要素の中に作成したdiv要素を追加
    $('#chatList').append(addText);
    console.log(addText);
}


// 音声認識用の各種ボタンを取得
const startBtn = document.querySelector('#startRecord');
const stopBtn = document.querySelector('#stopRecord');

// Web speech APIを呼出
SpeechRecognition = webkitSpeechRecognition || SpeechRecognition;
let recognition = new SpeechRecognition();

// 音声認識設定
// 日本語のみ対応
recognition.lang = 'ja-JP';

// 音声認識中も文字を出力
recognition.interimResults = true;

// 音声入力が終わっても認識を続ける
recognition.continuous = true;

// 確定した音声認識結果
let finalTranscript = '';

// 音声認識結果の取得
recognition.onresult = (event) => {
    // 暫定の認識結果
    let interimTranscript = '';

    // 確定結果の初期化
    finalTranscript = '';

    // ループにより暫定の認識結果を取得、確定したものを変数finalTranscriptに追加
    for (let i = event.resultIndex; i < event.results.length; i++) {
        let transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript = transcript;
        }
    }

    // 前後の空白文字を削除
    finalTranscript = finalTranscript.trim();

    // 音声認識結果を画面に出力する関数に渡す
    addRecordResult(finalTranscript);

}

// startボタンをクリック
startBtn.onclick = () => {
    //音声認識開始
    recognition.start();
}

// stopボタンをクリック
stopBtn.onclick = () => {
    //音声認識停止
    recognition.stop();
}
