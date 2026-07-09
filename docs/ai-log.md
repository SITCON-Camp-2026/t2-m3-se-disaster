# AI Log

這份紀錄用來留下小組如何使用 AI / Coding Agent 的操作脈絡。重點不是逐字保存所有對話，而是記錄重要協作、取捨與人類判斷。

## 什麼時候要記錄

請在以下情況更新本檔案：

- AI 協助分析原始資訊。
- AI 協助找出不能判斷處。
- AI 協助判斷哪些資訊不能直接相信。
- AI 協助判斷哪些資訊不能直接變成任務。
- AI 協助修改畫面標示或前端工作台。
- AI 可能補了原文沒有的資訊。
- AI 建議被小組拒絕，且拒絕原因和安全 / 正確性 / scope 有關
- AI 輸出可能造成誤導，例如把未確認資料寫成已確認事實

## 不需要記錄

- 不需要逐字貼完整對話
- 不需要記錄每一次小型 autocomplete
- 不需要記錄單純修 typo 或格式化

## 紀錄格式

| 時間  | 階段       | 任務                           | AI / Agent 建議                                                                                                        | 採用 / 拒絕      | 人類判斷理由                                                                                                                | 相關檔案 / commit                                                                                  |
| ----- | ---------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 10:15 | Phase 0    | 實作整理工作台與已整理分頁     | 建議用前端 state 建立整理草稿，確認後顯示在新分頁，不寫入 shared fixtures                                              | 採用             | 符合前端-only 與不把未整理資料假裝成乾淨資料的限制                                                                          | `src/app/App.tsx`, `src/features/phase-0/`                                                         |
| 10:20 | Phase 0    | 設計確認流程                   | 建議把確認狀態命名為 `organized_confirmed`，並保留原始 `verificationStatus`                                            | 採用             | 避免把「整理確認」誤解成事實已外部查核                                                                                      | `src/components/status-labels.ts`, `Phase0OrganizedInfoPanel.tsx`                                  |
| 10:25 | Phase 0    | 安全邊界                       | 初版先避免把 M-001 到 M-012 寫成固定答案表，只使用安全預設草稿                                                         | 採用             | 課程要求草稿可編輯，且不應把 agent 推測當標準答案                                                                           | `phase0-drafts.ts`, `Phase0Workbench.tsx`                                                          |
| 10:35 | Phase 0    | 依課程文件整理 12 筆資料       | 建議將 12 筆整理成前端保守示範草稿，全部標示不可直接行動並保留人類修正理由                                             | 採用             | 使用者要求完成資料整理，但仍不可顯示成正式查核答案                                                                          | `phase0-drafts.ts`, `docs/phase0-observations.md`                                                  |
| 10:40 | Phase 0    | 套用 roc-aesthetic UIUX        | 建議改為行政表格、公告帶、ROC blue、警示黃、舊式按鈕與密集列管版面                                                     | 採用             | 符合使用者指定 skill，但仍保留可讀性與操作性                                                                                | `src/styles/global.css`, `src/app/App.tsx`, `Phase0RawInfoPanel.tsx`                               |
| 10:55 | Phase 0    | 接入本機 AI 整理草稿           | 建議用 Vite dev server 本機代理讀取 opencode 設定，前端只接收草稿 patch                                                | 採用             | API key 不放 repo、不進前端 bundle，AI 產物仍需人工確認                                                                     | `vite.config.ts`, `Phase0AiPopup.tsx`, `phase0-ai.ts`                                              |
| 13:48 | Release 01 | 使用者訪談與需求取捨草稿       | 主 agent 依 `01-interview-kit` 模擬回報者、資訊整理者、行動者回饋，彙整共同需求與 v1 暫定取捨                          | 不作為正式訪談   | 使用者指出這不是 sub-agent 訪談；保留為草稿歷程，但後續改用三個 persona sub-agent 重跑                                      | `docs/interview-notes.md`, `docs/interview-summary.md`, `docs/decisions.md`                        |
| 14:00 | Release 01 | 補跑 persona sub-agent 訪談    | Wegener、Mencius、Kant 三個 sub-agent 分別回覆回報者、資訊整理者、行動者；指出已整理、整理確認、信心程度都可能造成誤解 | 採用，待人類確認 | 採用正式 sub-agent 回饋更新訪談紀錄與彙整；仍不讓 AI 決定 v1 最終優先順序、行動可否執行或外部查核狀態                       | `docs/interview-notes.md`, `docs/interview-summary.md`, `docs/decisions.md`                        |
| 14:39 | Release 01 | 人類修改訪談用語               | 使用者指出「信心程度」不直觀，建議改成「原文模糊 / 原文簡略 / 原文清晰」這類描述                                       | 採用             | 改為「原文清楚度」可以把判斷限制在原始文字本身，避免誤解成資料可信度、查核狀態或可行動程度                                  | `docs/interview-notes.md`, `docs/interview-summary.md`, `docs/decisions.md`                        |
| 16:09 | Release 02 | 觀測者新增資料與本地持久化流程 | 建議把觀測者新增資料設計成本機未整理草稿，用本地持久化保存，但一律維持未查核與需要人工確認                             | 採用為流程草稿   | 符合前端-only 與不新增 fixture 的限制；本機資料不可假裝成正式資料                                                           | `docs/flow.md`, `docs/decisions.md`                                                                |
| 16:24 | Release 03 | 依流程實作 v1 前端工作台       | 依 `docs/decisions.md` 與 `docs/flow.md` 建立 `/v1/`，提供觀測者本機草稿、本地持久化、原文清楚度與本機操作紀錄         | 採用             | AGENTS 允許 Release 03 根據 decisions / flow 修改前端；未使用未釋出的 build guide，且未新增 fixture、後端、資料庫或外部 API | `src/app/App.tsx`, `src/features/v1/`, `src/styles/global.css`, `tests/app-smoke.test.tsx`         |
| 16:36 | Release 03 | 簡化觀測者新增流程             | 使用者要求刪除「是否包含個資」判斷；表單只檢查是否有基本原始文字，送出後仍固定為未查核與需要人工確認                   | 採用             | 這是課堂練習流程，先專注資料不確定性與不可直接行動；仍不把本機草稿顯示成正式資料或已確認資料                                | `docs/flow.md`, `docs/decisions.md`, `src/features/v1/V1Workbench.tsx`, `tests/app-smoke.test.tsx` |

## 範例

| 時間  | 階段    | 任務         | AI / Agent 建議                        | 採用 / 拒絕 | 人類判斷理由                              | 相關檔案 / commit             |
| ----- | ------- | ------------ | -------------------------------------- | ----------- | ----------------------------------------- | ----------------------------- |
| 09:45 | Phase 0 | 分析原始資訊 | 建議把社群貼文直接轉成 verified report | 拒絕        | 社群貼文來源未確認，應保持 `needs_review` | `docs/phase0-observations.md` |

## 課後反思

### AI 幫助最大的地方

- 快速找出既有 starter 的缺口：只有安全預設，還缺草稿 CRUD、確認流程和已整理分頁。
- 協助把資料品質欄位拆開，讓來源、查核狀態、整理確認和人工修正分別呈現。
- 協助把 12 筆資料整理成可展示但保守的前端草稿，並在畫面上保留限制、阻礙與人工確認欄位。

### AI 最容易誤導的地方

- 可能把「看起來像任務」的原文直接轉成可派工任務，忽略地址、時間、同意與來源角色問題。
- 可能把 `sourceType: official_notice` 誤認為已確認官方公告。
- 可能把「整理已確認」誤解成 verified；目前 UI 和文件需反覆提醒它只是工作台狀態。

### 下次使用 AI 開發前，我們會先準備

- 先定義哪些狀態代表資料查核，哪些只代表工作台整理進度。
- 先列出不能讓 agent 補的欄位，例如真實地址、電話、人物身分與現場安全判斷。
