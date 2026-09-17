import SubscribeForm from "@/components/SubscribeForm";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-purple-900">뉴스레터 구독하기</h1>
        <p className="mt-2 text-gray-600">이메일을 입력하면 인증 메일을 보내드립니다.</p>
      </div>
      <SubscribeForm />
    </main>
  );
}
