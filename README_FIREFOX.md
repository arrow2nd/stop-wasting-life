# Firefox版のビルド方法

このプロジェクトは Chrome と Firefox の両方で動作するように作られています。

## ファイル構成

- `manifest.json` - Chrome用のManifest V3
- `manifest_firefox.json` - Firefox用のManifest V2
- その他のJSファイル - 両ブラウザで共通（browserAPI使用）

## Firefox版のパッケージング

### 自動ビルド（推奨）

```bash
npm install
npm run build:firefox
```

これで `firefox-build/` ディレクトリと `firefox-build.zip` が生成されます。

### 手動ビルド

1. **Firefoxディレクトリを作成:**
   ```bash
   mkdir firefox-build
   cp -r *.js *.html *.png *.svg firefox-build/
   cp manifest_firefox.json firefox-build/manifest.json
   ```

2. **パッケージング:**
   ```bash
   cd firefox-build
   zip -r ../firefox-build.zip * -x "*.git*" "README*.md" "manifest_chrome.json" "package.json"
   ```

## ブラウザ固有の違い

### Chrome (Manifest V3)
- Service Worker として background.js を実行
- `chrome.*` API を使用
- `host_permissions` で権限を分離

### Firefox (Manifest V2)  
- Background script として background.js を実行（persistent: false）
- `browser.*` API を優先、fallback として `chrome.*` API
- `permissions` に host permissions を含める
- `applications.gecko` でFirefox固有の設定

## 開発時の注意事項

- 両ブラウザで動作するよう `browserAPI` を使用
- Firefox特有の機能制限を考慮（一部のAPIが異なる場合）
- テストは両ブラウザで実施すること