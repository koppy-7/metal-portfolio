# Metal Portfolio

現物の金・銀・プラチナを管理するためのポートフォリオアプリです。  
保有している貴金属の重量や品位を登録すると、現在価格をもとに概算評価額を確認できます。

PWAに対応しているため、スマホのホーム画面に追加してアプリのように使えます。

## Screenshots例

### メニュー
<img width="361" height="720" alt="img_2656_720" src="https://github.com/user-attachments/assets/1562fa1f-4125-40ae-9971-3d70c562c46b" />


### アイテム追加
<img width="362" height="720" alt="img_2658_720" src="https://github.com/user-attachments/assets/9afb6fc3-d022-4f89-a2d0-95f26ef0fbcf" />

### アイテム一覧
<img width="354" height="720" alt="img_2660_720" src="https://github.com/user-attachments/assets/170aeeb1-1290-4e99-a639-ea6acf34b70e" />


### 保有資産
<img width="356" height="719" alt="img_2662_720" src="https://github.com/user-attachments/assets/62c05ccb-cf0b-4ce6-b139-08f911f21ab4" />


### 評価額推移

<img width="357" height="720" alt="img_2661_720" src="https://github.com/user-attachments/assets/47f1d873-edef-4ffb-8d1a-6e5f51bb6590" />

### 時価（外部api）

<img width="356" height="720" alt="img_2659_720" src="https://github.com/user-attachments/assets/5eb376e4-5180-4e0d-93a8-a7c890f991b6" />


## 主な機能

- 金・銀・プラチナの保有アイテム登録
- 品位に応じた純度の自動反映
- 重量と現在価格から概算評価額を計算
- 金属別の保有割合を円グラフで表示
- 評価額の推移をグラフで表示
- 外部APIから金属価格を取得
- オフライン時は前回保存した価格を利用
- スマホのホーム画面に追加できるPWA対応

## 技術構成

- Next.js
- TypeScript
- Tailwind CSS
- Recharts
- localStorage
- Service Worker
- PWA

## データ保存について

保有アイテム、価格、評価額履歴はブラウザの `localStorage` に保存します。  
サーバーやクラウドDBには保存しません。

そのため、PCとスマホでデータは同期されません。  
各端末ごとに独立してデータを管理します。

## 価格について

金属価格は外部APIから取得し、円/gに変換して利用します。  
API取得に失敗した場合やオフライン時は、前回保存された価格を使用します。

表示される評価額はあくまで概算です。  
実際の買取価格は、店舗、手数料、品物の状態、査定結果などにより異なる場合があります。

## 使い方

```bash
npm install
npm run dev
```
ビルドする場合：
```bash
npm run build
npm run start
```
LAN内のスマホから確認する場合：
```bash
npm run dev -- -H 0.0.0.0
```
その後、スマホで以下のようにアクセスします。

http://<PCのIPv4アドレス>:3000

例：

http://192.168.0.243:3000（ローカルip)
PWAとして使う方法
- Android

Chromeでアプリを開き、メニューから「ホーム画面に追加」を選択します。

- iPhone

Safariでアプリを開き、共有ボタンから「ホーム画面に追加」を選択します。

## 今後追加したいこと
国内買取価格との比較
写真登録
売却済みアイテムの管理
バックアップ・復元機能
UIの改善
License

Personal project.
