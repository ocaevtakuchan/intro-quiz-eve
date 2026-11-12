// schema_embedded.js - schema.sql の埋め込みフォールバック (55曲収録 決定版)
window.EMBEDDED_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    reading TEXT NOT NULL,
    youtube_id TEXT NOT NULL,
    intro_start REAL DEFAULT 0.0,
    release_year INTEGER,
    album TEXT,
    tier INTEGER DEFAULT 1,
    source_type TEXT DEFAULT 'MV',
    trivia TEXT
);

CREATE TABLE IF NOT EXISTS difficulties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration REAL NOT NULL,
    replay_count INTEGER DEFAULT 999,
    options_count INTEGER DEFAULT 4,
    bonus_multiplier REAL DEFAULT 1.0,
    has_hint INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    played_at DATETIME DEFAULT (datetime('now', 'localtime')),
    difficulty_id TEXT,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    max_combo INTEGER NOT NULL,
    rank TEXT NOT NULL,
    FOREIGN KEY (difficulty_id) REFERENCES difficulties(id)
);

CREATE TABLE IF NOT EXISTS answer_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    history_id INTEGER,
    song_id INTEGER,
    user_answer TEXT,
    is_correct INTEGER,
    time_taken_ms INTEGER,
    earned_score INTEGER,
    FOREIGN KEY (history_id) REFERENCES play_history(id),
    FOREIGN KEY (song_id) REFERENCES songs(id)
);

INSERT OR REPLACE INTO difficulties (id, name, description, duration, replay_count, options_count, bonus_multiplier, has_hint) VALUES
('easy', 'EASY（初級）', '定番曲中心！イントロ5秒＋ヒント（年・アルバム）付きで初心者安心。何度でも聴き直し可能！', 5.0, 999, 4, 1.0, 1),
('normal', 'NORMAL（中級）', 'イントロ2.5秒！人気曲・アルバム曲から出題。何度でも聴き直し可能！', 2.5, 999, 4, 1.5, 0),
('hard', 'HARD（上級）', 'イントロ1.0秒！アルバム曲・YouTube Music公式音源含む全曲から出題。何度でも聴き直し可能！', 1.0, 999, 4, 2.5, 0),
('demon', '鬼 (DEMON)', '極限の0.4秒イントロドン！マイナー・アルバム曲の出現確率が大幅アップ。何度でも聴き直し可能！', 0.4, 999, 4, 4.0, 0);

INSERT OR REPLACE INTO songs (id, title, reading, youtube_id, intro_start, release_year, album, tier, source_type, trivia) VALUES
(1, '廻廻奇譚', 'かいかいきたん', '1tk1pqwrOys', 0.0, 2020, '廻人', 1, 'MV', 'TVアニメ『呪術廻戦』第1クールOPテーマ。ストリーミング再生数4億回超のメガヒット。'),
(2, 'ドラマツルギー', 'どらまつるぎー', 'jJzw1h5CR-I', 0.0, 2017, '文化', 1, 'MV', 'アルバム『文化』収録。特徴的なベースラインと鋭いギターカッティングが光る名曲。'),
(3, 'ナンセンス文学', 'なんせんすぶんがく', 'OskXF3s0UT8', 0.0, 2017, '文化', 1, 'MV', 'Eveの独自スタイルを確立させた大ヒット作。「パッパッパラパ」のフレーズが耳に残る。'),
(4, 'お気に召すまま', 'おきにめすまま', 'nROvY9uiYYk', 0.0, 2017, '文化', 1, 'MV', '軽快なリズムとキャッチーなメロディ、アニメーションMVが中毒性を呼ぶ大人気曲。'),
(5, '僕らまだアンダーグラウンド', 'ぼくらまだあんだーぐらうんど', 'nBteO-bU78Y', 0.0, 2019, 'おとぎ', 1, 'MV', 'アルバム『おとぎ』リード曲。WIT STUDIOによる圧倒的映像美のアニメMVが話題に。'),
(6, 'レーゾンデートル', 'れーぞんでーとる', 'ulfY8WQE_HE', 0.0, 2019, 'Smile', 1, 'MV', '専門学校HAL 2019年度TVCMソング。「生きる理由」をテーマにしたダイナミックなナンバー。'),
(7, '心予報', 'こころよほう', 'dJf4wCdLU18', 0.0, 2020, 'Smile', 1, 'MV', 'ロッテ「ガーナチョコレート」バレンタイン企画テーマソング。バレンタインの甘酸っぱい物語。'),
(8, 'ファイトソング', 'ふぁいとそんぐ', '2eOg5DoYuwU', 0.0, 2022, '廻人', 1, 'MV', 'TVアニメ『チェンソーマン』第12話EDテーマ。力強いサウンドと前向きな叫びが胸を打つ。'),
(9, 'ぼくらの', 'ぼくらの', 'exOi_zsOHwM', 0.0, 2023, 'Under Blue', 1, 'MV', 'TVアニメ『僕のヒーローアカデミア』第6期オープニングテーマ。ヒーロー達の葛藤と絆を歌う。'),
(10, 'ティーンエイジブルー', 'てぃーんえいじぶるー', 'eYqSJhpNIYY', 0.0, 2024, 'Under Blue', 1, 'MV', 'TVアニメ『アオのハコ』エンディングテーマ。青春の繊細な揺らぎを描いたエモーショナルな楽曲。'),
(11, 'インソムニア', 'いんそむにあ', '35nV_M3asRs', 0.0, 2024, 'Under Blue', 1, 'MV', '映画『マイホームヒーロー』主題歌。スリリングで重厚なビートとダークな世界観。'),
(12, 'あの娘シークレット', 'あのこしーくれっと', 'sgdPlDG1-8k', 0.0, 2017, '文化', 2, 'MV', 'MVに登場するクマタローが印象的な、ポップで疾走感あふれるロックナンバー。'),
(13, 'いのちの食べ方', 'いのちのたべかた', 'U7L-3VXAkSA', 0.0, 2020, 'Smile', 2, 'MV', 'ダークかつ深淵な世界観が特徴。後にEve自身が原作を手掛けた小説・漫画も大ヒット。'),
(14, '蒼のワルツ', 'あおのわるつ', 'pyDCubgU57g', 0.0, 2020, '廻人', 2, 'MV', 'アニメ映画『ジョゼと虎と魚たち』主題歌。ストリングスとピアノが紡ぐ美麗なバラード。'),
(15, 'ラストダンス', 'らすとだんす', 'CLdeykXCZX4', 0.0, 2018, 'おとぎ', 2, 'MV', 'ギターのカッティングから哀愁あるダンスビートへと展開する、ライブ定番の人気曲。'),
(16, '闇夜', 'やみよ', 'BEEFXAltoqo', 0.0, 2019, 'Smile', 2, 'MV', 'TVアニメ『どろろ』第2期EDテーマ。和の空気感とダークなエレクトロが融合した重厚作。'),
(17, 'トーキョーゲットー', 'とーきょーげっとー', 'C_JEkiQ8aKA', 0.0, 2018, 'おとぎ', 2, 'MV', 'Waboku制作のMVが描く退廃的な近未来都市。Eveのライブでも絶大な盛り上がりを見せる1曲。'),
(18, 'アウトサイダー', 'あうとさいだー', 'GMPjNA_fCj4', 0.0, 2018, 'おとぎ', 2, 'MV', '疾走するギターロックに「劣等感立派な刃」などの切れ味鋭いリリックが炸裂するキラーチューン。'),
(19, '群青讃歌', 'ぐんじょうさんか', 'sgZjbk9eH6g', 0.0, 2021, '廻人', 2, 'MV', '『プロジェクトセカイ カラフルステージ！ feat. 初音ミク』1周年アニバーサリーソング。'),
(20, 'アヴァン', 'あゔぁん', 'm6CFrfKw60w', 0.0, 2022, '廻人', 2, 'MV', 'スマホゲーム『呪術廻戦 ファントムパレード』主題歌。『廻廻奇譚』に続く強力なタイアップ。'),
(21, '花嵐', 'はなあらし', 'I3ZozsgDDqI', 0.0, 2023, 'Under Blue', 2, 'MV', 'ブルボン「アルフォートミニチョコレート」CMソング。青く駆け抜けるメロディが魅力。'),
(22, '逃避行', 'とうひこう', 'uWZ6VyQ-cMI', 0.0, 2023, 'Under Blue', 2, 'MV', '独特の浮遊感と心地よいグルーヴがクセになる、旅情と escape をテーマにした人気曲。'),
(23, '虎狼来', 'ころろん', 'Gw96jPDtoDQ', 0.0, 2023, 'Under Blue', 2, 'MV', 'ギャツビー「メタラバー」タイアップソング。ファンキーなブラスとグルーヴィーなベースが特徴。'),
(24, '白銀', 'はくぎん', 'X8TCB9s1kRs', 0.0, 2019, 'Smile', 2, 'MV', 'JR東日本「JR SKISKI 2019-2020」キャンペーンテーマソング。冬の白銀世界を駆ける名曲。'),
(25, '夜は仄か', 'よるはほのか', '9Y0_CVX1hok', 0.0, 2021, '廻人', 2, 'MV', 'ダンサブルで妖艶なビートが際立つ。海外クリエイターZUTOMAYOとのアニメコラボ。'),
(26, '遊生夢死', 'ゆうせいむし', 'roh_p2l8DHo', 0.0, 2021, '廻人', 2, 'MV', '「個人制作アニメーション×音楽」企画の第1弾楽曲。美しく儚いアニメーションが話題に。'),
(27, '暴徒', 'ぼうと', '8McISUEXb9g', 0.0, 2022, '廻人', 2, 'MV', 'スタジオカラー制作×吉﨑響監督。映画『Adam by Eve』劇中歌として圧倒的映像美を誇る。'),
(28, 'YOKU', 'よく', 'w6G7Yfp1pVE', 0.0, 2022, '廻人', 2, 'MV', 'カネボウ化粧品『KATE 欲コレクション』タイアップソング。スタイリッシュなチルポップ。'),
(29, '平行線', 'へいこうせん', 'lxw4Y8qzq4w', 0.0, 2021, '廻人', 2, 'MV', 'Eve × suis from ヨルシカの奇跡のコラボ。ロッテガーナチョコ企画テーマ曲。'),
(30, 'Bubble', 'ばぶる', 'Vao7eDMtrro', 0.0, 2022, '廻人', 2, 'MV', '荒木哲郎監督×WIT STUDIOアニメ映画『バブル』OP主題歌（Eve feat. Uta）。'),
(31, 'スイートメモリー', 'すいーとめもりー', 'kk6meRqr-o4', 0.0, 2024, 'Under Blue', 2, 'MV', '米澤穂信原作のTVアニメ『小市民シリーズ』オープニングテーマ。優雅で甘酸っぱいポップソング。'),
(32, '冒険録', 'ぼうけんろく', 'z9c5tlQHXWM', 0.0, 2023, 'Under Blue', 2, 'MV', 'スマホ向け本格シミュレーションRPG『アスタータタリクス』オープニングテーマ。'),
(33, '惑星ループ', 'わくせいるーぷ', 'Bmqg7naxfvo', 0.0, 2016, 'Wonder Word', 2, 'MV', 'ナユタン星人の名曲をEveが歌唱した伝説的ミリオン再生カバー。「トゥ・トゥ・ル・ル」が愛される。'),
(34, '白雪', 'しらゆき', 'Kvceyq9o0rY', 0.0, 2022, '廻人', 2, 'MV', '映画『ブラックナイトパレード』主題歌。切なくも温かい冬の情景を描いた壮大なバラード。'),
(35, 'Glorious', 'ぐろりあす', 'ABQvefYR9ec', 0.0, 2024, 'Under Blue', 2, 'MV', 'NHKパラスポーツアニメ応援ソング。疾走感と高揚感に満ちた前向きなアンセム。'),
(36, 'さよならエンドロール', 'さよならえんどろーる', 'VOChndxKi6U', 0.0, 2024, 'Under Blue', 2, 'MV', 'アルバム『Under Blue』収録。映像作家・まりやすによるアニメーションMVが話題に。'),
(37, '巻物語', 'まきものがたり', '_-nLBLtidZ4', 0.0, 2024, 'Under Blue', 2, 'MV', '『コロコロコミック』555号記念テーマソング。胸躍る冒険と懐かしさを歌った名曲。'),
(38, 'フラットウッズのモンスターみたいに', 'ふらっとうっずのもんすたーみたいに', 'Kt491Acrw1c', 0.0, 2024, 'Under Blue', 2, 'MV', 'Eve × Deu (PEOPLE 1) コラボレーション楽曲。MAPPA制作のアニメーションMV。'),
(39, '心海', 'しんかい', 'vRPCAAUBMms', 0.0, 2020, '廻人', 3, 'MV', 'まりやす制作の公式アニメーションMV。映画『ジョゼと虎と魚たち』挿入歌の深海世界を描く。'),
(40, 'デーモンダンストーキョー', 'でーもんだんすとうきょう', 'BLgqyQMjd5s', 0.0, 2016, 'OFFICIAL NUMBER', 3, 'MV', 'Eveのインディーズ1stアルバム『OFFICIAL NUMBER』収録曲。Mah制作MV。'),
(41, 'sister', 'しすたー', 'JhoK7chbpZ0', 0.0, 2017, '文化', 3, 'MV', 'アルバム『文化』収録。アヴェスター制作の切ないアニメーションが光る隠れた名曲。'),
(42, 'バウムクーヘンエンド', 'ばうむくーへんえんど', 'D_v8oX5s51g', 0.0, 2019, 'Smile', 3, 'MV', 'スペースシャワーTVステーションIDにも起用された、繊細で心地よいリズムのナンバー。'),
(43, 'アンビバレント', 'あんびばれんと', 'vNa83RXmZdg', 0.0, 2018, 'おとぎ', 3, 'MV', 'アニメ『メカウデ』主題歌 / 映画『薄暮』コラボ。突き抜ける爽快感のあるハイスピードロック。'),
(44, '藍才', 'あいさい', 'lw51UR6Qoy8', 0.0, 2021, '廻人', 3, 'MV', 'Spotifyまとめ/TVCMソング。幻想的でエモーショナルなサウンドスケープが広がる1曲。'),
(45, '楓', 'かえで', '3aUssPx5Z5Y', 0.0, 2019, 'おとぎ', 3, 'MV', 'アルバム『おとぎ』収録曲。和風の情緒と切ないストリングスが響き渡る名曲。'),
(46, '退屈を再演しないで', 'たいくつをさいえんしないで', 'Pv56oBAfRhY', 0.0, 2022, '廻人', 3, 'MV', '映画『Adam by Eve』劇中歌。エッジの効いたギターリフと中毒性のあるリズム。'),
(47, '君に世界', 'きみにせかい', 'B3vsRXOSBqc', 0.0, 2019, 'おとぎ', 3, 'MV', 'アルバム『おとぎ』のラストを飾る壮大なバラード。Eveの優しい歌声が染み渡る。'),
(48, 'LEO', 'れお', 'J3K3V36mlLM', 0.0, 2020, 'Smile', 3, 'MV', 'アルバム『Smile』収録曲。ダークでアブストラクトな世界観を表現した芸術的作品。'),
(49, '杪夏', 'びょうか', 'HshgqAsvXk4', 0.0, 2021, 'Eve Vocaloid 01', 3, 'MV', 'Eveが初音ミクを用いて制作したボカロ楽曲。夏の終わりを歌ったノスタルジックな名作。'),
(50, '朝が降る', 'あさがふる', 'qQisl6rzFqo', 0.0, 2020, 'Smile', 3, 'MV', 'アルバム『Smile』収録曲。静寂から夜明けへと向かう情緒的なアコースティックナンバー。'),
(51, 'ふりをした。', 'ふりをした', '8RGpI8I9upE', 0.0, 2017, '文化', 3, 'YouTubeMusic', 'アルバム『文化』収録曲（YouTube Music公式音源）。叙情的で哀愁漂うメロディの隠れた名曲。'),
(52, '会心劇', 'かいしんげき', 'Ddnp_63yUVw', 0.0, 2017, '文化', 3, 'YouTubeMusic', 'アルバム『文化』収録曲（YouTube Music公式音源）。ソリッドなバンドサウンドと鋭いボーカル。'),
(53, 'ホームシック', 'ほーむしっく', 'y8Mt2Uwtilg', 0.0, 2017, '文化', 3, 'YouTubeMusic', 'アルバム『文化』収録曲（YouTube Music公式音源）。Eveの繊細な心情が綴られたアコースティック曲。'),
(54, '迷い子', 'まよいご', 'rZAjaUTInwg', 0.0, 2019, 'おとぎ', 3, 'YouTubeMusic', 'アルバム『おとぎ』収録曲（YouTube Music公式音源）。幻想的な世界観と浮遊感あるサウンド。'),
(55, '胡乱な食卓', 'うろんなしょくたく', 'm4FKFhdZxuU', 0.0, 2020, 'Smile', 3, 'YouTubeMusic', 'アルバム『Smile』収録曲（YouTube Music公式音源）。冬ツアーのタイトルにもなったダークな世界観。');
`;
