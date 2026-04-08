# Google Cloud 배포 가이드

> 나중에 Oracle Cloud Free Tier로 마이그레이션할 경우 환경 구성(Node.js, PM2, .env 설정)은 동일하므로 [4단계](#4-봇-파일-업로드-및-설정)부터 그대로 재사용할 수 있습니다.

---

## 사전 준비

- Google Cloud 계정 및 프로젝트
- [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) 설치 (선택사항, SSH 접속에 활용)
- Discord 봇 토큰, 클라이언트 ID, 채널 ID

---

## 1. VM 인스턴스 생성

**Google Cloud Console → Compute Engine → VM 인스턴스 → 인스턴스 만들기**

| 항목 | 권장 설정 |
|------|-----------|
| 이름 | `ai-news-bot` |
| 리전 | `us-central1` (프리티어 적용 리전) |
| 머신 유형 | `e2-micro` (**항상 무료** 프리티어) |
| 부팅 디스크 | Ubuntu 22.04 LTS, 30GB |
| 방화벽 | HTTP/HTTPS 트래픽 허용 (봇 자체는 불필요하나 권장) |

> **비용**: e2-micro는 `us-central1`, `us-west1`, `us-east1` 리전에서 월 744시간까지 **무료**입니다.

생성 후 **SSH 버튼**을 눌러 브라우저 터미널로 접속합니다.

---

## 2. Node.js 설치

```bash
# Node.js 20 LTS 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 버전 확인
node -v   # v20.x.x
npm -v    # 10.x.x
```

---

## 3. PM2 설치

PM2는 봇을 백그라운드에서 실행하고, VM 재시작 시 자동으로 복구해줍니다.

```bash
sudo npm install -g pm2
```

---

## 4. 봇 파일 업로드 및 설정

### 방법 A — gcloud CLI로 업로드 (로컬 PC에서 실행)

```bash
# 로컬 PC에서 VM으로 파일 전송
gcloud compute scp --recurse /Users/orion-gz/Desktop/Project/Discord/AINewsBot \
  ai-news-bot:~/AINewsBot --zone=us-central1-a
```

### 방법 B — Git 사용 (VM 터미널에서 실행)

```bash
# VM에서 직접 클론
git clone https://github.com/your-username/AINewsBot.git ~/AINewsBot
```

### 방법 C — SCP/SFTP 직접 전송

```bash
# 로컬 PC에서 실행 (VM 외부 IP 확인 후)
scp -r /Users/orion-gz/Desktop/Project/Discord/AINewsBot \
  username@[VM_외부_IP]:~/AINewsBot
```

---

## 5. 의존성 설치 및 빌드

```bash
cd ~/AINewsBot

# 의존성 설치
npm install

# TypeScript 빌드
npm run build
```

---

## 6. 환경 변수 설정

```bash
cd ~/AINewsBot
cp .env.example .env
nano .env
```

`.env` 파일을 아래와 같이 채워넣습니다:

```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_application_client_id_here
DISCORD_CHANNEL_ID=your_discord_channel_id_here

# 슬래시 커맨드를 특정 서버에만 먼저 등록할 경우 (개발 시 권장)
# DISCORD_GUILD_ID=your_guild_id_here

# Claude AI 한국어 요약 (선택)
# ANTHROPIC_API_KEY=your_anthropic_api_key_here

TZ=Asia/Seoul
NEWS_SCHEDULE=0 * * * *
```

저장: `Ctrl+O` → `Enter` → `Ctrl+X`

---

## 7. 슬래시 커맨드 등록

```bash
cd ~/AINewsBot
node dist/deploy-commands.js
```

성공 메시지:
```
✅ 글로벌 슬래시 커맨드 등록 완료 (반영까지 최대 1시간 소요)
```

> `DISCORD_GUILD_ID`를 설정하면 해당 서버에만 즉시 등록됩니다 (테스트에 유용).

---

## 8. PM2로 봇 실행

```bash
cd ~/AINewsBot

# 봇 시작
pm2 start dist/index.js --name "ai-news-bot"

# VM 재시작 시 자동 실행 등록
pm2 startup
# 출력된 sudo 명령어를 복사해서 실행

pm2 save
```

---

## 9. 상태 확인 및 로그

```bash
# 실행 상태 확인
pm2 status

# 실시간 로그
pm2 logs ai-news-bot

# 최근 100줄 로그
pm2 logs ai-news-bot --lines 100
```

정상 실행 시 로그 예시:
```
✅ AI 뉴스 봇이 AINewsBot#1234으로 로그인되었습니다!
⏰ AI 뉴스 스케줄러 시작: "0 * * * *" (시간대: Asia/Seoul)
```

---

## 10. 봇 관리 명령어

```bash
# 재시작
pm2 restart ai-news-bot

# 중지
pm2 stop ai-news-bot

# 삭제 (PM2 목록에서 제거)
pm2 delete ai-news-bot
```

---

## 코드 업데이트 배포

```bash
cd ~/AINewsBot

# 파일 업데이트 후
npm run build
pm2 restart ai-news-bot
```

---

## Oracle Cloud Free Tier 마이그레이션

Oracle로 이전할 때는 다음 단계만 반복하면 됩니다:

1. Oracle Cloud에서 VM 생성 (Ampere A1, Ubuntu 22.04)
2. [2단계](#2-nodejs-설치) ~ [8단계](#8-pm2로-봇-실행) 동일하게 진행
3. 기존 GCP VM 삭제

Oracle Free Tier는 `4 OCPU + 24GB RAM` (ARM)을 제공하며 GCP e2-micro보다 훨씬 여유롭습니다.
