/**
 * Eve イントロクイズ - クイズエンジン & YouTube Player 制御 (改善版 v3)
 * - もう一度聴く: 何度でも無制限
 * - 制限時間: 無制限 (じっくり思考可能)
 * - イントロ停止: 0.4s/1.0s/2.5s/5.0s 確実停止
 */

class QuizEngine {
    constructor() {
        this.player = null;
        this.isPlayerReady = false;
        
        // 再生制御フラグ
        this.isPlayingIntro = false;
        this.introPlaybackStarted = false;
        this.introStartTime = 0;
        this.stopTimeout = null;
        this.watchdogInterval = null;
        this.timerInterval = null;

        // クイズ状態
        this.difficulty = null;
        this.questionCount = 5;
        this.questions = [];
        this.currentIndex = 0;
        this.currentSong = null;
        this.currentChoices = [];
        this.elapsedTime = 0; // 経過秒数 (無制限)
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.logs = [];
        this.questionStartTime = 0;
        this.isAnswered = false;

        this.initYouTubeAPI();
    }

    /**
     * YouTube IFrame APIの読み込み
     */
    initYouTubeAPI() {
        if (window.YT && window.YT.Player) {
            this.onYouTubeIframeAPIReady();
            return;
        }

        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            this.onYouTubeIframeAPIReady();
        };
    }

    onYouTubeIframeAPIReady() {
        this.player = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            playerVars: {
                playsinline: 1,
                controls: 1,
                rel: 0,
                modestbranding: 1,
                disablekb: 1,
                fs: 0
            },
            events: {
                'onReady': () => {
                    this.isPlayerReady = true;
                    console.log("YouTube Player is ready");
                },
                'onStateChange': (event) => {
                    this.handlePlayerStateChange(event.data);
                },
                'onError': (e) => {
                    console.warn("YouTube Player error:", e.data);
                }
            }
        });
    }

    /**
     * YouTubeプレイヤーの状態変更イベントハンドラ
     * 再生開始（PLAYING = 1）を検知して初めて高精度タイマーを開始！
     */
    handlePlayerStateChange(state) {
        if (state === YT.PlayerState.PLAYING) {
            if (this.isPlayingIntro && !this.isAnswered) {
                if (!this.introPlaybackStarted) {
                    this.introPlaybackStarted = true;
                    this.introStartTime = performance.now();
                    const durationMs = this.difficulty.duration * 1000;

                    // 高精度監視ループ (10ms毎に経過時間をチェックして確実に停止)
                    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
                    this.watchdogInterval = setInterval(() => {
                        if (!this.isPlayingIntro || this.isAnswered) {
                            clearInterval(this.watchdogInterval);
                            return;
                        }

                        const elapsed = performance.now() - this.introStartTime;
                        if (elapsed >= durationMs) {
                            clearInterval(this.watchdogInterval);
                            this.stopIntroAudio();
                        }
                    }, 10);

                    // バックアップ用タイムアウト
                    if (this.stopTimeout) clearTimeout(this.stopTimeout);
                    this.stopTimeout = setTimeout(() => {
                        this.stopIntroAudio();
                    }, durationMs + 20);
                }
            } else if (!this.isPlayingIntro && !this.isAnswered) {
                // 安全装置: 回答前なのにイントロ再生中フラグがOFFなら即座に停止
                try {
                    this.player.pauseVideo();
                } catch (e) {}
            }
        }
    }

    /**
     * クイズ開始
     */
    async startQuiz(difficultyId, questionCount = 5) {
        const difficulties = window.dbManager.getDifficulties();
        this.difficulty = difficulties.find(d => d.id === difficultyId) || difficulties[0];
        this.questionCount = parseInt(questionCount, 10);
        this.questions = window.dbManager.getRandomSongs(difficultyId, this.questionCount);
        this.currentIndex = 0;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.logs = [];

        this.nextQuestion();
    }

    /**
     * 次の問題をロード
     */
    nextQuestion() {
        if (this.currentIndex >= this.questions.length) {
            this.finishQuiz();
            return;
        }

        this.clearStopTimers();
        this.currentSong = this.questions[this.currentIndex];
        this.isAnswered = false;
        this.elapsedTime = 0;

        // 誤答選択肢を取得してシャッフル
        const wrongTitles = window.dbManager.getWrongChoices(this.currentSong.id, this.difficulty.options_count - 1);
        this.currentChoices = this.shuffleArray([this.currentSong.title, ...wrongTitles]);

        // UIイベント発行
        if (this.onQuestionReady) {
            this.onQuestionReady({
                questionNumber: this.currentIndex + 1,
                totalQuestions: this.questions.length,
                song: this.currentSong,
                difficulty: this.difficulty,
                choices: this.currentChoices,
                score: this.score,
                combo: this.combo
            });
        }

        // イントロ再生開始
        this.playIntro();
        this.startTimer();
    }

    /**
     * イントロ音声の再生
     */
    playIntro() {
        if (!this.player || !this.isPlayerReady) {
            console.warn("Player not ready yet, retrying in 400ms");
            setTimeout(() => this.playIntro(), 400);
            return;
        }

        this.clearStopTimers();
        this.isPlayingIntro = true;
        this.introPlaybackStarted = false;

        const startSec = this.currentSong.intro_start || 0;

        if (this.onPlaybackStateChange) {
            this.onPlaybackStateChange({ isPlaying: true, duration: this.difficulty.duration });
        }

        try {
            this.player.unMute();
            this.player.setVolume(100);
            this.player.loadVideoById({
                videoId: this.currentSong.youtube_id,
                startSeconds: startSec
            });
        } catch (e) {
            console.error("Failed to load video:", e);
        }
    }

    /**
     * イントロ音声の確実な停止
     */
    stopIntroAudio() {
        this.isPlayingIntro = false;
        this.clearStopTimers();

        try {
            if (this.player && typeof this.player.pauseVideo === 'function') {
                this.player.pauseVideo();
            }
        } catch (e) {}

        if (this.onPlaybackStateChange) {
            this.onPlaybackStateChange({ isPlaying: false });
        }
    }

    /**
     * もう一度聴く（リプレイ） - 何回でも無制限！
     */
    replayIntro() {
        if (this.isPlayingIntro || this.isAnswered) return false;
        this.playIntro();
        return true;
    }

    /**
     * 思考タイマー開始 (制限時間は無制限！)
     */
    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.questionStartTime = Date.now();
        this.elapsedTime = 0;

        this.timerInterval = setInterval(() => {
            this.elapsedTime += 0.1;
            // 制限時間なし（時間切れ強制終了はしない）
            if (this.onTimerTick) {
                this.onTimerTick(this.elapsedTime);
            }
        }, 100);
    }

    /**
     * 回答処理
     */
    handleAnswer(selectedTitle) {
        if (this.isAnswered) return;
        this.isAnswered = true;
        this.isPlayingIntro = false;
        this.clearStopTimers();
        if (this.timerInterval) clearInterval(this.timerInterval);

        const timeTakenMs = Date.now() - this.questionStartTime;
        const timeTakenSec = timeTakenMs / 1000;
        const isCorrect = (selectedTitle === this.currentSong.title);
        let earnedScore = 0;

        if (isCorrect) {
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            this.correctCount++;

            // スコア計算: 基本点 1000点 + 早期回答ボーナス（最大500点、ゆっくり答えても減衰するだけでゼロ未満にはならない）
            const baseScore = 1000;
            // 5秒以内なら500点、30秒で0点に向かってなだらかに減衰
            const timeBonus = Math.max(50, Math.round(500 * Math.max(0, (30 - timeTakenSec) / 30)));
            const comboBonus = (this.combo - 1) * 150;
            earnedScore = Math.round((baseScore + timeBonus + comboBonus) * this.difficulty.bonus_multiplier);
            this.score += earnedScore;
        } else {
            this.combo = 0;
        }

        // ログ記録
        this.logs.push({
            songId: this.currentSong.id,
            userAnswer: selectedTitle || "(未選択)",
            isCorrect,
            timeTakenMs,
            earnedScore
        });

        // 回答後は公式MV / YouTube Music音源をそのまま継続再生して鑑賞！
        try {
            if (this.player && typeof this.player.playVideo === 'function') {
                this.player.playVideo();
            }
        } catch (e) {}

        if (this.onAnswerResult) {
            this.onAnswerResult({
                isCorrect,
                correctTitle: this.currentSong.title,
                selectedTitle,
                song: this.currentSong,
                earnedScore,
                totalScore: this.score,
                combo: this.combo
            });
        }
    }

    /**
     * 次の問題へ進む
     */
    proceedNext() {
        this.stopIntroAudio();
        this.currentIndex++;
        this.nextQuestion();
    }

    /**
     * クイズ終了・リザルト作成
     */
    finishQuiz() {
        this.stopIntroAudio();
        if (this.timerInterval) clearInterval(this.timerInterval);

        try {
            if (this.player && typeof this.player.stopVideo === 'function') {
                this.player.stopVideo();
            }
        } catch (e) {}

        const accuracy = Math.round((this.correctCount / this.questions.length) * 100);
        const rankInfo = this.calculateRank(accuracy, this.score);

        // データベースに保存
        const historyId = window.dbManager.savePlayResult({
            difficultyId: this.difficulty.id,
            score: this.score,
            totalQuestions: this.questions.length,
            correctCount: this.correctCount,
            maxCombo: this.maxCombo,
            rank: rankInfo.rank,
            logs: this.logs
        });

        if (this.onQuizFinished) {
            this.onQuizFinished({
                historyId,
                difficulty: this.difficulty,
                score: this.score,
                totalQuestions: this.questions.length,
                correctCount: this.correctCount,
                accuracy,
                maxCombo: this.maxCombo,
                rankInfo,
                logs: this.logs
            });
        }
    }

    /**
     * ランク & 称号の判定
     */
    calculateRank(accuracy, score) {
        if (accuracy === 100) {
            return { rank: 'S+', title: 'Eve神 (廻人マスター)', desc: '完璧な耳！全問完全正解の偉業達成！', color: '#ff2d55' };
        } else if (accuracy >= 80) {
            return { rank: 'S', title: '特級Eveリスナー', desc: '圧倒的なEve愛！イントロの神髄を知る者。', color: '#ffd700' };
        } else if (accuracy >= 60) {
            return { rank: 'A', title: 'アンダーグラウンドの住人', desc: 'かなりのEveマニア！素晴らしい洞察力です。', color: '#00f5d4' };
        } else if (accuracy >= 40) {
            return { rank: 'B', title: '文化の探求者', desc: 'Eveの楽曲をしっかり聴き込んでいるリスナー！', color: '#7b2cbf' };
        } else {
            return { rank: 'C', title: 'おとぎの国の見習い', desc: 'まだまだEveの名曲世界は広がっています。リベンジしよう！', color: '#a0a0a0' };
        }
    }

    clearStopTimers() {
        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
            this.stopTimeout = null;
        }
        if (this.watchdogInterval) {
            clearInterval(this.watchdogInterval);
            this.watchdogInterval = null;
        }
    }

    clearIntervals() {
        this.clearStopTimers();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

window.quizEngine = new QuizEngine();
