# Slick AI — Product Evolution Roadmap
## Vision: The World's Most Intelligent Trading Companion

> This document defines Slick AI's feature roadmap, design philosophy, and competitive differentiation strategy.
> It exists to guide implementation without copying any existing product. Every feature described here
> is framed around Slick AI's unique positioning: **signal intelligence first**.

---

## Core Philosophy — What Makes Slick AI Different

Most trading apps automate mechanical strategies (GRID, DCA) and call it "AI."
Slick AI is fundamentally different:

- **We generate intelligence, not just automation.** Our AI analyses market conditions and
  produces directional signals with entry price, stop loss, take profit, and a confidence score.
  No competitor does this at the signal level.

- **We respect the trader's judgment.** Slick AI presents signals with full context and lets
  traders choose their execution mode: manual review, semi-auto, or full auto. The trader
  is always in control of the intelligence layer.

- **We measure ourselves by outcome, not activity.** Our dashboard exists to show whether
  the AI is making traders money — not to celebrate trade volume.

- **We are built for emerging market traders first.** Deep Deriv integration, lightweight
  performance on mid-range Android devices, and a mobile-first experience designed for
  traders in Africa, Southeast Asia, and Latin America.

---

## Phase 1 — Foundation Stability (Current Sprint)
*Get the app running on a physical device without crashing.*

### Status: In Progress
- [x] Fix derivPat ghost dependency in AccountsScreen
- [x] Fix babel.config.js (remove wrong worklets plugin)
- [x] Add react-native-worklets peer dependency
- [x] Fix react-native-purchases/react-native-purchases-ui version mismatch (pin both to 10.9.1)
- [x] Add .npmrc with legacy-peer-deps=true
- [x] Switch CI from manual Gradle build to EAS Build
- [x] Fix app.json userInterfaceStyle → dark
- [x] Add expo-system-ui
- [x] Fix useWebSocket ref guard pattern
- [x] Fix @types/react dual version via overrides

### Remaining for Phase 1
- [ ] Confirm EAS preview build installs and runs on Android device
- [ ] Verify WebSocket connects to backend on device (not just emulator)
- [ ] Verify push notifications work on device
- [ ] Test AccountsScreen Deriv connection flow end-to-end on device

---

## Phase 2 — Intelligence Layer (Signal Quality)
*Make the AI's output undeniably superior to any competitor.*

### 2A. Signal Confidence Display Overhaul
**What:** Replace the current confidence percentage with a multi-dimensional
intelligence breakdown unique to Slick AI.

**Slick AI's "Signal DNA" concept:**
Each signal shows 4 intelligence dimensions instead of one number:
- `Trend Alignment` — is this signal trading with the macro trend?
- `Volume Pressure` — is volume confirming the move?
- `Pattern Strength` — what technical pattern triggered this?
- `Risk/Reward Quality` — is the SL/TP ratio favourable?

Displayed as a compact radar/ring graphic — nothing like this exists in
any retail trading app. No percentages. A visual language traders can read
at a glance.

**Why this beats competitors:** Elirox and others show no reasoning behind
signals. We show the reasoning without requiring traders to be technical analysts.

**Files to modify:**
- `src/screens/signals/SignalsScreen.tsx` — add Signal DNA card component
- `src/components/SignalDNA.tsx` — new component to create
- `src/store/signalStore.ts` — extend Signal type with intelligence dimensions

---

### 2B. Signal Performance Feed ("Proof of Intelligence")
**What:** A dedicated section on the Signals screen showing the AI's live
accuracy track record — not just for the user's account, but platform-wide.

**Concept: "The Leaderboard of Ideas"**
- Platform win rate this week: `68.4%`
- Best performing asset this week: `XAUUSD`
- Most accurate model version: `v3.2`
- Total signals issued lifetime: `14,892`

This is transparency as a competitive weapon. No competitor publishes
platform-level signal accuracy. We will.

**Files to create/modify:**
- `src/screens/signals/SignalPerformanceFeed.tsx` — new component
- Backend endpoint: `GET /api/signals/platform-stats`

---

### 2C. Signal Watchlist ("Follow an Idea")
**What:** Users can "follow" a signal they didn't trade to track how it
would have performed. Acts as a paper trading layer without fake accounts.

**Why unique:** Instead of a demo account (which requires fake balance
management), we let traders shadow real signals. "I would have made $340
on this signal I missed" is a powerful retention mechanic.

**Files to create:**
- `src/store/watchlistStore.ts`
- `src/screens/signals/SignalWatchlistScreen.tsx`

---

## Phase 3 — Execution Intelligence (Auto-Execute)
*Let the AI act on its own signals, but always with the trader's permission.*

### 3A. Execution Modes ("Intelligence Modes")
**Concept:** Replace the binary "manual/automated" switch with a spectrum
of intelligence modes:

| Mode | Name | What it does |
|------|------|--------------|
| 🔵 Observe | Observer | Receive signals, no auto-action |
| 🟡 Assist | Co-Pilot | AI suggests, one-tap to execute |
| 🟠 Semi-Auto | Autopilot | AI executes signals above X% confidence |
| 🔴 Full Auto | Full Control | AI executes all signals, manages SL/TP |

This framing is original. It positions the AI as a collaborator, not a
replacement for the trader. Users feel in control even in Full Auto.

**The key insight no competitor has implemented:**
The confidence threshold in Semi-Auto is set by the trader, not the platform.
A trader can say "only execute signals above 82% confidence on XAUUSD."
This is genuinely intelligent automation.

**Files to modify/create:**
- `src/screens/accounts/AccountsScreen.tsx` — add mode selector
- `src/store/accountStore.ts` — extend ConnectedAccount with intelligenceMode
- Backend: `PUT /api/accounts/:id/intelligence-mode`
- Backend: execution engine to filter signals by mode + confidence threshold

---

### 3B. Signal Execution Journal
**What:** Every executed trade links back to the signal that triggered it,
showing exactly what the AI was thinking at execution time.

Unique feature: "Signal Replay" — tap any closed trade and see:
- The signal that triggered it
- The Signal DNA at time of execution
- What the AI's confidence was
- What actually happened vs what was predicted

This is a learning tool disguised as a trade journal. No other app does this.

**Files to create:**
- `src/screens/trades/SignalReplayScreen.tsx`
- `src/services/tradeService.ts` — add `getSignalReplay(tradeId)` method

---

## Phase 4 — Experience Layer (Why Users Stay)
*The features that make Slick AI feel alive and indispensable.*

### 4A. Pulse — Daily AI Market Brief
**Concept:** Every day at market open, Slick AI generates a 60-second
"market pulse" — a brief text + visual summary of:
- Which assets the AI is watching today
- Overall market sentiment (risk-on / risk-off)
- Top signal opportunity for the day

Delivered as a push notification and viewable in-app.

**Why unique:** No trading app gives users a daily briefing from the AI itself.
This creates a daily open habit. Users open the app to "check what the AI thinks today."

**Files to create:**
- `src/screens/dashboard/PulseCard.tsx` — daily brief card on dashboard
- Backend: `GET /api/pulse/daily` — AI-generated daily market brief
- Backend cron: generate pulse at market open (8:00 AM GMT)

---

### 4B. Intelligence Score ("Your AI Trading IQ")
**Concept:** Each user has an "Intelligence Score" that grows as they:
- Follow AI signals correctly (high confidence, good outcome)
- Add accounts and generate real trade data
- Use the app consistently

Score levels: `Novice → Developing → Sharp → Elite → Analyst`

This is **not** a leaderboard vs other users. It's personal growth tracking.
"Your AI is learning your preferences and getting sharper."

**Why unique:** Gamification done right — rewards good behaviour, not just activity.

**Files to create:**
- `src/screens/settings/IntelligenceScoreScreen.tsx`
- `src/store/userProgressStore.ts`

---

### 4C. Risk Pulse — Portfolio Health Monitor
**Concept:** Instead of showing raw P&L, show a "portfolio health" reading:

```
Portfolio Health: STRONG ●●●●○
- Drawdown: 2.3% (Healthy)
- Signal quality this week: Above average
- Over-exposed assets: None
- Suggested action: Consider reducing EURUSD exposure
```

A health metaphor is more intuitive than financial metrics for most users.

**Files to create:**
- `src/components/RiskPulse.tsx`
- Backend: `GET /api/portfolio/health`

---

### 4D. TradingView Chart Integration
**Concept:** Replace the current WebView chart with a proper TradingView
Lightweight Charts widget. Render it via a WebView using TradingView's
free embed that loads market data.

**Important distinction from Elirox:** We don't just show charts.
We overlay our signals directly onto the chart — entry price line,
SL line, TP line — in our brand colours. The chart becomes proof
of signal quality, not just a price display.

**Files to modify:**
- `src/screens/charts/ChartScreen.tsx` — replace with TradingView embed
- New local HTML template with signal overlay support

---

## Phase 5 — Growth Layer (Why Users Pay and Share)
*Monetisation and word-of-mouth features.*

### 5A. Subscription Tiers — "Signal Packages"
**Concept:** Don't sell "Basic/Pro/Advanced." Sell intelligence tiers:

| Tier | Name | Price | What you get |
|------|------|-------|--------------|
| Free | Scout | $0 | 3 signals/day, Observer mode only |
| Paid 1 | Analyst | $19/mo | Unlimited signals, Co-Pilot mode, Pulse |
| Paid 2 | Strategist | $39/mo | + Semi-Auto, Signal DNA, Risk Pulse |
| Paid 3 | Command | $79/mo | + Full Auto, multi-account, priority signals |

Naming convention: professional titles, not tech buzzwords.
Users aspire to be "a Strategist" not to buy an "Advanced Plan."

**Files to modify:**
- `src/screens/paywall/PaywallScreen.tsx` — redesign with tier concept
- `src/services/subscriptionService.ts` — map RevenueCat products to tiers

---

### 5B. Signal Share Card ("Proof of Intelligence, shareable")
**What:** One tap to generate a beautiful share card showing a signal's
outcome — asset, direction, entry, P&L, confidence score. Branded with
"Slick AI" watermark.

Share to WhatsApp, Twitter, Instagram Stories.

**Why this works:** Successful trades are social proof. Traders love showing
wins. Every share card is a user acquisition tool.

**Files to create:**
- `src/components/SignalShareCard.tsx`
- Use `react-native-view-shot` to capture as image

---

### 5C. Referral Intelligence ("Invite a Trader")
**What:** Referral system where:
- Referrer gets 1 free month when their referral makes their first trade
- Referred user gets 14-day free Analyst trial

Unique angle: "You taught someone to trade smarter."
Frame referrals as knowledge sharing, not MLM.

**Files to create:**
- `src/screens/settings/ReferralScreen.tsx`
- Backend: referral tracking + reward system

---

## Phase 6 — Platform Expansion
*Beyond mobile.*

### 6A. Web Dashboard (slickai.com/app)
A minimal web companion for desktop monitoring:
- View signals and P&L while at a desktop
- Cannot trade from web (keeps mobile as primary)
- Email digest of daily Pulse

Tech stack: Next.js, same backend API.

### 6B. Telegram Bot Integration
**Concept:** Users can forward Slick AI signals to their own Telegram
as a secondary notification channel. Many traders already use Telegram.
This meets them where they are.

### 6C. Multi-language Support
Priority markets: South Africa (English), Nigeria (English), Indonesia
(Bahasa), Kenya (Swahili/English), Brazil (Portuguese).
Use i18n with locale detection.

---

## Design Principles for All New Features

1. **Dark first, always.** Every screen uses the existing dark palette.
   Never introduce light backgrounds.

2. **Signal data is sacred.** Never show a signal without its confidence
   score. Never show a trade without its signal origin.

3. **One primary action per screen.** No screen should compete with itself.
   Dashboard = monitor. Signals = decide. Charts = analyse.

4. **Animate with purpose.** Use Reanimated animations only to guide
   attention — not for decoration. Entry animations on data load only.

5. **Empty states tell the story.** Every empty state explains what will
   appear and what the user should do. "No signals yet — the AI is scanning
   the market" beats "No data."

6. **Numbers breathe.** P&L, win rate, confidence — all animated with
   AnimatedNumber. Numbers that change must animate.

7. **Errors are actionable.** Every error message includes what happened
   and what the user can do. Never show raw API errors.

---

## Immediate Next Step (After This Document)

**Run on physical Android device via EAS.**

Build command:
```bash
eas build --platform android --profile preview
```

Once the APK installs and runs without crashing, begin Phase 2A
(Signal DNA component) as the first visible upgrade.

---

*Document version: 1.0 — September 2026*
*Author: Slick AI Product Team*
*Next review: After Phase 1 completion*