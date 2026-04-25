import { redirect } from "next/navigation";

type QuizPageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuizPage({ params }: QuizPageProps) {
  const resolvedParams = await params;
  redirect(`/quizzes/${resolvedParams.id}/attempt`);
}
