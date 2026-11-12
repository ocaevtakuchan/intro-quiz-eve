/**
 * Eve イントロクイズ - メインアプリケーションUIコントローラー (v3)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 画面要素
    const screens = {
        title: document.getElementById('screen-title'),
        quiz: document.getElementById('screen-quiz'),
        result: document.getElementById('screen-result'),
        database: document.getElementById('screen-database'),
        history: document.getElementById('screen-history')
    };

    // 初期化ローディング画面
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    function showScreen(screenName) {
        Object.keys(screens).forEach(name => {
            if (screens[name]) {
                screens[name].classList.toggle('active', name === screenName);
            }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    try {
        loadingText.textContent = "SQLite データベース初期化 & 楽曲マイグレーション中...";
        await window.dbManager.init();
        loadingOverlay.classList.add('hidden');
    } catch (e) {
        console.error("Init error:", e);
        loadingText.innerHTML = `<span style="color:#ff4d4f">エラーが発生しました: ${e.message}</span>`;
        return;
    }

    // 難易度一覧の描画
    function renderDifficultyCards() {
        const container = document.getElementById('difficulty-selector');
        if (!container) return;
        container.innerHTML = '';

        const diffs = window.dbManager.getDifficulties();
        diffs.forEach((diff, idx) => {
            const card = document.createElement('div');
            card.className = `diff-card ${diff.id} ${idx === 1 ? 'selected' : ''}`;
            card.dataset.id = diff.id;
            card.innerHTML = `
                <div class="diff-badge">${diff.name}</div>
                <div class="diff-duration">再生: <strong>${diff.duration}秒</strong></div>
                <div class="diff-desc">${diff.description}</div>
                <div class="diff-bonus">スコア倍率: <strong>x${diff.bonus_multiplier.toFixed(1)}</strong></div>
            `;
            card.addEventListener('click', () => {
                document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
            container.appendChild(card);
        });
    }

    renderDifficultyCards();

    // タイトル画面の統計表示
    function updateTitleStats() {
        const stats = window.dbManager.getStats();
        document.getElementById('stat-high-score').textContent = stats.high_score.toLocaleString();
        document.getElementById('stat-total-plays').textContent = stats.total_plays;
        document.getElementById('stat-accuracy').textContent = `${stats.accuracy}%`;
    }
    updateTitleStats();

    // クイズ開始ボタン
    document.getElementById('btn-start-game').addEventListener('click', () => {
        const selectedCard = document.querySelector('.diff-card.selected');
        const diffId = selectedCard ? selectedCard.dataset.id : 'normal';
        const questionCount = parseInt(document.getElementById('select-question-count').value, 10) || 5;

        showScreen('quiz');
        window.quizEngine.startQuiz(diffId, questionCount);
    });

    // データベース閲覧ボタン
    document.getElementById('btn-open-db').addEventListener('click', () => {
        showScreen('database');
        renderSongsTable();
    });

    // プレイ履歴ボタン
    document.getElementById('btn-open-history').addEventListener('click', () => {
        showScreen('history');
        renderHistoryTable();
    });

    // タイトルに戻るボタン群
    document.querySelectorAll('.btn-back-to-title').forEach(btn => {
        btn.addEventListener('click', () => {
            try {
                if (window.quizEngine.player && window.quizEngine.player.stopVideo) {
                    window.quizEngine.player.stopVideo();
                }
            } catch (e) {}
            window.quizEngine.clearIntervals();
            updateTitleStats();
            showScreen('title');
        });
    });

    // ==========================================
    // クイズ画面イベントリスナー
    // ==========================================
    const quizUI = {
        qNum: document.getElementById('quiz-q-num'),
        totalQ: document.getElementById('quiz-total-q'),
        diffName: document.getElementById('quiz-diff-badge'),
        score: document.getElementById('quiz-score-val'),
        combo: document.getElementById('quiz-combo-val'),
        timerBar: document.getElementById('quiz-timer-fill'),
        timerText: document.getElementById('quiz-timer-text'),
        btnPlayFirst: document.getElementById('btn-play-first'),
        btnPlayOffset: document.getElementById('btn-play-offset'),
        btnPlaySabi: document.getElementById('btn-play-sabi'),
        visualizer: document.getElementById('audio-visualizer'),
        videoContainer: document.getElementById('video-preview-container'),
        coverBlind: document.getElementById('video-blind'),
        choicesContainer: document.getElementById('quiz-choices'),
        hintContainer: document.getElementById('quiz-hint-box'),
        feedbackPanel: document.getElementById('quiz-feedback-panel'),
        feedbackResult: document.getElementById('feedback-result-badge'),
        feedbackTitle: document.getElementById('feedback-song-title'),
        feedbackTrivia: document.getElementById('feedback-song-trivia'),
        feedbackScore: document.getElementById('feedback-earned-score'),
        btnNext: document.getElementById('btn-next-question')
    };

    // 問題準備完了時
    window.quizEngine.onQuestionReady = (data) => {
        quizUI.qNum.textContent = data.questionNumber;
        quizUI.totalQ.textContent = data.totalQuestions;
        quizUI.diffName.textContent = data.difficulty.name;
        quizUI.score.textContent = data.score.toLocaleString();
        quizUI.combo.textContent = data.combo;
        if (quizUI.btnPlayFirst) quizUI.btnPlayFirst.disabled = false;
        if (quizUI.btnPlayOffset) quizUI.btnPlayOffset.disabled = false;
        if (quizUI.btnPlaySabi) quizUI.btnPlaySabi.disabled = false;

        // ブラインド（目隠し）を被せて音だけ聴かせる
        quizUI.coverBlind.classList.remove('revealed');
        quizUI.feedbackPanel.classList.add('hidden');
        quizUI.visualizer.classList.add('active');

        // ヒント表示（Easy時のみ）
        if (data.difficulty.has_hint) {
            quizUI.hintContainer.innerHTML = `
                <div class="hint-tag">💡 ヒント: リリース ${data.song.release_year}年 / 収録アルバム: 『${data.song.album}』</div>
            `;
            quizUI.hintContainer.classList.remove('hidden');
        } else {
            quizUI.hintContainer.classList.add('hidden');
        }

        // 選択肢ボタンの生成
        quizUI.choicesContainer.innerHTML = '';
        data.choices.forEach(title => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = title;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
                window.quizEngine.handleAnswer(title);
            });
            quizUI.choicesContainer.appendChild(btn);
        });
    };

    // 再生状態の変化
    window.quizEngine.onPlaybackStateChange = (state) => {
        if (state.isPlaying) {
            quizUI.visualizer.classList.add('active');
            const labelText = state.label ? `[${state.label}] ` : '';
            quizUI.visualizer.querySelector('.visualizer-status').textContent = `♪ ${labelText}イントロ再生中 (${state.duration}秒)... 耳を澄ませ！`;
            if (quizUI.btnPlayFirst) quizUI.btnPlayFirst.disabled = true;
            if (quizUI.btnPlayOffset) quizUI.btnPlayOffset.disabled = true;
            if (quizUI.btnPlaySabi) quizUI.btnPlaySabi.disabled = true;
        } else {
            quizUI.visualizer.classList.remove('active');
            quizUI.visualizer.querySelector('.visualizer-status').textContent = `回答を選択してください（何度でも聴き直し可能）`;
            if (quizUI.btnPlayFirst) quizUI.btnPlayFirst.disabled = false;
            if (quizUI.btnPlayOffset) quizUI.btnPlayOffset.disabled = false;
            if (quizUI.btnPlaySabi) quizUI.btnPlaySabi.disabled = false;
        }
    };

    // タイマー更新 (制限時間無制限！経過時間を表示)
    window.quizEngine.onTimerTick = (elapsedSec) => {
        quizUI.timerText.textContent = `⏱️ 思考時間: ${elapsedSec.toFixed(1)}s (無制限)`;
        quizUI.timerBar.style.width = `100%`;
        quizUI.timerBar.classList.remove('danger');
    };

    // 3つの再生操作ボタンのイベントリスナー
    if (quizUI.btnPlayFirst) {
        quizUI.btnPlayFirst.addEventListener('click', () => {
            window.quizEngine.playFirstSecond();
        });
    }

    if (quizUI.btnPlayOffset) {
        quizUI.btnPlayOffset.addEventListener('click', () => {
            window.quizEngine.playFromOffset();
        });
    }

    if (quizUI.btnPlaySabi) {
        quizUI.btnPlaySabi.addEventListener('click', () => {
            window.quizEngine.playFromSabi();
        });
    }

    // 回答結果の表示
    window.quizEngine.onAnswerResult = (res) => {
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.disabled = true;
            if (btn.textContent === res.correctTitle) {
                btn.classList.add('correct');
            } else if (btn.textContent === res.selectedTitle) {
                btn.classList.add('wrong');
            }
        });

        // MV / 音源を解禁！
        quizUI.coverBlind.classList.add('revealed');
        quizUI.visualizer.classList.remove('active');
        if (quizUI.btnPlayFirst) quizUI.btnPlayFirst.disabled = true;
        if (quizUI.btnPlayOffset) quizUI.btnPlayOffset.disabled = true;
        if (quizUI.btnPlaySabi) quizUI.btnPlaySabi.disabled = true;

        // 正誤演出
        quizUI.feedbackPanel.classList.remove('hidden');
        if (res.isCorrect) {
            quizUI.feedbackResult.className = 'feedback-badge correct';
            quizUI.feedbackResult.textContent = '⭕ CORRECT!! 正解！';
            quizUI.feedbackScore.textContent = `+${res.earnedScore.toLocaleString()} pts (Combo: ${res.combo})`;
        } else {
            quizUI.feedbackResult.className = 'feedback-badge wrong';
            quizUI.feedbackResult.textContent = '❌ MISS... 不正解';
            quizUI.feedbackScore.textContent = '+0 pts';
        }

        const sourceBadge = (res.song.source_type === 'YouTubeMusic')
            ? '<span class="source-tag yt-music">YouTube Music公式音源</span>'
            : '<span class="source-tag mv">公式MV</span>';

        quizUI.feedbackTitle.innerHTML = `${res.song.title} ${sourceBadge}`;
        quizUI.feedbackTrivia.innerHTML = `
            <p><strong>アルバム:</strong> 『${res.song.album}』 (${res.song.release_year}年)</p>
            <p><strong>解説:</strong> ${res.song.trivia}</p>
        `;

        quizUI.score.textContent = res.totalScore.toLocaleString();
        quizUI.combo.textContent = res.combo;
    };

    // 次へボタン
    quizUI.btnNext.addEventListener('click', () => {
        window.quizEngine.proceedNext();
    });

    // ==========================================
    // リザルト画面
    // ==========================================
    window.quizEngine.onQuizFinished = (result) => {
        showScreen('result');

        document.getElementById('result-rank-badge').textContent = result.rankInfo.rank;
        document.getElementById('result-rank-badge').style.borderColor = result.rankInfo.color;
        document.getElementById('result-rank-badge').style.color = result.rankInfo.color;

        document.getElementById('result-title-name').textContent = result.rankInfo.title;
        document.getElementById('result-title-desc').textContent = result.rankInfo.desc;

        document.getElementById('result-final-score').textContent = result.score.toLocaleString();
        document.getElementById('result-accuracy').textContent = `${result.accuracy}% (${result.correctCount}/${result.totalQuestions})`;
        document.getElementById('result-max-combo').textContent = result.maxCombo;
        document.getElementById('result-diff-name').textContent = result.difficulty.name;

        // 問題ごとの詳細リスト
        const logContainer = document.getElementById('result-logs-list');
        logContainer.innerHTML = '';
        result.logs.forEach((log, index) => {
            const song = window.dbManager.getAllSongs().find(s => s.id === log.songId);
            const item = document.createElement('div');
            item.className = `result-log-item ${log.isCorrect ? 'correct' : 'wrong'}`;
            item.innerHTML = `
                <div class="log-q-num">Q${index + 1}</div>
                <div class="log-icon">${log.isCorrect ? '⭕' : '❌'}</div>
                <div class="log-info">
                    <div class="log-title">${song ? song.title : '不明'}</div>
                    <div class="log-sub">あなたの回答: ${log.userAnswer} (思考時間: ${(log.timeTakenMs / 1000).toFixed(1)}秒)</div>
                </div>
                <div class="log-score">${log.earnedScore > 0 ? `+${log.earnedScore.toLocaleString()}` : '0'}</div>
            `;
            logContainer.appendChild(item);
        });
    };

    document.getElementById('btn-play-again').addEventListener('click', () => {
        const selectedCard = document.querySelector('.diff-card.selected');
        const diffId = selectedCard ? selectedCard.dataset.id : 'normal';
        const questionCount = parseInt(document.getElementById('select-question-count').value, 10) || 5;

        showScreen('quiz');
        window.quizEngine.startQuiz(diffId, questionCount);
    });

    // ==========================================
    // データベース管理・閲覧画面
    // ==========================================
    function renderSongsTable() {
        const songs = window.dbManager.getAllSongs();
        const tbody = document.getElementById('db-songs-tbody');
        tbody.innerHTML = '';
        songs.forEach(song => {
            const tr = document.createElement('tr');
            const sourceBadge = (song.source_type === 'YouTubeMusic')
                ? '<span class="source-tag yt-music">YT Music</span>'
                : '<span class="source-tag mv">公式MV</span>';

            tr.innerHTML = `
                <td>${song.id}</td>
                <td><strong>${song.title}</strong> <span class="ruby">(${song.reading})</span> ${sourceBadge}</td>
                <td>${song.release_year}</td>
                <td>『${song.album}』</td>
                <td><span class="tier-badge tier-${song.tier}">Tier ${song.tier}</span></td>
                <td class="trivia-cell" title="${song.trivia}">${song.trivia}</td>
                <td>
                    <button class="btn-sm btn-play-sample" data-yt="${song.youtube_id}" data-title="${song.title}">
                        ▶ 試聴
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-play-sample').forEach(btn => {
            btn.addEventListener('click', () => {
                const ytId = btn.dataset.yt;
                const title = btn.dataset.title;
                const modal = document.getElementById('modal-sample-player');
                document.getElementById('modal-song-title').textContent = title;
                document.getElementById('modal-iframe').src = `https://www.youtube.com/embed/${ytId}?autoplay=1`;
                modal.classList.remove('hidden');
            });
        });
    }

    document.getElementById('btn-close-modal').addEventListener('click', () => {
        document.getElementById('modal-sample-player').classList.add('hidden');
        document.getElementById('modal-iframe').src = '';
    });

    // SQLコンソール実行
    document.getElementById('btn-run-sql').addEventListener('click', () => {
        const sql = document.getElementById('sql-input').value.trim();
        const resultContainer = document.getElementById('sql-output');
        resultContainer.innerHTML = '';

        if (!sql) {
            resultContainer.innerHTML = '<div class="sql-msg empty">SQLクエリを入力してください。</div>';
            return;
        }

        const res = window.dbManager.executeCustomQuery(sql);
        if (!res.success) {
            resultContainer.innerHTML = `<div class="sql-msg error">SQLエラー: ${res.error}</div>`;
            return;
        }

        if (!res.results || res.results.length === 0) {
            resultContainer.innerHTML = '<div class="sql-msg success">クエリが正常に実行されました。（返却行なし）</div>';
            return;
        }

        res.results.forEach(result => {
            const table = document.createElement('table');
            table.className = 'sql-result-table';
            
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            result.columns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            result.values.forEach(row => {
                const tr = document.createElement('tr');
                row.forEach(val => {
                    const td = document.createElement('td');
                    td.textContent = (val !== null && val !== undefined) ? val : 'NULL';
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);

            const wrap = document.createElement('div');
            wrap.className = 'sql-table-wrap';
            wrap.innerHTML = `<div class="sql-rows-count">${result.values.length} 行返却されました</div>`;
            wrap.appendChild(table);
            resultContainer.appendChild(wrap);
        });
    });

    document.querySelectorAll('.btn-sql-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('sql-input').value = btn.dataset.sql;
            document.getElementById('btn-run-sql').click();
        });
    });

    document.getElementById('btn-export-db').addEventListener('click', () => {
        window.dbManager.exportToFile();
    });

    document.getElementById('btn-reset-db').addEventListener('click', async () => {
        if (confirm("データベースを最新状態（全91曲）にリセットしますか？プレイ履歴も消去されます。")) {
            await window.dbManager.reset();
            alert("データベースを初期化しました（全91曲）。");
            renderSongsTable();
            updateTitleStats();
        }
    });

    // プレイ履歴画面
    function renderHistoryTable() {
        const history = window.dbManager.getPlayHistory();
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = '';

        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;">まだプレイ履歴がありません。クイズを遊んでみよう！</td></tr>';
            return;
        }

        history.forEach(item => {
            const tr = document.createElement('tr');
            const accuracy = Math.round((item.correct_count / item.total_questions) * 100);
            tr.innerHTML = `
                <td>${item.played_at}</td>
                <td><span class="diff-tag ${item.difficulty_id}">${item.difficulty_name || item.difficulty_id}</span></td>
                <td><strong>${item.score.toLocaleString()}</strong></td>
                <td>${accuracy}% (${item.correct_count}/${item.total_questions})</td>
                <td>${item.max_combo}</td>
                <td><span class="rank-tag rank-${item.rank}">${item.rank}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
});
