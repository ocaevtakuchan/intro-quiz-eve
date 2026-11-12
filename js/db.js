/**
 * Eve イントロクイズ - SQLite データベースマネージャー (sql.js / WebAssembly)
 * 全55曲対応 (MV & YouTube Music公式音源) & 自動マイグレーション機能
 */

class DatabaseManager {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.isReady = false;
        this.TOTAL_SONGS_EXPECTED = 55;
    }

    /**
     * SQLiteエンジンの初期化 & スキーマ適用 / 自動マイグレーション
     */
    async init() {
        if (this.isReady) return;

        try {
            const config = {
                locateFile: filename => `./lib/${filename}`
            };

            if (typeof initSqlJs === 'undefined') {
                throw new Error("sql.js is not loaded.");
            }

            this.SQL = await initSqlJs(config);

            const savedData = await this.loadSavedDatabase();
            if (savedData) {
                this.db = new this.SQL.Database(savedData);
                console.log("既存のSQLiteデータベースをロードしました。");
                await this.checkAndMigrate();
            } else {
                this.db = new this.SQL.Database();
                await this.initSchema();
                console.log("新しいSQLiteデータベースを作成し、初期化しました。");
            }

            this.isReady = true;
            this.persist();
        } catch (err) {
            console.error("Database initialization failed:", err);
            throw err;
        }
    }

    /**
     * schema.sql を取得して実行
     */
    async initSchema() {
        try {
            const response = await fetch('./data/schema.sql');
            if (!response.ok) {
                throw new Error(`Failed to load schema.sql: ${response.statusText}`);
            }
            const schemaSql = await response.text();
            this.db.run(schemaSql);
        } catch (e) {
            console.warn("fetch failed, falling back to embedded schema", e);
            if (window.EMBEDDED_SCHEMA_SQL) {
                this.db.run(window.EMBEDDED_SCHEMA_SQL);
            }
        }
    }

    /**
     * 旧バージョンDBの曲数をチェックし、最新曲数未満または心海が旧IDなら自動更新
     */
    async checkAndMigrate() {
        try {
            const res = this.db.exec("SELECT COUNT(*) AS cnt FROM songs");
            const currentCount = (res.length && res[0].values.length) ? res[0].values[0][0] : 0;
            
            // 心海の動画IDチェック
            const shinkaiRes = this.db.exec("SELECT youtube_id FROM songs WHERE title = '心海'");
            const shinkaiYt = (shinkaiRes.length && shinkaiRes[0].values.length) ? shinkaiRes[0].values[0][0] : '';
            
            // 難易度godのチェック
            const godRes = this.db.exec("SELECT COUNT(*) AS cnt FROM difficulties WHERE id = 'god'");
            const godCount = (godRes.length && godRes[0].values.length) ? godRes[0].values[0][0] : 0;

            console.log(`現在の登録楽曲数: ${currentCount} / 目標: ${this.TOTAL_SONGS_EXPECTED}, 心海ID: ${shinkaiYt}, god難易度: ${godCount}`);

            if (currentCount < this.TOTAL_SONGS_EXPECTED || shinkaiYt !== 'vRPCAAUBMms' || godCount === 0) {
                console.log("最新の全55曲データ＆新難易度（神0.1秒モード）へ自動マイグレーションを実行します...");
                await this.initSchema();
                this.persist();
            }
        } catch (e) {
            console.warn("Migration check error, applying schema:", e);
            await this.initSchema();
            this.persist();
        }
    }

    /**
     * ブラウザのIndexedDBからバイナリを取得
     */
    async loadSavedDatabase() {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open("EveQuizDatabase", 1);
                request.onupgradeneeded = (e) => {
                    const idb = e.target.result;
                    if (!idb.objectStoreNames.contains("sqlite")) {
                        idb.createObjectStore("sqlite");
                    }
                };
                request.onsuccess = (e) => {
                    const idb = e.target.result;
                    const tx = idb.transaction("sqlite", "readonly");
                    const store = tx.objectStore("sqlite");
                    const getReq = store.get("binary");
                    getReq.onsuccess = () => {
                        if (getReq.result) {
                            resolve(new Uint8Array(getReq.result));
                        } else {
                            resolve(null);
                        }
                    };
                    getReq.onerror = () => resolve(null);
                };
                request.onerror = () => resolve(null);
            } catch (err) {
                resolve(null);
            }
        });
    }

    /**
     * データベースをIndexedDBに永続化保存
     */
    async persist() {
        if (!this.db) return;
        try {
            const data = this.db.export();
            const request = indexedDB.open("EveQuizDatabase", 1);
            request.onsuccess = (e) => {
                const idb = e.target.result;
                const tx = idb.transaction("sqlite", "readwrite");
                const store = tx.objectStore("sqlite");
                store.put(data.buffer, "binary");
            };
        } catch (err) {
            console.error("Failed to persist database:", err);
        }
    }

    /**
     * 難易度一覧の取得
     */
    getDifficulties() {
        const stmt = this.db.prepare("SELECT * FROM difficulties ORDER BY bonus_multiplier ASC");
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    /**
     * 指定難易度の出題曲をランダムに取得
     * @param {string} difficultyId 'easy' | 'normal' | 'hard' | 'demon'
     * @param {number} count 出題問題数
     */
    getRandomSongs(difficultyId, count = 5) {
        let sql = "";
        let params = [];

        if (difficultyId === 'easy') {
            // Easyは定番・代表曲（tier = 1）から
            sql = `
                SELECT * FROM songs 
                WHERE tier = 1
                ORDER BY RANDOM() 
                LIMIT ?
            `;
            params = [count];
        } else if (difficultyId === 'normal') {
            // Normalは定番＋人気曲（tier <= 2）から
            sql = `
                SELECT * FROM songs 
                WHERE tier <= 2
                ORDER BY RANDOM() 
                LIMIT ?
            `;
            params = [count];
        } else if (difficultyId === 'hard') {
            // Hardは全55曲から均等ランダム出題（マイナー・アルバム曲・YouTube Music音源含む）
            sql = `
                SELECT * FROM songs 
                ORDER BY RANDOM() 
                LIMIT ?
            `;
            params = [count];
        } else {
            // Demon (鬼) はマイナー曲・アルバム曲・YouTube Music音源（Tier 3）を優先ブレンド！
            sql = `
                SELECT * FROM songs 
                ORDER BY (CASE WHEN tier = 3 THEN 0.3 ELSE 1.0 END) * RANDOM() 
                LIMIT ?
            `;
            params = [count];
        }

        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const songs = [];
        while (stmt.step()) {
            songs.push(stmt.getAsObject());
        }
        stmt.free();

        // 不足分の補充
        if (songs.length < count) {
            const existingIds = songs.map(s => s.id);
            const fillStmt = this.db.prepare(`
                SELECT * FROM songs 
                WHERE id NOT IN (${existingIds.length ? existingIds.join(',') : 0}) 
                ORDER BY RANDOM() 
                LIMIT ?
            `);
            fillStmt.bind([count - songs.length]);
            while (fillStmt.step()) {
                songs.push(fillStmt.getAsObject());
            }
            fillStmt.free();
        }

        return songs;
    }

    /**
     * 正解曲以外のランダムな誤答選択肢を取得
     */
    getWrongChoices(correctSongId, count = 3) {
        const stmt = this.db.prepare(`
            SELECT title FROM songs 
            WHERE id != ? 
            ORDER BY RANDOM() 
            LIMIT ?
        `);
        stmt.bind([correctSongId, count]);
        const choices = [];
        while (stmt.step()) {
            choices.push(stmt.getAsObject().title);
        }
        stmt.free();
        return choices;
    }

    /**
     * 全楽曲一覧の取得
     */
    getAllSongs(orderBy = 'tier ASC, release_year DESC, title ASC') {
        const stmt = this.db.prepare(`SELECT * FROM songs ORDER BY ${orderBy}`);
        const list = [];
        while (stmt.step()) {
            list.push(stmt.getAsObject());
        }
        stmt.free();
        return list;
    }

    /**
     * プレイ結果の保存
     */
    savePlayResult({ difficultyId, score, totalQuestions, correctCount, maxCombo, rank, logs = [] }) {
        this.db.run(`
            INSERT INTO play_history (difficulty_id, score, total_questions, correct_count, max_combo, rank)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [difficultyId, score, totalQuestions, correctCount, maxCombo, rank]);

        const res = this.db.exec("SELECT last_insert_rowid() AS id");
        const historyId = res[0].values[0][0];

        for (const log of logs) {
            this.db.run(`
                INSERT INTO answer_logs (history_id, song_id, user_answer, is_correct, time_taken_ms, earned_score)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                historyId,
                log.songId,
                log.userAnswer,
                log.isCorrect ? 1 : 0,
                log.timeTakenMs || 0,
                log.earnedScore || 0
            ]);
        }

        this.persist();
        return historyId;
    }

    /**
     * 過去のスコア履歴を取得
     */
    getPlayHistory(limit = 20) {
        const stmt = this.db.prepare(`
            SELECT h.*, d.name AS difficulty_name 
            FROM play_history h
            LEFT JOIN difficulties d ON h.difficulty_id = d.id
            ORDER BY h.played_at DESC 
            LIMIT ?
        `);
        stmt.bind([limit]);
        const history = [];
        while (stmt.step()) {
            history.push(stmt.getAsObject());
        }
        stmt.free();
        return history;
    }

    /**
     * 統計サマリーの取得
     */
    getStats() {
        const res = this.db.exec(`
            SELECT 
                COUNT(*) AS total_plays,
                COALESCE(MAX(score), 0) AS high_score,
                COALESCE(SUM(correct_count), 0) AS total_correct,
                COALESCE(SUM(total_questions), 0) AS total_answered,
                COALESCE(MAX(max_combo), 0) AS record_combo
            FROM play_history
        `);
        if (!res.length || !res[0].values.length) {
            return { total_plays: 0, high_score: 0, total_correct: 0, total_answered: 0, record_combo: 0, accuracy: 0 };
        }
        const row = res[0].values[0];
        const totalAnswered = row[3];
        const totalCorrect = row[2];
        const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
        return {
            total_plays: row[0],
            high_score: row[1],
            total_correct: totalCorrect,
            total_answered: totalAnswered,
            record_combo: row[4],
            accuracy
        };
    }

    /**
     * 任意のSQLクエリを実行
     */
    executeCustomQuery(sql) {
        try {
            const results = this.db.exec(sql);
            this.persist();
            return { success: true, results };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    exportToFile() {
        const binary = this.db.export();
        const blob = new Blob([binary], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eve_quiz_${new Date().toISOString().slice(0, 10)}.sqlite`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async reset() {
        this.db = new this.SQL.Database();
        await this.initSchema();
        this.persist();
    }
}

window.dbManager = new DatabaseManager();
