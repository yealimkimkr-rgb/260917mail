# 뉴스레터 구독 서비스

이메일 주소를 입력하면 더블 옵트인(이메일 인증) 절차를 거쳐 정기 뉴스레터
구독자로 등록되는 Next.js 14 (App Router) 기반 서비스입니다.

## 기술 스택

- Next.js 14 (App Router) + TypeScript 5
- PostgreSQL + Prisma ORM
- Resend (이메일 발송)
- Tailwind CSS
- Vitest (유닛 테스트)

## 시작하기

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init   # DATABASE_URL 설정 후 실행
npm run dev
```

## 주요 엔드포인트

| 엔드포인트 | 설명 |
| --- | --- |
| `POST /api/subscribe` | 이메일 저장 + 인증 메일 발송 (중복/스팸/rate limit 처리) |
| `GET /api/confirm?token=` | 인증 토큰 검증, `PENDING → CONFIRMED` 전환 |
| `GET /api/unsubscribe?token=` | 구독 해지 (1클릭) |
| `GET /admin/subscribers?key=` | (선택) 구독자 목록 조회, `ADMIN_SECRET` 필요 |
| `POST /api/questions` | 방문자 질문 등록 (Gemini AI 답변 초안 포함 가능) |
| `POST /api/admin/questions/answer` | (관리자) 질문에 최종 답변 게시, `x-admin-key` 헤더 필요 |
| `GET /ask` | 방문자용 질문 작성 페이지 |
| `GET /qna` | 게시된 Q&A 공개 열람 페이지 |
| `GET /admin/questions?key=` | (선택) 질문 관리 페이지, `ADMIN_SECRET` 필요 |

## 구독 상태 흐름

```
(신규) --구독신청--> PENDING --이메일 인증--> CONFIRMED --구독해지--> UNSUBSCRIBED
                        └--------------재구독(신규 토큰 발급)-----------┘
```

인증되지 않은(`PENDING`) 구독자에게는 마케팅 뉴스레터를 발송하지 않습니다.

## 테스트

```bash
npm test
```

이메일 형식 검증, 중복 가입 처리(PENDING/CONFIRMED/UNSUBSCRIBED 각 케이스),
유효하지 않거나 만료된 토큰 처리를 다룹니다.

## 스팸 방지

- 허니팟 필드(`company`): 봇이 채우면 조용히 성공 응답만 반환하고 실제 처리는 하지 않습니다.
- IP 기준 rate limiting: 기본 1분당 3회 (`RATE_LIMIT_PER_MINUTE`). 서버리스 인스턴스별 메모리
  기반이라 완벽한 전역 제한은 아니며, 더 강한 보장이 필요하면 Redis 기반 limiter로 교체하세요.

## AI 답변 초안 (Q&A)

`/ask` 페이지에서 누구나 질문을 남길 수 있습니다. 방문자가 자신의 Gemini API 키
(`gemini-3.5-flash-lite` 모델)를 입력하면, 브라우저에서 **직접** Google Generative
Language API를 호출해 답변 초안을 생성한 뒤 질문과 함께 등록합니다.

- API 키는 이 브라우저의 `localStorage`에만 저장되며 우리 서버로는 전송/저장되지 않습니다.
- AI 초안 생성에 실패하거나 키를 입력하지 않아도 질문 자체는 정상 등록됩니다.
- 관리자는 `/admin/questions?key=`(`ADMIN_SECRET` 필요)에서 AI 초안을 참고해 최종 답변을
  검토·수정 후 게시합니다. 게시된 답변만 `/qna`에 공개됩니다.
