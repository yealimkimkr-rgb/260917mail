export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-purple-900">개인정보 처리방침</h1>
      <div className="mt-6 space-y-4 text-gray-700">
        <p>
          본 서비스는 뉴스레터 발송을 목적으로 이용자가 입력한 이메일 주소만을
          수집합니다.
        </p>
        <p>수집한 이메일은 뉴스레터 발송 및 구독 상태 관리 목적으로만 사용됩니다.</p>
        <p>
          이용자는 언제든지 수신한 메일 하단의 구독 해지 링크를 통해 1클릭으로
          구독을 해지할 수 있으며, 해지 즉시 발송 대상에서 제외됩니다.
        </p>
        <p>구독 해지 시 관련 데이터는 지체 없이 파기됩니다.</p>
      </div>
    </main>
  );
}
