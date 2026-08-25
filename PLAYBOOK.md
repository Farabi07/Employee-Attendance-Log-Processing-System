# Roster — Full Project Walkthrough (with real-life examples)

Roster is a multi-tenant SaaS attendance & scheduling product. Every signup creates its own isolated **store** with a 7-day free trial. Four kinds of people use it: **Platform Owner (you)**, **Manager**, **Moderator**, **Employee**. Below is the whole system explained through one concrete example, plus every role's own view.

**সেটআপ:** ধরি একটা ক্যাফের নাম **"Beanhouse Dhaka"**। মালিক/ম্যানেজার **করিম**, তার একজন সাহায্যকারী moderator **নাদিয়া**, আর কর্মী **রিনা**। ঘণ্টাপ্রতি বেতন ১৫০ টাকা।

---

## 🏢 Platform Owner (আপনি)

আপনি প্রতিটা store-এর উপরে — নিজে কোনো store চালান না।

- `createsuperuser` দিয়ে বানানো একটা account দিয়ে login করলে সরাসরি **platform dashboard**-এ চলে যান।
- সব store (Beanhouse Dhaka সহ যত store সাইন আপ করেছে) এক জায়গায় লিস্ট আকারে দেখা যায় — কে trial-এ আছে, কে paying customer, কার trial শেষ হয়ে গেছে।
- এটা এখন শুধু দেখার জন্য (read-only) — কোনো store-এর ভেতরের ডেটায় হাত দেওয়া যায় না।

---

## 👔 Manager — করিম এর দিন

করিম-ই Beanhouse Dhaka সাইন আপ করেছিল।

1. **Sign up**: public "Start free trial" পেজ থেকে store-এর নাম, নিজের নাম, email, password দিয়ে — সাথে সাথে 7 দিনের trial শুরু।
2. **Setup**: Roster পেজ থেকে Branch ("Beanhouse Dhaka - Gulshan"), Shift ("Morning 9-5"), Leave type ("Sick", "Casual") বানায়।
3. **Team**: রিনা আর নাদিয়ার account বানায় — নাম, email, password দিয়ে। নাদিয়াকে **Moderator** বানায়, রিনাকে সাধারণ **Employee**। রিনার জন্য **Hourly rate: 150৳** সেট করে দেয় (payroll auto-calculate করার জন্য)।
4. **Live QR চালু করা**: Roster পেজ থেকে "Show live QR" ক্লিক করে — একটা fullscreen স্ক্রিন খুলে যায় যেখানে QR code **প্রতি ৩০ সেকেন্ডে বদলে যায়**, নিচে একটা countdown ring দেখায়। করিম এই স্ক্রিনটা কাউন্টারের ট্যাবলেটে সারাদিন খোলা রাখে। ⚠️ এই QR **প্রিন্ট করার কিছু না** — প্রিন্ট করলে ৩০ সেকেন্ড পরেই সেটা অচল হয়ে যাবে, এটাই security-র মূল কথা।
5. **Geofence (optional)**: চাইলে branch-এর জন্য GPS lock সেট করে — নিজের ফোনের লোকেশন এক ক্লিকে বসিয়ে ("Use my location"), radius (যেমন ৫০ মিটার) দিয়ে। এখন থেকে ঐ branch-এ check-in করতে হলে ফোনের GPS সত্যিই কাছাকাছি থাকতে হবে।
6. **Overview**: দিনের বেলা কে present/late/leave/absent — এক নজরে দেখে। **Approvals** থেকে leave request approve/reject করে। **Reports** থেকে date range বেছে পুরো টিমের attendance, worked hours, আর **earnings** (কে কত টাকা কামিয়েছে) দেখে, CSV/PDF/Excel এ export করে।
7. **Absentee check**: দিনের শেষে "Mark absentees" চাপলে যাদের shift ছিল কিন্তু আসেনি তাদের auto "absent" মার্ক হয়ে যায়।
8. **Billing**: trial শেষ হওয়ার আগে বা পরে করিম-ই একমাত্র মানুষ Subscribe (Monthly/Yearly) করতে পারে, Stripe-এর মাধ্যমে।

---

## 🛡️ Moderator — নাদিয়া এর কাজ

নাদিয়া করিমের সাহায্যকারী — প্রায় সবকিছু করতে পারে, শুধু **৩টা জিনিস বাদে**।

- Login করলে করিমের মতোই dashboard পায় (Overview, Team, Roster, Approvals, Reports)।
- Shift বানাতে/এডিট করতে পারে, roster assign করতে পারে, leave approve/reject করতে পারে, existing employee-এর তথ্য এডিট করতে পারে, report বের করতে পারে।
- **পারে না**: (১) নতুন employee/moderator তৈরি করা, (২) branch-এর QR/geofence জেনারেট বা বদলানো, (৩) billing/subscription-এ হাত দেওয়া। Roster পেজে সেই জায়গাগুলোয় একটা note দেখায় — "শুধু Manager এটা করতে পারবে।"

---

## 👤 Employee — রিনা এর দিন (নতুন Dynamic QR + GPS ফ্লো)

সকাল ৮:৫৫ — রিনা ক্যাফেতে পৌঁছায়, ফোনে Roster app খোলে, "Today" ট্যাবে বড় circle button-এ ট্যাপ করে।

1. **GPS চেক (প্রথমে)** — অ্যাপ সাথে সাথে ফোনের GPS location চায় (camera খোলার আগেই)। রিনা যেহেতু ক্যাফের ভেতরেই আছে, location match হয়ে যায়। *(যদি রিনা বাসা থেকে ট্রাই করত, এখানেই আটকে যেত — "Location access denied" বা দূরত্বের এরর দেখাত, camera-ই খুলত না।)*
2. **Camera খোলে** — GPS পাস হওয়ার পর camera automatically চালু হয়।
3. **Dynamic QR স্ক্যান** — রিনা কাউন্টারের স্ক্রিনে থাকা current QR (যেটা ৩০ সেকেন্ড আগে বদলেছিল) স্ক্যান করে।
4. **Backend verify করে**: (ক) কোডটা আসলেই সেই মুহূর্তে valid কিনা (৩০ সেকেন্ডের window-এর মধ্যে), (খ) GPS location branch-এর radius-এর মধ্যে কিনা। দুটোই পাস হলে — check-in রেকর্ড হয়ে যায় (সকাল ৮:৫৮)। *(কেউ যদি আগের স্ক্রিনশট দিয়ে try করত, কোডের মেয়াদ শেষ থাকায় reject হয়ে যেত।)*
5. **Ring ভরতে শুরু করে** — Today স্ক্রিনে stopwatch-এর মতো circle টা teal রঙে ভরতে থাকে, status "Present" বা "Late" দেখায়।
6. **My shifts** ট্যাবে এই সপ্তাহের shift গুলো দেখা যায়। **Leave** ট্যাবে গিয়ে ছুটি apply করা যায় — type, date, reason দিয়ে।
7. **🔔 Notification** — নাদিয়া/করিম shift assign করলে বা leave approve করলে ২০ সেকেন্ডের মধ্যে bell-এ notification আসে।
8. **বিকাল ৫:০০ — Check-out**: একই flow আবার — GPS চেক → camera → বর্তমান QR স্ক্যান। Backend check-out time রেকর্ড করে, worked hours হিসাব করে (৮ ঘণ্টা ২ মিনিট), আর যেহেতু করিম আগে থেকে hourly rate (150৳) সেট করে রেখেছিল — **আজকের আয় automatic calculate হয়ে যায় এবং স্ক্রিনে দেখায়**।

⚠️ রিনা শুধু নিজের attendance/shift/leave দেখতে পারে, অন্য কারো ডেটা না — আর shift/roster/leave-approval/billing/QR — কোনোটাতেই হাত দিতে পারে না।

---

## 💳 Payment / Subscription লাইফসাইকেল

1. Sign up করলেই 7 দিনের free trial শুরু, কোনো card লাগে না।
2. Trial-এ সব feature পুরোপুরি চলে; উপরে countdown banner দেখায়।
3. করিম Subscribe করলে (Monthly/Yearly) Stripe-এর নিজস্ব payment page-এ যায় — card details Roster কখনো দেখে না।
4. Payment success হলে Stripe নিজে webhook দিয়ে জানায়, store instantly "active" হয়ে যায়।
5. Trial শেষ হয়ে গেলে (subscribe না করলে) বা payment fail করলে — পুরো app **লক**। সবাই "Subscribe to continue" পেজ দেখে; শুধু Manager Subscribe বাটন পায়।
6. আবার Subscribe করলেই সাথে সাথে unlock — কোনো ডেটা মোছে না।

---

## 🔒 নতুন Dynamic QR সিস্টেম আসলে কীভাবে কাজ করে (technical, সংক্ষেপে)

- প্রতিটা branch-এর একটা গোপন "seed" secret থাকে (কখনো frontend-এ পাঠানো হয় না)।
- সেই secret + বর্তমান সময় (৩০ সেকেন্ডের block) দিয়ে একটা 6-digit code তৈরি হয় — এটাই Google Authenticator যেভাবে কাজ করে ঠিক সেই একই পদ্ধতি (TOTP)।
- স্ক্যান করা code backend আবার হিসাব করে verify করে — মিলে গেলেই ঠিক, তাও শুধু সেই ৩০ সেকেন্ডের window-এ (সামান্য tolerance সহ)।
- এর মানে: screenshot, ছবি, বা আগের কোনো কোড কোনো কাজে আসে না — ৩০ সেকেন্ড পর সেটা মৃত।

---

## 📱 Mobile

পুরো UI responsive — ফোনে sidebar নিচে tab bar হয়ে যায়, সব grid/table স্ক্রিনে ঠিকভাবে বসে, দরকার হলে scroll করা যায়।

---

## এক নজরে — কে কী পারে

| কাজ | Owner | Manager | Moderator | Employee |
|---|:---:|:---:|:---:|:---:|
| সব store দেখা | ✓ | – | – | – |
| Employee/Moderator তৈরি | – | ✓ | – | – |
| Live QR generate/geofence সেট | – | ✓ | – | – |
| Hourly rate সেট করা | – | ✓ | – | – |
| Shift/Roster/Branch তৈরি | – | ✓ | ✓ | – |
| Leave approve/reject | – | ✓ | ✓ | – |
| Report export (হিসাবসহ আয়) | – | ✓ | ✓ | – |
| Billing/Subscribe | – | ✓ | – | – |
| GPS+QR দিয়ে check-in/out, নিজের আয় দেখা | – | নিজের | নিজের | ✓ |

---

## এখন যা যা সত্যিই কাজ করছে (tested)

- Multi-tenant isolation (এক store আরেক store-এর ডেটা দেখতে পারে না)
- Manager / Moderator / Employee role, প্রতিটা permission সার্ভারে enforce করা
- Public signup + 7 দিন trial + lockout + Stripe checkout/webhook (real keys লাগবে পুরো টেস্ট করতে)
- **Dynamic (৩০-সেকেন্ড rotating) QR + GPS geofencing** — screenshot/প্রিন্ট করা QR দিয়ে কাজ হয় না
- Hourly rate ভিত্তিক auto earnings calculation
- Notification, CSV/PDF/Excel reports, absentee auto-mark
- Platform owner dashboard
- Mobile-responsive layout
