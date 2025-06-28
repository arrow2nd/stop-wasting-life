# STOP WASTING LIFE

Twitterを一定時間開いていると警告が出て、Twitterのタブを強制的に閉じるブラウザ拡張機能です。Chrome・Firefox両方で動作します。

> [zipをダウンロード](https://github.com/arrow2nd/stop-wasting-life/archive/refs/heads/main.zip)

<img width="1440" alt="image" src="https://github.com/user-attachments/assets/9f7892f4-d7c0-4a6a-9f71-5aad81f59ccb" />

<img width="945" alt="image" src="https://github.com/user-attachments/assets/389d04ee-b023-45ca-bcdb-922feb3e9b91" />

## 機能

### 🕐 タイマー機能
- デフォルト3分（1秒〜3600秒で設定可能）
- 画面中央にカウントダウン表示
- 30秒を切ると文字色が黒から赤に変化 + ダメージエフェクト

### 🚫 強制制限
- 制限時間経過後に警告ダイアログ表示
- タブを強制的に閉じる
- 30分間の再アクセス制限
- グローバルセッション管理（タブ切り替えリセット防止）
- 永続的なブロック・制限システム（Chrome再起動後も継続）
- バイパス防止機能（開発ツール検知、ページ非表示監視、ショートカット無効化）
- 違反回数による段階的制限強化（3回: 1時間、5回: 2時間、10回: 4時間）
- 違反検出時の通知機能（画面右上に表示）

### ⚙️ 設定
- 秒単位でタイマー設定可能（セッション制限時間・1日の合計制限時間）
- オプションページで簡単設定
- リアルタイム使用状況追跡
- 違反履歴の確認と管理
- 日別の使用時間グラフ表示

## インストール方法

[zipをダウンロード](https://github.com/arrow2nd/stop-wasting-life/archive/refs/heads/main.zip) して展開、任意の場所に置いておく

### Chrome版

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このプロジェクトのフォルダを選択

### Firefox版

1. ターミナル/コマンドプロンプトでプロジェクトフォルダに移動
2. Firefox版をビルド：
   ```bash
   npm install
   npm run build:firefox
   ```
3. Firefoxで `about:debugging` を開く
4. 「このFirefox」をクリック
5. 「一時的なアドオンを読み込む」をクリック
6. `firefox-build` フォルダ内の `manifest.json` を選択

または、パッケージされたzipファイルを使用する場合：
1. 上記手順でビルド後、`firefox-build.zip` が生成されます
2. Firefoxで `about:addons` を開く
3. 歯車アイコン → 「ファイルからアドオンをインストール」
4. `firefox-build.zip` を選択

> **注意**: Firefox版は一時的なアドオンとしてのみインストール可能です。Firefoxを再起動すると削除されます。永続的に使用する場合は、Firefox Add-ons Developer Hubでの署名が必要です。

詳細なFirefox版のビルド方法は [README_FIREFOX.md](README_FIREFOX.md) を参照してください。

## 対応サイト

- twitter.com
- x.com

## 違反基準

以下の行動は違反として検出され、ペナルティポイントが加算されます：

1. **制限時間到達** (+1点) - セッション時間制限に到達
2. **開発者ツールを開く** (+2点) - DevToolsの使用を検出
3. **キーボードショートカットのブロック** (+1点) - Ctrl+W、Ctrl+T、Ctrl+Nなどのブロック
4. **ページを1分以上隠す** (+1点) - タブ切り替えなどでページを長時間非表示
5. **拡張機能の無効化/有効化** (+2点) - 拡張機能を一時的に無効化する試み

## ライセンス

MIT License
